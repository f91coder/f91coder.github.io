<?php
declare(strict_types=1);

/**
 * Nucleo do backend do Quosheets: conexao, migracao automatica do schema, sessoes, limites de tentativa,
 * configuracoes (com segredos criptografados), idioma, acesso ao plano e creditos de IA.
 *
 * Modelo de produto (resumo):
 *  - Conta com e-mail verificado => 7 dias de teste completos (sem cartao).
 *  - Plano unico mensal via Stripe (R$ 99,90 ou US$ 49,90) => acesso + creditos de IA por mes.
 *  - Os arquivos do usuario sao processados no navegador; o servidor so ve o que vai para a IA.
 */

const QS_SESSION_COOKIE = 'qs_session';
const QS_LANG_COOKIE = 'qs_lang';
const QS_SESSION_TTL = 30 * 86400;
const QS_LANGS = ['pt', 'en', 'es'];
const QS_SCHEMA_VERSION = 1;
const QS_PAST_DUE_GRACE_SECONDS = 3 * 86400;

/** Valores padrao das configuracoes editaveis no painel admin. */
const QS_SETTING_DEFAULTS = [
    'ai_model' => 'claude-opus-5-5',
    'ai_fallbacks' => '1',
    'credits_monthly' => '15000',
    'credits_trial' => '600',
    'credit_usd' => '0.0005',
    'trial_days' => '7',
    'price_brl' => '99.90',
    'price_usd' => '49.90',
];

/** Modelos que o admin pode escolher para a IA (o padrao e o mais capaz). */
const QS_AI_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'];

/**
 * Precos por milhao de tokens (USD): entrada, saida, leitura de cache, escrita de cache (5 min).
 * Usados para converter o uso real de cada chamada em creditos. Inclui modelos que podem responder
 * como fallback do servidor.
 */
const QS_MODEL_PRICES = [
    'claude-fable-5-1' => [10.00, 50.00, 0.25, 12.50],
    'claude-opus-5-5' => [4.00, 20.00, 0.20, 5.00],
    'claude-opus-5' => [5.00, 25.00, 0.50, 6.25],
    'claude-opus-4-8' => [5.00, 25.00, 0.50, 6.25],
    'claude-opus-4-7' => [5.00, 25.00, 0.50, 6.25],
    'claude-sonnet-5-5' => [2.00, 10.00, 0.20, 2.50],
    'claude-sonnet-5' => [2.00, 10.00, 0.20, 2.50],
    'claude-sonnet-4-6' => [3.00, 15.00, 0.30, 3.75],
    'claude-haiku-5-5' => [0.10, 0.50, 0.01, 0.125],
    'claude-haiku-4-5' => [1.00, 5.00, 0.10, 1.25],
];

final class QsHttpException extends RuntimeException
{
    /** @param array<string, mixed> $extra */
    public function __construct(
        public readonly string $errorCode,
        public readonly int $status = 400,
        string $message = '',
        public readonly array $extra = [],
    ) {
        parent::__construct($message !== '' ? $message : $errorCode);
    }
}

// ─────────────────────────────────────────────────────────────────────────
// Configuracao e banco
// ─────────────────────────────────────────────────────────────────────────

/** @return array<string, mixed> */
function qs_config(): array
{
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/config.php';
    }
    return $config;
}

function qs_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $db = qs_config()['db'];
    $pdo = new PDO(
        sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $db['host'], $db['port'], $db['database']),
        $db['username'],
        $db['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    $pdo->exec("SET time_zone = '+00:00'");
    qs_migrate($pdo);
    return $pdo;
}

/**
 * Cria/atualiza as tabelas qs_* de forma idempotente na primeira conexao apos o deploy (mesmo padrao do FPV:
 * nao ha passo manual no phpMyAdmin). Serializada por GET_LOCK para requisicoes simultaneas.
 */
