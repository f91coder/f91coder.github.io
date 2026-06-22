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

function sanitize_multiline(string $value, int $maxLen = 1500): string
{
    $value = trim($value);
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    return limit_length($value, $maxLen);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response('error', 'Método inválido.', 405);
}

$nome = sanitize_text($_POST['nome'] ?? '', 120);
$dataNascimento = sanitize_text($_POST['data_nascimento'] ?? '', 30);
$cpf = sanitize_text($_POST['cpf'] ?? '', 20);
$rg = sanitize_text($_POST['rg'] ?? '', 20);
$sexo = sanitize_text($_POST['sexo'] ?? '', 20);
$email = sanitize_header($_POST['email'] ?? '', 200);
$whatsapp = sanitize_text($_POST['whatsapp'] ?? '', 30);
$linkedin = sanitize_text($_POST['linkedin'] ?? '', 200);
$site = sanitize_text($_POST['site'] ?? '', 200);
$escolaridade = sanitize_text($_POST['escolaridade'] ?? '', 80);
$curso = sanitize_text($_POST['curso'] ?? '', 120);
$ocupacao = sanitize_text($_POST['ocupacao'] ?? '', 120);
$empresa = sanitize_text($_POST['empresa'] ?? '', 120);
$habilidades = sanitize_multiline($_POST['habilidades'] ?? '', 1500);
$resumo = sanitize_multiline($_POST['resumo'] ?? '', 1500);

if ($nome === '' || $email === '') {
    json_response('error', 'Preencha os campos obrigatórios.', 400);
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
        'Data de nascimento' => $dataNascimento,
        'CPF' => $cpf,
        'RG' => $rg,
        'Sexo' => $sexo,
        'E-mail' => $email,
        'WhatsApp' => $whatsapp,
        'LinkedIn' => $linkedin,
        'Site/Portfólio' => $site,
        'Escolaridade' => $escolaridade,
        'Curso' => $curso,
        'Ocupação atual' => $ocupacao,
        'Empresa' => $empresa,
        'Principais habilidades' => $habilidades,
        'Breve resumo' => $resumo,
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

    $file = $_FILES['foto_perfil'] ?? $_FILES['FotoPerfil'] ?? null;
    if ($file && $file['error'] !== UPLOAD_ERR_NO_FILE) {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            json_response('error', 'Erro ao anexar a foto.', 400);
        }

        $maxSize = 2 * 1024 * 1024;
        if ($file['size'] > $maxSize) {
            json_response('error', 'A foto excede o tamanho máximo permitido (2MB).', 400);
        }

        $mime = '';
        if (class_exists('finfo')) {
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($file['tmp_name']) ?: '';
        } elseif (function_exists('mime_content_type')) {
            $mime = mime_content_type($file['tmp_name']) ?: '';
        }

        $allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if ($mime !== '' && !in_array($mime, $allowed, true)) {
            json_response('error', 'Formato de foto inválido.', 400);
        }
        if ($mime === '') {
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $allowedExt = ['jpg', 'jpeg', 'png', 'webp'];
            if (!in_array($ext, $allowedExt, true)) {
                json_response('error', 'Formato de foto inválido.', 400);
            }
        }

        $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($file['name'])) ?: 'foto-perfil';
        $mail->addAttachment($file['tmp_name'], $safeName);
    }

    $mail->isHTML(true);
    $mail->Subject = 'Novo cadastro recebido!';
    $mail->Body = implode("<br>\n", $htmlLines);
    $mail->AltBody = implode("\n", $textLines);

    $mail->send();
    json_response('success', 'Formulário enviado com sucesso!');
} catch (Exception $e) {
    error_log('Mailer error: ' . $mail->ErrorInfo);
    json_response('error', 'Erro ao enviar. Tente novamente mais tarde.', 500);
}
