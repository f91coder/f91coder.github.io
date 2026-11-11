<?php
declare(strict_types=1);

/**
 * API JSON do Quosheets: /php/quosheets/api.php?action=<acao>
 * Toda escrita e POST com JSON vindo do proprio site (checagem de Origin); o webhook do Stripe e a
 * unica excecao (autenticado pela assinatura).
 */

ob_start();
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/mail.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/billing.php';
require_once __DIR__ . '/ai.php';
require_once __DIR__ . '/admin.php';

header('X-Content-Type-Options: nosniff');

/** acao => [metodo, handler] */
const QS_ROUTES = [
    'register' => ['POST', 'qs_action_register'],
    'resendCode' => ['POST', 'qs_action_resend_code'],
    'verify' => ['POST', 'qs_action_verify'],
    'login' => ['POST', 'qs_action_login'],
    'logout' => ['POST', 'qs_action_logout'],
    'forgot' => ['POST', 'qs_action_forgot'],
    'reset' => ['POST', 'qs_action_reset'],
    'me' => ['GET', 'qs_action_me'],
    'updateProfile' => ['POST', 'qs_action_update_profile'],
    'changePassword' => ['POST', 'qs_action_change_password'],
    'deleteAccount' => ['POST', 'qs_action_delete_account'],
    'checkout' => ['POST', 'qs_action_checkout'],
    'portal' => ['POST', 'qs_action_portal'],
    'syncCheckout' => ['POST', 'qs_action_sync_checkout'],
    'stripeWebhook' => ['POST', 'qs_action_stripe_webhook'],
    'ai' => ['POST', 'qs_action_ai'],
    'adminOverview' => ['GET', 'qs_action_admin_overview'],
    'adminSaveSettings' => ['POST', 'qs_action_admin_save_settings'],
    'adminSetAiKey' => ['POST', 'qs_action_admin_set_ai_key'],
    'adminStripeConnect' => ['POST', 'qs_action_admin_stripe_connect'],
    'adminUser' => ['POST', 'qs_action_admin_user'],
];

$action = (string) ($_GET['action'] ?? '');
$method = (string) ($_SERVER['REQUEST_METHOD'] ?? 'GET');

try {
    if (!isset(QS_ROUTES[$action])) {
        throw new QsHttpException('not_found', 404);
    }
    [$expectedMethod, $handler] = QS_ROUTES[$action];
    if ($method !== $expectedMethod) {
        throw new QsHttpException('method_not_allowed', 405);
    }
    if ($method === 'POST' && $action !== 'stripeWebhook') {
        qs_require_same_origin();
    }
    qs_json($handler(qs_pdo()));
} catch (QsHttpException $e) {
    $public = array_filter($e->extra, static fn($key) => !str_starts_with((string) $key, '_'), ARRAY_FILTER_USE_KEY);
    $vars = array_filter($public, 'is_scalar');
    qs_json(['ok' => false, 'error' => $e->errorCode, 'message' => qs_t('err.' . $e->errorCode, $vars)] + $public, $e->status);
} catch (Throwable $e) {
    error_log('quosheets api [' . $action . ']: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    qs_json(['ok' => false, 'error' => 'server_error', 'message' => qs_t('err.server_error')], 500);
}
