(() => {
    const API_URL = "/php/fpv/api.php";
    const FM = window.FpvMoney;
    const Clip = window.FpvClip;

    const THEME_STORAGE_KEY = "f91_fpv_theme";
    const DISPLAY_CURRENCY_KEY = "f91_fpv_display_currency";
    const INPUT_CURRENCY_KEY = "f91_fpv_input_currency";
    const BUILD_KEY = "f91_fpv_build";
    const BUILD_COLORS = {
        orange: "#ff6829", blue: "#3b82f6", green: "#22c55e", purple: "#a855f7", pink: "#ec4899",
        teal: "#14b8a6", yellow: "#eab308", red: "#ef4444", slate: "#64748b",
    };

    const state = {
        builds: [],
        currentBuild: null,
        otherPurchased: 0,
        scrollTabs: false,
        categories: [],
        items: [],
        planning: { saved_amount: 0, target_date: null },
        videos: [],
        wallet: null,
        share: null,
        displayCurrency: "BRL",
        exchangeRates: null,
        dragUuid: null,
        pendingImport: null,
        lastAutoName: "",
    };

    const $ = (id) => document.getElementById(id);
    const el = {
        logoutButton: $("logoutButton"),

        displayTotalCost: $("display-total-cost"),
        displayProgressPct: $("display-progress-pct"),
        progressTrack: $("progress-track"),
        progressBar: $("progress-bar"),
        progressBarCovered: $("progress-bar-covered"),
        legendPurchasedPct: $("legend-purchased-pct"),
        legendCoveredPct: $("legend-covered-pct"),
        displayPurchased: $("display-purchased"),
        displayToBuy: $("display-to-buy"),
        displaySaved: $("display-saved"),
        displayRemaining: $("display-remaining"),
        summaryNote: $("summary-note"),
        currencySwitch: $("currency-switch"),

        displayWalletBalance: $("display-wallet-balance"),
        walletBalanceHint: $("wallet-balance-hint"),
        walletAddButton: $("wallet-add-button"),
        walletWithdrawButton: $("wallet-withdraw-button"),
        walletStatIn: $("wallet-stat-in"),
        walletStatPurchases: $("wallet-stat-purchases"),
        walletStatOut: $("wallet-stat-out"),
        walletStatement: $("wallet-statement"),
        walletForm: $("wallet-form"),
        walletType: $("wallet-type"),
        walletModalTitle: $("wallet-modal-title"),
        walletCurrency: $("wallet-currency"),
        walletAmount: $("wallet-amount"),
        walletConvertHint: $("wallet-convert-hint"),
        walletNote: $("wallet-note"),
        walletSubmit: $("wallet-submit"),

        inputDate: $("input-date"),
        displayTimeLeft: $("display-time-left"),
        displayMonthly: $("display-monthly"),
        displayWeekly: $("display-weekly"),
        displayDaily: $("display-daily"),
        calendarViz: $("calendar-viz"),

        categoriesLegend: $("categories-legend"),
        itemCategorySelect: $("item-category"),
        addCategoryForm: $("add-category-form"),
        catName: $("cat-name"),
        catColor: $("cat-color"),

        addItemForm: $("add-item-form"),
        itemImage: $("item-image"),
        imagePreview: $("image-preview"),
        imagePlaceholderIcon: $("image-placeholder-icon"),
        itemName: $("item-name"),
        itemUrl: $("item-url"),
        itemPrice: $("item-price"),
        itemPriceCurrency: $("item-price-currency"),
        itemFormHint: $("item-form-hint"),
        importLinkButton: $("import-link-button"),
        importLinkIcon: $("import-link-icon"),
        importLinkLabel: $("import-link-label"),
        openClipModal: $("open-clip-modal"),
        itemCount: $("item-count"),
        itemsContainer: $("items-container"),
        emptyState: $("empty-state"),

        editItemForm: $("edit-item-form"),
        editItemUuid: $("edit-item-uuid"),
        editItemImage: $("edit-item-image"),
        editImagePreview: $("edit-image-preview"),
        editImagePlaceholderIcon: $("edit-image-placeholder-icon"),
        editItemName: $("edit-item-name"),
        editItemCategorySelect: $("edit-item-category"),
        editItemUrl: $("edit-item-url"),
        editItemPrice: $("edit-item-price"),
        editItemPriceCurrency: $("edit-item-price-currency"),
        editItemHint: $("edit-item-hint"),
        editRefreshPrice: $("edit-refresh-price"),
        editRefreshIcon: $("edit-refresh-icon"),

        clipBookmarklet: $("clip-bookmarklet"),
        clipCopyButton: $("clip-copy-button"),

        btnVideosMenu: $("btn-videos-menu"),
        videosDropdown: $("videos-dropdown"),
        videosListContainer: $("videos-list-container"),
        addVideoForm: $("add-video-form"),
        newVideoUrl: $("new-video-url"),

        exportButton: $("exportButton"),
        exportShareButton: $("exportShareButton"),
        shareButton: $("shareButton"),
        shareBadge: $("shareBadge"),
        exportDate: $("export-date"),
        exportItemCount: $("export-item-count"),
        exportTableBody: $("export-table-body"),
        exportTotal: $("export-total"),
        exportSummary: $("export-summary"),

        lightboxImg: $("lightbox-img"),
        lightboxCaption: $("lightbox-caption"),

        appToast: $("appToast"),
        appToastMessage: $("appToastMessage"),

        themeToggleButton: $("themeToggleButton"),
        currencyRatesList: $("currencyRatesList"),
        currencyUpdatedAt: $("currencyUpdatedAt"),
        refreshRatesButton: $("refreshRatesButton"),

        buildsBar: $("builds-bar"),
        buildsTabs: $("builds-tabs"),
        buildNewButton: $("build-new-button"),
        buildsOverviewButton: $("builds-overview-button"),
        buildEditButton: $("build-edit-button"),
        currentBuildTitle: $("current-build-title"),
        currentBuildDesc: $("current-build-desc"),
        currentBuildIcon: $("current-build-icon"),
        emptyStateTitle: $("empty-state-title"),
        summaryBuildLabel: $("summary-build-label"),
        summaryTotalLabel: $("summary-total-label"),
        summaryOverall: $("summary-overall"),
        planningBuildLabel: $("planning-build-label"),
        walletCaption: $("wallet-caption"),
        exportBuildName: $("export-build-name"),

        editBuildRow: $("edit-build-row"),
        editItemBuildSelect: $("edit-item-build"),
        editItemCopyTo: $("edit-item-copy-to"),

        buildForm: $("build-form"),
        buildUuid: $("build-uuid"),
        buildName: $("build-name"),
        buildDescription: $("build-description"),
        buildColors: $("build-colors"),
        buildModalTitle: $("build-modal-title"),
        buildSubmit: $("build-submit"),
        buildSourceWrap: $("build-source-wrap"),
        buildSource: $("build-source"),
        buildEditActions: $("build-edit-actions"),
        buildDuplicateButton: $("build-duplicate-button"),
        buildDeleteButton: $("build-delete-button"),
        buildDeletePanel: $("build-delete-panel"),
        buildDeleteSummary: $("build-delete-summary"),
        buildDeleteChoices: $("build-delete-choices"),
        buildMoveTo: $("build-move-to"),
        buildDeleteCancel: $("build-delete-cancel"),
        buildDeleteConfirm: $("build-delete-confirm"),

        overviewTotals: $("overview-totals"),
        overviewNote: $("overview-note"),
        overviewGrid: $("overview-grid"),
    };

    // ── Helpers ──────────────────────────────────────────────────────────

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function storageGet(key) {
        try { return window.localStorage.getItem(key); } catch (error) { return null; }
    }
    function storageSet(key, value) {
        try { window.localStorage.setItem(key, value); } catch (error) { /* storage bloqueado: segue sem persistir */ }
    }

    /** Formato fixo em BRL (lista impressa/exportada: o valor real da compra). */
    function formatCurrency(value) {
        return FM.format(Number(value) || 0, "BRL");
    }

    /** Formato na moeda de exibicao escolhida no Resumo (cai para BRL sem cotacao). */
    function formatDisplayCurrency(brlValue) {
        return FM.formatFromBrl(state.exchangeRates, Number(brlValue) || 0, state.displayCurrency);
    }

    function formatShortDate(iso) {
        if (!iso) return "";
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    }

    // ── Financeiro (calculo unico em FpvMoney.summarizeFinance) ──────────

    function finance() {
        return FM.summarizeFinance(state.items, state.wallet, state.otherPurchased);
    }

    // ── Montagens: helpers ───────────────────────────────────────────────

    const buildColor = (key) => BUILD_COLORS[key] || BUILD_COLORS.orange;
    const currentBuildUuid = () => (state.currentBuild ? state.currentBuild.build_uuid : "");
    const buildByUuid = (uuid) => state.builds.find((b) => b.build_uuid === uuid) || null;
    const hasBuilds = () => state.builds.length > 0 && !!state.currentBuild;
    const buildPct = (b) => (b.total > 0 ? Math.min(100, Math.round((b.purchased_total / b.total) * 100)) : 0);

    /** Numeros de TODAS as montagens juntas (a montagem aberta entra com os valores vivos). */
    function overallFinance() {
        const cur = finance();
        let total = cur.total;
        let purchased = cur.purchased;
        state.builds.forEach((b) => {
            if (b.build_uuid !== currentBuildUuid()) {
                total += b.total;
                purchased += b.purchased_total;
            }
        });
        total = FM.round2(total);
        purchased = FM.round2(purchased);
        const toBuy = FM.round2(total - purchased);
        return {
            total, purchased, toBuy,
            balance: cur.balance,
            shortfall: FM.round2(Math.max(0, toBuy - cur.balance)),
            surplus: FM.round2(Math.max(0, cur.balance - toBuy)),
        };
    }

    /** Mantem o resumo da montagem aberta (abas, visao geral) igual aos itens vivos, inclusive apos marcar/desmarcar. */
    function syncCurrentBuildSummary() {
        const build = buildByUuid(currentBuildUuid());
        if (!build) return;
        const fin = finance();
        build.items_count = state.items.length;
        build.purchased_count = state.items.filter((item) => item.is_purchased).length;
        build.total = fin.total;
        build.purchased_total = fin.purchased;
        build.to_buy = fin.toBuy;
        build.target_date = state.planning.target_date;
    }

    function categoryById(id) {
        return state.categories.find((cat) => cat.id === id) || null;
    }

    // ── Cotacoes (USD / BRL / CNY / PYG) ─────────────────────────────────

    function starPoints(cx, cy, radius) {
        const points = [];
        for (let i = 0; i < 10; i += 1) {
            const angle = (Math.PI / 5) * i - Math.PI / 2;
            const r = i % 2 === 0 ? radius : radius * 0.382;
            points.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
        }
        return points.join(" ");
    }

    const FLAG_STYLE = 'style="border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.08);flex-shrink:0;"';
    const FLAG_SVG = {
        USD: `<svg viewBox="0 0 24 16" width="20" height="14" ${FLAG_STYLE}><rect width="24" height="16" fill="#B22234"/><rect y="1.23" width="24" height="1.23" fill="#fff"/><rect y="3.69" width="24" height="1.23" fill="#fff"/><rect y="6.15" width="24" height="1.23" fill="#fff"/><rect y="8.62" width="24" height="1.23" fill="#fff"/><rect y="11.08" width="24" height="1.23" fill="#fff"/><rect y="13.54" width="24" height="1.23" fill="#fff"/><rect width="10" height="8.62" fill="#3C3B6E"/></svg>`,
        BRL: `<svg viewBox="0 0 24 16" width="20" height="14" ${FLAG_STYLE}><rect width="24" height="16" fill="#009B3A"/><polygon points="12,2 22,8 12,14 2,8" fill="#FEDF00"/><circle cx="12" cy="8" r="3.2" fill="#002776"/></svg>`,
        PYG: `<svg viewBox="0 0 24 16" width="20" height="14" ${FLAG_STYLE}><rect width="24" height="16" fill="#D52B1E"/><rect y="5.33" width="24" height="5.33" fill="#fff"/><rect y="10.67" width="24" height="5.33" fill="#0038A8"/></svg>`,
        CNY: `<svg viewBox="0 0 24 16" width="20" height="14" ${FLAG_STYLE}><rect width="24" height="16" fill="#DE2910"/><polygon points="${starPoints(5, 4.6, 2.9)}" fill="#FFDE00"/><polygon points="${starPoints(10, 1.9, 0.95)}" fill="#FFDE00"/><polygon points="${starPoints(12, 3.8, 0.95)}" fill="#FFDE00"/><polygon points="${starPoints(12, 6.4, 0.95)}" fill="#FFDE00"/><polygon points="${starPoints(10, 8.4, 0.95)}" fill="#FFDE00"/></svg>`,
    };

    const RATE_ROWS = [
        { code: "USD", label: "Dólar", unit: "US$ 1" },
        { code: "CNY", label: "Yuan", unit: "¥ 1" },
        { code: "PYG", label: "Guarani", unit: "₲ 1.000" },
        { code: "BRL", label: "Real", unit: "R$ 1" },
    ];

    function renderCurrencyCard() {
        if (!el.currencyRatesList) return;
        const rates = state.exchangeRates;

        if (!rates) {
            el.currencyRatesList.innerHTML = `<div class="flex items-center justify-between py-2"><span class="text-sm text-f91-muted">Não foi possível carregar as cotações.</span></div>`;
            return;
        }

        el.currencyRatesList.innerHTML = RATE_ROWS.map((row) => {
            const value = row.code === "BRL" ? "Moeda base" : (FM.formatRateInBrl(rates, row.code) || "indisponível");
            return `
                <div class="flex items-center justify-between py-1.5">
                    <span class="text-sm text-f91-muted flex items-center gap-2">${FLAG_SVG[row.code]} ${escapeHtml(row.label)} <span class="text-[11px] opacity-70">(${escapeHtml(row.unit)})</span></span>
                    <span class="text-sm font-bold text-f91-text">${escapeHtml(value)}</span>
                </div>
            `;
        }).join("");

        if (el.currencyUpdatedAt) {
            const updated = new Date(rates.fetchedAt);
            el.currencyUpdatedAt.textContent = `Atualizado às ${updated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
        }
    }

    function renderCurrencySwitch() {
        if (!el.currencySwitch) return;
        el.currencySwitch.innerHTML = FM.CODES.map((code) => {
            const available = FM.hasRate(state.exchangeRates, code);
            return `<button type="button" data-currency="${code}" class="currency-switch-btn px-2.5 py-1 rounded-full transition-colors ${available ? "" : "opacity-40 cursor-not-allowed"}" aria-pressed="${code === state.displayCurrency ? "true" : "false"}" ${available ? "" : "disabled"} title="${escapeHtml(FM.CURRENCIES[code].label)}">${code}</button>`;
        }).join("");
    }

    function renderMoneyViews() {
        syncCurrentBuildSummary();
        renderBuildsBar();
        renderItems();
        renderSummary();
        renderWallet();
        renderPlanningCalc();
    }

    function setDisplayCurrency(code) {
        if (!FM.isSupported(code) || !FM.hasRate(state.exchangeRates, code)) return;
        state.displayCurrency = code;
        storageSet(DISPLAY_CURRENCY_KEY, code);
        renderCurrencySwitch();
        renderMoneyViews();
    }

    function populateCurrencySelect(select, selected) {
        if (!select) return;
        select.innerHTML = FM.CODES.map((code) => {
            const available = FM.hasRate(state.exchangeRates, code);
            return `<option value="${code}" ${available ? "" : "disabled"} title="${escapeHtml(FM.CURRENCIES[code].label)}">${FM.CURRENCIES[code].symbol}</option>`;
        }).join("");
        select.value = FM.hasRate(state.exchangeRates, selected) ? selected : "BRL";
    }

    function refreshCurrencySelects() {
        const inputCurrency = storageGet(INPUT_CURRENCY_KEY) || "BRL";
        populateCurrencySelect(el.itemPriceCurrency, el.itemPriceCurrency.value || inputCurrency);
        populateCurrencySelect(el.editItemPriceCurrency, el.editItemPriceCurrency.value || "BRL");
        populateCurrencySelect(el.walletCurrency, el.walletCurrency.value || "BRL");
    }

    /** "≈ R$ 64,20 no câmbio de hoje" para o valor digitado numa moeda estrangeira. */
    function describeConversion(amountRaw, code) {
        const amount = parseFloat(amountRaw);
        if (code === "BRL" || Number.isNaN(amount) || amount <= 0) return "";
        const brl = FM.toBrl(state.exchangeRates, amount, code);
        if (brl === null) return "Sem cotação disponível agora — atualize as cotações ou use R$.";
        const perUnit = FM.brlPerUnit(state.exchangeRates, code);
        return `≈ ${FM.format(brl, "BRL")} no câmbio de hoje (${FM.CURRENCIES[code].symbol} 1 = R$ ${perUnit.toFixed(perUnit < 0.1 ? 4 : 2).replace(".", ",")})`;
    }

    async function loadRates(force) {
        try {
            state.exchangeRates = await FM.fetchRates(force);
        } catch (error) {
            if (force) throw error;
        }
        renderCurrencyCard();
        renderCurrencySwitch();
        refreshCurrencySelects();
        renderMoneyViews();
    }

    async function initCurrency() {
        const saved = storageGet(DISPLAY_CURRENCY_KEY);
        if (saved && FM.isSupported(saved)) state.displayCurrency = saved;

        el.currencySwitch.addEventListener("click", (event) => {
            const btn = event.target.closest("[data-currency]");
            if (btn && !btn.disabled) setDisplayCurrency(btn.dataset.currency);
        });

        if (el.refreshRatesButton) {
            el.refreshRatesButton.addEventListener("click", async () => {
                el.refreshRatesButton.classList.add("animate-spin");
                try {
                    await loadRates(true);
                } catch (error) {
                    showAppToast("Não foi possível atualizar a cotação agora.");
                } finally {
                    el.refreshRatesButton.classList.remove("animate-spin");
                }
            });
        }

        renderCurrencySwitch();
        refreshCurrencySelects();
        await loadRates(false);
        if (state.displayCurrency !== "BRL" && !FM.hasRate(state.exchangeRates, state.displayCurrency)) {
            state.displayCurrency = "BRL";
        }
        renderCurrencySwitch();
    }

    // ── Tema claro/escuro ────────────────────────────────────────────────

    function applyTheme(theme) {
        document.documentElement.classList.toggle("dark", theme === "dark");
    }

    function initTheme() {
        if (!el.themeToggleButton) return;
        el.themeToggleButton.addEventListener("click", () => {
            const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
            applyTheme(next);
            storageSet(THEME_STORAGE_KEY, next);
        });
    }

    async function apiRequest(action, { params = {}, formData = null, method = "GET" } = {}) {
        let url = `${API_URL}?action=${encodeURIComponent(action)}`;
        let options = { method };

        if (formData) {
            options.method = "POST";
            options.body = formData;
        } else if (method === "GET") {
            const query = new URLSearchParams(params);
            if ([...query].length) url += `&${query.toString()}`;
        } else {
            options.body = new URLSearchParams(params);
        }

        const response = await fetch(url, options);
        const payload = await response.json().catch(() => ({ success: false, message: "Resposta invalida do servidor." }));

        if (!payload.success) {
            const error = new Error(payload.message || "Erro desconhecido.");
            error.status = response.status;
            error.payload = payload;
            throw error;
        }
        return payload;
    }

    window.openModal = function openModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.remove("modal-enter");
        modal.classList.add("modal-enter-active");
        const panel = modal.querySelector(".modal-scale-enter");
        if (panel) {
            panel.classList.remove("modal-scale-enter");
            panel.classList.add("modal-scale-enter-active");
        }
    };

    window.closeModal = function closeModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.remove("modal-enter-active");
        modal.classList.add("modal-enter");
        const panel = modal.querySelector(".modal-scale-enter-active");
        if (panel) {
            panel.classList.remove("modal-scale-enter-active");
            panel.classList.add("modal-scale-enter");
        }
    };

    // API publica para os modulos auxiliares (compartilhamento).
    window.FpvPlanner = {
        apiRequest,
        showToast: (message) => showAppToast(message),
        getItems: () => state.items,
        reloadBoard: () => loadBoard(),
        currentBuild: () => state.currentBuild,
    };

    // ── Auth (a sessao ja e garantida pelo router antes desta pagina carregar) ──

    async function handleLogout() {
        try {
            await apiRequest("logoutFpv", { method: "POST" });
        } catch (error) {
            // Sessao ja pode ter expirado no servidor; segue o logout mesmo assim.
        }
        window.location.href = "/fpv";
    }

    // ── Board loading ────────────────────────────────────────────────────

    async function loadBoard(buildUuid) {
        try {
            const wanted = buildUuid || currentBuildUuid() || storageGet(BUILD_KEY) || "";
            const payload = await apiRequest("getFpvBoard", { params: wanted ? { build: wanted } : {} });
            state.categories = payload.categories;
            state.items = payload.items;
            state.planning = payload.planning;
            state.videos = payload.videos;
            state.wallet = payload.wallet || null;
            state.share = payload.share || null;
            state.builds = payload.builds || [];
            state.currentBuild = payload.current_build || null;
            if (state.currentBuild) storageSet(BUILD_KEY, state.currentBuild.build_uuid);

            // A carteira e unica: o que ja foi gasto em OUTRAS montagens tambem sai do saldo desta.
            const purchasedHere = state.items.filter((item) => item.is_purchased).reduce((sum, item) => sum + (Number(item.price) || 0), 0);
            state.otherPurchased = state.wallet ? Math.max(0, FM.round2(state.wallet.purchased_total - purchasedHere)) : 0;

            renderAll();
        } catch (error) {
            if (error.status === 401) {
                window.location.href = "/fpv/login";
                return;
            }
            alert("Erro ao carregar dados: " + error.message);
        }
    }

    function renderAll() {
        syncCurrentBuildSummary();
        renderBuildsBar();
        renderCategories();
        renderItems();
        renderSummary();
        renderWallet();
        renderPlanningInputs();
        renderPlanningCalc();
        renderVideos();
        renderShareBadge();
    }

    // ── Categories ───────────────────────────────────────────────────────

    function renderCategories() {
        if (!state.categories.length) {
            el.categoriesLegend.innerHTML = `<p class="text-xs text-f91-muted">Nenhuma categoria ainda.</p>`;
        } else {
            el.categoriesLegend.innerHTML = state.categories.map((cat) => `
                <span class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${escapeHtml(cat.color_class)}" data-category-id="${cat.id}">
                    ${escapeHtml(cat.name)}
                    <button type="button" class="opacity-50 hover:opacity-100 transition-opacity" data-action="delete-category" data-category-id="${cat.id}" title="Remover categoria">
                        <i class="ph ph-x text-[10px]"></i>
                    </button>
                </span>
            `).join("");
        }

        const currentAdd = el.itemCategorySelect.value;
        const options = [`<option value="">Sem categoria</option>`]
            .concat(state.categories.map((cat) => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`));
        el.itemCategorySelect.innerHTML = options.join("");
        el.itemCategorySelect.value = currentAdd;
        el.editItemCategorySelect.innerHTML = options.join("");
    }

    async function handleAddCategorySubmit(event) {
        event.preventDefault();
        const name = el.catName.value.trim();
        if (!name) return;

        try {
            await apiRequest("addFpvCategory", { method: "POST", params: { name, color_class: el.catColor.value } });
            el.addCategoryForm.reset();
            window.closeModal("category-modal");
            await loadBoard();
        } catch (error) {
            alert("Erro ao adicionar categoria: " + error.message);
        }
    }

    async function handleDeleteCategory(categoryId) {
        if (!confirm("Remover esta categoria? Os itens dela ficarao sem categoria.")) return;
        try {
            await apiRequest("deleteFpvCategory", { method: "POST", params: { category_id: categoryId } });
            await loadBoard();
        } catch (error) {
            alert("Erro ao remover categoria: " + error.message);
        }
    }

    // ── Items ────────────────────────────────────────────────────────────

    function feedbackInfo(uuid) {
        const by = state.share && state.share.by_item ? state.share.by_item[uuid] : null;
        return by && (by.like > 0 || by.dislike > 0 || by.doubt > 0 || by.comments > 0 || by.unread > 0) ? by : null;
    }

    function renderItems() {
        el.itemCount.textContent = `${state.items.length} ${state.items.length === 1 ? "item" : "itens"}`;

        if (!state.items.length) {
            if (el.emptyStateTitle) {
                el.emptyStateTitle.textContent = hasBuilds() ? `Nada em “${state.currentBuild.name}” ainda` : "Nenhum equipamento adicionado";
            }
            el.itemsContainer.innerHTML = "";
            el.itemsContainer.classList.add("hidden");
            el.emptyState.classList.remove("hidden");
            el.emptyState.classList.add("flex");
            return;
        }

        el.itemsContainer.classList.remove("hidden");
        el.emptyState.classList.add("hidden");
        el.emptyState.classList.remove("flex");

        el.itemsContainer.innerHTML = state.items.map((item) => {
            const category = categoryById(item.category_id);
            const purchasedClasses = item.is_purchased ? "opacity-60" : "";
            const nameClasses = item.is_purchased ? "line-through text-f91-muted" : "text-f91-text";
            const thumb = item.image_path
                ? `<img src="/${escapeHtml(item.image_path)}" alt="${escapeHtml(item.name)}" class="w-full h-full object-cover">`
                : `<i class="ph ph-drone text-xl"></i>`;
            const fb = feedbackInfo(item.item_uuid);
            const purchasedInfo = item.is_purchased && item.purchased_at
                ? `<span class="text-[11px] text-green-600 flex items-center gap-1"><i class="ph ph-check-circle"></i> Comprado em ${escapeHtml(formatShortDate(item.purchased_at))}</span>`
                : "";

            return `
                <li class="flex items-center gap-2 sm:gap-4 bg-white dark:bg-f91-card p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all-smooth ${purchasedClasses}" data-item-uuid="${item.item_uuid}" draggable="true">
                    <span class="item-drag-handle hidden sm:block text-gray-300 hover:text-f91-text transition-colors flex-shrink-0 px-1" title="Arraste para reordenar">
                        <i class="ph-bold ph-dots-six-vertical text-lg"></i>
                    </span>
                    <button type="button" class="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center text-f91-muted" data-action="view-image" ${item.image_path ? "" : "disabled"}>
                        ${thumb}
                    </button>
                    <div class="flex-grow min-w-0">
                        <p class="font-medium truncate ${nameClasses}">${escapeHtml(item.name)}</p>
                        <p class="sm:hidden font-bold text-sm text-f91-text mt-0.5 item-price" data-price="${item.price}">${formatDisplayCurrency(item.price)}</p>
                        <div class="flex items-center gap-2 mt-1 flex-wrap">
                            ${category ? `<span class="text-[11px] px-2 py-0.5 rounded-full font-medium ${escapeHtml(category.color_class)}">${escapeHtml(category.name)}</span>` : ""}
                            ${item.store_url ? `<a href="${escapeHtml(item.store_url)}" target="_blank" rel="noopener" class="text-[11px] text-f91-muted hover:text-f91-text flex items-center gap-1"><i class="ph ph-link"></i> Loja</a>` : ""}
                            ${purchasedInfo}
                            ${fb ? `<button type="button" data-action="open-feedback" class="text-[11px] font-semibold text-f91-text bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-full flex items-center gap-1.5 transition-colors" title="Ver opiniões sobre este item">${fb.unread ? `<span class="w-1.5 h-1.5 rounded-full bg-f91-lime"></span>` : ""}<span>👍${fb.like || 0}</span><span>👎${fb.dislike || 0}</span>${fb.doubt ? `<span>🤔${fb.doubt}</span>` : ""}<span class="flex items-center gap-0.5"><i class="ph ph-chat-circle-text"></i>${fb.comments || 0}</span></button>` : ""}
                        </div>
                    </div>
                    <p class="hidden sm:block font-bold text-f91-text text-base flex-shrink-0 whitespace-nowrap item-price" data-price="${item.price}">${formatDisplayCurrency(item.price)}</p>
                    <label class="flex items-center flex-shrink-0 cursor-pointer" title="${item.is_purchased ? "Desfazer compra (o valor volta para a carteira)" : "Marcar como comprado (o valor sai da carteira)"}">
                        <input type="checkbox" data-action="toggle-purchased" ${item.is_purchased ? "checked" : ""} class="w-5 h-5 rounded border-gray-300 text-f91-lime focus:ring-f91-lime cursor-pointer">
                    </label>
                    <button type="button" data-action="edit-item" class="text-gray-300 hover:text-f91-text transition-colors flex-shrink-0" title="Editar item">
                        <i class="ph ph-pencil-simple text-lg"></i>
                    </button>
                    <button type="button" data-action="delete-item" class="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Remover item">
                        <i class="ph ph-trash text-lg"></i>
                    </button>
                </li>
            `;
        }).join("");
    }

    function setImagePreview(box, icon, url) {
        if (url) {
            box.style.backgroundImage = `url(${url})`;
            box.classList.remove("hidden");
            icon.classList.add("hidden");
        } else {
            box.style.backgroundImage = "";
            box.classList.add("hidden");
            icon.classList.remove("hidden");
        }
    }

    function handleImagePreview() {
        const file = el.itemImage.files[0];
        if (!file) {
            if (!state.pendingImport) setImagePreview(el.imagePreview, el.imagePlaceholderIcon, "");
            return;
        }
        state.pendingImport = null;
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(el.imagePreview, el.imagePlaceholderIcon, e.target.result);
        reader.readAsDataURL(file);
    }

    function setItemHint(message, tone) {
        const colors = { ok: "text-green-600", warn: "text-amber-600", error: "text-red-500", muted: "text-f91-muted" };
        el.itemFormHint.className = `flex-grow text-xs leading-snug min-h-[16px] ${colors[tone || "muted"]}`;
        el.itemFormHint.textContent = message || "";
    }

    function updateItemPriceHint() {
        const conversion = describeConversion(el.itemPrice.value, el.itemPriceCurrency.value);
        if (conversion) {
            setItemHint(conversion, "muted");
        } else if (el.itemFormHint.textContent.startsWith("≈")) {
            setItemHint("");
        }
    }

    async function handleAddItemSubmit(event) {
        event.preventDefault();
        const name = el.itemName.value.trim();
        const rawPrice = parseFloat(el.itemPrice.value);
        if (!name || Number.isNaN(rawPrice)) return;

        const currency = el.itemPriceCurrency.value;
        const priceBrl = FM.toBrl(state.exchangeRates, rawPrice, currency);
        if (priceBrl === null) {
            alert("Sem cotação disponível para converter esse valor. Atualize as cotações ou informe o preço em R$.");
            return;
        }

        const formData = new FormData();
        formData.append("name", name);
        formData.append("price", String(priceBrl));
        formData.append("category_id", el.itemCategorySelect.value);
        formData.append("store_url", el.itemUrl.value.trim());
        if (currentBuildUuid()) formData.append("build_uuid", currentBuildUuid());
        if (el.itemImage.files[0]) {
            formData.append("image", el.itemImage.files[0]);
        } else if (state.pendingImport) {
            formData.append("import_image", state.pendingImport.token);
        }

        const submitButton = el.addItemForm.querySelector("button[type=submit]");
        submitButton.disabled = true;

        try {
            await apiRequest("addFpvItem", { formData });
            storageSet(INPUT_CURRENCY_KEY, currency);
            el.addItemForm.reset();
            state.pendingImport = null;
            state.lastAutoName = "";
            setImagePreview(el.imagePreview, el.imagePlaceholderIcon, "");
            refreshCurrencySelects();
            setItemHint("");
            await loadBoard();
        } catch (error) {
            alert("Erro ao adicionar item: " + error.message);
        } finally {
            submitButton.disabled = false;
        }
    }

    // ── Importar produto por link / botao magico ─────────────────────────

    function looksLikeUrl(text) {
        return /^(https?:\/\/|www\.)\S+/i.test(text) || /^[a-z0-9-]+(\.[a-z0-9-]+)+\/\S+/i.test(text);
    }

    function setImporting(loading) {
        el.importLinkButton.disabled = loading;
        el.importLinkIcon.className = loading ? "ph-bold ph-circle-notch animate-spin" : "ph-bold ph-magic-wand";
        el.importLinkLabel.textContent = loading ? "Buscando…" : "Preencher";
    }

    /** Preenche o formulario de novo item com o resultado do importador (servidor ou botao magico). */
    function applyImportedProduct(product, notes, source) {
        const filled = [];

        if (product.title && (!el.itemName.value.trim() || el.itemName.value === state.lastAutoName)) {
            el.itemName.value = product.title;
            state.lastAutoName = product.title;
            filled.push("nome");
        }
        if (product.url) {
            el.itemUrl.value = product.url;
        }

        let priceMessage = "";
        if (product.price != null && product.price > 0) {
            const cur = FM.hasRate(state.exchangeRates, product.currency) ? product.currency : "BRL";
            const amount = cur === product.currency ? product.price : (FM.toBrl(state.exchangeRates, product.price, product.currency) ?? product.price);
            el.itemPriceCurrency.value = cur;
            el.itemPrice.value = amount.toFixed(2);
            filled.push("preço");
            if (product.currency && cur !== product.currency && product.currency !== "BRL") {
                priceMessage = ` O preço veio em ${product.currency} sem cotação disponível — confira o valor.`;
            }
        }

        if (product.image) {
            state.pendingImport = { token: product.image.token, url: product.image.url };
            el.itemImage.value = "";
            setImagePreview(el.imagePreview, el.imagePlaceholderIcon, product.image.url);
            filled.push("foto");
        }

        const storeLabel = product.store ? ` de ${product.store}` : "";
        const missingPrice = product.price == null || product.price <= 0;
        const parts = [];
        if (filled.length) {
            parts.push(`✓ ${filled.join(", ")} importado${filled.length > 1 ? "s" : ""}${storeLabel}. Escolha a categoria e confira.`);
        }
        if (missingPrice) {
            parts.push(source === "clip"
                ? "Não achei o preço nessa página — digite o valor abaixo."
                : "Falta o preço: essa loja só o mostra no navegador. Digite abaixo (R$, US$, ¥ ou ₲ — eu converto) ou use o botão mágico.");
        }
        (notes || []).forEach((note) => parts.push(note));
        if (priceMessage) parts.push(priceMessage.trim());

        setItemHint(parts.join(" "), missingPrice ? "warn" : "ok");
        updateConversionOnly();

        if (missingPrice) el.itemPrice.focus();
        else el.itemCategorySelect.focus();
    }

    function updateConversionOnly() {
        const conversion = describeConversion(el.itemPrice.value, el.itemPriceCurrency.value);
        if (conversion) {
            el.itemFormHint.textContent = `${el.itemFormHint.textContent} ${conversion}`.trim();
        }
    }

    async function runImport() {
        const rawUrl = el.itemUrl.value.trim();
        if (!rawUrl) {
            setItemHint("Cole primeiro o link do produto no campo acima.", "warn");
            el.itemUrl.focus();
            return;
        }
        if (!looksLikeUrl(rawUrl)) {
            setItemHint("Isso não parece um link. Cole o endereço completo da página do produto.", "warn");
            return;
        }

        setImporting(true);
        setItemHint("Buscando nome, foto e preço do produto…", "muted");
        try {
            const payload = await apiRequest("importFpvProduct", { method: "POST", params: { url: rawUrl } });
            applyImportedProduct(payload.product, payload.notes, "server");
        } catch (error) {
            const notes = error.payload && error.payload.notes ? ` ${error.payload.notes.join(" ")}` : "";
            setItemHint(`${error.message}${notes}`, "error");
        } finally {
            setImporting(false);
        }
    }

    function handleItemUrlPaste() {
        window.setTimeout(() => {
            const value = el.itemUrl.value.trim();
            if (looksLikeUrl(value) && !el.itemName.value.trim()) runImport();
        }, 60);
    }

    async function refreshPriceFromLink() {
        const url = el.editItemUrl.value.trim();
        if (!url || !looksLikeUrl(url)) {
            el.editItemHint.textContent = "Informe o link da loja para atualizar o preço.";
            return;
        }
        el.editRefreshIcon.className = "ph ph-circle-notch animate-spin";
        el.editRefreshPrice.disabled = true;
        el.editItemHint.textContent = "Consultando a loja…";
        try {
            const payload = await apiRequest("importFpvProduct", { method: "POST", params: { url, price_only: "1" } });
            const product = payload.product;
            if (product.price == null || product.price <= 0) {
                el.editItemHint.textContent = "Essa loja não mostra o preço para leitura automática — digite o valor ou use o botão mágico.";
                return;
            }
            const cur = FM.hasRate(state.exchangeRates, product.currency) ? product.currency : "BRL";
            const previous = parseFloat(el.editItemPrice.value);
            el.editItemPriceCurrency.value = cur;
            el.editItemPrice.value = product.price.toFixed(2);
            const conversion = describeConversion(el.editItemPrice.value, cur);
            const before = Number.isNaN(previous) ? "" : ` (antes: ${FM.format(previous, "BRL")})`;
            el.editItemHint.textContent = `Preço atualizado pelo link: ${FM.format(product.price, cur)}${before}. ${conversion}`.trim();
        } catch (error) {
            el.editItemHint.textContent = error.message;
        } finally {
            el.editRefreshIcon.className = "ph ph-arrows-clockwise";
            el.editRefreshPrice.disabled = false;
        }
    }

    async function handleClipHash() {
        const payload = Clip && Clip.decodePayload(window.location.hash);
        if (!payload) return;
        window.history.replaceState({}, "", window.location.pathname + window.location.search);

        el.addItemForm.scrollIntoView({ behavior: "smooth", block: "center" });
        el.itemUrl.value = payload.url;
        setImporting(true);
        setItemHint("Trazendo os dados capturados…", "muted");
        try {
            const response = await apiRequest("importFpvProduct", {
                method: "POST",
                params: {
                    url: payload.url,
                    client_data: "1",
                    title: payload.title,
                    price_text: payload.price_text,
                    currency: payload.currency,
                    image_url: payload.image,
                },
            });
            applyImportedProduct(response.product, response.notes, "clip");
            showAppToast("Produto capturado! Confira os dados e salve.");
        } catch (error) {
            setItemHint(error.message, "error");
        } finally {
            setImporting(false);
        }
    }

    function initClipModal() {
        if (!Clip || !el.clipBookmarklet) return;
        const code = Clip.bookmarkletCode(window.location.origin);
        el.clipBookmarklet.setAttribute("href", code);
        el.clipCopyButton.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(code);
                showAppToast("Código copiado! Cole no endereço de um favorito.");
            } catch (error) {
                window.prompt("Copie o código abaixo (Ctrl+C):", code);
            }
        });
    }

    // ── Editar item ──────────────────────────────────────────────────────

    function openEditItemModal(item) {
        el.editItemUuid.value = item.item_uuid;
        el.editItemName.value = item.name;
        populateCurrencySelect(el.editItemPriceCurrency, "BRL");
        el.editItemPrice.value = Number(item.price).toFixed(2);
        el.editItemHint.textContent = "";
        el.editItemUrl.value = item.store_url || "";
        el.editItemCategorySelect.value = item.category_id || "";
        const many = state.builds.length > 1;
        el.editBuildRow.classList.toggle("hidden", !many);
        if (many) {
            const current = currentBuildUuid();
            el.editItemBuildSelect.innerHTML = state.builds
                .map((b) => `<option value="${escapeHtml(b.build_uuid)}" ${b.build_uuid === current ? "selected" : ""}>${escapeHtml(b.name)}</option>`).join("");
            el.editItemCopyTo.innerHTML = `<option value="">Escolha…</option>` + state.builds
                .filter((b) => b.build_uuid !== current)
                .map((b) => `<option value="${escapeHtml(b.build_uuid)}">${escapeHtml(b.name)}</option>`).join("");
        }
        el.editItemImage.value = "";
        setImagePreview(el.editImagePreview, el.editImagePlaceholderIcon, item.image_path ? `/${item.image_path}` : "");
        window.openModal("edit-item-modal");
    }

    function handleEditImagePreview() {
        const file = el.editItemImage.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(el.editImagePreview, el.editImagePlaceholderIcon, e.target.result);
        reader.readAsDataURL(file);
    }

    async function handleEditItemSubmit(event) {
        event.preventDefault();
        const itemUuid = el.editItemUuid.value;
        const name = el.editItemName.value.trim();
        const rawPrice = parseFloat(el.editItemPrice.value);
        if (!itemUuid || !name || Number.isNaN(rawPrice)) return;

        const priceBrl = FM.toBrl(state.exchangeRates, rawPrice, el.editItemPriceCurrency.value);
        if (priceBrl === null) {
            alert("Sem cotação disponível para converter esse valor. Atualize as cotações ou informe o preço em R$.");
            return;
        }

        const formData = new FormData();
        formData.append("item_uuid", itemUuid);
        formData.append("name", name);
        formData.append("price", String(priceBrl));
        formData.append("category_id", el.editItemCategorySelect.value);
        formData.append("store_url", el.editItemUrl.value.trim());
        if (el.editItemImage.files[0]) {
            formData.append("image", el.editItemImage.files[0]);
        }
        const targetBuild = el.editBuildRow.classList.contains("hidden") ? "" : el.editItemBuildSelect.value;
        const moving = targetBuild && targetBuild !== currentBuildUuid();
        if (moving) formData.append("build_uuid", targetBuild);

        const submitButton = el.editItemForm.querySelector("button[type=submit]");
        submitButton.disabled = true;

        try {
            await apiRequest("updateFpvItem", { formData });
            window.closeModal("edit-item-modal");
            if (moving) {
                const target = buildByUuid(targetBuild);
                showAppToast(`Item movido${target ? ` para “${target.name}”` : ""}.`);
            }
            await loadBoard();
        } catch (error) {
            alert("Erro ao salvar item: " + error.message);
        } finally {
            submitButton.disabled = false;
        }
    }

    /** Copia o item aberto no modal para outra montagem (mesma peca em dois projetos). */
    async function handleCopyItem() {
        const targetUuid = el.editItemCopyTo.value;
        const itemUuid = el.editItemUuid.value;
        if (!targetUuid || !itemUuid) return;
        try {
            const payload = await apiRequest("copyFpvItem", { method: "POST", params: { item_uuid: itemUuid, build_uuid: targetUuid } });
            state.builds = payload.builds || state.builds;
            renderMoneyViews();
            showAppToast(`Copiado para “${payload.build.name}” (como pendente).`);
        } catch (error) {
            alert("Erro ao copiar item: " + error.message);
        } finally {
            el.editItemCopyTo.value = "";
        }
    }

    /** Move um item para outra montagem (arrastar para a aba). */
    async function moveItemToBuild(itemUuid, buildUuid) {
        const item = state.items.find((it) => it.item_uuid === itemUuid);
        const target = buildByUuid(buildUuid);
        if (!item || !target || buildUuid === currentBuildUuid()) return;
        try {
            await apiRequest("updateFpvItem", { method: "POST", params: { item_uuid: itemUuid, build_uuid: buildUuid } });
            showAppToast(`“${item.name}” foi para “${target.name}”.`);
            await loadBoard();
        } catch (error) {
            alert("Erro ao mover item: " + error.message);
        }
    }

    async function handleTogglePurchased(itemUuid, isPurchased) {
        const item = state.items.find((it) => it.item_uuid === itemUuid);
        if (!item) {
            // Compra feita em outra montagem (vem do extrato da carteira): so da para desfazer.
            try {
                await apiRequest("updateFpvItem", { method: "POST", params: { item_uuid: itemUuid, is_purchased: isPurchased ? "1" : "0" } });
                await loadBoard();
                showAppToast("Compra desfeita: o valor voltou para a carteira.");
            } catch (error) {
                alert("Erro ao atualizar item: " + error.message);
            }
            return;
        }

        // Atualizacao otimista: a carteira e derivada dos itens, entao o saldo muda na hora.
        item.is_purchased = isPurchased;
        item.purchased_at = isPurchased ? new Date().toISOString() : null;
        renderMoneyViews();

        try {
            await apiRequest("updateFpvItem", { method: "POST", params: { item_uuid: itemUuid, is_purchased: isPurchased ? "1" : "0" } });
            const fin = finance();
            showAppToast(isPurchased
                ? `Comprado! ${formatDisplayCurrency(item.price)} saíram da carteira — saldo ${formatDisplayCurrency(fin.balance)}.`
                : `Compra desfeita: ${formatDisplayCurrency(item.price)} voltaram para a carteira — saldo ${formatDisplayCurrency(fin.balance)}.`);
        } catch (error) {
            alert("Erro ao atualizar item: " + error.message);
            await loadBoard();
        }
    }

    async function handleDeleteItem(itemUuid) {
        if (!confirm("Remover este item da lista?")) return;
        try {
            await apiRequest("deleteFpvItem", { method: "POST", params: { item_uuid: itemUuid } });
            await loadBoard();
        } catch (error) {
            alert("Erro ao remover item: " + error.message);
        }
    }

    function handleItemsContainerClick(event) {
        const viewImageBtn = event.target.closest('[data-action="view-image"]');
        const editBtn = event.target.closest('[data-action="edit-item"]');
        const deleteBtn = event.target.closest('[data-action="delete-item"]');
        const feedbackBtn = event.target.closest('[data-action="open-feedback"]');
        const li = event.target.closest("li[data-item-uuid]");
        if (!li) return;
        const itemUuid = li.dataset.itemUuid;
        const item = state.items.find((it) => it.item_uuid === itemUuid);

        if (viewImageBtn && item && item.image_path) {
            el.lightboxImg.src = "/" + item.image_path;
            el.lightboxCaption.textContent = item.name;
            window.openModal("lightbox-modal");
            return;
        }

        if (editBtn && item) {
            openEditItemModal(item);
            return;
        }

        if (feedbackBtn && window.FpvShare) {
            window.FpvShare.open({ itemUuid });
            return;
        }

        if (deleteBtn) {
            handleDeleteItem(itemUuid);
        }
    }

    function handleItemsContainerChange(event) {
        if (event.target.dataset.action !== "toggle-purchased") return;
        const li = event.target.closest("li[data-item-uuid]");
        if (!li) return;
        handleTogglePurchased(li.dataset.itemUuid, event.target.checked);
    }

    // ── Arrastar para reordenar ──────────────────────────────────────────

    function clearDragOverClasses() {
        el.itemsContainer.querySelectorAll("li[data-item-uuid]").forEach((li) => {
            li.classList.remove("drag-over-top", "drag-over-bottom");
        });
    }

    function handleItemsDragStart(event) {
        const li = event.target.closest("li[data-item-uuid]");
        if (!li) return;
        state.dragUuid = li.dataset.itemUuid;
        li.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", li.dataset.itemUuid);
    }

    function handleItemsDragOver(event) {
        const li = event.target.closest("li[data-item-uuid]");
        if (!li || !state.dragUuid || li.dataset.itemUuid === state.dragUuid) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";

        const rect = li.getBoundingClientRect();
        const isTopHalf = event.clientY < rect.top + rect.height / 2;
        clearDragOverClasses();
        li.classList.toggle("drag-over-top", isTopHalf);
        li.classList.toggle("drag-over-bottom", !isTopHalf);
    }

    async function handleItemsDrop(event) {
        const li = event.target.closest("li[data-item-uuid]");
        clearDragOverClasses();
        if (!li || !state.dragUuid || li.dataset.itemUuid === state.dragUuid) return;
        event.preventDefault();

        const draggedLi = el.itemsContainer.querySelector(`li[data-item-uuid="${state.dragUuid}"]`);
        if (!draggedLi) return;

        const rect = li.getBoundingClientRect();
        const isTopHalf = event.clientY < rect.top + rect.height / 2;
        li.insertAdjacentElement(isTopHalf ? "beforebegin" : "afterend", draggedLi);

        const newOrder = Array.from(el.itemsContainer.querySelectorAll("li[data-item-uuid]")).map((node) => node.dataset.itemUuid);
        state.items.sort((a, b) => newOrder.indexOf(a.item_uuid) - newOrder.indexOf(b.item_uuid));

        try {
            const body = new URLSearchParams();
            newOrder.forEach((uuid) => body.append("order[]", uuid));
            await fetch(`${API_URL}?action=reorderFpvItems`, { method: "POST", body });
        } catch (error) {
            showAppToast("Nao foi possivel salvar a nova ordem.");
        }
    }

    function handleItemsDragEnd() {
        state.dragUuid = null;
        clearDragOverClasses();
        el.itemsContainer.querySelectorAll("li.is-dragging").forEach((li) => li.classList.remove("is-dragging"));
    }

    // ── Resumo financeiro ────────────────────────────────────────────────

    function renderSummary() {
        const fin = finance();
        const round = (value) => Math.round(value);
        const many = state.builds.length > 1;

        if (el.summaryBuildLabel) {
            el.summaryBuildLabel.classList.toggle("hidden", !hasBuilds());
            if (hasBuilds()) {
                el.summaryBuildLabel.innerHTML = `<span class="inline-flex items-center gap-1.5"><span class="build-dot" style="--build-color:${buildColor(state.currentBuild.color)}"></span><span class="truncate">${escapeHtml(state.currentBuild.name)}</span></span>`;
            }
        }
        if (el.summaryTotalLabel) el.summaryTotalLabel.textContent = hasBuilds() ? "Custo total desta montagem" : "Custo total do setup";
        if (el.summaryOverall) {
            el.summaryOverall.classList.toggle("hidden", !many);
            if (many) {
                const all = overallFinance();
                el.summaryOverall.innerHTML = `<strong class="text-f91-text">Todas as ${state.builds.length} montagens:</strong> ${escapeHtml(formatDisplayCurrency(all.total))} no total, `
                    + `falta comprar <strong class="text-f91-text">${escapeHtml(formatDisplayCurrency(all.toBuy))}</strong> — `
                    + (all.shortfall > 0
                        ? `faltam juntar <strong class="text-red-500">${escapeHtml(formatDisplayCurrency(all.shortfall))}</strong> (a carteira é uma só).`
                        : `a carteira cobre tudo${all.surplus > 0 ? ` e ainda sobram ${escapeHtml(formatDisplayCurrency(all.surplus))}` : ""}.`);
            }
        }

        el.displayTotalCost.textContent = formatDisplayCurrency(fin.total);
        el.displayPurchased.textContent = formatDisplayCurrency(fin.purchased);
        el.displayToBuy.textContent = formatDisplayCurrency(fin.toBuy);
        el.displaySaved.textContent = formatDisplayCurrency(fin.balance);
        el.displaySaved.className = `text-lg font-semibold ${fin.balance < 0 ? "text-red-500" : "text-f91-text"}`;
        el.displayRemaining.textContent = formatDisplayCurrency(fin.shortfall);
        el.displayRemaining.className = `text-lg font-semibold ${fin.shortfall > 0 ? "text-red-500" : "text-green-600"}`;

        el.displayProgressPct.textContent = `${round(fin.purchasedPct)}%`;
        el.progressBar.style.width = `${fin.purchasedPct}%`;
        el.progressBarCovered.style.width = `${fin.coveredPct}%`;
        el.progressTrack.setAttribute("aria-valuenow", String(round(fin.purchasedPct)));
        el.legendPurchasedPct.textContent = `${round(fin.purchasedPct)}%`;
        el.legendCoveredPct.textContent = `${round(fin.coveredPct)}%`;

        let note = "";
        if (!state.items.length) {
            note = "Adicione itens à lista para acompanhar o progresso da compra.";
        } else if (fin.toBuy <= 0) {
            note = hasBuilds() ? "Montagem completa: todos os itens já foram comprados. 🎉" : "Setup completo: todos os itens já foram comprados. 🎉";
        } else if (fin.balance < 0) {
            note = `Você gastou ${formatDisplayCurrency(-fin.balance)} além do que tinha na carteira — adicione dinheiro para equilibrar.`;
        } else if (fin.shortfall <= 0) {
            note = `A carteira já cobre tudo o que falta comprar${fin.surplus > 0 ? ` e ainda sobram ${formatDisplayCurrency(fin.surplus)}` : ""}.`;
        } else {
            note = `A carteira cobre ${round((fin.covered / fin.toBuy) * 100)}% do que falta comprar. Faltam ${formatDisplayCurrency(fin.shortfall)} para fechar o setup.`;
        }
        el.summaryNote.textContent = note;
    }

    // ── Carteira ─────────────────────────────────────────────────────────

    function statementRows() {
        const rows = [];
        const entries = state.wallet && Array.isArray(state.wallet.entries) ? state.wallet.entries : [];
        entries.forEach((entry) => rows.push({
            kind: entry.type,
            id: entry.id,
            amount: entry.amount,
            label: entry.note || (entry.type === "deposit" ? "Depósito" : "Retirada"),
            at: entry.created_at,
        }));
        const many = state.builds.length > 1;
        const current = state.currentBuild;
        // Compras da montagem aberta (vivas: marcar/desmarcar e otimista) + as das outras montagens (do servidor).
        state.items.filter((item) => item.is_purchased).forEach((item) => rows.push({
            kind: "purchase",
            uuid: item.item_uuid,
            amount: item.price,
            label: item.name,
            at: item.purchased_at || item.created_at,
            build: many && current ? { name: current.name, color: current.color } : null,
        }));
        const others = state.wallet && Array.isArray(state.wallet.purchases) ? state.wallet.purchases : [];
        others.filter((p) => p.build_uuid !== currentBuildUuid()).forEach((p) => rows.push({
            kind: "purchase",
            uuid: p.item_uuid,
            amount: p.price,
            label: p.name,
            at: p.purchased_at,
            build: many ? { name: p.build_name, color: p.build_color } : null,
        }));
        rows.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
        return rows;
    }

    function renderWallet() {
        const fin = finance();
        const walletReady = state.wallet !== null;

        el.displayWalletBalance.textContent = formatDisplayCurrency(fin.balance);
        el.displayWalletBalance.className = `text-3xl font-bold ${fin.balance < 0 ? "text-red-500" : "text-green-600"}`;
        el.walletStatIn.textContent = formatDisplayCurrency(fin.deposits);
        el.walletStatPurchases.textContent = formatDisplayCurrency(fin.purchased + state.otherPurchased);
        if (el.walletCaption) el.walletCaption.classList.toggle("hidden", state.builds.length < 2);
        el.walletStatOut.textContent = formatDisplayCurrency(fin.withdrawals);
        el.walletAddButton.disabled = !walletReady;
        el.walletWithdrawButton.disabled = !walletReady;

        let hint;
        if (!walletReady) {
            hint = "Carteira indisponível no momento (atualização do banco em andamento).";
        } else if (fin.balance < 0) {
            hint = "Saldo negativo: você já comprou mais do que colocou na carteira.";
        } else if (fin.deposits === 0 && fin.withdrawals === 0 && fin.purchased + state.otherPurchased === 0) {
            hint = "Informe quanto você tem disponível para começar.";
        } else if (state.builds.length > 1 && overallFinance().toBuy > 0) {
            hint = `Disponível para o que falta comprar nas ${state.builds.length} montagens (${formatDisplayCurrency(overallFinance().toBuy)}).`;
        } else if (fin.toBuy > 0) {
            hint = `Disponível para comprar o que falta (${formatDisplayCurrency(fin.toBuy)}).`;
        } else {
            hint = "Tudo comprado. O saldo é o que sobrou.";
        }
        el.walletBalanceHint.textContent = hint;

        const rows = statementRows();
        if (!rows.length) {
            el.walletStatement.innerHTML = `<li class="text-xs text-f91-muted text-center py-4">Nenhuma movimentação ainda.</li>`;
            return;
        }

        const visual = {
            deposit: { icon: "ph-arrow-down-left", box: "bg-green-100 text-green-600", sign: "+", amountClass: "text-green-600" },
            withdrawal: { icon: "ph-arrow-up-right", box: "bg-red-100 text-red-500", sign: "−", amountClass: "text-red-500" },
            purchase: { icon: "ph-shopping-bag", box: "bg-orange-100 text-orange-600", sign: "−", amountClass: "text-f91-text" },
        };

        el.walletStatement.innerHTML = rows.map((row) => {
            const v = visual[row.kind];
            const kindLabel = row.kind === "purchase" ? "Compra" : (row.kind === "deposit" ? "Entrada" : "Saída");
            const action = row.kind === "purchase"
                ? `<button type="button" data-action="undo-purchase" data-uuid="${escapeHtml(row.uuid)}" class="text-[10px] text-f91-muted hover:text-f91-text underline" title="Desfazer compra">desfazer</button>`
                : `<button type="button" data-action="delete-wallet-entry" data-entry-id="${row.id}" class="text-gray-300 hover:text-red-500 transition-colors" title="Remover lançamento"><i class="ph ph-trash text-sm"></i></button>`;
            return `
                <li class="flex items-center gap-2.5 py-1.5">
                    <span class="w-7 h-7 rounded-full ${v.box} flex items-center justify-center flex-shrink-0"><i class="ph-bold ${v.icon} text-sm"></i></span>
                    <div class="min-w-0 flex-grow">
                        <p class="text-xs font-medium text-f91-text truncate">${escapeHtml(row.label)}</p>
                        <p class="text-[10px] text-f91-muted flex flex-wrap items-center gap-x-1.5"><span class="whitespace-nowrap">${kindLabel}${row.at ? " · " + escapeHtml(formatShortDate(row.at)) : ""}</span>${row.build ? `<span class="inline-flex items-center gap-1 max-w-full min-w-0"><span class="build-dot" style="--build-color:${buildColor(row.build.color)};width:7px;height:7px"></span><span class="truncate">${escapeHtml(row.build.name)}</span></span>` : ""}</p>
                    </div>
                    <span class="text-xs font-bold whitespace-nowrap ${v.amountClass}">${v.sign} ${escapeHtml(formatDisplayCurrency(row.amount))}</span>
                    ${action}
                </li>
            `;
        }).join("");
    }

    function openWalletModal(type) {
        el.walletType.value = type;
        el.walletModalTitle.textContent = type === "deposit" ? "Adicionar dinheiro" : "Retirar dinheiro";
        el.walletSubmit.textContent = type === "deposit" ? "Adicionar" : "Retirar";
        populateCurrencySelect(el.walletCurrency, "BRL");
        el.walletAmount.value = "";
        el.walletNote.value = "";
        el.walletConvertHint.textContent = "";
        el.walletNote.placeholder = type === "deposit" ? "Ex: salário, venda de uma peça usada…" : "Ex: usei em outra coisa…";
        window.openModal("wallet-modal");
        window.setTimeout(() => el.walletAmount.focus(), 60);
    }

    async function handleWalletSubmit(event) {
        event.preventDefault();
        const type = el.walletType.value;
        const code = el.walletCurrency.value;
        const rawAmount = parseFloat(el.walletAmount.value);
        if (Number.isNaN(rawAmount) || rawAmount <= 0) return;

        const amountBrl = FM.toBrl(state.exchangeRates, rawAmount, code);
        if (amountBrl === null || amountBrl <= 0) {
            alert("Sem cotação disponível para converter esse valor. Atualize as cotações ou informe em R$.");
            return;
        }

        if (type === "withdrawal") {
            const fin = finance();
            if (amountBrl > fin.balance && !confirm(`Essa retirada (${FM.format(amountBrl, "BRL")}) é maior que o saldo (${FM.format(fin.balance, "BRL")}) e deixa a carteira negativa. Continuar?`)) {
                return;
            }
        }

        let note = el.walletNote.value.trim();
        if (code !== "BRL") {
            note = `${note ? note + " " : ""}(${FM.format(rawAmount, code)})`;
        }

        el.walletSubmit.disabled = true;
        try {
            const payload = await apiRequest("addFpvWalletEntry", { method: "POST", params: { type, amount: String(amountBrl), note } });
            state.wallet = payload.wallet;
            window.closeModal("wallet-modal");
            renderMoneyViews();
            showAppToast(type === "deposit"
                ? `${FM.format(amountBrl, "BRL")} adicionados. Saldo: ${formatDisplayCurrency(finance().balance)}.`
                : `${FM.format(amountBrl, "BRL")} retirados. Saldo: ${formatDisplayCurrency(finance().balance)}.`);
        } catch (error) {
            alert("Erro ao registrar movimentação: " + error.message);
        } finally {
            el.walletSubmit.disabled = false;
        }
    }

    async function handleDeleteWalletEntry(entryId) {
        if (!confirm("Remover este lançamento da carteira?")) return;
        try {
            const payload = await apiRequest("deleteFpvWalletEntry", { method: "POST", params: { entry_id: entryId } });
            state.wallet = payload.wallet;
            renderMoneyViews();
        } catch (error) {
            alert("Erro ao remover lançamento: " + error.message);
        }
    }

    // ── Planejamento (data meta) ─────────────────────────────────────────

    function renderPlanningInputs() {
        el.inputDate.value = state.planning.target_date || "";
        if (el.planningBuildLabel) {
            const show = hasBuilds() && state.builds.length > 1;
            el.planningBuildLabel.classList.toggle("hidden", !show);
            if (show) {
                el.planningBuildLabel.innerHTML = `<span class="inline-flex items-center gap-1.5"><span class="build-dot" style="--build-color:${buildColor(state.currentBuild.color)}"></span><span class="truncate">${escapeHtml(state.currentBuild.name)}</span></span>`;
            }
        }
    }

    function renderPlanningCalc() {
        const fin = finance();
        // O que ainda precisa ser juntado: o que falta comprar menos o saldo da carteira.
        const remaining = fin.shortfall;
        const targetDate = state.planning.target_date ? new Date(`${state.planning.target_date}T00:00:00`) : null;

        if (!targetDate || Number.isNaN(targetDate.getTime())) {
            el.displayTimeLeft.textContent = "--";
            el.displayMonthly.textContent = formatDisplayCurrency(0);
            el.displayWeekly.textContent = formatDisplayCurrency(0);
            el.displayDaily.textContent = formatDisplayCurrency(0);
            renderCalendar(0, 0);
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const msPerDay = 24 * 60 * 60 * 1000;
        const daysLeft = Math.ceil((targetDate.getTime() - today.getTime()) / msPerDay);

        if (remaining <= 0) {
            el.displayTimeLeft.textContent = fin.toBuy <= 0 && state.items.length ? "Setup completo!" : "Meta atingida!";
            el.displayMonthly.textContent = formatDisplayCurrency(0);
            el.displayWeekly.textContent = formatDisplayCurrency(0);
            el.displayDaily.textContent = formatDisplayCurrency(0);
            renderCalendar(1, 1);
            return;
        }

        if (daysLeft <= 0) {
            el.displayTimeLeft.textContent = "Data vencida";
            el.displayMonthly.textContent = formatDisplayCurrency(remaining);
            el.displayWeekly.textContent = formatDisplayCurrency(remaining);
            el.displayDaily.textContent = formatDisplayCurrency(remaining);
            renderCalendar(0, 1);
            return;
        }

        const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
        const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30));

        el.displayTimeLeft.textContent = daysLeft === 1 ? "1 dia" : `${daysLeft} dias`;
        el.displayMonthly.textContent = formatDisplayCurrency(remaining / monthsLeft);
        el.displayWeekly.textContent = formatDisplayCurrency(remaining / weeksLeft);
        el.displayDaily.textContent = formatDisplayCurrency(remaining / daysLeft);

        const doneFraction = fin.total > 0 ? Math.min(1, (fin.purchased + fin.covered) / fin.total) : 0;
        renderCalendar(doneFraction, Math.min(52, weeksLeft + 1));
    }

    function renderCalendar(filledFraction, totalDots) {
        const dots = Math.max(0, Math.min(52, totalDots || 0));
        if (dots === 0) {
            el.calendarViz.innerHTML = `<p class="text-xs text-f91-muted">Defina uma data meta para visualizar.</p>`;
            return;
        }
        const filledCount = Math.round(dots * (Number.isFinite(filledFraction) ? filledFraction : 0));
        let html = "";
        for (let i = 0; i < dots; i += 1) {
            html += `<span class="calendar-dot ${i < filledCount ? "is-filled" : ""}"></span>`;
        }
        el.calendarViz.innerHTML = html;
    }

    let planningSaveTimer = null;
    function schedulePlanningSave() {
        window.clearTimeout(planningSaveTimer);
        const buildUuid = currentBuildUuid();
        const targetDate = state.planning.target_date || "";
        planningSaveTimer = window.setTimeout(async () => {
            try {
                await apiRequest("saveFpvPlanning", {
                    method: "POST",
                    params: { target_date: targetDate, build_uuid: buildUuid },
                });
            } catch (error) {
                alert("Erro ao salvar planejamento: " + error.message);
            }
        }, 500);
    }

    function handlePlanningDateInput() {
        state.planning.target_date = el.inputDate.value || null;
        renderPlanningCalc();
        schedulePlanningSave();
    }

    // ── Videos ───────────────────────────────────────────────────────────

    function renderVideos() {
        if (!state.videos.length) {
            el.videosListContainer.innerHTML = `<p class="text-xs text-f91-muted p-3 text-center">Nenhum video salvo ainda.</p>`;
            return;
        }
        el.videosListContainer.innerHTML = state.videos.map((video) => `
            <div class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group">
                <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener" class="flex-shrink-0">
                    <img src="https://img.youtube.com/vi/${escapeHtml(video.video_id)}/mqdefault.jpg" alt="" class="w-16 h-10 object-cover rounded-md bg-gray-100">
                </a>
                <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener" class="flex-grow min-w-0 text-xs font-medium text-f91-text hover:text-f91-limeDark truncate">
                    ${escapeHtml(video.title || video.url)}
                </a>
                <button type="button" data-action="delete-video" data-video-id="${video.id}" class="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity flex-shrink-0">
                    <i class="ph ph-trash text-sm"></i>
                </button>
            </div>
        `).join("");
    }

    async function fetchYoutubeTitle(url) {
        try {
            const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
            if (!response.ok) return "";
            const data = await response.json();
            return data.title || "";
        } catch (error) {
            return "";
        }
    }

    async function handleAddVideoSubmit(event) {
        event.preventDefault();
        const url = el.newVideoUrl.value.trim();
        if (!url) return;

        const title = await fetchYoutubeTitle(url);

        try {
            await apiRequest("addFpvVideo", { method: "POST", params: { url, title } });
            el.addVideoForm.reset();
            await loadBoard();
        } catch (error) {
            alert("Erro ao salvar video: " + error.message);
        }
    }

    async function handleDeleteVideo(videoId) {
        try {
            await apiRequest("deleteFpvVideo", { method: "POST", params: { video_id: videoId } });
            await loadBoard();
        } catch (error) {
            alert("Erro ao remover video: " + error.message);
        }
    }

    // ── Compartilhar (badge de opinioes novas) ───────────────────────────

    function renderShareBadge() {
        if (!el.shareBadge) return;
        const unread = state.share ? Number(state.share.unread) || 0 : 0;
        el.shareBadge.textContent = unread > 99 ? "99+" : String(unread);
        el.shareBadge.classList.toggle("hidden", unread === 0);
        el.shareBadge.classList.toggle("flex", unread > 0);
    }

    /** O modulo de compartilhamento avisa quando as opinioes mudam (nova leitura, exclusao, etc.). */
    function handleShareUpdated(event) {
        const detail = event.detail || {};
        state.share = Object.assign(state.share || {}, {
            unread: detail.unread ?? 0,
            by_item: detail.by_item || {},
            is_active: !!(detail.share && detail.share.is_active),
            has_share: !!detail.share,
        });
        const build = buildByUuid(currentBuildUuid());
        if (build) build.unread = detail.unread ?? 0;
        renderBuildsBar();
        renderShareBadge();
        renderItems();
    }

    // ── Export / print ──────────────────────────────────────────────────

    function openExportModal() {
        el.exportDate.textContent = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());
        el.exportItemCount.textContent = `${state.items.length} ${state.items.length === 1 ? "item" : "itens"}`;
        if (el.exportBuildName) {
            el.exportBuildName.textContent = hasBuilds() ? `${state.currentBuild.name}${state.currentBuild.description ? " — " + state.currentBuild.description : ""}` : "";
            el.exportBuildName.classList.toggle("hidden", !hasBuilds());
        }

        el.exportTableBody.innerHTML = state.items.map((item) => {
            const category = categoryById(item.category_id);
            const thumb = item.image_path
                ? `<img src="/${escapeHtml(item.image_path)}" alt="" class="w-full h-full object-cover">`
                : `<i class="ph ph-drone text-lg"></i>`;
            const statusLabel = item.is_purchased
                ? `<span class="text-green-600">Comprado</span>`
                : `<span class="text-slate-400">Pendente</span>`;

            return `
                <div class="flex items-center gap-3 py-3">
                    <div class="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-300">
                        ${thumb}
                    </div>
                    <div class="flex-grow min-w-0">
                        <p class="font-medium text-slate-800 truncate">${escapeHtml(item.name)}</p>
                        ${category ? `<span class="inline-block text-[11px] px-2 py-0.5 rounded-full font-medium mt-1 ${escapeHtml(category.color_class)}">${escapeHtml(category.name)}</span>` : ""}
                    </div>
                    <div class="text-right flex-shrink-0 pl-2">
                        <p class="font-bold text-slate-800 whitespace-nowrap">${formatCurrency(item.price)}</p>
                        <span class="text-[11px]">${statusLabel}</span>
                    </div>
                </div>
            `;
        }).join("") || `<p class="py-6 text-center text-slate-400 text-sm">Nenhum item na lista.</p>`;

        const fin = finance();
        el.exportTotal.textContent = formatCurrency(fin.total);
        if (el.exportSummary) {
            el.exportSummary.innerHTML = `
                <div class="flex justify-between"><span>Já comprado</span><span class="font-semibold text-green-600">${escapeHtml(formatCurrency(fin.purchased))}</span></div>
                <div class="flex justify-between"><span>Falta comprar</span><span class="font-semibold text-slate-700">${escapeHtml(formatCurrency(fin.toBuy))}</span></div>
            `;
        }
        window.openModal("export-modal");
    }

    async function waitForImagesToLoad(container) {
        const images = Array.from(container.querySelectorAll("img"));
        await Promise.all(images.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
                img.addEventListener("load", resolve, { once: true });
                img.addEventListener("error", resolve, { once: true });
            });
        }));
    }

    window.printShoppingList = async function printShoppingList() {
        const button = document.getElementById("printShoppingListButton");
        if (button) button.disabled = true;
        try {
            await waitForImagesToLoad(document.getElementById("print-area"));
            window.print();
        } finally {
            if (button) button.disabled = false;
        }
    };

    // ── Montagens (abas, modal, visao geral) ─────────────────────────────

    function renderBuildHeader() {
        const build = state.currentBuild;
        el.currentBuildTitle.textContent = build ? build.name : "Adicionar à Lista";
        if (el.currentBuildDesc) {
            el.currentBuildDesc.textContent = build ? build.description : "";
            el.currentBuildDesc.classList.toggle("hidden", !build || !build.description);
        }
        el.buildEditButton.classList.toggle("hidden", !build);
        if (el.currentBuildIcon) el.currentBuildIcon.style.color = build ? buildColor(build.color) : "";
        if (el.shareButton) el.shareButton.title = build ? `Compartilhar a lista “${build.name}”` : "Compartilhar minha lista";
    }

    function renderBuildsBar() {
        if (!el.buildsBar) return;
        renderBuildHeader();
        if (!hasBuilds()) {
            el.buildsBar.classList.add("hidden");
            return;
        }
        el.buildsBar.classList.remove("hidden");
        const current = currentBuildUuid();
        el.buildsTabs.innerHTML = state.builds.map((b) => {
            const active = b.build_uuid === current;
            const tip = `${b.name} — ${b.items_count} ${b.items_count === 1 ? "item" : "itens"} · ${buildPct(b)}% comprado`;
            return `<button type="button" role="tab" aria-selected="${active ? "true" : "false"}" data-build-tab="${escapeHtml(b.build_uuid)}" title="${escapeHtml(tip)}" class="build-tab ${active ? "is-active" : ""}" style="--build-color:${buildColor(b.color)}">
                <span class="build-dot"></span>
                <span class="build-tab-name">${escapeHtml(b.name)}</span>
                <span class="build-tab-pct">${buildPct(b)}%</span>
                ${b.unread ? `<span class="w-1.5 h-1.5 rounded-full bg-f91-lime" title="Opiniões novas"></span>` : ""}
            </button>`;
        }).join("");

        if (state.scrollTabs) {
            state.scrollTabs = false;
            const active = el.buildsTabs.querySelector('[aria-selected="true"]');
            if (active) el.buildsTabs.scrollLeft = Math.max(0, active.offsetLeft - 24);
        }
    }

    async function switchBuild(uuid) {
        if (!uuid || uuid === currentBuildUuid()) return;
        state.scrollTabs = true;
        await loadBoard(uuid);
    }

    function handleBuildsTabsClick(event) {
        const tab = event.target.closest("[data-build-tab]");
        if (tab) switchBuild(tab.dataset.buildTab);
    }

    // Arrastar um item para outra aba move o item de montagem.
    function tabFromEvent(event) {
        const tab = event.target.closest("[data-build-tab]");
        return tab && state.dragUuid && tab.dataset.buildTab !== currentBuildUuid() ? tab : null;
    }

    function handleBuildsTabsDragOver(event) {
        const tab = tabFromEvent(event);
        el.buildsTabs.querySelectorAll(".is-drop-target").forEach((node) => { if (node !== tab) node.classList.remove("is-drop-target"); });
        if (!tab) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        tab.classList.add("is-drop-target");
    }

    function handleBuildsTabsDrop(event) {
        const tab = tabFromEvent(event);
        el.buildsTabs.querySelectorAll(".is-drop-target").forEach((node) => node.classList.remove("is-drop-target"));
        if (!tab) return;
        event.preventDefault();
        const uuid = state.dragUuid;
        state.dragUuid = null;
        moveItemToBuild(uuid, tab.dataset.buildTab);
    }

    function renderBuildColorSwatches(selected) {
        el.buildColors.innerHTML = Object.keys(BUILD_COLORS).map((key) => `
            <label class="relative" title="${key}">
                <input type="radio" name="build-color" value="${key}" class="sr-only" ${key === selected ? "checked" : ""}>
                <span class="build-swatch" style="--swatch:${BUILD_COLORS[key]}"><i class="ph-bold ph-check"></i></span>
            </label>`).join("");
    }

    function openBuildModal(build) {
        const editing = !!build;
        el.buildUuid.value = editing ? build.build_uuid : "";
        el.buildName.value = editing ? build.name : "";
        el.buildDescription.value = editing ? (build.description || "") : "";
        const used = new Set(state.builds.map((b) => b.color));
        renderBuildColorSwatches(editing ? build.color : (Object.keys(BUILD_COLORS).find((key) => !used.has(key)) || "orange"));

        el.buildModalTitle.textContent = editing ? "Editar montagem" : "Nova montagem";
        el.buildSubmit.textContent = editing ? "Salvar" : "Criar";
        el.buildSourceWrap.classList.toggle("hidden", editing);
        el.buildEditActions.classList.toggle("hidden", !editing);
        el.buildDeleteButton.disabled = state.builds.length <= 1;
        el.buildDeleteButton.title = state.builds.length <= 1 ? "Você precisa ter pelo menos uma montagem" : "";
        el.buildDeleteButton.classList.toggle("opacity-40", state.builds.length <= 1);
        el.buildDeletePanel.classList.add("hidden");

        el.buildSource.innerHTML = `<option value="">Uma lista vazia</option>` + state.builds
            .map((b) => `<option value="${escapeHtml(b.build_uuid)}">Copiar os ${b.items_count} ${b.items_count === 1 ? "item" : "itens"} de “${escapeHtml(b.name)}”</option>`).join("");

        window.openModal("build-modal");
        window.setTimeout(() => el.buildName.focus(), 60);
    }

    async function handleBuildSubmit(event) {
        event.preventDefault();
        const name = el.buildName.value.trim();
        if (!name) return;
        const color = (el.buildForm.querySelector('input[name="build-color"]:checked') || {}).value || "orange";
        const description = el.buildDescription.value.trim();
        const uuid = el.buildUuid.value;

        el.buildSubmit.disabled = true;
        try {
            if (uuid) {
                await apiRequest("updateFpvBuild", { method: "POST", params: { build_uuid: uuid, name, description, color } });
                window.closeModal("build-modal");
                await loadBoard(uuid);
                showAppToast("Montagem atualizada.");
            } else {
                const payload = await apiRequest("addFpvBuild", { method: "POST", params: { name, description, color, copy_from: el.buildSource.value } });
                window.closeModal("build-modal");
                state.scrollTabs = true;
                await loadBoard(payload.build.build_uuid);
                showAppToast(`Montagem “${name}” criada.`);
            }
        } catch (error) {
            alert("Erro ao salvar montagem: " + error.message);
        } finally {
            el.buildSubmit.disabled = false;
        }
    }

    async function handleBuildDuplicate() {
        const source = buildByUuid(el.buildUuid.value);
        if (!source) return;
        el.buildDuplicateButton.disabled = true;
        try {
            const payload = await apiRequest("addFpvBuild", {
                method: "POST",
                params: { name: `${source.name} (cópia)`.slice(0, 80), description: source.description || "", color: source.color, copy_from: source.build_uuid },
            });
            window.closeModal("build-modal");
            state.scrollTabs = true;
            await loadBoard(payload.build.build_uuid);
            showAppToast(`Duplicada: ${source.items_count} ${source.items_count === 1 ? "item copiado" : "itens copiados"} como pendentes.`);
        } catch (error) {
            alert("Erro ao duplicar montagem: " + error.message);
        } finally {
            el.buildDuplicateButton.disabled = false;
        }
    }

    function openBuildDeletePanel() {
        const build = buildByUuid(el.buildUuid.value);
        if (!build || state.builds.length <= 1) return;
        const others = state.builds.filter((b) => b.build_uuid !== build.build_uuid);
        const hasItems = build.items_count > 0;
        el.buildDeleteSummary.textContent = hasItems
            ? `“${build.name}” tem ${build.items_count} ${build.items_count === 1 ? "item" : "itens"} (${formatCurrency(build.total)}). O que fazer com eles?`
            : `“${build.name}” está vazia. Excluir mesmo?`;
        el.buildDeleteChoices.classList.toggle("hidden", !hasItems);
        el.buildMoveTo.innerHTML = others.map((b) => `<option value="${escapeHtml(b.build_uuid)}">${escapeHtml(b.name)}</option>`).join("");
        el.buildDeleteChoices.querySelector('input[value="move"]').checked = true;
        el.buildDeletePanel.classList.remove("hidden");
        el.buildDeletePanel.scrollIntoView({ block: "nearest" });
    }

    async function handleBuildDeleteConfirm() {
        const build = buildByUuid(el.buildUuid.value);
        if (!build) return;
        const params = { build_uuid: build.build_uuid };
        if (build.items_count > 0) {
            params.mode = (el.buildDeleteChoices.querySelector('input[name="build-delete-mode"]:checked') || {}).value || "move";
            if (params.mode === "move") params.move_to = el.buildMoveTo.value;
        }
        el.buildDeleteConfirm.disabled = true;
        try {
            const payload = await apiRequest("deleteFpvBuild", { method: "POST", params });
            window.closeModal("build-modal");
            state.currentBuild = null; // a atual foi excluida: abre a indicada pelo servidor
            state.scrollTabs = true;
            await loadBoard(payload.next_build_uuid || "");
            showAppToast(`Montagem “${build.name}” excluída.`);
        } catch (error) {
            alert("Erro ao excluir montagem: " + error.message);
        } finally {
            el.buildDeleteConfirm.disabled = false;
        }
    }

    function renderOverview() {
        const all = overallFinance();
        const stat = (label, value, tone) => `<div class="bg-gray-50 rounded-xl px-4 py-3"><p class="text-[11px] uppercase tracking-wider text-f91-muted">${label}</p><p class="text-lg font-bold ${tone || "text-f91-text"} mt-0.5">${escapeHtml(formatDisplayCurrency(value))}</p></div>`;
        el.overviewTotals.innerHTML = stat("Total geral", all.total)
            + stat("Já comprado", all.purchased, "text-green-600")
            + stat("Falta comprar", all.toBuy)
            + stat("Falta juntar", all.shortfall, all.shortfall > 0 ? "text-red-500" : "text-green-600");
        el.overviewNote.textContent = `Saldo da carteira (única para todas as montagens): ${formatDisplayCurrency(all.balance)}. “Falta juntar” considera tudo o que ainda falta comprar em todas elas.`;

        const cards = state.builds.map((b) => {
            const pct = buildPct(b);
            const cover = b.cover_image
                ? `<img src="/${escapeHtml(b.cover_image)}" alt="" class="w-full h-full object-cover">`
                : `<i class="ph ph-drone text-4xl" style="color:${buildColor(b.color)}"></i>`;
            const chips = [
                `<span class="px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-medium">${b.items_count} ${b.items_count === 1 ? "item" : "itens"}</span>`,
                b.target_date ? `<span class="px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-medium flex items-center gap-1"><i class="ph ph-target"></i> ${escapeHtml(new Date(`${b.target_date}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }))}</span>` : "",
                b.share_active ? `<span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-medium flex items-center gap-1"><i class="ph ph-link"></i> Link ativo</span>` : "",
                b.unread ? `<span class="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-medium">${b.unread} ${b.unread === 1 ? "opinião nova" : "opiniões novas"}</span>` : "",
            ].join("");
            return `<button type="button" data-overview-build="${escapeHtml(b.build_uuid)}" class="build-card ${b.build_uuid === currentBuildUuid() ? "is-current" : ""} flex flex-col" style="--build-color:${buildColor(b.color)}">
                <span class="block w-full h-28 bg-gray-100 flex items-center justify-center overflow-hidden">${cover}</span>
                <span class="block p-4 flex-1 w-full">
                    <span class="flex items-center gap-2 mb-1"><span class="build-dot"></span><span class="font-semibold text-f91-text truncate">${escapeHtml(b.name)}</span>${b.build_uuid === currentBuildUuid() ? `<span class="ml-auto text-[10px] font-bold uppercase tracking-wider text-f91-muted">aberta</span>` : ""}</span>
                    ${b.description ? `<span class="block text-xs text-f91-muted mb-3 line-clamp-2">${escapeHtml(b.description)}</span>` : `<span class="block mb-3"></span>`}
                    <span class="block w-full bg-gray-100 rounded-full h-2 overflow-hidden"><span class="block h-2 rounded-full" style="width:${pct}%;background:${buildColor(b.color)}"></span></span>
                    <span class="flex justify-between text-xs mt-1.5 text-f91-muted"><span>${escapeHtml(formatDisplayCurrency(b.purchased_total))} de ${escapeHtml(formatDisplayCurrency(b.total))}</span><strong class="text-f91-text">${pct}%</strong></span>
                    <span class="flex flex-wrap gap-1.5 mt-3 text-f91-text">${chips}</span>
                </span>
            </button>`;
        }).join("");

        el.overviewGrid.innerHTML = cards + `<button type="button" data-overview-new class="build-card flex flex-col items-center justify-center gap-2 min-h-[180px] text-f91-muted hover:text-f91-text" style="border-style:dashed;border-top-width:1px"><i class="ph ph-plus-circle text-3xl"></i><span class="text-sm font-semibold">Nova montagem</span></button>`;
    }

    function openOverview() {
        renderOverview();
        window.openModal("builds-overview-modal");
    }

    function handleOverviewClick(event) {
        if (event.target.closest("[data-overview-new]")) {
            window.closeModal("builds-overview-modal");
            openBuildModal(null);
            return;
        }
        const card = event.target.closest("[data-overview-build]");
        if (card) {
            window.closeModal("builds-overview-modal");
            switchBuild(card.dataset.overviewBuild);
        }
    }

    // ── Reset ────────────────────────────────────────────────────────────

    window.resetData = async function resetData() {
        if (!confirm("Apagar TODOS os dados do planner (montagens, itens, categorias, videos, carteira, opinioes e planejamento)? Essa acao nao pode ser desfeita.")) return;
        try {
            await apiRequest("resetFpvData", { method: "POST" });
            await loadBoard();
        } catch (error) {
            alert("Erro ao apagar dados: " + error.message);
        }
    };

    // ── Wire up events ───────────────────────────────────────────────────

    function bindEvents() {
        el.logoutButton.addEventListener("click", handleLogout);

        el.addCategoryForm.addEventListener("submit", handleAddCategorySubmit);
        el.categoriesLegend.addEventListener("click", (event) => {
            const btn = event.target.closest('[data-action="delete-category"]');
            if (btn) handleDeleteCategory(btn.dataset.categoryId);
        });

        el.itemImage.addEventListener("change", handleImagePreview);
        el.addItemForm.addEventListener("submit", handleAddItemSubmit);
        el.itemUrl.addEventListener("paste", handleItemUrlPaste);
        el.itemUrl.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                runImport();
            }
        });
        el.importLinkButton.addEventListener("click", runImport);
        el.openClipModal.addEventListener("click", () => window.openModal("clip-modal"));
        [el.itemPrice, el.itemPriceCurrency].forEach((node) => node.addEventListener("input", updateItemPriceHint));
        el.itemPriceCurrency.addEventListener("change", updateItemPriceHint);

        el.editItemImage.addEventListener("change", handleEditImagePreview);
        el.editItemForm.addEventListener("submit", handleEditItemSubmit);
        el.editRefreshPrice.addEventListener("click", refreshPriceFromLink);
        [el.editItemPrice, el.editItemPriceCurrency].forEach((node) => node.addEventListener("input", () => {
            el.editItemHint.textContent = describeConversion(el.editItemPrice.value, el.editItemPriceCurrency.value);
        }));
        el.editItemPriceCurrency.addEventListener("change", () => {
            el.editItemHint.textContent = describeConversion(el.editItemPrice.value, el.editItemPriceCurrency.value);
        });

        el.itemsContainer.addEventListener("click", handleItemsContainerClick);
        el.itemsContainer.addEventListener("change", handleItemsContainerChange);
        el.itemsContainer.addEventListener("dragstart", handleItemsDragStart);
        el.itemsContainer.addEventListener("dragover", handleItemsDragOver);
        el.itemsContainer.addEventListener("drop", handleItemsDrop);
        el.itemsContainer.addEventListener("dragend", handleItemsDragEnd);

        el.inputDate.addEventListener("change", handlePlanningDateInput);

        el.buildsTabs.addEventListener("click", handleBuildsTabsClick);
        el.buildsTabs.addEventListener("dragover", handleBuildsTabsDragOver);
        el.buildsTabs.addEventListener("dragleave", (event) => {
            const tab = event.target.closest("[data-build-tab]");
            if (tab) tab.classList.remove("is-drop-target");
        });
        el.buildsTabs.addEventListener("drop", handleBuildsTabsDrop);
        el.buildNewButton.addEventListener("click", () => openBuildModal(null));
        el.buildEditButton.addEventListener("click", () => state.currentBuild && openBuildModal(state.currentBuild));
        el.buildsOverviewButton.addEventListener("click", openOverview);
        el.overviewGrid.addEventListener("click", handleOverviewClick);
        el.buildForm.addEventListener("submit", handleBuildSubmit);
        el.buildDuplicateButton.addEventListener("click", handleBuildDuplicate);
        el.buildDeleteButton.addEventListener("click", openBuildDeletePanel);
        el.buildDeleteCancel.addEventListener("click", () => el.buildDeletePanel.classList.add("hidden"));
        el.buildDeleteConfirm.addEventListener("click", handleBuildDeleteConfirm);
        el.editItemCopyTo.addEventListener("change", handleCopyItem);

        el.walletAddButton.addEventListener("click", () => openWalletModal("deposit"));
        el.walletWithdrawButton.addEventListener("click", () => openWalletModal("withdrawal"));
        el.walletForm.addEventListener("submit", handleWalletSubmit);
        [el.walletAmount, el.walletCurrency].forEach((node) => node.addEventListener("input", () => {
            el.walletConvertHint.textContent = describeConversion(el.walletAmount.value, el.walletCurrency.value);
        }));
        el.walletCurrency.addEventListener("change", () => {
            el.walletConvertHint.textContent = describeConversion(el.walletAmount.value, el.walletCurrency.value);
        });
        el.walletStatement.addEventListener("click", (event) => {
            const del = event.target.closest('[data-action="delete-wallet-entry"]');
            if (del) {
                handleDeleteWalletEntry(del.dataset.entryId);
                return;
            }
            const undo = event.target.closest('[data-action="undo-purchase"]');
            if (undo && confirm("Desfazer esta compra? O valor volta para a carteira.")) {
                handleTogglePurchased(undo.dataset.uuid, false);
            }
        });

        el.btnVideosMenu.addEventListener("click", (event) => {
            event.stopPropagation();
            el.videosDropdown.classList.toggle("hidden");
            el.videosDropdown.classList.toggle("flex");
        });
        document.addEventListener("click", (event) => {
            if (!el.videosDropdown.contains(event.target) && !el.btnVideosMenu.contains(event.target)) {
                el.videosDropdown.classList.add("hidden");
                el.videosDropdown.classList.remove("flex");
            }
        });
        el.addVideoForm.addEventListener("submit", handleAddVideoSubmit);
        el.videosListContainer.addEventListener("click", (event) => {
            const btn = event.target.closest('[data-action="delete-video"]');
            if (btn) handleDeleteVideo(btn.dataset.videoId);
        });

        el.exportButton.addEventListener("click", openExportModal);
        el.shareButton.addEventListener("click", () => window.FpvShare && window.FpvShare.open());
        el.exportShareButton.addEventListener("click", () => {
            window.closeModal("export-modal");
            if (window.FpvShare) window.FpvShare.open();
        });
        window.addEventListener("fpv:share-updated", handleShareUpdated);

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                ["lightbox-modal", "category-modal", "export-modal", "edit-item-modal", "wallet-modal", "clip-modal", "share-modal", "build-modal", "builds-overview-modal"].forEach((id) => window.closeModal(id));
            }
        });
    }

    // ── Toast pos-redirect (cadastro/login) ─────────────────────────────

    let toastTimer = null;
    function showAppToast(message) {
        if (!el.appToast) return;
        el.appToastMessage.textContent = message;
        el.appToast.classList.remove("translate-y-4", "opacity-0", "pointer-events-none");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
            el.appToast.classList.add("translate-y-4", "opacity-0", "pointer-events-none");
        }, 4500);
    }

    function checkRedirectToast() {
        const params = new URLSearchParams(window.location.search);
        let message = null;
        if (params.get("welcome") === "1") {
            message = "Conta criada com sucesso! Bem-vindo(a) a FPV91.";
        } else if (params.get("login") === "1") {
            message = "Login realizado com sucesso.";
        }
        if (!message) return;

        showAppToast(message);
        params.delete("welcome");
        params.delete("login");
        const query = params.toString();
        window.history.replaceState({}, "", window.location.pathname + (query ? "?" + query : ""));
    }

    async function bootstrap() {
        bindEvents();
        initTheme();
        initClipModal();
        const ratesReady = initCurrency();
        checkRedirectToast();
        await loadBoard();
        await ratesReady;
        await handleClipHash();
    }

    bootstrap();
})();