function qs_migrate(PDO $pdo): void
{
    try {
        $current = (int) $pdo->query("SELECT value FROM qs_settings WHERE name = 'schema_version'")->fetchColumn();
        if ($current >= QS_SCHEMA_VERSION) {
            return;
        }
    } catch (PDOException $e) {
        // tabela ainda nao existe: segue para criar
    }

    $pdo->query("SELECT GET_LOCK('qs_schema_migrate', 20)");
    try {
        $engine = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
        $pdo->exec("CREATE TABLE IF NOT EXISTS qs_settings (
            name VARCHAR(64) NOT NULL,
            value MEDIUMTEXT NOT NULL,
            is_secret TINYINT(1) NOT NULL DEFAULT 0,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (name)
        ) $engine");

        $pdo->exec("CREATE TABLE IF NOT EXISTS qs_users (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            email VARCHAR(190) NOT NULL,
            name VARCHAR(120) NOT NULL DEFAULT '',
            password_hash VARCHAR(255) NOT NULL,
            locale VARCHAR(5) NOT NULL DEFAULT 'pt',
            email_verified_at DATETIME NULL,
            trial_ends_at DATETIME NULL,
            plan_status VARCHAR(20) NOT NULL DEFAULT 'none',
            plan_currency CHAR(3) NULL,
            current_period_end DATETIME NULL,
            cancel_at_period_end TINYINT(1) NOT NULL DEFAULT 0,
            stripe_customer_id VARCHAR(64) NULL,
            stripe_subscription_id VARCHAR(64) NULL,
            comp_until DATETIME NULL,
            last_login_at DATETIME NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_qs_users_email (email),
            KEY idx_qs_users_customer (stripe_customer_id),
            KEY idx_qs_users_subscription (stripe_subscription_id)
        ) $engine");

        $pdo->exec("CREATE TABLE IF NOT EXISTS qs_sessions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            token_hash CHAR(64) NOT NULL,
            ip_hash CHAR(64) NOT NULL,
            user_agent VARCHAR(200) NOT NULL DEFAULT '',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_seen_at DATETIME NULL,
            expires_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uq_qs_sessions_token (token_hash),
            KEY idx_qs_sessions_user (user_id),
            CONSTRAINT fk_qs_sessions_user FOREIGN KEY (user_id) REFERENCES qs_users (id) ON DELETE CASCADE
        ) $engine");

        $pdo->exec("CREATE TABLE IF NOT EXISTS qs_codes (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            code_hash CHAR(64) NOT NULL,
            attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_qs_codes_user (user_id, created_at),
            CONSTRAINT fk_qs_codes_user FOREIGN KEY (user_id) REFERENCES qs_users (id) ON DELETE CASCADE
        ) $engine");

        $pdo->exec("CREATE TABLE IF NOT EXISTS qs_resets (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            token_hash CHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_qs_resets_token (token_hash),
            CONSTRAINT fk_qs_resets_user FOREIGN KEY (user_id) REFERENCES qs_users (id) ON DELETE CASCADE
        ) $engine");

        $pdo->exec("CREATE TABLE IF NOT EXISTS qs_attempts (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            bucket VARCHAR(32) NOT NULL,
            key_hash CHAR(64) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_qs_attempts_lookup (bucket, key_hash, created_at)
        ) $engine");

        $pdo->exec("CREATE TABLE IF NOT EXISTS qs_ai_usage (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            mode VARCHAR(20) NOT NULL,
            model VARCHAR(48) NOT NULL DEFAULT '',
            input_tokens INT UNSIGNED NOT NULL DEFAULT 0,
            output_tokens INT UNSIGNED NOT NULL DEFAULT 0,
            cache_read_tokens INT UNSIGNED NOT NULL DEFAULT 0,
            cache_write_tokens INT UNSIGNED NOT NULL DEFAULT 0,
            cost_usd DECIMAL(12,6) NOT NULL DEFAULT 0,
            credits INT NOT NULL DEFAULT 0,
            rows_count INT UNSIGNED NOT NULL DEFAULT 0,
            period VARCHAR(7) NOT NULL,
            note VARCHAR(160) NOT NULL DEFAULT '',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_qs_ai_usage_user_period (user_id, period),
            KEY idx_qs_ai_usage_created (created_at),
            CONSTRAINT fk_qs_ai_usage_user FOREIGN KEY (user_id) REFERENCES qs_users (id) ON DELETE CASCADE
        ) $engine");

        $pdo->exec("CREATE TABLE IF NOT EXISTS qs_stripe_events (
            id VARCHAR(80) NOT NULL,
            type VARCHAR(80) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $engine");

        $stmt = $pdo->prepare(
            "INSERT INTO qs_settings (name, value, is_secret) VALUES ('schema_version', :v, 0)
             ON DUPLICATE KEY UPDATE value = VALUES(value)"
        );
        $stmt->execute(['v' => (string) QS_SCHEMA_VERSION]);
    } finally {
        $pdo->query("SELECT RELEASE_LOCK('qs_schema_migrate')");
    }
}

// ─────────────────────────────────────────────────────────────────────────
// Respostas, entrada e utilitarios
// ─────────────────────────────────────────────────────────────────────────

/** @param array<string, mixed> $payload */
function qs_json(array $payload, int $status = 200): never
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Corpo JSON da requisicao (as chamadas do app sao fetch com application/json). */
function qs_input(): array
{
    static $input = null;
    if ($input !== null) {
        return $input;
    }
    $raw = (string) file_get_contents('php://input');
    if (strlen($raw) > 2_000_000) {
        throw new QsHttpException('payload_too_large', 413);
    }
    $decoded = $raw !== '' ? json_decode($raw, true) : [];
    $input = is_array($decoded) ? $decoded : $_POST;
    return $input;
}

function qs_str(mixed $value, int $max = 255): string
{
    if (!is_scalar($value)) {
        return '';
    }
    $value = trim((string) $value);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
    return mb_substr($value, 0, $max);
}

function qs_iso(?string $mysqlDatetime): ?string
{
    if ($mysqlDatetime === null || $mysqlDatetime === '') {
        return null;
    }
    $ts = strtotime($mysqlDatetime . ' UTC');
    return $ts === false ? null : gmdate('Y-m-d\TH:i:s\Z', $ts);
}

function qs_ts(?string $mysqlDatetime): int
{
    if ($mysqlDatetime === null || $mysqlDatetime === '') {
        return 0;
    }
    $ts = strtotime($mysqlDatetime . ' UTC');
    return $ts === false ? 0 : $ts;
}

function qs_is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

/** Origem publica (para links em e-mails e URLs de retorno do Stripe). */
function qs_origin(): string
{
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
    if ($host !== '' && preg_match('/^[A-Za-z0-9.-]+(:\d{2,5})?$/', $host)) {
        return (qs_is_https() ? 'https' : 'http') . '://' . $host;
    }
    return (string) qs_config()['site_url'];
}

function qs_url(string $path = ''): string
{
    return qs_origin() . qs_config()['base_path'] . ($path !== '' ? '/' . ltrim($path, '/') : '');
}

function qs_hash(string $value): string
{
    return hash('sha256', $value . '|' . qs_config()['secret']);
}

function qs_ip_hash(): string
{
    return qs_hash('ip|' . ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'));
}

/**
 * Defesa contra CSRF alem do cookie SameSite=Lax: toda escrita precisa vir do proprio site.
 * (Navegadores enviam Origin em POST de fetch; sem Origin, aceita Referer do mesmo host.)
 */
function qs_require_same_origin(): void
{
    $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    $source = $origin !== '' ? $origin : (string) ($_SERVER['HTTP_REFERER'] ?? '');
    $sourceHost = strtolower((string) parse_url($source, PHP_URL_HOST));
    $sourcePort = parse_url($source, PHP_URL_PORT);
    if ($sourcePort) {
        $sourceHost .= ':' . $sourcePort;
    }
    if ($source === '' || $sourceHost !== $host) {
        throw new QsHttpException('bad_origin', 403);
    }
}

// ─────────────────────────────────────────────────────────────────────────
// Limites de tentativas (login, cadastro, codigos, IA)
// ─────────────────────────────────────────────────────────────────────────

function qs_rate_limited(PDO $pdo, string $bucket, string $key, int $max, int $windowSeconds): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM qs_attempts WHERE bucket = :b AND key_hash = :k AND created_at > (NOW() - INTERVAL ' . (int) $windowSeconds . ' SECOND)'
    );
    $stmt->execute(['b' => $bucket, 'k' => qs_hash($key)]);
    return (int) $stmt->fetchColumn() >= $max;
}

