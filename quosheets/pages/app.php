<?php
/**
 * O app (editor). Toda a interface e montada pelos modulos JS; aqui ficam a estrutura fixa e o QS_BOOT.
 * @var string $lang  @var string $nonce  @var array $user  @var PDO $pdo
 */
$t = static fn(string $k, array $v = []): string => qs_e(qs_t($k, $v, $lang));
$base = qs_config()['base_path'];
$model = qs_setting($pdo, 'ai_model');
if (!in_array($model, QS_AI_MODELS, true)) {
    $model = QS_SETTING_DEFAULTS['ai_model'];
}
$modelPrices = QS_MODEL_PRICES[$model] ?? QS_MODEL_PRICES['claude-opus-5-5'];
$aiConfigured = qs_setting($pdo, 'anthropic_api_key') !== '' && is_file(__DIR__ . '/../../php/quosheets/vendor/autoload.php');

qs_head([
    'title' => 'Quosheets',
    'description' => qs_t('landing.meta_description', [], $lang),
    'lang' => $lang,
    'nonce' => $nonce,
    'noindex' => true,
    'css' => ['assets/css/qs-base.css', 'assets/css/qs-app.css'],
    'boot' => [
        'lang' => $lang,
        'basePath' => $base,
        'dict' => qs_dict($lang) + qs_dict('pt'),
        'user' => qs_me_payload($pdo, $user),
        'prices' => qs_prices($pdo),
        'ai' => [
            'configured' => $aiConfigured,
            'model' => $model,
            'prices' => [$modelPrices[0], $modelPrices[1]],
            'creditUsd' => qs_setting_float($pdo, 'credit_usd'),
        ],
    ],
]);
$nav = [
    'files' => 'folder-open',
    'sheet' => 'table',
    'analysis' => 'chart-column',
    'ai' => 'sparkles',
    'account' => 'user',
];
// $labeled: mantem o texto visivel em telas medias (as demais ferramentas viram so icone com dica).
$tool = static fn(string $act, string $icon, string $label, bool $labeled = false): string =>
    '<button type="button" class="qs-tool' . ($labeled ? ' is-labeled' : '') . '" data-act="' . $act . '" title="' . qs_e($label) . '" aria-label="' . qs_e($label) . '">'
    . qs_icon($icon, 18) . '<span>' . qs_e($label) . '</span></button>';
