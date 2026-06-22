<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

ob_start();

require __DIR__ . '/phpmailer/src/Exception.php';
require __DIR__ . '/phpmailer/src/PHPMailer.php';
require __DIR__ . '/phpmailer/src/SMTP.php';

function json_response(string $status, string $message, int $code = 200): void
{
    if (ob_get_level() > 0) {
        ob_end_clean();
    }

    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['status' => $status, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function limit_length(string $value, int $maxLen): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $maxLen);
    }

    return substr($value, 0, $maxLen);
}

function sanitize_text(string $value, int $maxLen = 200): string
{
    $value = trim($value);
    $value = preg_replace('/\s+/', ' ', $value) ?? '';
    return limit_length($value, $maxLen);
}

function sanitize_header(string $value, int $maxLen = 200): string
{
    $value = str_replace(["\r", "\n"], '', $value);
    return sanitize_text($value, $maxLen);
}

function sanitize_multiline(string $value, int $maxLen = 1000): string
{
    $value = trim($value);
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    return limit_length($value, $maxLen);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response('error', 'Método inválido.', 405);
}

$nome = sanitize_text($_POST['nome'] ?? '', 120);
$email = sanitize_header($_POST['email'] ?? '', 200);
$phone = sanitize_text($_POST['phone'] ?? '', 40);
$businessName = sanitize_text($_POST['business_name'] ?? '', 120);
$gender = sanitize_text($_POST['gender'] ?? '', 40);
$cnpj = sanitize_text($_POST['cnpj'] ?? '', 30);
$help = sanitize_multiline($_POST['help'] ?? '', 1000);
$source = sanitize_text($_POST['source'] ?? '', 120);

if ($nome === '' || $email === '') {
    json_response('error', 'Preencha nome e e-mail.', 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response('error', 'E-mail inválido.', 400);
}

$config = require __DIR__ . '/mail-config.php';
$missing = [];
foreach (['host', 'username', 'password', 'from_email', 'to_email'] as $key) {
    if (empty($config[$key])) {
        $missing[] = $key;
    }
}

if ($missing) {
    error_log('SMTP config missing: ' . implode(', ', $missing));
    json_response('error', 'Configuração de e-mail ausente.', 500);
}

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = $config['host'];
    $mail->SMTPAuth = true;
    $mail->Username = $config['username'];
    $mail->Password = $config['password'];
    $mail->Port = (int) $config['port'];

    $encryption = strtolower((string) $config['encryption']);
    if (in_array($encryption, ['ssl', 'smtps'], true)) {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    } elseif (in_array($encryption, ['none', 'off'], true)) {
        $mail->SMTPSecure = false;
    } else {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    }

    $mail->CharSet = 'UTF-8';
    $mail->setFrom($config['from_email'], $config['from_name'] ?: 'F91 - Soluções Operacionais');
    $mail->addAddress($config['to_email']);
    $mail->addReplyTo($email, $nome);

    $fields = [
        'Nome' => $nome,
        'E-mail' => $email,
        'Telefone' => $phone,
        'Gênero' => $gender,
        'Nome da empresa' => $businessName,
        'CNPJ' => $cnpj,
        'Como podemos ajudar' => $help,
        'Como nos conheceu' => $source,
    ];

    $htmlLines = [];
    $textLines = [];
    foreach ($fields as $label => $value) {
        if ($value === '') {
            continue;
        }

        $safeValue = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
        $htmlLines[] = '<strong>' . $label . ':</strong> ' . nl2br($safeValue);
        $textLines[] = $label . ': ' . $value;
    }

    $mail->isHTML(true);
    $mail->Subject = 'Novo lead!';
    $mail->Body = implode("<br>\n", $htmlLines);
    $mail->AltBody = implode("\n", $textLines);

    $mail->send();
    json_response('success', 'Formulário enviado com sucesso!');
} catch (Exception $e) {
    error_log('Mailer error: ' . $mail->ErrorInfo);
    json_response('error', 'Erro ao enviar. Tente novamente mais tarde.', 500);
}
