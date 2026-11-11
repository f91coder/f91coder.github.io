/**
 * Quosheets — painel do administrador: metricas, chave da IA (Claude), modelo, plano/creditos, Stripe e usuarios.
 * Os segredos nunca voltam para o navegador (o servidor devolve so os 4 ultimos caracteres).
 */
(() => {
    const QS = window.QS;
    const { esc, icon } = QS;
    const root = document.getElementById('qsAdmin');
    let data = null;
    let userFilter = '';

    const MODEL_LABELS = {
        'claude-opus-5-5': 'Claude Opus 5.5 — mais capaz (padrão)',
        'claude-sonnet-5-5': 'Claude Sonnet 5.5 — equilibrado',
        'claude-haiku-5-5': 'Claude Haiku 5.5 — mais barato e rápido',
    };
    const STATE_LABELS = { admin: 'Admin', active: 'Assinante', comp: 'Cortesia', trial: 'Teste', expired: 'Expirado' };

    const usd = (v, digits = 2) => `US$ ${QS.fmt.number(Number(v) || 0, digits)}`;
    const brl = (v) => QS.fmt.currency(Number(v) || 0, 'BRL');
    const date = (iso) => (iso ? QS.fmt.day(iso) : '—');

    async function load(silent) {
        try {
            data = await QS.api('adminOverview');
            render();
            if (!silent) return;
            QS.ui.toast('Painel atualizado', 'success', { duration: 1500 });
        } catch (e) {
            root.innerHTML = `<div class="qs-empty-card">${icon('triangle-alert', 30)}<p>${esc(e.message)}</p></div>`;
        }
    }

    async function save(action, body, okMessage) {
        try {
            data = await QS.api(action, body);
            render();
            if (okMessage) QS.ui.toast(okMessage, 'success');
            return true;
        } catch (e) {
            QS.ui.toast(e.message, 'error');
            return false;
        }
    }

    /** Estimativa de custo por linha numa automacao com textos curtos (~100 caracteres por celula). */
    function rowCostUsd(prices) {
        const inTokens = 100 / 3.2 + 25 + 1200 / 20;
        const outTokens = 40 + 250 / 20;
        return (inTokens * prices[0] + outTokens * prices[1]) / 1e6;
    }

    function render() {
        const s = data.stats;
        const st = data.settings;
        const maxAiCost = st.credits_monthly * st.credit_usd;
        root.innerHTML = `
            <section class="qs-kpis is-admin">
                <div class="qs-kpi"><span>Usuários</span><b>${QS.fmt.int(s.users)}</b><small>${QS.fmt.int(s.verified)} verificados · ${QS.fmt.int(s.new_7d)} novos em 7 dias</small></div>
                <div class="qs-kpi"><span>Em teste grátis</span><b>${QS.fmt.int(s.trials)}</b></div>
                <div class="qs-kpi is-good"><span>Assinantes</span><b>${QS.fmt.int(s.subscribers)}</b></div>
                <div class="qs-kpi is-good"><span>Receita recorrente (MRR)</span><b>${esc(brl(s.mrr.BRL))}</b><small>+ ${esc(usd(s.mrr.USD))}</small></div>
                <div class="qs-kpi"><span>Custo de IA no mês</span><b>${esc(usd(s.ai_month.cost_usd, 2))}</b><small>${QS.fmt.int(s.ai_month.calls)} chamadas · ${QS.fmt.int(s.ai_month.rows)} linhas · ${QS.fmt.int(s.ai_month.credits)} créditos</small></div>
            </section>

            <div class="qs-admin-grid">
                <section class="qs-card">
                    <h3>${icon('sparkles', 18)} Quo.IA (Claude) <span class="qs-tag ${st.ai_key ? 'is-active' : 'is-expired'}">${st.ai_key ? 'Ativa' : 'Sem chave'}</span></h3>
                    <p class="qs-hint">Crie uma chave em <b>console.anthropic.com → API Keys</b> e cole aqui. Ela é validada na hora e fica guardada criptografada no banco.</p>
                    <form class="qs-form" data-form="ai-key" autocomplete="off">
                        <label class="qs-field"><span class="qs-label">Chave da API ${st.ai_key ? `<em class="qs-mono">(atual: ${esc(st.ai_key)})</em>` : ''}</span>
                            <input class="qs-input qs-mono" type="password" name="key" placeholder="sk-ant-..." autocomplete="off" spellcheck="false"></label>
                        <div class="qs-form-actions">
                            <button type="submit" class="qs-btn qs-btn-primary">${icon('key-round', 16)}<span>Salvar e validar</span></button>
                            ${st.ai_key ? '<button type="button" class="qs-link is-danger" data-admin="remove-ai-key">Remover chave</button>' : ''}
                        </div>
                    </form>
                    <form class="qs-form" data-form="ai-model" autocomplete="off">
                        <label class="qs-field"><span class="qs-label">Modelo</span>
                            <select class="qs-input" name="ai_model">${st.ai_models.map((m) => `<option value="${esc(m)}"${m === st.ai_model ? ' selected' : ''}>${esc(MODEL_LABELS[m] || m)}</option>`).join('')}</select></label>
                        <label class="qs-check-row"><input type="checkbox" name="ai_fallbacks"${st.ai_fallbacks ? ' checked' : ''}><span>Fallback automático do servidor quando o modelo estiver sobrecarregado (Opus/Sonnet)</span></label>
                        <div class="qs-table-wrap"><table class="qs-table is-compact">
                            <thead><tr><th>Modelo</th><th class="is-num" title="Preço por milhão de tokens: entrada / saída">US$/MTok</th><th class="is-num" title="Custo aproximado de uma automação em 1.000 linhas">1.000 linhas</th><th class="is-num" title="Linhas por mês que os créditos do plano cobrem">Linhas/mês</th></tr></thead>
                            <tbody>${st.ai_models.map((m) => {
        const p = st.model_prices[m] || [0, 0];
        const perRow = rowCostUsd(p);
        const rows = perRow > 0 ? Math.floor(maxAiCost / perRow) : 0;
        return `<tr${m === st.ai_model ? ' class="is-current"' : ''}><td>${esc(m.replace('claude-', ''))}</td><td class="is-num">${QS.fmt.number(p[0], 2)} / ${QS.fmt.number(p[1], 2)}</td><td class="is-num">${esc(usd(perRow * 1000, 2))}</td><td class="is-num">${QS.fmt.int(rows)}</td></tr>`;
    }).join('')}</tbody></table></div>
                        <p class="qs-hint">US$/MTok = preço por milhão de tokens (entrada / saída). Estimativa para automações em textos curtos. Perguntas, insights e fórmulas custam por chamada (algumas dezenas de créditos no Opus). Os créditos cobrados são sempre o custo real de tokens ÷ valor do crédito.</p>
                        <button type="submit" class="qs-btn qs-btn-ghost">${icon('save', 16)}<span>Salvar modelo</span></button>
                    </form>
                </section>

                <section class="qs-card">
                    <h3>${icon('credit-card', 18)} Pagamentos (Stripe) <span class="qs-tag ${st.stripe.connected ? 'is-active' : 'is-expired'}">${st.stripe.connected ? (st.stripe.mode === 'live' ? 'Conectado · produção' : 'Conectado · teste') : 'Não conectado'}</span></h3>
                    ${st.stripe.connected ? `<dl class="qs-dl">
                        <div><dt>Conta</dt><dd>${esc(st.stripe.account || '—')}</dd></div>
                        <div><dt>Chave</dt><dd class="qs-mono">${esc(st.stripe.key)}</dd></div>
                        <div><dt>Webhook</dt><dd>${st.stripe.webhook ? `${icon('circle-check', 14)} criado` : `${icon('circle-x', 14)} ausente — reconecte`}</dd></div>
                        <div><dt>Endpoint</dt><dd class="qs-mono qs-break">${esc(st.stripe.webhook_url)}</dd></div>
                    </dl>` : ''}
                    <p class="qs-hint">Cole a chave secreta (<span class="qs-mono">sk_live_…</span> ou <span class="qs-mono">sk_test_…</span>). O Quosheets valida a chave e cria sozinho o produto “Quosheets Pro”, os preços mensais em BRL e USD e o webhook de assinaturas.</p>
                    <form class="qs-form" data-form="stripe" autocomplete="off">
                        <label class="qs-field"><span class="qs-label">Chave secreta do Stripe</span><input class="qs-input qs-mono" type="password" name="key" placeholder="sk_live_..." autocomplete="off" spellcheck="false"></label>
                        <button type="submit" class="qs-btn qs-btn-primary">${icon('zap', 16)}<span>${st.stripe.connected ? 'Reconectar' : 'Conectar Stripe'}</span></button>
                    </form>
                    <p class="qs-hint">Depois de conectar, ative o <b>Portal do cliente</b> em Stripe → Configurações → Billing → Customer portal (é por ele que o assinante troca o cartão ou cancela).</p>
                </section>

                <section class="qs-card">
                    <h3>${icon('crown', 18)} Plano e créditos</h3>
                    <form class="qs-form" data-form="plan" autocomplete="off">
                        <div class="qs-field-row">
                            <label class="qs-field"><span class="qs-label">Preço mensal (BRL)</span><input class="qs-input" type="number" name="price_brl" min="1" step="0.01" value="${esc(Number(st.price_brl).toFixed(2))}"></label>
                            <label class="qs-field"><span class="qs-label">Preço mensal (USD)</span><input class="qs-input" type="number" name="price_usd" min="1" step="0.01" value="${esc(Number(st.price_usd).toFixed(2))}"></label>
                        </div>
                        <div class="qs-field-row">
                            <label class="qs-field"><span class="qs-label">Dias de teste grátis</span><input class="qs-input" type="number" name="trial_days" min="0" max="90" value="${esc(st.trial_days)}"></label>
                            <label class="qs-field"><span class="qs-label">Créditos no teste</span><input class="qs-input" type="number" name="credits_trial" min="0" value="${esc(st.credits_trial)}"></label>
                        </div>
                        <div class="qs-field-row">
                            <label class="qs-field"><span class="qs-label">Créditos por mês (assinante)</span><input class="qs-input" type="number" name="credits_monthly" min="0" value="${esc(st.credits_monthly)}"></label>
                            <label class="qs-field"><span class="qs-label">Valor de 1 crédito (US$)</span><input class="qs-input" type="number" name="credit_usd" min="0.000001" step="0.000001" value="${esc(st.credit_usd)}"></label>
                        </div>
                        <p class="qs-hint" data-plan-summary></p>
                        <button type="submit" class="qs-btn qs-btn-primary">${icon('save', 16)}<span>Salvar plano</span></button>
                        <p class="qs-hint">Mudar o preço cria preços novos no Stripe para novas assinaturas; quem já assina continua no preço antigo.</p>
                    </form>
                </section>

                <section class="qs-card">
                    <h3>${icon('chart-column', 18)} Uso da IA — últimos 30 dias</h3>
                    ${renderDaily(s.ai_daily)}
                </section>
            </div>

            <section class="qs-card">
                <div class="qs-section-head"><h3>${icon('users', 18)} Usuários <small class="qs-hint">(200 mais recentes)</small></h3>
                    <label class="qs-search is-inline">${icon('search', 15)}<input type="search" data-user-search placeholder="Buscar por e-mail ou nome" value="${esc(userFilter)}"></label></div>
                <div class="qs-table-wrap" data-users></div>
            </section>`;
        renderUsers();
        bindForms();
        updatePlanSummary();
    }

    function renderDaily(days) {
        if (!days || !days.length) return '<div class="qs-empty-card is-small"><p>Nenhum uso de IA nos últimos 30 dias.</p></div>';
        const max = Math.max(...days.map((d) => Number(d.cost) || 0), 0.0001);
        const total = days.reduce((sum, d) => sum + (Number(d.cost) || 0), 0);
        return `<div class="qs-admin-bars">${days.map((d) => `<div title="${esc(`${QS.fmt.date(d.day)} — ${usd(d.cost, 4)} · ${QS.fmt.int(d.calls)} chamadas`)}"><span style="height:${Math.max(3, Math.round(((Number(d.cost) || 0) / max) * 100))}%"></span></div>`).join('')}</div>
            <p class="qs-hint">Total no período: <b>${esc(usd(total, 2))}</b> em ${QS.fmt.int(days.reduce((sum, d) => sum + Number(d.calls || 0), 0))} chamadas.</p>`;
    }

    function renderUsers() {
        const host = root.querySelector('[data-users]');
        if (!host) return;
        const q = userFilter.trim().toLowerCase();
        const users = data.users.filter((u) => !q || u.email.toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q));
        if (!users.length) { host.innerHTML = '<div class="qs-empty-card is-small"><p>Nenhum usuário encontrado.</p></div>'; return; }
        host.innerHTML = `<table class="qs-table is-compact qs-users-table">
            <thead><tr><th>Usuário</th><th>Situação</th><th>Cadastro</th><th>Último acesso</th><th class="is-num">Créditos</th><th class="is-num">IA no mês</th><th></th></tr></thead>
            <tbody>${users.map((u) => {
        let detail = '';
        if (!u.verified) detail = 'e-mail não confirmado';
        else if (u.state === 'trial') detail = `até ${date(u.trial_ends_at)}`;
        else if (u.state === 'active') detail = `${u.plan_currency || ''} · renova ${date(u.current_period_end)}`;
        else if (u.state === 'comp') detail = `até ${date(u.comp_until)}`;
        else if (u.plan_status && u.plan_status !== 'none') detail = u.plan_status;
        return `<tr>
                <td><b>${esc(u.name || '—')}</b><small class="qs-block">${esc(u.email)} · ${esc(u.locale.toUpperCase())}</small></td>
                <td><span class="qs-tag is-${u.verified ? u.state : 'expired'}">${esc(u.verified ? STATE_LABELS[u.state] || u.state : 'Pendente')}</span><small class="qs-block">${esc(detail)}</small></td>
                <td>${esc(date(u.created_at))}</td>
                <td>${esc(u.last_login_at ? QS.fmt.rel(u.last_login_at) : '—')}</td>
                <td class="is-num">${u.credits ? `${QS.fmt.int(Math.max(0, u.credits.remaining))} <small>/ ${QS.fmt.int(u.credits.allowance)}</small>` : '—'}</td>
                <td class="is-num">${esc(usd(u.ai_cost_month, 2))}</td>
                <td class="is-num"><button type="button" class="qs-icon-btn" data-user-menu="${u.id}" aria-label="Ações">${icon('ellipsis-vertical', 18)}</button></td>
            </tr>`;
    }).join('')}</tbody></table>`;
    }

    function updatePlanSummary() {
        const form = root.querySelector('[data-form="plan"]');
        const node = root.querySelector('[data-plan-summary]');
        if (!form || !node) return;
        const credits = Number(form.credits_monthly.value) || 0;
        const creditUsd = Number(form.credit_usd.value) || 0;
        const maxCost = credits * creditUsd;
        const usdPrice = Number(form.price_usd.value) || 0;
        node.innerHTML = `${icon('info', 14)} Custo máximo de IA por assinante/mês (se gastar todos os créditos): <b>${esc(usd(maxCost, 2))}</b>${usdPrice ? ` — ${QS.fmt.int((maxCost / usdPrice) * 100)}% do preço em USD` : ''}.`;
    }

    function bindForms() {
        const aiKey = root.querySelector('[data-form="ai-key"]');
        aiKey.addEventListener('submit', async (e) => {
            e.preventDefault();
            const key = aiKey.key.value.trim();
            if (!key) { aiKey.key.focus(); return; }
            const btn = aiKey.querySelector('[type=submit]');
            btn.disabled = true;
            await save('adminSetAiKey', { key }, 'Chave validada e salva. A Quo.IA está ativa.');
            btn.disabled = false;
        });
        const aiModel = root.querySelector('[data-form="ai-model"]');
        aiModel.addEventListener('submit', (e) => {
            e.preventDefault();
            save('adminSaveSettings', { ai_model: aiModel.ai_model.value, ai_fallbacks: aiModel.ai_fallbacks.checked ? 1 : 0 }, 'Modelo salvo.');
        });
        const stripe = root.querySelector('[data-form="stripe"]');
        stripe.addEventListener('submit', async (e) => {
            e.preventDefault();
            const key = stripe.key.value.trim();
            if (!key) { stripe.key.focus(); return; }
            const btn = stripe.querySelector('[type=submit]');
            btn.disabled = true;
            btn.querySelector('span').textContent = 'Conectando…';
            const ok = await save('adminStripeConnect', { key }, 'Stripe conectado: produto, preços e webhook criados.');
            if (!ok) { btn.disabled = false; btn.querySelector('span').textContent = 'Conectar Stripe'; }
        });
        const plan = root.querySelector('[data-form="plan"]');
        plan.addEventListener('input', updatePlanSummary);
        plan.addEventListener('submit', (e) => {
            e.preventDefault();
            const body = {};
            ['price_brl', 'price_usd', 'trial_days', 'credits_trial', 'credits_monthly', 'credit_usd'].forEach((name) => { body[name] = Number(plan[name].value); });
            save('adminSaveSettings', body, 'Plano salvo.');
        });
        const search = root.querySelector('[data-user-search]');
        search.addEventListener('input', QS.debounce(() => { userFilter = search.value; renderUsers(); }, 150));
    }

    function userMenu(id, anchor) {
        const u = data.users.find((x) => x.id === id);
        if (!u) return;
        QS.ui.menu(anchor, [
            { heading: u.email },
            { label: 'Dar acesso de cortesia…', icon: 'crown', onClick: async () => {
                const days = await QS.ui.prompt('Cortesia: quantos dias de acesso completo?', { value: '30', okLabel: 'Conceder', maxLength: 3 });
                if (days && Number(days) > 0) save('adminUser', { user_id: id, action: 'extend', days: Number(days) }, 'Cortesia concedida.');
            } },
            u.comp_until ? { label: 'Encerrar cortesia', icon: 'circle-x', onClick: () => save('adminUser', { user_id: id, action: 'end_comp' }, 'Cortesia encerrada.') } : null,
            u.verified ? { label: 'Adicionar créditos de IA…', icon: 'sparkles', onClick: async () => {
                const amount = await QS.ui.prompt('Quantos créditos adicionar neste período?', { value: '1000', okLabel: 'Adicionar', maxLength: 7 });
                if (amount && Number(amount) > 0) save('adminUser', { user_id: id, action: 'credits', amount: Number(amount) }, 'Créditos adicionados.');
            } } : null,
            !u.verified ? { label: 'Confirmar e-mail manualmente', icon: 'mail', onClick: () => save('adminUser', { user_id: id, action: 'verify' }, 'E-mail confirmado; o teste começou.') } : null,
        ], { alignRight: true });
    }

    document.addEventListener('click', (e) => {
        const menuBtn = e.target.closest('[data-user-menu]');
        if (menuBtn) { userMenu(Number(menuBtn.dataset.userMenu), menuBtn.getBoundingClientRect()); return; }
        const act = e.target.closest('[data-admin]');
        if (!act) return;
        if (act.dataset.admin === 'refresh') load(true);
        if (act.dataset.admin === 'remove-ai-key') {
            QS.ui.confirm('Remover a chave da IA? Os recursos de IA ficam indisponíveis até uma nova chave ser salva.', { danger: true, okLabel: 'Remover' })
                .then((ok) => { if (ok) save('adminSetAiKey', { key: '' }, 'Chave removida.'); });
        }
    });

    load(false);
})();
