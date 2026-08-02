<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

const FPV_DEFAULT_CATEGORIES = [
    ['Frame', 'bg-gray-100 text-gray-800', 1],
    ['Motores', 'bg-red-100 text-red-800', 2],
    ['FC / ESC', 'bg-blue-100 text-blue-800', 3],
    ['Camera/VTx', 'bg-purple-100 text-purple-800', 4],
    ['Radio/RX', 'bg-yellow-100 text-yellow-800', 5],
    ['Bateria', 'bg-green-100 text-green-800', 6],
    ['Acessorios', 'bg-teal-100 text-teal-800', 7],
];

function fpv_seed_default_categories(PDO $pdo, int $userId): void
{
    $insert = $pdo->prepare('INSERT INTO fpv_categories (user_id, name, color_class, sort_order) VALUES (:user_id, :name, :color_class, :sort_order)');
    foreach (FPV_DEFAULT_CATEGORIES as [$name, $colorClass, $sortOrder]) {
        $insert->execute(['user_id' => $userId, 'name' => $name, 'color_class' => $colorClass, 'sort_order' => $sortOrder]);
    }
}

// ─────────────────────────────────────────────────────────────────────────
// E-mail (clona o padrao de php/survey/lib.php, cores FPV91)
// ─────────────────────────────────────────────────────────────────────────

const FPV_EMAIL_NAVY = '#08203e';
const FPV_EMAIL_NAVY_SOFT = '#122c52';
const FPV_EMAIL_LIME = '#bddc00';
const FPV_EMAIL_INK = '#12142b';
const FPV_EMAIL_MUTED = '#6c7089';
const FPV_EMAIL_BORDER = '#e7e9f2';
const FPV_EMAIL_SURFACE = '#f7f8fb';
const FPV_EMAIL_LOGO_CID = 'cid:fpvlogo';
const FPV_SITE_URL = 'https://www.f91.tech/fpv';

