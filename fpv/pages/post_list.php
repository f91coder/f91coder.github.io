<?php
/** @var string $type */
/** @var string $page */
$posts = list_fpv_posts($type);
$pageTitle = $type === 'tutorial' ? 'Tutoriais' : 'Blog';
$pageDescription = $type === 'tutorial'
    ? 'Passo a passo de montagem, configuracao e tuning do seu drone FPV.'
    : 'Novidades, analises de pecas e historias da comunidade FPV91.';
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title><?= htmlspecialchars($pageTitle) ?> | FPV91</title>
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

<section class="fpv-page-hero">
    <div class="fpv-container">
        <span class="fpv-eyebrow" data-reveal>FPV91</span>
        <h1 data-reveal><?= htmlspecialchars($pageTitle) ?></h1>
        <p data-reveal><?= htmlspecialchars($pageDescription) ?></p>
    </div>
</section>

<section class="fpv-section">
    <div class="fpv-container">
        <?php if (!$posts): ?>
            <div class="fpv-empty-state">
                <p>Ainda nao publicamos nada por aqui. Volte em breve!</p>
            </div>
        <?php else: ?>
            <div class="fpv-grid-cards" data-reveal data-reveal-group>
                <?php foreach ($posts as $post): ?>
                    <?php require __DIR__ . '/../partials/post_card.php'; ?>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
</section>

<?php require __DIR__ . '/../partials/footer.php'; ?>
</body>
</html>
