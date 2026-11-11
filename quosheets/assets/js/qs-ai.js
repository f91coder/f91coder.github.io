/**
 * Quosheets — cliente da Quo.IA.
 *  - tableSummary(): o que a IA ve em ask/formula/insights: esquema, estatisticas, top valores e 5 linhas.
 *  - runAutomation(): aplica uma tarefa a muitas linhas em lotes de 20 (2 em paralelo), com progresso,
 *    cancelamento, novas tentativas quando a IA esta ocupada e parada limpa quando acabam os creditos.
 *  - ask()/formula()/insights(): chamadas unicas; o plano do ask e executado aqui no navegador.
 */
(() => {
    const QS = window.QS;
    const BATCH = 20;
    const CONCURRENCY = 2;
    const MAX_ROWS_PER_RUN = 5000;

    const TASKS = [
        { id: 'sentiment', icon: 'smile', outputs: ['label'] },
        { id: 'categorize', icon: 'tags', outputs: ['value'] },
        { id: 'extract_contacts', icon: 'contact', outputs: ['name', 'email', 'phone'], multi: true },
        { id: 'standardize', icon: 'eraser', outputs: ['value'] },
        { id: 'translate', icon: 'languages', outputs: ['value'] },
        { id: 'summarize', icon: 'text-cursor-input', outputs: ['value'] },
        { id: 'custom', icon: 'wand-sparkles', outputs: ['value'], multi: true },
    ];

    function cut(v, n) {
        if (v === null || v === undefined) return null;
        if (typeof v === 'string') return v.length > n ? `${v.slice(0, n)}…` : v;
        return v;
    }

    /** Resumo da aba para a IA. Nao envia o arquivo: so estatisticas, top valores e poucas linhas. */
    function tableSummary(sheet, rowsIndex) {
        const indices = rowsIndex || null;
        const total = indices ? indices.length : sheet.rows.length;
        const columns = sheet.columns.map((col, ci) => {
            const p = QS.data.profileColumn(sheet, ci, indices, 12);
            const out = { name: col.name, type: col.type, filled: p.filled, distinct: p.distinct, empty: p.empty };
            if (p.min !== undefined) Object.assign(out, { min: p.min, max: p.max });
            if (p.mean !== undefined) Object.assign(out, { mean: p.mean, median: p.median, sum: p.sum });
            // Textos longos (comentarios, descricoes) nao precisam de "top valores".
            if (col.type !== 'number' && !(p.avgLength > 60)) out.top = p.top.slice(0, 12).map(([v, n]) => [cut(v, 80), n]);
            return out;
        });
        const sample = [];
        const step = Math.max(1, Math.floor(total / 5));
        for (let k = 0; k < total && sample.length < 5; k += step) {
            const row = sheet.rows[indices ? indices[k] : k];
            sample.push(row.map((v) => cut(v, 120)));
        }
        const quality = QS.data.qualityCounts(sheet);
        return { sheet: sheet.name, rows: total, duplicates: quality.duplicates, empty_rows: quality.emptyRows, columns, sample };
    }

    function call(mode, payload, signal) {
        return QS.api('ai', { mode, payload, lang: QS.lang }, { signal });
    }

    /**
     * runAutomation({ sheet, rows: [indices da aba], task, options, sources: [indices de coluna],
     *                 onProgress(done, total, credits), signal }) -> { results: Map(row -> result), stopped, error }
     */
    async function runAutomation(opts) {
        const { sheet, task, options, sources, onProgress, signal } = opts;
        const rows = opts.rows.slice(0, MAX_ROWS_PER_RUN);
        const results = new Map();
        const batches = [];
        for (let i = 0; i < rows.length; i += BATCH) batches.push(rows.slice(i, i + BATCH));
        let done = 0;
        let error = null;
        let credits = null;
        let next = 0;

        async function worker() {
            while (!error && !(signal && signal.aborted) && next < batches.length) {
                const batch = batches[next];
                next += 1;
                const payload = {
                    task,
                    options,
                    rows: batch.map((r) => ({ id: String(r), cells: Object.fromEntries(sources.map((c) => [sheet.columns[c].name, cut(sheet.rows[r][c], 2000)])) })),
                };
                let attempt = 0;
                for (;;) {
                    try {
                        const res = await call('automate', payload, signal);
                        res.result.results.forEach((item) => { if (!item.missing) results.set(Number(item.id), item); });
                        credits = res.credits;
                        break;
                    } catch (e) {
                        if (e.name === 'AbortError') return;
                        if ((e.code === 'ai_busy' || e.code === 'ai_timeout' || e.code === 'too_many_attempts') && attempt < 3) {
                            attempt += 1;
                            await new Promise((resolve) => setTimeout(resolve, 1500 * attempt * attempt));
                            continue;
                        }
                        error = e;
                        return;
                    }
                }
                done += batch.length;
                if (onProgress) onProgress(done, rows.length, credits);
            }
        }
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker));
        return { results, error, stopped: !!(signal && signal.aborted), credits, limited: opts.rows.length > MAX_ROWS_PER_RUN };
    }

    /** Estimativa simples de creditos de uma automacao (exibida antes de rodar). */
    function estimateCredits(sheet, rows, sources) {
        let chars = 0;
        const sampleN = Math.min(rows.length, 200);
        for (let i = 0; i < sampleN; i += 1) {
            const r = rows[Math.floor((i * rows.length) / sampleN)];
            sources.forEach((c) => { const v = sheet.rows[r][c]; chars += v === null || v === undefined ? 0 : String(v).length; });
        }
        const avgChars = sampleN ? chars / sampleN : 0;
        const ai = QS.boot.ai || {};
        const prices = ai.prices || [4, 20];
        const creditUsd = ai.creditUsd || 0.0005;
        const batches = Math.ceil(rows.length / BATCH);
        const inTokens = rows.length * (avgChars / 3.2 + 25) + batches * 1200;
        const outTokens = rows.length * 40 + batches * 250;
        return Math.max(1, Math.ceil(((inTokens * prices[0] + outTokens * prices[1]) / 1e6) / creditUsd));
    }

    async function ask(question, sheet, rowsIndex) {
        const res = await call('ask', { question, table: tableSummary(sheet, rowsIndex) });
        const plan = res.result;
        const run = plan.answerable === false ? null : QS.ops.runPlan(sheet, rowsIndex, plan);
        return { plan, run, credits: res.credits };
    }

    async function formula(description, sheet) {
        const res = await call('formula', { description, table: tableSummary(sheet, null) });
        const out = res.result;
        const compiled = out.expr ? QS.formula.compile(out.expr, sheet.columns.map((c) => c.name)) : { ok: false, error: out.explanation };
        return { ...out, valid: compiled.ok, error: compiled.ok ? null : compiled.error, credits: res.credits };
    }

    async function insights(sheet, rowsIndex) {
        const res = await call('insights', { table: tableSummary(sheet, rowsIndex) });
        return { ...res.result, credits: res.credits };
    }

    QS.ai = { TASKS, BATCH, MAX_ROWS_PER_RUN, tableSummary, runAutomation, estimateCredits, ask, formula, insights };
})();