function fpv_email_esc(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

/** Monta o HTML/texto de um e-mail transacional simples (verificacao/reset), mesmo esqueleto visual do survey. */
function fpv_build_email(string $eyebrow, string $heading, string $bodyHtml, string $bodyText, ?array $cta = null): array
{
    $ctaHtml = '';
    if ($cta !== null) {
        $ctaHtml = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;"><tr><td align="center">'
            . '<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:' . FPV_EMAIL_NAVY . ';">'
            . '<a href="' . fpv_email_esc($cta['url']) . '" target="_blank" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;font-weight:700;color:#ffffff;text-decoration:none;">' . fpv_email_esc($cta['label']) . '</a>'
            . '</td></tr></table>'
            . '</td></tr></table>';
    }

    $html = '<!doctype html>'
        . '<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . fpv_email_esc($heading) . '</title></head>'
        . '<body style="margin:0;padding:0;background:#eef0f6;font-family:Arial,Helvetica,sans-serif;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f6;padding:32px 16px;"><tr><td align="center">'
        . '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">'
        . '<tr><td style="background:' . FPV_EMAIL_NAVY . ';padding:26px 32px;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
        . '<td valign="middle"><img src="' . FPV_EMAIL_LOGO_CID . '" height="30" alt="FPV91" style="display:block;height:30px;width:auto;border:0;"></td>'
        . '<td valign="middle" align="right"><span style="display:inline-block;padding:5px 12px;border-radius:999px;background:' . FPV_EMAIL_NAVY_SOFT . ';color:' . FPV_EMAIL_LIME . ';font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">' . fpv_email_esc($eyebrow) . '</span></td>'
        . '</tr></table>'
        . '</td></tr>'
        . '<tr><td style="padding:30px 32px 8px;">'
        . '<div style="font-family:Arial,Helvetica,sans-serif;font-size:21px;font-weight:700;color:' . FPV_EMAIL_INK . ';letter-spacing:-.01em;">' . fpv_email_esc($heading) . '</div>'
        . $bodyHtml
        . $ctaHtml
        . '</td></tr>'
        . '<tr><td style="padding:20px 32px;background:' . FPV_EMAIL_SURFACE . ';border-top:1px solid ' . FPV_EMAIL_BORDER . ';">'
        . '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;line-height:1.6;color:' . FPV_EMAIL_MUTED . ';">FPV91 by F91 &middot; f91.tech/fpv<br>Voce recebeu este e-mail porque criou (ou pediu recuperacao de) uma conta no FPV Setup Planner.</p>'
        . '</td></tr>'
        . '</table></td></tr></table></body></html>';

    return ['html' => $html, 'text' => $bodyText];
}

function fpv_send_mail(string $toEmail, string $toName, string $subject, string $html, string $text): void
{
    $mailConfig = require __DIR__ . '/../mail-config.php';
    $missing = array_filter(['host', 'username', 'password', 'from_email'], static fn($key) => empty($mailConfig[$key]));
    if ($missing) {
        throw new RuntimeException('Configuracao de e-mail incompleta, faltando: ' . implode(', ', $missing));
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
    $mail->setFrom($mailConfig['from_email'], $mailConfig['from_name'] ?: 'FPV91');
    $mail->addAddress($toEmail, $toName);

    $logoPath = __DIR__ . '/../../img/fpv_logo.png';
    if (is_file($logoPath)) {
        $mail->addEmbeddedImage($logoPath, 'fpvlogo', 'fpv_logo.png', 'base64', 'image/png');
    }

    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body = $html;
    $mail->AltBody = $text;
    $mail->send();
}

function fpv_send_verification_email(string $toEmail, string $name, string $code): void
{
    $bodyHtml = '<p style="margin:8px 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;line-height:1.7;color:' . FPV_EMAIL_MUTED . ';">Oi, ' . fpv_email_esc($name) . '! Use o codigo abaixo para confirmar seu e-mail e ativar sua conta no FPV Setup Planner.</p>'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">'
        . '<div style="display:inline-block;padding:16px 32px;border-radius:12px;background:' . FPV_EMAIL_SURFACE . ';border:1px dashed ' . FPV_EMAIL_BORDER . ';font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:800;letter-spacing:.3em;color:' . FPV_EMAIL_INK . ';">' . fpv_email_esc($code) . '</div>'
        . '</td></tr></table>'
        . '<p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:' . FPV_EMAIL_MUTED . ';">Esse codigo expira em 30 minutos. Se voce nao criou essa conta, pode ignorar este e-mail.</p>';

    $email = fpv_build_email('Verificacao de e-mail', 'Confirme seu e-mail', $bodyHtml, "Seu codigo de verificacao: {$code} (expira em 30 minutos)");
    fpv_send_mail($toEmail, $name, 'Seu codigo de verificacao FPV91: ' . $code, $email['html'], $email['text']);
}

function fpv_send_password_reset_email(string $toEmail, string $name, string $resetUrl): void
{
    $bodyHtml = '<p style="margin:8px 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;line-height:1.7;color:' . FPV_EMAIL_MUTED . ';">Oi, ' . fpv_email_esc($name) . '! Recebemos um pedido para redefinir a senha da sua conta no FPV Setup Planner. Clique no botao abaixo para escolher uma nova senha.</p>'
        . '<p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:' . FPV_EMAIL_MUTED . ';">Esse link expira em 2 horas. Se voce nao pediu essa redefinicao, pode ignorar este e-mail — sua senha continua a mesma.</p>';

    $email = fpv_build_email('Redefinicao de senha', 'Redefinir sua senha', $bodyHtml, "Redefina sua senha: {$resetUrl} (expira em 2 horas)", ['url' => $resetUrl, 'label' => 'Redefinir senha']);
    fpv_send_mail($toEmail, $name, 'Redefinir sua senha FPV91', $email['html'], $email['text']);
}

// ─────────────────────────────────────────────────────────────────────────
// Cadastro / verificacao de e-mail
// ─────────────────────────────────────────────────────────────────────────

function register_fpv_user(array $input, ?array $avatarFile): array
{
    $pdo = fpv_pdo();

    $name = fpv_sanitize_string($input['name'] ?? '', 150);
    $email = strtolower(fpv_sanitize_string($input['email'] ?? '', 190));
    $phone = fpv_only_digits(fpv_sanitize_string($input['phone'] ?? '', 20));
    $cpfDigits = fpv_only_digits(fpv_sanitize_string($input['cpf'] ?? '', 20));
    $password = (string) ($input['password'] ?? '');

    if (mb_strlen($name) < 2) {
        return ['success' => false, 'message' => 'Informe seu nome completo.', '_code' => 400];
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'message' => 'E-mail invalido.', '_code' => 400];
    }
    if (strlen($phone) < 10) {
        return ['success' => false, 'message' => 'Informe um telefone/WhatsApp valido, com DDD.', '_code' => 400];
    }
    if (!fpv_validate_cpf($cpfDigits)) {
        return ['success' => false, 'message' => 'CPF invalido.', '_code' => 400];
    }
    if (strlen($password) < 8) {
        return ['success' => false, 'message' => 'A senha precisa ter pelo menos 8 caracteres.', '_code' => 400];
    }

    $existing = $pdo->prepare('SELECT id FROM fpv_users WHERE email = :email OR cpf_digits = :cpf');
    $existing->execute(['email' => $email, 'cpf' => $cpfDigits]);
    if ($existing->fetch()) {
        return ['success' => false, 'message' => 'Ja existe uma conta com esse e-mail ou CPF.', '_code' => 409];
    }

    try {
        $avatarPath = fpv_handle_image_upload($avatarFile, 'avatars');
    } catch (RuntimeException $e) {
        return ['success' => false, 'message' => $e->getMessage(), '_code' => 400];
    }
    if ($avatarPath === '') {
        return ['success' => false, 'message' => 'Envie uma foto de perfil.', '_code' => 400];
    }

    $pdo->beginTransaction();
    try {
        $insert = $pdo->prepare(
            'INSERT INTO fpv_users (name, email, phone, cpf_digits, password_hash, avatar_path)
             VALUES (:name, :email, :phone, :cpf, :password_hash, :avatar_path)'
        );
        $insert->execute([
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'cpf' => $cpfDigits,
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
            'avatar_path' => $avatarPath,
        ]);
        $userId = (int) $pdo->lastInsertId();

        fpv_seed_default_categories($pdo, $userId);

        $code = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        $verify = $pdo->prepare(
            'INSERT INTO fpv_email_verifications (user_id, code, expires_at)
             VALUES (:user_id, :code, (NOW() + INTERVAL ' . FPV_EMAIL_VERIFICATION_TTL_SECONDS . ' SECOND))'
        );
        $verify->execute(['user_id' => $userId, 'code' => $code]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        fpv_delete_image_file($avatarPath);
        throw $e;
    }

    try {
        fpv_send_verification_email($email, $name, $code);
    } catch (Throwable $e) {
        error_log('fpv register: falha ao enviar e-mail de verificacao: ' . $e->getMessage());
    }

    return ['success' => true, 'email' => $email];
}

function resend_fpv_verification(array $input): array
{
    $pdo = fpv_pdo();
    $email = strtolower(fpv_sanitize_string($input['email'] ?? '', 190));

    $stmt = $pdo->prepare('SELECT id, name, email_verified_at FROM fpv_users WHERE email = :email');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    // Resposta generica de proposito: nao confirma/nega existencia de conta.
    $generic = ['success' => true, 'message' => 'Se encontramos essa conta e ela ainda nao foi verificada, reenviamos o codigo.'];

    if (!$user || $user['email_verified_at'] !== null) {
        return $generic;
    }

    $code = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
    $upsert = $pdo->prepare(
        'INSERT INTO fpv_email_verifications (user_id, code, expires_at)
         VALUES (:user_id, :code, (NOW() + INTERVAL ' . FPV_EMAIL_VERIFICATION_TTL_SECONDS . ' SECOND))
         ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at)'
    );
    $upsert->execute(['user_id' => $user['id'], 'code' => $code]);

    try {
        fpv_send_verification_email($email, $user['name'], $code);
    } catch (Throwable $e) {
        error_log('fpv resend verification: ' . $e->getMessage());
    }

    return $generic;
}

function verify_fpv_email(array $input): array
{
    $pdo = fpv_pdo();
    $email = strtolower(fpv_sanitize_string($input['email'] ?? '', 190));
    $code = fpv_sanitize_string($input['code'] ?? '', 4);

    $stmt = $pdo->prepare('SELECT id FROM fpv_users WHERE email = :email');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();
    if (!$user) {
        return ['success' => false, 'message' => 'Conta nao encontrada.', '_code' => 404];
    }

    $verifyStmt = $pdo->prepare('SELECT code FROM fpv_email_verifications WHERE user_id = :user_id AND expires_at > NOW()');
    $verifyStmt->execute(['user_id' => $user['id']]);
    $verification = $verifyStmt->fetch();

    if (!$verification || !hash_equals($verification['code'], $code)) {
        return ['success' => false, 'message' => 'Codigo invalido ou expirado.', '_code' => 400];
    }

    $pdo->prepare('UPDATE fpv_users SET email_verified_at = NOW() WHERE id = :id')->execute(['id' => $user['id']]);
    $pdo->prepare('DELETE FROM fpv_email_verifications WHERE user_id = :id')->execute(['id' => $user['id']]);

    fpv_start_session($pdo, (int) $user['id']);

    return ['success' => true];
}

// ─────────────────────────────────────────────────────────────────────────
// Login / logout / perfil
// ─────────────────────────────────────────────────────────────────────────

function login_fpv(array $input): array
{
    $pdo = fpv_pdo();
    $ipHash = fpv_ip_hash();

    if (fpv_login_rate_limited($pdo, $ipHash)) {
        return ['success' => false, 'message' => 'Muitas tentativas de login. Tente novamente mais tarde.', '_code' => 429];
    }

    $email = strtolower(fpv_sanitize_string($input['email'] ?? '', 190));
    $password = (string) ($input['password'] ?? '');

    $stmt = $pdo->prepare('SELECT id, name, password_hash, email_verified_at FROM fpv_users WHERE email = :email');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        fpv_record_login_attempt($pdo, $ipHash);
        return ['success' => false, 'message' => 'E-mail ou senha invalidos.', '_code' => 401];
    }

    if ($user['email_verified_at'] === null) {
        return ['success' => false, 'message' => 'Confirme seu e-mail antes de entrar.', 'needs_verification' => true, 'email' => $email, '_code' => 403];
    }

    fpv_start_session($pdo, (int) $user['id']);

    return ['success' => true, 'name' => $user['name']];
}