function qs_rate_hit(PDO $pdo, string $bucket, string $key): void
{
    $pdo->prepare('INSERT INTO qs_attempts (bucket, key_hash) VALUES (:b, :k)')
        ->execute(['b' => $bucket, 'k' => qs_hash($key)]);
    // Limpeza oportunista (1% das chamadas): tentativas com mais de 2 dias nao servem para nada.
    if (random_int(1, 100) === 1) {
        $pdo->exec('DELETE FROM qs_attempts WHERE created_at < (NOW() - INTERVAL 2 DAY)');
    }
}

function qs_throttle(PDO $pdo, string $bucket, string $key, int $max, int $windowSeconds): void
{
    if (qs_rate_limited($pdo, $bucket, $key, $max, $windowSeconds)) {
        throw new QsHttpException('too_many_attempts', 429);
    }
    qs_rate_hit($pdo, $bucket, $key);
}

// ─────────────────────────────────────────────────────────────────────────
// Sessoes
// ─────────────────────────────────────────────────────────────────────────

function qs_set_cookie(string $name, string $value, int $expires, bool $httpOnly = true): void
{
    setcookie($name, $value, [
        'expires' => $expires,
        'path' => '/',
        'secure' => qs_is_https(),
        'httponly' => $httpOnly,
        'samesite' => 'Lax',
    ]);
}

