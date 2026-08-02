<?php
declare(strict_types=1);

ob_start();
require_once __DIR__ . '/lib.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? ($_POST['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    switch ($action) {
        case 'loginFpv':
            if ($method !== 'POST') {
                fpv_json_response(['success' => false, 'message' => 'Metodo invalido.'], 405);
            }
            $result = login_fpv($_POST);
            break;

        case 'logoutFpv':
            $result = logout_fpv($method === 'POST' ? $_POST : $_GET);
            break;

        case 'getFpvBoard':
            $result = get_fpv_board($_GET);
            break;

        case 'addFpvCategory':
            if ($method !== 'POST') {
                fpv_json_response(['success' => false, 'message' => 'Metodo invalido.'], 405);
            }
            $result = add_fpv_category($_POST);
            break;

        case 'deleteFpvCategory':
            if ($method !== 'POST') {
                fpv_json_response(['success' => false, 'message' => 'Metodo invalido.'], 405);
            }
            $result = delete_fpv_category($_POST);
            break;

        case 'addFpvItem':
            if ($method !== 'POST') {
                fpv_json_response(['success' => false, 'message' => 'Metodo invalido.'], 405);
            }
            $result = add_fpv_item($_POST, $_FILES['image'] ?? null);
            break;

        case 'updateFpvItem':
            if ($method !== 'POST') {
                fpv_json_response(['success' => false, 'message' => 'Metodo invalido.'], 405);
            }
            $result = update_fpv_item($_POST, $_FILES['image'] ?? null);
            break;

        case 'deleteFpvItem':
            if ($method !== 'POST') {
                fpv_json_response(['success' => false, 'message' => 'Metodo invalido.'], 405);
            }
            $result = delete_fpv_item($_POST);
            break;

        case 'saveFpvPlanning':
            if ($method !== 'POST') {
                fpv_json_response(['success' => false, 'message' => 'Metodo invalido.'], 405);
            }
            $result = save_fpv_planning($_POST);
            break;

        case 'addFpvVideo':
            if ($method !== 'POST') {
                fpv_json_response(['success' => false, 'message' => 'Metodo invalido.'], 405);
            }
            $result = add_fpv_video($_POST);
            break;

        case 'deleteFpvVideo':
            if ($method !== 'POST') {
                fpv_json_response(['success' => false, 'message' => 'Metodo invalido.'], 405);
            }
            $result = delete_fpv_video($_POST);
            break;

        case 'resetFpvData':
            if ($method !== 'POST') {
                fpv_json_response(['success' => false, 'message' => 'Metodo invalido.'], 405);
            }
            $result = reset_fpv_data($_POST);
            break;

        case 'status':
            $result = ['success' => true, 'status' => 'ready', 'timestamp' => gmdate('Y-m-d\TH:i:s\Z')];
            break;

        default:
            fpv_json_response(['success' => false, 'message' => 'Acao nao reconhecida: ' . $action], 400);
    }
} catch (FpvAuthException $e) {
    fpv_json_response(['success' => false, 'message' => $e->getMessage()], 401);
} catch (Throwable $e) {
    error_log('fpv/api.php [' . $action . ']: ' . $e->getMessage());
    if (($_GET['debug'] ?? '') === 'f91tmp2026') {
        fpv_json_response(['success' => false, 'message' => $e->getMessage(), 'debug_file' => $e->getFile(), 'debug_line' => $e->getLine()], 500);
    }
    fpv_json_response(['success' => false, 'message' => 'Erro interno do servidor.'], 500);
}

$code = (int) ($result['_code'] ?? 200);
unset($result['_code']);
fpv_json_response($result, $code);
