<?php
/**
 * Landing do FPV91.
 *
 * FPV_HOME_HERO_ONLY = true: so o hero (video de fundo com revelacao no cursor). Rolagem, links do menu
 * e rodape ficam desligados ate o conteudo (blog, tutoriais, comunidade, cursos) estar pronto.
 * Para reativar a pagina completa, troque para false: o conteudo abaixo volta sem mais nenhuma alteracao.
 */
const FPV_HOME_HERO_ONLY = true;

$recentPosts = FPV_HOME_HERO_ONLY ? [] : list_fpv_posts('blog', 3);
$recentTutorials = FPV_HOME_HERO_ONLY ? [] : list_fpv_posts('tutorial', 3);
$heroVideo = '/' . fpv_asset_v('img/fpv_drone_hero_background.mp4');
$pageClass = FPV_HOME_HERO_ONLY ? ' fpv-hero-only' : '';
?>
<!doctype html>
<html lang="pt-BR" class="<?= trim($pageClass) ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FPV91 — Monte seu drone FPV do zero</title>
<meta name="description" content="Conteudo, tutoriais e ferramentas para quem quer montar o proprio drone FPV do zero.">
<link rel="icon" type="image/png" href="/<?= fpv_asset_v('img/fpv_fav.png') ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/fpv/assets/css/fpv_site.css?v=1">
<link rel="stylesheet" href="/<?= fpv_asset_v('fpv/assets/css/fpv_hero.css') ?>">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<style>
    .fpv-value-grid{ display:grid; grid-template-columns:repeat(3, 1fr); gap:24px; margin-top:8px; }
    .fpv-value-card{ background:var(--surface); border-radius:var(--radius-md); padding:28px; border:1px solid var(--border); }
    .fpv-value-card .fpv-value-icon{ width:44px; height:44px; border-radius:12px; background:var(--surface-2); display:flex; align-items:center; justify-content:center; font-size:20px; margin-bottom:16px; }
    .fpv-value-card h3{ font-size:16px; margin:0 0 8px; letter-spacing:-.01em; }
    .fpv-value-card p{ font-size:13.5px; color:var(--muted); margin:0; line-height:1.6; }
    @media (max-width:760px){ .fpv-value-grid{ grid-template-columns:1fr; } }

    .fpv-section-head{ display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:28px; gap:16px; flex-wrap:wrap; }
    .fpv-section-head h2{ font-size:28px; font-weight:800; letter-spacing:-.02em; margin:0; }
    .fpv-section-head a{ font-size:13.5px; font-weight:700; color:var(--navy); }

    .fpv-cta-band{ background:var(--navy); color:#fff; border-radius:var(--radius-lg); padding:56px 48px; display:flex; align-items:center; justify-content:space-between; gap:24px; flex-wrap:wrap; }
    .fpv-cta-band h2{ font-size:28px; margin:0 0 8px; letter-spacing:-.02em; }
    .fpv-cta-band p{ margin:0; color:rgba(255,255,255,.68); font-size:14.5px; }
</style>
</head>
<body class="fpv-site<?= $pageClass ?>">
<?php require __DIR__ . '/../partials/header.php'; ?>

<section class="fpv-hero" id="fpvHero" aria-labelledby="fpvHeroTitle">
    <div class="fpv-cinema" id="fpvCinema" aria-hidden="true">
        <video class="fpv-cinema-video" autoplay muted loop playsinline preload="auto" disablepictureinpicture>
            <source src="<?= htmlspecialchars($heroVideo) ?>" type="video/mp4">
        </video>
        <div class="fpv-cinema-scrim"></div>
        <div class="fpv-cinema-veil"></div>

        <div class="fpv-lens" id="fpvLens">
            <div class="fpv-lens-ring"></div>
            <div class="fpv-horizon" id="fpvHorizon"></div>
            <div class="fpv-reticle">
                <div class="fpv-reticle-brackets">
                    <span class="tl"></span><span class="tr"></span><span class="bl"></span><span class="br"></span>
                </div>
                <span class="fpv-reticle-dot"></span>
            </div>
            <div class="fpv-lens-readout"><span id="fpvSpeed">0</span> km/h</div>
        </div>

        <div class="fpv-osd fpv-osd-tl"><span class="fpv-rec"></span>REC <span id="fpvTimer">00:00</span></div>
        <div class="fpv-osd fpv-osd-tr"><span class="fpv-batt"><i></i></span>16.8 V</div>
        <div class="fpv-osd fpv-osd-bl">Acro · CH R2 · 5.8 GHz</div>
        <div class="fpv-osd fpv-osd-br">FPV91</div>
        <div class="fpv-scanlines"></div>
    </div>

    <div class="fpv-hero-inner">
        <span class="fpv-eyebrow">FPV91 by F91</span>
        <h1 id="fpvHeroTitle">Como iniciar no <span class="fpv-hero-highlight">Drone FPV</span> da melhor forma.</h1>
        <p>Em breve, tutoriais de montagem DIY, comunidade de pilotos, cursos e e-books gratuitos e um planner de verdade para organizar o orçamento do seu próximo setup.</p>
        <div class="fpv-hero-actions">
            <a href="/fpv/cadastro" class="fpv-btn fpv-btn-lime">Criar minha conta grátis</a>
        </div>
    </div>
</section>

<?php if (!FPV_HOME_HERO_ONLY): ?>
<section class="fpv-section">
    <div class="fpv-container">
        <div class="fpv-value-grid" data-reveal data-reveal-group>
            <div class="fpv-value-card" data-reveal-item>
                <div class="fpv-value-icon">🛠️</div>
                <h3>Tutoriais DIY</h3>
                <p>Passo a passo de montagem, configuracao de FC/ESC, betaflight e tuning — do zero ao primeiro voo.</p>
            </div>
            <div class="fpv-value-card" data-reveal-item>
                <div class="fpv-value-icon">🧭</div>
                <h3>Planner de setup</h3>
                <p>Organize as pecas do seu build, acompanhe o orcamento e a meta de economia ate a compra.</p>
            </div>
            <div class="fpv-value-card" data-reveal-item>
                <div class="fpv-value-icon">🤝</div>
                <h3>Comunidade</h3>
                <p>Pilotos trocando experiencia, indicando pecas e ajudando uns aos outros a voar melhor.</p>
            </div>
        </div>
    </div>
</section>

<?php if ($recentTutorials): ?>
<section class="fpv-section">
    <div class="fpv-container">
        <div class="fpv-section-head" data-reveal>
            <h2>Tutoriais recentes</h2>
            <a href="/fpv/tutoriais">Ver todos &rarr;</a>
        </div>
        <div class="fpv-grid-cards" data-reveal data-reveal-group>
            <?php foreach ($recentTutorials as $post): ?>
                <?php require __DIR__ . '/../partials/post_card.php'; ?>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<?php if ($recentPosts): ?>
<section class="fpv-section">
    <div class="fpv-container">
        <div class="fpv-section-head" data-reveal>
            <h2>Do blog</h2>
            <a href="/fpv/blog">Ver todos &rarr;</a>
        </div>
        <div class="fpv-grid-cards" data-reveal data-reveal-group>
            <?php foreach ($recentPosts as $post): ?>
                <?php require __DIR__ . '/../partials/post_card.php'; ?>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<section class="fpv-section">
    <div class="fpv-container">
        <div class="fpv-cta-band" data-reveal>
            <div>
                <h2>Pronto pra planejar seu proximo build?</h2>
                <p>Cadastre-se gratis e comece a organizar seu setup agora.</p>
            </div>
            <a href="/fpv/cadastro" class="fpv-btn fpv-btn-lime">Criar minha conta</a>
        </div>
    </div>
</section>

<?php require __DIR__ . '/../partials/footer.php'; ?>
<?php else: ?>
<script src="/fpv/assets/js/fpv_site.js"></script>
<?php endif; ?>

<script src="/<?= fpv_asset_v('fpv/assets/js/fpv_hero.js') ?>"></script>
</body>
</html>