function qs_start_session(PDO $pdo, int $userId): void
{
    $token = bin2hex(random_bytes(32));
    $pdo->prepare(
        'INSERT INTO qs_sessions (user_id, token_hash, ip_hash, user_agent, last_seen_at, expires_at)
         VALUES (:u, :t, :ip, :ua, NOW(), (NOW() + INTERVAL ' . QS_SESSION_TTL . ' SECOND))'
    )->execute([
        'u' => $userId,
        't' => hash('sha256', $token),
        'ip' => qs_ip_hash(),
        'ua' => mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 200),
    ]);
    $pdo->prepare('UPDATE qs_users SET last_login_at = NOW() WHERE id = :id')->execute(['id' => $userId]);
    qs_set_cookie(QS_SESSION_COOKIE, $token, time() + QS_SESSION_TTL);
}

function qs_session_user_id(PDO $pdo): ?int
{
    static $resolved = false;
    static $userId = null;
    if ($resolved) {
        return $userId;
    }
    $resolved = true;

    $token = (string) ($_COOKIE[QS_SESSION_COOKIE] ?? '');
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT id, user_id, last_seen_at FROM qs_sessions WHERE token_hash = :t AND expires_at > NOW()');
    $stmt->execute(['t' => hash('sha256', $token)]);
    $session = $stmt->fetch();
    if (!$session) {
        return null;
    }
    // Renova a sessao no maximo 1x por hora (evita escrita a cada request).
    if (qs_ts($session['last_seen_at']) < time() - 3600) {
        $pdo->prepare(
            'UPDATE qs_sessions SET last_seen_at = NOW(), expires_at = (NOW() + INTERVAL ' . QS_SESSION_TTL . ' SECOND) WHERE id = :id'
        )->execute(['id' => $session['id']]);
        qs_set_cookie(QS_SESSION_COOKIE, $token, time() + QS_SESSION_TTL);
    }
    $userId = (int) $session['user_id'];
    return $userId;
}

/** @return array<string, mixed>|null */
function qs_user_row(PDO $pdo, int $userId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM qs_users WHERE id = :id');
    $stmt->execute(['id' => $userId]);
    return $stmt->fetch() ?: null;
}

/** @return array<string, mixed>|null usuario logado e verificado */
function qs_current_user(PDO $pdo): ?array
{
    $id = qs_session_user_id($pdo);
    if ($id === null) {
        return null;
    }
    $user = qs_user_row($pdo, $id);
    return ($user && $user['email_verified_at'] !== null) ? $user : null;
}

/** @return array<string, mixed> */
function qs_require_user(PDO $pdo): array
{
    $user = qs_current_user($pdo);
    if ($user === null) {
        throw new QsHttpException('unauthorized', 401);
    }
    return $user;
}

function qs_end_session(PDO $pdo): void
{
    $token = (string) ($_COOKIE[QS_SESSION_COOKIE] ?? '');
    if (preg_match('/^[a-f0-9]{64}$/', $token)) {
        $pdo->prepare('DELETE FROM qs_sessions WHERE token_hash = :t')->execute(['t' => hash('sha256', $token)]);
    }
    qs_set_cookie(QS_SESSION_COOKIE, '', time() - 3600);
}

// ─────────────────────────────────────────────────────────────────────────
// Configuracoes (qs_settings). Segredos sao gravados com AES-256-GCM.
// ─────────────────────────────────────────────────────────────────────────