?>
<body class="qs-app-body" data-view="files">
<div class="qs-app">
    <aside class="qs-sidebar" aria-label="<?= $t('app.navigation') ?>">
        <a class="qs-sidebar-brand" href="<?= qs_e(qs_landing_path($lang)) ?>" title="Quosheets"><img src="<?= qs_asset('assets/img/logo-white.png') ?>" alt="Quosheets" width="155" height="27"></a>
        <nav class="qs-nav">
            <?php foreach ($nav as $view => $icon): ?>
                <button type="button" class="qs-nav-item<?= $view === 'files' ? ' is-active' : '' ?>" data-view="<?= $view ?>"><?= qs_icon($icon, 19) ?><span><?= $t("nav.{$view}") ?></span><?= $view === 'ai' ? '<em class="qs-nav-badge">IA</em>' : '' ?></button>
            <?php endforeach; ?>
            <?php if (qs_is_admin($user)): ?>
                <a class="qs-nav-item" href="<?= $base ?>/admin"><?= qs_icon('gauge', 19) ?><span><?= $t('nav.admin') ?></span></a>
            <?php endif; ?>
        </nav>
        <div class="qs-sidebar-foot">
            <div id="qsPlanCard"></div>
            <a class="qs-sidebar-link" href="<?= qs_e(qs_landing_path($lang)) ?>#faq"><?= qs_icon('circle-help', 16) ?><span><?= $t('app.help') ?></span></a>
        </div>
    </aside>
    <div class="qs-sidebar-backdrop" data-act="toggle-nav"></div>

    <div class="qs-main">
        <header class="qs-topbar">
            <button type="button" class="qs-icon-btn qs-nav-toggle" data-act="toggle-nav" aria-label="<?= $t('app.menu') ?>"><?= qs_icon('menu', 22) ?></button>
            <div class="qs-view-title" id="qsViewTitle"><h2><?= $t('nav.files') ?></h2></div>
            <span class="qs-save-state" id="qsSaveState"></span>
            <div class="qs-topbar-actions">
                <button type="button" class="qs-credits-pill" id="qsCreditsPill" data-act="go" data-target="account" title="<?= $t('credits.label') ?>"></button>
                <button type="button" class="qs-icon-btn qs-lang-btn" data-act="lang-menu" aria-label="<?= $t('nav.language') ?>"><?= qs_icon('globe', 18) ?><span><?= strtoupper($lang) ?></span></button>
                <button type="button" class="qs-user-btn" data-act="user-menu" aria-label="<?= $t('nav.account') ?>">
                    <span class="qs-avatar" id="qsAvatar"></span>
                    <span class="qs-user-text"><b id="qsUserName"></b><small id="qsUserPlan"></small></span>
                    <?= qs_icon('chevron-down', 16) ?>
                </button>
            </div>
        </header>
        <div class="qs-banner" id="qsBanner" hidden></div>

        <section class="qs-panel" data-view-panel="files"><div class="qs-view-pad" id="qsFilesView"></div></section>

        <section class="qs-panel qs-sheet-panel" data-view-panel="sheet" hidden>
            <div class="qs-toolbar" role="toolbar" aria-label="<?= $t('app.toolbar') ?>">
                <div class="qs-tool-group">
                    <button type="button" class="qs-tool is-icon" data-act="undo" title="<?= $t('app.undo') ?> (Ctrl+Z)" disabled><?= qs_icon('undo-2', 18) ?></button>
                    <button type="button" class="qs-tool is-icon" data-act="redo" title="<?= $t('app.redo') ?> (Ctrl+Y)" disabled><?= qs_icon('redo-2', 18) ?></button>
                </div>
                <div class="qs-tool-group">
                    <?= $tool('add-row', 'rows-3', qs_t('app.add_row', [], $lang)) ?>
                    <?= $tool('add-col', 'columns-3', qs_t('app.add_col', [], $lang)) ?>
                    <?= $tool('formula', 'sigma', qs_t('app.formula', [], $lang)) ?>
                </div>
                <div class="qs-tool-group">
                    <?= $tool('filter-menu', 'filter', qs_t('app.filter', [], $lang), true) ?>
                    <?= $tool('clean', 'eraser', qs_t('app.clean', [], $lang)) ?>
                </div>
                <label class="qs-search">
                    <?= qs_icon('search', 16) ?>
                    <input type="search" id="qsSearch" placeholder="<?= $t('app.search_ph') ?>" aria-label="<?= $t('common.search') ?>" autocomplete="off">
                </label>
                <div class="qs-tool-group">
                    <?= $tool('chart', 'chart-column', qs_t('app.chart', [], $lang)) ?>
                    <?= $tool('pivot', 'table-2', qs_t('app.pivot', [], $lang)) ?>
                </div>
                <div class="qs-tool-group is-end">
                    <button type="button" class="qs-btn qs-btn-ai qs-btn-sm" data-act="ai"><?= qs_icon('wand-sparkles', 16) ?><span><?= $t('app.ai_automate') ?></span></button>
                    <button type="button" class="qs-btn qs-btn-ghost qs-btn-sm" data-act="ask"><?= qs_icon('message-square', 16) ?><span><?= $t('app.ai_ask') ?></span></button>
                    <button type="button" class="qs-btn qs-btn-primary qs-btn-sm" data-act="export"><?= qs_icon('download', 16) ?><span><?= $t('app.export') ?></span></button>
                </div>
            </div>
            <div class="qs-filter-chips" id="qsFilterChips" hidden></div>
            <div class="qs-bulk-bar" id="qsBulkBar" aria-live="polite">
                <span class="qs-bulk-info"><?= qs_icon('square-check', 16) ?><b id="qsBulkCount">0</b> <?= $t('app.bulk_selected') ?></span>
                <button type="button" class="qs-btn qs-btn-ai qs-btn-sm" data-act="bulk-ai"><?= qs_icon('wand-sparkles', 15) ?><span><?= $t('app.bulk_ai') ?></span></button>
                <button type="button" class="qs-btn qs-btn-ghost qs-btn-sm" data-act="bulk-export"><?= qs_icon('download', 15) ?><span><?= $t('app.bulk_export') ?></span></button>
                <button type="button" class="qs-btn qs-btn-danger qs-btn-sm" data-act="bulk-delete"><?= qs_icon('trash-2', 15) ?><span><?= $t('app.bulk_delete') ?></span></button>
                <button type="button" class="qs-icon-btn" data-act="bulk-clear" aria-label="<?= $t('app.bulk_clear') ?>" title="<?= $t('app.bulk_clear') ?>"><?= qs_icon('x', 16) ?></button>
            </div>
            <div class="qs-grid-host" id="qsGridHost"></div>
            <footer class="qs-statusbar">
                <div class="qs-sheet-tabs" id="qsSheetTabs"></div>
                <span class="qs-sel-stats" id="qsSelStats"></span>
                <span class="qs-status-info" id="qsStatusInfo"></span>
            </footer>
        </section>

        <section class="qs-panel" data-view-panel="analysis" hidden><div class="qs-view-pad" id="qsAnalysisView"></div></section>
        <section class="qs-panel" data-view-panel="ai" hidden><div class="qs-view-pad" id="qsAiView"></div></section>
        <section class="qs-panel" data-view-panel="account" hidden><div class="qs-view-pad" id="qsAccountView"></div></section>
    </div>
</div>

<input type="file" id="qsFileInput" accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xlsb,.xls,.ods,.fods,.numbers,.json" multiple hidden>
<div class="qs-drop-overlay" id="qsDropOverlay"><div class="qs-drop-box"><?= qs_icon('upload', 40) ?><b><?= $t('app.drop_here') ?></b><span><?= $t('app.drop_hint') ?></span></div></div>
<noscript><p class="qs-noscript"><?= $t('app.noscript') ?></p></noscript>

<?php foreach (['js/qs-icons', 'vendor/chart.umd.min', 'vendor/xlsx.full.min', 'js/qs-core', 'js/qs-data', 'js/qs-formula', 'js/qs-ops', 'js/qs-store', 'js/qs-grid', 'js/qs-charts', 'js/qs-ai', 'js/qs-app', 'js/qs-views'] as $script): ?>
<script src="<?= qs_asset('assets/' . $script . '.js') ?>"></script>
<?php endforeach; ?>
</body>
</html>
