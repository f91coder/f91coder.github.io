<?php
declare(strict_types=1);

/**
 * TEMPORARIO: confere a configuracao de e-mail em producao sem enviar mensagem (para em RCPT TO e
 * desiste com RSET). Nao expoe segredos. Remover depois do uso.
 * Acesso: GET api.php?action=mailDiag&t=<token> (so o hash do token fica no codigo).
 */
const QS_DIAG_HASH = '94ff994fb0ab636737ee144cba11a88bf032c0fc3ed2abb71689a8e93a35efa0';

function qs_action_mail_diag(PDO $pdo): array
{
    if (!hash_equals(QS_DIAG_HASH, hash('sha256', (string) ($_GET['t'] ?? '')))) {
        throw new QsHttpException('not_found', 404);
    }

    $out = ['local_file' => is_file(__DIR__ . '/../mail-config.local.php')];
    try {
        $cfg = require __DIR__ . '/../mail-config.php';
        $out['config_loads'] = is_array($cfg);
    } catch (Throwable $e) {
        $out['config_loads'] = false;
        $out['config_error'] = get_class($e) . ': ' . $e->getMessage() . ' (linha ' . $e->getLine() . ')';
        return $out;
    }

    // Enderecos do proprio dominio nao sao segredo; outros aparecem so pelo dominio.
    $show = static fn(string $v): string => $v === '' ? '(vazio)'
        : (str_ends_with(strtolower($v), '@f91.tech') ? $v : '***@' . substr((string) strrchr($v, '@'), 1));
    $out['cfg'] = [
        'host' => (string) $cfg['host'],
        'port' => (string) $cfg['port'],
        'encryption' => (string) $cfg['encryption'],
        'username' => $show(trim((string) $cfg['username'])),
        'from_email' => $show(trim((string) $cfg['from_email'])),
        'from_name' => (string) ($cfg['from_name'] ?? ''),
        'password' => (string) $cfg['password'] === '' ? '(vazia)' : '(definida, ' . strlen((string) $cfg['password']) . ' caracteres)',
        'username_has_spaces' => (string) $cfg['username'] !== trim((string) $cfg['username']),
        'to_email' => array_map(static fn($a) => $show(trim($a)), array_values(array_filter(preg_split('/[,;]+/', (string) $cfg['to_email']) ?: [], static fn($a) => trim($a) !== ''))),
    ];

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
            $line = 'CLIENT -> SERVER: ' . strtoupper((string) strtok(trim(substr($line, 17)), ' :'));
        }
        $trace[] = mb_substr($line, 0, 300);
    };

    try {
        $out['auth'] = $mail->smtpConnect();
        $smtp = $mail->getSMTPInstance();
        $from = trim((string) $cfg['from_email']);
        $out['mail_from'] = $smtp->mail($from);
        $out['mail_from_reply'] = trim($smtp->getLastReply());
        if ($out['mail_from']) {
            $out['rcpt_to'] = $smtp->recipient($from);
            $out['rcpt_reply'] = trim($smtp->getLastReply());
        }
        $smtp->reset();
    } catch (Throwable $e) {
        $out['exception'] = $e->getMessage();
    }
    try {
        $mail->smtpClose();
    } catch (Throwable) {
    }
    $out['trace'] = array_slice($trace, 0, 60);
    return $out;
}
