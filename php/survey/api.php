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
            if (($_GET['debug_db'] ?? '') === 'f91-temp-check-2026') {
                try {
                    survey_pdo();
                    $result['db'] = 'ok';
                } catch (Throwable $e) {
                    $result['db'] = 'error: ' . $e->getMessage();
                }
            }
            break;

        default:
            json_response(['success' => false, 'message' => 'Acao nao reconhecida: ' . $action], 400);
    }
} catch (DashboardAuthException $e) {
    json_response(['success' => false, 'message' => $e->getMessage()], 401);
} catch (Throwable $e) {
    error_log('survey/api.php [' . $action . ']: ' . $e->getMessage());
    json_response(['success' => false, 'message' => 'Erro interno do servidor.'], 500);
}

$code = (int) ($result['_code'] ?? 200);
unset($result['_code']);
json_response($result, $code);
