<?php
declare(strict_types=1);

/**
 * Contas do Quosheets: cadastro com codigo por e-mail, login, recuperacao de senha, perfil e exclusao.
 * O teste gratis comeca quando o e-mail e confirmado (nao no cadastro), para o prazo valer de verdade.
 */

const QS_CODE_TTL_MINUTES = 20;
const QS_CODE_MAX_ATTEMPTS = 5;
const QS_RESET_TTL_SECONDS = 3600;

function qs_normalize_email(mixed $value): string
{
    $email = strtolower(qs_str($value, 190));
    return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';
}

function qs_valid_password(mixed $value): string
{
    $password = is_string($value) ? $value : '';
    if (mb_strlen($password) < 8 || mb_strlen($password) > 200) {
        throw new QsHttpException('weak_password', 422);
    }
    return $password;
}

/** @return array<string, mixed>|null */
function qs_user_by_email(PDO $pdo, string $email): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM qs_users WHERE email = :e');
    $stmt->execute(['e' => $email]);
    return $stmt->fetch() ?: null;
}

/** Gera um codigo de 6 digitos e envia por e-mail (com intervalo minimo entre envios). */
function qs_issue_code(PDO $pdo, array $user, string $lang, bool $silentCooldown = false): void
{
    $recent = $pdo->prepare(
        'SELECT COUNT(*) AS total, SUM(created_at > (NOW() - INTERVAL 45 SECOND)) AS last45
         FROM qs_codes WHERE user_id = :u AND created_at > (NOW() - INTERVAL 1 HOUR)'
    );
    $recent->execute(['u' => $user['id']]);
    $row = $recent->fetch();
    if ((int) $row['last45'] > 0 || (int) $row['total'] >= 6) {
        if ($silentCooldown) {
            return;
        }
        throw new QsHttpException('code_cooldown', 429);
    }

    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $pdo->prepare('UPDATE qs_codes SET attempts = ' . QS_CODE_MAX_ATTEMPTS . ' WHERE user_id = :u')->execute(['u' => $user['id']]);
    $pdo->prepare(
        'INSERT INTO qs_codes (user_id, code_hash, expires_at) VALUES (:u, :h, (NOW() + INTERVAL ' . QS_CODE_TTL_MINUTES . ' MINUTE))'
    )->execute(['u' => $user['id'], 'h' => qs_hash('code|' . $user['id'] . '|' . $code)]);

    try {
        qs_send_verification_email($user['email'], $user['name'] !== '' ? $user['name'] : $user['email'], $code, $lang);
    } catch (Throwable $e) {
        error_log('quosheets mail (verify) failed: ' . $e->getMessage());
        throw new QsHttpException('mail_failed', 502);
    }
}

