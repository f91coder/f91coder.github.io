<?php
declare(strict_types=1);

const FPV_SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h
const FPV_LOGIN_MAX_ATTEMPTS = 8;
const FPV_LOGIN_LOCKOUT_WINDOW_SECONDS = 15 * 60;
const FPV_UPLOAD_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const FPV_UPLOAD_DIR = __DIR__ . '/../../img/fpv-uploads';
const FPV_UPLOAD_PUBLIC_PATH = 'img/fpv-uploads';

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

function require_fpv_session(PDO $pdo, string $token): void
{
    $token = fpv_sanitize_string($token, 128);
    if ($token === '') {
        throw new FpvAuthException('Nao autorizado.');
    }

    $tokenHash = hash('sha256', $token);
    $stmt = $pdo->prepare('SELECT id FROM fpv_sessions WHERE token_hash = :token_hash AND expires_at > NOW()');
    $stmt->execute(['token_hash' => $tokenHash]);
    $session = $stmt->fetch();

    if (!$session) {
        throw new FpvAuthException('Sessao expirada ou invalida.');
    }

    $update = $pdo->prepare(
        'UPDATE fpv_sessions SET last_seen_at = NOW(), expires_at = (NOW() + INTERVAL ' . FPV_SESSION_TTL_SECONDS . ' SECOND) WHERE id = :id'
    );
    $update->execute(['id' => $session['id']]);
}
