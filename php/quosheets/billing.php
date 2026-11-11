<?php
declare(strict_types=1);

/**
 * Assinatura via Stripe (plano unico mensal, BRL ou USD).
 *
 * O admin so precisa colar a chave secreta no painel: "Conectar Stripe" valida a chave, cria o produto,
 * os dois precos mensais e o endpoint de webhook (guardando o segredo de assinatura). Nada de copiar IDs.
 * O acesso e liberado pelo webhook e tambem pela sincronizacao feita quando o usuario volta do checkout.
 */

const QS_STRIPE_API_VERSION = '2024-06-20';
const QS_STRIPE_EVENTS = [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.paid',
    'invoice.payment_failed',
];

function qs_stripe_configured(PDO $pdo): bool
{
    return qs_setting($pdo, 'stripe_secret_key') !== ''
        && qs_setting($pdo, 'stripe_price_brl') !== ''
        && qs_setting($pdo, 'stripe_price_usd') !== '';
}

function qs_stripe_webhook_url(): string
{
    return qs_origin() . '/php/quosheets/api.php?action=stripeWebhook';
}

/**
 * Chamada a API REST do Stripe (form-encoded). Lanca QsHttpException em erro.
 *
 * @param array<string, mixed> $params
 * @return array<string, mixed>
 */
function qs_stripe_request(PDO $pdo, string $method, string $path, array $params = [], ?string $key = null): array
{
    $key ??= qs_setting($pdo, 'stripe_secret_key');
    if ($key === '') {
        throw new QsHttpException('billing_unavailable', 503);
    }
    $url = rtrim((string) qs_config()['stripe_api_base'], '/') . $path;
    $body = http_build_query($params, '', '&');
    if ($method === 'GET' && $body !== '') {
        $url .= (str_contains($url, '?') ? '&' : '?') . $body;
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_USERPWD => $key . ':',
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => ['Stripe-Version: ' . QS_STRIPE_API_VERSION],
    ]);
    if ($method !== 'GET') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $response = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        error_log('quosheets stripe unreachable: ' . $curlError);
        throw new QsHttpException('billing_unreachable', 502);
    }
    $data = json_decode((string) $response, true);
    if (!is_array($data)) {
        throw new QsHttpException('billing_error', 502);
    }
    if ($status >= 400) {
        $message = (string) ($data['error']['message'] ?? '');
        error_log("quosheets stripe $method $path -> $status: $message");
        throw new QsHttpException($status === 401 ? 'stripe_bad_key' : 'billing_error', $status === 401 ? 422 : 502, $message);
    }
    return $data;
}

/** Cria (ou recria) os precos mensais nas duas moedas com os valores atuais das configuracoes. */
function qs_stripe_sync_prices(PDO $pdo, string $key, string $productId): void
{
    $prices = qs_prices($pdo);
    foreach (['BRL' => 'stripe_price_brl', 'USD' => 'stripe_price_usd'] as $currency => $setting) {
        $amount = (int) round($prices[$currency] * 100);
        $storedAmount = qs_setting($pdo, $setting . '_amount');
        if (qs_setting($pdo, $setting) !== '' && $storedAmount === (string) $amount) {
            continue;
        }
        $price = qs_stripe_request($pdo, 'POST', '/v1/prices', [
            'product' => $productId,
            'currency' => strtolower($currency),
            'unit_amount' => $amount,
            'recurring' => ['interval' => 'month'],
            'nickname' => 'Quosheets Pro ' . $currency,
        ], $key);
        qs_setting_set($pdo, $setting, (string) $price['id']);
        qs_setting_set($pdo, $setting . '_amount', (string) $amount);
    }
}

