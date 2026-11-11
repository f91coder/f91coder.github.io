/**
 * Quosheets — dados: leitura de valores (numeros BR/US, datas), deteccao de tipos, CSV (encoding e
 * separador automaticos), importacao/exportacao (CSV, TSV, JSON, XLSX, XLS, ODS via SheetJS),
 * perfil estatistico de colunas e planilha de exemplo.
 *
 * Modelo: sheet = { id, name, columns: [{id, name, type, width, fmt?}], rows: [[valor, ...], ...] }
 * Valores: number | string | boolean | null. Datas ficam como texto ISO "YYYY-MM-DD" (ou com hora).
 */
(() => {
    const QS = window.QS;
    const { t } = QS;
    const LOCAL_DECIMAL = QS.lang === 'en' ? '.' : ',';
    const LOCAL_DATE_ORDER = QS.lang === 'en' ? 'mdy' : 'dmy';

    // ── Valores ───────────────────────────────────────────────────────────
    const CURRENCY_RE = /R\$|US\$|U\$S|\$|€|£|¥|￥|₲|\b(?:BRL|USD|EUR|CNY|PYG)\b/gi;

    /** Converte texto em numero. decimal = ',' ou '.' (dica da coluna) ou null para adivinhar. */
    function parseNumber(input, decimal = null) {
        if (typeof input === 'number') return Number.isFinite(input) ? input : null;
        if (input === null || input === undefined || typeof input === 'boolean') return null;
        let s = String(input).trim();
        if (s === '' || s.length > 40) return null;
        let negative = false;
        if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
        s = s.replace(CURRENCY_RE, '').replace(/[\s  ']/g, '');
        if (s.endsWith('-')) { negative = !negative; s = s.slice(0, -1); }
        if (s.startsWith('-')) { negative = !negative; s = s.slice(1); } else if (s.startsWith('+')) { s = s.slice(1); }
        if (!/^\d[\d.,]*(?:[eE][+-]?\d+)?$|^[.,]\d+$/.test(s)) return null;
        const lastDot = s.lastIndexOf('.');
        const lastComma = s.lastIndexOf(',');
        let normalized;
        if (lastDot >= 0 && lastComma >= 0) {
            const dec = lastDot > lastComma ? '.' : ',';
            const thou = dec === '.' ? ',' : '.';
            if (s.indexOf(dec) !== s.lastIndexOf(dec)) return null;
            normalized = s.split(thou).join('').replace(dec, '.');
        } else if (lastComma >= 0) {
            const grouped = /^\d{1,3}(,\d{3})+$/.test(s);
            if (grouped && decimal === '.') normalized = s.split(',').join('');
            else if ((s.match(/,/g) || []).length > 1) normalized = grouped ? s.split(',').join('') : null;
            else normalized = s.replace(',', '.');
        } else if (lastDot >= 0) {
            const grouped = /^\d{1,3}(\.\d{3})+$/.test(s);
            if (grouped && decimal === ',') normalized = s.split('.').join('');
            else if ((s.match(/\./g) || []).length > 1) normalized = grouped ? s.split('.').join('') : null;
            else normalized = s;
        } else {
            normalized = s;
        }
        if (normalized === null) return null;
        const n = Number(normalized);
        if (!Number.isFinite(n)) return null;
        return negative ? -n : n;
    }

    function pad2(n) { return String(n).padStart(2, '0'); }
    function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
    function validYmd(y, m, d) { return y >= 1000 && y <= 9999 && m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m); }
    function isoFromParts(y, m, d, hh, mm, ss) {
        let iso = `${y}-${pad2(m)}-${pad2(d)}`;
        if (hh !== undefined && hh !== null && (Number(hh) || Number(mm) || Number(ss))) {
            iso += `T${pad2(hh)}:${pad2(mm || 0)}${ss ? `:${pad2(ss)}` : ''}`;
        }
        return iso;
    }
    function isoFromDate(date) {
        return isoFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
    }

    /** Converte texto/Date em data ISO. order = 'dmy' | 'mdy' para datas com barra. */
    function parseDate(input, order = LOCAL_DATE_ORDER) {
        if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : isoFromDate(input);
        if (typeof input !== 'string') return null;
        const s = input.trim();
        if (s.length < 6 || s.length > 25) return null;
        let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.exec(s);
        if (m) {
            const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
            return validYmd(y, mo, d) ? isoFromParts(y, mo, d, m[4], m[5], m[6]) : null;
        }
        m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
        if (m) {
            let a = Number(m[1]);
            let b = Number(m[2]);
            let y = Number(m[3]);
            if (m[3].length === 2) y += y < 50 ? 2000 : 1900;
            let d; let mo;
            if (a > 12) { d = a; mo = b; } else if (b > 12) { mo = a; d = b; } else if (order === 'mdy') { mo = a; d = b; } else { d = a; mo = b; }
            return validYmd(y, mo, d) ? isoFromParts(y, mo, d, m[4], m[5], m[6]) : null;
        }
        return null;
    }

    const TRUE_WORDS = new Set(['true', 'verdadeiro', 'verdadero', 'sim', 'yes', 'si', 'sí']);
    const FALSE_WORDS = new Set(['false', 'falso', 'nao', 'não', 'no']);
    function parseBool(input) {
        if (typeof input === 'boolean') return input;
        if (typeof input !== 'string') return null;
        const s = input.trim().toLowerCase();
        if (TRUE_WORDS.has(s)) return true;
        if (FALSE_WORDS.has(s)) return false;
        return null;
    }

    const BOOL_LABEL = { pt: ['VERDADEIRO', 'FALSO'], en: ['TRUE', 'FALSE'], es: ['VERDADERO', 'FALSO'] }[QS.lang];

    /** Texto exibido na grade. */
    function display(value, column) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') {
            if (column && column.fmt === 'percent') return `${QS.fmt.number(value * 100, 2)}%`;
            return Number.isInteger(value) ? QS.fmt.number(value, 0) : QS.fmt.number(value, 6);
        }
        if (typeof value === 'boolean') return value ? BOOL_LABEL[0] : BOOL_LABEL[1];
        if (column && column.type === 'date') return QS.fmt.date(value);
        return String(value);
    }

    /** Texto colocado no editor da celula (sem separador de milhar, para editar facil). */
    function editText(value, column) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') {
            const v = column && column.fmt === 'percent' ? value * 100 : value;
            const s = String(Math.round(v * 1e10) / 1e10);
            return (LOCAL_DECIMAL === ',' ? s.replace('.', ',') : s) + (column && column.fmt === 'percent' ? '%' : '');
        }
        if (typeof value === 'boolean') return value ? BOOL_LABEL[0] : BOOL_LABEL[1];
        if (column && column.type === 'date') return QS.fmt.date(value);
        return String(value);
    }

    /** Valor digitado pelo usuario -> valor tipado conforme a coluna. */
    function coerce(text, column) {
        if (text === null || text === undefined) return null;
        const s = String(text);
        if (s.trim() === '') return null;
        if (!column) return s;
        if (column.type === 'number') {
            if (column.fmt === 'percent' && /%\s*$/.test(s)) {
                const n = parseNumber(s.replace('%', ''), LOCAL_DECIMAL);
                return n === null ? s : n / 100;
            }
            const n = parseNumber(s, LOCAL_DECIMAL);
            return n === null ? s : (column.fmt === 'percent' ? n / 100 : n);
        }
        if (column.type === 'date') return parseDate(s, LOCAL_DATE_ORDER) || s;
        if (column.type === 'bool') { const b = parseBool(s); return b === null ? s : b; }
        return s;
    }

    function isBlank(v) { return v === null || v === undefined || v === ''; }

    // ── Deteccao de tipos ─────────────────────────────────────────────────
    /** Decide o tipo de uma coluna a partir dos valores brutos (texto, numero, Date, boolean). */
    function inferColumn(values) {
        const sample = [];
        for (let i = 0; i < values.length && sample.length < 3000; i += 1) {
            const v = values[i];
            if (!isBlank(v) && !(typeof v === 'string' && v.trim() === '')) sample.push(v);
        }
        if (!sample.length) return { type: 'text' };
        let nums = 0; let dates = 0; let bools = 0; let percents = 0;
        let commaDec = 0; let dotDec = 0; let firstGt12 = 0; let secondGt12 = 0; let zeroLead = 0;
        for (const v of sample) {
            if (typeof v === 'number') { nums += 1; continue; }
            if (typeof v === 'boolean') { bools += 1; continue; }
            if (v instanceof Date) { dates += 1; continue; }
            const s = String(v).trim();
            if (/^0\d+$/.test(s)) zeroLead += 1; // codigos com zero a esquerda (CEP, telefone) ficam texto
            if (/^[-+(]?[\d.,\s]+%$/.test(s)) percents += 1;
            if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$|^-?\d+,\d+$/.test(s.replace(CURRENCY_RE, '').trim())) commaDec += 1;
            if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$|^-?\d+\.\d+$/.test(s.replace(CURRENCY_RE, '').trim())) dotDec += 1;
            const dm = /^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/.exec(s);
            if (dm) { if (Number(dm[1]) > 12) firstGt12 += 1; if (Number(dm[2]) > 12) secondGt12 += 1; }
        }
        const total = sample.length;
        if (bools / total >= 0.97) return { type: 'bool' };
        if (dates / total >= 0.97) return { type: 'date', order: LOCAL_DATE_ORDER };
        const decimal = commaDec > dotDec ? ',' : (dotDec > commaDec ? '.' : LOCAL_DECIMAL);
        if (percents / total >= 0.97) return { type: 'number', decimal, fmt: 'percent' };
        if (zeroLead / total > 0.05) return { type: 'text' };
        for (const v of sample) {
            if (typeof v === 'string' && parseNumber(v, decimal) !== null) nums += 1;
        }
        if (nums / total >= 0.97) return { type: 'number', decimal };
        const order = firstGt12 > 0 ? 'dmy' : (secondGt12 > 0 ? 'mdy' : LOCAL_DATE_ORDER);
        for (const v of sample) {
            if (typeof v === 'string' && parseDate(v, order)) dates += 1;
        }
        if (dates / total >= 0.97) return { type: 'date', order };
        return { type: 'text' };
    }

    function convertValue(v, info) {
        if (v === null || v === undefined) return null;
        if (typeof v === 'string') {
            v = v.replace(/\r/g, '');
            if (v.trim() === '') return null;
        }
        switch (info.type) {
            case 'number': {
                if (info.fmt === 'percent' && typeof v === 'string' && /%\s*$/.test(v)) {
                    const n = parseNumber(v.replace('%', ''), info.decimal);
                    return n === null ? v : n / 100;
                }
                const n = parseNumber(v, info.decimal);
                return n === null ? v : n;
            }
            case 'date':
                if (v instanceof Date) return isoFromDate(v);
                return parseDate(String(v), info.order) || v;
            case 'bool': { const b = parseBool(v); return b === null ? v : b; }
            default:
                if (v instanceof Date) return isoFromDate(v);
                if (typeof v === 'number' || typeof v === 'boolean') return v;
                return String(v);
        }
    }

    // ── Construcao de abas ────────────────────────────────────────────────
    function uniqueName(existing, base) {
        const used = new Set(existing.map((n) => String(n).toLowerCase()));
        let name = String(base || '').trim() || t('data.column');
        if (!used.has(name.toLowerCase())) return name;
        let i = 2;
        while (used.has(`${name} (${i})`.toLowerCase())) i += 1;
        return `${name} (${i})`;
    }
    function colLetter(index) {
        let s = '';
        let n = index + 1;
        while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
        return s;
    }
    function defaultWidth(type, name) {
        const base = type === 'number' ? 120 : type === 'date' ? 120 : type === 'bool' ? 100 : 170;
        return QS.clamp(Math.max(base, String(name).length * 8 + 44), 80, 320);
    }

    /** A primeira linha e cabecalho? */
    function looksLikeHeader(aoa) {
        if (aoa.length < 2) return true;
        const first = aoa[0].filter((v) => !isBlank(v));
        if (!first.length) return false;
        // Cabecalho = so textos (nem numero, nem data). Nomes repetidos sao comuns e ficam "Nome (2)".
        return first.every((v) => typeof v === 'string' && parseNumber(v) === null && !parseDate(v));
    }

    /**
     * Monta uma aba a partir de uma matriz (array de arrays).
     * opts.header: true | false | 'auto'
     */
    function buildSheet(name, aoa, opts = {}) {
        let rows = aoa.map((r) => (Array.isArray(r) ? r : []));
        // remove linhas totalmente vazias do fim e colunas vazias a direita
        while (rows.length && rows[rows.length - 1].every(isBlankCell)) rows.pop();
        let width = 0;
        rows.forEach((r) => {
            for (let i = r.length - 1; i >= 0; i -= 1) { if (!isBlankCell(r[i])) { width = Math.max(width, i + 1); break; } }
        });
        const useHeader = opts.header === 'auto' || opts.header === undefined ? looksLikeHeader(rows) : !!opts.header;
        const headerRow = useHeader ? (rows.shift() || []) : [];
        width = Math.max(width, headerRow.length);
        if (width === 0) width = 1;

        const names = [];
        for (let c = 0; c < width; c += 1) {
            const raw = headerRow[c];
            const base = isBlank(raw) ? t('data.column_n', { n: colLetter(c) }) : String(raw instanceof Date ? isoFromDate(raw) : raw).trim().slice(0, 120);
            names.push(uniqueName(names, base));
        }
        const columns = names.map((n) => ({ id: QS.uid('c'), name: n, type: 'text', width: 160 }));
        const out = new Array(rows.length);
        for (let r = 0; r < rows.length; r += 1) {
            const src = rows[r];
            const row = new Array(width);
            for (let c = 0; c < width; c += 1) row[c] = src[c] === undefined ? null : src[c];
            out[r] = row;
        }
        for (let c = 0; c < width; c += 1) {
            const info = inferColumn(out.map((row) => row[c]));
            const col = columns[c];
            col.type = info.type;
            if (info.fmt) col.fmt = info.fmt;
            for (let r = 0; r < out.length; r += 1) out[r][c] = convertValue(out[r][c], info);
            col.width = defaultWidth(col.type, col.name);
        }
        return { id: QS.uid('s'), name: String(name || t('data.sheet')).slice(0, 60), columns, rows: out };
    }
    function isBlankCell(v) { return v === null || v === undefined || (typeof v === 'string' && v.trim() === ''); }

    function emptySheet(name, cols = 6, rows = 30) {
        const columns = [];
        for (let c = 0; c < cols; c += 1) columns.push({ id: QS.uid('c'), name: t('data.column_n', { n: colLetter(c) }), type: 'text', width: 150 });
        const data = [];
        for (let r = 0; r < rows; r += 1) data.push(new Array(cols).fill(null));
        return { id: QS.uid('s'), name: name || t('data.sheet_n', { n: 1 }), columns, rows: data };
    }

    // ── CSV ───────────────────────────────────────────────────────────────
    function decodeBuffer(buffer) {
        const bytes = new Uint8Array(buffer);
        if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return { text: new TextDecoder('utf-8').decode(bytes.subarray(3)), encoding: 'UTF-8 (BOM)' };
        if (bytes[0] === 0xff && bytes[1] === 0xfe) return { text: new TextDecoder('utf-16le').decode(bytes.subarray(2)), encoding: 'UTF-16' };
        if (bytes[0] === 0xfe && bytes[1] === 0xff) return { text: new TextDecoder('utf-16be').decode(bytes.subarray(2)), encoding: 'UTF-16' };
        try {
            return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'UTF-8' };
        } catch (e) {
            // Arquivos exportados pelo Excel em PT/ES costumam vir em Windows-1252 ("acentos quebrados").
            return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'Windows-1252' };
        }
    }

    function sniffDelimiter(text) {
        const candidates = [',', ';', '\t', '|'];
        const lines = [];
        let start = 0;
        let inQuotes = false;
        for (let i = 0; i < text.length && lines.length < 40; i += 1) {
            const ch = text[i];
            if (ch === '"') inQuotes = !inQuotes;
            else if (ch === '\n' && !inQuotes) { lines.push(text.slice(start, i)); start = i + 1; }
        }
        if (lines.length < 40 && start < text.length) lines.push(text.slice(start));
        const sampleLines = lines.filter((l) => l.trim() !== '').slice(0, 30);
        let best = ',';
        let bestScore = -1;
        for (const d of candidates) {
            const counts = sampleLines.map((line) => {
                let n = 0; let q = false;
                for (const ch of line) { if (ch === '"') q = !q; else if (ch === d && !q) n += 1; }
                return n;
            });
            if (!counts.length || Math.max(...counts) === 0) continue;
            const freq = new Map();
            counts.forEach((n) => freq.set(n, (freq.get(n) || 0) + 1));
            let mode = 0; let modeFreq = 0;
            freq.forEach((f, n) => { if (n > 0 && f > modeFreq) { mode = n; modeFreq = f; } });
            const score = (modeFreq / counts.length) * 100 + Math.min(mode, 50);
            if (score > bestScore) { bestScore = score; best = d; }
        }
        return best;
    }

    /** CSV RFC 4180: aspas, aspas duplicadas, quebras de linha dentro de aspas, \r\n. */
    function parseCSV(text, delimiter) {
        const rows = [];
        let row = [];
        let field = '';
        let i = 0;
        const n = text.length;
        let inQuotes = false;
        while (i < n) {
            const ch = text.charCodeAt(i);
            if (inQuotes) {
                if (ch === 34) {
                    if (text.charCodeAt(i + 1) === 34) { field += '"'; i += 2; continue; }
                    inQuotes = false; i += 1; continue;
                }
                const next = text.indexOf('"', i);
                if (next === -1) { field += text.slice(i); i = n; continue; }
                field += text.slice(i, next);
                i = next;
                continue;
            }
            if (ch === 34 && field === '') { inQuotes = true; i += 1; continue; }
            if (text[i] === delimiter) { row.push(field); field = ''; i += 1; continue; }
            if (ch === 10 || ch === 13) {
                row.push(field); field = '';
                rows.push(row); row = [];
                if (ch === 13 && text.charCodeAt(i + 1) === 10) i += 1;
                i += 1;
                continue;
            }
            field += text[i];
            i += 1;
        }
        if (field !== '' || row.length) { row.push(field); rows.push(row); }
        return rows;
    }

    function csvField(value, delimiter) {
        const s = value === null || value === undefined ? '' : String(value);
        if (s === '') return '';
        if (s.includes(delimiter) || /["\r\n]/.test(s) || /^\s|\s$/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
    }

    // ── Importacao ────────────────────────────────────────────────────────
    const SHEETJS_EXT = ['xlsx', 'xlsm', 'xlsb', 'xls', 'ods', 'fods', 'numbers'];

    function fileExt(name) { return (String(name).split('.').pop() || '').toLowerCase(); }

    async function importFile(file) {
        const ext = fileExt(file.name);
        const buffer = await file.arrayBuffer();
        const baseName = file.name.replace(/\.[^.]+$/, '') || file.name;
        if (SHEETJS_EXT.includes(ext)) {
            if (!window.XLSX) throw new Error(t('data.err_library'));
            const wb = window.XLSX.read(buffer, { type: 'array', cellDates: true, dense: true });
            const sheets = [];
            wb.SheetNames.forEach((name) => {
                const ws = wb.Sheets[name];
                const aoa = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: false });
                if (aoa.length) sheets.push(buildSheet(name, aoa, { header: 'auto' }));
            });
            if (!sheets.length) throw new Error(t('data.err_empty'));
            return { name: baseName, sheets, meta: { source: file.name, format: ext.toUpperCase() } };
        }
        if (ext === 'json') {
            const { text } = decodeBuffer(buffer);
            let data;
            try { data = JSON.parse(text); } catch (e) { throw new Error(t('data.err_json')); }
            if (data && !Array.isArray(data)) {
                const firstArray = Object.values(data).find(Array.isArray);
                data = firstArray || [data];
            }
            if (!Array.isArray(data) || !data.length) throw new Error(t('data.err_empty'));
            let aoa;
            if (Array.isArray(data[0])) aoa = data;
            else {
                const keys = [];
                data.forEach((obj) => { if (obj && typeof obj === 'object') Object.keys(obj).forEach((k) => { if (!keys.includes(k)) keys.push(k); }); });
                aoa = [keys].concat(data.map((obj) => keys.map((k) => {
                    const v = obj ? obj[k] : null;
                    return v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
                })));
            }
            return { name: baseName, sheets: [buildSheet(baseName, aoa, { header: Array.isArray(data[0]) ? 'auto' : true })], meta: { source: file.name, format: 'JSON' } };
        }
        // CSV / TSV / TXT
        const { text, encoding } = decodeBuffer(buffer);
        const delimiter = ext === 'tsv' ? '\t' : sniffDelimiter(text);
        const aoa = parseCSV(text, delimiter);
        if (!aoa.length) throw new Error(t('data.err_empty'));
        const sheet = buildSheet(baseName, aoa, { header: 'auto' });
        return { name: baseName, sheets: [sheet], meta: { source: file.name, format: ext === 'tsv' ? 'TSV' : 'CSV', encoding, delimiter } };
    }

    // ── Exportacao ────────────────────────────────────────────────────────
    function exportValue(value, column, opts) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') {
            let s = String(value);
            if (/e/i.test(s)) s = value.toFixed(10).replace(/\.?0+$/, '');
            return opts.decimal === ',' ? s.replace('.', ',') : s;
        }
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        if (column && column.type === 'date' && opts.localDates) return QS.fmt.date(value);
        return String(value);
    }

    /** rowsIndex: indices das linhas a exportar (null = todas). */
    function toCSV(sheet, opts = {}, rowsIndex = null) {
        const delimiter = opts.delimiter || ',';
        const lines = [sheet.columns.map((c) => csvField(c.name, delimiter)).join(delimiter)];
        const indices = rowsIndex || sheet.rows.map((_, i) => i);
        for (const r of indices) {
            const row = sheet.rows[r];
            lines.push(sheet.columns.map((c, ci) => csvField(exportValue(row[ci], c, opts), delimiter)).join(delimiter));
        }
        return (opts.bom ? '﻿' : '') + lines.join('\r\n') + '\r\n';
    }

    function toJSON(sheet, rowsIndex = null) {
        const indices = rowsIndex || sheet.rows.map((_, i) => i);
        return JSON.stringify(indices.map((r) => {
            const obj = {};
            sheet.columns.forEach((c, ci) => { obj[c.name] = sheet.rows[r][ci] === undefined ? null : sheet.rows[r][ci]; });
            return obj;
        }), null, 2);
    }

    function sheetToWorksheet(sheet, rowsIndex = null) {
        const XLSX = window.XLSX;
        const indices = rowsIndex || sheet.rows.map((_, i) => i);
        const aoa = [sheet.columns.map((c) => c.name)];
        for (const r of indices) {
            aoa.push(sheet.columns.map((c, ci) => {
                const v = sheet.rows[r][ci];
                if (c.type === 'date' && typeof v === 'string') {
                    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(v);
                    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
                }
                return v === undefined ? null : v;
            }));
        }
        const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: 'yyyy-mm-dd' });
        ws['!cols'] = sheet.columns.map((c) => ({ wch: Math.max(8, Math.min(60, Math.round((c.width || 150) / 7))) }));
        sheet.columns.forEach((c, ci) => {
            if (c.fmt !== 'percent' && c.type !== 'date') return;
            const fmt = c.fmt === 'percent' ? '0.00%' : 'yyyy-mm-dd';
            for (let r = 1; r <= indices.length; r += 1) {
                const cell = ws[XLSX.utils.encode_cell({ r, c: ci })];
                if (cell && (cell.t === 'n' || cell.t === 'd')) cell.z = fmt;
            }
        });
        return ws;
    }

    function toXLSX(sheets, rowsIndexBySheet = {}) {
        const XLSX = window.XLSX;
        if (!XLSX) throw new Error(t('data.err_library'));
        const wb = XLSX.utils.book_new();
        const used = [];
        sheets.forEach((sheet) => {
            const name = uniqueName(used, sheet.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet').slice(0, 31);
            used.push(name);
            XLSX.utils.book_append_sheet(wb, sheetToWorksheet(sheet, rowsIndexBySheet[sheet.id] || null), name);
        });
        const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true });
        return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }

    // ── Perfil estatistico ────────────────────────────────────────────────
    /** rowsIndex: subconjunto de linhas (null = todas). */
    function profileColumn(sheet, ci, rowsIndex = null, topN = 12) {
        const col = sheet.columns[ci];
        const indices = rowsIndex || null;
        const total = indices ? indices.length : sheet.rows.length;
        const counts = new Map();
        let filled = 0;
        const nums = [];
        let minS = null; let maxS = null;
        let lenSum = 0;
        for (let k = 0; k < total; k += 1) {
            const v = sheet.rows[indices ? indices[k] : k][ci];
            if (isBlank(v)) continue;
            filled += 1;
            const key = typeof v === 'string' ? v : String(v);
            if (counts.size < 200000 || counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1);
            if (typeof v === 'number') nums.push(v);
            else if (typeof v === 'string') {
                lenSum += v.length;
                if (col.type === 'date') { if (minS === null || v < minS) minS = v; if (maxS === null || v > maxS) maxS = v; }
            }
        }
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN);
        const profile = { name: col.name, type: col.type, rows: total, filled, empty: total - filled, distinct: counts.size, top };
        if (nums.length && (col.type === 'number' || nums.length / Math.max(1, filled) > 0.5)) {
            nums.sort((a, b) => a - b);
            const sum = nums.reduce((s, v) => s + v, 0);
            const mean = sum / nums.length;
            const mid = Math.floor(nums.length / 2);
            const median = nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
            let variance = 0;
            for (const v of nums) variance += (v - mean) ** 2;
            Object.assign(profile, {
                numeric: nums.length,
                min: nums[0],
                max: nums[nums.length - 1],
                sum: round6(sum),
                mean: round6(mean),
                median: round6(median),
                std: round6(Math.sqrt(variance / nums.length)),
                histogram: histogram(nums, 12),
            });
        }
        if (col.type === 'date' && minS) Object.assign(profile, { min: minS, max: maxS });
        if (col.type === 'text' && filled) profile.avgLength = Math.round(lenSum / filled);
        return profile;
    }
    function round6(v) { return Math.round(v * 1e6) / 1e6; }
    function histogram(sorted, bins) {
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        if (min === max) return [{ from: min, to: max, count: sorted.length }];
        const step = (max - min) / bins;
        const out = Array.from({ length: bins }, (_, i) => ({ from: min + i * step, to: min + (i + 1) * step, count: 0 }));
        for (const v of sorted) out[Math.min(bins - 1, Math.floor((v - min) / step))].count += 1;
        return out;
    }

    /** Linhas duplicadas e vazias (para insights e limpeza). */
    function qualityCounts(sheet) {
        const seen = new Set();
        let duplicates = 0;
        let emptyRows = 0;
        for (const row of sheet.rows) {
            if (row.every(isBlank)) { emptyRows += 1; continue; }
            const key = JSON.stringify(row);
            if (seen.has(key)) duplicates += 1; else seen.add(key);
        }
        return { duplicates, emptyRows };
    }

    // ── Planilha de exemplo ───────────────────────────────────────────────
    function mulberry32(seed) {
        return () => {
            seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
            let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
            return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
        };
    }

    const SAMPLE = {
        pt: {
            cities: [['São Paulo', 'SP', 'Sudeste'], ['Rio de Janeiro', 'RJ', 'Sudeste'], ['Belo Horizonte', 'MG', 'Sudeste'], ['Curitiba', 'PR', 'Sul'], ['Porto Alegre', 'RS', 'Sul'], ['Florianópolis', 'SC', 'Sul'], ['Salvador', 'BA', 'Nordeste'], ['Recife', 'PE', 'Nordeste'], ['Fortaleza', 'CE', 'Nordeste'], ['Brasília', 'DF', 'Centro-Oeste'], ['Goiânia', 'GO', 'Centro-Oeste'], ['Manaus', 'AM', 'Norte']],
            messy: { 'São Paulo': ['sao paulo', 'São paulo ', 'SÃO PAULO'], 'Rio de Janeiro': ['rio de janeiro', 'Rio De Janeiro'] },
            names: ['Ana Souza', 'Bruno Lima', 'Carla Mendes', 'Diego Rocha', 'Eduarda Alves', 'Felipe Costa', 'Gabriela Nunes', 'Henrique Dias', 'Isabela Martins', 'João Pereira', 'Larissa Gomes', 'Marcos Ribeiro', 'Natália Freitas', 'Otávio Barros', 'Paula Teixeira', 'Rafael Moreira'],
            sellers: ['Equipe Online', 'Loja Centro', 'Loja Shopping', 'Representante'],
            status: ['Pago', 'Pago', 'Pago', 'Pago', 'Pendente', 'Cancelado'],
            products: [['Notebook Pro 14', 'Eletrônicos', 4899], ['Fone Bluetooth', 'Eletrônicos', 299], ['Monitor 27"', 'Eletrônicos', 1599], ['Cadeira Ergonômica', 'Móveis', 1299], ['Mesa de Escritório', 'Móveis', 899], ['Cafeteira Expresso', 'Casa', 649], ['Liquidificador', 'Casa', 239], ['Tênis de Corrida', 'Esporte', 459], ['Mochila Executiva', 'Acessórios', 279], ['Relógio Smart', 'Eletrônicos', 1199], ['Garrafa Térmica', 'Casa', 89], ['Kit Halteres', 'Esporte', 349]],
            reviews: ['Entrega super rápida, recomendo!', 'Produto excelente, superou minhas expectativas.', 'Chegou com a caixa amassada, mas funciona.', 'Atendimento péssimo, demoraram para responder.', 'Bom custo-benefício.', 'Produto veio com defeito, quero trocar.', 'Tudo certo, dentro do prazo.', 'Qualidade mediana pelo preço.', 'Amei! Comprarei novamente.', 'Não recebi a nota fiscal ainda.', 'Ótimo acabamento e muito confortável.', 'Demorou demais para chegar.', null, null],
            cols: ['Data', 'Pedido', 'Cliente', 'E-mail', 'Cidade', 'UF', 'Região', 'Categoria', 'Produto', 'Quantidade', 'Preço unitário', 'Total', 'Status', 'Canal', 'Avaliação do cliente'],
            sheet: 'Vendas', file: 'Exemplo — Vendas 2025', domain: 'exemplo.com.br',
        },
        en: {
            cities: [['New York', 'NY', 'Northeast'], ['Boston', 'MA', 'Northeast'], ['Philadelphia', 'PA', 'Northeast'], ['Chicago', 'IL', 'Midwest'], ['Detroit', 'MI', 'Midwest'], ['Minneapolis', 'MN', 'Midwest'], ['Atlanta', 'GA', 'South'], ['Miami', 'FL', 'South'], ['Dallas', 'TX', 'South'], ['Los Angeles', 'CA', 'West'], ['Seattle', 'WA', 'West'], ['Denver', 'CO', 'West']],
            messy: { 'New York': ['new york', 'New york ', 'NEW YORK'], 'Los Angeles': ['los angeles', 'Los angeles'] },
            names: ['Emma Johnson', 'Liam Smith', 'Olivia Brown', 'Noah Davis', 'Ava Wilson', 'Ethan Miller', 'Sophia Moore', 'Mason Taylor', 'Isabella Anderson', 'Lucas Thomas', 'Mia Jackson', 'Logan White', 'Amelia Harris', 'James Martin', 'Harper Thompson', 'Benjamin Garcia'],
            sellers: ['Online Store', 'Downtown Store', 'Mall Store', 'Sales Rep'],
            status: ['Paid', 'Paid', 'Paid', 'Paid', 'Pending', 'Canceled'],
            products: [['Laptop Pro 14', 'Electronics', 1299], ['Bluetooth Headphones', 'Electronics', 89], ['27" Monitor', 'Electronics', 329], ['Ergonomic Chair', 'Furniture', 279], ['Office Desk', 'Furniture', 219], ['Espresso Machine', 'Home', 149], ['Blender', 'Home', 59], ['Running Shoes', 'Sports', 119], ['Laptop Backpack', 'Accessories', 69], ['Smart Watch', 'Electronics', 249], ['Water Bottle', 'Home', 24], ['Dumbbell Set', 'Sports', 89]],
            reviews: ['Super fast delivery, highly recommend!', 'Excellent product, exceeded my expectations.', 'Box arrived damaged, but it works.', 'Terrible support, took days to answer.', 'Good value for money.', 'Item arrived defective, I want a replacement.', 'All good, on time.', 'Average quality for the price.', 'Love it! Will buy again.', 'Still waiting for my invoice.', 'Great finish and very comfortable.', 'Took way too long to arrive.', null, null],
            cols: ['Date', 'Order', 'Customer', 'Email', 'City', 'State', 'Region', 'Category', 'Product', 'Quantity', 'Unit price', 'Total', 'Status', 'Channel', 'Customer review'],
            sheet: 'Sales', file: 'Sample — Sales 2025', domain: 'example.com',
        },
        es: {
            cities: [['Madrid', 'MD', 'Centro'], ['Toledo', 'CM', 'Centro'], ['Barcelona', 'CT', 'Este'], ['Valencia', 'VC', 'Este'], ['Sevilla', 'AN', 'Sur'], ['Málaga', 'AN', 'Sur'], ['Granada', 'AN', 'Sur'], ['Bilbao', 'PV', 'Norte'], ['Santander', 'CB', 'Norte'], ['Zaragoza', 'AR', 'Norte'], ['Vigo', 'GA', 'Noroeste'], ['A Coruña', 'GA', 'Noroeste']],
            messy: { Madrid: ['madrid', 'Madrid ', 'MADRID'], Barcelona: ['barcelona', 'BarceLona'] },
            names: ['Lucía García', 'Hugo Martínez', 'Martina López', 'Pablo Sánchez', 'Sofía Pérez', 'Mateo Gómez', 'Valeria Díaz', 'Daniel Torres', 'Paula Ruiz', 'Alejandro Romero', 'Elena Navarro', 'Javier Moreno', 'Carmen Molina', 'Diego Ortega', 'Laura Castro', 'Sergio Rubio'],
            sellers: ['Tienda Online', 'Tienda Centro', 'Tienda Centro Comercial', 'Representante'],
            status: ['Pagado', 'Pagado', 'Pagado', 'Pagado', 'Pendiente', 'Cancelado'],
            products: [['Portátil Pro 14', 'Electrónica', 1199], ['Auriculares Bluetooth', 'Electrónica', 79], ['Monitor 27"', 'Electrónica', 299], ['Silla Ergonómica', 'Muebles', 259], ['Escritorio', 'Muebles', 199], ['Cafetera Espresso', 'Hogar', 139], ['Batidora', 'Hogar', 49], ['Zapatillas de Running', 'Deporte', 99], ['Mochila Ejecutiva', 'Accesorios', 59], ['Reloj Inteligente', 'Electrónica', 229], ['Botella Térmica', 'Hogar', 19], ['Set de Mancuernas', 'Deporte', 79]],
            reviews: ['¡Entrega rapidísima, lo recomiendo!', 'Producto excelente, superó mis expectativas.', 'La caja llegó dañada, pero funciona.', 'Atención pésima, tardaron días en responder.', 'Buena relación calidad-precio.', 'El producto llegó defectuoso, quiero cambiarlo.', 'Todo bien, dentro del plazo.', 'Calidad regular para el precio.', '¡Me encanta! Volveré a comprar.', 'Todavía no recibí la factura.', 'Gran acabado y muy cómodo.', 'Tardó demasiado en llegar.', null, null],
            cols: ['Fecha', 'Pedido', 'Cliente', 'Correo', 'Ciudad', 'Provincia', 'Región', 'Categoría', 'Producto', 'Cantidad', 'Precio unitario', 'Total', 'Estado', 'Canal', 'Opinión del cliente'],
            sheet: 'Ventas', file: 'Ejemplo — Ventas 2025', domain: 'ejemplo.es',
        },
    };

    function sampleWorkbook(count = 640) {
        const L = SAMPLE[QS.lang];
        const rand = mulberry32(2025);
        const pick = (arr) => arr[Math.floor(rand() * arr.length)];
        const rows = [];
        for (let i = 0; i < count; i += 1) {
            const month = 1 + Math.floor(rand() * 12);
            const day = 1 + Math.floor(rand() * daysInMonth(2025, month));
            const [city, uf, region] = pick(L.cities);
            const [product, category, price] = pick(L.products);
            const qty = 1 + Math.floor(rand() * rand() * 6);
            const unit = Math.round(price * (0.9 + rand() * 0.2) * 100) / 100;
            const name = pick(L.names);
            const status = pick(L.status);
            const messyCity = L.messy[city] && rand() < 0.12 ? pick(L.messy[city]) : city;
            const email = rand() < 0.94 ? `${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.')}@${L.domain}` : null;
            rows.push([
                isoFromParts(2025, month, day), `#${String(10001 + i)}`, rand() < 0.04 ? ` ${name} ` : name, email,
                messyCity, uf, region, category, product, qty, unit, Math.round(qty * unit * 100) / 100, status,
                pick(L.sellers), rand() < 0.55 ? pick(L.reviews) : null,
            ]);
        }
        rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
        rows.splice(120, 0, rows[119].slice());
        rows.splice(301, 0, rows[300].slice());
        const types = ['date', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'number', 'number', 'number', 'text', 'text', 'text'];
        const sheet = {
            id: QS.uid('s'),
            name: L.sheet,
            columns: L.cols.map((name, ci) => ({ id: QS.uid('c'), name, type: types[ci], width: defaultWidth(types[ci], name) })),
            rows,
        };
        sheet.columns[14].width = 300;
        return { name: L.file, sheets: [sheet], meta: { source: 'sample', format: 'Quosheets' } };
    }

    QS.val = { parseNumber, parseDate, parseBool, isoFromParts, isoFromDate, isBlank, display, editText, coerce, LOCAL_DECIMAL, LOCAL_DATE_ORDER, daysInMonth };
    QS.data = {
        inferColumn, convertValue, buildSheet, emptySheet, uniqueName, colLetter, defaultWidth,
        decodeBuffer, sniffDelimiter, parseCSV, importFile, toCSV, toJSON, toXLSX,
        profileColumn, qualityCounts, sampleWorkbook, fileExt,
    };
})();
