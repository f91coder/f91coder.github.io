/**
 * Quosheets — linguagem de formulas (colunas calculadas e planos da IA).
 * Parser proprio (sem eval): tokenizador + Pratt parser + compilacao para funcoes JS.
 *
 *   [Coluna] * 2, IF([Total] > 1000, "Alto", "Baixo"), FORMATDATE([Data], "YYYY-MM"), ...
 *
 * A mesma referencia da linguagem vai no prompt da IA (php/quosheets/ai.php -> QS_FORMULA_REFERENCE);
 * mantenha as duas em sincronia ao adicionar funcoes.
 */
(() => {
    const QS = window.QS;
    const { parseNumber, parseDate, isoFromParts, isBlank, daysInMonth } = QS.val;

    class FormulaError extends Error {
        constructor(key, vars, pos) { super(QS.t(key, vars)); this.key = key; this.pos = pos; }
    }

    // ── Tokenizador ───────────────────────────────────────────────────────
    function tokenize(src) {
        const tokens = [];
        let i = 0;
        const n = src.length;
        const push = (type, value, pos) => tokens.push({ type, value, pos });
        while (i < n) {
            const ch = src[i];
            if (/\s/.test(ch)) { i += 1; continue; }
            const start = i;
            if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
                const m = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
                push('num', Number(m[0]), start);
                i += m[0].length;
                continue;
            }
            if (ch === '"' || ch === "'") {
                let s = '';
                i += 1;
                let closed = false;
                while (i < n) {
                    const c = src[i];
                    if (c === '\\' && i + 1 < n) { s += src[i + 1]; i += 2; continue; }
                    if (c === ch) {
                        if (src[i + 1] === ch) { s += ch; i += 2; continue; }
                        closed = true; i += 1; break;
                    }
                    s += c; i += 1;
                }
                if (!closed) throw new FormulaError('formula.err_string', null, start);
                push('str', s, start);
                continue;
            }
            if (ch === '[') {
                let s = '';
                i += 1;
                let closed = false;
                while (i < n) {
                    if (src[i] === ']') {
                        if (src[i + 1] === ']') { s += ']'; i += 2; continue; }
                        closed = true; i += 1; break;
                    }
                    s += src[i]; i += 1;
                }
                if (!closed) throw new FormulaError('formula.err_bracket', null, start);
                push('col', s.trim(), start);
                continue;
            }
            if (/[A-Za-z_À-ɏ]/.test(ch)) {
                const m = /^[A-Za-z_À-ɏ][A-Za-z0-9_À-ɏ.]*/.exec(src.slice(i));
                push('id', m[0], start);
                i += m[0].length;
                continue;
            }
            const two = src.slice(i, i + 2);
            if (['<=', '>=', '<>', '!=', '==', '&&', '||'].includes(two)) { push('op', two, start); i += 2; continue; }
            // ";" vale como "," (separador de argumentos do Excel em portugues/espanhol)
            if ('+-*/%^&=<>(),!;'.includes(ch)) { push('op', ch === ';' ? ',' : ch, start); i += 1; continue; }
            throw new FormulaError('formula.err_char', { char: ch }, start);
        }
        push('eof', null, n);
        return tokens;
    }

    // ── Parser (Pratt) ────────────────────────────────────────────────────
    const BINARY = {
        OR: 1, '||': 1,
        AND: 2, '&&': 2,
        '=': 4, '==': 4, '<>': 4, '!=': 4, '<': 4, '<=': 4, '>': 4, '>=': 4,
        '&': 5,
        '+': 6, '-': 6,
        '*': 7, '/': 7, '%': 7,
        '^': 9,
    };
    const NOT_PREC = 3;
    const UNARY_PREC = 8;

    function parse(src) {
        const tokens = tokenize(src);
        let pos = 0;
        const peek = () => tokens[pos];
        const next = () => tokens[pos++];
        const opOf = (tok) => {
            if (tok.type === 'op') return tok.value;
            if (tok.type === 'id') { const up = tok.value.toUpperCase(); if (up === 'AND' || up === 'OR') return up; }
            return null;
        };
        function expect(value) {
            const tok = next();
            if (tok.type !== 'op' || tok.value !== value) throw new FormulaError('formula.err_expected', { what: value }, tok.pos);
        }
        function parseExpr(minPrec) {
            let left = parsePrefix();
            for (;;) {
                const tok = peek();
                const op = opOf(tok);
                if (!op || !(op in BINARY)) break;
                const prec = BINARY[op];
                if (prec < minPrec) break;
                next();
                const right = parseExpr(op === '^' ? prec : prec + 1);
                left = { t: 'bin', op, a: left, b: right };
            }
            return left;
        }
        function parsePrefix() {
            const tok = next();
            if (tok.type === 'num') return { t: 'lit', v: tok.value };
            if (tok.type === 'str') return { t: 'lit', v: tok.value };
            if (tok.type === 'col') {
                if (!tok.value) throw new FormulaError('formula.err_empty_col', null, tok.pos);
                return { t: 'col', name: tok.value, pos: tok.pos };
            }
            if (tok.type === 'op' && (tok.value === '-' || tok.value === '+')) {
                return { t: 'un', op: tok.value, a: parseExpr(UNARY_PREC) };
            }
            if (tok.type === 'op' && tok.value === '!') return { t: 'not', a: parseExpr(NOT_PREC) };
            if (tok.type === 'op' && tok.value === '(') {
                const inner = parseExpr(0);
                expect(')');
                return inner;
            }
            if (tok.type === 'id') {
                const up = tok.value.toUpperCase();
                if (peek().type === 'op' && peek().value === '(') {
                    next();
                    const args = [];
                    if (!(peek().type === 'op' && peek().value === ')')) {
                        for (;;) {
                            args.push(parseExpr(0));
                            if (peek().type === 'op' && peek().value === ',') { next(); continue; }
                            break;
                        }
                    }
                    expect(')');
                    return { t: 'call', name: up, args, pos: tok.pos };
                }
                if (up === 'TRUE' || up === 'VERDADEIRO' || up === 'VERDADERO') return { t: 'lit', v: true };
                if (up === 'FALSE' || up === 'FALSO') return { t: 'lit', v: false };
                if (up === 'NULL') return { t: 'lit', v: null };
                if (up === 'NOT') return { t: 'not', a: parseExpr(NOT_PREC) };
                throw new FormulaError('formula.err_unknown_name', { name: tok.value }, tok.pos);
            }
            if (tok.type === 'eof') throw new FormulaError('formula.err_incomplete', null, tok.pos);
            throw new FormulaError('formula.err_unexpected', { what: tok.value }, tok.pos);
        }
        if (peek().type === 'op' && peek().value === '=') next(); // aceita "=[A]+[B]" estilo Excel
        const ast = parseExpr(0);
        if (peek().type !== 'eof') throw new FormulaError('formula.err_unexpected', { what: peek().value }, peek().pos);
        return ast;
    }

    // ── Semantica dos valores ─────────────────────────────────────────────
    const BAD = Symbol('bad');
    function toNum(v) {
        if (typeof v === 'number') return Number.isFinite(v) ? v : BAD;
        if (v === null || v === undefined || v === '') return 0;
        if (typeof v === 'boolean') return v ? 1 : 0;
        const n = parseNumber(String(v));
        return n === null ? BAD : n;
    }
    function toStr(v) {
        if (v === null || v === undefined) return '';
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
        if (typeof v === 'number') return String(Math.round(v * 1e10) / 1e10);
        return String(v);
    }
    function truthy(v) {
        if (v === null || v === undefined || v === '' || v === false) return false;
        if (typeof v === 'number') return v !== 0 && !Number.isNaN(v);
        if (typeof v === 'string') { const s = v.trim().toLowerCase(); return !(s === 'false' || s === 'falso' || s === '0'); }
        return true;
    }
    const collator = new Intl.Collator(QS.LOCALE, { sensitivity: 'base', numeric: true });
    function compare(a, b) {
        const aBlank = isBlank(a);
        const bBlank = isBlank(b);
        if (aBlank || bBlank) return aBlank && bBlank ? 0 : (aBlank ? -1 : 1);
        if (typeof a === 'number' || typeof b === 'number') {
            const x = toNum(a);
            const y = toNum(b);
            if (x !== BAD && y !== BAD) return x < y ? -1 : x > y ? 1 : 0;
        }
        if (typeof a === 'boolean' || typeof b === 'boolean') return truthy(a) === truthy(b) ? 0 : (truthy(a) ? 1 : -1);
        return collator.compare(String(a), String(b));
    }
    function num(fn) {
        return (...args) => {
            const nums = args.map(toNum);
            if (nums.some((x) => x === BAD)) return null;
            const r = fn(...nums);
            return typeof r === 'number' && !Number.isFinite(r) ? null : r;
        };
    }
    function roundTo(x, d, mode) {
        const f = 10 ** Math.trunc(d || 0);
        const y = x * f;
        let r;
        if (mode === 'up') r = y >= 0 ? Math.ceil(y - 1e-9) : Math.floor(y + 1e-9);
        else if (mode === 'down') r = Math.trunc(y);
        else r = Math.sign(y) * Math.round(Math.abs(y) + 1e-9);
        return r / f;
    }
    function numericArgs(args) {
        const out = [];
        for (const v of args) {
            if (isBlank(v)) continue;
            const n = typeof v === 'number' ? v : parseNumber(String(v));
            if (n !== null && Number.isFinite(n)) out.push(n);
        }
        return out;
    }
    function dateParts(v) {
        if (isBlank(v)) return null;
        const iso = typeof v === 'string' ? (/^\d{4}-\d{2}-\d{2}/.test(v) ? v : parseDate(v)) : (v instanceof Date ? QS.val.isoFromDate(v) : null);
        if (!iso) return null;
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
        return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null;
    }
    function dayNumber(p) { return Date.UTC(p.y, p.m - 1, p.d) / 86400000; }
    function isoFromDayNumber(n) { const d = new Date(n * 86400000); return isoFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); }
    const regexCache = new Map();
    function regex(pattern) {
        const key = String(pattern);
        if (!regexCache.has(key)) {
            let re = null;
            try { re = new RegExp(key, 'iu'); } catch (e) { re = null; }
            if (regexCache.size > 200) regexCache.clear();
            regexCache.set(key, re);
        }
        return regexCache.get(key);
    }
    function fold(s) { return toStr(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

    /** Funcoes com avaliacao normal (argumentos ja calculados). [min, max, fn] */
    const FUNCS = {
        NOT: [1, 1, (x) => !truthy(x)],
        ISBLANK: [1, 1, (x) => isBlank(x) || (typeof x === 'string' && x.trim() === '')],
        ISNUMBER: [1, 1, (x) => typeof x === 'number' && Number.isFinite(x)],
        ROUND: [1, 2, num((x, d = 0) => roundTo(x, d))],
        ROUNDUP: [1, 2, num((x, d = 0) => roundTo(x, d, 'up'))],
        ROUNDDOWN: [1, 2, num((x, d = 0) => roundTo(x, d, 'down'))],
        INT: [1, 1, num((x) => Math.floor(x))],
        ABS: [1, 1, num((x) => Math.abs(x))],
        SQRT: [1, 1, num((x) => (x < 0 ? NaN : Math.sqrt(x)))],
        POWER: [2, 2, num((x, y) => x ** y)],
        MOD: [2, 2, num((a, b) => (b === 0 ? NaN : a - b * Math.floor(a / b)))],
        MIN: [1, 255, (...a) => { const n = numericArgs(a); return n.length ? Math.min(...n) : null; }],
        MAX: [1, 255, (...a) => { const n = numericArgs(a); return n.length ? Math.max(...n) : null; }],
        SUM: [1, 255, (...a) => numericArgs(a).reduce((s, v) => s + v, 0)],
        AVERAGE: [1, 255, (...a) => { const n = numericArgs(a); return n.length ? n.reduce((s, v) => s + v, 0) / n.length : null; }],
        LEN: [1, 1, (t) => toStr(t).length],
        UPPER: [1, 1, (t) => toStr(t).toLocaleUpperCase(QS.LOCALE)],
        LOWER: [1, 1, (t) => toStr(t).toLocaleLowerCase(QS.LOCALE)],
        PROPER: [1, 1, (t) => toStr(t).toLocaleLowerCase(QS.LOCALE).replace(/(^|[\s\-'(/])(\p{L})/gu, (m, sep, ch) => sep + ch.toLocaleUpperCase(QS.LOCALE))],
        TRIM: [1, 1, (t) => toStr(t).replace(/\s+/g, ' ').trim()],
        LEFT: [1, 2, (t, n = 1) => { const k = toNum(n); return k === BAD ? null : toStr(t).slice(0, Math.max(0, k)); }],
        RIGHT: [1, 2, (t, n = 1) => { const k = toNum(n); return k === BAD ? null : (k <= 0 ? '' : toStr(t).slice(-k)); }],
        MID: [3, 3, (t, s, l) => { const a = toNum(s); const b = toNum(l); return a === BAD || b === BAD ? null : toStr(t).substr(Math.max(0, a - 1), Math.max(0, b)); }],
        CONCAT: [1, 255, (...a) => a.map(toStr).join('')],
        SUBSTITUTE: [3, 3, (t, f, r) => { const s = toStr(f); return s === '' ? toStr(t) : toStr(t).split(s).join(toStr(r)); }],
        CONTAINS: [2, 2, (t, s) => fold(t).includes(fold(s))],
        STARTSWITH: [2, 2, (t, s) => fold(t).startsWith(fold(s))],
        ENDSWITH: [2, 2, (t, s) => fold(t).endsWith(fold(s))],
        SPLIT: [3, 3, (t, sep, idx) => {
            const k = toNum(idx);
            if (k === BAD) return null;
            const parts = toStr(t).split(toStr(sep) || ' ');
            const i = k < 0 ? parts.length + k : k - 1;
            return i >= 0 && i < parts.length ? parts[i].trim() : '';
        }],
        TEXT: [1, 1, (x) => toStr(x)],
        NUMBER: [1, 1, (x) => (typeof x === 'number' ? x : parseNumber(toStr(x)))],
        DIGITS: [1, 1, (t) => toStr(t).replace(/\D+/g, '')],
        REGEXMATCH: [2, 2, (t, p) => { const re = regex(p); return re ? re.test(toStr(t)) : null; }],
        REGEXEXTRACT: [2, 2, (t, p) => { const re = regex(p); if (!re) return null; const m = re.exec(toStr(t)); return m ? (m[1] !== undefined ? m[1] : m[0]) : ''; }],
        TODAY: [0, 0, () => QS.val.isoFromDate(new Date()).slice(0, 10)],
        DATE: [3, 3, num((y, m, d) => {
            const dt = new Date(Date.UTC(Math.trunc(y), Math.trunc(m) - 1, Math.trunc(d)));
            return isoFromParts(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
        })],
        YEAR: [1, 1, (d) => { const p = dateParts(d); return p ? p.y : null; }],
        MONTH: [1, 1, (d) => { const p = dateParts(d); return p ? p.m : null; }],
        DAY: [1, 1, (d) => { const p = dateParts(d); return p ? p.d : null; }],
        QUARTER: [1, 1, (d) => { const p = dateParts(d); return p ? Math.ceil(p.m / 3) : null; }],
        WEEKDAY: [1, 1, (d) => { const p = dateParts(d); return p ? new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() + 1 : null; }],
        DATEDIF: [3, 3, (a, b, unit) => {
            const p = dateParts(a); const q = dateParts(b);
            if (!p || !q) return null;
            const u = toStr(unit).toUpperCase();
            if (u === 'D') return dayNumber(q) - dayNumber(p);
            let months = (q.y - p.y) * 12 + (q.m - p.m);
            if (q.d < p.d) months -= 1;
            if (u === 'M') return months;
            if (u === 'Y') return Math.trunc(months / 12);
            return null;
        }],
        EDATE: [2, 2, (d, months) => {
            const p = dateParts(d); const k = toNum(months);
            if (!p || k === BAD) return null;
            const total = p.y * 12 + (p.m - 1) + Math.trunc(k);
            const y = Math.floor(total / 12);
            const m = (total % 12 + 12) % 12 + 1;
            return isoFromParts(y, m, Math.min(p.d, daysInMonth(y, m)));
        }],
        FORMATDATE: [2, 2, (d, pattern) => {
            const p = dateParts(d);
            if (!p) return null;
            return toStr(pattern)
                .replace(/YYYY/g, String(p.y))
                .replace(/YY/g, String(p.y).slice(-2))
                .replace(/MM/g, String(p.m).padStart(2, '0'))
                .replace(/DD/g, String(p.d).padStart(2, '0'));
        }],
    };
    /** Funcoes com avaliacao preguicosa (curto-circuito). */
    const LAZY = { IF: [2, 3], IFS: [2, 255], AND: [1, 255], OR: [1, 255], COALESCE: [1, 255] };

    // ── Compilacao ────────────────────────────────────────────────────────
    function binary(op, fa, fb) {
        switch (op) {
            case '+': return (r) => { const a = toNum(fa(r)); const b = toNum(fb(r)); return a === BAD || b === BAD ? null : a + b; };
            case '-': return (r) => { const a = toNum(fa(r)); const b = toNum(fb(r)); return a === BAD || b === BAD ? null : a - b; };
            case '*': return (r) => { const a = toNum(fa(r)); const b = toNum(fb(r)); return a === BAD || b === BAD ? null : a * b; };
            case '/': return (r) => { const a = toNum(fa(r)); const b = toNum(fb(r)); return a === BAD || b === BAD || b === 0 ? null : a / b; };
            case '%': return (r) => { const a = toNum(fa(r)); const b = toNum(fb(r)); return a === BAD || b === BAD || b === 0 ? null : a - b * Math.floor(a / b); };
            case '^': return (r) => { const a = toNum(fa(r)); const b = toNum(fb(r)); if (a === BAD || b === BAD) return null; const v = a ** b; return Number.isFinite(v) ? v : null; };
            case '&': return (r) => toStr(fa(r)) + toStr(fb(r));
            case '=': case '==': return (r) => compare(fa(r), fb(r)) === 0;
            case '<>': case '!=': return (r) => compare(fa(r), fb(r)) !== 0;
            case '<': return (r) => compare(fa(r), fb(r)) < 0;
            case '<=': return (r) => compare(fa(r), fb(r)) <= 0;
            case '>': return (r) => compare(fa(r), fb(r)) > 0;
            case '>=': return (r) => compare(fa(r), fb(r)) >= 0;
            case 'AND': case '&&': return (r) => truthy(fa(r)) && truthy(fb(r));
            case 'OR': case '||': return (r) => truthy(fa(r)) || truthy(fb(r));
            default: throw new FormulaError('formula.err_unexpected', { what: op });
        }
    }

    /**
     * compile(expr, columnNames) -> { ok, fn(row) | error, used: [indices] }
     * row e o array de valores na ordem de columnNames.
     */
    function compile(expr, columnNames) {
        const lookup = new Map();
        columnNames.forEach((name, i) => {
            const key = String(name).trim().toLowerCase();
            if (!lookup.has(key)) lookup.set(key, i);
        });
        const used = new Set();
        function build(node) {
            switch (node.t) {
                case 'lit': { const v = node.v; return () => v; }
                case 'col': {
                    const idx = lookup.get(node.name.toLowerCase());
                    if (idx === undefined) throw new FormulaError('formula.err_unknown_col', { name: node.name }, node.pos);
                    used.add(idx);
                    return (r) => { const v = r[idx]; return v === undefined ? null : v; };
                }
                case 'un': {
                    const f = build(node.a);
                    return node.op === '-' ? (r) => { const v = toNum(f(r)); return v === BAD ? null : -v; } : (r) => { const v = toNum(f(r)); return v === BAD ? null : v; };
                }
                case 'not': { const f = build(node.a); return (r) => !truthy(f(r)); }
                case 'bin': return binary(node.op, build(node.a), build(node.b));
                case 'call': {
                    const name = node.name;
                    const argc = node.args.length;
                    if (LAZY[name]) {
                        const [min, max] = LAZY[name];
                        if (argc < min || argc > max) throw new FormulaError('formula.err_args', { name, min, max: max === 255 ? '…' : max }, node.pos);
                        const fs = node.args.map(build);
                        if (name === 'IF') return (r) => (truthy(fs[0](r)) ? fs[1](r) : (fs[2] ? fs[2](r) : null));
                        if (name === 'AND') return (r) => fs.every((f) => truthy(f(r)));
                        if (name === 'OR') return (r) => fs.some((f) => truthy(f(r)));
                        if (name === 'COALESCE') return (r) => { for (const f of fs) { const v = f(r); if (!isBlank(v)) return v; } return null; };
                        return (r) => { // IFS
                            for (let i = 0; i + 1 < fs.length; i += 2) if (truthy(fs[i](r))) return fs[i + 1](r);
                            return fs.length % 2 ? fs[fs.length - 1](r) : null;
                        };
                    }
                    const spec = FUNCS[name];
                    if (!spec) throw new FormulaError('formula.err_unknown_fn', { name }, node.pos);
                    const [min, max, fn] = spec;
                    if (argc < min || argc > max) throw new FormulaError('formula.err_args', { name, min, max: max === 255 ? '…' : max }, node.pos);
                    const fs = node.args.map(build);
                    return (r) => fn(...fs.map((f) => f(r)));
                }
                default: throw new FormulaError('formula.err_incomplete');
            }
        }
        try {
            const src = String(expr || '').trim();
            if (!src) throw new FormulaError('formula.err_empty');
            const raw = build(parse(src));
            const fn = (row) => {
                try {
                    const v = raw(row);
                    if (typeof v === 'number' && !Number.isFinite(v)) return null;
                    return v === undefined ? null : v;
                } catch (e) { return null; }
            };
            return { ok: true, fn, used: [...used] };
        } catch (error) {
            return { ok: false, error: error instanceof FormulaError ? error.message : QS.t('formula.err_incomplete'), pos: error.pos };
        }
    }

    /** Nomes e assinaturas (exibidos no editor de formulas; parametros em ingles, neutros entre idiomas). */
    const FUNCTION_DOCS = [
        ['IF', 'IF(condition, then, else)', 'logic'], ['IFS', 'IFS(cond1, value1, cond2, value2, …)', 'logic'], ['AND', 'AND(a, b, …)', 'logic'],
        ['OR', 'OR(a, b, …)', 'logic'], ['NOT', 'NOT(x)', 'logic'], ['ISBLANK', 'ISBLANK(x)', 'logic'], ['ISNUMBER', 'ISNUMBER(x)', 'logic'],
        ['COALESCE', 'COALESCE(a, b, …)', 'logic'],
        ['ROUND', 'ROUND(x, digits)', 'math'], ['ROUNDUP', 'ROUNDUP(x, digits)', 'math'], ['ROUNDDOWN', 'ROUNDDOWN(x, digits)', 'math'],
        ['INT', 'INT(x)', 'math'], ['ABS', 'ABS(x)', 'math'], ['SQRT', 'SQRT(x)', 'math'], ['POWER', 'POWER(x, y)', 'math'], ['MOD', 'MOD(a, b)', 'math'],
        ['MIN', 'MIN(a, b, …)', 'math'], ['MAX', 'MAX(a, b, …)', 'math'], ['SUM', 'SUM(a, b, …)', 'math'], ['AVERAGE', 'AVERAGE(a, b, …)', 'math'],
        ['LEN', 'LEN(text)', 'text'], ['UPPER', 'UPPER(text)', 'text'], ['LOWER', 'LOWER(text)', 'text'], ['PROPER', 'PROPER(text)', 'text'],
        ['TRIM', 'TRIM(text)', 'text'], ['LEFT', 'LEFT(text, n)', 'text'], ['RIGHT', 'RIGHT(text, n)', 'text'], ['MID', 'MID(text, start, n)', 'text'],
        ['CONCAT', 'CONCAT(a, b, …)', 'text'], ['SUBSTITUTE', 'SUBSTITUTE(text, find, replacement)', 'text'], ['CONTAINS', 'CONTAINS(text, search)', 'text'],
        ['STARTSWITH', 'STARTSWITH(text, prefix)', 'text'], ['ENDSWITH', 'ENDSWITH(text, suffix)', 'text'], ['SPLIT', 'SPLIT(text, separator, index)', 'text'],
        ['TEXT', 'TEXT(x)', 'text'], ['NUMBER', 'NUMBER(text)', 'text'], ['DIGITS', 'DIGITS(text)', 'text'],
        ['REGEXMATCH', 'REGEXMATCH(text, pattern)', 'text'], ['REGEXEXTRACT', 'REGEXEXTRACT(text, pattern)', 'text'],
        ['TODAY', 'TODAY()', 'date'], ['DATE', 'DATE(year, month, day)', 'date'], ['YEAR', 'YEAR(date)', 'date'], ['MONTH', 'MONTH(date)', 'date'],
        ['DAY', 'DAY(date)', 'date'], ['QUARTER', 'QUARTER(date)', 'date'], ['WEEKDAY', 'WEEKDAY(date)', 'date'],
        ['DATEDIF', 'DATEDIF(start, end, "D" | "M" | "Y")', 'date'], ['EDATE', 'EDATE(date, months)', 'date'], ['FORMATDATE', 'FORMATDATE(date, "YYYY-MM")', 'date'],
    ];

    QS.formula = { compile, parse, tokenize, toNum: (v) => { const n = toNum(v); return n === BAD ? null : n; }, toStr, truthy, compare, FUNCTION_DOCS };
})();