function logout_fpv(): array
{
    $pdo = fpv_pdo();
    $token = fpv_sanitize_string($_COOKIE[FPV_SESSION_COOKIE_NAME] ?? '', 128);
    if ($token !== '') {
        $stmt = $pdo->prepare('DELETE FROM fpv_sessions WHERE token_hash = :token_hash');
        $stmt->execute(['token_hash' => hash('sha256', $token)]);
    }
    fpv_clear_session_cookie();
    return ['success' => true];
}

function request_fpv_password_reset(array $input): array
{
    $pdo = fpv_pdo();
    $identifier = fpv_sanitize_string($input['identifier'] ?? '', 190);
    $generic = ['success' => true, 'message' => 'Se encontrarmos esse cadastro, enviamos um link de redefinicao para o e-mail associado a ele.'];

    if ($identifier === '') {
        return $generic;
    }

    $digits = fpv_only_digits($identifier);
    if (strlen($digits) === 11) {
        $stmt = $pdo->prepare('SELECT id, name, email FROM fpv_users WHERE cpf_digits = :cpf');
        $stmt->execute(['cpf' => $digits]);
    } else {
        $stmt = $pdo->prepare('SELECT id, name, email FROM fpv_users WHERE email = :email');
        $stmt->execute(['email' => strtolower($identifier)]);
    }
    $user = $stmt->fetch();

    if (!$user) {
        return $generic;
    }

    $token = bin2hex(random_bytes(32));
    $insert = $pdo->prepare(
        'INSERT INTO fpv_password_resets (user_id, token_hash, expires_at)
         VALUES (:user_id, :token_hash, (NOW() + INTERVAL ' . FPV_PASSWORD_RESET_TTL_SECONDS . ' SECOND))'
    );
    $insert->execute(['user_id' => $user['id'], 'token_hash' => hash('sha256', $token)]);

    $resetUrl = FPV_SITE_URL . '/redefinir-senha?token=' . $token;
    try {
        fpv_send_password_reset_email($user['email'], $user['name'], $resetUrl);
    } catch (Throwable $e) {
        error_log('fpv password reset: ' . $e->getMessage());
    }

    // Nunca revela o e-mail associado na resposta — so confirma que, se existir, o link foi enviado.
    return $generic;
}

