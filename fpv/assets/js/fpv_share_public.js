/**
 * FPV91 — interacoes da lista publica: tema claro/escuro, filtros, ampliar foto, curtir/descurtir com uma
 * batida e comentar.
 * Sem dependencias. Todo texto de visitante e inserido via textContent (nunca innerHTML).
 */
(() => {
    const config = window.FPV_SHARE || {};
    const NAME_KEY = "fpv_share_visitor_name";

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

    // ── Reacoes (uma batida) e comentarios ───────────────────────────────
    async function post(action, payload) {
        const body = new URLSearchParams(payload);
        const response = await fetch(`${config.apiUrl}?action=${action}`, { method: "POST", body });
        const data = await response.json().catch(() => ({ success: false, message: "Resposta inválida do servidor." }));
        if (!data.success) throw new Error(data.message || "Não foi possível enviar agora.");
        return data;
    }
    const sendFeedback = (payload) => post("addFpvFeedback", payload);

    const reactButton = (card, reaction) => card.querySelector(`.sh-react [data-reaction="${reaction}"]`);

    function setCount(card, key, value) {
        const node = card.querySelector(`.sh-count[data-count="${key}"]`);
        if (node && Number.isFinite(Number(value))) node.textContent = String(Math.max(0, Number(value)));
    }

    function setMine(card, mine) {
        ["like", "dislike"].forEach((reaction) => {
            const button = reactButton(card, reaction);
            if (!button) return;
            const active = mine === reaction;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
    }

    const currentMine = (card) => {
        const active = ["like", "dislike"].find((reaction) => reactButton(card, reaction).classList.contains("is-active"));
        return active || null;
    };

    // Curtir/descurtir: atualiza na hora e confirma com o servidor (que devolve o placar real).
    async function toggleReaction(card, reaction) {
        if (card.dataset.busy === "1") return;
        card.dataset.busy = "1";
        const before = {
            mine: currentMine(card),
            likes: Number(card.querySelector('[data-count="likes"]').textContent) || 0,
            dislikes: Number(card.querySelector('[data-count="dislikes"]').textContent) || 0,
        };
        const next = before.mine === reaction ? null : reaction;
        let likes = before.likes - (before.mine === "like" ? 1 : 0) + (next === "like" ? 1 : 0);
        let dislikes = before.dislikes - (before.mine === "dislike" ? 1 : 0) + (next === "dislike" ? 1 : 0);
        setMine(card, next);
        setCount(card, "likes", likes);
        setCount(card, "dislikes", dislikes);
        try {
            const data = await post("toggleFpvReaction", { token: config.token, item_uuid: card.dataset.uuid, reaction });
            setMine(card, data.my_reaction || null);
            setCount(card, "likes", data.likes);
            setCount(card, "dislikes", data.dislikes);
        } catch (err) {
            setMine(card, before.mine);
            setCount(card, "likes", before.likes);
            setCount(card, "dislikes", before.dislikes);
            showToast(err.message);
        } finally {
            delete card.dataset.busy;
        }
    }

    function closeCommentForm(card) {
        card.querySelectorAll(".sh-fb-form").forEach((f) => f.remove());
        const button = reactButton(card, "comment");
        if (button) {
            button.classList.remove("is-active");
            button.setAttribute("aria-expanded", "false");
        }
    }

    function buildCommentForm(card) {
        const form = document.createElement("form");
        form.className = "sh-fb-form";
        form.noValidate = true;

        const title = document.createElement("p");
        title.className = "sh-fb-title";
        title.textContent = "Seu comentário sobre este item";

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
        message.placeholder = "Escreva seu comentário…";

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

        cancel.addEventListener("click", () => closeCommentForm(card));

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            error.hidden = true;
            const text = message.value.trim();
            if (!text) {
                error.textContent = "Escreva o comentário antes de enviar.";
                error.hidden = false;
                return;
            }
            submit.disabled = true;
            submit.textContent = "Enviando…";
            try {
                const data = await sendFeedback({
                    token: config.token,
                    item_uuid: card.dataset.uuid,
                    reaction: "",
                    author_name: name.value.trim(),
                    message: text,
                    website: honeypot.value,
                });
                if (name.value.trim()) storageSet(NAME_KEY, name.value.trim());
                setCount(card, "comments", data.comments);
                closeCommentForm(card);
                const done = card.querySelector(".sh-fb-done");
                if (done) {
                    done.textContent = "✓ Comentário enviado. Obrigado! Só o dono da lista lê o que você escreveu.";
                    done.hidden = false;
                }
                showToast("Comentário enviado! Obrigado 🙌");
            } catch (err) {
                error.textContent = err.message;
                error.hidden = false;
                submit.disabled = false;
                submit.textContent = "Enviar";
            }
        });

        return form;
    }

    document.addEventListener("click", (event) => {
        const button = event.target.closest(".sh-react button[data-reaction]");
        if (!button) return;
        const card = button.closest(".sh-card");
        const reaction = button.dataset.reaction;

        if (reaction !== "comment") {
            toggleReaction(card, reaction);
            return;
        }
        if (card.querySelector(".sh-fb-form")) {
            closeCommentForm(card);
            return;
        }
        const done = card.querySelector(".sh-fb-done");
        if (done) done.hidden = true;
        button.classList.add("is-active");
        button.setAttribute("aria-expanded", "true");
        const form = buildCommentForm(card);
        card.querySelector(".sh-react").insertAdjacentElement("afterend", form);
        form.querySelector("textarea").focus();
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
