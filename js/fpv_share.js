/**
 * FPV91 — painel do dono para o link publico da lista e a caixa de opinioes.
 * Depende de window.FpvPlanner (api/toast) e de openModal/closeModal, expostos pelo fpv_planner.js.
 */
(() => {
    const REACTIONS = {
        like: { emoji: "👍", label: "Curtiu" },
        doubt: { emoji: "🤔", label: "Tem dúvidas" },
        dislike: { emoji: "👎", label: "Não curtiu" },
    };

    const state = {
        loaded: false,
        loading: false,
        share: null,
        feedback: [],
        reactions: {},
        tab: "link",
        filterItemUuid: null,
        newIds: new Set(),
    };

    const body = () => document.getElementById("share-modal-body");
    const api = () => window.FpvPlanner.apiRequest;

    // Cada montagem tem o seu proprio link: todas as chamadas levam a montagem aberta no planner.
    const currentBuild = () => (window.FpvPlanner.currentBuild && window.FpvPlanner.currentBuild()) || null;
    const buildParams = () => (currentBuild() ? { build_uuid: currentBuild().build_uuid } : {});

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function timeAgo(iso) {
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return "";
        const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
        if (seconds < 60) return "agora há pouco";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `há ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `há ${hours} h`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
        return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    }

    function unreadCount() {
        return state.feedback.filter((f) => !f.is_read).length;
    }

    function countsByItem() {
        const map = {};
        const entryFor = (uuid) => map[uuid] || (map[uuid] = { total: 0, like: 0, doubt: 0, dislike: 0, comments: 0, unread: 0 });
        state.feedback.forEach((f) => {
            if (!f.item_uuid) return;
            const entry = entryFor(f.item_uuid);
            entry.total += 1;
            if (f.reaction && entry[f.reaction] !== undefined) entry[f.reaction] += 1;
            if (f.message) entry.comments += 1;
            if (!f.is_read) entry.unread += 1;
        });
        // Curtidas/descurtidas de uma batida vivem em outra tabela (nao geram "nao lido").
        Object.entries(state.reactions).forEach(([uuid, r]) => {
            const entry = entryFor(uuid);
            entry.like += r.like || 0;
            entry.dislike += r.dislike || 0;
            entry.total += (r.like || 0) + (r.dislike || 0);
        });
        return map;
    }

    function notifyPlanner() {
        window.dispatchEvent(new CustomEvent("fpv:share-updated", {
            detail: { share: state.share, unread: unreadCount(), by_item: countsByItem() },
        }));
    }

    function applyPayload(payload) {
        state.share = payload.share;
        state.feedback = payload.feedback || [];
        state.reactions = payload.reactions || {};
        state.loaded = true;
        notifyPlanner();
    }

    async function load() {
        state.loading = true;
        try {
            applyPayload(await api()("getFpvShare", { params: buildParams() }));
        } finally {
            state.loading = false;
        }
    }

    // ── Render ───────────────────────────────────────────────────────────

    function tabButton(id, label, badge) {
        const active = state.tab === id;
        return `<button type="button" data-share-tab="${id}" class="flex-1 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 ${active ? "border-f91-lime text-f91-text" : "border-transparent text-f91-muted hover:text-f91-text"}">${label}${badge ? ` <span class="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-f91-lime text-white text-[10px] font-bold">${badge}</span>` : ""}</button>`;
    }

    function switchRow(id, label, hint, checked) {
        return `
            <label class="flex items-start justify-between gap-4 cursor-pointer py-2">
                <span>
                    <span class="block text-sm font-medium text-f91-text">${label}</span>
                    <span class="block text-xs text-f91-muted mt-0.5">${hint}</span>
                </span>
                <span class="relative inline-block w-10 h-6 flex-shrink-0 mt-0.5">
                    <input type="checkbox" id="${id}" class="peer sr-only" ${checked ? "checked" : ""}>
                    <span class="absolute inset-0 rounded-full bg-gray-300 peer-checked:bg-f91-lime transition-colors"></span>
                    <span class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></span>
                </span>
            </label>
        `;
    }

    function renderLinkTab() {
        const share = state.share;

        if (!share || !share.is_active) {
            return `
                <div class="p-8 text-center">
                    <div class="w-16 h-16 rounded-full bg-gray-100 text-f91-lime flex items-center justify-center mx-auto mb-4"><i class="ph-fill ph-share-network text-3xl"></i></div>
                    <h4 class="text-lg font-semibold text-f91-text mb-2">${share ? "Seu link está desativado" : "Peça a opinião da galera"}</h4>
                    <p class="text-sm text-f91-muted max-w-md mx-auto mb-6 leading-relaxed">Gere um link público para amigos e colegas de FPV verem a sua lista, visitarem as lojas e deixarem reações e comentários. <strong>Carteira, saldo e metas nunca aparecem</strong> — só os itens.</p>
                    <button type="button" data-share-action="enable" class="px-6 py-2.5 bg-f91-navy hover:bg-f91-navyLight text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2"><i class="ph-bold ph-link"></i> ${share ? "Reativar link" : "Gerar link público"}</button>
                </div>
            `;
        }

        const buildName = currentBuild() ? currentBuild().name : "";
        const shareText = `Olha a minha lista de compras FPV${buildName ? ` (${buildName})` : ""} e me diz o que acha 🚁 ${share.url}`;
        const whatsapp = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        const canNativeShare = typeof navigator.share === "function";
        const views = share.view_count || 0;

        return `
            <div class="p-6 space-y-6">
                <div>
                    <label class="block text-xs font-semibold uppercase tracking-wider text-f91-muted mb-2">Link público da sua lista</label>
                    <div class="flex gap-2">
                        <input type="text" readonly id="share-url-input" value="${escapeHtml(share.url)}" class="flex-1 min-w-0 px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-f91-text outline-none focus:ring-2 focus:ring-f91-lime" onclick="this.select()">
                        <button type="button" data-share-action="copy" class="px-4 py-2.5 bg-f91-navy hover:bg-f91-navyLight text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"><i class="ph-bold ph-copy"></i> Copiar</button>
                    </div>
                    <div class="flex flex-wrap gap-2 mt-3">
                        <a href="${escapeHtml(whatsapp)}" target="_blank" rel="noopener" class="px-3.5 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"><i class="ph-fill ph-whatsapp-logo text-base"></i> Enviar no WhatsApp</a>
                        ${canNativeShare ? `<button type="button" data-share-action="native" class="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-f91-text text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"><i class="ph ph-export text-base"></i> Compartilhar…</button>` : ""}
                        <a href="${escapeHtml(share.url)}" target="_blank" rel="noopener" class="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-f91-text text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"><i class="ph ph-arrow-square-out text-base"></i> Ver como visitante</a>
                    </div>
                    <p class="text-xs text-f91-muted mt-3 flex items-center gap-1.5"><i class="ph ph-eye"></i> ${views} ${views === 1 ? "visualização" : "visualizações"}${share.last_viewed_at ? ` · última ${escapeHtml(timeAgo(share.last_viewed_at))}` : ""}</p>
                </div>

                <form id="share-settings-form" class="space-y-1 border-t border-gray-100 pt-5" autocomplete="off">
                    ${switchRow("share-opt-prices", "Mostrar os preços", "Desligue se quiser que os visitantes vejam só os produtos.", share.show_prices)}
                    ${switchRow("share-opt-feedback", "Permitir reações e comentários", "Visitantes podem curtir, tirar dúvidas ou sugerir trocas.", share.allow_feedback)}

                    <div class="pt-3">
                        <label class="block text-sm font-medium text-f91-text mb-1">Título da página <span class="text-f91-muted font-normal">(opcional — se vazio, usa o nome da montagem)</span></label>
                        <input type="text" id="share-opt-title" maxlength="120" value="${escapeHtml(share.title)}" placeholder="${escapeHtml(currentBuild() ? currentBuild().name : "Ex: Meu primeiro 5 polegadas")}" class="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-f91-lime outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200 text-sm">
                    </div>
                    <div class="pt-2">
                        <label class="block text-sm font-medium text-f91-text mb-1">Mensagem para quem abrir o link <span class="text-f91-muted font-normal">(opcional)</span></label>
                        <textarea id="share-opt-message" maxlength="500" rows="3" placeholder="Ex: Galera, estou montando meu primeiro quad. Me ajudem a escolher os motores!" class="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-f91-lime outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200 text-sm resize-y"></textarea>
                    </div>
                    <div class="flex justify-end pt-2">
                        <button type="submit" class="px-5 py-2 bg-f91-navy hover:bg-f91-navyLight text-white text-sm font-semibold rounded-xl transition-colors">Salvar alterações</button>
                    </div>
                </form>

                <div class="border-t border-gray-100 pt-5 flex flex-wrap gap-3 items-center justify-between">
                    <p class="text-xs text-f91-muted max-w-sm">Se o link vazou ou você quer recomeçar, gere um novo — o antigo deixa de funcionar na hora.</p>
                    <div class="flex gap-2">
                        <button type="button" data-share-action="regenerate" class="px-3 py-2 text-xs font-semibold text-f91-text bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Gerar novo link</button>
                        <button type="button" data-share-action="disable" class="px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors">Desativar</button>
                    </div>
                </div>
            </div>
        `;
    }

    function feedbackCard(f) {
        const reaction = f.reaction ? REACTIONS[f.reaction] : null;
        const isNew = state.newIds.has(f.id);
        return `
            <li class="p-4 rounded-xl border ${isNew ? "border-f91-lime bg-orange-50/40 dark:bg-transparent" : "border-gray-100"} bg-white dark:bg-f91-card">
                <div class="flex items-start gap-3">
                    <span class="w-9 h-9 rounded-full bg-gray-100 text-f91-text font-bold text-sm flex items-center justify-center flex-shrink-0">${escapeHtml((f.author_name || "?").trim().charAt(0).toUpperCase())}</span>
                    <div class="min-w-0 flex-grow">
                        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span class="text-sm font-semibold text-f91-text">${escapeHtml(f.author_name)}</span>
                            <span class="text-[11px] text-f91-muted">${escapeHtml(timeAgo(f.created_at))}</span>
                            ${isNew ? `<span class="text-[10px] font-bold uppercase tracking-wide text-white bg-f91-lime px-1.5 py-0.5 rounded">novo</span>` : ""}
                        </div>
                        <div class="flex flex-wrap items-center gap-2 mt-1.5">
                            ${f.item_uuid
                                ? `<span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-f91-text truncate max-w-[16rem]" title="${escapeHtml(f.item_name)}"><i class="ph ph-package"></i> ${escapeHtml(f.item_name || "Item removido")}</span>`
                                : `<span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-f91-text"><i class="ph ph-clipboard-text"></i> Sobre a lista toda</span>`}
                            ${reaction ? `<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">${reaction.emoji} ${reaction.label}</span>` : ""}
                        </div>
                        ${f.message ? `<p class="text-sm text-f91-text mt-2 whitespace-pre-line break-words">${escapeHtml(f.message)}</p>` : ""}
                    </div>
                    <button type="button" data-share-action="delete-feedback" data-id="${f.id}" class="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Apagar esta opinião"><i class="ph ph-trash"></i></button>
                </div>
            </li>
        `;
    }

    function renderFeedbackTab() {
        const filtered = state.filterItemUuid ? state.feedback.filter((f) => f.item_uuid === state.filterItemUuid) : state.feedback;
        // Placar: reacoes de uma batida (por item ou soma geral) + reacoes antigas que vieram junto de comentario.
        const totals = { like: 0, doubt: 0, dislike: 0 };
        const tapped = state.filterItemUuid ? [state.reactions[state.filterItemUuid] || {}] : Object.values(state.reactions);
        tapped.forEach((r) => { totals.like += r.like || 0; totals.dislike += r.dislike || 0; });
        filtered.forEach((f) => { if (f.reaction && totals[f.reaction] !== undefined) totals[f.reaction] += 1; });
        const comments = filtered.filter((f) => f.message).length;
        const hasReactions = totals.like + totals.dislike + totals.doubt > 0;

        const filterItem = state.filterItemUuid
            ? (state.feedback.find((f) => f.item_uuid === state.filterItemUuid) || {}).item_name
                || (window.FpvPlanner.getItems().find((it) => it.item_uuid === state.filterItemUuid) || {}).name
            : "";

        if (!state.feedback.length && !hasReactions) {
            return `
                <div class="p-10 text-center">
                    <div class="w-16 h-16 rounded-full bg-gray-100 text-f91-muted flex items-center justify-center mx-auto mb-4"><i class="ph ph-chat-circle-dots text-3xl"></i></div>
                    <h4 class="text-base font-semibold text-f91-text mb-1">Ainda sem opiniões</h4>
                    <p class="text-sm text-f91-muted max-w-sm mx-auto">Quando alguém curtir, descurtir ou comentar pelo seu link, aparece aqui — e você recebe o aviso no botão Compartilhar.</p>
                </div>
            `;
        }

        return `
            <div class="p-6 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span class="px-2.5 py-1 rounded-full bg-gray-100 text-f91-text">👍 ${totals.like}</span>
                        <span class="px-2.5 py-1 rounded-full bg-gray-100 text-f91-text">👎 ${totals.dislike}</span>
                        ${totals.doubt ? `<span class="px-2.5 py-1 rounded-full bg-gray-100 text-f91-text">🤔 ${totals.doubt}</span>` : ""}
                        <span class="text-f91-muted font-medium">${comments} ${comments === 1 ? "comentário" : "comentários"}</span>
                    </div>
                    ${state.filterItemUuid ? `<button type="button" data-share-action="clear-filter" class="text-xs font-semibold text-f91-text bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors max-w-full"><span class="truncate max-w-[14rem]">${escapeHtml(filterItem || "Item")}</span> <i class="ph ph-x"></i></button>` : ""}
                </div>
                ${filtered.length ? `<ul class="space-y-3">${filtered.map(feedbackCard).join("")}</ul>` : `<p class="text-sm text-f91-muted text-center py-6">${state.filterItemUuid ? "Nenhum comentário sobre este item." : "Nenhum comentário ainda."}</p>`}
            </div>
        `;
    }

    function render() {
        const container = body();
        if (!container) return;
        const unread = state.newIds.size;
        const settingsMessage = state.share ? state.share.message : "";

        container.innerHTML = `
            <div class="flex border-b border-gray-100 sticky top-0 z-10 bg-white dark:bg-f91-card">
                ${tabButton("link", "Link e configurações")}
                ${tabButton("feedback", "Opiniões", unread || "")}
            </div>
            <div>${state.tab === "link" ? renderLinkTab() : renderFeedbackTab()}</div>
        `;

        const message = container.querySelector("#share-opt-message");
        if (message) message.value = settingsMessage;
    }

    // ── Acoes ────────────────────────────────────────────────────────────

    async function save(overrides) {
        const share = state.share || {};
        const params = {
            ...buildParams(),
            enabled: "enabled" in overrides ? (overrides.enabled ? "1" : "0") : (share.is_active === false ? "0" : "1"),
            show_prices: "show_prices" in overrides ? (overrides.show_prices ? "1" : "0") : (share.show_prices === false ? "0" : "1"),
            allow_feedback: "allow_feedback" in overrides ? (overrides.allow_feedback ? "1" : "0") : (share.allow_feedback === false ? "0" : "1"),
            title: "title" in overrides ? overrides.title : (share.title || ""),
            message: "message" in overrides ? overrides.message : (share.message || ""),
        };
        if (overrides.regenerate) params.regenerate = "1";
        applyPayload(await api()("saveFpvShare", { method: "POST", params }));
        render();
    }

    async function markAllRead() {
        if (!state.feedback.some((f) => !f.is_read)) return;
        state.newIds = new Set(state.feedback.filter((f) => !f.is_read).map((f) => f.id));
        try {
            applyPayload(await api()("markFpvFeedbackRead", { method: "POST", params: { all: "1", ...buildParams() } }));
        } catch (error) {
            // segue: o aviso apenas continua aparecendo
        }
    }

    async function handleClick(event) {
        const tab = event.target.closest("[data-share-tab]");
        if (tab) {
            state.tab = tab.dataset.shareTab;
            if (state.tab === "feedback") {
                await markAllRead();
            }
            render();
            return;
        }

        const action = event.target.closest("[data-share-action]");
        if (!action) return;
        const type = action.dataset.shareAction;
        const toast = window.FpvPlanner.showToast;

        try {
            if (type === "enable") {
                action.disabled = true;
                await save({ enabled: true });
                toast("Link público ativado! Copie e envie para a galera.");
            } else if (type === "disable") {
                if (!confirm("Desativar o link? Quem já o tem deixa de conseguir abrir a lista (você pode reativar depois).")) return;
                await save({ enabled: false });
                toast("Link desativado.");
            } else if (type === "regenerate") {
                if (!confirm("Gerar um novo link? O link antigo deixa de funcionar imediatamente.")) return;
                await save({ regenerate: true });
                toast("Novo link gerado. O antigo não funciona mais.");
            } else if (type === "copy") {
                const input = document.getElementById("share-url-input");
                try {
                    await navigator.clipboard.writeText(state.share.url);
                } catch (error) {
                    input.select();
                    document.execCommand("copy");
                }
                toast("Link copiado!");
            } else if (type === "native") {
                await navigator.share({ title: currentBuild() ? `Lista FPV: ${currentBuild().name}` : "Minha lista de compras FPV", text: "Olha a minha lista e me diz o que acha 🚁", url: state.share.url }).catch(() => {});
            } else if (type === "clear-filter") {
                state.filterItemUuid = null;
                render();
            } else if (type === "delete-feedback") {
                if (!confirm("Apagar esta opinião?")) return;
                applyPayload(await api()("deleteFpvFeedback", { method: "POST", params: { feedback_id: action.dataset.id, ...buildParams() } }));
                render();
            }
        } catch (error) {
            alert("Erro: " + error.message);
            render();
        }
    }

    async function handleSubmit(event) {
        if (event.target.id !== "share-settings-form") return;
        event.preventDefault();
        const button = event.target.querySelector("button[type=submit]");
        button.disabled = true;
        try {
            await save({
                enabled: true,
                show_prices: document.getElementById("share-opt-prices").checked,
                allow_feedback: document.getElementById("share-opt-feedback").checked,
                title: document.getElementById("share-opt-title").value.trim(),
                message: document.getElementById("share-opt-message").value.trim(),
            });
            window.FpvPlanner.showToast("Configurações salvas.");
        } catch (error) {
            alert("Erro ao salvar: " + error.message);
            button.disabled = false;
        }
    }

    // ── API publica ──────────────────────────────────────────────────────

    async function open(options) {
        const opts = options || {};
        state.filterItemUuid = opts.itemUuid || null;
        state.newIds = new Set();
        state.tab = state.filterItemUuid ? "feedback" : "link";

        const container = body();
        if (container) container.innerHTML = `<p class="p-10 text-center text-sm text-f91-muted">Carregando…</p>`;
        const title = document.getElementById("share-modal-title");
        if (title) title.textContent = currentBuild() ? `Compartilhar: ${currentBuild().name}` : "Compartilhar minha lista";
        window.openModal("share-modal");

        try {
            await load();
            if (!state.filterItemUuid && state.share && state.share.is_active && unreadCount() > 0) {
                state.tab = "feedback";
            }
            if (state.tab === "feedback") await markAllRead();
            render();
        } catch (error) {
            if (container) container.innerHTML = `<p class="p-10 text-center text-sm text-red-500">${escapeHtml(error.message)}</p>`;
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        const container = body();
        if (!container) return;
        container.addEventListener("click", handleClick);
        container.addEventListener("submit", handleSubmit);
    });

    window.FpvShare = { open };
})();
