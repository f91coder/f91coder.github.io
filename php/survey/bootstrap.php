<?php
declare(strict_types=1);

const DASHBOARD_SESSION_TTL_SECONDS = 60 * 60 * 6; // 6h, igual ao TTL anterior no Apps Script
const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_LOCKOUT_WINDOW_SECONDS = 15 * 60;
const SUBMIT_MAX_PER_HOUR = 20;
const SUBMIT_MIN_FILL_SECONDS = 2.5;

final class DashboardAuthException extends RuntimeException
{
}

function survey_config(): array
{
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/db-config.php';
    }
    return $config;
}

function survey_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = survey_config();
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $config['host'],
        $config['port'],
        $config['database']
    );

    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    // Toda comparação de data (NOW(), rate-limit, filtros de período) assume UTC,
    // igual ao que o cliente envia (new Date().toISOString()).
    $pdo->exec("SET time_zone = '+00:00'");

    return $pdo;
}

function json_response(mixed $payload, int $code = 200): void
{
    if (ob_get_level() > 0) {
        ob_end_clean();
    }

    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function sanitize_string(mixed $value, int $maxLen = 255): string
{
    if ($value === null) {
        return '';
    }
    $value = trim((string) $value);
    return function_exists('mb_substr') ? mb_substr($value, 0, $maxLen) : substr($value, 0, $maxLen);
}

function client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function ip_hash(): string
{
    // Nunca guardamos o IP em texto puro — só um hash, suficiente para
    // detectar abuso/rate-limit sem reter dado pessoal identificável direto.
    $config = survey_config();
    return hash('sha256', client_ip() . '|' . $config['ip_hash_pepper']);
}

/** Converte um DATETIME do MySQL (armazenado como UTC "naive") para ISO 8601 com sufixo Z. */
function to_iso_utc(?string $mysqlDatetime): string
{
    if (!$mysqlDatetime) {
        return '';
    }
    return str_replace(' ', 'T', $mysqlDatetime) . 'Z';
}

/** DateTime UTC a partir de um valor DATETIME do MySQL, para conversões de fuso na exibição. */
function utc_datetime_from_mysql(string $mysqlDatetime): DateTime
{
    return new DateTime($mysqlDatetime, new DateTimeZone('UTC'));
}

function sao_paulo_datetime(string $mysqlDatetime): DateTime
{
    $dt = utc_datetime_from_mysql($mysqlDatetime);
    $dt->setTimezone(new DateTimeZone('America/Sao_Paulo'));
    return $dt;
}

function generate_uuid(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function is_valid_uuid_like(string $value): bool
{
    return (bool) preg_match('/^[a-zA-Z0-9_-]{8,64}$/', $value);
}

function parse_json_field(mixed $value, mixed $fallback): mixed
{
    if ($value === null || $value === '') {
        return $fallback;
    }
    if (is_array($value)) {
        return $value;
    }
    $decoded = json_decode((string) $value, true);
    return $decoded === null && json_last_error() !== JSON_ERROR_NONE ? $fallback : $decoded;
}

function safe_json_encode(mixed $value): string
{
    $encoded = json_encode($value, JSON_UNESCAPED_UNICODE);
    return $encoded === false ? '' : $encoded;
}

/**
 * Honeypot + tempo mínimo de preenchimento. Bots que preenchem o campo
 * armadilha ou enviam quase instantaneamente são descartados silenciosamente
 * (resposta de sucesso falsa, sem detalhar o motivo da rejeição).
 */
function looks_like_bot(array $input): bool
{
    if (sanitize_string($input['hp_field'] ?? '', 50) !== '') {
        return true;
    }

    $renderedAt = (float) ($input['form_rendered_at'] ?? 0);
    if ($renderedAt <= 0) {
        return true;
    }

    $elapsedSeconds = (microtime(true) * 1000 - $renderedAt) / 1000;
    return $elapsedSeconds < SUBMIT_MIN_FILL_SECONDS;
}

function submit_rate_limited(PDO $pdo, string $ipHash): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM survey_responses WHERE ip_hash = :ip_hash AND created_at > (NOW() - INTERVAL 1 HOUR)'
    );
    $stmt->execute(['ip_hash' => $ipHash]);
    return (int) $stmt->fetchColumn() >= SUBMIT_MAX_PER_HOUR;
}

function login_rate_limited(PDO $pdo, string $ipHash): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM dashboard_login_attempts WHERE ip_hash = :ip_hash AND attempted_at > (NOW() - INTERVAL ' . LOGIN_LOCKOUT_WINDOW_SECONDS . ' SECOND)'
    );
    $stmt->execute(['ip_hash' => $ipHash]);
    return (int) $stmt->fetchColumn() >= LOGIN_MAX_ATTEMPTS;
}

function record_login_attempt(PDO $pdo, string $ipHash): void
{
    $stmt = $pdo->prepare('INSERT INTO dashboard_login_attempts (ip_hash) VALUES (:ip_hash)');
    $stmt->execute(['ip_hash' => $ipHash]);
}

/**
 * Valida o token de sessão do painel (hash SHA-256 comparado no banco,
 * nunca o token em claro) e renova a expiração (sessão deslizante).
 */
function require_dashboard_session(PDO $pdo, string $token): void
{
    $token = sanitize_string($token, 128);
    if ($token === '') {
        throw new DashboardAuthException('Nao autorizado.');
    }

    $tokenHash = hash('sha256', $token);
    $stmt = $pdo->prepare('SELECT id FROM dashboard_sessions WHERE token_hash = :token_hash AND expires_at > NOW()');
    $stmt->execute(['token_hash' => $tokenHash]);
    $session = $stmt->fetch();

    if (!$session) {
        throw new DashboardAuthException('Sessao expirada ou invalida.');
    }

    $update = $pdo->prepare(
        'UPDATE dashboard_sessions SET last_seen_at = NOW(), expires_at = (NOW() + INTERVAL ' . DASHBOARD_SESSION_TTL_SECONDS . ' SECOND) WHERE id = :id'
    );
    $update->execute(['id' => $session['id']]);
}
