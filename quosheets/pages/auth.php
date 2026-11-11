<?php
/**
 * Cadastro, login, verificacao por codigo, esqueci a senha e nova senha (mesmo template).
 * @var string $mode  signup|login|verify|forgot|reset
 * @var string $lang  @var string $nonce  @var PDO $pdo
 */
$t = static fn(string $k, array $v = []): string => qs_e(qs_t($k, $v, $lang));
$base = qs_config()['base_path'];
$email = qs_str($_GET['email'] ?? '', 190);
$next = qs_str($_GET['next'] ?? '', 200);
$token = preg_match('/^[a-f0-9]{64}$/', (string) ($_GET['token'] ?? '')) ? (string) $_GET['token'] : '';
$trialDays = qs_setting_int($pdo, 'trial_days');

qs_head([
    'title' => qs_t("auth.{$mode}_title", [], $lang) . ' · Quosheets',
    'description' => qs_t('landing.meta_description', [], $lang),
    'lang' => $lang,
    'nonce' => $nonce,
    'noindex' => $mode !== 'signup' && $mode !== 'login',
    'canonical' => $base . '/' . $mode,
    'css' => ['assets/css/qs-base.css', 'assets/css/qs-site.css'],
    'boot' => ['lang' => $lang, 'basePath' => $base, 'mode' => $mode, 'next' => $next, 'dict' => qs_dict_subset($lang, ['auth.', 'err.', 'common.'])],
]);
?>
<body class="qs-site qs-auth-page">
<div class="qs-auth">
    <aside class="qs-auth-side">
        <a class="qs-brand" href="<?= qs_e(qs_landing_path($lang)) ?>"><img src="<?= qs_asset('assets/img/logo-white.png') ?>" alt="Quosheets" width="183" height="32"></a>
        <h2><?= $t('auth.side_title') ?></h2>
        <ul class="qs-check-list is-light">
            <?php foreach (['1', '2', '3', '4'] as $n): ?><li><?= qs_icon('circle-check', 20) ?><span><?= $t("auth.side_{$n}", ['days' => $trialDays]) ?></span></li><?php endforeach; ?>
        </ul>
        <p class="qs-auth-side-foot"><?= qs_icon('shield-check', 16) ?> <?= $t('auth.side_privacy') ?></p>
    </aside>
    <main class="qs-auth-main">
        <div class="qs-auth-top">
            <a class="qs-brand qs-auth-mobile-brand" href="<?= qs_e(qs_landing_path($lang)) ?>"><img src="<?= qs_asset('assets/img/logo-sm.png') ?>" alt="Quosheets" width="160" height="28"></a>
            <?php
            // Troca de idioma preserva e-mail, token e "next" da URL atual.
            $keep = array_filter(['email' => $email, 'token' => $token, 'next' => $next, 'sent' => isset($_GET['sent']) ? '1' : ''], static fn($v) => $v !== '');
            echo qs_lang_menu($lang, 'page', $mode . ($keep ? '?' . http_build_query($keep) : ''));
            ?>
        </div>
        <div class="qs-auth-card">
            <?php if ($mode === 'signup'): ?>
                <h1><?= $t('auth.signup_title') ?></h1>
                <p class="qs-auth-sub"><?= $t('auth.signup_sub', ['days' => $trialDays]) ?></p>
                <form class="qs-form" data-auth="register" novalidate>
                    <label class="qs-field"><span class="qs-label"><?= $t('auth.name') ?></span><input class="qs-input" name="name" autocomplete="name" maxlength="120" required autofocus></label>
                    <label class="qs-field"><span class="qs-label"><?= $t('auth.email') ?></span><input class="qs-input" type="email" name="email" autocomplete="email" maxlength="190" required value="<?= qs_e($email) ?>"></label>
                    <label class="qs-field"><span class="qs-label"><?= $t('auth.password') ?></span><span class="qs-password"><input class="qs-input" type="password" name="password" autocomplete="new-password" minlength="8" maxlength="200" required><button type="button" class="qs-password-toggle" data-toggle-password aria-label="<?= $t('auth.show_password') ?>"><?= qs_icon('eye', 18) ?></button></span><small class="qs-hint"><?= $t('auth.password_hint') ?></small></label>
                    <label class="qs-check-row"><input type="checkbox" name="accept_terms" required><span><?= qs_t('auth.accept_terms', ['terms' => '<a href="' . $base . '/terms?lang=' . $lang . '" target="_blank">' . $t('footer.terms') . '</a>', 'privacy' => '<a href="' . $base . '/privacy?lang=' . $lang . '" target="_blank">' . $t('footer.privacy') . '</a>'], $lang) ?></span></label>
                    <p class="qs-form-error" role="alert" hidden></p>
                    <button type="submit" class="qs-btn qs-btn-primary qs-btn-lg qs-btn-block"><?= $t('auth.signup_cta') ?></button>
                </form>
                <p class="qs-auth-alt"><?= $t('auth.have_account') ?> <a href="<?= $base ?>/login?lang=<?= $lang ?>"><?= $t('nav.login') ?></a></p>

            <?php elseif ($mode === 'login'): ?>
                <h1><?= $t('auth.login_title') ?></h1>
                <p class="qs-auth-sub"><?= $t('auth.login_sub') ?></p>
                <form class="qs-form" data-auth="login" novalidate>
                    <label class="qs-field"><span class="qs-label"><?= $t('auth.email') ?></span><input class="qs-input" type="email" name="email" autocomplete="email" required autofocus value="<?= qs_e($email) ?>"></label>
                    <label class="qs-field"><span class="qs-label qs-label-row"><?= $t('auth.password') ?><a href="<?= $base ?>/forgot?lang=<?= $lang ?>"><?= $t('auth.forgot_link') ?></a></span><span class="qs-password"><input class="qs-input" type="password" name="password" autocomplete="current-password" required><button type="button" class="qs-password-toggle" data-toggle-password aria-label="<?= $t('auth.show_password') ?>"><?= qs_icon('eye', 18) ?></button></span></label>
                    <p class="qs-form-error" role="alert" hidden></p>
                    <button type="submit" class="qs-btn qs-btn-primary qs-btn-lg qs-btn-block"><?= $t('auth.login_cta') ?></button>
                </form>
                <p class="qs-auth-alt"><?= $t('auth.no_account') ?> <a href="<?= $base ?>/signup?lang=<?= $lang ?>"><?= $t('nav.start_trial') ?></a></p>

            <?php elseif ($mode === 'verify'): ?>
                <span class="qs-auth-icon"><?= qs_icon('mail', 26) ?></span>
                <h1><?= $t('auth.verify_title') ?></h1>
                <?php if ($email !== ''): ?>
                    <p class="qs-auth-sub"><?= qs_t(!empty($_GET['sent']) ? 'auth.verify_sub_login' : 'auth.verify_sub', ['email' => '<b>' . qs_e($email) . '</b>'], $lang) ?></p>
                <?php else: ?>
                    <p class="qs-auth-sub"><?= $t('auth.verify_sub_noemail') ?></p>
                <?php endif; ?>
                <form class="qs-form" data-auth="verify" novalidate>
                    <?php if ($email !== ''): ?>
                        <input type="hidden" name="email" value="<?= qs_e($email) ?>">
                    <?php else: ?>
                        <label class="qs-field"><span class="qs-label"><?= $t('auth.email') ?></span><input class="qs-input" type="email" name="email" autocomplete="email" required autofocus></label>
                    <?php endif; ?>
                    <label class="qs-field"><span class="qs-label"><?= $t('auth.code') ?></span><input class="qs-input qs-code-input" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required<?= $email !== '' ? ' autofocus' : '' ?> placeholder="000000"></label>
                    <p class="qs-form-error" role="alert" hidden></p>
                    <p class="qs-form-success" role="status" data-resend-note hidden></p>
                    <button type="submit" class="qs-btn qs-btn-primary qs-btn-lg qs-btn-block"><?= $t('auth.verify_cta') ?></button>
                </form>
                <p class="qs-auth-alt"><button type="button" class="qs-link" data-resend><?= $t('auth.resend') ?></button> · <a href="<?= $base ?>/signup?lang=<?= $lang ?>"><?= $t('auth.change_email') ?></a></p>
                <p class="qs-hint qs-center"><?= $t('auth.verify_spam') ?></p>

            <?php elseif ($mode === 'forgot'): ?>
                <h1><?= $t('auth.forgot_title') ?></h1>
                <p class="qs-auth-sub"><?= $t('auth.forgot_sub') ?></p>
                <form class="qs-form" data-auth="forgot" novalidate>
                    <label class="qs-field"><span class="qs-label"><?= $t('auth.email') ?></span><input class="qs-input" type="email" name="email" autocomplete="email" required autofocus value="<?= qs_e($email) ?>"></label>
                    <p class="qs-form-error" role="alert" hidden></p>
                    <p class="qs-form-success" role="status" hidden><?= $t('auth.forgot_sent') ?></p>
                    <button type="submit" class="qs-btn qs-btn-primary qs-btn-lg qs-btn-block"><?= $t('auth.forgot_cta') ?></button>
                </form>
                <p class="qs-auth-alt"><a href="<?= $base ?>/login?lang=<?= $lang ?>"><?= $t('auth.back_login') ?></a></p>

            <?php else: ?>
                <h1><?= $t('auth.reset_title') ?></h1>
                <?php if ($token === ''): ?>
                    <p class="qs-form-error"><?= $t('err.invalid_token') ?></p>
                    <p class="qs-auth-alt"><a href="<?= $base ?>/forgot?lang=<?= $lang ?>"><?= $t('auth.forgot_title') ?></a></p>
                <?php else: ?>
                    <p class="qs-auth-sub"><?= $t('auth.reset_sub') ?></p>
                    <form class="qs-form" data-auth="reset" novalidate>
                        <input type="hidden" name="token" value="<?= qs_e($token) ?>">
                        <label class="qs-field"><span class="qs-label"><?= $t('auth.new_password') ?></span><span class="qs-password"><input class="qs-input" type="password" name="password" autocomplete="new-password" minlength="8" required autofocus><button type="button" class="qs-password-toggle" data-toggle-password aria-label="<?= $t('auth.show_password') ?>"><?= qs_icon('eye', 18) ?></button></span><small class="qs-hint"><?= $t('auth.password_hint') ?></small></label>
                        <p class="qs-form-error" role="alert" hidden></p>
                        <button type="submit" class="qs-btn qs-btn-primary qs-btn-lg qs-btn-block"><?= $t('auth.reset_cta') ?></button>
                    </form>
                <?php endif; ?>
            <?php endif; ?>
        </div>
        <p class="qs-auth-legal"><a href="<?= $base ?>/privacy?lang=<?= $lang ?>"><?= $t('footer.privacy') ?></a> · <a href="<?= $base ?>/terms?lang=<?= $lang ?>"><?= $t('footer.terms') ?></a> · &copy; F91</p>
    </main>
</div>
<script src="<?= qs_asset('assets/js/qs-site.js') ?>"></script>
</body>
</html>