function qs_settings_key(): string
{
    return hash('sha256', 'qs-settings|' . qs_config()['secret'], true);
}

function qs_encrypt(string $plain): string
{
    $iv = random_bytes(12);
    $tag = '';
    $cipher = openssl_encrypt($plain, 'aes-256-gcm', qs_settings_key(), OPENSSL_RAW_DATA, $iv, $tag);
    if ($cipher === false) {
        throw new RuntimeException('Falha ao criptografar configuracao.');
    }
    return 'v1:' . base64_encode($iv . $tag . $cipher);
}

function qs_decrypt(string $stored): ?string
{
    if (!str_starts_with($stored, 'v1:')) {
        return null;
    }
    $raw = base64_decode(substr($stored, 3), true);
    if ($raw === false || strlen($raw) < 29) {
        return null;
    }
    $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', qs_settings_key(), OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
    return $plain === false ? null : $plain;
}

/** @return array<string, array{value: string, is_secret: bool}> */
function qs_settings_raw(PDO $pdo, bool $refresh = false): array
{
    static $cache = null;
    if ($cache === null || $refresh) {
        $cache = [];
        foreach ($pdo->query('SELECT name, value, is_secret FROM qs_settings') as $row) {
            $cache[$row['name']] = ['value' => (string) $row['value'], 'is_secret' => (bool) $row['is_secret']];
        }
    }
    return $cache;
}

function qs_setting(PDO $pdo, string $name): string
{
    $all = qs_settings_raw($pdo);
    if (!isset($all[$name])) {
        return QS_SETTING_DEFAULTS[$name] ?? '';
    }
    if ($all[$name]['is_secret']) {
        return qs_decrypt($all[$name]['value']) ?? '';
    }
    return $all[$name]['value'];
}

function qs_setting_set(PDO $pdo, string $name, string $value, bool $secret = false): void
{
    $stored = $secret && $value !== '' ? qs_encrypt($value) : $value;
    $pdo->prepare(
        'INSERT INTO qs_settings (name, value, is_secret) VALUES (:n, :v, :s)
         ON DUPLICATE KEY UPDATE value = VALUES(value), is_secret = VALUES(is_secret)'
    )->execute(['n' => $name, 'v' => $stored, 's' => $secret ? 1 : 0]);
    qs_settings_raw($pdo, true);
}

function qs_setting_float(PDO $pdo, string $name): float
{
    return (float) qs_setting($pdo, $name);
}

function qs_setting_int(PDO $pdo, string $name): int
{
    return (int) qs_setting($pdo, $name);
}

// ─────────────────────────────────────────────────────────────────────────
// Idioma (pt, en, es)
// ─────────────────────────────────────────────────────────────────────────

function qs_lang(?string $explicit = null): string
{
    if ($explicit !== null && in_array($explicit, QS_LANGS, true)) {
        return $explicit;
    }
    $header = strtolower(substr((string) ($_SERVER['HTTP_X_QS_LANG'] ?? ''), 0, 2));
    if (in_array($header, QS_LANGS, true)) {
        return $header;
    }
    $cookie = (string) ($_COOKIE[QS_LANG_COOKIE] ?? '');
    if (in_array($cookie, QS_LANGS, true)) {
        return $cookie;
    }
    foreach (explode(',', strtolower((string) ($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? ''))) as $part) {
        $code = substr(trim($part), 0, 2);
        if (in_array($code, QS_LANGS, true)) {
            return $code;
        }
    }
    return 'pt';
}

/** @return array<string, string> */
function qs_dict(string $lang): array
{
    static $dicts = [];
    if (!isset($dicts[$lang])) {
        $path = __DIR__ . '/../../quosheets/i18n/' . $lang . '.json';
        $decoded = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;
        $dicts[$lang] = is_array($decoded) ? $decoded : [];
    }
    return $dicts[$lang];
}

/** @param array<string, scalar> $vars */
function qs_t(string $key, array $vars = [], ?string $lang = null): string
{
    $lang ??= qs_lang();
    $text = qs_dict($lang)[$key] ?? qs_dict('pt')[$key] ?? $key;
    foreach ($vars as $name => $value) {
        $text = str_replace('{' . $name . '}', (string) $value, $text);
    }
    return $text;
}

// ─────────────────────────────────────────────────────────────────────────
// Acesso ao plano e creditos de IA
// ─────────────────────────────────────────────────────────────────────────

