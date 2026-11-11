<?php
declare(strict_types=1);

/**
 * Painel do dono do produto (/quosheets/admin): metricas, configuracoes de IA e cobranca, e acoes por usuario.
 * Administradores = contas verificadas cujo e-mail esta em config['admin_email_hashes'].
 */

/** @return array<string, mixed> */
function qs_require_admin(PDO $pdo): array
{
    $user = qs_require_user($pdo);
    if (!qs_is_admin($user)) {
        throw new QsHttpException('forbidden', 403);
    }
    return $user;
}

function qs_mask_secret(string $value): string
{
    return $value === '' ? '' : '••••' . substr($value, -4);
}

function qs_action_admin_overview(PDO $pdo): array
{
    qs_require_admin($pdo);
    return qs_admin_overview($pdo);
}

/** Dados do painel. Sem checagem de acesso: quem chama garante que e admin. */
function qs_admin_overview(PDO $pdo): array
{
    // Mes atual (UTC) como intervalo de datas. Comparar created_at com datas evita comparar textos, cujo
    // collation varia entre servidores (no MySQL da Hostinger, DATE_FORMAT(...) = :m dava o erro 1267).
    $year = (int) gmdate('Y');
    $mon = (int) gmdate('n');
    $monthRange = [
        'from' => gmdate('Y-m-d H:i:s', gmmktime(0, 0, 0, $mon, 1, $year)),
        'to' => gmdate('Y-m-d H:i:s', gmmktime(0, 0, 0, $mon + 1, 1, $year)),
    ];

    $users = $pdo->query(
        "SELECT COUNT(*) AS total,
                SUM(email_verified_at IS NOT NULL) AS verified,
                SUM(email_verified_at IS NOT NULL AND trial_ends_at > NOW()
                    AND NOT (plan_status IN ('active','trialing','past_due') AND current_period_end > NOW())) AS trials,
                SUM(plan_status IN ('active','trialing','past_due') AND current_period_end > NOW()) AS subscribers,
                SUM(plan_status IN ('active','trialing','past_due') AND current_period_end > NOW() AND plan_currency = 'BRL') AS subs_brl,
                SUM(plan_status IN ('active','trialing','past_due') AND current_period_end > NOW() AND plan_currency = 'USD') AS subs_usd,
                SUM(created_at > (NOW() - INTERVAL 7 DAY)) AS new_7d
         FROM qs_users"
    )->fetch();

    $usageStmt = $pdo->prepare(
        "SELECT COUNT(*) AS calls, COALESCE(SUM(cost_usd), 0) AS cost, COALESCE(SUM(GREATEST(credits, 0)), 0) AS credits,
                COALESCE(SUM(rows_count), 0) AS rows_processed
         FROM qs_ai_usage WHERE mode <> 'grant' AND created_at >= :from AND created_at < :to"
    );
    $usageStmt->execute($monthRange);
    $usage = $usageStmt->fetch();

    $daily = $pdo->query(
        "SELECT DATE(created_at) AS day, COUNT(*) AS calls, ROUND(SUM(cost_usd), 4) AS cost
         FROM qs_ai_usage WHERE mode <> 'grant' AND created_at > (NOW() - INTERVAL 30 DAY)
         GROUP BY DATE(created_at) ORDER BY day"
    )->fetchAll();

    $list = $pdo->prepare(
        "SELECT u.id, u.email, u.name, u.locale, u.created_at, u.email_verified_at, u.trial_ends_at, u.plan_status,
                u.plan_currency, u.current_period_end, u.comp_until, u.last_login_at,
                COALESCE((SELECT SUM(a.cost_usd) FROM qs_ai_usage a WHERE a.user_id = u.id AND a.mode <> 'grant'
                          AND a.created_at >= :from AND a.created_at < :to), 0) AS ai_cost_month
         FROM qs_users u ORDER BY u.id DESC LIMIT 200"
    );
    $list->execute($monthRange);
    $rows = array_map(static function (array $u) use ($pdo): array {
        $full = qs_user_row($pdo, (int) $u['id']);
        $access = qs_access($full);
        return [
            'id' => (int) $u['id'],
            'email' => $u['email'],
            'name' => $u['name'],
            'locale' => $u['locale'],
            'created_at' => qs_iso($u['created_at']),
            'verified' => $u['email_verified_at'] !== null,
            'state' => $access['state'],
            'trial_ends_at' => qs_iso($u['trial_ends_at']),
            'plan_status' => $u['plan_status'],
            'plan_currency' => $u['plan_currency'],
            'current_period_end' => qs_iso($u['current_period_end']),
            'comp_until' => qs_iso($u['comp_until']),
            'last_login_at' => qs_iso($u['last_login_at']),
            'credits' => $u['email_verified_at'] !== null ? qs_credits($pdo, $full, $access) : null,
            'ai_cost_month' => round((float) $u['ai_cost_month'], 4),
        ];
    }, $list->fetchAll());

    $prices = qs_prices($pdo);
    return [
        'ok' => true,
        'stats' => [
            'users' => (int) $users['total'],
            'verified' => (int) $users['verified'],
            'trials' => (int) $users['trials'],
            'subscribers' => (int) $users['subscribers'],
            'new_7d' => (int) $users['new_7d'],
            'mrr' => [
                'BRL' => round((int) $users['subs_brl'] * $prices['BRL'], 2),
                'USD' => round((int) $users['subs_usd'] * $prices['USD'], 2),
            ],
            'ai_month' => [
                'calls' => (int) $usage['calls'],
                'cost_usd' => round((float) $usage['cost'], 4),
                'credits' => (int) $usage['credits'],
                'rows' => (int) $usage['rows_processed'],
            ],
            'ai_daily' => $daily,
        ],
        'settings' => [
            'ai_key' => qs_mask_secret(qs_setting($pdo, 'anthropic_api_key')),
            'ai_model' => qs_ai_model($pdo),
            'ai_models' => QS_AI_MODELS,
            'ai_fallbacks' => qs_setting($pdo, 'ai_fallbacks') === '1',
            'credits_monthly' => qs_setting_int($pdo, 'credits_monthly'),
            'credits_trial' => qs_setting_int($pdo, 'credits_trial'),
            'credit_usd' => qs_setting_float($pdo, 'credit_usd'),
            'trial_days' => qs_setting_int($pdo, 'trial_days'),
            'price_brl' => $prices['BRL'],
            'price_usd' => $prices['USD'],
            'model_prices' => QS_MODEL_PRICES,
            'stripe' => [
                'connected' => qs_stripe_configured($pdo),
                'key' => qs_mask_secret(qs_setting($pdo, 'stripe_secret_key')),
                'mode' => qs_setting($pdo, 'stripe_mode'),
                'account' => qs_setting($pdo, 'stripe_account_name'),
                'webhook' => qs_setting($pdo, 'stripe_webhook_id') !== '',
                'webhook_url' => qs_stripe_webhook_url(),
            ],
        ],
        'users' => $rows,
    ];
}

