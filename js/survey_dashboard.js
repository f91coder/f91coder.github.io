(() => {
    const API_URL = "php/survey/api.php";
    const EXPORT_URL = "php/survey/export.php";
    const SESSION_TOKEN_KEY = "f91_survey_dashboard_token";
    const THEME_STORAGE_KEY = "f91_survey_dashboard_theme";
    const SIDEBAR_COLLAPSED_KEY = "f91_survey_dashboard_sidebar_collapsed";
    const AUTO_REFRESH_MS = 60000;
    const MOBILE_BREAKPOINT = 1100;
    const DEFAULT_FILTERS = {
        range: "30d",
        survey_slug: "",
        language: "",
        search: ""
    };

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const preferredDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const state = {
        token: sessionStorage.getItem(SESSION_TOKEN_KEY) || "",
        autoRefresh: true,
        filters: { ...DEFAULT_FILTERS },
        dashboard: null,
        refreshTimer: null,
        searchDebounce: null,
        theme: storedTheme || (preferredDark ? "dark" : "light"),
        sidebarOpen: false,
        sidebarCollapsed: localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1",
        deepDiveSurveySlug: "hotelaria"
    };

    const elements = {
        body: document.body,
        loginScreen: document.getElementById("loginScreen"),
        dashboardShell: document.getElementById("dashboardShell"),
        loginForm: document.getElementById("loginForm"),
        loginButton: document.getElementById("loginButton"),
        passwordInput: document.getElementById("dashboardPassword"),
        togglePassword: document.getElementById("togglePassword"),
        loginFeedback: document.getElementById("loginFeedback"),
        loginSuccessOverlay: document.getElementById("loginSuccessOverlay"),
        iconEye: document.getElementById("iconEye"),
        iconEyeOff: document.getElementById("iconEyeOff"),
        summaryGrid: document.getElementById("summaryGrid"),
        timelineChart: document.getElementById("timelineChart"),
        surveyBreakdown: document.getElementById("surveyBreakdown"),
        languageBreakdown: document.getElementById("languageBreakdown"),
        hourlyHeatmap: document.getElementById("hourlyHeatmap"),
        weekdayHeatmap: document.getElementById("weekdayHeatmap"),
        surveyTabs: document.getElementById("surveyTabs"),
        conversionFunnels: document.getElementById("conversionFunnels"),
        deepDiveSections: document.getElementById("deepDiveSections"),
        responsesTableBody: document.getElementById("responsesTableBody"),
        rangeGroup: document.getElementById("rangeGroup"),
        surveyFilter: document.getElementById("surveyFilter"),
        languageFilter: document.getElementById("languageFilter"),
        searchFilter: document.getElementById("searchFilter"),
        refreshButton: document.getElementById("refreshButton"),
        logoutButton: document.getElementById("logoutButton"),
        openSheetButton: document.getElementById("openSheetButton"),
        responseDrawer: document.getElementById("responseDrawer"),
        drawerBackdrop: document.getElementById("drawerBackdrop"),
        closeDrawerButton: document.getElementById("closeDrawerButton"),
        drawerTitle: document.getElementById("drawerTitle"),
        drawerBody: document.getElementById("drawerBody"),
        dashboardToast: document.getElementById("dashboardToast"),
        toastIcon: document.getElementById("toastIcon"),
        toastMessage: document.getElementById("toastMessage"),
        toastCloseButton: document.getElementById("toastCloseButton"),
        toastProgressFill: document.getElementById("toastProgressFill"),
        sidebarOverlay: document.getElementById("sidebarOverlay"),
        appSidebar: document.getElementById("appSidebar"),
        topbar: document.querySelector(".topbar"),
        sidebarToggleButton: document.getElementById("sidebarToggleButton"),
        sidebarCloseButton: document.getElementById("sidebarCloseButton"),
        sidebarCollapseButton: document.getElementById("sidebarCollapseButton"),
        themeToggleButtons: Array.from(document.querySelectorAll("[data-theme-toggle]")),
        themeStateTargets: Array.from(document.querySelectorAll("[data-theme-state]")),
        themeLabelTargets: Array.from(document.querySelectorAll("[data-theme-label]")),
        sidebarNavLinks: Array.from(document.querySelectorAll(".sidebar-nav a[href^='#']")),
        mainSections: Array.from(document.querySelectorAll(".app-main section[id]"))
    };

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("pt-BR").format(Number(value) || 0);
    }

    function formatPercent(value) {
        return `${Math.round((Number(value) || 0) * 100)}%`;
    }

    function formatDateTime(value) {
        if (!value) return "Nao informado";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Nao informado";

        return new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        }).format(date);
    }

    function formatRelativeTime(value) {
        if (!value) return "Sem atualizacao";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Sem atualizacao";

        const diffMs = Date.now() - date.getTime();
        const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

        if (diffMinutes < 60) {
            return `Atualizado ha ${diffMinutes} min`;
        }

        const diffHours = Math.round(diffMinutes / 60);
        if (diffHours < 24) {
            return `Atualizado ha ${diffHours} h`;
        }

        const diffDays = Math.round(diffHours / 24);
        return `Atualizado ha ${diffDays} dia(s)`;
    }

    function languageLabel(language) {
        switch (language) {
            case "en":
                return "English";
            case "es":
                return "Espanol";
            default:
                return "Portugues";
        }
    }

    function applyTheme(theme) {
        const safeTheme = theme === "dark" ? "dark" : "light";
        const isDark = safeTheme === "dark";

        state.theme = safeTheme;
        localStorage.setItem(THEME_STORAGE_KEY, safeTheme);
        elements.body.setAttribute("data-theme", safeTheme);

        const stateLabel = isDark ? "Modo escuro" : "Modo claro";
        const actionLabel = isDark ? "Ativar light mode" : "Ativar dark mode";
        const iconClass = isDark ? "fa-sun" : "fa-moon";

        elements.themeToggleButtons.forEach((button) => {
            button.setAttribute("aria-pressed", String(isDark));
            button.setAttribute("aria-label", actionLabel);

            const icon = button.querySelector(".theme-toggle-thumb i");
            if (icon) {
                icon.className = `fa-solid ${iconClass}`;
            }
        });

        elements.themeStateTargets.forEach((target) => {
            target.textContent = stateLabel;
        });

        elements.themeLabelTargets.forEach((target) => {
            target.textContent = actionLabel;
        });
    }

    function toggleTheme() {
        applyTheme(state.theme === "dark" ? "light" : "dark");
    }

    function setAuthenticated(isAuthenticated) {
        elements.dashboardShell.hidden = !isAuthenticated;
        elements.loginScreen.hidden = isAuthenticated;
        elements.body.classList.toggle("is-authenticated", isAuthenticated);

        if (!isAuthenticated) {
            resetLoginVisualState();
            setSidebarOpen(false);
            return;
        }

        window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        });
    }

    function setSidebarOpen(isOpen) {
        const shouldOpen = window.innerWidth <= MOBILE_BREAKPOINT && !!isOpen;
        state.sidebarOpen = shouldOpen;
        elements.dashboardShell.classList.toggle("sidebar-open", shouldOpen);
        elements.sidebarOverlay.hidden = !shouldOpen;
        elements.body.classList.toggle("has-sidebar-open", shouldOpen);
    }

    function setSidebarCollapsed(isCollapsed) {
        state.sidebarCollapsed = !!isCollapsed;
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, state.sidebarCollapsed ? "1" : "0");
        elements.dashboardShell.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);

        if (elements.sidebarCollapseButton) {
            elements.sidebarCollapseButton.setAttribute("aria-pressed", String(state.sidebarCollapsed));
            elements.sidebarCollapseButton.setAttribute(
                "aria-label",
                state.sidebarCollapsed ? "Expandir menu" : "Recolher menu"
            );
        }

        applySidebarTooltips();
    }

    function applySidebarTooltips() {
        const shouldShowTooltips = state.sidebarCollapsed && window.innerWidth > MOBILE_BREAKPOINT;

        elements.sidebarNavLinks.forEach((link) => {
            const label = link.querySelector(".nav-link-copy");
            if (!label) {
                return;
            }
            if (shouldShowTooltips) {
                link.setAttribute("title", label.textContent.trim());
            } else {
                link.removeAttribute("title");
            }
        });
    }

    function setLoginFeedback(message = "") {
        elements.loginFeedback.textContent = message;
        elements.loginFeedback.classList.toggle("error-msg", !!message);
        elements.passwordInput.classList.toggle("error", !!message);
    }

    const TOAST_ICONS = {
        success: "fa-check",
        error: "fa-triangle-exclamation",
        info: "fa-circle-info"
    };

    function showToast(message, type = "success", duration = 3200) {
        window.clearTimeout(showToast.timeoutId);
        window.clearTimeout(showToast.hideTimeoutId);

        elements.toastMessage.textContent = message;
        elements.dashboardToast.hidden = false;
        elements.dashboardToast.classList.remove("is-leaving");
        elements.dashboardToast.dataset.tone = TOAST_ICONS[type] ? type : "success";
        elements.toastIcon.innerHTML = `<i class="fa-solid ${TOAST_ICONS[type] || TOAST_ICONS.success}"></i>`;

        // Reinicia a animacao da barra de progresso mesmo se um toast anterior
        // ainda estiver visivel (remove, forca reflow, reaplica).
        elements.toastProgressFill.style.animation = "none";
        void elements.toastProgressFill.offsetWidth;
        elements.toastProgressFill.style.animation = `toast-countdown ${duration}ms linear forwards`;

        requestAnimationFrame(() => {
            elements.dashboardToast.classList.add("is-visible");
        });

        showToast.timeoutId = window.setTimeout(() => hideToast(), duration);
    }

    function hideToast() {
        window.clearTimeout(showToast.timeoutId);
        elements.dashboardToast.classList.remove("is-visible");
        elements.dashboardToast.classList.add("is-leaving");
        showToast.hideTimeoutId = window.setTimeout(() => {
            elements.dashboardToast.hidden = true;
            elements.dashboardToast.classList.remove("is-leaving");
        }, 220);
    }

    function setLoadingState(isLoading) {
        elements.refreshButton.disabled = isLoading;
        elements.openSheetButton.disabled = isLoading && !state.token;
        elements.logoutButton.disabled = isLoading;
    }

    function setLoginLoading(isLoading) {
        elements.loginButton.disabled = isLoading;
        elements.passwordInput.disabled = isLoading;
        elements.togglePassword.disabled = isLoading;
        elements.loginButton.classList.toggle("loading", isLoading);
    }

    function resetLoginVisualState() {
        elements.loginButton.classList.remove("loading", "success");
        elements.passwordInput.classList.remove("error");
        elements.loginFeedback.classList.remove("error-msg");
        elements.passwordInput.style.animation = "";

        if (elements.loginSuccessOverlay) {
            elements.loginSuccessOverlay.classList.remove("visible");
            elements.loginSuccessOverlay.setAttribute("aria-hidden", "true");
        }
    }

    function shakeLoginInput() {
        elements.passwordInput.style.animation = "none";
        elements.passwordInput.offsetHeight;
        elements.passwordInput.style.animation = "shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97)";
    }

    async function showLoginSuccessState() {
        if (!elements.loginSuccessOverlay) {
            return;
        }

        elements.loginButton.classList.add("success");
        elements.loginSuccessOverlay.classList.add("visible");
        elements.loginSuccessOverlay.setAttribute("aria-hidden", "false");
        await new Promise((resolve) => window.setTimeout(resolve, 900));
    }

    function handleUnauthorized(message) {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        state.token = "";
        state.dashboard = null;
        closeDrawer();
        stopAutoRefresh();
        setAuthenticated(false);
        setLoginFeedback(message || "Sua sessao expirou. Entre novamente.");
    }

    function updateAutoRefreshState() {
        state.autoRefresh = true;
    }

    function setActiveNavSection(sectionId = "") {
        elements.sidebarNavLinks.forEach((link) => {
            const isActive = !!sectionId && link.getAttribute("href") === `#${sectionId}`;
            link.classList.toggle("active", isActive);
            link.setAttribute("aria-current", isActive ? "true" : "false");
        });
    }

    function getScrollOffset() {
        return window.innerWidth <= 760 ? 18 : 24;
    }

    function scrollToSection(sectionId, updateHash = true) {
        const target = document.getElementById(sectionId);
        if (!target) {
            return;
        }

        const top = target.getBoundingClientRect().top + window.scrollY - getScrollOffset();
        window.scrollTo({
            top: Math.max(0, top),
            left: 0,
            behavior: "smooth"
        });

        setActiveNavSection(sectionId);

        if (window.innerWidth <= MOBILE_BREAKPOINT) {
            setSidebarOpen(false);
        }

        if (updateHash) {
            window.history.replaceState(null, "", `#${sectionId}`);
        }
    }

    function bindSectionNavigation() {
        elements.sidebarNavLinks.forEach((link) => {
            link.addEventListener("click", (event) => {
                const href = link.getAttribute("href") || "";
                const sectionId = href.replace(/^#/, "");
                if (!sectionId || !document.getElementById(sectionId)) {
                    return;
                }

                event.preventDefault();
                scrollToSection(sectionId);
            });
        });

        if (!elements.mainSections.length) {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            const visibleEntry = entries
                .filter((entry) => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

            if (visibleEntry && visibleEntry.target && visibleEntry.target.id) {
                setActiveNavSection(visibleEntry.target.id);
            }
        }, {
            root: null,
            rootMargin: "-18% 0px -55% 0px",
            threshold: [0.2, 0.36, 0.58]
        });

        elements.mainSections.forEach((section) => {
            observer.observe(section);
        });

        const initialHash = window.location.hash.replace(/^#/, "");
        const hasInitialSection = initialHash && elements.mainSections.some((section) => section.id === initialHash);

        if (hasInitialSection) {
            window.requestAnimationFrame(() => {
                scrollToSection(initialHash, false);
            });
            return;
        }

        setActiveNavSection(elements.mainSections[0].id);
    }

    function startAutoRefresh() {
        stopAutoRefresh();

        if (!state.token) {
            return;
        }

        state.refreshTimer = window.setInterval(() => {
            loadDashboard({ silent: true });
        }, AUTO_REFRESH_MS);
    }

    function stopAutoRefresh() {
        if (state.refreshTimer) {
            window.clearInterval(state.refreshTimer);
            state.refreshTimer = null;
        }
    }

    function buildApiUrl(action, params = {}) {
        const url = new URL(API_URL, window.location.href);
        url.searchParams.set("action", action);

        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== "") {
                url.searchParams.set(key, String(value));
            }
        });

        url.searchParams.set("_ts", String(Date.now()));
        return url.toString();
    }

    function buildExportUrl() {
        const url = new URL(EXPORT_URL, window.location.href);
        url.searchParams.set("token", state.token);

        Object.entries(state.filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== "") {
                url.searchParams.set(key, String(value));
            }
        });

        return url.toString();
    }

    async function parseApiResponse(response) {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || payload.success === false) {
            throw new Error(payload && payload.message ? payload.message : "Resposta invalida do servidor.");
        }

        return payload;
    }

    async function apiGet(action, params = {}) {
        const response = await fetch(buildApiUrl(action, params), {
            method: "GET",
            cache: "no-store"
        });

        return parseApiResponse(response);
    }

    async function apiPost(action, data = {}) {
        const formPayload = new URLSearchParams();
        formPayload.append("action", action);

        Object.entries(data).forEach(([key, value]) => {
            formPayload.append(key, value == null ? "" : String(value));
        });

        const response = await fetch(buildApiUrl(action), {
            method: "POST",
            body: formPayload
        });

        return parseApiResponse(response);
    }

    async function handleLoginSubmit(event) {
        event.preventDefault();

        const password = elements.passwordInput.value.trim();
        if (!password) {
            setLoginFeedback("O codigo de acesso nao pode estar vazio.");
            shakeLoginInput();
            elements.passwordInput.focus();
            return;
        }

        setLoginLoading(true);
        setLoginFeedback("");

        try {
            const result = await apiPost("loginSurveyDashboard", { password });
            state.token = result.token;
            sessionStorage.setItem(SESSION_TOKEN_KEY, result.token);
            await showLoginSuccessState();
            elements.passwordInput.value = "";
            setAuthenticated(true);
            await loadDashboard();
        } catch (error) {
            setAuthenticated(false);
            setLoginFeedback(error.message || "Nao foi possivel autenticar.");
        } finally {
            setLoginLoading(false);
        }
    }

    async function handleLogout() {
        try {
            if (state.token) {
                await apiPost("logoutSurveyDashboard", { token: state.token });
            }
        } catch (error) {
            console.error(error);
        } finally {
            sessionStorage.removeItem(SESSION_TOKEN_KEY);
            state.token = "";
            state.dashboard = null;
            stopAutoRefresh();
            closeDrawer();
            setAuthenticated(false);
            setLoginFeedback("");
            showToast("Sessao encerrada.");
        }
    }

    async function loadDashboard(options = {}) {
        if (!state.token) {
            setAuthenticated(false);
            return;
        }

        setLoadingState(true);

        try {
            const payload = await apiGet("getSurveyDashboard", {
                token: state.token,
                range: state.filters.range,
                survey_slug: state.filters.survey_slug,
                language: state.filters.language,
                search: state.filters.search
            });

            state.dashboard = payload;

            renderDashboard(payload);
            loadDeepDive({ silent: true });

            startAutoRefresh();

            if (!options.silent) {
                showToast("Painel atualizado.");
            }
        } catch (error) {
            console.error(error);

            if (/Nao autorizado|Sessao expirada|invalida/i.test(error.message)) {
                handleUnauthorized("Sessao expirada ou invalida. Entre novamente.");
                return;
            }

            if (!options.silent) {
                showToast(error.message || "Nao foi possivel carregar o painel.", "error");
            }
        } finally {
            setLoadingState(false);
        }
    }

    async function loadDeepDive(options = {}) {
        if (!state.token) {
            return;
        }

        try {
            const payload = await apiGet("getSurveyQuestionCatalog", {
                token: state.token,
                survey_slug: state.deepDiveSurveySlug,
                range: state.filters.range,
                language: state.filters.language,
                search: state.filters.search
            });

            renderFunnels(payload.funnel || []);
            renderDeepDiveSections(payload.sections || []);
        } catch (error) {
            console.error(error);

            if (/Nao autorizado|Sessao expirada|invalida/i.test(error.message)) {
                handleUnauthorized("Sessao expirada ou invalida. Entre novamente.");
                return;
            }

            if (!options.silent) {
                showToast(error.message || "Nao foi possivel carregar a analise por pesquisa.", "error");
            }
        }
    }

    function renderFunnels(funnels) {
        if (!elements.conversionFunnels) {
            return;
        }

        if (!funnels.length) {
            elements.conversionFunnels.innerHTML = buildEmptyState("Sem dados de funil para este recorte.");
            return;
        }

        elements.conversionFunnels.innerHTML = funnels.map((funnel) => {
            const maxCount = Math.max(...funnel.stages.map((stage) => stage.count), 1);
            const totalStages = funnel.stages.length || 1;

            const stagesMarkup = funnel.stages.map((stage, index) => {
                const widthPercent = Math.max(6, (stage.count / maxCount) * 100);
                const intensity = 0.35 + ((totalStages - index) / totalStages) * 0.55;
                return `
                    <div class="funnel-stage">
                        <div class="funnel-stage-head">
                            <span>${escapeHtml(stage.label)}</span>
                            <strong>${escapeHtml(formatNumber(stage.count))} | ${escapeHtml(formatPercent(stage.percent))}</strong>
                        </div>
                        <div class="funnel-bar-track">
                            <span class="funnel-bar-fill" style="width:${widthPercent}%; opacity:${intensity}"></span>
                        </div>
                    </div>
                `;
            }).join("");

            return `
                <article class="panel funnel-panel">
                    <div class="section-heading section-heading-tight">
                        <div>
                            <p class="eyebrow">Funil</p>
                            <h2>${escapeHtml(funnel.question_label)}</h2>
                        </div>
                        <span class="stack-count">${escapeHtml(formatNumber(funnel.response_count))} respostas</span>
                    </div>
                    <div class="funnel-stages">${stagesMarkup}</div>
                </article>
            `;
        }).join("");
    }

    function renderDeepDiveSections(sections) {
        if (!elements.deepDiveSections) {
            return;
        }

        if (!sections.length) {
            elements.deepDiveSections.innerHTML = buildEmptyState("Sem perguntas cadastradas para este survey.");
            return;
        }

        elements.deepDiveSections.innerHTML = sections.map((section) => {
            const questionsMarkup = section.questions.map((question) => renderDeepDiveQuestionCard(question)).join("");
            return `
                <div class="deep-dive-section">
                    <h3 class="deep-dive-section-title">${escapeHtml(section.title)}</h3>
                    <div class="question-insights">${questionsMarkup}</div>
                </div>
            `;
        }).join("");
    }

    function renderDeepDiveQuestionCard(item) {
        const topAnswers = (item.top_answers || []).length
            ? (item.top_answers || []).map((answer) => `
                <div class="answer-row">
                    <div class="answer-row-head">
                        <span>${escapeHtml(answer.label)}</span>
                        <strong>${escapeHtml(formatNumber(answer.count))} | ${escapeHtml(formatPercent(answer.percent))}</strong>
                    </div>
                    <div class="stack-bar"><span style="width:${Math.max(4, answer.percent * 100)}%"></span></div>
                </div>
            `).join("")
            : buildEmptyState("Ainda sem respostas para esta pergunta no recorte atual.");

        const samples = (item.sample_answers || []).length
            ? `
                <ul class="sample-list">
                    ${(item.sample_answers || []).map((sample) => `<li>${escapeHtml(sample)}</li>`).join("")}
                </ul>
            `
            : "";

        return `
            <article class="question-card">
                <div class="stack-head">
                    <div>
                        <h4>${escapeHtml(item.question_label || item.question_key)}</h4>
                        <span>${escapeHtml(item.question_key || "")}</span>
                    </div>
                    <div class="stack-count">${escapeHtml(formatNumber(item.response_count))}</div>
                </div>
                <div class="stack-meta">
                    <span class="tag">${escapeHtml(item.question_type || "text")}</span>
                    <span class="tag">${escapeHtml(formatNumber(item.distinct_answers || 0))} respostas distintas</span>
                </div>
                <div class="question-top-answers">${topAnswers}</div>
                ${samples}
            </article>
        `;
    }

    function renderDashboard(payload) {
        renderSummary(payload.summary || {}, payload.timeline || []);
        renderSelectOptions(
            elements.surveyFilter,
            payload.survey_options || [],
            "survey_slug",
            "survey_title",
            "Todos os surveys",
            state.filters.survey_slug
        );
        renderSelectOptions(
            elements.languageFilter,
            payload.language_options || [],
            "language",
            "label",
            "Todos os idiomas",
            state.filters.language
        );
        renderTimeline(payload.timeline || []);
        renderSurveyBreakdown(payload.survey_breakdown || []);
        renderLanguageBreakdown(payload.language_breakdown || []);
        renderHeatmap(elements.hourlyHeatmap, payload.hourly_breakdown || []);
        renderHeatmap(elements.weekdayHeatmap, payload.weekday_breakdown || []);
        renderResponsesTable(payload.latest_responses || []);
    }

    function buildSparkline(timeline) {
        const counts = (timeline || []).map((point) => point.count);
        if (counts.length < 2) {
            return "";
        }

        const width = 240;
        const height = 40;
        const max = Math.max(...counts, 1);
        const min = Math.min(...counts, 0);
        const range = Math.max(max - min, 1);
        const stepX = width / (counts.length - 1);

        const points = counts.map((count, index) => {
            const x = index * stepX;
            const y = height - ((count - min) / range) * (height - 6) - 3;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        });

        const areaPoints = `0,${height} ${points.join(" ")} ${width},${height}`;

        return `
            <svg class="summary-sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
                <polygon points="${areaPoints}" fill="currentColor" fill-opacity="0.14" stroke="none"></polygon>
                <polyline points="${points.join(" ")}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>
            </svg>
        `;
    }

    function renderSummary(summary, timeline) {
        const cards = [
            {
                label: "Total de respostas",
                icon: "fa-chart-line",
                value: formatNumber(summary.total_responses),
                description: "Volume consolidado dentro da janela ativa.",
                meta: summary.latest_received_at
                    ? `Ultima entrada em ${formatDateTime(summary.latest_received_at)}`
                    : "Aguardando novas entradas",
                trend: buildTrendMarkup(summary.trend_delta, summary.trend_percent),
                sparkline: buildSparkline(timeline),
                featured: true
            },
            {
                label: "Ultimas 24 horas",
                icon: "fa-bolt",
                value: formatNumber(summary.last_24h),
                description: "Pulso operacional mais imediato.",
                meta: "Leitura de curtissimo prazo"
            },
            {
                label: "Ultimos 7 dias",
                icon: "fa-calendar-week",
                value: formatNumber(summary.last_7d),
                description: "Ritmo semanal da captacao.",
                meta: "Janela semanal"
            },
            {
                label: "Hoje",
                icon: "fa-sun",
                value: formatNumber(summary.today),
                description: "Envios recebidos no dia corrente.",
                meta: "Atualiza ao longo do dia"
            },
            {
                label: "Surveys ativos",
                icon: "fa-layer-group",
                value: formatNumber(summary.active_surveys),
                description: "Quantidade de surveys presentes no recorte.",
                meta: "Cobertura atual"
            },
            {
                label: "Completion medio",
                icon: "fa-bullseye",
                value: formatPercent(summary.avg_completion_rate),
                description: `Media de ${formatNumber(Math.round(summary.avg_answered_count || 0))} respostas por envio.`,
                meta: "Qualidade media de preenchimento"
            }
        ];

        elements.summaryGrid.innerHTML = cards.map((card) => `
            <article class="summary-card ${card.featured ? "featured" : ""}">
                <div class="summary-icon"><i class="fa-solid ${card.icon}"></i></div>
                <div class="summary-head">
                    <p class="eyebrow">${escapeHtml(card.label)}</p>
                    ${card.trend || ""}
                </div>
                <strong class="summary-value">${escapeHtml(card.value)}</strong>
                <p>${escapeHtml(card.description)}</p>
                <span class="summary-meta">${escapeHtml(card.meta || "")}</span>
                ${card.sparkline || ""}
            </article>
        `).join("");
    }

    function buildTrendMarkup(delta, percent) {
        if (delta === null || delta === undefined) {
            return "";
        }

        if (percent === null || percent === undefined) {
            return `<span class="metric-trend">Sem comparativo anterior</span>`;
        }

        const tone = delta >= 0 ? "positive" : "negative";
        const signal = delta >= 0 ? "+" : "";

        return `<span class="metric-trend ${tone}">${signal}${formatNumber(delta)} | ${signal}${Math.round(percent)}%</span>`;
    }

    function renderSelectOptions(element, options, valueKey, labelKey, placeholder, selectedValue) {
        const optionMarkup = options.map((item) => `
            <option value="${escapeHtml(item[valueKey])}">${escapeHtml(item[labelKey])}</option>
        `).join("");

        element.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>${optionMarkup}`;
        element.value = selectedValue || "";
    }

    function renderTimeline(points) {
        if (!points.length) {
            elements.timelineChart.innerHTML = buildEmptyState("Nenhuma resposta encontrada para a janela selecionada.");
            return;
        }

        const maxCount = Math.max(...points.map((item) => item.count), 1);
        elements.timelineChart.innerHTML = points.map((item) => {
            const height = Math.max(12, Math.round((item.count / maxCount) * 190));
            const tooltip = `${item.label} • ${formatNumber(item.count)} ${item.count === 1 ? "resposta" : "respostas"}`;
            return `
                <div class="timeline-bar has-tooltip" data-tooltip="${escapeHtml(tooltip)}">
                    <span class="timeline-value">${escapeHtml(String(item.count))}</span>
                    <div class="timeline-column" style="height:${height}px"></div>
                    <span class="timeline-label">${escapeHtml(item.label)}</span>
                </div>
            `;
        }).join("");
    }

    function renderSurveyBreakdown(items) {
        if (!items.length) {
            elements.surveyBreakdown.innerHTML = buildEmptyState("Sem surveys com dados no filtro atual.");
            return;
        }

        const maxCount = Math.max(...items.map((item) => item.count), 1);
        elements.surveyBreakdown.innerHTML = items.map((item) => `
            <div class="stack-item">
                <div class="stack-head">
                    <div>
                        <strong>${escapeHtml(item.survey_title || item.survey_slug)}</strong>
                        <span>${escapeHtml(item.survey_niche || item.survey_slug || "Sem nicho")}</span>
                    </div>
                    <div class="stack-count">${escapeHtml(formatNumber(item.count))}</div>
                </div>
                <div class="stack-bar"><span style="width:${Math.max(8, (item.count / maxCount) * 100)}%"></span></div>
                <div class="stack-meta">
                    <span class="tag">${escapeHtml(formatPercent(item.avg_completion_rate))} completion</span>
                    <span class="tag">${escapeHtml((item.languages || []).map(languageLabel).join(" | ") || "Sem idioma")}</span>
                    <span class="tag">${escapeHtml(formatDateTime(item.latest_received_at))}</span>
                </div>
            </div>
        `).join("");
    }

    function renderLanguageBreakdown(items) {
        if (!items.length) {
            elements.languageBreakdown.innerHTML = buildEmptyState("Nenhum idioma encontrado.");
            return;
        }

        const maxCount = Math.max(...items.map((item) => item.count), 1);
        const totalCount = items.reduce((acc, item) => acc + (Number(item.count) || 0), 0);

        elements.languageBreakdown.innerHTML = items.map((item) => `
            <div class="stack-item">
                <div class="stack-head">
                    <div>
                        <strong>${escapeHtml(item.label || languageLabel(item.language))}</strong>
                        <span>${escapeHtml(item.language || "N/A")}</span>
                    </div>
                    <div class="stack-count">${escapeHtml(formatNumber(item.count))}</div>
                </div>
                <div class="stack-bar"><span style="width:${Math.max(10, (item.count / maxCount) * 100)}%"></span></div>
                <div class="stack-meta">
                    <span class="tag">${escapeHtml(totalCount ? formatPercent(item.count / totalCount) : "0%")} do total</span>
                    <span class="tag">${escapeHtml(item.language || "N/A")}</span>
                </div>
            </div>
        `).join("");
    }

    function renderHeatmap(container, items) {
        if (!items.length) {
            container.innerHTML = buildEmptyState("Sem distribuicao disponivel.");
            return;
        }

        const maxCount = Math.max(...items.map((item) => item.count), 1);
        const totalCount = items.reduce((acc, item) => acc + (Number(item.count) || 0), 0);
        container.innerHTML = items.map((item) => {
            const intensity = item.count / maxCount;
            const alpha = 0.08 + (intensity * 0.22);
            const border = 0.14 + (intensity * 0.24);
            const strongTone = intensity > 0.62 ? "is-strong" : "";
            const share = totalCount ? formatPercent(item.count / totalCount) : "0%";
            const tooltip = `${item.label} • ${formatNumber(item.count)} (${share})`;

            return `
                <div
                    class="heatmap-cell has-tooltip ${strongTone}"
                    data-tooltip="${escapeHtml(tooltip)}"
                    style="background-color:rgba(var(--accent-rgb), ${alpha}); border-color:rgba(var(--accent-rgb), ${border});"
                >
                    <strong>${escapeHtml(formatNumber(item.count))}</strong>
                    <span>${escapeHtml(item.label)}</span>
                </div>
            `;
        }).join("");
    }

    function renderResponsesTable(items) {
        if (!items.length) {
            elements.responsesTableBody.innerHTML = `
                <tr>
                    <td colspan="6">${buildEmptyState("Nenhuma resposta corresponde aos filtros atuais.")}</td>
                </tr>
            `;
            return;
        }

        elements.responsesTableBody.innerHTML = items.map((item) => `
            <tr data-response-id="${escapeHtml(item.response_id)}">
                <td>
                    <div class="table-title">
                        <strong>${escapeHtml(formatDateTime(item.submitted_at))}</strong>
                        <span>${escapeHtml(formatRelativeTime(item.submitted_at))}</span>
                    </div>
                </td>
                <td>
                    <div class="table-title">
                        <strong>${escapeHtml(item.survey_title || item.survey_slug)}</strong>
                        <span>${escapeHtml(item.survey_niche || item.survey_slug || "")}</span>
                    </div>
                </td>
                <td>
                    <div class="table-title">
                        <strong>${escapeHtml(item.primary_value || "Nao informado")}</strong>
                        <span>${escapeHtml(item.primary_label || "Registro principal")}</span>
                    </div>
                </td>
                <td>
                    <div class="table-title">
                        <strong>${escapeHtml(item.contact_name || item.contact_email || item.contact_phone || "Nao informado")}</strong>
                        <span>${escapeHtml(item.contact_email || item.contact_phone || "Sem contato identificado")}</span>
                    </div>
                </td>
                <td>${escapeHtml(languageLabel(item.language))}</td>
                <td>
                    <div class="table-title">
                        <strong>${escapeHtml(formatPercent(item.completion_rate || 0))}</strong>
                        <span>${escapeHtml(formatNumber(item.answered_count || 0))}/${escapeHtml(formatNumber(item.question_count || 0))} campos</span>
                    </div>
                </td>
            </tr>
        `).join("");
    }

    function buildEmptyState(message) {
        return `<div class="empty-state">${escapeHtml(message)}</div>`;
    }

    async function openResponseDetail(responseId) {
        if (!responseId || !state.token) {
            return;
        }

        elements.responseDrawer.hidden = false;
        elements.drawerTitle.textContent = "Carregando resposta...";
        elements.drawerBody.innerHTML = buildEmptyState("Buscando detalhes da resposta selecionada...");

        try {
            const detail = await apiGet("getSurveyResponseDetail", {
                token: state.token,
                response_id: responseId
            });

            renderResponseDetail(detail);
        } catch (error) {
            console.error(error);

            if (/Nao autorizado|Sessao expirada|invalida/i.test(error.message)) {
                handleUnauthorized("Sessao expirada ou invalida. Entre novamente.");
                return;
            }

            elements.drawerTitle.textContent = "Nao foi possivel abrir";
            elements.drawerBody.innerHTML = buildEmptyState(error.message || "Falha ao buscar o detalhamento.");
        }
    }

    function renderResponseDetail(payload) {
        const response = payload.response || {};
        const answers = payload.answers || [];

        elements.drawerTitle.textContent = response.primary_value || response.survey_title || "Detalhamento da resposta";
        elements.drawerBody.innerHTML = `
            <section class="detail-card">
                <div class="section-heading section-heading-tight">
                    <div>
                        <p class="eyebrow">Resumo da resposta</p>
                        <h2>${escapeHtml(response.survey_title || response.survey_slug || "Survey")}</h2>
                    </div>
                </div>
                <div class="detail-grid">
                    <div class="detail-field">
                        <span>Recebida em</span>
                        <strong>${escapeHtml(formatDateTime(response.submitted_at))}</strong>
                    </div>
                    <div class="detail-field">
                        <span>Idioma</span>
                        <strong>${escapeHtml(languageLabel(response.language))}</strong>
                    </div>
                    <div class="detail-field">
                        <span>Registro principal</span>
                        <strong>${escapeHtml(response.primary_value || "Nao informado")}</strong>
                    </div>
                    <div class="detail-field">
                        <span>Contato</span>
                        <strong>${escapeHtml(response.contact_name || response.contact_email || response.contact_phone || "Nao informado")}</strong>
                    </div>
                    <div class="detail-field">
                        <span>E-mail</span>
                        <strong>${escapeHtml(response.contact_email || "Nao informado")}</strong>
                    </div>
                    <div class="detail-field">
                        <span>Telefone</span>
                        <strong>${escapeHtml(response.contact_phone || "Nao informado")}</strong>
                    </div>
                </div>
            </section>
            <section class="detail-card">
                <div class="section-heading section-heading-tight">
                    <div>
                        <p class="eyebrow">Conteudo preenchido</p>
                        <h2>Respostas enviadas</h2>
                    </div>
                </div>
                <div class="answer-list">
                    ${answers.length ? answers.map((item) => `
                        <article class="answer-item">
                            <strong>${escapeHtml(item.question_label || item.question_key)}</strong>
                            <p>${escapeHtml(item.answer_value || "Nao informado")}</p>
                        </article>
                    `).join("") : buildEmptyState("Nenhuma resposta detalhada encontrada para este envio.")}
                </div>
            </section>
        `;
    }

    function closeDrawer() {
        elements.responseDrawer.hidden = true;
        elements.drawerBody.innerHTML = "";
        elements.drawerTitle.textContent = "Detalhamento da resposta";
    }

    function syncTopbarHeight() {
        if (!elements.topbar) return;
        const height = Math.ceil(elements.topbar.getBoundingClientRect().height);
        if (height > 0) {
            document.documentElement.style.setProperty("--topbar-height-live", `${height}px`);
        }
    }

    function watchTopbarHeight() {
        syncTopbarHeight();
        if (typeof ResizeObserver === "function" && elements.topbar) {
            const observer = new ResizeObserver(() => syncTopbarHeight());
            observer.observe(elements.topbar);
        } else {
            window.addEventListener("resize", syncTopbarHeight);
        }
    }

    function bindEvents() {
        elements.loginForm.addEventListener("submit", handleLoginSubmit);

        elements.passwordInput.addEventListener("input", () => {
            if (elements.loginFeedback.textContent) {
                setLoginFeedback("");
            }
            elements.passwordInput.style.animation = "";
        });

        elements.togglePassword.addEventListener("click", () => {
            const nextType = elements.passwordInput.type === "password" ? "text" : "password";
            const isVisible = nextType === "text";
            elements.passwordInput.type = nextType;
            elements.togglePassword.setAttribute(
                "aria-label",
                isVisible ? "Ocultar codigo de acesso" : "Mostrar codigo de acesso"
            );
            elements.togglePassword.setAttribute("aria-pressed", String(isVisible));

            if (elements.iconEye && elements.iconEyeOff) {
                elements.iconEye.style.display = isVisible ? "none" : "";
                elements.iconEyeOff.style.display = isVisible ? "" : "none";
            } else {
                elements.togglePassword.innerHTML = nextType === "password"
                    ? '<i class="fa-regular fa-eye"></i>'
                    : '<i class="fa-regular fa-eye-slash"></i>';
            }
        });

        elements.themeToggleButtons.forEach((button) => {
            button.addEventListener("click", toggleTheme);
        });

        elements.refreshButton.addEventListener("click", () => {
            loadDashboard();
        });

        elements.logoutButton.addEventListener("click", handleLogout);

        elements.openSheetButton.addEventListener("click", () => {
            if (!state.token) {
                showToast("Faca login para exportar os dados.", "info");
                return;
            }

            window.open(buildExportUrl(), "_blank", "noopener");
        });

        elements.rangeGroup.addEventListener("change", () => {
            state.filters.range = elements.rangeGroup.value;
            loadDashboard();
        });

        elements.surveyFilter.addEventListener("change", () => {
            state.filters.survey_slug = elements.surveyFilter.value;
            loadDashboard();
        });

        if (elements.surveyTabs) {
            elements.surveyTabs.addEventListener("click", (event) => {
                const button = event.target.closest("[data-survey-slug]");
                if (!button) {
                    return;
                }

                state.deepDiveSurveySlug = button.dataset.surveySlug;
                elements.surveyTabs.querySelectorAll("[data-survey-slug]").forEach((item) => {
                    const isActive = item.dataset.surveySlug === state.deepDiveSurveySlug;
                    item.classList.toggle("active", isActive);
                    item.setAttribute("aria-selected", String(isActive));
                });
                loadDeepDive();
            });
        }

        elements.languageFilter.addEventListener("change", () => {
            state.filters.language = elements.languageFilter.value;
            loadDashboard();
        });

        elements.searchFilter.addEventListener("input", () => {
            window.clearTimeout(state.searchDebounce);
            state.searchDebounce = window.setTimeout(() => {
                state.filters.search = elements.searchFilter.value.trim();
                loadDashboard({ silent: true });
            }, 260);
        });

        if (elements.toastCloseButton) {
            elements.toastCloseButton.addEventListener("click", () => hideToast());
        }

        elements.responsesTableBody.addEventListener("click", (event) => {
            const row = event.target.closest("[data-response-id]");
            if (!row) {
                return;
            }

            openResponseDetail(row.dataset.responseId);
        });

        elements.drawerBackdrop.addEventListener("click", closeDrawer);
        elements.closeDrawerButton.addEventListener("click", closeDrawer);

        if (elements.sidebarToggleButton) {
            elements.sidebarToggleButton.addEventListener("click", () => {
                setSidebarOpen(true);
            });
        }

        if (elements.sidebarCloseButton) {
            elements.sidebarCloseButton.addEventListener("click", () => {
                setSidebarOpen(false);
            });
        }

        if (elements.sidebarCollapseButton) {
            elements.sidebarCollapseButton.addEventListener("click", () => {
                setSidebarCollapsed(!state.sidebarCollapsed);
            });
        }

        elements.sidebarOverlay.addEventListener("click", () => {
            setSidebarOpen(false);
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > MOBILE_BREAKPOINT) {
                setSidebarOpen(false);
            }
            applySidebarTooltips();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                if (!elements.responseDrawer.hidden) {
                    closeDrawer();
                    return;
                }

                if (state.sidebarOpen) {
                    setSidebarOpen(false);
                }
            }
        });
    }

    async function bootstrap() {
        applyTheme(state.theme);
        setSidebarCollapsed(state.sidebarCollapsed);
        updateAutoRefreshState();
        bindEvents();
        bindSectionNavigation();
        watchTopbarHeight();

        if (state.token) {
            setAuthenticated(true);
            await loadDashboard({ silent: true });
            return;
        }

        setAuthenticated(false);
    }

    bootstrap();
})();