function reset_fpv_password(array $input): array
{
    $pdo = fpv_pdo();
    $token = fpv_sanitize_string($input['token'] ?? '', 128);
    $password = (string) ($input['password'] ?? '');

    if ($token === '' || strlen($password) < 8) {
        return ['success' => false, 'message' => 'Dados invalidos.', '_code' => 400];
    }

    $stmt = $pdo->prepare('SELECT id, user_id FROM fpv_password_resets WHERE token_hash = :token_hash AND expires_at > NOW()');
    $stmt->execute(['token_hash' => hash('sha256', $token)]);
    $reset = $stmt->fetch();

    if (!$reset) {
        return ['success' => false, 'message' => 'Link invalido ou expirado.', '_code' => 400];
    }

    $pdo->prepare('UPDATE fpv_users SET password_hash = :hash WHERE id = :id')
        ->execute(['hash' => password_hash($password, PASSWORD_BCRYPT), 'id' => $reset['user_id']]);
    $pdo->prepare('DELETE FROM fpv_password_resets WHERE user_id = :id')->execute(['id' => $reset['user_id']]);
    $pdo->prepare('DELETE FROM fpv_sessions WHERE user_id = :id')->execute(['id' => $reset['user_id']]);

    return ['success' => true];
}

function get_fpv_current_user(PDO $pdo, int $userId): ?array
{
    $stmt = $pdo->prepare('SELECT id, name, email, phone, avatar_path, is_admin FROM fpv_users WHERE id = :id');
    $stmt->execute(['id' => $userId]);
    $user = $stmt->fetch();
    if (!$user) {
        return null;
    }
    return [
        'id' => (int) $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'phone' => $user['phone'],
        'avatar_path' => $user['avatar_path'],
        'is_admin' => (bool) $user['is_admin'],
    ];
}

function update_fpv_profile(array $input, ?array $avatarFile): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);

    $stmt = $pdo->prepare('SELECT avatar_path FROM fpv_users WHERE id = :id');
    $stmt->execute(['id' => $userId]);
    $existing = $stmt->fetch();
    if (!$existing) {
        return ['success' => false, 'message' => 'Usuario nao encontrado.', '_code' => 404];
    }

    $name = fpv_sanitize_string($input['name'] ?? '', 150);
    $phone = fpv_only_digits(fpv_sanitize_string($input['phone'] ?? '', 20));
    if (mb_strlen($name) < 2 || strlen($phone) < 10) {
        return ['success' => false, 'message' => 'Nome e telefone sao obrigatorios.', '_code' => 400];
    }

    try {
        $newAvatar = fpv_handle_image_upload($avatarFile, 'avatars');
    } catch (RuntimeException $e) {
        return ['success' => false, 'message' => $e->getMessage(), '_code' => 400];
    }

    $avatarPath = $existing['avatar_path'];
    if ($newAvatar !== '') {
        fpv_delete_image_file($avatarPath);
        $avatarPath = $newAvatar;
    }

    $pdo->prepare('UPDATE fpv_users SET name = :name, phone = :phone, avatar_path = :avatar_path WHERE id = :id')
        ->execute(['name' => $name, 'phone' => $phone, 'avatar_path' => $avatarPath, 'id' => $userId]);

    return ['success' => true, 'user' => get_fpv_current_user($pdo, $userId)];
}

// ─────────────────────────────────────────────────────────────────────────
// Board (leitura combinada) — sempre escopado ao usuario da sessao
// ─────────────────────────────────────────────────────────────────────────

