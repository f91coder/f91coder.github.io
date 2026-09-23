/**
 * FPV91 — interacoes da lista publica: tema claro/escuro, filtros, ampliar foto e enviar opiniao.
 * Sem dependencias. Todo texto de visitante e inserido via textContent (nunca innerHTML).
 */
(() => {
    const config = window.FPV_SHARE || {};
    const NAME_KEY = "fpv_share_visitor_name";
    const REACTION_LABELS = { like: "Curti", doubt: "Sei não!", dislike: "Não curti", comment: "Comentário" };

    const toast = document.getElementById("shToast");
    let toastTimer = null;
    function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add("is-visible");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3800);
    }

    function storageGet(key) {
        try { return window.localStorage.getItem(key); } catch (error) { return null; }
    }
    function storageSet(key, value) {
        try { window.localStorage.setItem(key, value); } catch (error) { /* modo privado: segue sem lembrar */ }
    }
    const savedName = () => storageGet(NAME_KEY) || "";
    const reactedKey = (uuid) => `fpv_share_${config.token}_${uuid || "general"}`;

    // ── Tema claro/escuro (mesma chave do planner) ───────────────────────
    const THEME_KEY = "f91_fpv_theme";
    const root = document.documentElement;
    const themeToggle = document.getElementById("shThemeToggle");
    if (themeToggle) {
        const isDark = () => root.getAttribute("data-theme") === "dark";
        const syncLabel = () => themeToggle.setAttribute("title", isDark() ? "Mudar para modo claro" : "Mudar para modo escuro");
        syncLabel();
        themeToggle.addEventListener("click", () => {
            const next = isDark() ? "light" : "dark";
            root.setAttribute("data-theme", next);
            storageSet(THEME_KEY, next);
            syncLabel();
        });
        // Sem preferencia salva, acompanha o sistema em tempo real.
        if (window.matchMedia) {
            const media = window.matchMedia("(prefers-color-scheme: dark)");
            const onSystemChange = (event) => {
                if (storageGet(THEME_KEY)) return;
                root.setAttribute("data-theme", event.matches ? "dark" : "light");
                syncLabel();
            };
            if (media.addEventListener) media.addEventListener("change", onSystemChange);
        }
    }

    // ── Filtros (categoria com multipla escolha + situacao) ──────────────
    const categoryBox = document.getElementById("shFilterCategory");
    const categoryButton = document.getElementById("shCategoryBtn");
    const categoryPanel = document.getElementById("shCategoryPanel");
    const categoryValue = document.getElementById("shCategoryValue");
    const categoryClear = document.getElementById("shCategoryClear");
    const categoryChecks = categoryPanel ? Array.from(categoryPanel.querySelectorAll("input[type=checkbox]")) : [];
    const statusSelect = document.getElementById("shFilterStatus");
    const filterCount = document.getElementById("shFilterCount");
    const noResults = document.getElementById("shNoResults");
    const clearFilters = document.getElementById("shClearFilters");
    const list = document.getElementById("shItems");

    const selectedCategories = () => categoryChecks.filter((c) => c.checked);

    function renderCategorySummary() {
        if (!categoryValue) return;
        const chosen = selectedCategories();
        if (chosen.length === 0) categoryValue.textContent = `Todas (${categoryBox.dataset.total || ""})`;
        else if (chosen.length <= 2) categoryValue.textContent = chosen.map((c) => c.dataset.label).join(", ");
        else categoryValue.textContent = `${chosen.length} categorias`;
        if (categoryClear) categoryClear.disabled = chosen.length === 0;
    }

    function setCategoryOpen(open) {
        if (!categoryPanel) return;
        categoryPanel.hidden = !open;
        categoryButton.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function applyFilters() {
        if (!list) return;
        const chosen = new Set(selectedCategories().map((c) => c.value));
        const status = statusSelect ? statusSelect.value : "all";
        const cards = Array.from(list.querySelectorAll(".sh-card"));
        let shown = 0;
        cards.forEach((card) => {
            const visible = (chosen.size === 0 || chosen.has(card.dataset.category))
                && (status === "all" || card.dataset.status === status);
            card.hidden = !visible;
            if (visible) shown += 1;
        });
        const filtered = chosen.size > 0 || status !== "all";
        if (filterCount) {
            filterCount.hidden = !filtered;
            filterCount.textContent = filtered ? `Mostrando ${shown} de ${cards.length} ${cards.length === 1 ? "item" : "itens"}` : "";
        }
        if (noResults) noResults.hidden = shown !== 0;
        list.hidden = shown === 0;
        renderCategorySummary();
    }

    if (categoryButton && categoryPanel) {
        categoryButton.addEventListener("click", () => setCategoryOpen(categoryPanel.hidden));
        categoryChecks.forEach((check) => check.addEventListener("change", applyFilters));
        if (categoryClear) categoryClear.addEventListener("click", () => {
            categoryChecks.forEach((c) => { c.checked = false; });
            applyFilters();
        });
        // Fecha ao clicar fora ou com Esc (devolvendo o foco ao botao).
        document.addEventListener("click", (event) => {
            if (!categoryPanel.hidden && !categoryBox.contains(event.target)) setCategoryOpen(false);
        });
        categoryBox.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !categoryPanel.hidden) {
                setCategoryOpen(false);
                categoryButton.focus();
            }
        });
        categoryBox.addEventListener("focusout", (event) => {
            if (!categoryPanel.hidden && event.relatedTarget && !categoryBox.contains(event.relatedTarget)) setCategoryOpen(false);
        });
    }
    if (statusSelect) statusSelect.addEventListener("change", applyFilters);
    if (clearFilters) {
        clearFilters.addEventListener("click", () => {
            categoryChecks.forEach((c) => { c.checked = false; });
            if (statusSelect) statusSelect.value = "all";
            applyFilters();
        });
    }
    // Navegador pode restaurar a selecao ao voltar para a pagina.
    applyFilters();

    // ── Foto ampliada ────────────────────────────────────────────────────
    document.addEventListener("click", (event) => {
        const photo = event.target.closest(".sh-photo[data-full]");
        if (!photo) return;
        const overlay = document.createElement("div");
        overlay.className = "sh-lightbox";
        const img = document.createElement("img");
        img.src = photo.dataset.full;
        img.alt = photo.dataset.caption || "";
        const caption = document.createElement("p");
        caption.textContent = photo.dataset.caption || "";
        overlay.append(img, caption);
        const close = () => { overlay.remove(); document.removeEventListener("keydown", onKey); };
        const onKey = (e) => { if (e.key === "Escape") close(); };
        overlay.addEventListener("click", close);
        document.addEventListener("keydown", onKey);
        document.body.appendChild(overlay);
    });

    // ── Envio de opiniao ─────────────────────────────────────────────────
    async function sendFeedback(payload) {
        const body = new URLSearchParams(payload);
        const response = await fetch(`${config.apiUrl}?action=addFpvFeedback`, { method: "POST", body });
        const data = await response.json().catch(() => ({ success: false, message: "Resposta inválida do servidor." }));
        if (!data.success) throw new Error(data.message || "Não foi possível enviar agora.");
        return data;
    }

    function buildForm(card, reaction) {
        const form = document.createElement("form");
        form.className = "sh-fb-form";
        form.noValidate = true;

        const title = document.createElement("p");
        title.className = "sh-fb-title";
        title.textContent = reaction === "comment" ? "Seu comentário sobre este item" : `Sua opinião: ${REACTION_LABELS[reaction]}`;

        const name = document.createElement("input");
        name.className = "sh-field";
        name.type = "text";
        name.name = "author_name";
        name.maxLength = 60;
        name.placeholder = "Seu nome (opcional)";
        name.autocomplete = "name";
        name.value = savedName();

        const message = document.createElement("textarea");
        message.className = "sh-field";
        message.name = "message";
        message.maxLength = 600;
        message.rows = 2;
        message.placeholder = reaction === "comment" ? "Escreva seu comentário…" : "Quer explicar? (opcional)";

        const honeypotWrap = document.createElement("div");
        honeypotWrap.className = "sh-hp";
        honeypotWrap.setAttribute("aria-hidden", "true");
        const honeypot = document.createElement("input");
        honeypot.type = "text";
        honeypot.name = "website";
        honeypot.tabIndex = -1;
        honeypot.autocomplete = "off";
        honeypotWrap.appendChild(honeypot);

        const error = document.createElement("p");
        error.className = "sh-fb-error";
        error.hidden = true;

        const actions = document.createElement("div");
        actions.className = "sh-fb-actions";
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "sh-btn ghost";
        cancel.textContent = "Cancelar";
        const submit = document.createElement("button");
        submit.type = "submit";
        submit.className = "sh-btn";
        submit.textContent = "Enviar";
        actions.append(cancel, submit);

        form.append(title, name, message, honeypotWrap, error, actions);

        cancel.addEventListener("click", () => {
            form.remove();
            card.querySelectorAll(".sh-react button").forEach((b) => b.classList.remove("is-active"));
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            error.hidden = true;
            const text = message.value.trim();
            if (reaction === "comment" && !text) {
                error.textContent = "Escreva o comentário antes de enviar.";
                error.hidden = false;
                return;
            }
            submit.disabled = true;
            submit.textContent = "Enviando…";
            try {
                await sendFeedback({
                    token: config.token,
                    item_uuid: card.dataset.uuid,
                    reaction: reaction === "comment" ? "" : reaction,
                    author_name: name.value.trim(),
                    message: text,
                    website: honeypot.value,
                });
                if (name.value.trim()) storageSet(NAME_KEY, name.value.trim());
                storageSet(reactedKey(card.dataset.uuid), reaction);
                form.remove();
                markDone(card, reaction);
                showToast("Opinião enviada! Obrigado 🙌");
            } catch (err) {
                error.textContent = err.message;
                error.hidden = false;
                submit.disabled = false;
                submit.textContent = "Enviar";
            }
        });

        return form;
    }

    function markDone(card, reaction) {
        const done = card.querySelector(".sh-fb-done");
        if (done) {
            done.textContent = `✓ Você enviou: ${REACTION_LABELS[reaction] || "sua opinião"}. Pode enviar outra se quiser.`;
            done.hidden = false;
        }
        card.querySelectorAll(".sh-react button").forEach((b) => b.classList.toggle("is-active", b.dataset.reaction === reaction));
    }

    document.querySelectorAll(".sh-card").forEach((card) => {
        const previous = storageGet(reactedKey(card.dataset.uuid));
        if (previous) markDone(card, previous);
    });

    document.addEventListener("click", (event) => {
        const button = event.target.closest(".sh-react button[data-reaction]");
        if (!button) return;
        const card = button.closest(".sh-card");
        const reaction = button.dataset.reaction;
        card.querySelectorAll(".sh-fb-form").forEach((f) => f.remove());
        card.querySelectorAll(".sh-react button").forEach((b) => b.classList.toggle("is-active", b === button));
        const form = buildForm(card, reaction);
        card.querySelector(".sh-react").insertAdjacentElement("afterend", form);
        (reaction === "comment" ? form.querySelector("textarea") : form.querySelector("input[name=author_name]")).focus();
    });

    // ── Opiniao geral ────────────────────────────────────────────────────
    const general = document.getElementById("shGeneral");
    if (general) {
        const form = general.querySelector("form");
        const error = form.querySelector(".sh-fb-error");
        const done = general.querySelector(".sh-fb-done");
        form.elements.author_name.value = savedName();

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            error.hidden = true;
            const text = form.elements.message.value.trim();
            if (!text) {
                error.textContent = "Escreva sua opinião antes de enviar.";
                error.hidden = false;
                return;
            }
            const submit = form.querySelector("button[type=submit]");
            submit.disabled = true;
            submit.textContent = "Enviando…";
            try {
                await sendFeedback({
                    token: config.token,
                    item_uuid: "",
                    reaction: "",
                    author_name: form.elements.author_name.value.trim(),
                    message: text,
                    website: form.elements.website.value,
                });
                if (form.elements.author_name.value.trim()) storageSet(NAME_KEY, form.elements.author_name.value.trim());
                form.elements.message.value = "";
                done.textContent = "✓ Opinião enviada! Obrigado por ajudar. Pode enviar outra se quiser.";
                done.hidden = false;
                showToast("Opinião enviada! Obrigado 🙌");
            } catch (err) {
                error.textContent = err.message;
                error.hidden = false;
            } finally {
                submit.disabled = false;
                submit.textContent = "Enviar opinião";
            }
        });
    }
})();
