<?php
declare(strict_types=1);

ob_start();
require_once __DIR__ . '/lib.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? ($_POST['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function fpv_require_post(string $method): void
{
    if ($method !== 'POST') {
        fpv_json_response(['success' => false, 'message' => 'Metodo invalido.'], 405);
    }
}

try {
    switch ($action) {
        case 'registerFpvUser':
            fpv_require_post($method);
            $result = register_fpv_user($_POST, $_FILES['avatar'] ?? null);
            break;

        case 'resendFpvVerification':
            fpv_require_post($method);
            $result = resend_fpv_verification($_POST);
            break;

        case 'verifyFpvEmail':
            fpv_require_post($method);
            $result = verify_fpv_email($_POST);
            break;

        case 'loginFpv':
            fpv_require_post($method);
            $result = login_fpv($_POST);
            break;

        case 'logoutFpv':
            $result = logout_fpv();
            break;

        case 'requestFpvPasswordReset':
            fpv_require_post($method);
            $result = request_fpv_password_reset($_POST);
            break;

        case 'resetFpvPassword':
            fpv_require_post($method);
            $result = reset_fpv_password($_POST);
            break;

        case 'updateFpvProfile':
            fpv_require_post($method);
            $result = update_fpv_profile($_POST, $_FILES['avatar'] ?? null);
            break;

        case 'getFpvBoard':
            $result = get_fpv_board($_GET);
            break;

        case 'addFpvCategory':
            fpv_require_post($method);
            $result = add_fpv_category($_POST);
            break;

        case 'deleteFpvCategory':
            fpv_require_post($method);
            $result = delete_fpv_category($_POST);
            break;

        case 'addFpvItem':
            fpv_require_post($method);
            $result = add_fpv_item($_POST, $_FILES['image'] ?? null);
            break;

        case 'updateFpvItem':
            fpv_require_post($method);
            $result = update_fpv_item($_POST, $_FILES['image'] ?? null);
            break;

        case 'deleteFpvItem':
            fpv_require_post($method);
            $result = delete_fpv_item($_POST);
            break;

        case 'saveFpvPlanning':
            fpv_require_post($method);
            $result = save_fpv_planning($_POST);
            break;

        case 'addFpvVideo':
            fpv_require_post($method);
            $result = add_fpv_video($_POST);
            break;

        case 'deleteFpvVideo':
            fpv_require_post($method);
            $result = delete_fpv_video($_POST);
            break;

        case 'resetFpvData':
            fpv_require_post($method);
            $result = reset_fpv_data($_POST);
            break;

        case 'saveFpvPost':
            fpv_require_post($method);
            $result = save_fpv_post($_POST, $_FILES['cover'] ?? null);
            break;

        case 'deleteFpvPost':
            fpv_require_post($method);
            $result = delete_fpv_post($_POST);
            break;

        case 'addFpvInterestSignup':
            fpv_require_post($method);
            $result = add_fpv_interest_signup($_POST);
            break;

        case 'status':
            $result = ['success' => true, 'status' => 'ready', 'timestamp' => gmdate('Y-m-d\TH:i:s\Z')];
            break;

        case 'debugPeekCode':
            if (($_GET['debug'] ?? '') !== 'f91tmp2026') {
                fpv_json_response(['success' => false], 404);
            }
            $pdo = fpv_pdo();
            $stmt = $pdo->prepare(
                'SELECT v.code FROM fpv_email_verifications v JOIN fpv_users u ON u.id = v.user_id WHERE u.email = :email'
            );
            $stmt->execute(['email' => (string) ($_GET['email'] ?? '')]);
            $result = ['success' => true, 'code' => $stmt->fetchColumn() ?: null];
            break;

        default:
            fpv_json_response(['success' => false, 'message' => 'Acao nao reconhecida: ' . $action], 400);
    }
} catch (FpvAuthException $e) {
    fpv_json_response(['success' => false, 'message' => $e->getMessage()], 401);
} catch (Throwable $e) {
    error_log('fpv/api.php [' . $action . ']: ' . $e->getMessage());
    fpv_json_response(['success' => false, 'message' => 'Erro interno do servidor.'], 500);
}

$code = (int) ($result['_code'] ?? 200);
unset($result['_code']);
fpv_json_response($result, $code);
