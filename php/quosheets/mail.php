<?php
declare(strict_types=1);

/**
 * E-mails transacionais do Quosheets (codigo de verificacao e redefinicao de senha), nos 3 idiomas.
 * Usa o mesmo SMTP do site (php/mail-config.php + mail-config.local.php no servidor).
 */

function qs_mail_esc(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

/** @return array{html: string, text: string} */
function qs_mail_layout(string $lang, string $title, string $bodyHtml, string $bodyText, ?array $button = null): array
{
    $brand = '#7ab033';
    $buttonHtml = '';
    if ($button !== null) {
        $buttonHtml = '<tr><td style="padding:8px 0 4px;"><a href="' . qs_mail_esc($button['url']) . '" style="display:inline-block;background:' . $brand
            . ';color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:10px;font-family:Arial,Helvetica,sans-serif;">'
            . qs_mail_esc($button['label']) . '</a></td></tr>';
    }
    $footer = qs_mail_esc(qs_t('email.footer', [], $lang));

    $html = '<!doctype html><html><body style="margin:0;padding:0;background:#f4f7f9;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;padding:32px 12px;"><tr><td align="center">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">'
        . '<tr><td style="padding:28px 32px 6px;font-family:Arial,Helvetica,sans-serif;">'
        . '<div style="font-size:22px;font-weight:800;color:#1e293b;letter-spacing:-.02em;">quo<span style="color:#64748b">sheets</span><span style="color:#8CC63F">.</span></div>'
        . '</td></tr>'
        . '<tr><td style="padding:10px 32px 28px;font-family:Arial,Helvetica,sans-serif;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
        . '<tr><td style="font-size:19px;font-weight:700;color:#1e293b;padding-bottom:10px;">' . qs_mail_esc($title) . '</td></tr>'
        . '<tr><td style="font-size:14.5px;line-height:1.7;color:#475569;">' . $bodyHtml . '</td></tr>'
        . $buttonHtml
        . '</table></td></tr>'
        . '<tr><td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;">' . $footer . '</td></tr>'
        . '</table></td></tr></table></body></html>';

    $text = $title . "\n\n" . $bodyText . ($button ? "\n\n" . $button['url'] : '') . "\n\n--\n" . qs_t('email.footer', [], $lang);
    return ['html' => $html, 'text' => $text];
}

function qs_send_mail(string $toEmail, string $toName, string $subject, array $content): void
{
    if (!qs_config()['mail_enabled']) {
        // Desenvolvimento/testes: grava o e-mail num arquivo local em vez de enviar.
        $log = (string) (qs_config()['mail_log'] ?? '');
        if ($log !== '') {
            file_put_contents($log, json_encode(['to' => $toEmail, 'subject' => $subject, 'text' => $content['text']], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
        }
        return;
    }
    $mailConfig = require __DIR__ . '/../mail-config.php';
    foreach (['host', 'username', 'password', 'from_email'] as $key) {
        if (empty($mailConfig[$key])) {
            throw new RuntimeException('Configuracao de e-mail incompleta: ' . $key);
        }
    }

    require_once __DIR__ . '/../phpmailer/src/Exception.php';
    require_once __DIR__ . '/../phpmailer/src/PHPMailer.php';
    require_once __DIR__ . '/../phpmailer/src/SMTP.php';

    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $mailConfig['host'];
    $mail->SMTPAuth = true;
    $mail->Username = $mailConfig['username'];
    $mail->Password = $mailConfig['password'];
    $mail->Port = (int) $mailConfig['port'];
    $encryption = strtolower((string) $mailConfig['encryption']);
    if (in_array($encryption, ['ssl', 'smtps'], true)) {
        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
    } elseif (!in_array($encryption, ['none', 'off'], true)) {
        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    }
    $mail->CharSet = 'UTF-8';
    $mail->setFrom($mailConfig['from_email'], 'Quosheets');
    $mail->addAddress($toEmail, $toName);
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body = $content['html'];
    $mail->AltBody = $content['text'];
    $mail->send();
}

function qs_send_verification_email(string $email, string $name, string $code, string $lang): void
{
    $body = qs_t('email.verify.body', ['name' => $name], $lang);
    $expires = qs_t('email.verify.expires', [], $lang);
    $codeHtml = '<div style="margin:18px 0;font-size:32px;font-weight:800;letter-spacing:.32em;color:#1e293b;background:#f3f9eb;border:1px solid #cbe6a1;border-radius:12px;padding:14px 0;text-align:center;">'
        . qs_mail_esc($code) . '</div>';
    $content = qs_mail_layout(
        $lang,
        qs_t('email.verify.title', [], $lang),
        '<p style="margin:0;">' . qs_mail_esc($body) . '</p>' . $codeHtml . '<p style="margin:0;font-size:13px;color:#64748b;">' . qs_mail_esc($expires) . '</p>',
        $body . "\n\n" . $code . "\n\n" . $expires
    );
    qs_send_mail($email, $name, qs_t('email.verify.subject', ['code' => $code], $lang), $content);
}

function qs_send_reset_email(string $email, string $name, string $url, string $lang): void
{
    $body = qs_t('email.reset.body', ['name' => $name], $lang);
    $ignore = qs_t('email.reset.ignore', [], $lang);
    $content = qs_mail_layout(
        $lang,
        qs_t('email.reset.title', [], $lang),
        '<p style="margin:0 0 14px;">' . qs_mail_esc($body) . '</p><p style="margin:0 0 6px;font-size:13px;color:#64748b;">' . qs_mail_esc($ignore) . '</p>',
        $body . "\n\n" . $ignore,
        ['url' => $url, 'label' => qs_t('email.reset.button', [], $lang)]
    );
    qs_send_mail($email, $name, qs_t('email.reset.subject', [], $lang), $content);
}
