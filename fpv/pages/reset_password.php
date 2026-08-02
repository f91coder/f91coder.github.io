<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Redefinir senha | FPV91</title>
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
            <h1>Escolha uma nova senha</h1>
            <p>Crie uma senha nova para sua conta.</p>
        </div>

        <div class="fpv-alert fpv-alert-error" id="formError" style="display:none;"></div>

        <form id="resetForm" novalidate>
            <div class="fpv-field">
                <label for="password">Nova senha</label>
                <input type="password" id="password" required minlength="8">
                <div class="fpv-field-hint">Minimo 8 caracteres</div>
            </div>
            <div class="fpv-field">
                <label for="passwordConfirm">Confirme a nova senha</label>
                <input type="password" id="passwordConfirm" required minlength="8">
            </div>
            <button type="submit" class="fpv-btn fpv-btn-navy fpv-btn-block" id="submitButton">Redefinir senha</button>
        </form>
    </div>
</div>

<script>
(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    const form = document.getElementById("resetForm");
    const errorBox = document.getElementById("formError");
    const submitButton = document.getElementById("submitButton");

    if (!token) {
        errorBox.textContent = "Link invalido. Peca um novo link de redefinicao.";
        errorBox.style.display = "block";
        form.querySelectorAll("input, button").forEach((el) => el.disabled = true);
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorBox.style.display = "none";

        const password = document.getElementById("password").value;
        const passwordConfirm = document.getElementById("passwordConfirm").value;
        if (password !== passwordConfirm) {
            errorBox.textContent = "As senhas nao coincidem.";
            errorBox.style.display = "block";
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Salvando...";

        try {
            const body = new URLSearchParams({ token, password });
            const response = await fetch("/php/fpv/api.php?action=resetFpvPassword", { method: "POST", body });
            const payload = await response.json();
            if (!payload.success) {
                throw new Error(payload.message || "Nao foi possivel redefinir sua senha.");
            }
            window.location.href = "/fpv/login";
        } catch (error) {
            errorBox.textContent = error.message;
            errorBox.style.display = "block";
            submitButton.disabled = false;
            submitButton.textContent = "Redefinir senha";
        }
    });
})();
</script>
</body>
</html>
