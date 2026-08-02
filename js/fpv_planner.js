(() => {
    const API_URL = "php/fpv/api.php";
    const TOKEN_KEY = "f91_fpv_token";

    const state = {
        token: sessionStorage.getItem(TOKEN_KEY) || "",
        categories: [],
        items: [],
        planning: { saved_amount: 0, target_date: null },
        videos: [],
    };

    const el = {
        loginScreen: document.getElementById("loginScreen"),
        loginForm: document.getElementById("loginForm"),
        loginPassword: document.getElementById("loginPassword"),
        loginError: document.getElementById("loginError"),
        loginButton: document.getElementById("loginButton"),
        loginButtonLabel: document.getElementById("loginButtonLabel"),
        toggleLoginPassword: document.getElementById("toggleLoginPassword"),
        appShell: document.getElementById("appShell"),
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

    async function apiRequest(action, { params = {}, formData = null, method = "GET" } = {}) {
        let url = `${API_URL}?action=${encodeURIComponent(action)}`;
        let options = { method };

        if (formData) {
            options.method = "POST";
            formData.append("token", state.token);
            options.body = formData;
        } else if (method === "GET") {
            const query = new URLSearchParams({ ...params, token: state.token });
            url += `&${query.toString()}`;
        } else {
            const body = new URLSearchParams({ ...params, token: state.token });
            options.body = body;
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

    // ── Auth ─────────────────────────────────────────────────────────────

    function showApp() {
        el.loginScreen.classList.add("hidden");
        el.appShell.classList.remove("hidden");
        el.appShell.classList.add("flex");
    }

    function showLogin() {
        el.appShell.classList.add("hidden");
        el.appShell.classList.remove("flex");
        el.loginScreen.classList.remove("hidden");
    }

    async function handleLoginSubmit(event) {
        event.preventDefault();
        el.loginError.classList.add("hidden");
        el.loginButton.disabled = true;
        el.loginButtonLabel.textContent = "Entrando...";

        try {
            const body = new URLSearchParams({ password: el.loginPassword.value });
            const response = await fetch(`${API_URL}?action=loginFpv`, { method: "POST", body });
            const payload = await response.json();

            if (!payload.success) {
                throw new Error(payload.message || "Senha invalida.");
            }

            state.token = payload.token;
            sessionStorage.setItem(TOKEN_KEY, state.token);
            el.loginPassword.value = "";
            showApp();
            await loadBoard();
        } catch (error) {
            el.loginError.textContent = error.message;
            el.loginError.classList.remove("hidden");
        } finally {
            el.loginButton.disabled = false;
            el.loginButtonLabel.textContent = "Entrar";
        }
    }

    async function handleLogout() {
        try {
            await apiRequest("logoutFpv", { method: "POST" });
        } catch (error) {
            // Sessao ja pode ter expirado no servidor; segue o logout local mesmo assim.
        }
        state.token = "";
        sessionStorage.removeItem(TOKEN_KEY);
        showLogin();
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
                state.token = "";
                sessionStorage.removeItem(TOKEN_KEY);
                showLogin();
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
            const nameClasses = item.is_purchased ? "line-through text-f91-muted" : "text-f91-navy";
            const thumb = item.image_path
                ? `<img src="${escapeHtml(item.image_path)}" alt="${escapeHtml(item.name)}" class="w-full h-full object-cover">`
                : `<i class="ph ph-drone text-xl"></i>`;

            return `
                <li class="flex items-center gap-3 sm:gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all-smooth ${purchasedClasses}" data-item-uuid="${item.item_uuid}">
                    <button type="button" class="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center text-f91-muted" data-action="view-image" ${item.image_path ? "" : "disabled"}>
                        ${thumb}
                    </button>
                    <div class="flex-grow min-w-0">
                        <p class="font-medium truncate ${nameClasses}">${escapeHtml(item.name)}</p>
                        <div class="flex items-center gap-2 mt-1 flex-wrap">
                            ${category ? `<span class="text-[11px] px-2 py-0.5 rounded-full font-medium ${escapeHtml(category.color_class)}">${escapeHtml(category.name)}</span>` : ""}
                            ${item.store_url ? `<a href="${escapeHtml(item.store_url)}" target="_blank" rel="noopener" class="text-[11px] text-f91-muted hover:text-f91-navy flex items-center gap-1"><i class="ph ph-link"></i> Loja</a>` : ""}
                        </div>
                    </div>
                    <p class="font-bold text-f91-navy text-sm sm:text-base flex-shrink-0 whitespace-nowrap">${formatCurrency(item.price)}</p>
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
            el.lightboxImg.src = item.image_path;
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

    // ── Financial summary ────────────────────────────────────────────────

    function totalCost() {
        return state.items.reduce((sum, item) => sum + Number(item.price || 0), 0);
    }

    function renderSummary() {
        const total = totalCost();
        const saved = Number(state.planning.saved_amount) || 0;
        const remaining = Math.max(total - saved, 0);
        const progressPct = total > 0 ? Math.min(100, (saved / total) * 100) : 0;

        el.displayTotalCost.textContent = formatCurrency(total);
        el.displaySaved.textContent = formatCurrency(saved);
        el.displayRemaining.textContent = formatCurrency(remaining);
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
            el.displayMonthly.textContent = formatCurrency(0);
            el.displayWeekly.textContent = formatCurrency(0);
            el.displayDaily.textContent = formatCurrency(0);
            renderCalendar(0, 0);
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const msPerDay = 24 * 60 * 60 * 1000;
        const daysLeft = Math.ceil((targetDate.getTime() - today.getTime()) / msPerDay);

        if (remaining <= 0) {
            el.displayTimeLeft.textContent = "Meta atingida!";
            el.displayMonthly.textContent = formatCurrency(0);
            el.displayWeekly.textContent = formatCurrency(0);
            el.displayDaily.textContent = formatCurrency(0);
            renderCalendar(1, 1);
            return;
        }

        if (daysLeft <= 0) {
            el.displayTimeLeft.textContent = "Data vencida";
            el.displayMonthly.textContent = formatCurrency(remaining);
            el.displayWeekly.textContent = formatCurrency(remaining);
            el.displayDaily.textContent = formatCurrency(remaining);
            renderCalendar(0, 1);
            return;
        }

        const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
        const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30));

        el.displayTimeLeft.textContent = daysLeft === 1 ? "1 dia" : `${daysLeft} dias`;
        el.displayMonthly.textContent = formatCurrency(remaining / monthsLeft);
        el.displayWeekly.textContent = formatCurrency(remaining / weeksLeft);
        el.displayDaily.textContent = formatCurrency(remaining / daysLeft);

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
                <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener" class="flex-grow min-w-0 text-xs font-medium text-f91-navy hover:text-f91-limeDark truncate">
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
        el.loginForm.addEventListener("submit", handleLoginSubmit);
        el.toggleLoginPassword.addEventListener("click", () => {
            const isPassword = el.loginPassword.type === "password";
            el.loginPassword.type = isPassword ? "text" : "password";
            el.toggleLoginPassword.innerHTML = isPassword
                ? '<i class="ph ph-eye-slash text-lg"></i>'
                : '<i class="ph ph-eye text-lg"></i>';
        });
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

    async function bootstrap() {
        bindEvents();
        if (state.token) {
            showApp();
            await loadBoard();
        } else {
            showLogin();
        }
    }

    bootstrap();
})();