function qs_action_register(PDO $pdo): array
{
    $in = qs_input();
    $lang = qs_lang(qs_str($in['lang'] ?? '', 2));
    $name = qs_str($in['name'] ?? '', 120);
    $email = qs_normalize_email($in['email'] ?? '');
    if ($name === '') {
        throw new QsHttpException('name_required', 422);
    }
    if ($email === '') {
        throw new QsHttpException('invalid_email', 422);
    }
    $password = qs_valid_password($in['password'] ?? '');
    if (empty($in['accept_terms'])) {
        throw new QsHttpException('terms_required', 422);
    }

    qs_throttle($pdo, 'register', qs_ip_hash(), 12, 3600);

    $existing = qs_user_by_email($pdo, $email);
    if ($existing && $existing['email_verified_at'] !== null) {
        throw new QsHttpException('email_taken', 409);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    if ($existing) {
        // Cadastro refeito antes de confirmar o e-mail: atualiza os dados e manda um codigo novo.
        $pdo->prepare('UPDATE qs_users SET name = :n, password_hash = :p, locale = :l WHERE id = :id')
            ->execute(['n' => $name, 'p' => $hash, 'l' => $lang, 'id' => $existing['id']]);
        $userId = (int) $existing['id'];
    } else {
        $pdo->prepare('INSERT INTO qs_users (email, name, password_hash, locale) VALUES (:e, :n, :p, :l)')
            ->execute(['e' => $email, 'n' => $name, 'p' => $hash, 'l' => $lang]);
        $userId = (int) $pdo->lastInsertId();
    }

    qs_issue_code($pdo, qs_user_row($pdo, $userId), $lang, true);
    qs_set_cookie(QS_LANG_COOKIE, $lang, time() + 365 * 86400, false);
    return ['ok' => true, 'email' => $email];
}

function qs_action_resend_code(PDO $pdo): array
{
    $in = qs_input();
    $email = qs_normalize_email($in['email'] ?? '');
    qs_throttle($pdo, 'resend', qs_ip_hash(), 15, 3600);
    $user = $email !== '' ? qs_user_by_email($pdo, $email) : null;
    if ($user && $user['email_verified_at'] === null) {
        qs_issue_code($pdo, $user, qs_lang(qs_str($in['lang'] ?? '', 2)));
    }
    // Resposta igual para e-mail existente ou nao (nao revela cadastro).
    return ['ok' => true];
}

function qs_action_verify(PDO $pdo): array
{
    $in = qs_input();
    $email = qs_normalize_email($in['email'] ?? '');
    $code = preg_replace('/\D+/', '', (string) ($in['code'] ?? '')) ?? '';
    qs_throttle($pdo, 'verify', qs_ip_hash(), 40, 3600);

    $user = $email !== '' ? qs_user_by_email($pdo, $email) : null;
    if (!$user || strlen($code) !== 6) {
        throw new QsHttpException('invalid_code', 422);
    }
    if ($user['email_verified_at'] !== null) {
        throw new QsHttpException('already_verified', 409);
    }

    $stmt = $pdo->prepare('SELECT * FROM qs_codes WHERE user_id = :u AND expires_at > NOW() ORDER BY id DESC LIMIT 1');
    $stmt->execute(['u' => $user['id']]);
    $row = $stmt->fetch();
    if (!$row || (int) $row['attempts'] >= QS_CODE_MAX_ATTEMPTS) {
        throw new QsHttpException('code_expired', 422);
    }
    if (!hash_equals($row['code_hash'], qs_hash('code|' . $user['id'] . '|' . $code))) {
        $pdo->prepare('UPDATE qs_codes SET attempts = attempts + 1 WHERE id = :id')->execute(['id' => $row['id']]);
        throw new QsHttpException('invalid_code', 422);
    }

    $trialDays = max(0, qs_setting_int($pdo, 'trial_days'));
    $pdo->prepare(
        'UPDATE qs_users SET email_verified_at = NOW(),
            trial_ends_at = COALESCE(trial_ends_at, (NOW() + INTERVAL ' . $trialDays . ' DAY))
         WHERE id = :id'
    )->execute(['id' => $user['id']]);
    $pdo->prepare('DELETE FROM qs_codes WHERE user_id = :u')->execute(['u' => $user['id']]);
    qs_start_session($pdo, (int) $user['id']);
    return ['ok' => true, 'redirect' => qs_config()['base_path'] . '/app?welcome=1'];
}

function qs_action_login(PDO $pdo): array
{
    $in = qs_input();
    $email = qs_normalize_email($in['email'] ?? '');
    $password = is_string($in['password'] ?? null) ? $in['password'] : '';

    if (qs_rate_limited($pdo, 'login_ip', qs_ip_hash(), 25, 900)
        || ($email !== '' && qs_rate_limited($pdo, 'login_email', $email, 8, 900))) {
        throw new QsHttpException('too_many_attempts', 429);
    }

    $user = $email !== '' ? qs_user_by_email($pdo, $email) : null;
    if (!$user || !password_verify($password, $user['password_hash'])) {
        qs_rate_hit($pdo, 'login_ip', qs_ip_hash());
        if ($email !== '') {
            qs_rate_hit($pdo, 'login_email', $email);
        }
        throw new QsHttpException('invalid_credentials', 401);
    }

    if ($user['email_verified_at'] === null) {
        qs_issue_code($pdo, $user, $user['locale'], true);
        throw new QsHttpException('not_verified', 403, '', ['email' => $user['email']]);
    }
    if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
        $pdo->prepare('UPDATE qs_users SET password_hash = :p WHERE id = :id')
            ->execute(['p' => password_hash($password, PASSWORD_DEFAULT), 'id' => $user['id']]);
    }

    qs_start_session($pdo, (int) $user['id']);
    qs_set_cookie(QS_LANG_COOKIE, $user['locale'], time() + 365 * 86400, false);
    $next = qs_str($in['next'] ?? '', 200);
    $redirect = preg_match('#^/quosheets/(app|admin)(\?[\w=&%-]*)?$#', $next) ? $next : qs_config()['base_path'] . '/app';
    return ['ok' => true, 'redirect' => $redirect];
}

function qs_action_logout(PDO $pdo): array
{
    qs_end_session($pdo);
    return ['ok' => true, 'redirect' => qs_config()['base_path'] . '/'];
}

function qs_action_forgot(PDO $pdo): array
{
    $in = qs_input();
    $email = qs_normalize_email($in['email'] ?? '');
    $lang = qs_lang(qs_str($in['lang'] ?? '', 2));
    qs_throttle($pdo, 'forgot_ip', qs_ip_hash(), 8, 3600);
    if ($email === '') {
        throw new QsHttpException('invalid_email', 422);
    }
    if (qs_rate_limited($pdo, 'forgot_email', $email, 3, 3600)) {
        return ['ok' => true];
    }
    qs_rate_hit($pdo, 'forgot_email', $email);

    $user = qs_user_by_email($pdo, $email);
    if ($user && $user['email_verified_at'] !== null) {
        $token = bin2hex(random_bytes(32));
        $pdo->prepare(
            'INSERT INTO qs_resets (user_id, token_hash, expires_at) VALUES (:u, :t, (NOW() + INTERVAL ' . QS_RESET_TTL_SECONDS . ' SECOND))'
        )->execute(['u' => $user['id'], 't' => hash('sha256', $token)]);
        try {
            qs_send_reset_email($user['email'], $user['name'], qs_url('reset?token=' . $token), $user['locale'] ?: $lang);
        } catch (Throwable $e) {
            error_log('quosheets mail (reset) failed: ' . $e->getMessage());
            throw new QsHttpException('mail_failed', 502);
        }
    }
    return ['ok' => true];
}

