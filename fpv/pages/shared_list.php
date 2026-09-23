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
$usedCategories = [];
$uncategorizedCount = 0;
foreach ($items as $item) {
    if ($item['category_id'] !== null && isset($categoriesById[$item['category_id']])) {
        $usedCategories[$item['category_id']] = ($usedCategories[$item['category_id']] ?? 0) + 1;
    } else {
        $uncategorizedCount++;
    }
}
$pendingCount = $itemCount - $purchased;
$showCategoryFilter = count($usedCategories) > 1 || (count($usedCategories) === 1 && $uncategorizedCount > 0);
$showStatusFilter = $purchased > 0 && $pendingCount > 0;
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
<script>
    (function () {
        var theme = null;
        try { theme = localStorage.getItem('f91_fpv_theme'); } catch (e) {}
        if (theme !== 'dark' && theme !== 'light') {
            theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', theme);
    })();
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==" crossorigin="anonymous" referrerpolicy="no-referrer">
<link rel="stylesheet" href="/<?= fpv_asset_v('fpv/assets/css/fpv_share.css') ?>">
</head>
<body class="share-page">

<header class="sh-header">
    <div class="sh-wrap sh-header-inner">
        <a href="/fpv" class="sh-logo" aria-label="FPV91">
            <img src="/<?= fpv_asset_v('img/fpv_logo.png') ?>" alt="FPV91" class="logo-light">
            <img src="/<?= fpv_asset_v('img/fpv_logo_.png') ?>" alt="FPV91" class="logo-dark">
        </a>
        <div class="sh-header-actions">
            <button type="button" class="sh-theme" id="shThemeToggle" aria-label="Alternar entre modo claro e escuro" title="Alternar tema">
                <svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
                <svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            </button>
            <a href="/fpv/cadastro" class="sh-cta">Criar minha lista</a>
        </div>
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

        <?php if ($showCategoryFilter || $showStatusFilter): ?>
            <div class="sh-filterbar" id="shFilters">
                <?php if ($showCategoryFilter): ?>
                    <div class="sh-filter-field">
                        <span class="sh-filter-label" id="shCategoryLabel">Categoria</span>
                        <div class="sh-multi" id="shFilterCategory" data-total="<?= $itemCount ?>">
                            <button type="button" class="sh-multi-btn" id="shCategoryBtn" aria-haspopup="true" aria-expanded="false" aria-controls="shCategoryPanel" aria-labelledby="shCategoryLabel shCategoryValue">
                                <span class="sh-multi-value" id="shCategoryValue">Todas (<?= $itemCount ?>)</span>
                            </button>
                            <div class="sh-multi-panel" id="shCategoryPanel" role="group" aria-labelledby="shCategoryLabel" hidden>
                                <?php foreach ($usedCategories as $categoryId => $count): ?>
                                    <label class="sh-check">
                                        <input type="checkbox" value="<?= (int) $categoryId ?>" data-label="<?= $e($categoriesById[$categoryId]['name']) ?>">
                                        <span class="sh-check-name"><span class="sh-cat" data-tone="<?= $e($toneOf($categoriesById[$categoryId])) ?>"><?= $e($categoriesById[$categoryId]['name']) ?></span></span>
                                        <span class="sh-check-count"><?= $count ?></span>
                                    </label>
                                <?php endforeach; ?>
                                <?php if ($uncategorizedCount > 0 && count($usedCategories) > 0): ?>
                                    <label class="sh-check">
                                        <input type="checkbox" value="none" data-label="Sem categoria">
                                        <span class="sh-check-name">Sem categoria</span>
                                        <span class="sh-check-count"><?= $uncategorizedCount ?></span>
                                    </label>
                                <?php endif; ?>
                                <button type="button" class="sh-multi-clear" id="shCategoryClear">Limpar seleção</button>
                            </div>
                        </div>
                    </div>
                <?php endif; ?>
                <?php if ($showStatusFilter): ?>
                    <label class="sh-filter-field">
                        <span class="sh-filter-label">Situação</span>
                        <span class="sh-select">
                            <select id="shFilterStatus" aria-label="Filtrar por situação">
                                <option value="all">Todos (<?= $itemCount ?>)</option>
                                <option value="pending">A comprar (<?= $pendingCount ?>)</option>
                                <option value="bought">Comprados (<?= $purchased ?>)</option>
                            </select>
                        </span>
                    </label>
                <?php endif; ?>
                <p class="sh-filter-count" id="shFilterCount" aria-live="polite" hidden></p>
            </div>
        <?php endif; ?>
    </section>

    <?php if ($itemCount === 0): ?>
        <div class="sh-empty">Esta lista ainda não tem itens. Volte em breve!</div>
    <?php else: ?>

        <section class="sh-list" id="shItems" aria-label="Itens da lista">
            <?php foreach ($items as $item):
                $category = $item['category_id'] !== null ? ($categoriesById[$item['category_id']] ?? null) : null;
                $hasPrice = $showPrices && $item['price'] !== null && (float) $item['price'] > 0;
                $hasStore = $item['store_url'] !== '';
            ?>
                <article class="sh-card<?= $item['is_purchased'] ? ' is-bought' : '' ?>" data-uuid="<?= $e($item['uuid']) ?>" data-category="<?= $item['category_id'] !== null && isset($categoriesById[$item['category_id']]) ? (int) $item['category_id'] : 'none' ?>" data-status="<?= $item['is_purchased'] ? 'bought' : 'pending' ?>" data-name="<?= $e($item['name']) ?>">
                    <div class="sh-row">
                        <?php if ($item['image_path'] !== ''): ?>
                            <button type="button" class="sh-photo" data-full="/<?= $e($item['image_path']) ?>" data-caption="<?= $e($item['name']) ?>" aria-label="Ampliar foto de <?= $e($item['name']) ?>">
                                <img src="/<?= $e($item['image_path']) ?>" alt="<?= $e($item['name']) ?>" loading="lazy">
                            </button>
                        <?php else: ?>
                            <div class="sh-photo is-empty" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 8l8 8M16 8l-8 8"/><rect x="10" y="10" width="4" height="4" rx="1"/></svg>
                            </div>
                        <?php endif; ?>

                        <div class="sh-info">
                            <div class="sh-meta">
                                <?php if ($category): ?>
                                    <span class="sh-cat" data-tone="<?= $e($toneOf($category)) ?>"><?= $e($category['name']) ?></span>
                                <?php endif; ?>
                                <span class="sh-status<?= $item['is_purchased'] ? ' is-bought' : '' ?>"><?= $item['is_purchased'] ? '✓ Já comprei' : 'Ainda vou comprar' ?></span>
                            </div>
                            <h2 class="sh-name"><?= $e($item['name']) ?></h2>
                        </div>

                        <?php if ($hasPrice || $hasStore): ?>
                            <div class="sh-side">
                                <?php if ($hasPrice): ?>
                                    <p class="sh-price"><?= $e($formatBrl((float) $item['price'])) ?></p>
                                <?php endif; ?>
                                <?php if ($hasStore): ?>
                                    <a class="sh-store" href="<?= $e($item['store_url']) ?>" target="_blank" rel="noopener noreferrer nofollow">Ver na loja ↗</a>
                                <?php endif; ?>
                            </div>
                        <?php endif; ?>
                    </div>

                    <?php if ($allowFeedback): ?>
                        <div class="sh-react" role="group" aria-label="Sua opinião sobre <?= $e($item['name']) ?>">
                            <button type="button" class="is-icon is-like" data-reaction="like" aria-label="Curti" title="Curti"><i class="fa-regular fa-thumbs-up" aria-hidden="true"></i></button>
                            <button type="button" class="is-icon is-dislike" data-reaction="dislike" aria-label="Não curti" title="Não curti"><i class="fa-regular fa-thumbs-down" aria-hidden="true"></i></button>
                            <button type="button" class="is-doubt" data-reaction="doubt"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Sei não!</button>
                            <button type="button" class="is-comment" data-reaction="comment"><i class="fa-regular fa-comment" aria-hidden="true"></i> Comentar</button>
                        </div>
                        <p class="sh-fb-done" hidden></p>
                    <?php endif; ?>
                </article>
            <?php endforeach; ?>
        </section>
        <div class="sh-empty" id="shNoResults" hidden>
            Nenhum item com esses filtros.
            <button type="button" class="sh-linkbtn" id="shClearFilters">Limpar filtros</button>
        </div>

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
