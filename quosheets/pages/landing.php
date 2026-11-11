<?php
/**
 * Landing do Quosheets (pt em /quosheets/, en em /quosheets/en/, es em /quosheets/es/).
 * @var string $lang  @var string $nonce  @var array|null $user  @var PDO $pdo
 */
$t = static fn(string $k, array $v = []): string => qs_e(qs_t($k, $v, $lang));
$base = qs_config()['base_path'];
$prices = qs_prices($pdo);
$currency = $lang === 'pt' ? 'BRL' : 'USD';
$brlText = 'R$ ' . number_format($prices['BRL'], 2, ',', '.');
$usdText = 'US$ ' . ($lang === 'en' ? number_format($prices['USD'], 2, '.', ',') : number_format($prices['USD'], 2, ',', '.'));
$priceText = $currency === 'BRL' ? $brlText : $usdText;
$credits = number_format(qs_setting_int($pdo, 'credits_monthly'), 0, ',', $lang === 'en' ? ',' : '.');
$trialDays = qs_setting_int($pdo, 'trial_days');
$signup = $base . '/signup?lang=' . $lang;

$mock = [
    'pt' => ['file' => 'vendas_2025.csv', 'cols' => ['Data', 'Cliente', 'Região', 'Total', 'Status'], 'rows' => [
        ['03/01/2025', 'Ana Souza', 'Sudeste', 'R$ 4.899,00', ['Pago', 'success']], ['04/01/2025', 'Bruno Lima', 'Sul', 'R$ 1.299,00', ['Pago', 'success']],
        ['06/01/2025', 'Carla Mendes', 'Nordeste', 'R$ 649,00', ['Pendente', 'warning']], ['07/01/2025', 'Diego Rocha', 'Sudeste', 'R$ 2.398,00', ['Pago', 'success']],
        ['09/01/2025', 'Eduarda Alves', 'Centro-Oeste', 'R$ 459,00', ['Cancelado', 'danger']], ['10/01/2025', 'Felipe Costa', 'Sul', 'R$ 3.198,00', ['Pago', 'success']],
    ], 'bars' => [['Sudeste', 92], ['Sul', 64], ['Nordeste', 48], ['C.-Oeste', 31]], 'q' => 'Qual região mais vendeu em 2025?', 'a' => 'Sudeste', 'av' => 'R$ 1,24 mi', 'filter' => 'Região: Sul'],
    'en' => ['file' => 'sales_2025.csv', 'cols' => ['Date', 'Customer', 'Region', 'Total', 'Status'], 'rows' => [
        ['01/03/2025', 'Emma Johnson', 'Northeast', '$1,299.00', ['Paid', 'success']], ['01/04/2025', 'Liam Smith', 'West', '$329.00', ['Paid', 'success']],
        ['01/06/2025', 'Olivia Brown', 'South', '$149.00', ['Pending', 'warning']], ['01/07/2025', 'Noah Davis', 'Midwest', '$658.00', ['Paid', 'success']],
        ['01/09/2025', 'Ava Wilson', 'West', '$119.00', ['Canceled', 'danger']], ['01/10/2025', 'Ethan Miller', 'South', '$498.00', ['Paid', 'success']],
    ], 'bars' => [['West', 92], ['South', 70], ['Northeast', 52], ['Midwest', 34]], 'q' => 'Which region sold the most in 2025?', 'a' => 'West', 'av' => '$412K', 'filter' => 'Region: West'],
    'es' => ['file' => 'ventas_2025.csv', 'cols' => ['Fecha', 'Cliente', 'Región', 'Total', 'Estado'], 'rows' => [
        ['03/01/2025', 'Lucía García', 'Centro', '1.199,00 €', ['Pagado', 'success']], ['04/01/2025', 'Hugo Martínez', 'Este', '299,00 €', ['Pagado', 'success']],
        ['06/01/2025', 'Martina López', 'Sur', '139,00 €', ['Pendiente', 'warning']], ['07/01/2025', 'Pablo Sánchez', 'Norte', '598,00 €', ['Pagado', 'success']],
        ['09/01/2025', 'Sofía Pérez', 'Sur', '99,00 €', ['Cancelado', 'danger']], ['10/01/2025', 'Mateo Gómez', 'Este', '458,00 €', ['Pagado', 'success']],
    ], 'bars' => [['Centro', 90], ['Este', 66], ['Sur', 49], ['Norte', 35]], 'q' => '¿Qué región vendió más en 2025?', 'a' => 'Centro', 'av' => '386 mil €', 'filter' => 'Región: Este'],
][$lang];

