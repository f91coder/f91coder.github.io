<?php
/**
 * Painel do dono do produto (somente contas admin). Conteudo montado por qs-admin.js a partir de adminOverview.
 * @var string $lang  @var string $nonce  @var array $user  @var PDO $pdo
 */
$base = qs_config()['base_path'];
qs_head([
    'title' => 'Admin · Quosheets',
    'description' => 'Quosheets admin',
    'lang' => 'pt',
    'nonce' => $nonce,
    'noindex' => true,
    'css' => ['assets/css/qs-base.css', 'assets/css/qs-app.css'],
    'boot' => [
        'lang' => 'pt',
        'basePath' => $base,
        'dict' => qs_dict_subset('pt', ['common.', 'err.', 'plan.state_']),
        'admin' => ['email' => $user['email']],
    ],
]);
?>
<body class="qs-admin-body">
<header class="qs-admin-top">
    <a class="qs-admin-brand" href="<?= $base ?>/app"><img src="<?= qs_asset('assets/img/logo-white.png') ?>" alt="Quosheets" width="138" height="24"><span>Admin</span></a>
    <nav class="qs-admin-links">
        <a href="<?= $base ?>/app"><?= qs_icon('table', 16) ?><span>Abrir o app</span></a>
        <a href="<?= $base ?>/"><?= qs_icon('house', 16) ?><span>Site</span></a>
        <button type="button" class="qs-admin-refresh" data-admin="refresh" title="Atualizar"><?= qs_icon('refresh-cw', 16) ?></button>
    </nav>
</header>
<main class="qs-admin" id="qsAdmin">
    <div class="qs-admin-loading"><?= qs_icon('loader-circle', 26, 'qs-spin') ?><span>Carregando painel…</span></div>
</main>
<script src="<?= qs_asset('assets/js/qs-icons.js') ?>"></script>
<script src="<?= qs_asset('assets/js/qs-core.js') ?>"></script>
<script src="<?= qs_asset('assets/js/qs-admin.js') ?>"></script>
</body>
</html>
