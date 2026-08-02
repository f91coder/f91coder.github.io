<?php
$recentPosts = list_fpv_posts('blog', 3);
$recentTutorials = list_fpv_posts('tutorial', 3);
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FPV91 — Monte seu drone FPV do zero</title>
<meta name="description" content="Conteudo, tutoriais e ferramentas para quem quer montar o proprio drone FPV do zero.">
<link rel="icon" type="image/png" href="/img/fpv_fav.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/fpv/assets/css/fpv_site.css?v=1">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<style>
    .fpv-hero{
        min-height:100vh;
        display:flex;
        align-items:center;
        background:
            radial-gradient(900px 500px at 85% 10%, rgba(189,220,0,.12), transparent),
            linear-gradient(180deg, var(--navy) 0%, #0a1730 100%);
        color:#fff;
        position:relative;
        overflow:hidden;
    }
    .fpv-hero-inner{ max-width:var(--content-max); margin:0 auto; padding:120px 24px 80px; position:relative; z-index:2; }
    .fpv-hero h1{ font-size:clamp(38px, 6.5vw, 78px); font-weight:800; letter-spacing:-.03em; line-height:1.02; margin:18px 0 22px; max-width:820px; }
    .fpv-hero h1 .fpv-hero-highlight{ color:var(--lime); }
    .fpv-hero p{ font-size:17px; color:rgba(255,255,255,.68); max-width:520px; margin:0 0 34px; line-height:1.7; }
    .fpv-hero-actions{ display:flex; gap:14px; flex-wrap:wrap; }
    .fpv-hero-drone{ position:absolute; right:-6%; top:18%; width:46%; max-width:640px; opacity:.92; filter:drop-shadow(0 30px 60px rgba(0,0,0,.4)); }
    @media (max-width:900px){ .fpv-hero-drone{ display:none; } }

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
<body class="fpv-site">
<?php require __DIR__ . '/../partials/header.php'; ?>

<section class="fpv-hero">
    <img src="/img/fpv_logo.png" alt="" class="fpv-hero-drone">
    <div class="fpv-hero-inner">
        <span class="fpv-eyebrow" style="display:inline-block;padding:5px 14px;border-radius:999px;background:rgba(255,255,255,.1);color:var(--lime);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">FPV91 by F91</span>
        <h1>Monte seu <span class="fpv-hero-highlight">drone FPV</span> do zero, com quem entende do assunto.</h1>
        <p>Tutoriais de montagem DIY, comunidade de pilotos, cursos e um planner de verdade para organizar as pecas e o orcamento do seu proximo setup.</p>
        <div class="fpv-hero-actions">
            <a href="/fpv/cadastro" class="fpv-btn fpv-btn-lime">Criar minha conta</a>
            <a href="/fpv/tutoriais" class="fpv-btn fpv-btn-ghost-light">Ver tutoriais</a>
        </div>
    </div>
</section>

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
</body>
</html>