function qs_action_admin_save_settings(PDO $pdo): array
{
    qs_require_same_origin();
    qs_require_admin($pdo);
    $in = qs_input();

    if (isset($in['ai_model'])) {
        $model = (string) $in['ai_model'];
        if (!in_array($model, QS_AI_MODELS, true)) {
            throw new QsHttpException('invalid_model', 422);
        }
        qs_setting_set($pdo, 'ai_model', $model);
    }
    if (isset($in['ai_fallbacks'])) {
        qs_setting_set($pdo, 'ai_fallbacks', !empty($in['ai_fallbacks']) ? '1' : '0');
    }
    $ints = ['credits_monthly' => [0, 10_000_000], 'credits_trial' => [0, 1_000_000], 'trial_days' => [0, 90]];
    foreach ($ints as $name => [$min, $max]) {
        if (isset($in[$name])) {
            qs_setting_set($pdo, $name, (string) max($min, min($max, (int) $in[$name])));
        }
    }
    if (isset($in['credit_usd'])) {
        $value = (float) $in['credit_usd'];
        if ($value <= 0 || $value > 1) {
            throw new QsHttpException('invalid_value', 422);
        }
        qs_setting_set($pdo, 'credit_usd', rtrim(rtrim(number_format($value, 6, '.', ''), '0'), '.'));
    }
    $pricesChanged = false;
    foreach (['price_brl', 'price_usd'] as $name) {
        if (isset($in[$name])) {
            $value = round((float) $in[$name], 2);
            if ($value < 1 || $value > 100000) {
                throw new QsHttpException('invalid_value', 422);
            }
            $formatted = number_format($value, 2, '.', '');
            $pricesChanged = $pricesChanged || $formatted !== number_format(qs_setting_float($pdo, $name), 2, '.', '');
            qs_setting_set($pdo, $name, $formatted);
        }
    }
    // Preco novo => preco novo no Stripe (assinaturas existentes continuam no preco antigo).
    if ($pricesChanged && qs_stripe_configured($pdo)) {
        qs_stripe_sync_prices($pdo, qs_setting($pdo, 'stripe_secret_key'), qs_setting($pdo, 'stripe_product_id'));
    }
    return qs_action_admin_overview($pdo);
}

