<?php
/**
 * Pagina publica da lista compartilhada (/fpv/lista/<token>).
 * @var array $sharedList  carregado por fpv_public_share_load() no router
 * @var array|null $currentUser
 */

$e = static fn($value): string => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
$formatBrl = static fn(float $value): string => 'R$ ' . number_format($value, 2, ',', '.');

$ownerName = $sharedList['owner_name'];
$pageTitle = $sharedList['title'] !== '' ? $sharedList['title'] : 'Lista de compras FPV de ' . $ownerName;
$items = $sharedList['items'];
$itemCount = count($items);
$purchased = (int) $sharedList['purchased_count'];
$purchasedPct = $itemCount > 0 ? (int) round(($purchased / $itemCount) * 100) : 0;
$showPrices = $sharedList['show_prices'];
$allowFeedback = $sharedList['allow_feedback'];

$categoriesById = [];
foreach ($sharedList['categories'] as $category) {
    $categoriesById[$category['id']] = $category;
}
$toneOf = static function (?array $category): string {
    if ($category && preg_match('/bg-([a-z]+)-\d{2,3}/', (string) $category['color_class'], $m)) {
        return $m[1];
    }
    return 'gray';
};

$scheme = fpv_is_https_request() ? 'https' : 'http';
$origin = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'www.f91.tech');
$ogImage = $origin . '/' . fpv_asset_v('img/fpv_fav.png');
foreach ($items as $item) {
    if ($item['image_path'] !== '') {
        $ogImage = $origin . '/' . ltrim($item['image_path'], '/');
        break;
    }
}
$ogDescription = $itemCount . ($itemCount === 1 ? ' item' : ' itens') . ' — veja a lista, visite as lojas e deixe sua opinião.';

$config = [
    'token' => $sharedList['token'],
    'apiUrl' => '/php/fpv/api.php',
    'allowFeedback' => $allowFeedback,
];
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title><?= $e($pageTitle) ?> | FPV91</title>
<meta name="robots" content="noindex,nofollow">
<meta name="description" content="<?= $e($ogDescription) ?>">
<meta property="og:type" content="website">
<meta property="og:title" content="<?= $e($pageTitle) ?>">
<meta property="og:description" content="<?= $e($ogDescription) ?>">
<meta property="og:image" content="<?= $e($ogImage) ?>">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/<?= fpv_asset_v('img/fpv_fav.png') ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/<?= fpv_asset_v('fpv/assets/css/fpv_share.css') ?>">
</head>
<body class="share-page">

<header class="sh-header">
    <div class="sh-wrap sh-header-inner">
        <a href="/fpv" class="sh-logo" aria-label="FPV91">
            <img src="/<?= fpv_asset_v('img/fpv_logo.png') ?>" alt="FPV91" class="logo-light">
            <img src="/<?= fpv_asset_v('img/fpv_logo_.png') ?>" alt="FPV91" class="logo-dark">
        </a>
        <a href="/fpv/cadastro" class="sh-cta">Criar minha lista</a>
    </div>
</header>