$features = [
    ['table', 'edit'], ['filter', 'filter'], ['chart-column', 'charts'], ['table-2', 'pivot'],
    ['eraser', 'clean'], ['sigma', 'formulas'], ['gauge', 'profile'], ['download', 'export'],
];
$icons = static fn(string $name, int $size = 22): string => qs_icon($name, $size);

qs_head([
    'title' => qs_t('landing.meta_title', [], $lang),
    'description' => qs_t('landing.meta_description', [], $lang),
    'lang' => $lang,
    'nonce' => $nonce,
    'alternates' => true,
    'css' => ['assets/css/qs-base.css', 'assets/css/qs-site.css'],
    'jsonld' => [
        '@context' => 'https://schema.org',
        '@type' => 'SoftwareApplication',
        'name' => 'Quosheets',
        'applicationCategory' => 'BusinessApplication',
        'operatingSystem' => 'Web',
        'description' => qs_t('landing.meta_description', [], $lang),
        'offers' => [
            ['@type' => 'Offer', 'price' => number_format($prices['BRL'], 2, '.', ''), 'priceCurrency' => 'BRL'],
            ['@type' => 'Offer', 'price' => number_format($prices['USD'], 2, '.', ''), 'priceCurrency' => 'USD'],
        ],
        'inLanguage' => ['pt-BR', 'en', 'es'],
    ],
]);
?>
<body class="qs-site">
<?php qs_site_header($lang, $user); ?>
<main>
    <section class="qs-hero">
        <div class="qs-container qs-hero-grid">
            <div class="qs-hero-copy">
                <span class="qs-eyebrow"><?= $icons('sparkles', 15) ?><?= $t('landing.eyebrow') ?></span>
                <h1><?= $t('landing.hero_title') ?></h1>
                <p class="qs-lead"><?= $t('landing.hero_sub') ?></p>
                <div class="qs-hero-ctas">
                    <a class="qs-btn qs-btn-primary qs-btn-lg" href="<?= qs_e($signup) ?>"><?= $t('landing.cta_trial', ['days' => $trialDays]) ?></a>
                    <a class="qs-btn qs-btn-ghost qs-btn-lg" href="#how"><?= $t('landing.cta_how') ?></a>
                </div>
                <ul class="qs-trust">
                    <li><?= $icons('credit-card', 16) ?><?= $t('landing.trust_card') ?></li>
                    <li><?= $icons('shield-check', 16) ?><?= $t('landing.trust_local') ?></li>
                    <li><?= $icons('languages', 16) ?><?= $t('landing.trust_langs') ?></li>
                </ul>
            </div>
            <div class="qs-mock" aria-hidden="true">
                <div class="qs-mock-window">
                    <div class="qs-mock-bar"><i></i><i></i><i></i><em><?= qs_e($mock['file']) ?></em></div>
                    <div class="qs-mock-toolbar">
                        <span class="qs-mock-search"><?= $icons('search', 13) ?> <?= $t('common.search') ?>…</span>
                        <span class="qs-mock-chip"><?= $icons('filter', 12) ?> <?= qs_e($mock['filter']) ?></span>
                        <span class="qs-mock-ai-btn"><?= $icons('sparkles', 13) ?> Quo.IA</span>
                    </div>
                    <table class="qs-mock-table">
                        <thead><tr><th>#</th><?php foreach ($mock['cols'] as $col): ?><th><?= qs_e($col) ?></th><?php endforeach; ?></tr></thead>
                        <tbody>
                        <?php foreach ($mock['rows'] as $i => $row): ?>
                            <tr<?= $i === 3 ? ' class="is-sel"' : '' ?>><td><?= $i + 1 ?></td><td><?= qs_e($row[0]) ?></td><td><?= qs_e($row[1]) ?></td><td><?= qs_e($row[2]) ?></td><td class="is-num"><?= qs_e($row[3]) ?></td><td><span class="qs-pill is-<?= $row[4][1] ?>"><?= qs_e($row[4][0]) ?></span></td></tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <div class="qs-mock-chart">
                    <p><?= $t('landing.mock_chart') ?></p>
                    <div class="qs-mock-bars"><?php foreach ($mock['bars'] as [$label, $height]): ?><div><span style="height:<?= (int) $height ?>%"></span><em><?= qs_e($label) ?></em></div><?php endforeach; ?></div>
                </div>
                <div class="qs-mock-ask">
                    <p class="qs-mock-q"><?= qs_e($mock['q']) ?></p>
                    <p class="qs-mock-a"><?= $icons('sparkles', 14) ?><span><b><?= qs_e($mock['a']) ?></b> · <?= qs_e($mock['av']) ?></span></p>
                </div>
            </div>
        </div>
        <div class="qs-container qs-formats">
            <span><?= $t('landing.formats') ?></span>
            <?php foreach (['CSV', 'TSV', 'XLSX', 'XLS', 'ODS', 'JSON'] as $fmt): ?><b><?= $fmt ?></b><?php endforeach; ?>
        </div>
    </section>

    <section class="qs-section qs-pains">
        <div class="qs-container">
            <h2 class="qs-section-title"><?= $t('landing.pains_title') ?></h2>
            <div class="qs-pain-grid">
                <?php foreach (['encoding' => 'languages', 'big' => 'zap', 'formulas' => 'sigma'] as $key => $icon): ?>
                    <article class="qs-pain">
                        <span class="qs-pain-icon"><?= $icons($icon) ?></span>
                        <p class="qs-pain-problem"><?= $t("landing.pain_{$key}") ?></p>
                        <p class="qs-pain-fix"><?= $icons('check', 16) ?><span><?= $t("landing.fix_{$key}") ?></span></p>
                    </article>
                <?php endforeach; ?>
            </div>
        </div>
    </section>

    <section class="qs-section" id="features">
        <div class="qs-container">
            <span class="qs-kicker"><?= $t('nav.features') ?></span>
            <h2 class="qs-section-title"><?= $t('landing.features_title') ?></h2>
            <p class="qs-section-sub"><?= $t('landing.features_sub') ?></p>
            <div class="qs-feature-grid">
                <?php foreach ($features as [$icon, $key]): ?>
                    <article class="qs-feature">
                        <span class="qs-feature-icon"><?= $icons($icon) ?></span>
                        <h3><?= $t("landing.f_{$key}") ?></h3>
                        <p><?= $t("landing.f_{$key}_desc") ?></p>
                    </article>
                <?php endforeach; ?>
            </div>
        </div>
    </section>

    <section class="qs-section qs-ai-section" id="ai">
        <div class="qs-container">
            <span class="qs-kicker is-light"><?= $icons('sparkles', 14) ?> Quo.IA</span>
            <h2 class="qs-section-title"><?= $t('landing.ai_title') ?></h2>
            <p class="qs-section-sub"><?= $t('landing.ai_sub') ?></p>
            <div class="qs-ai-grid">
                <?php foreach (['automate' => 'wand-sparkles', 'ask' => 'message-square', 'insights' => 'lightbulb', 'formula' => 'sigma'] as $key => $icon): ?>
                    <article class="qs-ai-card">
                        <span class="qs-ai-icon"><?= $icons($icon) ?></span>
                        <h3><?= $t("landing.ai_{$key}") ?></h3>
                        <p><?= $t("landing.ai_{$key}_desc") ?></p>
                    </article>
                <?php endforeach; ?>
            </div>
            <div class="qs-ai-examples">
                <?php foreach (['1', '2', '3', '4'] as $n): ?><span><?= $t("landing.ai_ex{$n}") ?></span><?php endforeach; ?>
            </div>
            <p class="qs-ai-privacy"><?= $icons('shield-check', 16) ?><span><?= $t('landing.ai_privacy') ?></span></p>
        </div>
    </section>

    <section class="qs-section" id="how">
        <div class="qs-container">
            <span class="qs-kicker"><?= $t('landing.how_kicker') ?></span>
            <h2 class="qs-section-title"><?= $t('landing.how_title') ?></h2>
            <ol class="qs-steps">
                <?php foreach (['1' => 'upload', '2' => 'wand-sparkles', '3' => 'download'] as $n => $icon): ?>
                    <li><span class="qs-step-n"><?= $n ?></span><span class="qs-step-icon"><?= $icons($icon) ?></span><h3><?= $t("landing.step{$n}") ?></h3><p><?= $t("landing.step{$n}_desc") ?></p></li>
                <?php endforeach; ?>
            </ol>
        </div>
    </section>

    <section class="qs-section qs-usecases">
        <div class="qs-container">
            <h2 class="qs-section-title"><?= $t('landing.uses_title') ?></h2>
            <div class="qs-use-grid">
                <?php foreach (['ecommerce' => 'receipt', 'finance' => 'credit-card', 'marketing' => 'users', 'ops' => 'layers'] as $key => $icon): ?>
                    <article class="qs-use"><span><?= $icons($icon) ?></span><h3><?= $t("landing.use_{$key}") ?></h3><p><?= $t("landing.use_{$key}_desc") ?></p></article>
                <?php endforeach; ?>
            </div>
        </div>
    </section>

    <section class="qs-section qs-privacy">
        <div class="qs-container qs-privacy-grid">
            <div>
                <span class="qs-kicker"><?= $icons('lock', 14) ?> <?= $t('landing.privacy_kicker') ?></span>
                <h2 class="qs-section-title"><?= $t('landing.privacy_title') ?></h2>
                <p class="qs-section-sub"><?= $t('landing.privacy_sub') ?></p>
            </div>
            <ul class="qs-check-list">
                <?php foreach (['1', '2', '3', '4'] as $n): ?><li><?= $icons('circle-check', 20) ?><span><?= $t("landing.privacy_{$n}") ?></span></li><?php endforeach; ?>
            </ul>
        </div>
    </section>

    <section class="qs-section qs-pricing" id="pricing">
        <div class="qs-container">
            <span class="qs-kicker"><?= $t('nav.pricing') ?></span>
            <h2 class="qs-section-title"><?= $t('landing.pricing_title') ?></h2>
            <p class="qs-section-sub"><?= $t('landing.pricing_sub') ?></p>
            <div class="qs-price-card">
                <div class="qs-price-head">
                    <h3>Quosheets Pro</h3>
                    <p class="qs-price"><b><?= qs_e($priceText) ?></b><span><?= $t('pricing.per_month') ?></span></p>
                    <p class="qs-price-note"><?= $t('landing.price_trial', ['days' => $trialDays]) ?></p>
                </div>
                <ul class="qs-check-list">
                    <?php foreach (['1', '2', '3', '4', '5', '6'] as $n): ?><li><?= $icons('check', 18) ?><span><?= $t("landing.price_f{$n}", ['credits' => $credits]) ?></span></li><?php endforeach; ?>
                </ul>
                <a class="qs-btn qs-btn-primary qs-btn-lg qs-btn-block" href="<?= qs_e($signup) ?>"><?= $t('landing.cta_trial', ['days' => $trialDays]) ?></a>
                <p class="qs-price-foot"><?= $t($currency === 'BRL' ? 'landing.price_brl_note' : 'landing.price_usd_note') ?></p>
            </div>
        </div>
    </section>

    <section class="qs-section qs-faq" id="faq">
        <div class="qs-container qs-faq-inner">
            <h2 class="qs-section-title"><?= $t('landing.faq_title') ?></h2>
            <?php foreach (range(1, 8) as $n): ?>
                <details class="qs-faq-item"<?= $n === 1 ? ' open' : '' ?>><summary><?= $t("landing.faq{$n}_q") ?></summary><p><?= $t("landing.faq{$n}_a", ['credits' => $credits, 'days' => $trialDays, 'brl' => $brlText, 'usd' => $usdText]) ?></p></details>
            <?php endforeach; ?>
        </div>
    </section>

    <section class="qs-final-cta">
        <div class="qs-container">
            <h2><?= $t('landing.final_title') ?></h2>
            <p><?= $t('landing.final_sub', ['days' => $trialDays]) ?></p>
            <a class="qs-btn qs-btn-light qs-btn-lg" href="<?= qs_e($signup) ?>"><?= $t('landing.cta_trial', ['days' => $trialDays]) ?></a>
        </div>
    </section>
</main>
<?php qs_site_footer($lang); ?>
<script src="<?= qs_asset('assets/js/qs-site.js') ?>"></script>
</body>
</html>