function qs_action_admin_set_ai_key(PDO $pdo): array
{
    qs_require_same_origin();
    qs_require_admin($pdo);
    $key = trim((string) (qs_input()['key'] ?? ''));
    if ($key === '') {
        qs_setting_set($pdo, 'anthropic_api_key', '', true);
        return qs_action_admin_overview($pdo);
    }
    if (!preg_match('/^sk-ant-[A-Za-z0-9_\-]{20,}$/', $key)) {
        throw new QsHttpException('ai_bad_key', 422);
    }
    // Valida a chave sem custo: consulta o modelo configurado na API de modelos.
    $previous = qs_setting($pdo, 'anthropic_api_key');
    qs_setting_set($pdo, 'anthropic_api_key', $key, true);
    try {
        qs_ai_client($pdo)->models->retrieve(qs_ai_model($pdo));
    } catch (Throwable $e) {
        qs_setting_set($pdo, 'anthropic_api_key', $previous, true);
        error_log('quosheets admin ai key check: ' . $e->getMessage());
        throw new QsHttpException('ai_bad_key', 422);
    }
    return qs_action_admin_overview($pdo);
}

function qs_action_admin_stripe_connect(PDO $pdo): array
{
    qs_require_same_origin();
    qs_require_admin($pdo);
    qs_stripe_connect($pdo, (string) (qs_input()['key'] ?? ''));
    return qs_action_admin_overview($pdo);
}

function qs_action_admin_user(PDO $pdo): array
{
    qs_require_same_origin();
    $admin = qs_require_admin($pdo);
    $in = qs_input();
    $target = qs_user_row($pdo, (int) ($in['user_id'] ?? 0));
    if (!$target) {
        throw new QsHttpException('not_found', 404);
    }
    switch ((string) ($in['action'] ?? '')) {
        case 'extend':
            // Cortesia: estende o acesso a partir de hoje (ou do fim da cortesia atual).
            $days = max(1, min(366, (int) ($in['days'] ?? 30)));
            $base = max(time(), qs_ts($target['comp_until']));
            $pdo->prepare('UPDATE qs_users SET comp_until = :c WHERE id = :id')
                ->execute(['c' => gmdate('Y-m-d H:i:s', $base + $days * 86400), 'id' => $target['id']]);
            break;
        case 'end_comp':
            $pdo->prepare('UPDATE qs_users SET comp_until = NULL WHERE id = :id')->execute(['id' => $target['id']]);
            break;
        case 'credits':
            $amount = max(1, min(1_000_000, (int) ($in['amount'] ?? 0)));
            $access = qs_access($target);
            $pdo->prepare(
                "INSERT INTO qs_ai_usage (user_id, mode, credits, period, note) VALUES (:u, 'grant', :c, :p, :n)"
            )->execute([
                'u' => $target['id'],
                'c' => -$amount,
                'p' => qs_credit_period($access),
                'n' => 'grant by admin #' . $admin['id'],
            ]);
            break;
        case 'verify':
            $pdo->prepare(
                'UPDATE qs_users SET email_verified_at = COALESCE(email_verified_at, NOW()),
                    trial_ends_at = COALESCE(trial_ends_at, (NOW() + INTERVAL ' . max(0, qs_setting_int($pdo, 'trial_days')) . ' DAY))
                 WHERE id = :id'
            )->execute(['id' => $target['id']]);
            break;
        default:
            throw new QsHttpException('invalid_action', 422);
    }
    return qs_action_admin_overview($pdo);
}
