<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Redefinir senha | FPV91</title>
<link rel="icon" type="image/png" href="/<?= fpv_asset_v('img/fpv_fav.png') ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/fpv/assets/css/fpv_site.css?v=1">
</head>
<body class="fpv-site">
<div class="fpv-auth-shell">
    <div class="fpv-auth-card">
        <div class="fpv-auth-head">
            <img src="/<?= fpv_asset_v('img/fpv_fav.png') ?>" alt="FPV91">
            <h1>Escolha uma nova senha</h1>
            <p>Crie uma senha nova para sua conta.</p>
        </div>

        <div class="fpv-alert fpv-alert-error" id="formError" style="display:none;"></div>

        <form id="resetForm" novalidate>
            <div class="fpv-field">
                <label for="password">Nova senha</label>
                <div class="fpv-password-wrap">
                    <input type="password" id="password" required minlength="8">
                    <button type="button" class="fpv-password-toggle" data-toggle-password="password" aria-label="Mostrar senha">
                        <svg class="icon-eye" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/>
                        </svg>
                        <svg class="icon-eye-off" style="display:none" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 3L21 21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                            <path d="M10.6 5.1C11.05 5.03 11.52 5 12 5C18.5 5 22 12 22 12C21.6 12.8 20.8 14 19.6 15.2M6.6 6.6C4 8.3 2 12 2 12C2 12 5.5 19 12 19C13.7 19 15.1 18.6 16.3 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M9.9 10C9.3 10.6 9 11.3 9 12C9 13.7 10.3 15 12 15C12.7 15 13.4 14.7 14 14.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
                <div class="fpv-field-hint">Minimo 8 caracteres</div>
            </div>
            <div class="fpv-field">
                <label for="passwordConfirm">Confirme a nova senha</label>
                <div class="fpv-password-wrap">
                    <input type="password" id="passwordConfirm" required minlength="8">
                    <button type="button" class="fpv-password-toggle" data-toggle-password="passwordConfirm" aria-label="Mostrar senha">
                        <svg class="icon-eye" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/>
                        </svg>
                        <svg class="icon-eye-off" style="display:none" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 3L21 21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                            <path d="M10.6 5.1C11.05 5.03 11.52 5 12 5C18.5 5 22 12 22 12C21.6 12.8 20.8 14 19.6 15.2M6.6 6.6C4 8.3 2 12 2 12C2 12 5.5 19 12 19C13.7 19 15.1 18.6 16.3 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M9.9 10C9.3 10.6 9 11.3 9 12C9 13.7 10.3 15 12 15C12.7 15 13.4 14.7 14 14.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            <button type="submit" class="fpv-btn fpv-btn-navy fpv-btn-block" id="submitButton">Redefinir senha</button>
        </form>
    </div>
</div>

<script src="/fpv/assets/js/fpv_masks.js"></script>
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