function get_fpv_board(array $params): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);

    $categories = $pdo->prepare('SELECT id, name, color_class, sort_order FROM fpv_categories WHERE user_id = :user_id ORDER BY sort_order, id');
    $categories->execute(['user_id' => $userId]);

    $items = $pdo->prepare(
        'SELECT id, item_uuid, name, category_id, price, store_url, image_path, is_purchased, sort_order, created_at
         FROM fpv_items WHERE user_id = :user_id ORDER BY sort_order, id'
    );
    $items->execute(['user_id' => $userId]);

    $planningStmt = $pdo->prepare('SELECT saved_amount, target_date FROM fpv_planning WHERE user_id = :user_id');
    $planningStmt->execute(['user_id' => $userId]);
    $planning = $planningStmt->fetch() ?: ['saved_amount' => '0.00', 'target_date' => null];

    $videos = $pdo->prepare('SELECT id, url, title, video_id FROM fpv_videos WHERE user_id = :user_id ORDER BY sort_order, id DESC');
    $videos->execute(['user_id' => $userId]);

    return [
        'success' => true,
        'user' => get_fpv_current_user($pdo, $userId),
        'categories' => array_map(static fn($row) => [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'color_class' => $row['color_class'],
            'sort_order' => (int) $row['sort_order'],
        ], $categories->fetchAll()),
        'items' => array_map(static fn($row) => [
            'id' => (int) $row['id'],
            'item_uuid' => $row['item_uuid'],
            'name' => $row['name'],
            'category_id' => $row['category_id'] !== null ? (int) $row['category_id'] : null,
            'price' => (float) $row['price'],
            'store_url' => $row['store_url'],
            'image_path' => $row['image_path'],
            'is_purchased' => (bool) $row['is_purchased'],
            'sort_order' => (int) $row['sort_order'],
            'created_at' => $row['created_at'],
        ], $items->fetchAll()),
        'planning' => [
            'saved_amount' => (float) $planning['saved_amount'],
            'target_date' => $planning['target_date'],
        ],
        'videos' => array_map(static fn($row) => [
            'id' => (int) $row['id'],
            'url' => $row['url'],
            'title' => $row['title'],
            'video_id' => $row['video_id'],
        ], $videos->fetchAll()),
    ];
}

// ─────────────────────────────────────────────────────────────────────────
// Categorias
// ─────────────────────────────────────────────────────────────────────────

function add_fpv_category(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);

    $name = fpv_sanitize_string($input['name'] ?? '', 80);
    $colorClass = fpv_sanitize_string($input['color_class'] ?? '', 60) ?: 'bg-gray-100 text-gray-800';

    if ($name === '') {
        return ['success' => false, 'message' => 'Nome da categoria obrigatorio.', '_code' => 400];
    }

    $sortStmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM fpv_categories WHERE user_id = :user_id');
    $sortStmt->execute(['user_id' => $userId]);
    $sortOrder = (int) $sortStmt->fetchColumn();

    $stmt = $pdo->prepare('INSERT INTO fpv_categories (user_id, name, color_class, sort_order) VALUES (:user_id, :name, :color_class, :sort_order)');
    $stmt->execute(['user_id' => $userId, 'name' => $name, 'color_class' => $colorClass, 'sort_order' => $sortOrder]);

    return [
        'success' => true,
        'category' => ['id' => (int) $pdo->lastInsertId(), 'name' => $name, 'color_class' => $colorClass, 'sort_order' => $sortOrder],
    ];
}

function delete_fpv_category(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);

    $id = (int) ($input['category_id'] ?? 0);
    if ($id <= 0) {
        return ['success' => false, 'message' => 'category_id invalido.', '_code' => 400];
    }

    $stmt = $pdo->prepare('DELETE FROM fpv_categories WHERE id = :id AND user_id = :user_id');
    $stmt->execute(['id' => $id, 'user_id' => $userId]);

    return ['success' => true];
}

// ─────────────────────────────────────────────────────────────────────────
// Itens
// ─────────────────────────────────────────────────────────────────────────

function fpv_upload_dir_ensure(string $subdir = ''): string
{
    $dir = FPV_UPLOAD_DIR . ($subdir !== '' ? '/' . $subdir : '');
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

/** Valida e move um upload de imagem. Retorna o path publico relativo, ou '' se nao houver arquivo. */
function fpv_handle_image_upload(?array $file, string $subdir = ''): string
{
    if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return '';
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Falha no upload da imagem.');
    }
    if ($file['size'] > FPV_UPLOAD_MAX_BYTES) {
        throw new RuntimeException('Imagem maior que 5MB.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->file($file['tmp_name']);
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
    if (!isset($allowed[$mime])) {
        throw new RuntimeException('Formato de imagem nao suportado.');
    }

    $dir = fpv_upload_dir_ensure($subdir);
    $filename = bin2hex(random_bytes(16)) . '.' . $allowed[$mime];
    $destination = $dir . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        throw new RuntimeException('Nao foi possivel salvar a imagem.');
    }

    return FPV_UPLOAD_PUBLIC_PATH . ($subdir !== '' ? '/' . $subdir : '') . '/' . $filename;
}

function fpv_delete_image_file(string $imagePath): void
{
    if ($imagePath === '') {
        return;
    }
    $full = __DIR__ . '/../../' . ltrim($imagePath, '/');
    if (is_file($full)) {
        @unlink($full);
    }
}

function add_fpv_item(array $input, ?array $file): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);

    $name = fpv_sanitize_string($input['name'] ?? '', 200);
    if ($name === '') {
        return ['success' => false, 'message' => 'Nome do item obrigatorio.', '_code' => 400];
    }

    $price = round((float) ($input['price'] ?? 0), 2);
    if ($price < 0) {
        $price = 0;
    }

    $storeUrl = fpv_sanitize_string($input['store_url'] ?? '', 500);
    $categoryId = isset($input['category_id']) && $input['category_id'] !== '' ? (int) $input['category_id'] : null;

    if ($categoryId !== null) {
        $check = $pdo->prepare('SELECT id FROM fpv_categories WHERE id = :id AND user_id = :user_id');
        $check->execute(['id' => $categoryId, 'user_id' => $userId]);
        if (!$check->fetch()) {
            $categoryId = null;
        }
    }

    try {
        $imagePath = fpv_handle_image_upload($file, 'items');
    } catch (RuntimeException $e) {
        return ['success' => false, 'message' => $e->getMessage(), '_code' => 400];
    }

    $itemUuid = fpv_generate_uuid();
    $sortStmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM fpv_items WHERE user_id = :user_id');
    $sortStmt->execute(['user_id' => $userId]);
    $sortOrder = (int) $sortStmt->fetchColumn();

    $stmt = $pdo->prepare(
        'INSERT INTO fpv_items (user_id, item_uuid, name, category_id, price, store_url, image_path, sort_order)
         VALUES (:user_id, :item_uuid, :name, :category_id, :price, :store_url, :image_path, :sort_order)'
    );
    $stmt->execute([
        'user_id' => $userId,
        'item_uuid' => $itemUuid,
        'name' => $name,
        'category_id' => $categoryId,
        'price' => $price,
        'store_url' => $storeUrl,
        'image_path' => $imagePath,
        'sort_order' => $sortOrder,
    ]);

    return [
        'success' => true,
        'item' => [
            'id' => (int) $pdo->lastInsertId(),
            'item_uuid' => $itemUuid,
            'name' => $name,
            'category_id' => $categoryId,
            'price' => $price,
            'store_url' => $storeUrl,
            'image_path' => $imagePath,
            'is_purchased' => false,
            'sort_order' => $sortOrder,
        ],
    ];
}

