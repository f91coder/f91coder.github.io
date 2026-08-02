<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Criar conta | FPV91</title>
<link rel="icon" type="image/png" href="/img/fpv_fav.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/fpv/assets/css/fpv_site.css?v=1">
</head>
<body class="fpv-site">
<div class="fpv-auth-shell">
    <div class="fpv-auth-card is-wide">
        <div class="fpv-auth-head">
            <img src="/img/fpv_fav.png" alt="FPV91">
            <h1>Criar sua conta</h1>
            <p>Monte seu setup, acompanhe seu orcamento e faca parte da comunidade FPV91.</p>
        </div>

        <div class="fpv-alert fpv-alert-error" id="formError" style="display:none;"></div>

        <form id="registerForm" novalidate>
            <div class="fpv-avatar-picker">
                <label class="fpv-avatar-preview" id="avatarPreviewWrap">
                    <span id="avatarPlaceholder">Foto</span>
                    <input type="file" id="avatar" accept="image/*" style="display:none;" required>
                </label>
                <div>
                    <div style="font-size:13px;font-weight:700;color:var(--navy);">Foto de perfil</div>
                    <div class="fpv-field-hint">Clique no circulo para escolher uma foto</div>
                </div>
            </div>

            <div class="fpv-field">
                <label for="name">Nome completo</label>
                <input type="text" id="name" required>
            </div>

            <div class="fpv-field-row">
                <div class="fpv-field">
                    <label for="email">E-mail</label>
                    <input type="email" id="email" required>
                </div>
                <div class="fpv-field">
                    <label for="phone">WhatsApp (com DDD)</label>
                    <input type="tel" id="phone" placeholder="(11) 91234-5678" required>
                </div>
            </div>

            <div class="fpv-field-row">
                <div class="fpv-field">
                    <label for="cpf">CPF</label>
                    <input type="text" id="cpf" placeholder="000.000.000-00" required>
                </div>
                <div class="fpv-field">
                    <label for="password">Senha</label>
                    <input type="password" id="password" required minlength="8">
                    <div class="fpv-field-hint">Minimo 8 caracteres</div>
                </div>
            </div>

            <button type="submit" class="fpv-btn fpv-btn-navy fpv-btn-block" id="submitButton">Criar conta</button>
        </form>

        <p class="fpv-auth-foot">Ja tem conta? <a href="/fpv/login">Entrar</a></p>
    </div>
</div>

<script>
(() => {
    const form = document.getElementById("registerForm");
    const avatarInput = document.getElementById("avatar");
    const avatarWrap = document.getElementById("avatarPreviewWrap");
    const avatarPlaceholder = document.getElementById("avatarPlaceholder");
    const errorBox = document.getElementById("formError");
    const submitButton = document.getElementById("submitButton");

    avatarInput.addEventListener("change", () => {
        const file = avatarInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            avatarPlaceholder.remove();
            let img = avatarWrap.querySelector("img");
            if (!img) {
                img = document.createElement("img");
                avatarWrap.prepend(img);
            }
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorBox.style.display = "none";
        submitButton.disabled = true;
        submitButton.textContent = "Criando conta...";

        const formData = new FormData();
        formData.append("name", document.getElementById("name").value.trim());
        formData.append("email", document.getElementById("email").value.trim());
        formData.append("phone", document.getElementById("phone").value.trim());
        formData.append("cpf", document.getElementById("cpf").value.trim());
        formData.append("password", document.getElementById("password").value);
        if (avatarInput.files[0]) {
            formData.append("avatar", avatarInput.files[0]);
        }

        try {
            const response = await fetch("/php/fpv/api.php?action=registerFpvUser", { method: "POST", body: formData });
            const payload = await response.json();
            if (!payload.success) {
                throw new Error(payload.message || "Erro ao criar conta.");
            }
            window.location.href = "/fpv/verificar?email=" + encodeURIComponent(payload.email);
        } catch (error) {
            errorBox.textContent = error.message;
            errorBox.style.display = "block";
            submitButton.disabled = false;
            submitButton.textContent = "Criar conta";
        }
    });
})();
</script>
</body>
</html>
