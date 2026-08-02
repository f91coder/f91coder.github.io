<?php
declare(strict_types=1);

const FPV_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dias
const FPV_LOGIN_MAX_ATTEMPTS = 8;
const FPV_LOGIN_LOCKOUT_WINDOW_SECONDS = 15 * 60;
const FPV_UPLOAD_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const FPV_UPLOAD_DIR = __DIR__ . '/../../img/fpv-uploads';
const FPV_UPLOAD_PUBLIC_PATH = 'img/fpv-uploads';
const FPV_SESSION_COOKIE_NAME = 'fpv_session';
const FPV_EMAIL_VERIFICATION_TTL_SECONDS = 30 * 60; // 30 min
const FPV_PASSWORD_RESET_TTL_SECONDS = 60 * 60 * 2; // 2h

final class FpvAuthException extends RuntimeException
{
}

function fpv_config(): array
{
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/config.php';
    }
    return $config;
}

function fpv_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = fpv_config();
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
    $pdo->exec("SET time_zone = '+00:00'");

    return $pdo;
}

function fpv_json_response(mixed $payload, int $code = 200): void
{
    if (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function fpv_sanitize_string(mixed $value, int $maxLen = 255): string
{
    if ($value === null) {
        return '';
    }
    $value = trim((string) $value);
    return function_exists('mb_substr') ? mb_substr($value, 0, $maxLen) : substr($value, 0, $maxLen);
}

function fpv_client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function fpv_ip_hash(): string
{
    $config = fpv_config();
    return hash('sha256', fpv_client_ip() . '|' . $config['ip_hash_pepper']);
}

function fpv_generate_uuid(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function fpv_login_rate_limited(PDO $pdo, string $ipHash): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM fpv_login_attempts WHERE ip_hash = :ip_hash AND attempted_at > (NOW() - INTERVAL ' . FPV_LOGIN_LOCKOUT_WINDOW_SECONDS . ' SECOND)'
    );
    $stmt->execute(['ip_hash' => $ipHash]);
    return (int) $stmt->fetchColumn() >= FPV_LOGIN_MAX_ATTEMPTS;
}

function fpv_record_login_attempt(PDO $pdo, string $ipHash): void
{
    $stmt = $pdo->prepare('INSERT INTO fpv_login_attempts (ip_hash) VALUES (:ip_hash)');
    $stmt->execute(['ip_hash' => $ipHash]);
}

function fpv_is_https_request(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function fpv_set_session_cookie(string $token): void
{
    setcookie(FPV_SESSION_COOKIE_NAME, $token, [
        'expires' => time() + FPV_SESSION_TTL_SECONDS,
        'path' => '/',
        'secure' => fpv_is_https_request(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function fpv_clear_session_cookie(): void
{
    setcookie(FPV_SESSION_COOKIE_NAME, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => fpv_is_https_request(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

/** Cria uma sessao para o usuario, seta o cookie e devolve o token gerado (uso interno de login/verify). */
function fpv_start_session(PDO $pdo, int $userId): string
{
    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $stmt = $pdo->prepare(
        'INSERT INTO fpv_sessions (user_id, token_hash, ip_hash, expires_at)
         VALUES (:user_id, :token_hash, :ip_hash, (NOW() + INTERVAL ' . FPV_SESSION_TTL_SECONDS . ' SECOND))'
    );
    $stmt->execute(['user_id' => $userId, 'token_hash' => $tokenHash, 'ip_hash' => fpv_ip_hash()]);
    fpv_set_session_cookie($token);
    return $token;
}

/** Devolve o user_id da sessao atual (cookie), ou null se nao autenticado. Nao lanca excecao. */
function fpv_session_user_id(PDO $pdo): ?int
{
    $token = fpv_sanitize_string($_COOKIE[FPV_SESSION_COOKIE_NAME] ?? '', 128);
    if ($token === '') {
        return null;
    }

    $tokenHash = hash('sha256', $token);
    $stmt = $pdo->prepare('SELECT id, user_id FROM fpv_sessions WHERE token_hash = :token_hash AND expires_at > NOW()');
    $stmt->execute(['token_hash' => $tokenHash]);
    $session = $stmt->fetch();

    if (!$session || $session['user_id'] === null) {
        return null;
    }

    $update = $pdo->prepare(
        'UPDATE fpv_sessions SET last_seen_at = NOW(), expires_at = (NOW() + INTERVAL ' . FPV_SESSION_TTL_SECONDS . ' SECOND) WHERE id = :id'
    );
    $update->execute(['id' => $session['id']]);

    return (int) $session['user_id'];
}

/** Igual fpv_session_user_id, mas lanca FpvAuthException se nao autenticado — uso nas actions da API. */
function require_fpv_session(PDO $pdo): int
{
    $userId = fpv_session_user_id($pdo);
    if ($userId === null) {
        throw new FpvAuthException('Nao autorizado.');
    }
    return $userId;
}

function fpv_only_digits(string $value): string
{
    return preg_replace('/\D+/', '', $value) ?? '';
}

/** Validacao de CPF por digito verificador (modulo 11) — mesmo algoritmo usado no Quozell. */
function fpv_validate_cpf(string $digits): bool
{
    if (strlen($digits) !== 11 || preg_match('/^(\d)\1{10}$/', $digits)) {
        return false;
    }

    for ($pass = 9; $pass <= 10; $pass++) {
        $sum = 0;
        for ($i = 0; $i < $pass; $i++) {
            $sum += (int) $digits[$i] * (($pass + 1) - $i);
        }
        $checkDigit = (($sum * 10) % 11) % 10;
        if ((int) $digits[$pass] !== $checkDigit) {
            return false;
        }
    }

    return true;
}

const FPV_VALID_DDD = [
    11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
    71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
];

/**
 * Validacao estrutural de telefone/WhatsApp brasileiro: 10 digitos (fixo) ou
 * 11 digitos (celular, sempre comecando com 9 apos o DDD), com DDD real (lista
 * ANATEL) e sem sequencias obviamente falsas. Nao confirma que o numero exista
 * de fato — isso exigiria envio de codigo por SMS/WhatsApp, uma verificacao a
 * parte que nao foi pedida aqui.
 */
function fpv_validate_br_phone(string $digits): bool
{
    if (!in_array(strlen($digits), [10, 11], true)) {
        return false;
    }
    if (preg_match('/^(\d)\1+$/', $digits)) {
        return false;
    }

    $ddd = (int) substr($digits, 0, 2);
    if (!in_array($ddd, FPV_VALID_DDD, true)) {
        return false;
    }

    $local = substr($digits, 2);
    if (strlen($local) === 9 && $local[0] !== '9') {
        return false;
    }

    return true;
}
