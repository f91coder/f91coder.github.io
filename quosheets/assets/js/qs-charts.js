/**
 * Quosheets — graficos (Chart.js 4, hospedado localmente).
 * spec = { id, sheetId, title, type, x: colId, ys: [{colId, agg}], series: colId|null,
 *          bucket: 'day'|'month'|'quarter'|'year'|null, sort: 'x'|'desc'|'asc', top: n|null, filtered: bool }
 */
(() => {
    const QS = window.QS;
    const { t } = QS;
    const PALETTE = ['#7ab033', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899', '#64748b', '#84cc16', '#f97316', '#06b6d4', '#a855f7'];
    const TYPES = ['bar', 'hbar', 'line', 'area', 'pie', 'doughnut', 'scatter'];
    const AGGS = ['sum', 'avg', 'count', 'min', 'max', 'median', 'count_distinct'];

    function bucketKey(value, bucket) {
        if (typeof value !== 'string') return value;
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
        if (!m) return value;
        if (bucket === 'year') return m[1];
        if (bucket === 'quarter') return `${m[1]}-T${Math.ceil(Number(m[2]) / 3)}`;
        if (bucket === 'month') return `${m[1]}-${m[2]}`;
        return `${m[1]}-${m[2]}-${m[3]}`;
    }
    function bucketLabel(key, bucket) {
        if (typeof key !== 'string') return QS.val.display(key, { type: typeof key === 'number' ? 'number' : 'text' });
        if (bucket === 'month' && /^\d{4}-\d{2}$/.test(key)) {
            const [y, m] = key.split('-').map(Number);
            return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(QS.LOCALE, { month: 'short', year: 'numeric', timeZone: 'UTC' });
        }
        if (bucket === 'quarter') return key.replace('-T', ' T');
        if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return QS.fmt.date(key);
        return key;
    }

    /** Monta labels/datasets a partir da aba (linhas = indices visiveis ou todas). */
    function buildData(sheet, rowsIndex, spec) {
        const idx = (id) => sheet.columns.findIndex((c) => c.id === id);
        const xi = idx(spec.x);
        if (xi < 0) return { error: t('chart.err_no_x') };
        const indices = rowsIndex || sheet.rows.map((_, i) => i);
        const xCol = sheet.columns[xi];

        if (spec.type === 'scatter') {
            const y = spec.ys[0] && idx(spec.ys[0].colId);
            if (y === undefined || y < 0) return { error: t('chart.err_no_y') };
            const points = [];
            const step = Math.max(1, Math.floor(indices.length / 5000));
            for (let k = 0; k < indices.length; k += step) {
                const row = sheet.rows[indices[k]];
                const xv = QS.formula.toNum(row[xi]);
                const yv = QS.formula.toNum(row[y]);
                if (xv !== null && yv !== null && !QS.val.isBlank(row[xi]) && !QS.val.isBlank(row[y])) points.push({ x: xv, y: yv });
            }
            return { scatter: true, datasets: [{ label: `${sheet.columns[y].name} × ${xCol.name}`, data: points }], xLabel: xCol.name, yLabel: sheet.columns[y].name };
        }

        const bucket = xCol.type === 'date' ? (spec.bucket || 'month') : null;
        const ys = (spec.ys && spec.ys.length ? spec.ys : [{ colId: spec.x, agg: 'count' }])
            .map((y) => ({ ...y, index: idx(y.colId) })).filter((y) => y.index >= 0 || y.agg === 'count');
        if (!ys.length) return { error: t('chart.err_no_y') };
        const si = spec.series ? idx(spec.series) : -1;

        // agrupa: chave x -> (serie ->) valores
        const groups = new Map();
        const seriesTotals = new Map();
        for (const r of indices) {
            const row = sheet.rows[r];
            const raw = row[xi];
            const key = QS.val.isBlank(raw) ? t('pivot.blank') : bucketKey(raw, bucket);
            let g = groups.get(key);
            if (!g) { g = { rows: [], bySeries: new Map() }; groups.set(key, g); }
            g.rows.push(row);
            if (si >= 0) {
                const sv = QS.val.isBlank(row[si]) ? t('pivot.blank') : String(row[si]);
                if (!g.bySeries.has(sv)) g.bySeries.set(sv, []);
                g.bySeries.get(sv).push(row);
                seriesTotals.set(sv, (seriesTotals.get(sv) || 0) + 1);
            }
        }
        const agg = (rows, y) => (y.agg === 'count' && (y.index < 0 || y.colId === spec.x) ? rows.length : QS.ops.aggregate(y.agg, rows.map((row) => row[y.index])));
        let keys = [...groups.keys()];
        const firstValue = (k) => agg(groups.get(k).rows, ys[0]) || 0;
        if (spec.sort === 'desc') keys.sort((a, b) => firstValue(b) - firstValue(a));
        else if (spec.sort === 'asc') keys.sort((a, b) => firstValue(a) - firstValue(b));
        else keys.sort((a, b) => QS.formula.compare(a, b));
        const limit = spec.top || (spec.type === 'pie' || spec.type === 'doughnut' ? 12 : 200);
        const truncated = keys.length > limit;
        keys = keys.slice(0, limit);

        const labels = keys.map((k) => bucketLabel(k, bucket));
        let datasets;
        if (si >= 0) {
            const seriesNames = [...seriesTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map((e) => e[0]);
            datasets = seriesNames.map((name) => ({ label: name, data: keys.map((k) => { const rows = groups.get(k).bySeries.get(name); return rows ? agg(rows, ys[0]) : 0; }) }));
        } else {
            datasets = ys.map((y) => ({
                label: y.agg === 'count' && (y.index < 0 || y.colId === spec.x) ? t('pivot.count') : `${t(`agg.${y.agg}`)} · ${sheet.columns[y.index].name}`,
                data: keys.map((k) => agg(groups.get(k).rows, y)),
            }));
        }
        return { labels, datasets, truncated, total: groups.size };
    }

    function chartConfig(spec, data) {
        const type = spec.type === 'area' ? 'line' : spec.type === 'hbar' ? 'bar' : spec.type;
        const circular = type === 'pie' || type === 'doughnut';
        const datasets = data.datasets.map((ds, i) => {
            const color = PALETTE[i % PALETTE.length];
            if (circular) return { ...ds, backgroundColor: data.labels.map((_, j) => PALETTE[j % PALETTE.length]), borderColor: '#fff', borderWidth: 2 };
            if (type === 'line') return { ...ds, borderColor: color, backgroundColor: spec.type === 'area' ? `${color}33` : color, fill: spec.type === 'area', tension: 0.3, pointRadius: data.labels && data.labels.length > 60 ? 0 : 3, borderWidth: 2 };
            if (type === 'scatter') return { ...ds, backgroundColor: `${color}aa`, pointRadius: 3 };
            return { ...ds, backgroundColor: color, borderRadius: 6, maxBarThickness: 46 };
        });
        const fmtTick = (v) => (typeof v === 'number' ? QS.fmt.number(v, 2) : v);
        return {
            type,
            data: data.scatter ? { datasets } : { labels: data.labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 350 },
                indexAxis: spec.type === 'hbar' ? 'y' : 'x',
                plugins: {
                    legend: { display: circular || datasets.length > 1, position: circular ? 'right' : 'top', labels: { boxWidth: 12, font: { family: 'Poppins', size: 11 } } },
                    tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${data.scatter ? `${fmtTick(c.parsed.x)}, ${fmtTick(c.parsed.y)}` : fmtTick(circular ? c.parsed : (spec.type === 'hbar' ? c.parsed.x : c.parsed.y))}` } },
                },
                scales: circular ? {} : {
                    x: { ticks: { callback(v) { return data.scatter || spec.type === 'hbar' ? fmtTick(v) : this.getLabelForValue(v); }, maxRotation: 50, autoSkip: true, font: { size: 11 } }, grid: { display: spec.type === 'hbar' || data.scatter }, title: data.scatter ? { display: true, text: data.xLabel } : undefined },
                    y: { ticks: { callback(v) { return spec.type === 'hbar' ? this.getLabelForValue(v) : fmtTick(v); }, font: { size: 11 } }, beginAtZero: !data.scatter, title: data.scatter ? { display: true, text: data.yLabel } : undefined },
                },
            },
            plugins: [{ id: 'qs-white-bg', beforeDraw(chart) { const { ctx } = chart; ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, chart.width, chart.height); ctx.restore(); } }],
        };
    }

    /** Desenha o grafico num canvas; devolve a instancia (destrua com .destroy()). */
    function render(canvas, spec, data) {
        if (!window.Chart) throw new Error(t('chart.err_library'));
        window.Chart.defaults.font.family = 'Poppins, system-ui, sans-serif';
        window.Chart.defaults.color = '#475569';
        return new window.Chart(canvas.getContext('2d'), chartConfig(spec, data));
    }

    function downloadPng(chart, title) {
        const url = chart.toBase64Image('image/png', 1);
        fetch(url).then((r) => r.blob()).then((blob) => QS.download(blob, QS.safeFilename(title || 'grafico', 'png')));
    }

    /** Sugere uma configuracao inicial a partir das colunas (para "Novo grafico"). */
    function suggest(sheet) {
        const cat = sheet.columns.find((c) => c.type === 'text' && c.name) || sheet.columns[0];
        const date = sheet.columns.find((c) => c.type === 'date');
        const num = sheet.columns.find((c) => c.type === 'number');
        if (date && num) return { type: 'line', x: date.id, ys: [{ colId: num.id, agg: 'sum' }], bucket: 'month', sort: 'x' };
        if (cat && num) return { type: 'bar', x: cat.id, ys: [{ colId: num.id, agg: 'sum' }], sort: 'desc', top: 15 };
        return { type: 'bar', x: cat.id, ys: [{ colId: cat.id, agg: 'count' }], sort: 'desc', top: 15 };
    }

    /**
     * Construtor de grafico em modal. ctx = { sheet, rowsIndex (visao filtrada), spec?, onSave(spec) }
     */
    function openBuilder(ctx) {
        const sheet = ctx.sheet;
        const spec = Object.assign({ id: QS.uid('ch'), sheetId: sheet.id, title: '', type: 'bar', ys: [], series: null, bucket: null, sort: 'desc', top: 15, filtered: true }, suggest(sheet), ctx.spec ? JSON.parse(JSON.stringify(ctx.spec)) : {});
        const colOptions = (filter, selected, withNone) => (withNone ? `<option value="">${QS.esc(t('chart.none'))}</option>` : '')
            + sheet.columns.filter(filter || (() => true)).map((c) => `<option value="${c.id}"${c.id === selected ? ' selected' : ''}>${QS.esc(c.name)}</option>`).join('');
        const body = QS.el(`<div class="qs-chart-builder">
            <form class="qs-form qs-chart-form" autocomplete="off">
                <label class="qs-field"><span class="qs-label">${QS.esc(t('chart.title'))}</span><input class="qs-input" name="title" maxlength="80" placeholder="${QS.esc(t('chart.title_ph'))}"></label>
                <div class="qs-field"><span class="qs-label">${QS.esc(t('chart.type'))}</span><div class="qs-seg qs-chart-types">${TYPES.map((ty) => `<button type="button" data-type="${ty}" title="${QS.esc(t(`chart.type_${ty}`))}">${QS.icon({ bar: 'chart-column', hbar: 'chart-bar', line: 'chart-line', area: 'chart-area', pie: 'chart-pie', doughnut: 'chart-pie', scatter: 'chart-scatter' }[ty], 17)}<span>${QS.esc(t(`chart.type_${ty}`))}</span></button>`).join('')}</div></div>
                <label class="qs-field"><span class="qs-label" data-x-label>${QS.esc(t('chart.x'))}</span><select class="qs-input" name="x">${colOptions(null, spec.x)}</select></label>
                <label class="qs-field" data-bucket-field><span class="qs-label">${QS.esc(t('chart.bucket'))}</span><select class="qs-input" name="bucket">${['day', 'month', 'quarter', 'year'].map((b) => `<option value="${b}">${QS.esc(t(`chart.bucket_${b}`))}</option>`).join('')}</select></label>
                <div class="qs-field-row">
                    <label class="qs-field"><span class="qs-label" data-y-label>${QS.esc(t('chart.y'))}</span><select class="qs-input" name="y">${colOptions(null, spec.ys[0] && spec.ys[0].colId)}</select></label>
                    <label class="qs-field" data-agg-field><span class="qs-label">${QS.esc(t('chart.agg'))}</span><select class="qs-input" name="agg">${AGGS.map((a) => `<option value="${a}">${QS.esc(t(`agg.${a}`))}</option>`).join('')}</select></label>
                </div>
                <label class="qs-field" data-series-field><span class="qs-label">${QS.esc(t('chart.series'))}</span><select class="qs-input" name="series">${colOptions((c) => c.type !== 'number', spec.series, true)}</select></label>
                <div class="qs-field-row" data-sort-field>
                    <label class="qs-field"><span class="qs-label">${QS.esc(t('chart.sort'))}</span><select class="qs-input" name="sort"><option value="desc">${QS.esc(t('chart.sort_desc'))}</option><option value="asc">${QS.esc(t('chart.sort_asc'))}</option><option value="x">${QS.esc(t('chart.sort_x'))}</option></select></label>
                    <label class="qs-field"><span class="qs-label">${QS.esc(t('chart.top'))}</span><select class="qs-input" name="top"><option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="25">25</option><option value="50">50</option><option value="0">${QS.esc(t('chart.top_all'))}</option></select></label>
                </div>
                <label class="qs-check-row"><input type="checkbox" name="filtered"><span>${QS.esc(t('chart.use_filter'))}</span></label>
            </form>
            <div class="qs-chart-preview"><div class="qs-chart-canvas"><canvas></canvas></div><p class="qs-chart-note" hidden></p></div>
        </div>`);
        const form = body.querySelector('form');
        form.title.value = spec.title || '';
        form.bucket.value = spec.bucket || 'month';
        form.agg.value = (spec.ys[0] && spec.ys[0].agg) || 'sum';
        form.sort.value = spec.sort || 'desc';
        form.top.value = String(spec.top || 0);
        form.filtered.checked = spec.filtered !== false;
        let chart = null;

        const read = () => {
            spec.title = form.title.value.trim();
            spec.x = form.x.value;
            spec.ys = [{ colId: form.y.value, agg: form.agg.value }];
            spec.series = form.series.value || null;
            spec.bucket = form.bucket.value;
            spec.sort = form.sort.value;
            spec.top = Number(form.top.value) || null;
            spec.filtered = form.filtered.checked;
        };
        const update = () => {
            read();
            const xCol = sheet.columns.find((c) => c.id === spec.x);
            const scatter = spec.type === 'scatter';
            body.querySelectorAll('.qs-chart-types button').forEach((b) => b.classList.toggle('is-active', b.dataset.type === spec.type));
            body.querySelector('[data-bucket-field]').hidden = !(xCol && xCol.type === 'date') || scatter;
            body.querySelector('[data-agg-field]').hidden = scatter;
            body.querySelector('[data-series-field]').hidden = scatter || spec.type === 'pie' || spec.type === 'doughnut';
            body.querySelector('[data-sort-field]').hidden = scatter;
            body.querySelector('[data-x-label]').textContent = scatter ? t('chart.x_numeric') : t('chart.x');
            body.querySelector('[data-y-label]').textContent = scatter ? t('chart.y_numeric') : t('chart.y');
            const data = buildData(sheet, spec.filtered ? ctx.rowsIndex : null, spec);
            const note = body.querySelector('.qs-chart-note');
            if (chart) { chart.destroy(); chart = null; }
            if (data.error) { note.hidden = false; note.textContent = data.error; return; }
            note.hidden = !data.truncated;
            if (data.truncated) note.textContent = t('chart.truncated', { shown: QS.fmt.int(data.labels.length), total: QS.fmt.int(data.total) });
            chart = render(body.querySelector('canvas'), spec, data);
        };
        body.querySelectorAll('.qs-chart-types button').forEach((b) => b.addEventListener('click', () => { spec.type = b.dataset.type; update(); }));
        form.addEventListener('change', update);
        form.addEventListener('input', QS.debounce(update, 300));
        form.addEventListener('submit', (e) => e.preventDefault());

        QS.ui.modal({
            title: ctx.spec ? t('chart.edit_title') : t('chart.new_title'),
            icon: 'chart-column',
            size: 'xl',
            body,
            onClose: () => { if (chart) chart.destroy(); },
            actions: [
                { label: t('common.cancel') },
                { label: t('chart.save'), kind: 'primary', icon: 'check', onClick: () => { read(); if (!spec.title) spec.title = defaultTitle(sheet, spec); ctx.onSave(spec); } },
            ],
        });
        setTimeout(update, 30);
    }

    function defaultTitle(sheet, spec) {
        const name = (id) => (sheet.columns.find((c) => c.id === id) || {}).name || '';
        const y = spec.ys[0];
        if (spec.type === 'scatter') return `${name(y && y.colId)} × ${name(spec.x)}`;
        if (!y || y.agg === 'count') return t('chart.default_title_count', { x: name(spec.x) });
        return t('chart.default_title', { agg: t(`agg.${y.agg}`), y: name(y.colId), x: name(spec.x) });
    }

    QS.charts = { buildData, render, downloadPng, openBuilder, suggest, defaultTitle, PALETTE, TYPES };
})();