/** @return array<string, mixed> */
function qs_stripe_connect(PDO $pdo, string $key): array
{
    $key = trim($key);
    if (!preg_match('/^(sk|rk)_(test|live)_[A-Za-z0-9]{16,}$/', $key)) {
        throw new QsHttpException('stripe_bad_key', 422);
    }
    $account = qs_stripe_request($pdo, 'GET', '/v1/account', [], $key);
    $mode = str_contains($key, '_live_') ? 'live' : 'test';

    // Produto (reaproveita o existente se a chave for da mesma conta/modo).
    $productId = '';
    if (qs_setting($pdo, 'stripe_account_id') === ($account['id'] ?? '') && qs_setting($pdo, 'stripe_mode') === $mode) {
        $productId = qs_setting($pdo, 'stripe_product_id');
    } else {
        foreach (['stripe_price_brl', 'stripe_price_usd', 'stripe_price_brl_amount', 'stripe_price_usd_amount'] as $name) {
            qs_setting_set($pdo, $name, '');
        }
    }
    if ($productId === '') {
        $product = qs_stripe_request($pdo, 'POST', '/v1/products', [
            'name' => 'Quosheets Pro',
            'description' => 'Quosheets — CSV & Excel editor with AI (monthly plan)',
        ], $key);
        $productId = (string) $product['id'];
    }
    qs_stripe_sync_prices($pdo, $key, $productId);

    // Webhook: remove o endpoint antigo deste site (o segredo dele nao e recuperavel) e cria outro.
    $url = qs_stripe_webhook_url();
    $existing = qs_stripe_request($pdo, 'GET', '/v1/webhook_endpoints', ['limit' => 100], $key);
    foreach ($existing['data'] ?? [] as $endpoint) {
        if (($endpoint['url'] ?? '') === $url) {
            qs_stripe_request($pdo, 'DELETE', '/v1/webhook_endpoints/' . rawurlencode((string) $endpoint['id']), [], $key);
        }
    }
    $webhook = qs_stripe_request($pdo, 'POST', '/v1/webhook_endpoints', [
        'url' => $url,
        'enabled_events' => QS_STRIPE_EVENTS,
        'api_version' => QS_STRIPE_API_VERSION,
        'description' => 'Quosheets subscriptions',
    ], $key);

    qs_setting_set($pdo, 'stripe_secret_key', $key, true);
    qs_setting_set($pdo, 'stripe_webhook_secret', (string) ($webhook['secret'] ?? ''), true);
    qs_setting_set($pdo, 'stripe_webhook_id', (string) ($webhook['id'] ?? ''));
    qs_setting_set($pdo, 'stripe_product_id', $productId);
    qs_setting_set($pdo, 'stripe_account_id', (string) ($account['id'] ?? ''));
    qs_setting_set($pdo, 'stripe_account_name', (string) ($account['settings']['dashboard']['display_name'] ?? $account['business_profile']['name'] ?? ''));
    qs_setting_set($pdo, 'stripe_mode', $mode);

    return ['mode' => $mode, 'account' => qs_setting($pdo, 'stripe_account_name'), 'webhook_url' => $url];
}

function qs_action_checkout(PDO $pdo): array
{
    qs_require_same_origin();
    $user = qs_require_user($pdo);
    $in = qs_input();
    if (!qs_stripe_configured($pdo)) {
        throw new QsHttpException('billing_unavailable', 503);
    }
    $access = qs_access($user);
    if ($access['subscribed'] && $user['stripe_customer_id']) {
        return qs_action_portal($pdo);
    }

    $currency = strtoupper(qs_str($in['currency'] ?? '', 3));
    if (!in_array($currency, ['BRL', 'USD'], true)) {
        $currency = $user['locale'] === 'pt' ? 'BRL' : 'USD';
    }
    $lang = $user['locale'];
    $params = [
        'mode' => 'subscription',
        'line_items' => [['price' => qs_setting($pdo, $currency === 'BRL' ? 'stripe_price_brl' : 'stripe_price_usd'), 'quantity' => 1]],
        'client_reference_id' => (string) $user['id'],
        'metadata' => ['user_id' => (string) $user['id']],
        'subscription_data' => ['metadata' => ['user_id' => (string) $user['id']]],
        'success_url' => qs_url('app?checkout=success&session_id={CHECKOUT_SESSION_ID}'),
        'cancel_url' => qs_url('app?checkout=cancel'),
        'locale' => $lang === 'pt' ? 'pt-BR' : $lang,
        'allow_promotion_codes' => 'true',
    ];
    if ($user['stripe_customer_id']) {
        $params['customer'] = $user['stripe_customer_id'];
    } else {
        $params['customer_email'] = $user['email'];
    }
    $session = qs_stripe_request($pdo, 'POST', '/v1/checkout/sessions', $params);
    return ['ok' => true, 'url' => (string) $session['url']];
}

