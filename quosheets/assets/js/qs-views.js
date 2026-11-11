/**
 * Quosheets — telas do app alem da planilha: Arquivos, Analises (graficos, tabela dinamica, perfil),
 * Quo.IA (automacoes, perguntas, insights, formulas) e Conta (plano, creditos, seguranca).
 * Tambem: barra do topo, cartao do plano, avisos (teste/expirado/pagamento), paywall e checkout.
 */
(() => {
    const QS = window.QS;
    const { t, tn, esc, icon } = QS;
    const $ = (sel, root = document) => root.querySelector(sel);
    const App = () => QS.app;
    const state = { analysisTab: 'charts', aiTab: 'automate', charts: [], askHistory: [], insights: null, automation: null, bannerDismissed: false };

    // ── Barra do topo, plano e creditos ───────────────────────────────────
    function me() { return App().me; }

    function renderChrome() {
        const user = me();
        const access = user.access;
        const credits = user.credits;
        const pill = $('#qsCreditsPill');
        if (pill) {
            pill.innerHTML = `${icon('sparkles', 15)}<span>${esc(tn('credits.pill', Math.max(0, credits.remaining)))}</span>`;
            pill.classList.toggle('is-low', credits.remaining < Math.max(50, credits.allowance * 0.05));
        }
        const card = $('#qsPlanCard');
        if (card) {
            let title; let line; let cta = '';
            if (access.state === 'trial') {
                title = t('plan.trial_title');
                line = tn('plan.trial_days', access.days_left);
                cta = `<button type="button" class="qs-plan-btn" data-act="subscribe">${esc(t('plan.subscribe'))}</button>`;
            } else if (access.state === 'active') {
                title = t('plan.pro_title');
                line = access.cancel_at_period_end ? t('plan.ends_on', { date: QS.fmt.day(access.current_period_end) }) : t('plan.active_line');
                cta = `<button type="button" class="qs-plan-btn" data-act="portal">${esc(t('plan.manage'))}</button>`;
            } else if (access.state === 'comp' || access.state === 'admin') {
                title = t(access.state === 'admin' ? 'plan.admin_title' : 'plan.comp_title');
                line = access.state === 'comp' ? t('plan.until', { date: QS.fmt.day(access.comp_until) }) : t('plan.admin_line');
            } else {
                title = t('plan.expired_title');
                line = t('plan.expired_line');
                cta = `<button type="button" class="qs-plan-btn" data-act="subscribe">${esc(t('plan.subscribe'))}</button>`;
            }
            const pct = credits.allowance ? QS.clamp((credits.remaining / credits.allowance) * 100, 0, 100) : 0;
            card.innerHTML = `<div class="qs-plan-card is-${access.state}">
                <div class="qs-plan-top">${icon(access.state === 'active' ? 'crown' : access.state === 'expired' ? 'lock' : 'zap', 16)}<h4>${esc(title)}</h4></div>
                <p>${esc(line)}</p>
                <div class="qs-plan-credits"><span>${esc(t('credits.label'))}</span><b>${QS.fmt.int(Math.max(0, credits.remaining))}</b></div>
                <div class="qs-meter"><span style="width:${pct}%"></span></div>
                ${cta}
            </div>`;
        }
        const banner = $('#qsBanner');
        if (banner) {
            let html = '';
            if (access.past_due) html = `${icon('triangle-alert', 18)}<span>${esc(t('banner.past_due'))}</span><button type="button" class="qs-btn qs-btn-sm qs-btn-primary" data-act="portal">${esc(t('banner.update_payment'))}</button>`;
            else if (access.state === 'expired') html = `${icon('lock', 18)}<span>${esc(t('banner.expired'))}</span><button type="button" class="qs-btn qs-btn-sm qs-btn-primary" data-act="subscribe">${esc(t('plan.subscribe'))}</button>`;
            else if (access.state === 'trial' && access.days_left <= 3 && !state.bannerDismissed) html = `${icon('zap', 18)}<span>${esc(tn('banner.trial_ending', access.days_left))}</span><button type="button" class="qs-btn qs-btn-sm qs-btn-primary" data-act="subscribe">${esc(t('plan.subscribe'))}</button><button type="button" class="qs-icon-btn" data-act="dismiss-banner" aria-label="${esc(t('common.close'))}">${icon('x', 16)}</button>`;
            banner.innerHTML = html;
            banner.hidden = !html;
        }
        const avatar = $('#qsAvatar');
        if (avatar) avatar.textContent = (user.name || user.email).trim().charAt(0).toUpperCase();
        const uname = $('#qsUserName');
        if (uname) uname.textContent = (user.name || user.email).split(' ')[0];
        const ustate = $('#qsUserPlan');
        if (ustate) ustate.textContent = t(`plan.state_${access.state}`);
    }

    function updateCredits(credits) {
        if (!credits) return;
        const user = me();
        user.credits.remaining = credits.remaining;
        if (credits.allowance !== undefined) user.credits.allowance = credits.allowance;
        user.credits.used = Math.max(0, user.credits.allowance - credits.remaining);
        renderChrome();
        const hero = document.querySelector('.qs-ai-credits b');
        if (hero) hero.textContent = QS.fmt.int(Math.max(0, credits.remaining));
        if (App().view === 'account') renderAccount();
    }

    async function refreshMe() {
        try {
            const res = await QS.api('me');
            App().me = res.user;
            renderChrome();
        } catch (e) { /* mantem estado */ }
    }

    function aiError(err) {
        if (err && err.code === 'plan_required') { paywall('ai'); return; }
        if (err && err.code === 'no_credits') {
            QS.ui.modal({
                title: t('credits.out_title'), icon: 'sparkles', size: 'sm',
                body: `<p>${esc(err.message)}</p>`,
                actions: [{ label: t('common.close') }, me().access.state === 'trial' ? { label: t('plan.subscribe'), kind: 'primary', onClick: () => openSubscribe() } : null].filter(Boolean),
            });
            return;
        }
        QS.ui.toast((err && err.message) || t('err.server_error'), 'error');
    }

    // ── Assinatura ────────────────────────────────────────────────────────
    function priceLabel(currency) {
        const prices = QS.boot.prices || {};
        return QS.fmt.currency(prices[currency] || 0, currency);
    }
    function defaultCurrency() { return QS.lang === 'pt' ? 'BRL' : 'USD'; }

    function paywall(feature) {
        const access = me().access;
        const titleKey = access.state === 'expired' ? 'paywall.expired_title' : 'paywall.title';
        const body = QS.el(`<div class="qs-paywall">
            <p>${esc(t(`paywall.${feature}`))}</p>
            <ul class="qs-check-list">${['paywall.b1', 'paywall.b2', 'paywall.b3', 'paywall.b4'].map((k) => `<li>${icon('check', 16)}<span>${esc(t(k))}</span></li>`).join('')}</ul>
            <p class="qs-paywall-price"><b>${esc(priceLabel(defaultCurrency()))}</b> <span>${esc(t('pricing.per_month'))}</span></p>
        </div>`);
        QS.ui.modal({
            title: t(titleKey), icon: 'crown', size: 'sm', body,
            actions: [{ label: t('common.close') }, { label: t('plan.subscribe'), kind: 'primary', icon: 'credit-card', onClick: () => { openSubscribe(); } }],
        });
    }

    function openSubscribe() {
        const cur = defaultCurrency();
        const body = QS.el(`<div class="qs-subscribe">
            <p>${esc(t('subscribe.intro'))}</p>
            <div class="qs-currency-options">
                ${['BRL', 'USD'].map((c) => `<label class="qs-currency-option"><input type="radio" name="currency" value="${c}" ${c === cur ? 'checked' : ''}><span><b>${esc(priceLabel(c))}</b><em>${esc(t('pricing.per_month'))}</em><small>${esc(t(`subscribe.${c.toLowerCase()}_hint`))}</small></span></label>`).join('')}
            </div>
            <p class="qs-hint">${icon('shield-check', 14)} ${esc(t('subscribe.secure'))}</p>
        </div>`);
        QS.ui.modal({
            title: t('subscribe.title'), icon: 'credit-card', size: 'sm', body,
            actions: [{ label: t('common.cancel') }, {
                label: t('subscribe.go'), kind: 'primary', icon: 'external-link', id: 'go', onClick: async (m) => {
                    m.setBusy(true);
                    try {
                        const res = await QS.api('checkout', { currency: body.querySelector('[name=currency]:checked').value });
                        window.location.href = res.url;
                        return false;
                    } catch (e) {
                        m.setBusy(false);
                        QS.ui.toast(e.message, 'error');
                        return false;
                    }
                },
            }],
        });
    }

    async function openPortal() {
        try {
            const res = await QS.api('portal', {});
            window.location.href = res.url;
        } catch (e) {
            QS.ui.toast(e.message, 'error');
        }
    }

    async function handleReturnParams() {
        const params = new URLSearchParams(location.search);
        const clean = () => { history.replaceState(null, '', location.pathname + location.hash); };
        if (params.get('checkout') === 'success' && params.get('session_id')) {
            clean();
            const done = App().loading(t('subscribe.confirming'));
            try {
                for (let i = 0; i < 4; i += 1) {
                    const res = await QS.api('syncCheckout', { session_id: params.get('session_id') });
                    App().me = res.user;
                    if (res.user.access.subscribed) break;
                    await new Promise((r) => setTimeout(r, 1500));
                }
                renderChrome();
                if (App().me.access.subscribed) {
                    QS.ui.modal({ title: t('subscribe.success_title'), icon: 'crown', size: 'sm', body: `<p>${esc(t('subscribe.success_body'))}</p>`, actions: [{ label: t('common.continue'), kind: 'primary' }] });
                } else {
                    QS.ui.toast(t('subscribe.pending'), 'info');
                }
            } catch (e) {
                QS.ui.toast(e.message, 'error');
            } finally { done(); }
        } else if (params.get('checkout') === 'cancel') {
            clean();
            QS.ui.toast(t('subscribe.canceled'), 'info');
        } else if (params.get('welcome') === '1') {
            clean();
            const body = QS.el(`<div class="qs-welcome">
                <p>${esc(tn('welcome.body', me().access.days_left || 7))}</p>
                <div class="qs-welcome-actions">
                    <button type="button" class="qs-welcome-card" data-act="open-sample" data-close-modal>${icon('rocket', 22)}<b>${esc(t('welcome.sample'))}</b><span>${esc(t('welcome.sample_hint'))}</span></button>
                    <button type="button" class="qs-welcome-card" data-act="open-file" data-close-modal>${icon('upload', 22)}<b>${esc(t('welcome.open'))}</b><span>${esc(t('welcome.open_hint'))}</span></button>
                </div>
            </div>`);
            const m = QS.ui.modal({ title: t('welcome.title', { name: (me().name || '').split(' ')[0] }), icon: 'sparkles', size: 'md', body });
            body.addEventListener('click', (e) => { if (e.target.closest('[data-close-modal]')) m.close(); });
        }
    }

    // ── Titulo do arquivo ─────────────────────────────────────────────────
    function renderFileTitle() {
        const node = $('#qsViewTitle');
        if (!node) return;
        const view = App().view;
        const file = App().file;
        if ((view === 'sheet' || view === 'analysis') && file) {
            node.innerHTML = `<button type="button" class="qs-file-title" data-act="rename-file" title="${esc(t('files.rename'))}">${icon('file-spreadsheet', 18)}<span></span>${icon('pencil', 13, 'qs-file-title-edit')}</button>`;
            node.querySelector('span').textContent = file.name;
        } else {
            node.innerHTML = `<h2>${esc(t(`nav.${view}`))}</h2>`;
        }
        App().renderSaveState();
    }

    async function renameFile() {
        const file = App().file;
        if (!file) return;
        const name = await QS.ui.prompt(t('files.rename'), { value: file.name, maxLength: 100 });
        if (!name) return;
        file.name = name;
        App().markDirty();
        renderFileTitle();
    }

    // ── Arquivos ──────────────────────────────────────────────────────────
    async function renderFiles() {
        const host = $('#qsFilesView');
        if (!host) return;
        host.innerHTML = `<div class="qs-files">
            <div class="qs-dropzone" data-act="open-file" role="button" tabindex="0">
                <div class="qs-dropzone-icon">${icon('upload', 34)}</div>
                <h2>${esc(t('files.drop_title'))}</h2>
                <p>${esc(t('files.drop_sub'))}</p>
                <div class="qs-dropzone-actions">
                    <button type="button" class="qs-btn qs-btn-primary" data-act="open-file">${icon('folder-open', 18)}<span>${esc(t('files.open'))}</span></button>
                    <button type="button" class="qs-btn qs-btn-ghost" data-act="new-blank">${icon('file-plus', 18)}<span>${esc(t('files.new_blank'))}</span></button>
                    <button type="button" class="qs-btn qs-btn-ghost" data-act="open-sample">${icon('rocket', 18)}<span>${esc(t('files.sample'))}</span></button>
                </div>
                <p class="qs-privacy-note">${icon('shield-check', 15)}<span>${esc(t('files.privacy'))}</span></p>
            </div>
            <div class="qs-recent">
                <div class="qs-section-head"><h3>${esc(t('files.recent'))}</h3><span class="qs-storage" id="qsStorageInfo"></span></div>
                <div class="qs-recent-list" id="qsRecentList"><p class="qs-hint">${esc(t('common.loading'))}</p></div>
            </div>
        </div>`;
        const list = $('#qsRecentList');
        let files = [];
        try { files = await QS.store.list(); } catch (e) { files = []; }
        if (!files.length) {
            list.innerHTML = `<div class="qs-empty-card">${icon('files', 28)}<p>${esc(t('files.empty'))}</p></div>`;
        } else {
            list.innerHTML = files.map((f) => `<div class="qs-file-card${App().file && App().file.id === f.id ? ' is-current' : ''}" data-file="${f.id}">
                <button type="button" class="qs-file-open" data-open-file="${f.id}">
                    <span class="qs-file-icon">${icon('file-spreadsheet', 22)}</span>
                    <span class="qs-file-meta"><b></b><small>${esc(tn('files.rows', f.rows))} · ${esc(tn('files.cols', f.cols))}${f.sheets > 1 ? ` · ${esc(tn('files.sheets', f.sheets))}` : ''}</small><small>${esc(t('files.edited', { when: QS.fmt.rel(f.updatedAt) }))}</small></span>
                </button>
                <button type="button" class="qs-icon-btn" data-file-menu="${f.id}" aria-label="${esc(t('files.actions'))}">${icon('ellipsis-vertical', 18)}</button>
            </div>`).join('');
            list.querySelectorAll('[data-file]').forEach((node, i) => { node.querySelector('b').textContent = files[i].name; });
        }
        const est = await QS.store.estimate();
        const info = $('#qsStorageInfo');
        if (est && info) info.textContent = t('files.storage', { used: QS.fmt.bytes(est.usage || 0), quota: QS.fmt.bytes(est.quota || 0) });
    }

    async function openStoredFile(id) {
        const done = App().loading(t('common.loading'));
        try {
            const file = await QS.store.load(id);
            if (file) await App().openFileObject(file);
        } finally { done(); }
    }

    function fileMenu(id, anchor) {
        QS.ui.menu(anchor, [
            { label: t('common.open'), icon: 'folder-open', onClick: () => openStoredFile(id) },
            { label: t('common.rename'), icon: 'pencil', onClick: async () => {
                const files = await QS.store.list();
                const f = files.find((x) => x.id === id);
                const name = await QS.ui.prompt(t('files.rename'), { value: f ? f.name : '', maxLength: 100 });
                if (!name) return;
                await QS.store.rename(id, name);
                if (App().file && App().file.id === id) { App().file.name = name; renderFileTitle(); }
                renderFiles();
            } },
            { label: t('common.duplicate'), icon: 'copy', onClick: async () => { await QS.store.duplicate(id, `(${t('app.copy_suffix')})`); renderFiles(); } },
            { divider: true },
            { label: t('common.delete'), icon: 'trash-2', danger: true, onClick: async () => {
                if (!(await QS.ui.confirm(t('files.confirm_delete'), { danger: true, okLabel: t('common.delete') }))) return;
                await QS.store.remove(id);
                if (App().file && App().file.id === id) { App().file = null; App().sheet = null; QS.storageSet('qs_last_file', ''); }
                renderFiles();
            } },
        ], { alignRight: true });
    }

    // ── Analises ──────────────────────────────────────────────────────────
    function destroyCharts() { state.charts.forEach((c) => c.destroy()); state.charts = []; }

    function renderAnalysis() {
        const host = $('#qsAnalysisView');
        if (!host || !App().file) return;
        destroyCharts();
        const tabs = ['charts', 'pivot', 'profile'];
        host.innerHTML = `<div class="qs-panel-tabs" role="tablist">${tabs.map((tab) => `<button type="button" role="tab" class="qs-tab${state.analysisTab === tab ? ' is-active' : ''}" data-analysis-tab="${tab}">${icon({ charts: 'chart-column', pivot: 'table-2', profile: 'gauge' }[tab], 16)}<span>${esc(t(`analysis.${tab}`))}</span></button>`).join('')}
            <span class="qs-tabs-spacer"></span><span class="qs-hint">${esc(t('analysis.sheet', { name: App().sheet.name }))}${App().viewActive() ? ` · ${esc(t('analysis.filtered'))}` : ''}</span></div>
            <div class="qs-analysis-body" id="qsAnalysisBody"></div>`;
        const body = $('#qsAnalysisBody');
        if (state.analysisTab === 'charts') renderChartsTab(body);
        else if (state.analysisTab === 'pivot') renderPivotTab(body);
        else renderProfileTab(body);
    }

    function sheetCharts() { return App().file.charts.filter((c) => c.sheetId === App().sheet.id); }

    function renderChartsTab(body) {
        const charts = sheetCharts();
        body.innerHTML = `<div class="qs-section-head"><h3>${esc(t('analysis.charts_title'))}</h3><button type="button" class="qs-btn qs-btn-primary" data-act="chart">${icon('plus', 16)}<span>${esc(t('analysis.new_chart'))}</span></button></div>
            ${charts.length ? '<div class="qs-chart-grid"></div>' : `<div class="qs-empty-card">${icon('chart-pie', 30)}<p>${esc(t('analysis.no_charts'))}</p><button type="button" class="qs-btn qs-btn-ghost" data-act="chart">${icon('chart-column', 16)}<span>${esc(t('analysis.create_first'))}</span></button></div>`}`;
        const grid = body.querySelector('.qs-chart-grid');
        if (!grid) return;
        charts.forEach((spec) => {
            const card = QS.el(`<div class="qs-chart-card" data-chart="${spec.id}">
                <div class="qs-chart-card-head"><h4></h4><button type="button" class="qs-icon-btn" data-chart-menu="${spec.id}" aria-label="${esc(t('files.actions'))}">${icon('ellipsis-vertical', 18)}</button></div>
                <div class="qs-chart-canvas"><canvas></canvas></div><p class="qs-chart-note" hidden></p>
            </div>`);
            card.querySelector('h4').textContent = spec.title;
            grid.appendChild(card);
            const data = QS.charts.buildData(App().sheet, spec.filtered ? App().visibleRows() : null, spec);
            if (data.error) { const note = card.querySelector('.qs-chart-note'); note.hidden = false; note.textContent = data.error; return; }
            state.charts.push(Object.assign(QS.charts.render(card.querySelector('canvas'), spec, data), { specId: spec.id }));
        });
    }

    function saveChart(spec) {
        const charts = App().file.charts;
        const idx = charts.findIndex((c) => c.id === spec.id);
        if (idx >= 0) charts[idx] = spec; else charts.push(spec);
        App().markDirty();
        state.analysisTab = 'charts';
        if (App().view !== 'analysis') App().showView('analysis'); else renderAnalysis();
    }

    function newChart(preset) {
        if (!App().file) return;
        if (!App().requireFull('analysis')) return;
        QS.charts.openBuilder({ sheet: App().sheet, rowsIndex: App().visibleRows(), spec: preset, onSave: saveChart });
    }

    function chartMenu(id, anchor) {
        const spec = App().file.charts.find((c) => c.id === id);
        if (!spec) return;
        QS.ui.menu(anchor, [
            { label: t('common.edit'), icon: 'pencil', onClick: () => { if (App().requireFull('analysis')) QS.charts.openBuilder({ sheet: App().sheet, rowsIndex: App().visibleRows(), spec, onSave: saveChart }); } },
            { label: t('common.duplicate'), icon: 'copy', onClick: () => saveChart({ ...JSON.parse(JSON.stringify(spec)), id: QS.uid('ch'), title: `${spec.title} (${t('app.copy_suffix')})` }) },
            { label: t('analysis.download_png'), icon: 'image-down', onClick: () => { const ch = state.charts.find((c) => c.specId === id); if (ch) QS.charts.downloadPng(ch, spec.title); } },
            { divider: true },
            { label: t('common.delete'), icon: 'trash-2', danger: true, onClick: () => { App().file.charts = App().file.charts.filter((c) => c.id !== id); App().markDirty(); renderAnalysis(); } },
        ], { alignRight: true });
    }

    function renderPivotTab(body) {
        const sheet = App().sheet;
        const opts = (withNone, filter) => (withNone ? `<option value="-1">${esc(t('chart.none'))}</option>` : '') + sheet.columns.map((c, i) => (filter && !filter(c) ? '' : `<option value="${i}">${esc(c.name)}</option>`)).join('');
        const firstText = guessCategoryColumn(sheet);
        const firstNum = sheet.columns.findIndex((c) => c.type === 'number');
        body.innerHTML = `<div class="qs-pivot">
            <form class="qs-pivot-form qs-form" autocomplete="off">
                <h3>${esc(t('pivot.title'))}</h3>
                <p class="qs-hint">${esc(t('pivot.hint'))}</p>
                <label class="qs-field"><span class="qs-label">${esc(t('pivot.rows'))}</span><select class="qs-input" name="row1">${opts(false)}</select></label>
                <label class="qs-field"><span class="qs-label">${esc(t('pivot.rows2'))}</span><select class="qs-input" name="row2">${opts(true)}</select></label>
                <label class="qs-field"><span class="qs-label">${esc(t('pivot.columns'))}</span><select class="qs-input" name="col">${opts(true, (c) => c.type !== 'number')}</select></label>
                <div class="qs-pivot-values" data-values></div>
                <button type="button" class="qs-link" data-add-value>${icon('plus', 14)} ${esc(t('pivot.add_value'))}</button>
                <label class="qs-check-row"><input type="checkbox" name="filtered" ${App().viewActive() ? 'checked' : ''}><span>${esc(t('chart.use_filter'))}</span></label>
                <button type="submit" class="qs-btn qs-btn-primary">${icon('play', 16)}<span>${esc(t('pivot.run'))}</span></button>
            </form>
            <div class="qs-pivot-result" data-result><div class="qs-empty-card">${icon('table-2', 30)}<p>${esc(t('pivot.empty'))}</p></div></div>
        </div>`;
        const form = body.querySelector('form');
        form.row1.value = String(firstText);
        const valuesHost = body.querySelector('[data-values]');
        const addValue = (col, fn) => {
            const row = QS.el(`<div class="qs-field-row qs-pivot-value"><label class="qs-field"><span class="qs-label">${esc(t('pivot.value'))}</span><select class="qs-input" data-vcol><option value="-1">${esc(t('pivot.count_rows'))}</option>${opts(false)}</select></label>
                <label class="qs-field"><span class="qs-label">${esc(t('chart.agg'))}</span><select class="qs-input" data-vfn>${['sum', 'avg', 'count', 'count_distinct', 'min', 'max', 'median'].map((a) => `<option value="${a}">${esc(t(`agg.${a}`))}</option>`).join('')}</select></label>
                <button type="button" class="qs-icon-btn" data-remove-value aria-label="${esc(t('common.delete'))}">${icon('x', 16)}</button></div>`);
            row.querySelector('[data-vcol]').value = String(col);
            row.querySelector('[data-vfn]').value = fn;
            valuesHost.appendChild(row);
        };
        addValue(firstNum, firstNum >= 0 ? 'sum' : 'count');
        body.querySelector('[data-add-value]').addEventListener('click', () => addValue(-1, 'count'));
        valuesHost.addEventListener('click', (e) => { const b = e.target.closest('[data-remove-value]'); if (b && valuesHost.children.length > 1) b.closest('.qs-pivot-value').remove(); });
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!App().requireFull('analysis')) return;
            const rows = [Number(form.row1.value)];
            if (Number(form.row2.value) >= 0 && Number(form.row2.value) !== rows[0]) rows.push(Number(form.row2.value));
            const col = Number(form.col.value);
            const values = [...valuesHost.querySelectorAll('.qs-pivot-value')].map((r) => ({ col: Number(r.querySelector('[data-vcol]').value), fn: r.querySelector('[data-vfn]').value }));
            const res = QS.ops.pivot(sheet, form.filtered.checked ? App().visibleRows() : null, { rows, col: col >= 0 ? col : null, values });
            renderResultTable(body.querySelector('[data-result]'), res.table, {
                title: t('pivot.result_title', { rows: rows.map((i) => sheet.columns[i].name).join(' › ') }),
                note: res.truncated ? t('pivot.truncated') : '',
            });
        });
    }

    /**
     * Coluna de texto que parece categoria (2 a 60 valores distintos numa amostra; prefere ~8 grupos).
     * Evita agrupar por IDs, nomes unicos ou textos livres.
     */
    function guessCategoryColumn(sheet) {
        const sample = Math.min(sheet.rows.length, 3000);
        let best = -1;
        let bestScore = Infinity;
        sheet.columns.forEach((c, i) => {
            if (c.type !== 'text') return;
            const seen = new Set();
            for (let r = 0; r < sample && seen.size <= 60; r += 1) {
                const v = sheet.rows[r][i];
                if (v !== null && v !== undefined && v !== '') seen.add(v);
            }
            if (seen.size < 2 || seen.size > 60) return;
            const score = Math.abs(seen.size - 8);
            if (score < bestScore) { bestScore = score; best = i; }
        });
        return best >= 0 ? best : Math.max(0, sheet.columns.findIndex((c) => c.type === 'text'));
    }

    /** Tabela de resultado (pivot / pergunta) com acoes: nova aba e exportar. */
    function renderResultTable(host, table, opts = {}) {
        const max = 300;
        const head = table.columns.map((c) => `<th class="${c.type === 'number' ? 'is-num' : ''}">${esc(c.name)}</th>`).join('');
        const body = table.rows.slice(0, max).map((r) => `<tr>${table.columns.map((c, i) => `<td class="${typeof r[i] === 'number' ? 'is-num' : ''}">${esc(QS.val.display(r[i], c))}</td>`).join('')}</tr>`).join('');
        host.innerHTML = `<div class="qs-result">
            <div class="qs-result-head"><div><h4></h4><p class="qs-hint">${esc(tn('result.rows', table.rows.length))}${table.rows.length > max ? ` · ${esc(t('result.showing', { n: max }))}` : ''}</p></div>
                <div class="qs-result-actions"><button type="button" class="qs-btn qs-btn-ghost qs-btn-sm" data-result-sheet>${icon('table', 15)}<span>${esc(t('result.new_sheet'))}</span></button>
                <button type="button" class="qs-btn qs-btn-ghost qs-btn-sm" data-result-csv>${icon('download', 15)}<span>CSV</span></button></div></div>
            ${opts.note ? `<p class="qs-chart-note">${esc(opts.note)}</p>` : ''}
            <div class="qs-table-wrap"><table class="qs-table qs-table-result"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
        </div>`;
        host.querySelector('h4').textContent = opts.title || '';
        host.querySelector('[data-result-sheet]').addEventListener('click', () => App().addSheetFromTable(opts.title || t('result.sheet_name'), table));
        host.querySelector('[data-result-csv]').addEventListener('click', () => {
            if (!App().requireFull('export')) return;
            const sheet = { columns: table.columns, rows: table.rows };
            const csv = QS.data.toCSV(sheet, QS.lang === 'en' ? { delimiter: ',', decimal: '.', bom: true } : { delimiter: ';', decimal: ',', bom: true });
            QS.download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), QS.safeFilename(opts.title || 'resultado', 'csv'));
        });
    }

    function renderProfileTab(body) {
        const sheet = App().sheet;
        const rows = App().viewActive() ? App().visibleRows() : null;
        const quality = QS.data.qualityCounts(sheet);
        const total = rows ? rows.length : sheet.rows.length;
        let filledCells = 0;
        const profiles = sheet.columns.map((c, i) => { const p = QS.data.profileColumn(sheet, i, rows, 6); filledCells += p.filled; return p; });
        const fillPct = total && sheet.columns.length ? Math.round((filledCells / (total * sheet.columns.length)) * 100) : 0;
        body.innerHTML = `<div class="qs-kpis">
                <div class="qs-kpi"><span>${esc(t('profile.rows'))}</span><b>${QS.fmt.int(total)}</b></div>
                <div class="qs-kpi"><span>${esc(t('profile.cols'))}</span><b>${QS.fmt.int(sheet.columns.length)}</b></div>
                <div class="qs-kpi"><span>${esc(t('profile.filled'))}</span><b>${fillPct}%</b></div>
                <div class="qs-kpi${quality.duplicates ? ' is-warn' : ''}"><span>${esc(t('profile.duplicates'))}</span><b>${QS.fmt.int(quality.duplicates)}</b>${quality.duplicates ? `<button type="button" class="qs-link" data-act="dedupe">${esc(t('profile.fix'))}</button>` : ''}</div>
                <div class="qs-kpi${quality.emptyRows ? ' is-warn' : ''}"><span>${esc(t('profile.empty_rows'))}</span><b>${QS.fmt.int(quality.emptyRows)}</b>${quality.emptyRows ? `<button type="button" class="qs-link" data-act="remove-empty">${esc(t('profile.fix'))}</button>` : ''}</div>
            </div>
            <div class="qs-section-head"><h3>${esc(t('profile.columns'))}</h3><button type="button" class="qs-btn qs-btn-ai" data-act="go-insights">${icon('sparkles', 16)}<span>${esc(t('profile.ai_insights'))}</span></button></div>
            <div class="qs-profile-grid">${profiles.map((p, i) => profileCard(p, i)).join('')}</div>`;
    }

    function profileCard(p, i) {
        const filledPct = p.rows ? Math.round((p.filled / p.rows) * 100) : 0;
        let stats = '';
        if (p.mean !== undefined) {
            stats = `<dl class="qs-stats"><div><dt>${esc(t('agg.min'))}</dt><dd>${esc(QS.fmt.number(p.min, 2))}</dd></div><div><dt>${esc(t('agg.max'))}</dt><dd>${esc(QS.fmt.number(p.max, 2))}</dd></div>
                <div><dt>${esc(t('agg.avg'))}</dt><dd>${esc(QS.fmt.number(p.mean, 2))}</dd></div><div><dt>${esc(t('agg.median'))}</dt><dd>${esc(QS.fmt.number(p.median, 2))}</dd></div>
                <div><dt>${esc(t('agg.sum'))}</dt><dd>${esc(QS.fmt.number(p.sum, 2))}</dd></div></dl>`;
            if (p.histogram) {
                const max = Math.max(...p.histogram.map((b) => b.count), 1);
                stats += `<div class="qs-histogram" title="${esc(t('profile.distribution'))}">${p.histogram.map((b) => `<span style="height:${Math.max(4, Math.round((b.count / max) * 100))}%" title="${esc(`${QS.fmt.number(b.from, 2)} – ${QS.fmt.number(b.to, 2)}: ${QS.fmt.int(b.count)}`)}"></span>`).join('')}</div>`;
            }
        } else if (p.type === 'date' && p.min) {
            stats = `<dl class="qs-stats"><div><dt>${esc(t('profile.from'))}</dt><dd>${esc(QS.fmt.date(p.min))}</dd></div><div><dt>${esc(t('profile.to'))}</dt><dd>${esc(QS.fmt.date(p.max))}</dd></div></dl>`;
        }
        const top = p.mean === undefined && p.top.length ? `<ul class="qs-top-values">${p.top.slice(0, 5).map(([v, n]) => `<li><span>${esc(String(v).slice(0, 40))}</span><em>${QS.fmt.int(n)}</em><i style="width:${Math.round((n / Math.max(1, p.top[0][1])) * 100)}%"></i></li>`).join('')}</ul>` : '';
        return `<div class="qs-profile-card"><div class="qs-profile-head"><span class="qs-type-tag">${esc(t(`type.${p.type}`))}</span><h4 title="${esc(p.name)}">${esc(p.name)}</h4><button type="button" class="qs-icon-btn" data-profile-col="${i}" title="${esc(t('menu.col_stats'))}">${icon('chevron-right', 16)}</button></div>
            <div class="qs-profile-meta"><span>${esc(t('profile.filled_pct', { n: filledPct }))}</span><span>${esc(tn('profile.distinct', p.distinct))}</span></div>
            <div class="qs-meter is-thin"><span style="width:${filledPct}%"></span></div>${stats}${top}</div>`;
    }

    function showColumnProfile(c) {
        const sheet = App().sheet;
        const p = QS.data.profileColumn(sheet, c, App().viewActive() ? App().visibleRows() : null, 12);
        const body = QS.el(`<div class="qs-col-profile">${profileCard(p, c).replace(/<button[^>]*data-profile-col[^>]*>[\s\S]*?<\/button>/, '')}
            ${p.mean === undefined && p.top.length > 5 ? `<ul class="qs-top-values is-long">${p.top.slice(5).map(([v, n]) => `<li><span>${esc(String(v).slice(0, 60))}</span><em>${QS.fmt.int(n)}</em><i style="width:${Math.round((n / Math.max(1, p.top[0][1])) * 100)}%"></i></li>`).join('')}</ul>` : ''}</div>`);
        QS.ui.modal({
            title: p.name, subtitle: t('profile.subtitle'), icon: 'chart-column', size: 'md', body,
            actions: [{ label: t('common.close') }, { label: t('analysis.new_chart'), kind: 'primary', icon: 'chart-column', onClick: () => {
                const col = sheet.columns[c];
                const cat = sheet.columns.find((x) => x.type === 'text');
                newChart(col.type === 'number' && cat ? { type: 'bar', x: cat.id, ys: [{ colId: col.id, agg: 'sum' }], sort: 'desc', top: 15 } : { type: col.type === 'date' ? 'line' : 'bar', x: col.id, ys: [{ colId: col.id, agg: 'count' }], sort: col.type === 'date' ? 'x' : 'desc', top: 15, bucket: 'month' });
            } }],
        });
    }

    // ── Quo.IA ────────────────────────────────────────────────────────────
    function aiReady(host) {
        if (!QS.boot.ai || !QS.boot.ai.configured) {
            host.innerHTML = `<div class="qs-empty-card">${icon('sparkles', 30)}<h3>${esc(t('ai.not_ready_title'))}</h3><p>${esc(t(me().is_admin ? 'ai.not_ready_admin' : 'ai.not_ready'))}</p>${me().is_admin ? `<a class="qs-btn qs-btn-primary" href="${QS.boot.basePath}/admin">${esc(t('ai.open_admin'))}</a>` : ''}</div>`;
            return false;
        }
        return true;
    }

    function renderAi() {
        const host = $('#qsAiView');
        if (!host) return;
        const tabs = ['automate', 'ask', 'insights', 'formula'];
        host.innerHTML = `<div class="qs-ai-hero">
                <div><span class="qs-ai-badge">${icon('sparkles', 14)} Quo.IA</span><h2>${esc(t('ai.title'))}</h2><p>${esc(t('ai.subtitle'))}</p></div>
                <div class="qs-ai-credits"><span>${esc(t('credits.label'))}</span><b>${QS.fmt.int(Math.max(0, me().credits.remaining))}</b><small>${esc(t('credits.of', { n: QS.fmt.int(me().credits.allowance) }))}</small></div>
            </div>
            <div class="qs-panel-tabs" role="tablist">${tabs.map((tab) => `<button type="button" role="tab" class="qs-tab${state.aiTab === tab ? ' is-active' : ''}" data-ai-tab="${tab}">${icon({ automate: 'wand-sparkles', ask: 'message-square', insights: 'lightbulb', formula: 'sigma' }[tab], 16)}<span>${esc(t(`ai.tab_${tab}`))}</span></button>`).join('')}</div>
            <div class="qs-ai-body" id="qsAiBody"></div>
            <p class="qs-privacy-note">${icon('shield-check', 15)}<span>${esc(t('ai.privacy'))}</span></p>`;
        const body = $('#qsAiBody');
        if (!aiReady(body)) return;
        if (!me().access.full) { body.innerHTML = `<div class="qs-empty-card">${icon('lock', 30)}<h3>${esc(t('paywall.expired_title'))}</h3><p>${esc(t('paywall.ai'))}</p><button type="button" class="qs-btn qs-btn-primary" data-act="subscribe">${esc(t('plan.subscribe'))}</button></div>`; return; }
        if (!App().file) { body.innerHTML = `<div class="qs-empty-card">${icon('file-spreadsheet', 30)}<p>${esc(t('ai.need_file'))}</p><button type="button" class="qs-btn qs-btn-primary" data-act="go" data-target="files">${esc(t('ai.open_file'))}</button></div>`; return; }
        if (state.aiTab === 'automate') renderAutomateForm(body, {});
        else if (state.aiTab === 'ask') renderAsk(body);
        else if (state.aiTab === 'insights') renderInsights(body);
        else renderFormulaTab(body);
    }

    function defaultOutputName(task) {
        return t(`ai.out_${task}`);
    }

    /** Formulario de automacao (usado na aba e no modal da barra de selecao). */
    function renderAutomateForm(host, opts) {
        const sheet = App().sheet;
        const checked = App().checked.size;
        const visible = App().viewActive() ? App().visibleRows().length : sheet.rows.length;
        const textCols = sheet.columns.map((c, i) => ({ c, i })).filter(({ c }) => c.type === 'text');
        const firstText = (textCols.find(({ c }) => /coment|review|avalia|opini|feedback|descri|mensag|obs/i.test(c.name)) || textCols[0] || { i: 0 }).i;
        const a = state.automation = { task: opts.task || 'sentiment', sources: opts.sources && opts.sources.length ? opts.sources : [firstText], target: opts.target || (checked ? 'checked' : App().viewActive() ? 'view' : 'all') };
        host.innerHTML = `<div class="qs-automate">
            <div class="qs-task-grid">${QS.ai.TASKS.map((task) => `<button type="button" class="qs-task-card${task.id === a.task ? ' is-active' : ''}" data-task="${task.id}"><span class="qs-task-icon">${icon(task.icon, 20)}</span><b>${esc(t(`ai.task_${task.id}`))}</b><small>${esc(t(`ai.task_${task.id}_desc`))}</small></button>`).join('')}</div>
            <form class="qs-form qs-automate-form" autocomplete="off">
                <div class="qs-field"><span class="qs-label">${esc(t('ai.source_cols'))}</span><div class="qs-chips is-select" data-sources>${sheet.columns.map((c, i) => `<button type="button" class="qs-chip${a.sources.includes(i) ? ' is-active' : ''}" data-src="${i}">${esc(c.name)}</button>`).join('')}</div><small class="qs-hint" data-src-hint></small></div>
                <div data-task-options></div>
                <div class="qs-field-row">
                    <label class="qs-field"><span class="qs-label">${esc(t('ai.target'))}</span><select class="qs-input" name="target">
                        ${checked ? `<option value="checked">${esc(tn('ai.target_checked', checked))}</option>` : ''}
                        ${App().viewActive() ? `<option value="view">${esc(tn('ai.target_view', visible))}</option>` : ''}
                        <option value="all">${esc(tn('ai.target_all', sheet.rows.length))}</option>
                        <option value="first20">${esc(t('ai.target_test'))}</option>
                    </select></label>
                    <label class="qs-field" data-output><span class="qs-label">${esc(t('ai.output_col'))}</span><input class="qs-input" name="output" maxlength="80"></label>
                </div>
                <label class="qs-check-row" data-overwrite hidden><input type="checkbox" name="overwrite"><span>${esc(t('ai.overwrite'))}</span></label>
                <div class="qs-automate-foot"><span class="qs-estimate" data-estimate></span><button type="submit" class="qs-btn qs-btn-ai">${icon('wand-sparkles', 16)}<span>${esc(t('ai.run'))}</span></button></div>
                <div class="qs-progress" data-progress hidden><div class="qs-meter"><span></span></div><div class="qs-progress-row"><span data-progress-text></span><button type="button" class="qs-link" data-cancel>${esc(t('common.cancel'))}</button></div></div>
            </form>
        </div>`;
        const form = host.querySelector('form');
        form.target.value = a.target;
        const renderOptions = () => {
            const box = host.querySelector('[data-task-options]');
            const o = {
                categorize: `<label class="qs-field"><span class="qs-label">${esc(t('ai.categories'))}</span><input class="qs-input" name="categories" placeholder="${esc(t('ai.categories_ph'))}"><small class="qs-hint">${esc(t('ai.categories_hint'))}</small></label>
                    <label class="qs-field"><span class="qs-label">${esc(t('ai.fallback'))}</span><input class="qs-input" name="fallback" value="${esc(t('ai.fallback_default'))}"></label>`,
                standardize: `<label class="qs-field"><span class="qs-label">${esc(t('ai.kind'))}</span><select class="qs-input" name="kind">${['person_name', 'company', 'city', 'address', 'phone', 'email', 'free_text'].map((k) => `<option value="${k}">${esc(t(`ai.kind_${k}`))}</option>`).join('')}</select></label>`,
                translate: `<label class="qs-field"><span class="qs-label">${esc(t('ai.target_language'))}</span><select class="qs-input" name="language">${['English', 'Português', 'Español', 'Français', 'Deutsch', 'Italiano', '中文', '日本語'].map((l) => `<option>${esc(l)}</option>`).join('')}</select></label>`,
                summarize: `<label class="qs-field"><span class="qs-label">${esc(t('ai.max_words'))}</span><input class="qs-input" type="number" name="maxWords" min="5" max="120" value="20"></label>`,
                custom: `<label class="qs-field"><span class="qs-label">${esc(t('ai.instruction'))}</span><textarea class="qs-input" name="instruction" rows="3" maxlength="800" placeholder="${esc(t('ai.instruction_ph'))}"></textarea></label>
                    <label class="qs-field"><span class="qs-label">${esc(t('ai.allowed_values'))}</span><input class="qs-input" name="allowed" placeholder="${esc(t('ai.allowed_ph'))}"></label>`,
            }[a.task] || '';
            box.innerHTML = o;
            if (a.task === 'translate') form.language.value = QS.lang === 'en' ? 'Español' : 'English';
            const multiOut = a.task === 'extract_contacts';
            host.querySelector('[data-output]').hidden = multiOut;
            host.querySelector('[data-overwrite]').hidden = a.task !== 'standardize';
            form.output.value = QS.data.uniqueName(sheet.columns.map((c) => c.name), defaultOutputName(a.task));
            const task = QS.ai.TASKS.find((x) => x.id === a.task);
            host.querySelector('[data-src-hint]').textContent = t(task.multi ? 'ai.src_multi' : 'ai.src_single');
            updateEstimate();
        };
        const targetRows = () => {
            const v = form.target.value;
            if (v === 'checked') return [...App().checked].sort((x, y) => x - y);
            if (v === 'view') return App().visibleRows();
            if (v === 'first20') return App().visibleRows().slice(0, 20);
            return sheet.rows.map((_, i) => i);
        };
        const updateEstimate = () => {
            const rows = targetRows();
            const est = QS.ai.estimateCredits(sheet, rows, a.sources);
            const node = host.querySelector('[data-estimate]');
            node.innerHTML = `${icon('sparkles', 14)} ${esc(t('ai.estimate', { rows: QS.fmt.int(Math.min(rows.length, QS.ai.MAX_ROWS_PER_RUN)), credits: QS.fmt.int(est) }))}`;
            node.classList.toggle('is-over', est > me().credits.remaining);
        };
        host.querySelector('.qs-task-grid').addEventListener('click', (e) => {
            const b = e.target.closest('[data-task]');
            if (!b) return;
            a.task = b.dataset.task;
            const task = QS.ai.TASKS.find((x) => x.id === a.task);
            if (!task.multi && a.sources.length > 1) a.sources = [a.sources[0]];
            host.querySelectorAll('[data-task]').forEach((x) => x.classList.toggle('is-active', x === b));
            host.querySelectorAll('[data-src]').forEach((x) => x.classList.toggle('is-active', a.sources.includes(Number(x.dataset.src))));
            renderOptions();
        });
        host.querySelector('[data-sources]').addEventListener('click', (e) => {
            const b = e.target.closest('[data-src]');
            if (!b) return;
            const i = Number(b.dataset.src);
            const task = QS.ai.TASKS.find((x) => x.id === a.task);
            if (task.multi) {
                if (a.sources.includes(i)) { if (a.sources.length > 1) a.sources = a.sources.filter((x) => x !== i); } else if (a.sources.length < 8) a.sources.push(i);
            } else a.sources = [i];
            host.querySelectorAll('[data-src]').forEach((x) => x.classList.toggle('is-active', a.sources.includes(Number(x.dataset.src))));
            updateEstimate();
        });
        form.target.addEventListener('change', updateEstimate);
        renderOptions();
        form.addEventListener('submit', (e) => { e.preventDefault(); runAutomation(host, form, targetRows(), opts.onDone); });
    }

    function splitList(text) { return String(text || '').split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 40); }

    async function runAutomation(host, form, rows, onDone) {
        if (!App().requireFull('ai')) return;
        const a = state.automation;
        const sheet = App().sheet;
        if (!rows.length) { QS.ui.toast(t('ai.no_rows'), 'info'); return; }
        const options = {};
        if (a.task === 'categorize') { options.categories = splitList(form.categories.value); options.fallback = form.fallback.value.trim(); }
        if (a.task === 'standardize') options.kind = form.kind.value;
        if (a.task === 'translate') options.target_language = form.language.value;
        if (a.task === 'summarize') options.max_words = Number(form.maxWords.value) || 20;
        if (a.task === 'custom') {
            options.instruction = form.instruction.value.trim();
            options.allowed_values = splitList(form.allowed.value);
            if (!options.instruction) { form.instruction.focus(); return; }
        }
        const progress = host.querySelector('[data-progress]');
        const bar = progress.querySelector('.qs-meter span');
        const text = progress.querySelector('[data-progress-text]');
        const submit = form.querySelector('[type=submit]');
        const controller = new AbortController();
        progress.hidden = false;
        submit.disabled = true;
        bar.style.width = '0%';
        text.textContent = t('ai.running', { done: 0, total: QS.fmt.int(Math.min(rows.length, QS.ai.MAX_ROWS_PER_RUN)) });
        progress.querySelector('[data-cancel]').onclick = () => controller.abort();
        const sheetRef = sheet;
        const res = await QS.ai.runAutomation({
            sheet, rows, task: a.task, options, sources: a.sources, signal: controller.signal,
            onProgress: (done, total, credits) => {
                bar.style.width = `${Math.round((done / total) * 100)}%`;
                text.textContent = t('ai.running', { done: QS.fmt.int(done), total: QS.fmt.int(total) });
                updateCredits(credits);
            },
        });
        submit.disabled = false;
        progress.hidden = true;
        if (onDone) onDone();
        if (res.error) aiError(res.error);
        if (!res.results.size) { if (!res.error) QS.ui.toast(t('ai.no_results'), 'info'); return; }
        if (App().sheet !== sheetRef) App().activateSheet(sheetRef.id, true);
        applyAutomationResults(a.task, res.results, form);
        let msg = tn('ai.done', res.results.size);
        if (res.stopped) msg = tn('ai.stopped', res.results.size);
        if (res.limited) msg += ` ${t('ai.limited', { n: QS.fmt.int(QS.ai.MAX_ROWS_PER_RUN) })}`;
        QS.ui.toast(msg, 'ai', { duration: 6000 });
    }

    const SENTIMENT_LABEL = () => ({ positive: t('ai.sent_positive'), neutral: t('ai.sent_neutral'), negative: t('ai.sent_negative') });

    function applyAutomationResults(task, results, form) {
        const app = App();
        const sheet = app.sheet;
        const names = sheet.columns.map((c) => c.name);
        if (task === 'standardize' && form.overwrite.checked) {
            const ci = state.automation.sources[0];
            const changes = [];
            results.forEach((r, row) => { if (r.value && r.value !== sheet.rows[row][ci]) changes.push({ r: row, c: ci, after: r.value }); });
            app.setCells(changes, t('ai.task_standardize'));
            app.showView('sheet');
            return;
        }
        const outputs = task === 'extract_contacts'
            ? [['name', t('ai.out_name')], ['email', t('ai.out_email')], ['phone', t('ai.out_phone')]]
            : [[task === 'sentiment' ? 'label' : 'value', form.output.value.trim() || defaultOutputName(task)]];
        const labels = SENTIMENT_LABEL();
        const cols = [];
        const valuesList = [];
        outputs.forEach(([field, name]) => {
            const colName = QS.data.uniqueName(names.concat(cols.map((c) => c.name)), name);
            cols.push({ id: QS.uid('c'), name: colName, type: 'text', width: field === 'value' && task === 'summarize' ? 300 : 170, ai: task });
            valuesList.push(sheet.rows.map((_, i) => {
                const r = results.get(i);
                if (!r) return null;
                const v = field === 'label' ? labels[r.label] || null : r[field];
                return v === '' ? null : v;
            }));
        });
        const at = Math.max(...state.automation.sources) + 1;
        app.insertColumns(at, cols, valuesList, t(`ai.task_${task}`));
        app.showView('sheet');
        setTimeout(() => app.grid && app.grid.selectColumns(at, at + cols.length - 1), 40);
    }

    function openAutomation(opts) {
        if (!App().file) { App().showView('files'); return; }
        if (!App().requireFull('ai')) return;
        if (!QS.boot.ai || !QS.boot.ai.configured) { App().showView('ai'); return; }
        const body = QS.el('<div class="qs-automate-modal"></div>');
        const m = QS.ui.modal({ title: t('ai.automations_title'), subtitle: t('ai.automations_sub'), icon: 'wand-sparkles', size: 'lg', body, dismissible: false });
        renderAutomateForm(body, Object.assign({}, opts || {}, { onDone: () => m.close() }));
    }

    // Pergunte aos dados
    function suggestions(sheet) {
        // Valor: prefere colunas de total/valor; categoria: coluna de texto com poucos valores distintos.
        const nums = sheet.columns.filter((c) => c.type === 'number');
        const num = nums.find((c) => /total|valor|value|amount|revenue|receita|venta|importe|monto|price|preço|precio/i.test(c.name)) || nums[nums.length - 1];
        const catIndex = guessCategoryColumn(sheet);
        const cat = sheet.columns[catIndex] && sheet.columns[catIndex].type === 'text' ? sheet.columns[catIndex] : null;
        const date = sheet.columns.find((c) => c.type === 'date');
        const out = [];
        if (num && cat) out.push(t('ask.s_total_by', { num: num.name, cat: cat.name }));
        if (num && cat) out.push(t('ask.s_top', { cat: cat.name, num: num.name }));
        if (date && num) out.push(t('ask.s_trend', { num: num.name }));
        if (cat) out.push(t('ask.s_count', { cat: cat.name }));
        return out.slice(0, 4);
    }

    function renderAsk(body) {
        const sheet = App().sheet;
        body.innerHTML = `<div class="qs-ask">
            <form class="qs-ask-form" autocomplete="off"><input class="qs-input" name="q" maxlength="600" placeholder="${esc(t('ask.placeholder'))}"><button type="submit" class="qs-btn qs-btn-ai">${icon('send', 16)}<span>${esc(t('ask.send'))}</span></button></form>
            <div class="qs-chips">${suggestions(sheet).map((s) => `<button type="button" class="qs-chip" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}</div>
            <div class="qs-ask-list" data-list></div>
        </div>`;
        const form = body.querySelector('form');
        const list = body.querySelector('[data-list]');
        state.askHistory.filter((h) => h.sheetId === sheet.id).forEach((h) => list.appendChild(askCard(h)));
        body.querySelector('.qs-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-suggest]'); if (b) { form.q.value = b.dataset.suggest; form.requestSubmit(); } });
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const q = form.q.value.trim();
            if (!q) return;
            if (!App().requireFull('ai')) return;
            const pending = QS.el(`<div class="qs-ask-card is-pending"><p class="qs-ask-q">${icon('message-square', 15)}<span></span></p><p class="qs-hint">${icon('loader-circle', 15, 'qs-spin')} ${esc(t('ai.thinking'))}</p></div>`);
            pending.querySelector('.qs-ask-q span').textContent = q;
            list.prepend(pending);
            form.q.value = '';
            try {
                const res = await QS.ai.ask(q, sheet, App().visibleRows());
                updateCredits(res.credits);
                const entry = { id: QS.uid('q'), sheetId: sheet.id, question: q, plan: res.plan, run: res.run };
                state.askHistory.unshift(entry);
                pending.replaceWith(askCard(entry));
            } catch (err) {
                pending.remove();
                aiError(err);
            }
        });
        setTimeout(() => form.q.focus(), 30);
    }

    function describeStep(step) {
        switch (step.op) {
            case 'filter': return t('ask.step_filter', { expr: step.expr });
            case 'derive': return t('ask.step_derive', { name: step.name, expr: step.expr });
            case 'group': return t('ask.step_group', { by: (step.by || []).join(', ') || t('ask.all_rows'), aggs: (step.aggs || []).map((a) => `${t(`agg.${a.fn}`)}(${a.col === '*' ? t('ask.rows') : a.col})`).join(', ') });
            case 'sort': return t('ask.step_sort', { col: step.col, dir: t(step.dir === 'desc' ? 'ask.desc' : 'ask.asc') });
            case 'limit': return t('ask.step_limit', { n: step.n });
            case 'select': return t('ask.step_select', { cols: (step.cols || []).join(', ') });
            default: return step.op;
        }
    }

    function askCard(entry) {
        const { plan, run } = entry;
        const card = QS.el(`<div class="qs-ask-card"><p class="qs-ask-q">${icon('message-square', 15)}<span></span></p><h4></h4><p class="qs-ask-expl"></p><div data-answer></div>
            <details class="qs-steps"><summary>${esc(t('ask.how'))}</summary><ol></ol></details></div>`);
        card.querySelector('.qs-ask-q span').textContent = entry.question;
        card.querySelector('h4').textContent = plan.title || '';
        card.querySelector('.qs-ask-expl').textContent = plan.explanation || '';
        const ol = card.querySelector('ol');
        (plan.steps || []).forEach((s) => { const li = document.createElement('li'); li.textContent = describeStep(s); ol.appendChild(li); });
        if (!plan.steps || !plan.steps.length) card.querySelector('.qs-steps').hidden = true;
        const answer = card.querySelector('[data-answer]');
        if (plan.answerable === false || !run) {
            answer.innerHTML = `<p class="qs-chart-note">${esc(t('ask.not_answerable'))}</p>`;
            return card;
        }
        if (!run.ok) {
            answer.innerHTML = `<p class="qs-formula-error">${esc(t('ask.plan_failed', { step: run.step, error: run.error }))}</p>`;
            return card;
        }
        const table = run.table;
        if (table.rows.length === 1 && table.columns.length <= 3 && table.columns.some((c) => c.type === 'number')) {
            const idx = table.columns.findIndex((c) => c.type === 'number');
            const label = table.columns.length > 1 && idx > 0 ? `${QS.val.display(table.rows[0][0], table.columns[0])} · ${table.columns[idx].name}` : table.columns[idx].name;
            answer.insertAdjacentHTML('beforeend', `<div class="qs-headline"><span>${esc(label)}</span><b>${esc(QS.val.display(table.rows[0][idx], table.columns[idx]))}</b></div>`);
        }
        const chartSpec = plan.chart;
        if (chartSpec && chartSpec.type && chartSpec.type !== 'none' && table.rows.length > 1) {
            const xi = QS.ops.findColumn(table, chartSpec.x);
            const ys = (chartSpec.y || []).map((y) => QS.ops.findColumn(table, y)).filter((i) => i >= 0 && i !== xi);
            if (xi >= 0 && ys.length) {
                const holder = QS.el('<div class="qs-chart-canvas is-small"><canvas></canvas></div>');
                answer.appendChild(holder);
                const rows = table.rows.slice(0, 60);
                const data = chartSpec.type === 'scatter'
                    ? { scatter: true, datasets: [{ label: table.columns[ys[0]].name, data: rows.map((r) => ({ x: QS.formula.toNum(r[xi]), y: QS.formula.toNum(r[ys[0]]) })) }], xLabel: table.columns[xi].name, yLabel: table.columns[ys[0]].name }
                    : { labels: rows.map((r) => QS.val.display(r[xi], table.columns[xi]) || t('pivot.blank')), datasets: ys.map((y) => ({ label: table.columns[y].name, data: rows.map((r) => QS.formula.toNum(r[y]) || 0) })) };
                setTimeout(() => state.charts.push(QS.charts.render(holder.querySelector('canvas'), { type: chartSpec.type }, data)), 20);
            }
        }
        const tableHost = document.createElement('div');
        answer.appendChild(tableHost);
        renderResultTable(tableHost, table, { title: plan.title });
        return card;
    }

    // Insights
    function renderInsights(body) {
        const sheet = App().sheet;
        const cached = state.insights && state.insights.sheetId === sheet.id ? state.insights : null;
        body.innerHTML = `<div class="qs-insights">
            <div class="qs-section-head"><div><h3>${esc(t('insights.title'))}</h3><p class="qs-hint">${esc(t('insights.hint'))}</p></div>
            <button type="button" class="qs-btn qs-btn-ai" data-run-insights>${icon('lightbulb', 16)}<span>${esc(cached ? t('insights.rerun') : t('insights.run'))}</span></button></div>
            <div data-insights>${cached ? '' : `<div class="qs-empty-card">${icon('lightbulb', 30)}<p>${esc(t('insights.empty'))}</p></div>`}</div>
        </div>`;
        if (cached) fillInsights(body.querySelector('[data-insights]'), cached.result);
        body.querySelector('[data-run-insights]').addEventListener('click', async (e) => {
            if (!App().requireFull('ai')) return;
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.innerHTML = `${icon('loader-circle', 16, 'qs-spin')}<span>${esc(t('ai.thinking'))}</span>`;
            try {
                const res = await QS.ai.insights(sheet, App().viewActive() ? App().visibleRows() : null);
                updateCredits(res.credits);
                state.insights = { sheetId: sheet.id, result: res };
                renderInsights(body);
            } catch (err) {
                aiError(err);
                btn.disabled = false;
                btn.innerHTML = `${icon('lightbulb', 16)}<span>${esc(t('insights.run'))}</span>`;
            }
        });
    }

    const CLEANUP_ACTIONS = {
        trim: (ci) => App().cleanColumn(ci, 'trim'),
        upper: (ci) => App().cleanColumn(ci, 'upper'),
        lower: (ci) => App().cleanColumn(ci, 'lower'),
        title: (ci) => App().cleanColumn(ci, 'title'),
        fill_empty: (ci) => App().openFillDialog(ci),
        to_number: (ci) => App().setColumnType(ci, 'number'),
        to_date: (ci) => App().setColumnType(ci, 'date'),
        remove_duplicates: () => App().removeDuplicates(),
        remove_empty_rows: () => App().removeEmptyRows(),
    };

    function fillInsights(host, result) {
        const sheet = App().sheet;
        const colIndex = (name) => QS.ops.findColumn({ columns: sheet.columns }, name);
        host.innerHTML = `<div class="qs-insight-summary">${icon('sparkles', 18)}<p></p></div>
            <div class="qs-insight-grid">${(result.insights || []).map(() => '<div class="qs-insight-card"><h4></h4><p></p></div>').join('')}</div>
            ${(result.charts || []).length ? `<h4 class="qs-subhead">${esc(t('insights.charts'))}</h4><div class="qs-suggest-list" data-charts></div>` : ''}
            ${(result.cleanups || []).length ? `<h4 class="qs-subhead">${esc(t('insights.cleanups'))}</h4><div class="qs-suggest-list" data-cleanups></div>` : ''}`;
        host.querySelector('.qs-insight-summary p').textContent = result.summary || '';
        host.querySelectorAll('.qs-insight-card').forEach((card, i) => {
            card.querySelector('h4').textContent = result.insights[i].title;
            card.querySelector('p').textContent = result.insights[i].detail;
        });
        const chartsHost = host.querySelector('[data-charts]');
        (result.charts || []).forEach((c) => {
            const xi = colIndex(c.x);
            const yi = colIndex(c.y);
            const row = QS.el(`<div class="qs-suggest">${icon('chart-column', 16)}<span></span><button type="button" class="qs-btn qs-btn-ghost qs-btn-sm"${xi < 0 ? ' disabled' : ''}>${esc(t('insights.add_chart'))}</button></div>`);
            row.querySelector('span').textContent = c.title;
            row.querySelector('button').addEventListener('click', () => {
                if (!App().requireFull('analysis')) return;
                const spec = { id: QS.uid('ch'), sheetId: sheet.id, title: c.title, type: c.type, x: sheet.columns[xi].id, ys: [{ colId: (sheet.columns[yi] || sheet.columns[xi]).id, agg: c.agg }], sort: sheet.columns[xi].type === 'date' ? 'x' : 'desc', top: 15, bucket: 'month', filtered: true };
                saveChart(spec);
                QS.ui.toast(t('insights.chart_added'), 'success');
            });
            chartsHost.appendChild(row);
        });
        const cleanHost = host.querySelector('[data-cleanups]');
        (result.cleanups || []).forEach((c) => {
            const ci = c.col === '*' ? -1 : colIndex(c.col);
            const action = CLEANUP_ACTIONS[c.action];
            const row = QS.el(`<div class="qs-suggest">${icon('eraser', 16)}<span></span><button type="button" class="qs-btn qs-btn-ghost qs-btn-sm"${!action || (ci < 0 && c.col !== '*') ? ' disabled' : ''}>${esc(t('common.apply'))}</button></div>`);
            row.querySelector('span').textContent = `${c.col !== '*' ? `${c.col}: ` : ''}${c.detail}`;
            row.querySelector('button').addEventListener('click', () => { if (action) { action(ci); row.querySelector('button').disabled = true; } });
            cleanHost.appendChild(row);
        });
    }

    function renderFormulaTab(body) {
        body.innerHTML = `<div class="qs-formula-tab">
            <h3>${esc(t('formula.tab_title'))}</h3><p class="qs-hint">${esc(t('formula.tab_hint'))}</p>
            <form class="qs-ask-form" autocomplete="off"><input class="qs-input" name="d" maxlength="600" placeholder="${esc(t('formula.describe_ph'))}"><button type="submit" class="qs-btn qs-btn-ai">${icon('wand-sparkles', 16)}<span>${esc(t('formula.generate'))}</span></button></form>
            <div class="qs-chips">${[t('formula.ex1'), t('formula.ex2'), t('formula.ex3')].map((s) => `<button type="button" class="qs-chip" data-ex="${esc(s)}">${esc(s)}</button>`).join('')}</div>
        </div>`;
        const form = body.querySelector('form');
        body.querySelector('.qs-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-ex]'); if (b) form.d.value = b.dataset.ex; });
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const d = form.d.value.trim();
            if (!d) return;
            App().showView('sheet');
            App().openFormulaDialog(App().sheet.columns.length);
            setTimeout(() => {
                const input = document.querySelector('.qs-formula-dialog [name=describe]');
                if (input) { input.value = d; document.querySelector('.qs-formula-dialog [data-describe]').click(); }
            }, 60);
        });
    }

    // ── Conta ─────────────────────────────────────────────────────────────
    function renderAccount() {
        const host = $('#qsAccountView');
        if (!host) return;
        const user = me();
        const access = user.access;
        const credits = user.credits;
        const usedPct = credits.allowance ? QS.clamp(Math.round((credits.used / credits.allowance) * 100), 0, 100) : 0;
        let planBody = '';
        if (access.state === 'active') {
            planBody = `<p>${esc(access.cancel_at_period_end ? t('account.plan_cancels', { date: QS.fmt.day(access.current_period_end) }) : t('account.plan_renews', { date: QS.fmt.day(access.current_period_end) }))}</p>
                ${access.past_due ? `<p class="qs-formula-error">${esc(t('banner.past_due'))}</p>` : ''}
                <button type="button" class="qs-btn qs-btn-primary" data-act="portal">${icon('credit-card', 16)}<span>${esc(t('plan.manage'))}</span></button>`;
        } else if (access.state === 'trial') {
            planBody = `<p>${esc(tn('account.trial_left', access.days_left))}</p><button type="button" class="qs-btn qs-btn-primary" data-act="subscribe">${icon('crown', 16)}<span>${esc(t('plan.subscribe'))} — ${esc(priceLabel(defaultCurrency()))}${esc(t('pricing.per_month_short'))}</span></button>`;
        } else if (access.state === 'expired') {
            planBody = `<p>${esc(t('banner.expired'))}</p><button type="button" class="qs-btn qs-btn-primary" data-act="subscribe">${icon('crown', 16)}<span>${esc(t('plan.subscribe'))} — ${esc(priceLabel(defaultCurrency()))}${esc(t('pricing.per_month_short'))}</span></button>`;
        } else {
            planBody = `<p>${esc(access.state === 'comp' ? t('plan.until', { date: QS.fmt.day(access.comp_until) }) : t('plan.admin_line'))}</p>`;
        }
        if (user.has_billing && access.state !== 'active') planBody += `<button type="button" class="qs-link" data-act="portal">${esc(t('account.billing_history'))}</button>`;
        host.innerHTML = `<div class="qs-account">
            <section class="qs-card">
                <h3>${icon('user', 18)} ${esc(t('account.profile'))}</h3>
                <form class="qs-form" data-profile-form autocomplete="off">
                    <label class="qs-field"><span class="qs-label">${esc(t('account.name'))}</span><input class="qs-input" name="name" maxlength="120"></label>
                    <label class="qs-field"><span class="qs-label">${esc(t('account.email'))}</span><input class="qs-input" value="${esc(user.email)}" disabled></label>
                    <label class="qs-field"><span class="qs-label">${esc(t('account.language'))}</span><select class="qs-input" name="locale"><option value="pt">Português</option><option value="en">English</option><option value="es">Español</option></select></label>
                    <button type="submit" class="qs-btn qs-btn-primary">${esc(t('common.save'))}</button>
                </form>
            </section>
            <section class="qs-card">
                <h3>${icon('crown', 18)} ${esc(t('account.plan'))} <span class="qs-tag is-${access.state}">${esc(t(`plan.state_${access.state}`))}</span></h3>
                ${planBody}
            </section>
            <section class="qs-card">
                <h3>${icon('sparkles', 18)} ${esc(t('account.credits'))}</h3>
                <p class="qs-credits-big"><b>${QS.fmt.int(Math.max(0, credits.remaining))}</b> <span>${esc(t('credits.of', { n: QS.fmt.int(credits.allowance) }))}</span></p>
                <div class="qs-meter"><span style="width:${100 - usedPct}%"></span></div>
                <p class="qs-hint">${esc(credits.period === 'trial' ? t('account.credits_trial') : t('account.credits_month'))}</p>
                <p class="qs-hint">${esc(t('account.credits_explain'))}</p>
            </section>
            <section class="qs-card">
                <h3>${icon('key-round', 18)} ${esc(t('account.security'))}</h3>
                <form class="qs-form" data-password-form autocomplete="off">
                    <label class="qs-field"><span class="qs-label">${esc(t('account.current_password'))}</span><input class="qs-input" type="password" name="current" autocomplete="current-password" required></label>
                    <label class="qs-field"><span class="qs-label">${esc(t('account.new_password'))}</span><input class="qs-input" type="password" name="password" minlength="8" autocomplete="new-password" required></label>
                    <button type="submit" class="qs-btn qs-btn-ghost">${esc(t('account.change_password'))}</button>
                </form>
                <button type="button" class="qs-btn qs-btn-ghost" data-act="logout">${icon('log-out', 16)}<span>${esc(t('account.logout'))}</span></button>
            </section>
            <section class="qs-card">
                <h3>${icon('monitor', 18)} ${esc(t('account.local_data'))}</h3>
                <p class="qs-hint">${esc(t('account.local_explain'))}</p>
                <p class="qs-hint" data-storage></p>
                <button type="button" class="qs-btn qs-btn-ghost" data-act="clear-local">${icon('trash-2', 16)}<span>${esc(t('account.clear_local'))}</span></button>
            </section>
            <section class="qs-card is-danger">
                <h3>${icon('triangle-alert', 18)} ${esc(t('account.danger'))}</h3>
                <p class="qs-hint">${esc(t('account.delete_explain'))}</p>
                <button type="button" class="qs-btn qs-btn-danger" data-act="delete-account">${esc(t('account.delete'))}</button>
            </section>
        </div>`;
        const pf = host.querySelector('[data-profile-form]');
        pf.name.value = user.name;
        pf.locale.value = user.locale;
        pf.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const res = await QS.api('updateProfile', { name: pf.name.value.trim(), locale: pf.locale.value });
                const langChanged = res.user.locale !== QS.lang;
                App().me = res.user;
                if (langChanged) { await App().flushSave(); location.reload(); return; }
                renderChrome();
                QS.ui.toast(t('account.saved'), 'success');
            } catch (err) { QS.ui.toast(err.message, 'error'); }
        });
        const pw = host.querySelector('[data-password-form]');
        pw.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await QS.api('changePassword', { current: pw.current.value, password: pw.password.value });
                pw.reset();
                QS.ui.toast(t('account.password_changed'), 'success');
            } catch (err) { QS.ui.toast(err.message, 'error'); }
        });
        QS.store.estimate().then((est) => { const n = host.querySelector('[data-storage]'); if (est && n) n.textContent = t('files.storage', { used: QS.fmt.bytes(est.usage || 0), quota: QS.fmt.bytes(est.quota || 0) }); });
    }

    async function deleteAccount() {
        const body = QS.el(`<div class="qs-form"><p>${esc(t('account.delete_confirm'))}</p><label class="qs-field"><span class="qs-label">${esc(t('account.current_password'))}</span><input class="qs-input" type="password" name="password" autocomplete="current-password"></label></div>`);
        QS.ui.modal({
            title: t('account.delete'), icon: 'triangle-alert', size: 'sm', body,
            actions: [{ label: t('common.cancel') }, { label: t('account.delete'), kind: 'danger', onClick: async (m) => {
                m.setBusy(true);
                try {
                    const res = await QS.api('deleteAccount', { password: body.querySelector('[name=password]').value });
                    window.location.href = res.redirect;
                } catch (err) { m.setBusy(false); QS.ui.toast(err.message, 'error'); }
                return false;
            } }],
        });
    }

    async function logout() {
        await App().flushSave();
        try { const res = await QS.api('logout', {}); window.location.href = res.redirect; } catch (e) { window.location.href = `${QS.boot.basePath}/`; }
    }

    function userMenu(anchor) {
        QS.ui.menu(anchor, [
            { heading: me().email },
            { label: t('nav.account'), icon: 'user', onClick: () => App().showView('account') },
            me().is_admin ? { label: t('nav.admin'), icon: 'gauge', onClick: () => { window.location.href = `${QS.boot.basePath}/admin`; } } : null,
            { label: t('nav.site'), icon: 'house', onClick: () => { window.location.href = `${QS.boot.basePath}/${QS.lang === 'pt' ? '' : `${QS.lang}/`}`; } },
            { divider: true },
            { label: t('account.logout'), icon: 'log-out', onClick: logout },
        ], { alignRight: true });
    }

    function langMenu(anchor) {
        const set = async (locale) => {
            if (locale === QS.lang) return;
            try { await QS.api('updateProfile', { locale }); await App().flushSave(); location.reload(); } catch (e) { QS.ui.toast(e.message, 'error'); }
        };
        QS.ui.menu(anchor, [['pt', 'Português'], ['en', 'English'], ['es', 'Español']].map(([code, label]) => ({ label, checked: code === QS.lang, onClick: () => set(code) })), { alignRight: true });
    }

    // ── API publica para o app ────────────────────────────────────────────
    function render(view) {
        renderFileTitle();
        destroyCharts();
        if (view === 'files') renderFiles();
        else if (view === 'analysis') renderAnalysis();
        else if (view === 'ai') renderAi();
        else if (view === 'account') renderAccount();
    }

    function handleAction(act, node) {
        switch (act) {
            case 'subscribe': openSubscribe(); break;
            case 'portal': openPortal(); break;
            case 'dismiss-banner': state.bannerDismissed = true; renderChrome(); break;
            case 'rename-file': renameFile(); break;
            case 'user-menu': userMenu(node.getBoundingClientRect()); break;
            case 'lang-menu': langMenu(node.getBoundingClientRect()); break;
            case 'logout': logout(); break;
            case 'delete-account': deleteAccount(); break;
            case 'clear-local': QS.ui.confirm(t('account.clear_local_confirm'), { danger: true, okLabel: t('common.delete') }).then(async (ok) => {
                if (!ok) return;
                const files = await QS.store.list();
                for (const f of files) await QS.store.remove(f.id);
                App().file = null; App().sheet = null; QS.storageSet('qs_last_file', '');
                QS.ui.toast(t('account.local_cleared'), 'success');
                renderAccount();
            }); break;
            case 'dedupe': App().removeDuplicates(); break;
            case 'remove-empty': App().removeEmptyRows(); break;
            case 'go-insights': App().showView('ai'); openAiTab('insights'); break;
            default: break;
        }
    }

    function openAnalysisTab(tab) { state.analysisTab = tab; if (App().view === 'analysis') renderAnalysis(); }
    function openAiTab(tab) { state.aiTab = tab; if (App().view === 'ai') renderAi(); }

    function init() {
        renderChrome();
        handleReturnParams();
        document.addEventListener('click', (e) => {
            const at = e.target.closest('[data-analysis-tab]');
            if (at) { openAnalysisTab(at.dataset.analysisTab); return; }
            const ai = e.target.closest('[data-ai-tab]');
            if (ai) { openAiTab(ai.dataset.aiTab); return; }
            const of = e.target.closest('[data-open-file]');
            if (of) { openStoredFile(of.dataset.openFile); return; }
            const fm = e.target.closest('[data-file-menu]');
            if (fm) { fileMenu(fm.dataset.fileMenu, fm.getBoundingClientRect()); return; }
            const cm = e.target.closest('[data-chart-menu]');
            if (cm) { chartMenu(cm.dataset.chartMenu, cm.getBoundingClientRect()); return; }
            const pc = e.target.closest('[data-profile-col]');
            if (pc) showColumnProfile(Number(pc.dataset.profileCol));
        });
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('qs-dropzone')) { e.preventDefault(); App().pickFile(); }
        });
        // Atualiza plano/creditos ao voltar para a aba (ex.: depois de pagar em outra aba).
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshMe(); });
    }

    function onDataChanged() {
        if (App().view === 'analysis') renderAnalysis();
    }
    function onSheetChanged() {
        if (App().view === 'analysis') renderAnalysis();
        if (App().view === 'ai' && state.aiTab !== 'ask') renderAi();
    }

    QS.views = {
        init, render, renderChrome, renderFileTitle, updateCredits, refreshMe, aiError, paywall, openSubscribe,
        showColumnProfile, openAutomation, newChart, openAnalysisTab, openAiTab, handleAction, onDataChanged, onSheetChanged,
    };
})();