function qs_action_reset(PDO $pdo): array
{
    $in = qs_input();
    $token = (string) ($in['token'] ?? '');
    $password = qs_valid_password($in['password'] ?? '');
    qs_throttle($pdo, 'reset', qs_ip_hash(), 20, 3600);
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        throw new QsHttpException('invalid_token', 422);
    }
    $stmt = $pdo->prepare('SELECT * FROM qs_resets WHERE token_hash = :t AND used_at IS NULL AND expires_at > NOW()');
    $stmt->execute(['t' => hash('sha256', $token)]);
    $reset = $stmt->fetch();
    if (!$reset) {
        throw new QsHttpException('invalid_token', 422);
    }
    $pdo->prepare('UPDATE qs_users SET password_hash = :p WHERE id = :id')
        ->execute(['p' => password_hash($password, PASSWORD_DEFAULT), 'id' => $reset['user_id']]);
    $pdo->prepare('UPDATE qs_resets SET used_at = NOW() WHERE id = :id')->execute(['id' => $reset['id']]);
    // Senha trocada: derruba todas as sessoes e abre uma nova neste navegador.
    $pdo->prepare('DELETE FROM qs_sessions WHERE user_id = :u')->execute(['u' => $reset['user_id']]);
    qs_start_session($pdo, (int) $reset['user_id']);
    return ['ok' => true, 'redirect' => qs_config()['base_path'] . '/app'];
}

function qs_action_me(PDO $pdo): array
{
    $user = qs_require_user($pdo);
    return ['ok' => true, 'user' => qs_me_payload($pdo, $user)];
}

function qs_action_update_profile(PDO $pdo): array
{
    $user = qs_require_user($pdo);
    $in = qs_input();
    $name = array_key_exists('name', $in) ? qs_str($in['name'], 120) : $user['name'];
    if ($name === '') {
        throw new QsHttpException('name_required', 422);
    }
    $locale = array_key_exists('locale', $in) ? qs_str($in['locale'], 2) : $user['locale'];
    if (!in_array($locale, QS_LANGS, true)) {
        $locale = $user['locale'];
    }
    $pdo->prepare('UPDATE qs_users SET name = :n, locale = :l WHERE id = :id')
        ->execute(['n' => $name, 'l' => $locale, 'id' => $user['id']]);
    qs_set_cookie(QS_LANG_COOKIE, $locale, time() + 365 * 86400, false);
    return ['ok' => true, 'user' => qs_me_payload($pdo, qs_user_row($pdo, (int) $user['id']))];
}

function qs_action_change_password(PDO $pdo): array
{
    $user = qs_require_user($pdo);
    $in = qs_input();
    if (!password_verify((string) ($in['current'] ?? ''), $user['password_hash'])) {
        qs_throttle($pdo, 'password_change', (string) $user['id'], 10, 3600);
        throw new QsHttpException('wrong_password', 422);
    }
    $password = qs_valid_password($in['password'] ?? '');
    $pdo->prepare('UPDATE qs_users SET password_hash = :p WHERE id = :id')
        ->execute(['p' => password_hash($password, PASSWORD_DEFAULT), 'id' => $user['id']]);
    // Mantem esta sessao e encerra as outras.
    $token = (string) ($_COOKIE[QS_SESSION_COOKIE] ?? '');
    $pdo->prepare('DELETE FROM qs_sessions WHERE user_id = :u AND token_hash <> :t')
        ->execute(['u' => $user['id'], 't' => hash('sha256', $token)]);
    return ['ok' => true];
}

function qs_action_delete_account(PDO $pdo): array
{
    $user = qs_require_user($pdo);
    $in = qs_input();
    if (!password_verify((string) ($in['password'] ?? ''), $user['password_hash'])) {
        throw new QsHttpException('wrong_password', 422);
    }
    // Nao deixa cobranca orfa: cancela a assinatura no Stripe antes de apagar a conta.
    if ($user['stripe_subscription_id'] && !in_array($user['plan_status'], ['canceled', 'none'], true)) {
        qs_stripe_cancel_subscription($pdo, (string) $user['stripe_subscription_id']);
    }
    qs_end_session($pdo);
    $pdo->prepare('DELETE FROM qs_users WHERE id = :id')->execute(['id' => $user['id']]);
    return ['ok' => true, 'redirect' => qs_config()['base_path'] . '/'];
}
