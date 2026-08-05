<?php
/** @var array $currentUser */
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Meu perfil | FPV91</title>
<link rel="icon" type="image/png" href="/<?= fpv_asset_v('img/fpv_fav.png') ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/fpv/assets/css/fpv_site.css?v=1">
</head>
<body class="fpv-site">
<?php require __DIR__ . '/../partials/header.php'; ?>

<div class="fpv-auth-shell" style="min-height:auto;padding:150px 20px 80px;background:var(--bg);">
    <div class="fpv-auth-card">
        <div class="fpv-auth-head">
            <h1>Meu perfil</h1>
            <p>Atualize sua foto, nome e telefone.</p>
        </div>

        <div class="fpv-alert fpv-alert-error" id="formError" style="display:none;"></div>
        <div class="fpv-alert fpv-alert-success" id="formSuccess" style="display:none;"></div>

        <form id="profileForm" novalidate>
            <div class="fpv-avatar-picker">
                <label class="fpv-avatar-preview" id="avatarPreviewWrap">
                    <?php if (!empty($currentUser['avatar_path'])): ?>
                        <img src="/<?= htmlspecialchars($currentUser['avatar_path']) ?>" alt="" onerror="this.outerHTML='<span class=&quot;avatar-fallback&quot;><?= htmlspecialchars(mb_strtoupper(mb_substr($currentUser['name'], 0, 1))) ?></span>';">
                    <?php else: ?>
                        <span class="avatar-fallback"><?= htmlspecialchars(mb_strtoupper(mb_substr($currentUser['name'], 0, 1))) ?></span>
                    <?php endif; ?>
                    <input type="file" id="avatar" accept="image/*" style="display:none;">
                </label>
                <div>
                    <div style="font-size:13px;font-weight:700;color:var(--navy);">Foto de perfil</div>
                    <div class="fpv-field-hint">Clique para trocar a foto</div>
                </div>
            </div>

            <div class="fpv-field">
                <label for="name">Nome completo</label>
                <input type="text" id="name" value="<?= htmlspecialchars($currentUser['name']) ?>" required>
            </div>
            <div class="fpv-field">
                <label for="phone">WhatsApp (com DDD)</label>
                <input type="tel" id="phone" value="<?= htmlspecialchars($currentUser['phone']) ?>" required maxlength="17">
            </div>
            <div class="fpv-field">
                <label>E-mail</label>
                <input type="text" value="<?= htmlspecialchars($currentUser['email']) ?>" disabled style="opacity:.6;">
            </div>

            <button type="submit" class="fpv-btn fpv-btn-navy fpv-btn-block" id="submitButton">Salvar alteracoes</button>
        </form>

        <p class="fpv-auth-foot"><a href="/fpv/planner">Voltar para o planner</a> &middot; <a href="#" id="logoutLink">Sair</a></p>
    </div>
</div>

<?php require __DIR__ . '/../partials/footer.php'; ?>

<script src="/fpv/assets/js/fpv_masks.js"></script>
<script>
(() => {
    const form = document.getElementById("profileForm");
    const avatarInput = document.getElementById("avatar");
    const avatarWrap = document.getElementById("avatarPreviewWrap");
    const errorBox = document.getElementById("formError");
    const successBox = document.getElementById("formSuccess");
    const submitButton = document.getElementById("submitButton");

    avatarInput.addEventListener("change", () => {
        const file = avatarInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            avatarWrap.querySelector("img, .avatar-fallback")?.remove();
            const img = document.createElement("img");
            img.src = e.target.result;
            avatarWrap.prepend(img);
        };
        reader.readAsDataURL(file);
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorBox.style.display = "none";
        successBox.style.display = "none";
        submitButton.disabled = true;
        submitButton.textContent = "Salvando...";

        const formData = new FormData();
        formData.append("name", document.getElementById("name").value.trim());
        formData.append("phone", document.getElementById("phone").value.trim());
        if (avatarInput.files[0]) {
            formData.append("avatar", avatarInput.files[0]);
        }

        try {
            const response = await fetch("/php/fpv/api.php?action=updateFpvProfile", { method: "POST", body: formData });
            const payload = await response.json();
            if (!payload.success) {
                throw new Error(payload.message || "Nao foi possivel salvar.");
            }
            successBox.textContent = "Perfil atualizado.";
            successBox.style.display = "block";
        } catch (error) {
            errorBox.textContent = error.message;
            errorBox.style.display = "block";
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Salvar alteracoes";
        }
    });

    document.getElementById("logoutLink").addEventListener("click", async (event) => {
        event.preventDefault();
        await fetch("/php/fpv/api.php?action=logoutFpv", { method: "POST" });
        window.location.href = "/fpv";
    });
})();
</script>
</body>
</html>