function qs_action_portal(PDO $pdo): array
{
    qs_require_same_origin();
    $user = qs_require_user($pdo);
    if (!$user['stripe_customer_id']) {
        throw new QsHttpException('no_billing_account', 404);
    }
    $session = qs_stripe_request($pdo, 'POST', '/v1/billing_portal/sessions', [
        'customer' => $user['stripe_customer_id'],
        'return_url' => qs_url('app#account'),
        'locale' => $user['locale'] === 'pt' ? 'pt-BR' : $user['locale'],
    ]);
    return ['ok' => true, 'url' => (string) $session['url']];
}

/** Volta do checkout: confirma o pagamento direto no Stripe (nao depende do webhook ter chegado). */
function qs_action_sync_checkout(PDO $pdo): array
{
    qs_require_same_origin();
    $user = qs_require_user($pdo);
    $sessionId = qs_str(qs_input()['session_id'] ?? '', 120);
    if (!preg_match('/^cs_[A-Za-z0-9_]+$/', $sessionId)) {
        throw new QsHttpException('invalid_session', 422);
    }
    $session = qs_stripe_request($pdo, 'GET', '/v1/checkout/sessions/' . rawurlencode($sessionId));
    if ((string) ($session['client_reference_id'] ?? '') !== (string) $user['id']) {
        throw new QsHttpException('invalid_session', 403);
    }
    if (($session['status'] ?? '') === 'complete' && !empty($session['subscription'])) {
        $subscription = qs_stripe_request($pdo, 'GET', '/v1/subscriptions/' . rawurlencode((string) $session['subscription']));
        qs_stripe_apply_subscription($pdo, $subscription, (int) $user['id']);
    }
    return ['ok' => true, 'user' => qs_me_payload($pdo, qs_user_row($pdo, (int) $user['id']))];
}

function qs_stripe_cancel_subscription(PDO $pdo, string $subscriptionId): void
{
    try {
        qs_stripe_request($pdo, 'DELETE', '/v1/subscriptions/' . rawurlencode($subscriptionId));
    } catch (QsHttpException $e) {
        // Assinatura ja cancelada/inexistente no Stripe nao deve impedir a exclusao da conta.
        error_log('quosheets cancel subscription ' . $subscriptionId . ': ' . $e->getMessage());
    }
}

/**
 * Atualiza o plano do usuario a partir de um objeto Subscription do Stripe.
 * Le o fim do periodo tanto no formato antigo (subscription.current_period_end) quanto no novo
 * (subscription.items.data[0].current_period_end).
 *
 * @param array<string, mixed> $sub
 */