function update_fpv_item(array $input, ?array $file): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);

    $itemUuid = fpv_sanitize_string($input['item_uuid'] ?? '', 64);
    if ($itemUuid === '') {
        return ['success' => false, 'message' => 'item_uuid obrigatorio.', '_code' => 400];
    }

    $stmt = $pdo->prepare('SELECT * FROM fpv_items WHERE item_uuid = :item_uuid AND user_id = :user_id');
    $stmt->execute(['item_uuid' => $itemUuid, 'user_id' => $userId]);
    $existing = $stmt->fetch();
    if (!$existing) {
        return ['success' => false, 'message' => 'Item nao encontrado.', '_code' => 404];
    }

    $name = isset($input['name']) ? fpv_sanitize_string($input['name'], 200) : $existing['name'];
    $price = isset($input['price']) ? round((float) $input['price'], 2) : (float) $existing['price'];
    if ($price < 0) {
        $price = 0;
    }
    $storeUrl = isset($input['store_url']) ? fpv_sanitize_string($input['store_url'], 500) : $existing['store_url'];
    $categoryId = $existing['category_id'] !== null ? (int) $existing['category_id'] : null;
    if (array_key_exists('category_id', $input)) {
        $categoryId = $input['category_id'] !== '' ? (int) $input['category_id'] : null;
        if ($categoryId !== null) {
            $check = $pdo->prepare('SELECT id FROM fpv_categories WHERE id = :id AND user_id = :user_id');
            $check->execute(['id' => $categoryId, 'user_id' => $userId]);
            if (!$check->fetch()) {
                $categoryId = null;
            }
        }
    }
    $isPurchased = isset($input['is_purchased']) ? (int) filter_var($input['is_purchased'], FILTER_VALIDATE_BOOLEAN) : (int) $existing['is_purchased'];

    $imagePath = $existing['image_path'];
    try {
        $newImage = fpv_handle_image_upload($file, 'items');
    } catch (RuntimeException $e) {
        return ['success' => false, 'message' => $e->getMessage(), '_code' => 400];
    }
    if ($newImage !== '') {
        fpv_delete_image_file($imagePath);
        $imagePath = $newImage;
    }

    $update = $pdo->prepare(
        'UPDATE fpv_items SET name = :name, category_id = :category_id, price = :price, store_url = :store_url,
         image_path = :image_path, is_purchased = :is_purchased WHERE item_uuid = :item_uuid AND user_id = :user_id'
    );
    $update->execute([
        'name' => $name,
        'category_id' => $categoryId,
        'price' => $price,
        'store_url' => $storeUrl,
        'image_path' => $imagePath,
        'is_purchased' => $isPurchased,
        'item_uuid' => $itemUuid,
        'user_id' => $userId,
    ]);

    return [
        'success' => true,
        'item' => [
            'item_uuid' => $itemUuid,
            'name' => $name,
            'category_id' => $categoryId,
            'price' => $price,
            'store_url' => $storeUrl,
            'image_path' => $imagePath,
            'is_purchased' => (bool) $isPurchased,
        ],
    ];
}

function delete_fpv_item(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);

    $itemUuid = fpv_sanitize_string($input['item_uuid'] ?? '', 64);
    if ($itemUuid === '') {
        return ['success' => false, 'message' => 'item_uuid obrigatorio.', '_code' => 400];
    }

    $stmt = $pdo->prepare('SELECT image_path FROM fpv_items WHERE item_uuid = :item_uuid AND user_id = :user_id');
    $stmt->execute(['item_uuid' => $itemUuid, 'user_id' => $userId]);
    $row = $stmt->fetch();

    $delete = $pdo->prepare('DELETE FROM fpv_items WHERE item_uuid = :item_uuid AND user_id = :user_id');
    $delete->execute(['item_uuid' => $itemUuid, 'user_id' => $userId]);

    if ($row && $row['image_path']) {
        fpv_delete_image_file($row['image_path']);
    }

    return ['success' => true];
}