/** @param array<string, mixed> $user */
function qs_is_admin(array $user): bool
{
    if ($user['email_verified_at'] === null) {
        return false;
    }
    $hash = hash('sha256', strtolower(trim((string) $user['email'])));
    return in_array($hash, qs_config()['admin_email_hashes'] ?? [], true);
}

/**
 * Estado de acesso: active (assinante), comp (cortesia do admin), admin, trial ou expired.
 * past_due mantem acesso por alguns dias para o cartao ser regularizado.
 *
 * @param array<string, mixed> $user
 * @return array<string, mixed>
 */
function qs_access(array $user): array
{
    $now = time();
    $periodEnd = qs_ts($user['current_period_end']);
    $subscribed = in_array($user['plan_status'], ['active', 'trialing', 'past_due'], true)
        && $periodEnd > 0 && $periodEnd + QS_PAST_DUE_GRACE_SECONDS > $now;
    $comp = qs_ts($user['comp_until']) > $now;
    $trialEnds = qs_ts($user['trial_ends_at']);

    if (qs_is_admin($user)) {
        $state = 'admin';
    } elseif ($subscribed) {
        $state = 'active';
    } elseif ($comp) {
        $state = 'comp';
    } elseif ($trialEnds > $now) {
        $state = 'trial';
    } else {
        $state = 'expired';
    }

    return [
        'state' => $state,
        'full' => $state !== 'expired',
        'subscribed' => $subscribed,
        'plan_status' => $user['plan_status'],
        'past_due' => $user['plan_status'] === 'past_due',
        'cancel_at_period_end' => (bool) $user['cancel_at_period_end'],
        'current_period_end' => qs_iso($user['current_period_end']),
        'trial_ends_at' => qs_iso($user['trial_ends_at']),
        'comp_until' => qs_iso($user['comp_until']),
        'days_left' => $state === 'trial' ? max(0, (int) ceil(($trialEnds - $now) / 86400)) : null,
    ];
}

/** @param array<string, mixed> $access */
function qs_credit_period(array $access): string
{
    return $access['state'] === 'trial' ? 'trial' : gmdate('Y-m');
}

/** @param array<string, mixed> $access */
function qs_credit_allowance(PDO $pdo, array $access): int
{
    return match ($access['state']) {
        'trial' => qs_setting_int($pdo, 'credits_trial'),
        'active', 'comp', 'admin' => qs_setting_int($pdo, 'credits_monthly'),
        default => 0,
    };
}

/**
 * Creditos do periodo atual. Concessoes do admin entram como linhas mode='grant' com creditos negativos.
 *
 * @param array<string, mixed> $user
 * @param array<string, mixed> $access
 * @return array{allowance: int, used: int, remaining: int, period: string}
 */
function qs_credits(PDO $pdo, array $user, array $access): array
{
    $period = qs_credit_period($access);
    $stmt = $pdo->prepare('SELECT COALESCE(SUM(credits), 0) FROM qs_ai_usage WHERE user_id = :u AND period = :p');
    $stmt->execute(['u' => $user['id'], 'p' => $period]);
    $used = (int) $stmt->fetchColumn();
    $allowance = qs_credit_allowance($pdo, $access);
    return [
        'allowance' => $allowance,
        'used' => max(0, $used),
        'remaining' => $allowance - $used,
        'period' => $period,
    ];
}

/** Preco publico do plano em cada moeda (exibido na landing e usado no checkout). */
function qs_prices(PDO $pdo): array
{
    return [
        'BRL' => round(qs_setting_float($pdo, 'price_brl'), 2),
        'USD' => round(qs_setting_float($pdo, 'price_usd'), 2),
    ];
}

/**
 * Perfil publico do usuario logado para o app (sem segredos).
 *
 * @param array<string, mixed> $user
 * @return array<string, mixed>
 */
function qs_me_payload(PDO $pdo, array $user): array
{
    $access = qs_access($user);
    return [
        'id' => (int) $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'locale' => $user['locale'],
        'is_admin' => qs_is_admin($user),
        'created_at' => qs_iso($user['created_at']),
        'access' => $access,
        'credits' => qs_credits($pdo, $user, $access),
        'plan_currency' => $user['plan_currency'],
        'has_billing' => $user['stripe_customer_id'] !== null,
    ];
}
