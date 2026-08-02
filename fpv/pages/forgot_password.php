<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Esqueci minha senha | FPV91</title>
<link rel="icon" type="image/png" href="/img/fpv_fav.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/fpv/assets/css/fpv_site.css?v=1">
</head>
<body class="fpv-site">
<div class="fpv-auth-shell">
    <div class="fpv-auth-card">
        <div class="fpv-auth-head">
            <img src="/img/fpv_fav.png" alt="FPV91">
            <h1>Esqueci minha senha</h1>
            <p>Informe seu e-mail cadastrado — ou, se nao lembrar qual e-mail usou, seu CPF. Enviaremos um link de redefinicao para o e-mail da sua conta.</p>
        </div>

        <div class="fpv-alert fpv-alert-error" id="formError" style="display:none;"></div>
        <div class="fpv-alert fpv-alert-success" id="formSuccess" style="display:none;"></div>

        <form id="forgotForm" novalidate>
            <div class="fpv-field">
                <label for="identifier">E-mail ou CPF</label>
                <input type="text" id="identifier" required>
            </div>
            <button type="submit" class="fpv-btn fpv-btn-navy fpv-btn-block" id="submitButton">Enviar link de redefinicao</button>
        </form>

        <p class="fpv-auth-foot"><a href="/fpv/login">Voltar para o login</a></p>
    </div>
</div>

<script>
(() => {
    const form = document.getElementById("forgotForm");
    const errorBox = document.getElementById("formError");
    const successBox = document.getElementById("formSuccess");
    const submitButton = document.getElementById("submitButton");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorBox.style.display = "none";
        successBox.style.display = "none";
        submitButton.disabled = true;
        submitButton.textContent = "Enviando...";

        const body = new URLSearchParams({ identifier: document.getElementById("identifier").value.trim() });

        try {
            const response = await fetch("/php/fpv/api.php?action=requestFpvPasswordReset", { method: "POST", body });
            const payload = await response.json();
            successBox.textContent = payload.message || "Se encontrarmos esse cadastro, enviamos um link.";
            successBox.style.display = "block";
            form.reset();
        } catch (error) {
            errorBox.textContent = "Nao foi possivel processar seu pedido agora. Tente novamente.";
            errorBox.style.display = "block";
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Enviar link de redefinicao";
        }
    });
})();
</script>
</body>
</html>
