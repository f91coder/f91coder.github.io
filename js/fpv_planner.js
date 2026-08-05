(() => {
    const API_URL = "/php/fpv/api.php";

    const THEME_STORAGE_KEY = "f91_fpv_theme";
    const RATES_API_URL = "https://open.er-api.com/v6/latest/USD";
    const RATES_CACHE_KEY = "f91_fpv_rates_cache";
    const RATES_CACHE_TTL_MS = 30 * 60 * 1000;

    const state = {
        categories: [],
        items: [],
        planning: { saved_amount: 0, target_date: null },
        videos: [],
        currency: "BRL",
        exchangeRates: null,
        dragUuid: null,
    };

    const el = {
        logoutButton: document.getElementById("logoutButton"),

        displayTotalCost: document.getElementById("display-total-cost"),
        displayProgressPct: document.getElementById("display-progress-pct"),
        progressBar: document.getElementById("progress-bar"),
        displaySaved: document.getElementById("display-saved"),
        displayRemaining: document.getElementById("display-remaining"),

        inputSaved: document.getElementById("input-saved"),
        inputDate: document.getElementById("input-date"),
        displayTimeLeft: document.getElementById("display-time-left"),
        displayMonthly: document.getElementById("display-monthly"),
        displayWeekly: document.getElementById("display-weekly"),
        displayDaily: document.getElementById("display-daily"),
        calendarViz: document.getElementById("calendar-viz"),

        categoriesLegend: document.getElementById("categories-legend"),
        itemCategorySelect: document.getElementById("item-category"),
        addCategoryForm: document.getElementById("add-category-form"),
        catName: document.getElementById("cat-name"),
        catColor: document.getElementById("cat-color"),

        addItemForm: document.getElementById("add-item-form"),
        itemImage: document.getElementById("item-image"),
        imagePreview: document.getElementById("image-preview"),
        imagePlaceholderIcon: document.getElementById("image-placeholder-icon"),
        itemName: document.getElementById("item-name"),
        itemUrl: document.getElementById("item-url"),
        itemPrice: document.getElementById("item-price"),
        itemCount: document.getElementById("item-count"),
        itemsContainer: document.getElementById("items-container"),
        emptyState: document.getElementById("empty-state"),

        btnVideosMenu: document.getElementById("btn-videos-menu"),
        videosDropdown: document.getElementById("videos-dropdown"),
        videosListContainer: document.getElementById("videos-list-container"),
        addVideoForm: document.getElementById("add-video-form"),
        newVideoUrl: document.getElementById("new-video-url"),

        exportButton: document.getElementById("exportButton"),
        exportDate: document.getElementById("export-date"),
        exportTableBody: document.getElementById("export-table-body"),
        exportTotal: document.getElementById("export-total"),

        lightboxImg: document.getElementById("lightbox-img"),
        lightboxCaption: document.getElementById("lightbox-caption"),

        appToast: document.getElementById("appToast"),
        appToastMessage: document.getElementById("appToastMessage"),

        themeToggleButton: document.getElementById("themeToggleButton"),
        currencySwitchButtons: Array.from(document.querySelectorAll(".currency-switch-btn")),
        currencyRatesList: document.getElementById("currencyRatesList"),
        currencyUpdatedAt: document.getElementById("currencyUpdatedAt"),
        refreshRatesButton: document.getElementById("refreshRatesButton"),
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

    function formatCurrency(value) {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
    }

    function convertBrlToUsd(brlValue) {
        if (!state.exchangeRates || !state.exchangeRates.BRL) return brlValue;
        return brlValue / state.exchangeRates.BRL;
    }

    function formatDisplayCurrency(value) {
        const brlValue = Number(value) || 0;
        if (state.currency === "USD" && state.exchangeRates) {
            return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(convertBrlToUsd(brlValue));
        }
        return formatCurrency(brlValue);
    }

    // ── Cotacoes (USD/BRL/PYG) ───────────────────────────────────────────

    const FLAG_SVG = {
        US: `<svg viewBox="0 0 24 16" width="20" height="14" style="border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.08);flex-shrink:0;"><rect width="24" height="16" fill="#B22234"/><rect y="1.23" width="24" height="1.23" fill="#fff"/><rect y="3.69" width="24" height="1.23" fill="#fff"/><rect y="6.15" width="24" height="1.23" fill="#fff"/><rect y="8.62" width="24" height="1.23" fill="#fff"/><rect y="11.08" width="24" height="1.23" fill="#fff"/><rect y="13.54" width="24" height="1.23" fill="#fff"/><rect width="10" height="8.62" fill="#3C3B6E"/></svg>`,
        BR: `<svg viewBox="0 0 24 16" width="20" height="14" style="border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.08);flex-shrink:0;"><rect width="24" height="16" fill="#009B3A"/><polygon points="12,2 22,8 12,14 2,8" fill="#FEDF00"/><circle cx="12" cy="8" r="3.2" fill="#002776"/></svg>`,
        PY: `<svg viewBox="0 0 24 16" width="20" height="14" style="border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.08);flex-shrink:0;"><rect width="24" height="16" fill="#D52B1E"/><rect y="5.33" width="24" height="5.33" fill="#fff"/><rect y="10.67" width="24" height="5.33" fill="#0038A8"/></svg>`,
    };

    async function fetchExchangeRates(force) {
        if (!force) {
            const cached = localStorage.getItem(RATES_CACHE_KEY);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed && Date.now() - parsed.fetchedAt < RATES_CACHE_TTL_MS) {
                        state.exchangeRates = parsed;
                        return parsed;
                    }
                } catch (error) {
                    // cache corrompido, ignora e busca de novo
                }
            }
        }

        const response = await fetch(RATES_API_URL);
        if (!response.ok) throw new Error("Nao foi possivel buscar a cotacao.");
        const data = await response.json();
        if (data.result !== "success" || !data.rates || !data.rates.BRL) {
            throw new Error("Cotacao indisponivel no momento.");
        }

        const rates = {
            USD: 1,
            BRL: data.rates.BRL,
            PYG: data.rates.PYG || null,
            fetchedAt: Date.now(),
        };
        state.exchangeRates = rates;
        localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(rates));
        return rates;
    }

    function renderCurrencyCard() {
        if (!el.currencyRatesList) return;
        const rates = state.exchangeRates;

        if (!rates) {
            el.currencyRatesList.innerHTML = `<div class="flex items-center justify-between py-2"><span class="text-sm text-f91-muted">Nao foi possivel carregar as cotacoes.</span></div>`;
            return;
        }

        const rows = [
            { flag: FLAG_SVG.US, label: "Dólar (USD)", value: `R$ ${rates.BRL.toFixed(2).replace(".", ",")}` },
            { flag: FLAG_SVG.BR, label: "Real (BRL)", value: "Moeda base" },
        ];
        if (rates.PYG) {
            const pygPer1000 = (1000 / rates.PYG) * rates.BRL;
            rows.push({ flag: FLAG_SVG.PY, label: "Guarani (₲ 1.000)", value: `R$ ${pygPer1000.toFixed(2).replace(".", ",")}` });
        }

        el.currencyRatesList.innerHTML = rows.map((row) => `
            <div class="flex items-center justify-between py-1.5">
                <span class="text-sm text-f91-muted flex items-center gap-2">${row.flag} ${escapeHtml(row.label)}</span>
                <span class="text-sm font-bold text-f91-text">${escapeHtml(row.value)}</span>
            </div>
        `).join("");

        if (el.currencyUpdatedAt) {
            const updated = new Date(rates.fetchedAt);
            el.currencyUpdatedAt.textContent = `Atualizado as ${updated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
        }
    }

    function refreshDisplayedPrices() {
        document.querySelectorAll(".item-price").forEach((priceEl) => {
            const price = parseFloat(priceEl.dataset.price) || 0;
            priceEl.textContent = formatDisplayCurrency(price);
        });
    }

    function setCurrency(currency) {
        if (currency === state.currency) return;
        if (currency === "USD" && !state.exchangeRates) return;
        state.currency = currency;
        el.currencySwitchButtons.forEach((btn) => {
            btn.setAttribute("aria-pressed", btn.dataset.currency === currency ? "true" : "false");
        });
        refreshDisplayedPrices();
        renderSummary();
        renderPlanningCalc();
    }

    async function initCurrency() {
        el.currencySwitchButtons.forEach((btn) => {
            btn.addEventListener("click", () => setCurrency(btn.dataset.currency));
        });
        if (el.refreshRatesButton) {
            el.refreshRatesButton.addEventListener("click", async () => {
                el.refreshRatesButton.classList.add("animate-spin");
                try {
                    await fetchExchangeRates(true);
                    renderCurrencyCard();
                    refreshDisplayedPrices();
                    renderSummary();
                    renderPlanningCalc();
                } catch (error) {
                    showAppToast("Nao foi possivel atualizar a cotacao agora.");
                } finally {
                    el.refreshRatesButton.classList.remove("animate-spin");
                }
            });
        }

        try {
            await fetchExchangeRates(false);
            renderCurrencyCard();
        } catch (error) {
            renderCurrencyCard();
        }
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
            localStorage.setItem(THEME_STORAGE_KEY, next);
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

    async function loadBoard() {
        try {
            const payload = await apiRequest("getFpvBoard");
            state.categories = payload.categories;
            state.items = payload.items;
            state.planning = payload.planning;
            state.videos = payload.videos;
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
        renderCategories();
        renderItems();
        renderSummary();
        renderPlanningInputs();
        renderPlanningCalc();
        renderVideos();
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

        const options = [`<option value="">Sem categoria</option>`]
            .concat(state.categories.map((cat) => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`));
        el.itemCategorySelect.innerHTML = options.join("");
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

    function categoryById(id) {
        return state.categories.find((cat) => cat.id === id) || null;
    }

    function renderItems() {
        el.itemCount.textContent = `${state.items.length} ${state.items.length === 1 ? "item" : "itens"}`;

        if (!state.items.length) {
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

            return `
                <li class="flex items-center gap-2 sm:gap-4 bg-white dark:bg-f91-card p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all-smooth ${purchasedClasses}" data-item-uuid="${item.item_uuid}" draggable="true">
                    <span class="item-drag-handle text-gray-300 hover:text-f91-text transition-colors flex-shrink-0 px-1" title="Arraste para reordenar">
                        <i class="ph-bold ph-dots-six-vertical text-lg"></i>
                    </span>
                    <button type="button" class="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center text-f91-muted" data-action="view-image" ${item.image_path ? "" : "disabled"}>
                        ${thumb}
                    </button>
                    <div class="flex-grow min-w-0">
                        <p class="font-medium truncate ${nameClasses}">${escapeHtml(item.name)}</p>
                        <div class="flex items-center gap-2 mt-1 flex-wrap">
                            ${category ? `<span class="text-[11px] px-2 py-0.5 rounded-full font-medium ${escapeHtml(category.color_class)}">${escapeHtml(category.name)}</span>` : ""}
                            ${item.store_url ? `<a href="${escapeHtml(item.store_url)}" target="_blank" rel="noopener" class="text-[11px] text-f91-muted hover:text-f91-text flex items-center gap-1"><i class="ph ph-link"></i> Loja</a>` : ""}
                        </div>
                    </div>
                    <p class="font-bold text-f91-text text-sm sm:text-base flex-shrink-0 whitespace-nowrap item-price" data-price="${item.price}">${formatDisplayCurrency(item.price)}</p>
                    <label class="flex items-center flex-shrink-0 cursor-pointer" title="Marcar como comprado">
                        <input type="checkbox" data-action="toggle-purchased" ${item.is_purchased ? "checked" : ""} class="w-5 h-5 rounded border-gray-300 text-f91-lime focus:ring-f91-lime cursor-pointer">
                    </label>
                    <button type="button" data-action="delete-item" class="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                        <i class="ph ph-trash text-lg"></i>
                    </button>
                </li>
            `;
        }).join("");
    }

    function handleImagePreview() {
        const file = el.itemImage.files[0];
        if (!file) {
            el.imagePreview.classList.add("hidden");
            el.imagePlaceholderIcon.classList.remove("hidden");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            el.imagePreview.style.backgroundImage = `url(${e.target.result})`;
            el.imagePreview.classList.remove("hidden");
            el.imagePlaceholderIcon.classList.add("hidden");
        };
        reader.readAsDataURL(file);
    }

    async function handleAddItemSubmit(event) {
        event.preventDefault();
        const name = el.itemName.value.trim();
        const price = parseFloat(el.itemPrice.value);
        if (!name || Number.isNaN(price)) return;

        const formData = new FormData();
        formData.append("name", name);
        formData.append("price", String(price));
        formData.append("category_id", el.itemCategorySelect.value);
        formData.append("store_url", el.itemUrl.value.trim());
        if (el.itemImage.files[0]) {
            formData.append("image", el.itemImage.files[0]);
        }

        const submitButton = el.addItemForm.querySelector("button[type=submit]");
        submitButton.disabled = true;

        try {
            await apiRequest("addFpvItem", { formData });
            el.addItemForm.reset();
            el.imagePreview.classList.add("hidden");
            el.imagePreview.style.backgroundImage = "";
            el.imagePlaceholderIcon.classList.remove("hidden");
            await loadBoard();
        } catch (error) {
            alert("Erro ao adicionar item: " + error.message);
        } finally {
            submitButton.disabled = false;
        }
    }

    async function handleTogglePurchased(itemUuid, isPurchased) {
        try {
            await apiRequest("updateFpvItem", { method: "POST", params: { item_uuid: itemUuid, is_purchased: isPurchased ? "1" : "0" } });
            const item = state.items.find((it) => it.item_uuid === itemUuid);
            if (item) item.is_purchased = isPurchased;
            renderItems();
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
        const deleteBtn = event.target.closest('[data-action="delete-item"]');
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

    // ── Financial summary ────────────────────────────────────────────────

    function totalCost() {
        return state.items.reduce((sum, item) => sum + Number(item.price || 0), 0);
    }

    function renderSummary() {
        const total = totalCost();
        const saved = Number(state.planning.saved_amount) || 0;
        const remaining = Math.max(total - saved, 0);
        const progressPct = total > 0 ? Math.min(100, (saved / total) * 100) : 0;

        el.displayTotalCost.textContent = formatDisplayCurrency(total);
        el.displaySaved.textContent = formatDisplayCurrency(saved);
        el.displayRemaining.textContent = formatDisplayCurrency(remaining);
        el.displayProgressPct.textContent = `${Math.round(progressPct)}%`;
        el.progressBar.style.width = `${progressPct}%`;
    }

    function renderPlanningInputs() {
        el.inputSaved.value = state.planning.saved_amount ? String(state.planning.saved_amount) : "";
        el.inputDate.value = state.planning.target_date || "";
    }

    function renderPlanningCalc() {
        const total = totalCost();
        const saved = Number(state.planning.saved_amount) || 0;
        const remaining = Math.max(total - saved, 0);
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
            el.displayTimeLeft.textContent = "Meta atingida!";
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

        const savedFraction = total > 0 ? Math.min(1, saved / total) : 0;
        renderCalendar(savedFraction, Math.min(52, weeksLeft + 1));
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
        planningSaveTimer = window.setTimeout(async () => {
            try {
                await apiRequest("saveFpvPlanning", {
                    method: "POST",
                    params: {
                        saved_amount: String(Number(state.planning.saved_amount) || 0),
                        target_date: state.planning.target_date || "",
                    },
                });
            } catch (error) {
                alert("Erro ao salvar planejamento: " + error.message);
            }
        }, 500);
    }

    function handlePlanningSavedInput() {
        state.planning.saved_amount = parseFloat(el.inputSaved.value) || 0;
        renderSummary();
        renderPlanningCalc();
        schedulePlanningSave();
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

    // ── Export / print ──────────────────────────────────────────────────

    function openExportModal() {
        el.exportDate.textContent = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());
        el.exportTableBody.innerHTML = state.items.map((item) => {
            const category = categoryById(item.category_id);
            return `
                <tr class="border-b border-gray-100">
                    <td class="py-2 pr-2">${escapeHtml(item.name)}</td>
                    <td class="py-2 pr-2 text-f91-muted">${category ? escapeHtml(category.name) : "-"}</td>
                    <td class="py-2 text-right whitespace-nowrap">${formatCurrency(item.price)}</td>
                    <td class="py-2 text-center">${item.is_purchased ? "<span class=\"text-green-600\">Comprado</span>" : "<span class=\"text-f91-muted\">Pendente</span>"}</td>
                </tr>
            `;
        }).join("") || `<tr><td colspan="4" class="py-4 text-center text-f91-muted">Nenhum item na lista.</td></tr>`;
        el.exportTotal.textContent = formatCurrency(totalCost());
        window.openModal("export-modal");
    }

    // ── Reset ────────────────────────────────────────────────────────────

    window.resetData = async function resetData() {
        if (!confirm("Apagar TODOS os dados do planner (itens, categorias, videos e planejamento)? Essa acao nao pode ser desfeita.")) return;
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
        el.itemsContainer.addEventListener("click", handleItemsContainerClick);
        el.itemsContainer.addEventListener("change", handleItemsContainerChange);
        el.itemsContainer.addEventListener("dragstart", handleItemsDragStart);
        el.itemsContainer.addEventListener("dragover", handleItemsDragOver);
        el.itemsContainer.addEventListener("drop", handleItemsDrop);
        el.itemsContainer.addEventListener("dragend", handleItemsDragEnd);

        el.inputSaved.addEventListener("input", handlePlanningSavedInput);
        el.inputDate.addEventListener("change", handlePlanningDateInput);

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

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                ["lightbox-modal", "category-modal", "export-modal"].forEach((id) => window.closeModal(id));
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
        initCurrency();
        checkRedirectToast();
        await loadBoard();
    }

    bootstrap();
})();
