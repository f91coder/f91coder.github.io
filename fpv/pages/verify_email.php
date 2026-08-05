<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Confirme seu e-mail | FPV91</title>
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
            <h1>Confirme seu e-mail</h1>
            <p>Enviamos um codigo de 4 digitos para <strong id="emailLabel"><?= htmlspecialchars($_GET['email'] ?? '') ?></strong></p>
        </div>

        <div class="fpv-alert fpv-alert-error" id="formError" style="display:none;"></div>
        <div class="fpv-alert fpv-alert-success" id="formSuccess" style="display:none;"></div>

        <form id="verifyForm" novalidate>
            <div class="fpv-code-inputs">
                <input type="text" inputmode="numeric" maxlength="1" class="code-digit">
                <input type="text" inputmode="numeric" maxlength="1" class="code-digit">
                <input type="text" inputmode="numeric" maxlength="1" class="code-digit">
                <input type="text" inputmode="numeric" maxlength="1" class="code-digit">
            </div>
            <button type="submit" class="fpv-btn fpv-btn-navy fpv-btn-block" id="submitButton">Confirmar</button>
        </form>

        <p class="fpv-auth-foot">Nao recebeu? <a href="#" id="resendLink">Reenviar codigo</a></p>
    </div>
</div>

<script>
(() => {
    const email = <?= json_encode($_GET['email'] ?? '') ?>;
    const digits = Array.from(document.querySelectorAll(".code-digit"));
    const form = document.getElementById("verifyForm");
    const errorBox = document.getElementById("formError");
    const successBox = document.getElementById("formSuccess");
    const submitButton = document.getElementById("submitButton");
    const resendLink = document.getElementById("resendLink");

    digits.forEach((input, index) => {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/g, "");
            if (input.value && index < digits.length - 1) {
                digits[index + 1].focus();
            }
        });
        input.addEventListener("keydown", (event) => {
            if (event.key === "Backspace" && !input.value && index > 0) {
                digits[index - 1].focus();
            }
        });
    });
    if (digits[0]) digits[0].focus();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorBox.style.display = "none";
        const code = digits.map((d) => d.value).join("");
        if (code.length !== 4) {
            errorBox.textContent = "Digite os 4 numeros do codigo.";
            errorBox.style.display = "block";
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Confirmando...";

        try {
            const body = new URLSearchParams({ email, code });
            const response = await fetch("/php/fpv/api.php?action=verifyFpvEmail", { method: "POST", body });
            const payload = await response.json();
            if (!payload.success) {
                throw new Error(payload.message || "Codigo invalido.");
            }
            window.location.href = "/fpv/planner?welcome=1";
        } catch (error) {
            errorBox.textContent = error.message;
            errorBox.style.display = "block";
            submitButton.disabled = false;
            submitButton.textContent = "Confirmar";
        }
    });

    resendLink.addEventListener("click", async (event) => {
        event.preventDefault();
        errorBox.style.display = "none";
        successBox.style.display = "none";
        try {
            const body = new URLSearchParams({ email });
            const response = await fetch("/php/fpv/api.php?action=resendFpvVerification", { method: "POST", body });
            const payload = await response.json();
            successBox.textContent = payload.message || "Codigo reenviado.";
            successBox.style.display = "block";
        } catch (error) {
            errorBox.textContent = "Nao foi possivel reenviar agora.";
            errorBox.style.display = "block";
        }
    });
})();
</script>
</body>
</html>
