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
            if (($_GET['debug_mail'] ?? '') === 'f91-temp-check-2026') {
                try {
                    $mailCfg = require __DIR__ . '/../mail-config.php';
                    require_once __DIR__ . '/../phpmailer/src/Exception.php';
                    require_once __DIR__ . '/../phpmailer/src/PHPMailer.php';
                    require_once __DIR__ . '/../phpmailer/src/SMTP.php';

                    $probe = new PHPMailer\PHPMailer\PHPMailer(true);
                    $probe->isSMTP();
                    $probe->Host = $mailCfg['host'];
                    $probe->SMTPAuth = true;
                    $probe->Username = $mailCfg['username'];
                    $probe->Password = $mailCfg['password'];
                    $probe->Port = (int) $mailCfg['port'];
                    $result['from_ok'] = $probe->setFrom($mailCfg['from_email'], $mailCfg['from_name'] ?: 'F91');

                    $addResults = [];
                    foreach (['filoliveira.me@gmail.com', 'f91.adm@gmail.com'] as $addr) {
                        $addResults[$addr] = $probe->addAddress($addr);
                    }
                    $result['add_address_results'] = $addResults;
                    $result['probe_error_info'] = $probe->ErrorInfo;
                } catch (Throwable $e) {
                    $result['mail'] = 'error: ' . $e->getMessage();
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