// ─────────────────────────────────────────────────────────────────────────
// Planejamento financeiro
// ─────────────────────────────────────────────────────────────────────────

function save_fpv_planning(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);

    $savedAmount = round((float) ($input['saved_amount'] ?? 0), 2);
    if ($savedAmount < 0) {
        $savedAmount = 0;
    }
    $targetDate = fpv_sanitize_string($input['target_date'] ?? '', 10);
    $targetDate = preg_match('/^\d{4}-\d{2}-\d{2}$/', $targetDate) ? $targetDate : null;

    $stmt = $pdo->prepare(
        'INSERT INTO fpv_planning (user_id, saved_amount, target_date) VALUES (:user_id, :saved_amount, :target_date)
         ON DUPLICATE KEY UPDATE saved_amount = VALUES(saved_amount), target_date = VALUES(target_date)'
    );
    $stmt->execute(['user_id' => $userId, 'saved_amount' => $savedAmount, 'target_date' => $targetDate]);

    return ['success' => true, 'planning' => ['saved_amount' => $savedAmount, 'target_date' => $targetDate]];
}

// ─────────────────────────────────────────────────────────────────────────
// Videos favoritos
// ─────────────────────────────────────────────────────────────────────────

function fpv_extract_youtube_id(string $url): string
{
    if (preg_match('/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/', $url, $matches)) {
        return $matches[1];
    }
    return '';
}

function add_fpv_video(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);

    $url = fpv_sanitize_string($input['url'] ?? '', 500);
    $title = fpv_sanitize_string($input['title'] ?? '', 255);
    if ($url === '' || !filter_var($url, FILTER_VALIDATE_URL)) {
        return ['success' => false, 'message' => 'URL invalida.', '_code' => 400];
    }

    $videoId = fpv_extract_youtube_id($url);
    if ($videoId === '') {
        return ['success' => false, 'message' => 'Informe um link valido do YouTube.', '_code' => 400];
    }

    $stmt = $pdo->prepare('INSERT INTO fpv_videos (user_id, url, title, video_id) VALUES (:user_id, :url, :title, :video_id)');
    $stmt->execute(['user_id' => $userId, 'url' => $url, 'title' => $title, 'video_id' => $videoId]);

    return [
        'success' => true,
        'video' => ['id' => (int) $pdo->lastInsertId(), 'url' => $url, 'title' => $title, 'video_id' => $videoId],
    ];
}

function delete_fpv_video(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);

    $id = (int) ($input['video_id'] ?? 0);
    if ($id <= 0) {
        return ['success' => false, 'message' => 'video_id invalido.', '_code' => 400];
    }

    $stmt = $pdo->prepare('DELETE FROM fpv_videos WHERE id = :id AND user_id = :user_id');
    $stmt->execute(['id' => $id, 'user_id' => $userId]);

    return ['success' => true];
}

// ─────────────────────────────────────────────────────────────────────────
// Reset dos dados do usuario (mantem a conta, apaga so board/planejamento)
// ─────────────────────────────────────────────────────────────────────────

function reset_fpv_data(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);

    $images = $pdo->prepare('SELECT image_path FROM fpv_items WHERE user_id = :user_id AND image_path <> \'\'');
    $images->execute(['user_id' => $userId]);
    $rows = $images->fetchAll();

    $pdo->prepare('DELETE FROM fpv_items WHERE user_id = :user_id')->execute(['user_id' => $userId]);
    $pdo->prepare('DELETE FROM fpv_categories WHERE user_id = :user_id')->execute(['user_id' => $userId]);
    $pdo->prepare('DELETE FROM fpv_videos WHERE user_id = :user_id')->execute(['user_id' => $userId]);
    $pdo->prepare('DELETE FROM fpv_planning WHERE user_id = :user_id')->execute(['user_id' => $userId]);

    foreach ($rows as $row) {
        fpv_delete_image_file($row['image_path']);
    }

    fpv_seed_default_categories($pdo, $userId);

    return ['success' => true];
}

// ─────────────────────────────────────────────────────────────────────────
// Blog / tutoriais
// ─────────────────────────────────────────────────────────────────────────

function fpv_slugify(string $value): string
{
    $value = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    return trim($value, '-');
}

function list_fpv_posts(string $type, int $limit = 0, bool $onlyPublished = true): array
{
    $pdo = fpv_pdo();
    $sql = 'SELECT id, type, slug, title, excerpt, cover_image_path, author_id, is_published, published_at
            FROM fpv_posts WHERE type = :type';
    if ($onlyPublished) {
        $sql .= ' AND is_published = 1';
    }
    $sql .= ' ORDER BY published_at DESC, id DESC';
    if ($limit > 0) {
        $sql .= ' LIMIT ' . $limit;
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['type' => $type]);
    return $stmt->fetchAll();
}

function get_fpv_post_by_slug(string $slug): ?array
{
    $pdo = fpv_pdo();
    $stmt = $pdo->prepare('SELECT * FROM fpv_posts WHERE slug = :slug AND is_published = 1');
    $stmt->execute(['slug' => $slug]);
    $post = $stmt->fetch();
    return $post ?: null;
}

