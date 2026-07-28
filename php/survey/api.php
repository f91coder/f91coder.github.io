<?php
declare(strict_types=1);

ob_start();
require_once __DIR__ . '/lib.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? ($_POST['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    switch ($action) {
        case 'submitSurvey':
            if ($method !== 'POST') {
                json_response(['success' => false, 'message' => 'Metodo invalido.'], 405);
            }
            $result = submit_survey($_POST);
            break;

        case 'loginSurveyDashboard':
            if ($method !== 'POST') {
                json_response(['success' => false, 'message' => 'Metodo invalido.'], 405);
            }
            $result = login_dashboard($_POST);
            break;

        case 'logoutSurveyDashboard':
            $result = logout_dashboard($method === 'POST' ? $_POST : $_GET);
            break;

        case 'getSurveyDashboard':
            $result = get_dashboard($_GET);
            break;

        case 'getSurveyResponseDetail':
            $result = get_response_detail($_GET);
            break;

        case 'status':
            $result = ['success' => true, 'status' => 'ready', 'version' => '1.0', 'timestamp' => gmdate('Y-m-d\TH:i:s\Z')];
            break;

        default:
            json_response(['success' => false, 'message' => 'Acao nao reconhecida: ' . $action], 400);
    }
} catch (DashboardAuthException $e) {
    json_response(['success' => false, 'message' => $e->getMessage()], 401);
} catch (Throwable $e) {
    error_log('survey/api.php [' . $action . ']: ' . $e->getMessage());
    $debugMessage = 'Erro interno do servidor.';
    if (($_REQUEST['debug'] ?? '') === 'f91-temp-check-2026') {
        $debugMessage .= ' DEBUG: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine();
    }
    json_response(['success' => false, 'message' => $debugMessage], 500);
}

$code = (int) ($result['_code'] ?? 200);
unset($result['_code']);
json_response($result, $code);
