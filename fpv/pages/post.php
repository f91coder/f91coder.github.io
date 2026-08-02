<?php
/** @var array $post */
require_once __DIR__ . '/../../php/fpv/vendor/Parsedown.php';
$parsedown = new Parsedown();
$parsedown->setSafeMode(true);
$contentHtml = $parsedown->text($post['content_markdown']);
$typeLabel = $post['type'] === 'tutorial' ? 'Tutorial' : 'Blog';
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title><?= htmlspecialchars($post['title']) ?> | FPV91</title>
<meta name="description" content="<?= htmlspecialchars($post['excerpt']) ?>">
<link rel="icon" type="image/png" href="/img/fpv_fav.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/fpv/assets/css/fpv_site.css?v=1">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
</head>
<body class="fpv-site">
<?php require __DIR__ . '/../partials/header.php'; ?>

<section class="fpv-page-hero" style="padding-bottom:0;">
    <div class="fpv-container" style="max-width:720px;">
        <span class="fpv-eyebrow" data-reveal><?= htmlspecialchars($typeLabel) ?></span>
        <h1 data-reveal><?= htmlspecialchars($post['title']) ?></h1>
        <p data-reveal><?= htmlspecialchars($post['excerpt']) ?></p>
    </div>
</section>

<article class="fpv-section" style="padding-top:0;">
    <?php if ($post['cover_image_path']): ?>
        <img src="/<?= htmlspecialchars($post['cover_image_path']) ?>" alt="" class="fpv-post-cover" data-reveal>
    <?php endif; ?>
    <div class="fpv-post-article">
        <div class="fpv-post-article-content" data-reveal><?= $contentHtml ?></div>
    </div>
</article>

<?php require __DIR__ . '/../partials/footer.php'; ?>
</body>
</html>
