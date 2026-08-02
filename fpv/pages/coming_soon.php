<?php
/** @var string $topic */
/** @var string $page */
$copy = $topic === 'cursos'
    ? ['icon' => '🎓', 'title' => 'Cursos chegando em breve', 'body' => 'Estamos preparando cursos completos de montagem, tuning e pilotagem FPV. Deixe seu e-mail que avisamos assim que abrirem as vagas.']
    : ['icon' => '🤝', 'title' => 'Comunidade chegando em breve', 'body' => 'Um espaco pra trocar ideia com outros pilotos, tirar duvida e mostrar seu build. Deixe seu e-mail que avisamos no lancamento.'];
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title><?= htmlspecialchars($copy['title']) ?> | FPV91</title>
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

<section class="fpv-page-hero" style="padding-bottom:0;"></section>

<div class="fpv-coming-soon" data-reveal data-reveal-group>
    <div class="fpv-coming-soon-icon" data-reveal-item><?= $copy['icon'] ?></div>
    <h2 data-reveal-item><?= htmlspecialchars($copy['title']) ?></h2>
    <p data-reveal-item><?= htmlspecialchars($copy['body']) ?></p>

    <div class="fpv-alert fpv-alert-success" id="formSuccess" style="display:none;"></div>

    <form id="interestForm" class="fpv-interest-form" data-reveal-item>
        <input type="email" id="interestEmail" placeholder="seu@email.com" required>
        <button type="submit" class="fpv-btn fpv-btn-navy">Avisar-me</button>
    </form>
</div>

<?php require __DIR__ . '/../partials/footer.php'; ?>

<script>
(() => {
    const form = document.getElementById("interestForm");
    const successBox = document.getElementById("formSuccess");
    const topic = <?= json_encode($topic) ?>;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = form.querySelector("button");
        button.disabled = true;

        try {
            const body = new URLSearchParams({ topic, email: document.getElementById("interestEmail").value.trim() });
            const response = await fetch("/php/fpv/api.php?action=addFpvInterestSignup", { method: "POST", body });
            const payload = await response.json();
            if (!payload.success) throw new Error(payload.message || "Erro ao salvar.");
            form.style.display = "none";
            successBox.textContent = "Prontinho! Avisamos voce assim que estiver no ar.";
            successBox.style.display = "block";
        } catch (error) {
            alert(error.message);
            button.disabled = false;
        }
    });
})();
</script>
</body>
</html>
