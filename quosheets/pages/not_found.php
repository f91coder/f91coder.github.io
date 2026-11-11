<?php
/**
 * 404 (ou 503 quando o banco esta indisponivel).
 * @var string $lang  @var string $nonce  @var bool|null $unavailable
 */
$unavailable = !empty($unavailable);
$titleKey = $unavailable ? 'err.unavailable_title' : 'err.not_found_title';
$subKey = $unavailable ? 'err.unavailable_sub' : 'err.not_found_sub';
qs_head([
    'title' => qs_t($titleKey, [], $lang) . ' · Quosheets',
    'description' => qs_t($subKey, [], $lang),
    'lang' => $lang,
    'nonce' => $nonce,
    'noindex' => true,
    'css' => ['assets/css/qs-base.css', 'assets/css/qs-site.css'],
]);
?>
<body class="qs-site qs-error-page">
<main class="qs-error">
    <a class="qs-brand" href="<?= qs_e(qs_landing_path($lang)) ?>"><img src="<?= qs_asset('assets/img/logo-sm.png') ?>" alt="Quosheets" width="183" height="32"></a>
    <p class="qs-error-code"><?= $unavailable ? '503' : '404' ?></p>
    <h1><?= qs_e(qs_t($titleKey, [], $lang)) ?></h1>
    <p><?= qs_e(qs_t($subKey, [], $lang)) ?></p>
    <a class="qs-btn qs-btn-primary qs-btn-lg" href="<?= qs_e(qs_landing_path($lang)) ?>"><?= qs_e(qs_t('err.back_home', [], $lang)) ?></a>
</main>
</body>
</html>
