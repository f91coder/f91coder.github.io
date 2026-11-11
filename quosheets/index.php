<?php
declare(strict_types=1);

/**
 * Roteador do Quosheets (https://f91.tech/quosheets).
 *   /quosheets/            landing (pt)        /quosheets/en/  /quosheets/es/
 *   /quosheets/signup | login | verify | forgot | reset      contas
 *   /quosheets/app                                            o editor (requer login)
 *   /quosheets/admin                                          painel do dono
 *   /quosheets/privacy | terms                                paginas legais
 */

require_once __DIR__ . '/../php/quosheets/bootstrap.php';
require_once __DIR__ . '/pages/partials.php';

$nonce = base64_encode(random_bytes(16));
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-$nonce'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    . "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; "
    . "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'");

$route = trim((string) ($_GET['route'] ?? ''), '/');
$segments = $route === '' ? [] : explode('/', $route);
$page = $segments[0] ?? '';

function qs_redirect(string $to): never
{
    header('Location: ' . $to);
    exit;
}

/** @param array<string, mixed> $vars */
function qs_render(string $template, array $vars = []): never
{
    extract($vars, EXTR_SKIP);
    require __DIR__ . '/pages/' . $template . '.php';
    exit;
}

function qs_not_found(string $lang, string $nonce): never
{
    http_response_code(404);
    qs_render('not_found', ['lang' => $lang, 'nonce' => $nonce]);
}

try {
    $pdo = qs_pdo();
} catch (Throwable $e) {
    error_log('quosheets db: ' . $e->getMessage());
    http_response_code(503);
    qs_render('not_found', ['lang' => qs_lang(), 'nonce' => $nonce, 'unavailable' => true]);
}

$base = qs_config()['base_path'];
$user = qs_current_user($pdo);

switch ($page) {
    case '':
    case 'en':
    case 'es':
        if (count($segments) > 1) {
            qs_not_found(qs_lang(), $nonce);
        }
        $lang = $page === '' ? 'pt' : $page;
        qs_set_cookie(QS_LANG_COOKIE, $lang, time() + 365 * 86400, false);
        qs_render('landing', ['lang' => $lang, 'nonce' => $nonce, 'user' => $user, 'pdo' => $pdo]);

    case 'signup':
    case 'login':
    case 'verify':
    case 'forgot':
    case 'reset':
        $lang = qs_lang(isset($_GET['lang']) ? (string) $_GET['lang'] : null);
        if ($user && $page !== 'reset') {
            qs_redirect($base . '/app');
        }
        qs_render('auth', ['mode' => $page, 'lang' => $lang, 'nonce' => $nonce, 'pdo' => $pdo]);

    case 'app':
        if (!$user) {
            $query = $_GET;
            unset($query['route']);
            qs_redirect($base . '/login?next=' . rawurlencode($base . '/app' . ($query ? '?' . http_build_query($query) : '')));
        }
        qs_render('app', ['lang' => $user['locale'], 'nonce' => $nonce, 'user' => $user, 'pdo' => $pdo]);

    case 'admin':
        if (!$user) {
            qs_redirect($base . '/login?next=' . rawurlencode($base . '/admin'));
        }
        if (!qs_is_admin($user)) {
            qs_not_found($user['locale'], $nonce);
        }
        qs_render('admin', ['lang' => 'pt', 'nonce' => $nonce, 'user' => $user, 'pdo' => $pdo]);

    case 'privacy':
    case 'terms':
        qs_render('legal', ['doc' => $page, 'lang' => qs_lang(isset($_GET['lang']) ? (string) $_GET['lang'] : null), 'nonce' => $nonce, 'pdo' => $pdo]);

    default:
        qs_not_found(qs_lang(), $nonce);
}
