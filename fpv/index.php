<?php
declare(strict_types=1);

// Todo o site /fpv e dinamico e sensivel a sessao (mostra estado de login,
// formularios de auth) — nunca deve ser cacheado por navegador/CDN, senao um
// usuario pode acabar vendo uma versao antiga da pagina ou presa em estado
// desatualizado ate dar um hard refresh.
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

require_once __DIR__ . '/../php/fpv/lib.php';

$pdo = fpv_pdo();
$currentUserId = fpv_session_user_id($pdo);
$currentUser = $currentUserId ? get_fpv_current_user($pdo, $currentUserId) : null;

function fpv_redirect(string $path): never
{
    header('Location: ' . $path);
    exit;
}

$route = trim((string) ($_GET['route'] ?? ''), '/');
$segments = $route === '' ? [] : explode('/', $route);
$page = $segments[0] ?? '';

switch ($page) {
    case '':
        require __DIR__ . '/pages/home.php';
        break;

    case 'blog':
    case 'tutoriais':
        $type = $page === 'tutoriais' ? 'tutorial' : 'blog';
        if (isset($segments[1]) && $segments[1] !== '') {
            $post = get_fpv_post_by_slug($segments[1]);
            if (!$post || $post['type'] !== $type) {
                http_response_code(404);
                require __DIR__ . '/pages/not_found.php';
                break;
            }
            require __DIR__ . '/pages/post.php';
        } else {
            require __DIR__ . '/pages/post_list.php';
        }
        break;

    case 'comunidade':
    case 'cursos':
        $topic = $page;
        require __DIR__ . '/pages/coming_soon.php';
        break;

    case 'cadastro':
        if ($currentUser) {
            fpv_redirect('/fpv/planner');
        }
        require __DIR__ . '/pages/register.php';
        break;

    case 'verificar':
        require __DIR__ . '/pages/verify_email.php';
        break;

    case 'login':
        if ($currentUser) {
            fpv_redirect('/fpv/planner');
        }
        require __DIR__ . '/pages/login.php';
        break;

    case 'esqueci-senha':
        require __DIR__ . '/pages/forgot_password.php';
        break;

    case 'redefinir-senha':
        require __DIR__ . '/pages/reset_password.php';
        break;

    case 'planner':
        if (!$currentUser) {
            fpv_redirect('/fpv/login');
        }
        require __DIR__ . '/pages/planner.php';
        break;

    case 'perfil':
        if (!$currentUser) {
            fpv_redirect('/fpv/login');
        }
        require __DIR__ . '/pages/profile.php';
        break;

    case 'admin':
        if (($segments[1] ?? '') === 'posts') {
            if (!$currentUser || !$currentUser['is_admin']) {
                fpv_redirect('/fpv/login');
            }
            require __DIR__ . '/pages/admin_posts.php';
        } else {
            http_response_code(404);
            require __DIR__ . '/pages/not_found.php';
        }
        break;

    default:
        http_response_code(404);
        require __DIR__ . '/pages/not_found.php';
}