<main class="sh-wrap">

    <section class="sh-hero">
        <div class="sh-hero-top">
            <?php if ($sharedList['owner_avatar'] !== ''): ?>
                <img class="sh-avatar" src="/<?= $e($sharedList['owner_avatar']) ?>" alt="" onerror="this.outerHTML='<span class=&quot;sh-avatar&quot;><?= $e(mb_strtoupper(mb_substr($ownerName, 0, 1))) ?></span>';">
            <?php else: ?>
                <span class="sh-avatar"><?= $e(mb_strtoupper(mb_substr($ownerName, 0, 1))) ?></span>
            <?php endif; ?>
            <div>
                <p class="sh-eyebrow">Lista de compras FPV</p>
                <h1><?= $e($pageTitle) ?></h1>
            </div>
        </div>

        <?php if ($sharedList['message'] !== ''): ?>
            <p class="sh-message"><?= $e($sharedList['message']) ?></p>
        <?php endif; ?>

        <div class="sh-stats">
            <span class="sh-chip"><strong><?= $itemCount ?></strong> <?= $itemCount === 1 ? 'item' : 'itens' ?></span>
            <?php if ($showPrices && $sharedList['total'] !== null): ?>
                <span class="sh-chip">Total <strong><?= $e($formatBrl((float) $sharedList['total'])) ?></strong></span>
            <?php endif; ?>
            <span class="sh-chip"><strong><?= $purchased ?></strong> já <?= $purchased === 1 ? 'comprado' : 'comprados' ?></span>
        </div>

        <?php if ($itemCount > 0): ?>
            <div class="sh-progress">
                <div class="sh-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="<?= $purchasedPct ?>">
                    <div class="sh-progress-bar" style="width:<?= $purchasedPct ?>%"></div>
                </div>
                <p class="sh-progress-label"><?= $purchasedPct ?>% do setup já foi comprado</p>
            </div>
        <?php endif; ?>
    </section>

    <?php if ($itemCount === 0): ?>
        <div class="sh-empty">Esta lista ainda não tem itens. Volte em breve!</div>
    <?php else: ?>

        <?php
        $usedCategories = [];
        foreach ($items as $item) {
            if ($item['category_id'] !== null && isset($categoriesById[$item['category_id']])) {
                $usedCategories[$item['category_id']] = ($usedCategories[$item['category_id']] ?? 0) + 1;
            }
        }
        ?>
        <?php if (count($usedCategories) > 1): ?>
            <nav class="sh-filters" aria-label="Filtrar por categoria">
                <button type="button" class="sh-filter" data-filter="all" aria-pressed="true">Todos (<?= $itemCount ?>)</button>
                <?php foreach ($usedCategories as $categoryId => $count): ?>
                    <button type="button" class="sh-filter" data-filter="<?= (int) $categoryId ?>" aria-pressed="false"><?= $e($categoriesById[$categoryId]['name']) ?> (<?= $count ?>)</button>
                <?php endforeach; ?>
            </nav>
        <?php endif; ?>

        <section class="sh-grid" id="shItems">
            <?php foreach ($items as $item):
                $category = $item['category_id'] !== null ? ($categoriesById[$item['category_id']] ?? null) : null;
            ?>
                <article class="sh-card" data-uuid="<?= $e($item['uuid']) ?>" data-category="<?= $item['category_id'] !== null ? (int) $item['category_id'] : '' ?>" data-name="<?= $e($item['name']) ?>">
                    <?php if ($item['image_path'] !== ''): ?>
                        <button type="button" class="sh-photo" data-full="/<?= $e($item['image_path']) ?>" data-caption="<?= $e($item['name']) ?>" aria-label="Ampliar foto de <?= $e($item['name']) ?>">
                            <img src="/<?= $e($item['image_path']) ?>" alt="<?= $e($item['name']) ?>" loading="lazy">
                        </button>
                    <?php else: ?>
                        <div class="sh-photo is-empty" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 8l8 8M16 8l-8 8"/><rect x="10" y="10" width="4" height="4" rx="1"/></svg>
                        </div>
                    <?php endif; ?>

                    <div class="sh-card-body">
                        <div class="sh-card-top">
                            <?php if ($category): ?>
                                <span class="sh-cat" data-tone="<?= $e($toneOf($category)) ?>"><?= $e($category['name']) ?></span>
                            <?php else: ?>
                                <span></span>
                            <?php endif; ?>
                            <span class="sh-status<?= $item['is_purchased'] ? ' is-bought' : '' ?>"><?= $item['is_purchased'] ? 'Já comprei' : 'Ainda vou comprar' ?></span>
                        </div>

                        <h2 class="sh-name"><?= $e($item['name']) ?></h2>

                        <?php if ($showPrices && $item['price'] !== null): ?>
                            <p class="sh-price"><?= $e($formatBrl((float) $item['price'])) ?></p>
                        <?php endif; ?>

                        <?php if ($item['store_url'] !== ''): ?>
                            <a class="sh-store" href="<?= $e($item['store_url']) ?>" target="_blank" rel="noopener noreferrer nofollow">Ver na loja ↗</a>
                        <?php endif; ?>

                        <?php if ($allowFeedback): ?>
                            <div class="sh-react" role="group" aria-label="Sua opinião sobre <?= $e($item['name']) ?>">
                                <button type="button" data-reaction="like"><span class="emoji">👍</span> Curti</button>
                                <button type="button" data-reaction="doubt"><span class="emoji">🤔</span> Tenho dúvidas</button>
                                <button type="button" data-reaction="dislike"><span class="emoji">👎</span> Não curti</button>
                                <button type="button" data-reaction="comment"><span class="emoji">💬</span> Comentar</button>
                            </div>
                            <p class="sh-fb-done" hidden></p>
                        <?php endif; ?>
                    </div>
                </article>
            <?php endforeach; ?>
        </section>

    <?php endif; ?>

    <?php if ($allowFeedback): ?>
        <section class="sh-general" id="shGeneral">
            <h2>Sua opinião sobre o setup todo</h2>
            <p class="lead">Faltou algum item? Tem uma sugestão de peça melhor? Conta aí para <?= $e($ownerName) ?>.</p>
            <form class="sh-general-form" novalidate>
                <input type="text" class="sh-field" name="author_name" maxlength="60" placeholder="Seu nome (opcional)" autocomplete="name">
                <textarea class="sh-field" name="message" maxlength="600" rows="3" placeholder="Escreva sua sugestão ou opinião…" required></textarea>
                <div class="sh-hp" aria-hidden="true"><label>Site <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
                <p class="sh-fb-error" hidden></p>
                <div class="sh-fb-actions"><button type="submit" class="sh-btn">Enviar opinião</button></div>
            </form>
            <p class="sh-fb-done" hidden></p>
        </section>
    <?php endif; ?>

    <footer class="sh-footer">
        Feito com <a href="/fpv">FPV91</a> — <a href="/fpv/cadastro">crie a sua lista de compras FPV grátis</a>
    </footer>
</main>

<div class="sh-toast" id="shToast" role="status" aria-live="polite"></div>

<script>window.FPV_SHARE = <?= json_encode($config, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
<script src="/<?= fpv_asset_v('fpv/assets/js/fpv_share_public.js') ?>"></script>
</body>
</html>
