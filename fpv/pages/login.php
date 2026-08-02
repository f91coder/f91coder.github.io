<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Entrar | FPV91</title>
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
            <h1>Bem-vindo de volta</h1>
            <p>Entre para acessar seu planner de setup FPV.</p>
        </div>

        <div class="fpv-alert fpv-alert-error" id="formError" style="display:none;"></div>

        <form id="loginForm" novalidate>
            <div class="fpv-field">
                <label for="email">E-mail</label>
                <input type="email" id="email" required>
            </div>
            <div class="fpv-field">
                <label for="password">Senha</label>
                <input type="password" id="password" required>
            </div>
            <button type="submit" class="fpv-btn fpv-btn-navy fpv-btn-block" id="submitButton">Entrar</button>
        </form>

        <p class="fpv-auth-foot"><a href="/fpv/esqueci-senha">Esqueci minha senha</a></p>
        <p class="fpv-auth-foot">Ainda nao tem conta? <a href="/fpv/cadastro">Criar conta</a></p>
    </div>
</div>

<script>
(() => {
    const form = document.getElementById("loginForm");
    const errorBox = document.getElementById("formError");
    const submitButton = document.getElementById("submitButton");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorBox.style.display = "none";
        submitButton.disabled = true;
        submitButton.textContent = "Entrando...";

        const body = new URLSearchParams({
            email: document.getElementById("email").value.trim(),
            password: document.getElementById("password").value,
        });

        try {
            const response = await fetch("/php/fpv/api.php?action=loginFpv", { method: "POST", body });
            const payload = await response.json();
            if (!payload.success) {
                if (payload.needs_verification) {
                    window.location.href = "/fpv/verificar?email=" + encodeURIComponent(payload.email);
                    return;
                }
                throw new Error(payload.message || "Nao foi possivel entrar.");
            }
            window.location.href = "/fpv/planner";
        } catch (error) {
            errorBox.textContent = error.message;
            errorBox.style.display = "block";
            submitButton.disabled = false;
            submitButton.textContent = "Entrar";
        }
    });
})();
</script>
</body>
</html>