function require_fpv_admin(PDO $pdo): int
{
    $userId = require_fpv_session($pdo);
    $user = get_fpv_current_user($pdo, $userId);
    if (!$user || !$user['is_admin']) {
        throw new FpvAuthException('Acesso restrito.');
    }
    return $userId;
}

function save_fpv_post(array $input, ?array $coverFile): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_admin($pdo);

    $title = fpv_sanitize_string($input['title'] ?? '', 200);
    $type = ($input['type'] ?? 'blog') === 'tutorial' ? 'tutorial' : 'blog';
    $excerpt = fpv_sanitize_string($input['excerpt'] ?? '', 300);
    $content = (string) ($input['content_markdown'] ?? '');
    $isPublished = (int) filter_var($input['is_published'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $postId = (int) ($input['id'] ?? 0);

    if ($title === '' || trim($content) === '') {
        return ['success' => false, 'message' => 'Titulo e conteudo sao obrigatorios.', '_code' => 400];
    }

    try {
        $coverPath = fpv_handle_image_upload($coverFile, 'posts');
    } catch (RuntimeException $e) {
        return ['success' => false, 'message' => $e->getMessage(), '_code' => 400];
    }

    if ($postId > 0) {
        $existingStmt = $pdo->prepare('SELECT slug, cover_image_path, published_at FROM fpv_posts WHERE id = :id');
        $existingStmt->execute(['id' => $postId]);
        $existing = $existingStmt->fetch();
        if (!$existing) {
            return ['success' => false, 'message' => 'Post nao encontrado.', '_code' => 404];
        }
        $slug = $existing['slug'];
        $coverImagePath = $coverPath !== '' ? $coverPath : $existing['cover_image_path'];
        if ($coverPath !== '' && $existing['cover_image_path'] !== '') {
            fpv_delete_image_file($existing['cover_image_path']);
        }
        $publishedAt = $existing['published_at'] ?? ($isPublished ? date('Y-m-d H:i:s') : null);
        if ($isPublished && $publishedAt === null) {
            $publishedAt = date('Y-m-d H:i:s');
        }

        $update = $pdo->prepare(
            'UPDATE fpv_posts SET type = :type, title = :title, excerpt = :excerpt, cover_image_path = :cover,
             content_markdown = :content, is_published = :is_published, published_at = :published_at WHERE id = :id'
        );
        $update->execute([
            'type' => $type, 'title' => $title, 'excerpt' => $excerpt, 'cover' => $coverImagePath,
            'content' => $content, 'is_published' => $isPublished, 'published_at' => $publishedAt, 'id' => $postId,
        ]);

        return ['success' => true, 'post' => ['id' => $postId, 'slug' => $slug]];
    }

    $baseSlug = fpv_slugify($title) ?: ('post-' . bin2hex(random_bytes(4)));
    $slug = $baseSlug;
    $suffix = 2;
    $slugCheck = $pdo->prepare('SELECT id FROM fpv_posts WHERE slug = :slug');
    while (true) {
        $slugCheck->execute(['slug' => $slug]);
        if (!$slugCheck->fetch()) {
            break;
        }
        $slug = $baseSlug . '-' . $suffix;
        $suffix++;
    }

    $insert = $pdo->prepare(
        'INSERT INTO fpv_posts (type, slug, title, excerpt, cover_image_path, content_markdown, author_id, is_published, published_at)
         VALUES (:type, :slug, :title, :excerpt, :cover, :content, :author_id, :is_published, :published_at)'
    );
    $insert->execute([
        'type' => $type, 'slug' => $slug, 'title' => $title, 'excerpt' => $excerpt, 'cover' => $coverPath,
        'content' => $content, 'author_id' => $userId, 'is_published' => $isPublished,
        'published_at' => $isPublished ? date('Y-m-d H:i:s') : null,
    ]);

    return ['success' => true, 'post' => ['id' => (int) $pdo->lastInsertId(), 'slug' => $slug]];
}

function delete_fpv_post(array $input): array
{
    $pdo = fpv_pdo();
    require_fpv_admin($pdo);

    $id = (int) ($input['id'] ?? 0);
    if ($id <= 0) {
        return ['success' => false, 'message' => 'id invalido.', '_code' => 400];
    }

    $stmt = $pdo->prepare('SELECT cover_image_path FROM fpv_posts WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $post = $stmt->fetch();

    $pdo->prepare('DELETE FROM fpv_posts WHERE id = :id')->execute(['id' => $id]);
    if ($post && $post['cover_image_path']) {
        fpv_delete_image_file($post['cover_image_path']);
    }

    return ['success' => true];
}

// ─────────────────────────────────────────────────────────────────────────
// Captura de interesse (Comunidade / Cursos "em breve")
// ─────────────────────────────────────────────────────────────────────────

function add_fpv_interest_signup(array $input): array
{
    $pdo = fpv_pdo();
    $topic = ($input['topic'] ?? '') === 'cursos' ? 'cursos' : 'comunidade';
    $email = strtolower(fpv_sanitize_string($input['email'] ?? '', 190));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'message' => 'E-mail invalido.', '_code' => 400];
    }

    $stmt = $pdo->prepare('INSERT INTO fpv_interest_signups (topic, email) VALUES (:topic, :email)');
    $stmt->execute(['topic' => $topic, 'email' => $email]);

    return ['success' => true];
}
