<?php
declare(strict_types=1);

/**
 * TEMPORARIO: diagnostico do envio de e-mail em producao (sem expor segredos). Remover depois do uso.
 * Acesso: GET api.php?action=mailDiag&t=<token> (so o hash do token fica no codigo).
 */
const QS_DIAG_HASH = 'c85d7d5de7966eb5b373672d85863cff9e693be75f9702925d160c3546051b24';

function qs_action_mail_diag(PDO $pdo): array
{
    if (!hash_equals(QS_DIAG_HASH, hash('sha256', (string) ($_GET['t'] ?? '')))) {
        throw new QsHttpException('not_found', 404);
    }

    $out = ['php' => PHP_VERSION, 'openssl' => extension_loaded('openssl')];
    $out['local_file'] = is_file(__DIR__ . '/../mail-config.local.php');
    $cfg = require __DIR__ . '/../mail-config.php';
    $domain = static fn(string $v): string => $v === '' ? '(vazio)' : '***@' . substr((string) strrchr($v, '@'), 1);
    foreach (['host', 'port', 'encryption', 'username', 'from_email', 'to_email', 'password'] as $key) {
        $value = (string) ($cfg[$key] ?? '');
        $out['cfg'][$key] = match ($key) {
            'host', 'port', 'encryption' => $value,
            'password' => $value === '' ? '(vazio)' : '(definida, ' . strlen($value) . ' caracteres)',
            default => $domain($value),
        };
    }
    $out['cfg']['same_user_from'] = strtolower((string) $cfg['username']) === strtolower((string) $cfg['from_email']);
    $out['dns'] = $cfg['host'] !== '' ? gethostbyname((string) $cfg['host']) : '';

    $logPath = (string) ini_get('error_log');
    $out['error_log'] = $logPath !== '' ? basename(dirname($logPath)) . '/' . basename($logPath) : '(padrao do servidor)';
    $out['log'] = [];
    if ($logPath !== '' && is_readable($logPath)) {
        $size = (int) filesize($logPath);
        $fh = fopen($logPath, 'rb');
        if ($fh) {
            fseek($fh, max(0, $size - 400000));
            $chunk = (string) stream_get_contents($fh);
            fclose($fh);
            $lines = array_filter(explode("\n", $chunk), static fn($l) => stripos($l, 'mail') !== false || stripos($l, 'quosheets') !== false);
            $out['log'] = array_map(static fn($l) => mb_substr($l, 0, 400), array_slice(array_values($lines), -15));
        }
    }

    require_once __DIR__ . '/../phpmailer/src/Exception.php';
    require_once __DIR__ . '/../phpmailer/src/PHPMailer.php';
    require_once __DIR__ . '/../phpmailer/src/SMTP.php';

    $trace = [];
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = (string) $cfg['host'];
    $mail->SMTPAuth = true;
    $mail->Username = (string) $cfg['username'];
    $mail->Password = (string) $cfg['password'];
    $mail->Port = (int) $cfg['port'];
    $encryption = strtolower((string) $cfg['encryption']);
    if (in_array($encryption, ['ssl', 'smtps'], true)) {
        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
    } elseif (!in_array($encryption, ['none', 'off'], true)) {
        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    }
    $mail->Timeout = 20;
    $mail->SMTPDebug = 2;
    $mail->Debugoutput = static function ($str) use (&$trace): void {
        $line = trim((string) preg_replace('/\s+/', ' ', (string) $str));
        if (str_starts_with($line, 'CLIENT -> SERVER:')) {
            // So o verbo do comando: nunca credenciais nem enderecos.
            $line = 'CLIENT -> SERVER: ' . strtoupper((string) strtok(trim(substr($line, 17)), ' :'));
        }
        $trace[] = mb_substr($line, 0, 300);
    };

    $started = microtime(true);
    try {
        $out['connect'] = $mail->smtpConnect();
    } catch (Throwable $e) {
        $out['connect'] = false;
        $out['exception'] = $e->getMessage();
    }
    $out['elapsed_ms'] = (int) round((microtime(true) - $started) * 1000);
    $out['error_info'] = $mail->ErrorInfo;
    try {
        $mail->smtpClose();
    } catch (Throwable) {
    }
    $out['trace'] = array_slice($trace, 0, 80);

    // Envio real so para a propria caixa do site (from_email), quando pedido.
    if (($_GET['send'] ?? '') === '1') {
        try {
            qs_send_verification_email((string) $cfg['from_email'], 'Diagnostico', '000000', 'pt');
            $out['send'] = 'ok';
        } catch (Throwable $e) {
            $out['send'] = 'falhou: ' . $e->getMessage();
        }
    }

    return $out;
}
