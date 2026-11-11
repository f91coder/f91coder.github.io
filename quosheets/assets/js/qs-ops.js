/**
 * Quosheets — operacoes sobre tabelas: visao filtrada/ordenada, agrupamento, tabela dinamica,
 * executor dos planos de analise da IA e transformacoes de limpeza (puras: devolvem novos valores).
 *
 * "Tabela" generica = { columns: [{name, type, fmt?}], rows: [[...]] } (a aba e um caso particular).
 */
(() => {
    const QS = window.QS;
    const { t } = QS;
    const { parseNumber, isBlank } = QS.val;
    const F = QS.formula;

    // ── Visao (busca + filtros + ordenacao) ───────────────────────────────
    function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

    function cellText(value, column) {
        if (value === null || value === undefined) return '';
        if (column.type === 'date' && typeof value === 'string') return `${value} ${QS.fmt.date(value)}`;
        return String(value);
    }

    /** filter: {colId, kind, value, value2, values} */
    function filterPredicate(filter, column, index) {
        const kind = filter.kind;
        const isNum = column.type === 'number';
        const asNum = (v) => (typeof v === 'number' ? v : parseNumber(v));
        const target = filter.value;
        switch (kind) {
            case 'empty': return (row) => isBlank(row[index]) || String(row[index]).trim() === '';
            case 'not_empty': return (row) => !(isBlank(row[index]) || String(row[index]).trim() === '');
            case 'in': {
                const set = new Set((filter.values || []).map((v) => (v === null ? '\u0000' : String(v))));
                return (row) => set.has(isBlank(row[index]) ? '\u0000' : String(row[index]));
            }
            case 'contains': { const q = norm(target || ''); return (row) => norm(cellText(row[index], column)).includes(q); }
            case 'not_contains': { const q = norm(target || ''); return (row) => !norm(cellText(row[index], column)).includes(q); }
            case 'equals':
            case 'not_equals': {
                const want = isNum ? asNum(target) : norm(target ?? '');
                const eq = (row) => {
                    const v = row[index];
                    if (isNum && want !== null) return asNum(v) === want;
                    return norm(v === null || v === undefined ? '' : String(v)) === want;
                };
                return kind === 'equals' ? eq : (row) => !eq(row);
            }
            case 'gt': case 'gte': case 'lt': case 'lte': case 'between': {
                const parse = column.type === 'date' ? (v) => (typeof v === 'string' ? v : null) : asNum;
                const a = parse(target);
                const b = parse(filter.value2);
                return (row) => {
                    const v = parse(row[index]);
                    if (v === null || v === undefined || a === null) return false;
                    if (kind === 'gt') return v > a;
                    if (kind === 'gte') return v >= a;
                    if (kind === 'lt') return v < a;
                    if (kind === 'lte') return v <= a;
                    return b === null ? v >= a : v >= a && v <= b;
                };
            }
            default: return () => true;
        }
    }

    /** Indices (na aba) das linhas visiveis, na ordem de exibicao. */
    function computeView(sheet, view) {
        const columns = sheet.columns;
        const predicates = [];
        (view.filters || []).forEach((f) => {
            const index = columns.findIndex((c) => c.id === f.colId);
            if (index >= 0) predicates.push(filterPredicate(f, columns[index], index));
        });
        const q = view.search ? norm(view.search.trim()) : '';
        const rows = sheet.rows;
        let out = [];
        for (let r = 0; r < rows.length; r += 1) {
            const row = rows[r];
            let ok = true;
            for (let p = 0; p < predicates.length && ok; p += 1) ok = predicates[p](row);
            if (ok && q) {
                ok = false;
                for (let c = 0; c < columns.length; c += 1) {
                    const v = row[c];
                    if (v !== null && v !== undefined && norm(cellText(v, columns[c])).includes(q)) { ok = true; break; }
                }
            }
            if (ok) out.push(r);
        }
        if (view.sort && view.sort.colId) {
            const index = columns.findIndex((c) => c.id === view.sort.colId);
            if (index >= 0) {
                const dir = view.sort.dir === 'desc' ? -1 : 1;
                out = out.map((r, i) => [r, i]);
                out.sort((a, b) => {
                    const va = rows[a[0]][index];
                    const vb = rows[b[0]][index];
                    const ba = isBlank(va); const bb = isBlank(vb);
                    if (ba || bb) return ba && bb ? a[1] - b[1] : (ba ? 1 : -1); // vazios sempre no fim
                    return F.compare(va, vb) * dir || a[1] - b[1];
                });
                out = out.map((pair) => pair[0]);
            }
        }
        return out;
    }

    // ── Agregacoes ────────────────────────────────────────────────────────
    function numericValues(values) {
        const out = [];
        for (const v of values) {
            if (isBlank(v)) continue;
            const n = typeof v === 'number' ? v : parseNumber(v);
            if (n !== null && Number.isFinite(n)) out.push(n);
        }
        return out;
    }
    function aggregate(fn, values) {
        switch (fn) {
            case 'count': return values.filter((v) => !isBlank(v)).length;
            case 'count_rows': return values.length;
            case 'count_distinct': return new Set(values.filter((v) => !isBlank(v)).map(String)).size;
            case 'sum': { const n = numericValues(values); return n.length ? round(n.reduce((s, v) => s + v, 0)) : 0; }
            case 'avg': { const n = numericValues(values); return n.length ? round(n.reduce((s, v) => s + v, 0) / n.length) : null; }
            case 'median': {
                const n = numericValues(values).sort((a, b) => a - b);
                if (!n.length) return null;
                const m = Math.floor(n.length / 2);
                return round(n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2);
            }
            case 'min': case 'max': {
                const n = numericValues(values);
                if (n.length) return fn === 'min' ? Math.min(...n) : Math.max(...n);
                const s = values.filter((v) => !isBlank(v));
                if (!s.length) return null;
                return s.reduce((best, v) => ((fn === 'min' ? F.compare(v, best) < 0 : F.compare(v, best) > 0) ? v : best));
            }
            default: return null;
        }
    }
    function round(v) { return Math.round(v * 1e8) / 1e8; }
    const AGG_RESULT_TYPE = { count: 'number', count_rows: 'number', count_distinct: 'number', sum: 'number', avg: 'number', median: 'number' };

    /**
     * Agrupa uma tabela. by: indices; aggs: [{fn, col (indice ou -1 = linhas), as}]
     */
    function groupTable(table, by, aggs) {
        const groups = new Map();
        const order = [];
        for (const row of table.rows) {
            const keyValues = by.map((i) => (row[i] === undefined ? null : row[i]));
            const key = JSON.stringify(keyValues);
            let g = groups.get(key);
            if (!g) { g = { keyValues, rows: [] }; groups.set(key, g); order.push(g); }
            g.rows.push(row);
        }
        if (!by.length && !order.length) order.push({ keyValues: [], rows: [] });
        const columns = by.map((i) => ({ ...table.columns[i] }))
            .concat(aggs.map((a) => ({ name: a.as, type: AGG_RESULT_TYPE[a.fn] || (a.col >= 0 ? table.columns[a.col].type : 'number') })));
        const rows = order.map((g) => g.keyValues.concat(aggs.map((a) => {
            if (a.col < 0) return g.rows.length;
            return aggregate(a.fn === 'count' && a.col < 0 ? 'count_rows' : a.fn, g.rows.map((r) => r[a.col]));
        })));
        return { columns, rows };
    }

    function findColumn(table, name) {
        const key = String(name || '').trim().toLowerCase();
        return table.columns.findIndex((c) => c.name.toLowerCase() === key);
    }

    // ── Executor dos planos da IA ─────────────────────────────────────────
    /**
     * runPlan(sheet, rowsIndex, plan) -> { ok, table } | { ok:false, error, step }
     * Passos: filter, derive, group, sort, limit, select (ver ai.php -> QS_PROMPT_ASK).
     */
    function runPlan(sheet, rowsIndex, plan) {
        let table = {
            columns: sheet.columns.map((c) => ({ name: c.name, type: c.type, fmt: c.fmt })),
            rows: (rowsIndex || sheet.rows.map((_, i) => i)).map((i) => sheet.rows[i]),
        };
        const steps = Array.isArray(plan.steps) ? plan.steps.slice(0, 20) : [];
        for (let s = 0; s < steps.length; s += 1) {
            const step = steps[s] || {};
            const fail = (key, vars) => ({ ok: false, error: t(key, vars), step: s + 1 });
            const names = table.columns.map((c) => c.name);
            switch (step.op) {
                case 'filter': {
                    const c = F.compile(step.expr, names);
                    if (!c.ok) return fail('plan.err_expr', { error: c.error });
                    table = { columns: table.columns, rows: table.rows.filter((r) => F.truthy(c.fn(r))) };
                    break;
                }
                case 'derive': {
                    const c = F.compile(step.expr, names);
                    if (!c.ok) return fail('plan.err_expr', { error: c.error });
                    const name = String(step.name || '').trim() || t('data.column');
                    let idx = findColumn(table, name);
                    const columns = table.columns.slice();
                    if (idx < 0) { idx = columns.length; columns.push({ name, type: 'text' }); }
                    const rows = table.rows.map((r) => { const n = r.slice(); n[idx] = c.fn(r); return n; });
                    columns[idx] = { name, type: QS.data.inferColumn(rows.slice(0, 500).map((r) => r[idx])).type };
                    table = { columns, rows };
                    break;
                }
                case 'group': {
                    const by = (step.by || []).map((n) => findColumn(table, n));
                    const missing = (step.by || []).find((n, i) => by[i] < 0);
                    if (missing !== undefined) return fail('plan.err_col', { name: missing });
                    const aggs = [];
                    for (const a of step.aggs || []) {
                        const col = a.col === '*' || a.col === '' ? -1 : findColumn(table, a.col);
                        if (col < 0 && !(a.col === '*' || a.col === '')) return fail('plan.err_col', { name: a.col });
                        aggs.push({ fn: a.fn, col, as: String(a.as || a.fn).trim() });
                    }
                    if (!aggs.length) aggs.push({ fn: 'count', col: -1, as: t('pivot.count') });
                    table = groupTable(table, by, aggs);
                    break;
                }
                case 'sort': {
                    const idx = findColumn(table, step.col);
                    if (idx < 0) return fail('plan.err_col', { name: step.col });
                    const dir = step.dir === 'desc' ? -1 : 1;
                    const rows = table.rows.map((r, i) => [r, i]);
                    rows.sort((a, b) => {
                        const va = a[0][idx]; const vb = b[0][idx];
                        if (isBlank(va) || isBlank(vb)) return isBlank(va) && isBlank(vb) ? a[1] - b[1] : (isBlank(va) ? 1 : -1);
                        return F.compare(va, vb) * dir || a[1] - b[1];
                    });
                    table = { columns: table.columns, rows: rows.map((p) => p[0]) };
                    break;
                }
                case 'limit': {
                    const n = QS.clamp(Math.trunc(Number(step.n) || 0), 1, 100000);
                    table = { columns: table.columns, rows: table.rows.slice(0, n) };
                    break;
                }
                case 'select': {
                    const idx = (step.cols || []).map((n) => findColumn(table, n));
                    const missing = (step.cols || []).find((n, i) => idx[i] < 0);
                    if (missing !== undefined) return fail('plan.err_col', { name: missing });
                    if (!idx.length) break;
                    table = { columns: idx.map((i) => table.columns[i]), rows: table.rows.map((r) => idx.map((i) => r[i])) };
                    break;
                }
                default:
                    return fail('plan.err_step', { op: String(step.op) });
            }
        }
        return { ok: true, table };
    }

    // ── Tabela dinamica ───────────────────────────────────────────────────
    const AGG_LABEL = (fn) => t(`agg.${fn}`);

    /** spec: {rows: [colIndex], col: colIndex|null, values: [{col: index|-1, fn}]} */
    function pivot(sheet, rowsIndex, spec) {
        const base = { columns: sheet.columns.map((c) => ({ name: c.name, type: c.type, fmt: c.fmt })), rows: (rowsIndex || sheet.rows.map((_, i) => i)).map((i) => sheet.rows[i]) };
        const values = spec.values && spec.values.length ? spec.values : [{ col: -1, fn: 'count' }];
        const label = (v) => (v.col < 0 ? t('pivot.count') : `${AGG_LABEL(v.fn)} · ${base.columns[v.col].name}`);
        if (spec.col === null || spec.col === undefined || spec.col < 0) {
            const table = groupTable(base, spec.rows, values.map((v) => ({ fn: v.col < 0 ? 'count' : v.fn, col: v.col, as: label(v) })));
            if (spec.rows.length) sortByKeys(table, spec.rows.length);
            return { table, truncated: false };
        }
        // Coluna "espalhada": um bloco de colunas por valor distinto (limite 60).
        const colKeys = [];
        const seen = new Set();
        for (const row of base.rows) {
            const k = isBlank(row[spec.col]) ? '' : String(row[spec.col]);
            if (!seen.has(k)) { seen.add(k); colKeys.push(k); }
        }
        colKeys.sort((a, b) => F.compare(a, b));
        const truncated = colKeys.length > 60;
        const keys = colKeys.slice(0, 60);
        const groups = new Map();
        const order = [];
        for (const row of base.rows) {
            const keyValues = spec.rows.map((i) => (row[i] === undefined ? null : row[i]));
            const key = JSON.stringify(keyValues);
            let g = groups.get(key);
            if (!g) { g = { keyValues, byCol: new Map(), all: [] }; groups.set(key, g); order.push(g); }
            const ck = isBlank(row[spec.col]) ? '' : String(row[spec.col]);
            if (!g.byCol.has(ck)) g.byCol.set(ck, []);
            g.byCol.get(ck).push(row);
            g.all.push(row);
        }
        const columns = spec.rows.map((i) => ({ ...base.columns[i] }));
        keys.forEach((k) => values.forEach((v) => columns.push({ name: `${k === '' ? t('pivot.blank') : QS.val.display(k, base.columns[spec.col])}${values.length > 1 ? ` · ${label(v)}` : ''}`, type: 'number' })));
        values.forEach((v) => columns.push({ name: `${t('pivot.total')}${values.length > 1 ? ` · ${label(v)}` : ''}`, type: 'number' }));
        const calc = (rows, v) => (v.col < 0 ? rows.length : aggregate(v.fn, rows.map((r) => r[v.col])));
        const rows = order.map((g) => {
            const out = g.keyValues.slice();
            keys.forEach((k) => values.forEach((v) => { const rs = g.byCol.get(k); out.push(rs ? calc(rs, v) : null); }));
            values.forEach((v) => out.push(calc(g.all, v)));
            return out;
        });
        const table = { columns, rows };
        if (spec.rows.length) sortByKeys(table, spec.rows.length);
        return { table, truncated };
    }
    function sortByKeys(table, n) {
        table.rows.sort((a, b) => {
            for (let i = 0; i < n; i += 1) { const c = F.compare(a[i], b[i]); if (c) return c; }
            return 0;
        });
    }

    // ── Limpeza (funcoes puras) ───────────────────────────────────────────
    function mapText(values, fn) {
        let changed = 0;
        const out = values.map((v) => {
            if (typeof v !== 'string') return v;
            const n = fn(v);
            if (n !== v) changed += 1;
            return n === '' ? null : n;
        });
        return { values: out, changed };
    }
    const cleaners = {
        trim: (values) => mapText(values, (s) => s.replace(/[\s ]+/g, ' ').trim()),
        upper: (values) => mapText(values, (s) => s.toLocaleUpperCase(QS.LOCALE)),
        lower: (values) => mapText(values, (s) => s.toLocaleLowerCase(QS.LOCALE)),
        title: (values) => mapText(values, (s) => s.toLocaleLowerCase(QS.LOCALE).replace(/(^|[\s\-'(/])(\p{L})/gu, (m, sep, ch) => sep + ch.toLocaleUpperCase(QS.LOCALE))),
    };

    /** Localizar e substituir. opts: {matchCase, wholeCell, regex} */
    function replaceValues(values, find, replacement, opts = {}) {
        let re;
        try {
            const flags = opts.matchCase ? 'gu' : 'giu';
            const source = opts.regex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            re = new RegExp(opts.wholeCell ? `^(?:${source})$` : source, flags);
        } catch (e) {
            return { error: t('clean.err_regex') };
        }
        let changed = 0;
        const out = values.map((v) => {
            if (v === null || v === undefined) return v;
            const s = typeof v === 'number' ? QS.val.editText(v) : String(v);
            re.lastIndex = 0;
            if (!re.test(s)) return v;
            re.lastIndex = 0;
            changed += 1;
            const next = s.replace(re, replacement);
            return next === '' ? null : next;
        });
        return { values: out, changed };
    }

    function fillEmpty(values, mode, fillValue) {
        let changed = 0;
        const out = values.slice();
        if (mode === 'value') {
            for (let i = 0; i < out.length; i += 1) if (isBlank(out[i])) { out[i] = fillValue; changed += 1; }
        } else if (mode === 'previous') {
            let last = null;
            for (let i = 0; i < out.length; i += 1) { if (isBlank(out[i])) { if (last !== null) { out[i] = last; changed += 1; } } else last = out[i]; }
        } else {
            let last = null;
            for (let i = out.length - 1; i >= 0; i -= 1) { if (isBlank(out[i])) { if (last !== null) { out[i] = last; changed += 1; } } else last = out[i]; }
        }
        return { values: out, changed };
    }

    /** Indices de linhas duplicadas (mantem a primeira). cols: indices considerados (vazio = todos). */
    function duplicateRows(rows, cols) {
        const seen = new Set();
        const dupes = [];
        rows.forEach((row, i) => {
            const key = JSON.stringify(cols && cols.length ? cols.map((c) => normKey(row[c])) : row.map(normKey));
            if (seen.has(key)) dupes.push(i); else seen.add(key);
        });
        return dupes;
    }
    function normKey(v) { return typeof v === 'string' ? v.trim().toLowerCase() : v; }

    function emptyRows(rows) {
        const out = [];
        rows.forEach((row, i) => { if (row.every((v) => isBlank(v) || (typeof v === 'string' && v.trim() === ''))) out.push(i); });
        return out;
    }

    /** Divide textos pelo separador em ate maxParts partes; a ultima parte guarda o resto intacto. */
    function splitValues(values, delimiter, maxParts = 10) {
        let parts = 1;
        values.forEach((v) => { if (!isBlank(v)) parts = Math.min(maxParts, Math.max(parts, String(v).split(delimiter).length)); });
        const rows = values.map((v) => {
            if (isBlank(v)) return [];
            const out = [];
            let rest = String(v);
            for (let i = 0; i < parts - 1; i += 1) {
                const at = rest.indexOf(delimiter);
                if (at < 0) break;
                out.push(rest.slice(0, at).trim());
                rest = rest.slice(at + delimiter.length);
            }
            out.push(rest.trim());
            return out;
        });
        return { parts, rows };
    }

    QS.ops = {
        computeView, filterPredicate, aggregate, groupTable, runPlan, pivot,
        cleaners, replaceValues, fillEmpty, duplicateRows, emptyRows, splitValues, findColumn,
    };
})();