function qs_stripe_apply_subscription(PDO $pdo, array $sub, ?int $userIdHint = null): void
{
    $userId = $userIdHint ?: (int) ($sub['metadata']['user_id'] ?? 0);
    if ($userId <= 0) {
        $stmt = $pdo->prepare('SELECT id FROM qs_users WHERE stripe_subscription_id = :s OR stripe_customer_id = :c LIMIT 1');
        $stmt->execute(['s' => (string) ($sub['id'] ?? ''), 'c' => (string) ($sub['customer'] ?? '')]);
        $userId = (int) $stmt->fetchColumn();
    }
    if ($userId <= 0 || !qs_user_row($pdo, $userId)) {
        error_log('quosheets stripe: subscription ' . ($sub['id'] ?? '?') . ' sem usuario correspondente');
        return;
    }

    $item = $sub['items']['data'][0] ?? [];
    $periodEnd = (int) ($sub['current_period_end'] ?? $item['current_period_end'] ?? 0);
    $currency = strtoupper((string) ($sub['currency'] ?? $item['price']['currency'] ?? ''));
    $status = (string) ($sub['status'] ?? 'none');
    $customer = is_array($sub['customer'] ?? null) ? (string) $sub['customer']['id'] : (string) ($sub['customer'] ?? '');

    $pdo->prepare(
        'UPDATE qs_users SET plan_status = :st, current_period_end = :pe, cancel_at_period_end = :cap,
            stripe_subscription_id = :sid, stripe_customer_id = COALESCE(NULLIF(:cid, \'\'), stripe_customer_id),
            plan_currency = COALESCE(NULLIF(:cur, \'\'), plan_currency)
         WHERE id = :id'
    )->execute([
        'st' => mb_substr($status, 0, 20),
        'pe' => $periodEnd > 0 ? gmdate('Y-m-d H:i:s', $periodEnd) : null,
        'cap' => !empty($sub['cancel_at_period_end']) ? 1 : 0,
        'sid' => (string) ($sub['id'] ?? ''),
        'cid' => $customer,
        'cur' => $currency,
        'id' => $userId,
    ]);
}

/** Verifica o cabecalho Stripe-Signature (HMAC-SHA256 de "timestamp.payload"). */
function qs_stripe_verify_signature(string $payload, string $header, string $secret, int $tolerance = 300): bool
{
    $timestamp = 0;
    $signatures = [];
    foreach (explode(',', $header) as $part) {
        [$k, $v] = array_pad(explode('=', trim($part), 2), 2, '');
        if ($k === 't') {
            $timestamp = (int) $v;
        } elseif ($k === 'v1') {
            $signatures[] = $v;
        }
    }
    if ($timestamp <= 0 || !$signatures || abs(time() - $timestamp) > $tolerance) {
        return false;
    }
    $expected = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);
    foreach ($signatures as $signature) {
        if (hash_equals($expected, $signature)) {
            return true;
        }
    }
    return false;
}

/** Endpoint publico chamado pelo Stripe. */
function qs_action_stripe_webhook(PDO $pdo): array
{
    $payload = (string) file_get_contents('php://input');
    $secret = qs_setting($pdo, 'stripe_webhook_secret');
    if ($secret === '') {
        throw new QsHttpException('billing_unavailable', 503);
    }
    if (!qs_stripe_verify_signature($payload, (string) ($_SERVER['HTTP_STRIPE_SIGNATURE'] ?? ''), $secret)) {
        throw new QsHttpException('bad_signature', 400);
    }
    $event = json_decode($payload, true);
    if (!is_array($event) || empty($event['id'])) {
        throw new QsHttpException('bad_payload', 400);
    }

    $seen = $pdo->prepare('SELECT 1 FROM qs_stripe_events WHERE id = :id');
    $seen->execute(['id' => $event['id']]);
    if ($seen->fetchColumn()) {
        return ['ok' => true, 'duplicate' => true];
    }

    $object = $event['data']['object'] ?? [];
    switch ($event['type'] ?? '') {
        case 'checkout.session.completed':
            if (($object['mode'] ?? '') === 'subscription' && !empty($object['subscription'])) {
                $sub = qs_stripe_request($pdo, 'GET', '/v1/subscriptions/' . rawurlencode((string) $object['subscription']));
                qs_stripe_apply_subscription($pdo, $sub, (int) ($object['client_reference_id'] ?? 0) ?: null);
            }
            break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
            qs_stripe_apply_subscription($pdo, $object);
            break;
        case 'invoice.paid':
        case 'invoice.payment_failed':
            $subId = $object['subscription'] ?? ($object['parent']['subscription_details']['subscription'] ?? null);
            if (is_string($subId) && $subId !== '') {
                qs_stripe_apply_subscription($pdo, qs_stripe_request($pdo, 'GET', '/v1/subscriptions/' . rawurlencode($subId)));
            }
            break;
    }

    // So marca como processado depois de aplicar (se algo falhar, o Stripe reenvia).
    $pdo->prepare('INSERT IGNORE INTO qs_stripe_events (id, type) VALUES (:id, :t)')
        ->execute(['id' => $event['id'], 't' => mb_substr((string) ($event['type'] ?? ''), 0, 80)]);
    return ['ok' => true];
}
