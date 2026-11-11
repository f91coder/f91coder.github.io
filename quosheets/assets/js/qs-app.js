/**
 * Quosheets — app: estado, historico (desfazer/refazer), arquivos (abrir/importar/autosave) e a tela da
 * planilha (barra de ferramentas, grade, menus, filtros, colunas calculadas, limpeza, exportacao).
 * As demais telas (arquivos, analises, IA, conta) ficam em qs-views.js.
 */
(() => {
    const QS = window.QS;
    const { t, tn, esc, icon } = QS;
    const $ = (sel, root = document) => root.querySelector(sel);

    const App = {
        me: QS.boot.user,
        file: null,
        sheet: null,
        viewState: null,   // { filters, sort, search } da aba ativa (fica em file.views[sheetId])
        viewRows: null,    // indices das linhas visiveis (null = todas, na ordem original)
        checked: new Set(),
        history: { undo: [], redo: [] },
        grid: null,
        view: 'files',
        saveState: 'saved',
    };
    QS.app = App;

    // ── Acesso ao plano ───────────────────────────────────────────────────
    App.canEdit = () => !!(App.me && App.me.access && App.me.access.full);
    App.requireFull = (feature) => {
        if (App.canEdit()) return true;
        QS.views.paywall(feature);
        return false;
    };

    // ── Historico ─────────────────────────────────────────────────────────
    function pushHistory(entry) {
        App.history.undo.push(entry);
        if (App.history.undo.length > 120) App.history.undo.shift();
        App.history.redo = [];
        updateUndoButtons();
    }
    function undo() {
        const entry = App.history.undo.pop();
        if (!entry) return;
        entry.undo();
        App.history.redo.push(entry);
        afterChange(entry.structural);
        QS.ui.toast(t('app.undone', { what: entry.label }), 'info', { duration: 1800 });
    }
    function redo() {
        const entry = App.history.redo.pop();
        if (!entry) return;
        entry.redo();
        App.history.undo.push(entry);
        afterChange(entry.structural);
        QS.ui.toast(t('app.redone', { what: entry.label }), 'info', { duration: 1800 });
    }
    function updateUndoButtons() {
        const u = $('[data-act="undo"]'); const r = $('[data-act="redo"]');
        if (u) u.disabled = !App.history.undo.length;
        if (r) r.disabled = !App.history.redo.length;
    }
    /** Executa uma alteracao e a registra no historico. do/undo recebem a aba alvo. */
    function commit(label, apply, revert, opts = {}) {
        const sheet = App.sheet;
        const entry = {
            label,
            structural: !!opts.structural,
            undo: () => { switchSheetIfNeeded(sheet); revert(sheet); },
            redo: () => { switchSheetIfNeeded(sheet); apply(sheet); },
        };
        apply(sheet);
        pushHistory(entry);
        afterChange(entry.structural);
    }
    function switchSheetIfNeeded(sheet) {
        if (App.sheet !== sheet && App.file && App.file.sheets.includes(sheet)) activateSheet(sheet.id, true);
    }
    function afterChange(structural) {
        if (structural) { App.checked.clear(); recomputeView(); }
        if (App.grid) { App.grid.version = (App.grid.version || 0) + 1; App.grid.refresh(); }
        markDirty();
        renderStatus();
        renderBulkBar();
        updateUndoButtons();
        QS.views.onDataChanged();
    }
    App.commit = commit;
    App.undo = undo;
    App.redo = redo;
    App.afterChange = afterChange;

    // ── Mutacoes basicas (todas desfazem) ─────────────────────────────────
    /** changes: [{r, c, after}] (r = indice na aba). Registra antes/depois. */
    function setCells(changes, label) {
        if (!changes.length) return;
        const list = changes.map((ch) => ({ r: ch.r, c: ch.c, before: App.sheet.rows[ch.r][ch.c] ?? null, after: ch.after }));
        commit(label || t('app.edit_cells'), (s) => { list.forEach((ch) => { s.rows[ch.r][ch.c] = ch.after; }); }, (s) => { list.forEach((ch) => { s.rows[ch.r][ch.c] = ch.before; }); });
    }
    App.setCells = setCells;

    /** Substitui todos os valores de uma coluna (limpeza em massa). */
    function setColumnValues(ci, values, label) {
        const before = App.sheet.rows.map((row) => row[ci] ?? null);
        commit(label, (s) => { s.rows.forEach((row, i) => { row[ci] = values[i]; }); }, (s) => { s.rows.forEach((row, i) => { row[ci] = before[i]; }); });
    }
    App.setColumnValues = setColumnValues;

    /** Insere colunas novas (com valores) a partir da posicao at. */
    function insertColumns(at, cols, valuesList, label) {
        commit(label, (s) => {
            s.columns.splice(at, 0, ...cols);
            s.rows.forEach((row, i) => row.splice(at, 0, ...valuesList.map((vals) => (vals ? vals[i] ?? null : null))));
        }, (s) => {
            s.columns.splice(at, cols.length);
            s.rows.forEach((row) => row.splice(at, cols.length));
        }, { structural: true });
    }
    App.insertColumns = insertColumns;

    function deleteColumns(indices) {
        const sorted = [...indices].sort((a, b) => b - a);
        const removed = sorted.map((ci) => ({ ci, col: App.sheet.columns[ci], values: App.sheet.rows.map((r) => r[ci]) }));
        commit(tn('app.delete_cols', indices.length), (s) => {
            sorted.forEach((ci) => { s.columns.splice(ci, 1); s.rows.forEach((row) => row.splice(ci, 1)); });
        }, (s) => {
            [...removed].reverse().forEach(({ ci, col, values }) => { s.columns.splice(ci, 0, col); s.rows.forEach((row, i) => row.splice(ci, 0, values[i])); });
        }, { structural: true });
        cleanViewState();
    }

    function insertRows(at, rows, label) {
        commit(label, (s) => { s.rows.splice(at, 0, ...rows.map((r) => r.slice())); }, (s) => { s.rows.splice(at, rows.length); }, { structural: true });
    }
    App.insertRows = insertRows;

    function deleteRows(indices, label) {
        const sorted = [...new Set(indices)].sort((a, b) => a - b);
        const removed = sorted.map((i) => ({ i, row: App.sheet.rows[i] }));
        commit(label || tn('app.delete_rows', sorted.length), (s) => {
            for (let k = sorted.length - 1; k >= 0; k -= 1) s.rows.splice(sorted[k], 1);
        }, (s) => {
            removed.forEach(({ i, row }) => s.rows.splice(i, 0, row));
        }, { structural: true });
    }
    App.deleteRows = deleteRows;

    function blankRow() { return new Array(App.sheet.columns.length).fill(null); }

    // ── Arquivos ──────────────────────────────────────────────────────────
    function newFileObject(name, sheets, meta) {
        return { id: QS.uid('f'), name, sheets, activeSheetId: sheets[0].id, charts: [], views: {}, meta: meta || {}, createdAt: Date.now(), updatedAt: Date.now() };
    }

    async function openFileObject(file, opts = {}) {
        await flushSave();
        App.file = file;
        file.charts = file.charts || [];
        file.views = file.views || {};
        App.history = { undo: [], redo: [] };
        QS.storageSet('qs_last_file', file.id);
        activateSheet(file.activeSheetId || file.sheets[0].id, true);
        if (opts.save) await saveNow();
        QS.views.renderFileTitle();
        showView(opts.view || 'sheet');
    }
    App.openFileObject = openFileObject;

    async function importFiles(fileList) {
        const files = [...fileList];
        if (!files.length) return;
        for (const f of files) {
            if (f.size > 150 * 1024 * 1024) { QS.ui.toast(t('app.file_too_big', { name: f.name }), 'error'); continue; }
            const done = loading(t('app.reading_file', { name: f.name }));
            try {
                await new Promise((r) => setTimeout(r, 30));
                const parsed = await QS.data.importFile(f);
                const file = newFileObject(parsed.name, parsed.sheets, parsed.meta);
                await openFileObject(file, { save: true });
                const rows = parsed.sheets.reduce((s, sh) => s + sh.rows.length, 0);
                let msg = t('app.file_opened', { name: parsed.name, rows: QS.fmt.int(rows) });
                if (parsed.meta.encoding && parsed.meta.encoding !== 'UTF-8') msg += ` · ${t('app.encoding_fixed', { enc: parsed.meta.encoding })}`;
                QS.ui.toast(msg, 'success');
            } catch (e) {
                console.error(e);
                QS.ui.toast(t('app.file_error', { name: f.name, error: e.message || '' }), 'error');
            } finally {
                done();
            }
        }
    }
    App.importFiles = importFiles;

    async function newBlank() {
        const file = newFileObject(t('app.untitled'), [QS.data.emptySheet(t('data.sheet_n', { n: 1 }))], { source: 'blank' });
        await openFileObject(file, { save: true });
        App.grid && App.grid.setActive(0, 0);
    }
    App.newBlank = newBlank;

    async function openSample() {
        const wb = QS.data.sampleWorkbook();
        const file = newFileObject(wb.name, wb.sheets, wb.meta);
        await openFileObject(file, { save: true });
        QS.ui.toast(t('app.sample_opened'), 'success');
    }
    App.openSample = openSample;

    function pickFile() {
        const input = $('#qsFileInput');
        input.value = '';
        input.click();
    }
    App.pickFile = pickFile;

    function loading(message) {
        const overlay = QS.el(`<div class="qs-loading"><div class="qs-loading-box">${icon('loader-circle', 26, 'qs-spin')}<span></span></div></div>`);
        overlay.querySelector('span').textContent = message;
        document.body.appendChild(overlay);
        return () => overlay.remove();
    }
    App.loading = loading;

    // ── Autosave ──────────────────────────────────────────────────────────
    const saveSoon = QS.debounce(() => { saveNow(); }, 1200);
    function markDirty() {
        if (!App.file) return;
        App.saveState = 'dirty';
        renderSaveState();
        saveSoon();
    }
    App.markDirty = markDirty;
    async function saveNow() {
        if (!App.file) return;
        App.saveState = 'saving';
        renderSaveState();
        try {
            if (App.sheet && App.viewState) App.file.views[App.sheet.id] = App.viewState;
            await QS.store.save(App.file);
            App.saveState = 'saved';
        } catch (e) {
            console.error(e);
            App.saveState = 'error';
            QS.ui.toast(t('app.save_error'), 'error');
        }
        renderSaveState();
    }
    App.saveNow = saveNow;
    async function flushSave() {
        if (App.file && App.saveState === 'dirty') await saveNow();
    }
    App.flushSave = flushSave;
    function renderSaveState() {
        const node = $('#qsSaveState');
        if (!node) return;
        const map = {
            saved: ['circle-check', t('app.saved_local')],
            saving: ['loader-circle', t('app.saving')],
            dirty: ['history', t('app.unsaved')],
            error: ['triangle-alert', t('app.save_failed')],
        };
        const [ic, label] = map[App.saveState] || map.saved;
        node.innerHTML = App.file ? `${icon(ic, 14, App.saveState === 'saving' ? 'qs-spin' : '')}<span>${esc(label)}</span>` : '';
        node.className = `qs-save-state is-${App.saveState}`;
    }
    App.renderSaveState = renderSaveState;
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
    window.addEventListener('beforeunload', (e) => {
        if (App.saveState === 'dirty' || App.saveState === 'saving') { saveNow(); e.preventDefault(); e.returnValue = ''; }
    });

    // ── Abas e visao ──────────────────────────────────────────────────────
    function activateSheet(sheetId, silent) {
        if (!App.file) return;
        if (App.sheet && App.viewState) App.file.views[App.sheet.id] = App.viewState;
        App.sheet = App.file.sheets.find((s) => s.id === sheetId) || App.file.sheets[0];
        App.file.activeSheetId = App.sheet.id;
        App.viewState = App.file.views[App.sheet.id] || { filters: [], sort: null, search: '' };
        App.checked = new Set();
        recomputeView();
        mountGrid();
        renderSheetTabs();
        renderToolbarState();
        renderStatus();
        renderBulkBar();
        if (!silent) markDirty();
        QS.views.onSheetChanged();
    }
    App.activateSheet = activateSheet;

    function cleanViewState() {
        const ids = new Set(App.sheet.columns.map((c) => c.id));
        App.viewState.filters = App.viewState.filters.filter((f) => ids.has(f.colId));
        if (App.viewState.sort && !ids.has(App.viewState.sort.colId)) App.viewState.sort = null;
        recomputeView();
    }

    function viewActive() {
        const v = App.viewState;
        return !!(v && (v.filters.length || v.sort || (v.search && v.search.trim())));
    }
    App.viewActive = viewActive;

    function recomputeView() {
        if (!App.sheet) return;
        App.viewRows = viewActive() ? QS.ops.computeView(App.sheet, App.viewState) : null;
    }
    App.recomputeView = recomputeView;

    /** Indice na aba da linha exibida na posicao r. */
    const rowAt = (r) => (App.viewRows ? App.viewRows[r] : r);
    App.rowAt = rowAt;
    /** Indices (na aba) das linhas visiveis. */
    App.visibleRows = () => (App.viewRows ? App.viewRows.slice() : App.sheet.rows.map((_, i) => i));
    const rowCount = () => (App.viewRows ? App.viewRows.length : App.sheet.rows.length);

    function applyViewChange() {
        recomputeView();
        App.checked.clear();
        if (App.grid) { App.grid.version = (App.grid.version || 0) + 1; App.grid.refresh(); App.grid.scrollToRow(0); }
        App.file.views[App.sheet.id] = App.viewState;
        renderToolbarState();
        renderStatus();
        renderBulkBar();
        markDirty();
    }
    App.applyViewChange = applyViewChange;

    function setSort(colIndex, dir) {
        const col = App.sheet.columns[colIndex];
        App.viewState.sort = dir ? { colId: col.id, dir } : null;
        applyViewChange();
    }
    App.setSort = setSort;

    // ── Grade ─────────────────────────────────────────────────────────────
    function mountGrid() {
        const host = $('#qsGridHost');
        if (!host) return;
        if (App.grid) App.grid.destroy();
        App.grid = new QS.Grid(host, gridAdapter);
    }

    const gridAdapter = {
        columns: () => App.sheet.columns,
        rowCount,
        cell: (r, c) => { const row = App.sheet.rows[rowAt(r)]; return row ? row[c] : null; },
        rowLabel: (r) => String(rowAt(r) + 1),
        isChecked: (r) => App.checked.has(rowAt(r)),
        toggleCheck(r, checked, fromR) {
            if (fromR !== null && fromR !== undefined) {
                const [a, b] = fromR < r ? [fromR, r] : [r, fromR];
                for (let i = a; i <= b; i += 1) { if (checked) App.checked.add(rowAt(i)); else App.checked.delete(rowAt(i)); }
            } else if (checked) App.checked.add(rowAt(r)); else App.checked.delete(rowAt(r));
            App.grid.version = (App.grid.version || 0) + 1;
            App.grid.render();
            renderBulkBar();
        },
        allChecked: () => {
            if (!App.checked.size) return 'none';
            return App.checked.size >= rowCount() ? 'all' : 'some';
        },
        toggleAll(checked) {
            App.checked = new Set(checked ? App.visibleRows() : []);
            App.grid.version = (App.grid.version || 0) + 1;
            App.grid.render();
            renderBulkBar();
        },
        sortState: (c) => (App.viewState.sort && App.viewState.sort.colId === App.sheet.columns[c].id ? App.viewState.sort.dir : null),
        filterActive: (c) => App.viewState.filters.some((f) => f.colId === App.sheet.columns[c].id),
        readOnly: () => !App.canEdit(),
        onReadOnly: () => App.requireFull('edit'),
        commit(r, c, text) {
            const col = App.sheet.columns[c];
            setCells([{ r: rowAt(r), c, after: QS.val.coerce(text, col) }], t('app.edit_cell'));
        },
        clearRange(sel) {
            if (!App.requireFull('edit')) return;
            const changes = [];
            for (let r = sel.r1; r <= sel.r2; r += 1) {
                for (let c = sel.c1; c <= sel.c2; c += 1) {
                    const dr = rowAt(r);
                    if (App.sheet.rows[dr][c] !== null && App.sheet.rows[dr][c] !== undefined) changes.push({ r: dr, c, after: null });
                }
            }
            setCells(changes, t('app.clear_cells'));
        },
        paste(r, c, matrix) {
            pasteMatrix(r, c, matrix);
        },
        headerMenu: (c, anchor) => columnMenu(c, anchor),
        cellMenu: (r, c, point) => cellMenu(r, c, point),
        rowMenu: (r, point) => rowMenu(r, point),
        resizeColumn(c, width, before) {
            const col = App.sheet.columns[c];
            if (width === before) return;
            const entry = { label: t('app.resize_col'), undo: () => { col.width = before; }, redo: () => { col.width = width; }, structural: false };
            pushHistory(entry);
            markDirty();
        },
        renameColumn: (c) => renameColumn(c),
        selectionChange: (sel) => renderSelectionStats(sel),
        emptyMessage: () => (viewActive() ? t('grid.no_match') : t('grid.empty_sheet')),
    };

    function pasteMatrix(r, c, matrix) {
        const sheet = App.sheet;
        const height = matrix.length;
        const width = Math.max(...matrix.map((row) => row.length));
        const needRows = viewActive() ? 0 : Math.max(0, r + height - sheet.rows.length);
        const needCols = Math.max(0, c + width - sheet.columns.length);
        if ((needRows || needCols) && viewActive() && r + height > rowCount()) {
            QS.ui.toast(t('app.paste_trimmed'), 'info');
        }
        const newCols = [];
        for (let i = 0; i < needCols; i += 1) {
            const name = QS.data.uniqueName(sheet.columns.map((x) => x.name).concat(newCols.map((x) => x.name)), t('data.column_n', { n: QS.data.colLetter(sheet.columns.length + i) }));
            newCols.push({ id: QS.uid('c'), name, type: 'text', width: 150 });
        }
        const startLen = sheet.rows.length;
        const changes = [];
        const maxR = viewActive() ? Math.min(height, rowCount() - r) : height;
        for (let i = 0; i < maxR; i += 1) {
            for (let j = 0; j < width; j += 1) {
                const ci = c + j;
                const text = matrix[i][j] === undefined ? '' : matrix[i][j];
                changes.push({ i, ci, text });
            }
        }
        commit(t('app.paste'), (s) => {
            if (newCols.length) { s.columns.push(...newCols); s.rows.forEach((row) => row.push(...new Array(newCols.length).fill(null))); }
            for (let k = 0; k < needRows; k += 1) s.rows.push(new Array(s.columns.length).fill(null));
            changes.forEach((ch) => {
                // Destino fixado na primeira aplicacao (refazer nao depende da visao atual).
                if (ch.dr === undefined) {
                    ch.dr = App.viewRows ? App.viewRows[r + ch.i] : r + ch.i;
                    ch.before = s.rows[ch.dr][ch.ci] ?? null;
                }
                s.rows[ch.dr][ch.ci] = QS.val.coerce(ch.text, s.columns[ch.ci]);
            });
        }, (s) => {
            changes.forEach((ch) => { s.rows[ch.dr][ch.ci] = ch.before; });
            if (needRows) s.rows.splice(startLen, needRows);
            if (newCols.length) { s.columns.splice(s.columns.length - newCols.length, newCols.length); s.rows.forEach((row) => row.splice(row.length - newCols.length, newCols.length)); }
        }, { structural: needRows > 0 || needCols > 0 });
        QS.ui.toast(t('app.pasted', { n: QS.fmt.int(changes.length) }), 'success', { duration: 1800 });
    }

    // ── Menus ─────────────────────────────────────────────────────────────
    function columnMenu(c, anchor) {
        const col = App.sheet.columns[c];
        const sort = gridAdapter.sortState(c);
        const filtered = gridAdapter.filterActive(c);
        const typeItem = (type) => ({ label: t(`type.${type}`), icon: { text: 'type', number: 'hash', date: 'calendar', bool: 'toggle-left' }[type], checked: col.type === type, onClick: () => setColumnType(c, type) });
        QS.ui.menu(anchor, [
            { heading: col.name },
            { label: t('menu.sort_asc'), icon: 'arrow-up', checked: sort === 'asc', onClick: () => setSort(c, 'asc') },
            { label: t('menu.sort_desc'), icon: 'arrow-down', checked: sort === 'desc', onClick: () => setSort(c, 'desc') },
            sort ? { label: t('menu.sort_clear'), icon: 'x', onClick: () => setSort(c, null) } : null,
            { label: t('menu.filter'), icon: 'filter', onClick: () => openFilterDialog(c) },
            filtered ? { label: t('menu.filter_clear'), icon: 'x', onClick: () => { App.viewState.filters = App.viewState.filters.filter((f) => f.colId !== col.id); applyViewChange(); } } : null,
            { divider: true },
            { heading: t('menu.type') },
            typeItem('text'), typeItem('number'), typeItem('date'), typeItem('bool'),
            { divider: true },
            { label: t('menu.rename'), icon: 'pencil', onClick: () => renameColumn(c) },
            { label: t('menu.insert_left'), icon: 'columns-3', onClick: () => addColumn(c) },
            { label: t('menu.insert_right'), icon: 'columns-3', onClick: () => addColumn(c + 1) },
            { label: t('menu.formula_col'), icon: 'sigma', onClick: () => openFormulaDialog(c + 1) },
            { label: t('menu.duplicate_col'), icon: 'copy', onClick: () => duplicateColumn(c) },
            { label: t('menu.split_col'), icon: 'scissors', onClick: () => openSplitDialog(c) },
            { divider: true },
            { label: t('menu.clean_trim'), icon: 'eraser', onClick: () => cleanColumn(c, 'trim') },
            { label: t('menu.clean_upper'), icon: 'case-sensitive', onClick: () => cleanColumn(c, 'upper') },
            { label: t('menu.clean_lower'), icon: 'case-sensitive', onClick: () => cleanColumn(c, 'lower') },
            { label: t('menu.clean_title'), icon: 'case-sensitive', onClick: () => cleanColumn(c, 'title') },
            { label: t('menu.fill_empty'), icon: 'list-checks', onClick: () => openFillDialog(c) },
            { label: t('menu.replace'), icon: 'replace', onClick: () => openReplaceDialog(c) },
            { divider: true },
            { label: t('menu.col_stats'), icon: 'chart-column', onClick: () => QS.views.showColumnProfile(c) },
            { label: t('menu.ai_col'), icon: 'sparkles', onClick: () => QS.views.openAutomation({ sources: [c] }) },
            { divider: true },
            { label: t('menu.move_left'), icon: 'chevron-left', disabled: c === 0, onClick: () => moveColumn(c, -1) },
            { label: t('menu.move_right'), icon: 'chevron-right', disabled: c === App.sheet.columns.length - 1, onClick: () => moveColumn(c, 1) },
            { label: t('menu.delete_col'), icon: 'trash-2', danger: true, onClick: () => confirmDeleteColumns([c]) },
        ]);
    }

    function cellMenu(r, c, point) {
        const sel = App.grid.sel();
        const value = gridAdapter.cell(r, c);
        const nRows = sel.r2 - sel.r1 + 1;
        QS.ui.menu(point, [
            { label: t('menu.copy'), icon: 'copy', hint: 'Ctrl+C', onClick: () => { App.grid.focus(); document.execCommand('copy'); } },
            { label: t('menu.cut'), icon: 'scissors', hint: 'Ctrl+X', onClick: () => { App.grid.focus(); document.execCommand('cut'); } },
            { label: t('menu.paste'), icon: 'file-down', hint: 'Ctrl+V', onClick: () => pasteFromClipboard() },
            { label: t('menu.clear'), icon: 'eraser', hint: 'Del', onClick: () => gridAdapter.clearRange(sel) },
            { divider: true },
            { label: t('menu.row_above'), icon: 'rows-3', onClick: () => addRows(rowAt(sel.r1), 1) },
            { label: t('menu.row_below'), icon: 'rows-3', onClick: () => addRows(rowAt(sel.r2) + 1, 1) },
            { label: tn('menu.delete_rows', nRows), icon: 'trash-2', danger: true, onClick: () => removeViewRows(sel.r1, sel.r2) },
            { divider: true },
            { label: t('menu.filter_value'), icon: 'filter', disabled: value === null || value === undefined, onClick: () => filterByValue(c, value) },
            { label: t('menu.sort_asc'), icon: 'arrow-up', onClick: () => setSort(c, 'asc') },
            { label: t('menu.sort_desc'), icon: 'arrow-down', onClick: () => setSort(c, 'desc') },
        ]);
    }

    function rowMenu(r, point) {
        const sel = App.grid.sel();
        const n = sel.r2 - sel.r1 + 1;
        QS.ui.menu(point, [
            { label: t('menu.row_above'), icon: 'rows-3', onClick: () => addRows(rowAt(sel.r1), 1) },
            { label: t('menu.row_below'), icon: 'rows-3', onClick: () => addRows(rowAt(sel.r2) + 1, 1) },
            { label: t('menu.duplicate_row'), icon: 'copy', onClick: () => duplicateRows(sel.r1, sel.r2) },
            { label: tn('menu.check_rows', n), icon: 'square-check', onClick: () => { for (let i = sel.r1; i <= sel.r2; i += 1) App.checked.add(rowAt(i)); gridAdapter.toggleCheck(sel.r1, true, null); } },
            { divider: true },
            { label: tn('menu.delete_rows', n), icon: 'trash-2', danger: true, onClick: () => removeViewRows(sel.r1, sel.r2) },
        ]);
    }

    async function pasteFromClipboard() {
        if (!App.requireFull('edit')) return;
        try {
            const text = await navigator.clipboard.readText();
            if (!text) return;
            const sel = App.grid.sel();
            pasteMatrix(sel.r1, sel.c1, QS.data.parseCSV(text.replace(/\r?\n$/, ''), '\t'));
        } catch (e) {
            QS.ui.toast(t('app.paste_shortcut'), 'info');
        }
    }

    // ── Operacoes de coluna/linha ─────────────────────────────────────────
    function addColumn(at, name) {
        if (!App.requireFull('edit')) return;
        const sheet = App.sheet;
        const col = { id: QS.uid('c'), name: QS.data.uniqueName(sheet.columns.map((c) => c.name), name || t('data.column_n', { n: QS.data.colLetter(sheet.columns.length) })), type: 'text', width: 150 };
        insertColumns(at, [col], [null], t('app.add_col'));
        App.grid.selectColumns(at, at);
        return col;
    }
    App.addColumn = addColumn;

    function addRows(at, count) {
        if (!App.requireFull('edit')) return;
        insertRows(at, Array.from({ length: count }, blankRow), tn('app.add_rows', count));
        if (!viewActive()) App.grid.setActive(at, App.grid.active.c);
    }
    App.addRows = addRows;

    function duplicateRows(r1, r2) {
        if (!App.requireFull('edit')) return;
        const rows = [];
        for (let r = r1; r <= r2; r += 1) rows.push(App.sheet.rows[rowAt(r)].slice());
        insertRows(rowAt(r2) + 1, rows, tn('app.duplicate_rows', rows.length));
    }

    async function removeViewRows(r1, r2) {
        if (!App.requireFull('edit')) return;
        const indices = [];
        for (let r = r1; r <= r2; r += 1) indices.push(rowAt(r));
        if (indices.length > 20 && !(await QS.ui.confirm(tn('app.confirm_delete_rows', indices.length), { danger: true, okLabel: t('common.delete') }))) return;
        deleteRows(indices);
    }

    async function confirmDeleteColumns(indices) {
        if (!App.requireFull('edit')) return;
        const names = indices.map((i) => App.sheet.columns[i].name).join(', ');
        if (!(await QS.ui.confirm(t('app.confirm_delete_col', { name: names }), { danger: true, okLabel: t('common.delete') }))) return;
        deleteColumns(indices);
    }

    async function renameColumn(c) {
        if (!App.requireFull('edit')) return;
        const col = App.sheet.columns[c];
        const name = await QS.ui.prompt(t('app.rename_col'), { label: t('app.col_name'), value: col.name });
        if (!name || name === col.name) return;
        const unique = QS.data.uniqueName(App.sheet.columns.filter((x) => x !== col).map((x) => x.name), name);
        const before = col.name;
        commit(t('app.rename_col'), () => { col.name = unique; }, () => { col.name = before; });
    }

    function duplicateColumn(c) {
        if (!App.requireFull('edit')) return;
        const col = App.sheet.columns[c];
        const copy = { ...col, id: QS.uid('c'), name: QS.data.uniqueName(App.sheet.columns.map((x) => x.name), `${col.name} (${t('app.copy_suffix')})`) };
        insertColumns(c + 1, [copy], [App.sheet.rows.map((r) => r[c])], t('menu.duplicate_col'));
    }

    function moveColumn(c, dir) {
        if (!App.requireFull('edit')) return;
        const to = c + dir;
        const swap = (s) => {
            [s.columns[c], s.columns[to]] = [s.columns[to], s.columns[c]];
            s.rows.forEach((row) => { [row[c], row[to]] = [row[to], row[c]]; });
        };
        commit(t('app.move_col'), swap, swap, { structural: false });
        App.grid.selectColumns(to, to);
    }

    /** Muda o tipo da coluna convertendo os valores (texto que nao converte fica como esta). */
    function setColumnType(c, type) {
        if (!App.requireFull('edit')) return;
        const col = App.sheet.columns[c];
        if (col.type === type) return;
        const beforeType = col.type;
        const beforeFmt = col.fmt;
        const before = App.sheet.rows.map((r) => r[c]);
        const info = type === 'text' ? { type: 'text' } : type === 'number' ? { type: 'number', decimal: QS.val.LOCAL_DECIMAL } : type === 'date' ? { type: 'date', order: QS.val.LOCAL_DATE_ORDER } : { type: 'bool' };
        const after = before.map((v) => {
            if (v === null || v === undefined) return null;
            if (type === 'text') return typeof v === 'number' ? QS.val.editText(v, col) : (typeof v === 'boolean' ? QS.val.display(v, col) : v);
            return QS.data.convertValue(v, info);
        });
        const failed = after.filter((v, i) => before[i] !== null && type !== 'text' && typeof v === 'string').length;
        commit(t('app.change_type'), (s) => { col.type = type; delete col.fmt; s.rows.forEach((row, i) => { row[c] = after[i]; }); }, (s) => { col.type = beforeType; if (beforeFmt) col.fmt = beforeFmt; s.rows.forEach((row, i) => { row[c] = before[i]; }); });
        if (failed) QS.ui.toast(tn('app.type_failed', failed), 'info');
    }
    App.setColumnType = setColumnType;

    function cleanColumn(c, kind) {
        if (!App.requireFull('edit')) return;
        const values = App.sheet.rows.map((r) => r[c]);
        const res = QS.ops.cleaners[kind](values);
        if (!res.changed) { QS.ui.toast(t('app.nothing_changed'), 'info'); return; }
        setColumnValues(c, res.values, t(`menu.clean_${kind}`));
        QS.ui.toast(tn('app.cells_changed', res.changed), 'success');
    }
    App.cleanColumn = cleanColumn;

    function filterByValue(c, value) {
        const col = App.sheet.columns[c];
        App.viewState.filters = App.viewState.filters.filter((f) => f.colId !== col.id);
        App.viewState.filters.push({ colId: col.id, kind: 'in', values: [value] });
        applyViewChange();
    }

    // ── Dialogos ──────────────────────────────────────────────────────────
    function columnSelect(name, selected, filter) {
        return `<select class="qs-input" name="${name}">${App.sheet.columns.map((c, i) => (filter && !filter(c) ? '' : `<option value="${i}"${i === selected ? ' selected' : ''}>${esc(c.name)}</option>`)).join('')}</select>`;
    }
    App.columnSelect = columnSelect;

    function openFilterDialog(c) {
        const col = App.sheet.columns[c];
        const existing = App.viewState.filters.find((f) => f.colId === col.id);
        const kinds = col.type === 'number' || col.type === 'date'
            ? ['in', 'equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'between', 'empty', 'not_empty']
            : ['in', 'contains', 'not_contains', 'equals', 'not_equals', 'empty', 'not_empty'];
        const profile = QS.data.profileColumn(App.sheet, c, null, 400);
        const values = profile.top.map(([v]) => v);
        const hasBlank = profile.empty > 0;
        const body = QS.el(`<div class="qs-form">
            <label class="qs-field"><span class="qs-label">${esc(t('filter.condition'))}</span><select class="qs-input" name="kind">${kinds.map((k) => `<option value="${k}">${esc(t(`filter.${k}`))}</option>`).join('')}</select></label>
            <div class="qs-field" data-values>
                <input class="qs-input" type="search" data-value-search placeholder="${esc(t('filter.search_values'))}">
                <div class="qs-check-actions"><button type="button" class="qs-link" data-all>${esc(t('filter.select_all'))}</button><button type="button" class="qs-link" data-none>${esc(t('filter.select_none'))}</button></div>
                <div class="qs-value-list">${hasBlank ? `<label class="qs-check-row" data-v="\u0000"><input type="checkbox" value="\u0000"><span class="is-muted">${esc(t('pivot.blank'))}</span></label>` : ''}${values.map((v, i) => `<label class="qs-check-row" data-v="${esc(String(v).toLowerCase())}"><input type="checkbox" data-index="${i}"><span>${esc(QS.val.display(QS.val.coerce(v, col) ?? v, col) || v)}</span><em>${QS.fmt.int(profile.top[i][1])}</em></label>`).join('')}</div>
                ${profile.distinct > values.length ? `<p class="qs-hint">${esc(t('filter.values_limited', { n: QS.fmt.int(values.length) }))}</p>` : ''}
            </div>
            <div class="qs-field-row" data-inputs>
                <label class="qs-field"><span class="qs-label">${esc(t('filter.value'))}</span><input class="qs-input" name="value" ${col.type === 'date' ? 'type="date"' : ''}></label>
                <label class="qs-field" data-value2><span class="qs-label">${esc(t('filter.value2'))}</span><input class="qs-input" name="value2" ${col.type === 'date' ? 'type="date"' : ''}></label>
            </div>
        </div>`);
        const form = body;
        const kindSel = form.querySelector('[name=kind]');
        kindSel.value = existing ? existing.kind : (profile.distinct <= 400 ? 'in' : kinds[1]);
        const selectedSet = new Set(existing && existing.kind === 'in' ? existing.values.map((v) => (v === null ? '\u0000' : String(v))) : []);
        form.querySelectorAll('.qs-value-list input').forEach((input) => {
            const raw = input.value === '\u0000' ? '\u0000' : String(values[Number(input.dataset.index)]);
            input.checked = existing && existing.kind === 'in' ? selectedSet.has(raw) : true;
        });
        if (existing && existing.kind !== 'in') { form.querySelector('[name=value]').value = existing.value ?? ''; form.querySelector('[name=value2]').value = existing.value2 ?? ''; }
        const sync = () => {
            const k = kindSel.value;
            form.querySelector('[data-values]').hidden = k !== 'in';
            form.querySelector('[data-inputs]').hidden = k === 'in' || k === 'empty' || k === 'not_empty';
            form.querySelector('[data-value2]').hidden = k !== 'between';
        };
        kindSel.addEventListener('change', sync);
        sync();
        form.querySelector('[data-value-search]').addEventListener('input', (e) => {
            const q = e.target.value.trim().toLowerCase();
            form.querySelectorAll('.qs-value-list .qs-check-row').forEach((row) => { row.hidden = q && !row.dataset.v.includes(q); });
        });
        form.querySelector('[data-all]').addEventListener('click', () => form.querySelectorAll('.qs-value-list .qs-check-row:not([hidden]) input').forEach((i) => { i.checked = true; }));
        form.querySelector('[data-none]').addEventListener('click', () => form.querySelectorAll('.qs-value-list .qs-check-row:not([hidden]) input').forEach((i) => { i.checked = false; }));

        QS.ui.modal({
            title: t('filter.title', { col: col.name }),
            icon: 'filter',
            size: 'sm',
            body,
            actions: [
                existing ? { label: t('filter.remove'), onClick: () => { App.viewState.filters = App.viewState.filters.filter((f) => f !== existing); applyViewChange(); } } : { label: t('common.cancel') },
                {
                    label: t('common.apply'),
                    kind: 'primary',
                    onClick: () => {
                        const k = kindSel.value;
                        const filter = { colId: col.id, kind: k };
                        if (k === 'in') {
                            const picked = [...form.querySelectorAll('.qs-value-list input:checked')].map((i) => (i.value === '\u0000' ? null : values[Number(i.dataset.index)]));
                            const all = form.querySelectorAll('.qs-value-list input').length;
                            if (picked.length === all && profile.distinct <= values.length) {
                                App.viewState.filters = App.viewState.filters.filter((f) => f.colId !== col.id);
                                applyViewChange();
                                return true;
                            }
                            filter.values = picked;
                        } else if (k !== 'empty' && k !== 'not_empty') {
                            const raw = form.querySelector('[name=value]').value;
                            const raw2 = form.querySelector('[name=value2]').value;
                            filter.value = col.type === 'number' ? QS.val.parseNumber(raw, QS.val.LOCAL_DECIMAL) ?? raw : raw;
                            filter.value2 = col.type === 'number' ? QS.val.parseNumber(raw2, QS.val.LOCAL_DECIMAL) ?? raw2 : raw2;
                        }
                        App.viewState.filters = App.viewState.filters.filter((f) => f.colId !== col.id).concat(filter);
                        applyViewChange();
                        return true;
                    },
                },
            ],
        });
    }
    App.openFilterDialog = openFilterDialog;

    /** Coluna calculada com a linguagem de formulas (+ "descrever com IA"). */
    function openFormulaDialog(at = App.sheet.columns.length, preset = {}) {
        if (!App.requireFull('edit')) return;
        const names = App.sheet.columns.map((c) => c.name);
        const body = QS.el(`<div class="qs-form qs-formula-dialog">
            <div class="qs-ai-inline">
                <span class="qs-ai-badge">${icon('sparkles', 14)} Quo.IA</span>
                <input class="qs-input" name="describe" maxlength="600" placeholder="${esc(t('formula.describe_ph'))}">
                <button type="button" class="qs-btn qs-btn-ai" data-describe>${icon('wand-sparkles', 16)}<span>${esc(t('formula.generate'))}</span></button>
            </div>
            <label class="qs-field"><span class="qs-label">${esc(t('formula.col_name'))}</span><input class="qs-input" name="name" maxlength="120"></label>
            <label class="qs-field"><span class="qs-label">${esc(t('formula.expression'))}</span><textarea class="qs-input qs-code" name="expr" rows="3" spellcheck="false" placeholder="${esc(t('formula.expr_ph'))}"></textarea></label>
            <div class="qs-formula-help">
                <div class="qs-chips" data-cols>${names.map((n) => `<button type="button" class="qs-chip" data-insert="[${esc(n.replace(/]/g, ']]'))}]">${esc(n)}</button>`).join('')}</div>
                <details><summary>${esc(t('formula.functions'))}</summary><div class="qs-fn-list">${QS.formula.FUNCTION_DOCS.map(([n, sig]) => `<button type="button" class="qs-fn" data-insert="${esc(n)}(">${esc(sig)}</button>`).join('')}</div></details>
            </div>
            <p class="qs-formula-error" hidden></p>
            <div class="qs-preview" data-preview></div>
        </div>`);
        const nameInput = body.querySelector('[name=name]');
        const exprInput = body.querySelector('[name=expr]');
        nameInput.value = preset.name || QS.data.uniqueName(names, t('formula.default_name'));
        exprInput.value = preset.expr || '';
        const errorBox = body.querySelector('.qs-formula-error');
        const preview = body.querySelector('[data-preview]');
        let compiled = null;
        const check = () => {
            compiled = QS.formula.compile(exprInput.value, names);
            errorBox.hidden = compiled.ok || !exprInput.value.trim();
            if (!compiled.ok) { errorBox.textContent = compiled.error; preview.innerHTML = ''; return; }
            const rows = App.visibleRows().slice(0, 6);
            preview.innerHTML = `<p class="qs-label">${esc(t('formula.preview'))}</p><table class="qs-table"><tbody>${rows.map((r) => {
                const v = compiled.fn(App.sheet.rows[r]);
                return `<tr><td class="is-muted">${r + 1}</td><td>${esc(QS.val.display(v, { type: typeof v === 'number' ? 'number' : 'text' }) || '—')}</td></tr>`;
            }).join('')}</tbody></table>`;
        };
        exprInput.addEventListener('input', QS.debounce(check, 200));
        body.addEventListener('click', (e) => {
            const b = e.target.closest('[data-insert]');
            if (!b) return;
            const ins = b.dataset.insert;
            const s = exprInput.selectionStart ?? exprInput.value.length;
            exprInput.value = exprInput.value.slice(0, s) + ins + exprInput.value.slice(exprInput.selectionEnd ?? s);
            exprInput.focus();
            exprInput.selectionStart = exprInput.selectionEnd = s + ins.length;
            check();
        });
        body.querySelector('[data-describe]').addEventListener('click', async (e) => {
            const desc = body.querySelector('[name=describe]').value.trim();
            if (!desc) { body.querySelector('[name=describe]').focus(); return; }
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.innerHTML = `${icon('loader-circle', 16, 'qs-spin')}<span>${esc(t('ai.thinking'))}</span>`;
            try {
                const res = await QS.ai.formula(desc, App.sheet);
                QS.views.updateCredits(res.credits);
                if (res.expr) exprInput.value = res.expr;
                if (res.name) nameInput.value = QS.data.uniqueName(names, res.name);
                check();
                if (!res.expr) { errorBox.hidden = false; errorBox.textContent = res.explanation; } else QS.ui.toast(res.explanation, 'ai');
            } catch (err) {
                QS.views.aiError(err);
            } finally {
                btn.disabled = false;
                btn.innerHTML = `${icon('wand-sparkles', 16)}<span>${esc(t('formula.generate'))}</span>`;
            }
        });
        if (exprInput.value) setTimeout(check, 10);
        QS.ui.modal({
            title: t('formula.title'),
            subtitle: t('formula.subtitle'),
            icon: 'sigma',
            size: 'lg',
            body,
            actions: [
                { label: t('common.cancel') },
                {
                    label: t('formula.add'),
                    kind: 'primary',
                    icon: 'plus',
                    onClick: () => {
                        check();
                        if (!compiled || !compiled.ok) { exprInput.focus(); return false; }
                        addFormulaColumn(at, nameInput.value.trim() || t('formula.default_name'), exprInput.value, compiled);
                        return true;
                    },
                },
            ],
        });
    }
    App.openFormulaDialog = openFormulaDialog;

    function addFormulaColumn(at, name, expr, compiled) {
        const values = App.sheet.rows.map((row) => compiled.fn(row));
        const info = QS.data.inferColumn(values.slice(0, 2000));
        const col = { id: QS.uid('c'), name: QS.data.uniqueName(App.sheet.columns.map((c) => c.name), name), type: info.type === 'bool' ? 'bool' : info.type, width: 160, formula: expr };
        const typed = values.map((v) => (info.type === 'date' && typeof v === 'string' ? QS.data.convertValue(v, info) : v));
        insertColumns(at, [col], [typed], t('app.add_formula_col'));
        App.grid.selectColumns(at, at);
        QS.ui.toast(t('app.formula_added', { name: col.name }), 'success');
    }
    App.addFormulaColumn = addFormulaColumn;

    function openFillDialog(c) {
        if (!App.requireFull('edit')) return;
        const body = QS.el(`<div class="qs-form">
            <label class="qs-check-row"><input type="radio" name="mode" value="value" checked><span>${esc(t('fill.value'))}</span></label>
            <input class="qs-input" name="value" placeholder="${esc(t('fill.value_ph'))}">
            <label class="qs-check-row"><input type="radio" name="mode" value="previous"><span>${esc(t('fill.previous'))}</span></label>
            <label class="qs-check-row"><input type="radio" name="mode" value="next"><span>${esc(t('fill.next'))}</span></label>
        </div>`);
        QS.ui.modal({
            title: t('fill.title', { col: App.sheet.columns[c].name }),
            icon: 'list-checks',
            size: 'sm',
            body,
            actions: [{ label: t('common.cancel') }, {
                label: t('common.apply'), kind: 'primary', onClick: () => {
                    const mode = body.querySelector('[name=mode]:checked').value;
                    const raw = body.querySelector('[name=value]').value;
                    const res = QS.ops.fillEmpty(App.sheet.rows.map((r) => r[c]), mode, QS.val.coerce(raw, App.sheet.columns[c]));
                    if (!res.changed) { QS.ui.toast(t('app.nothing_changed'), 'info'); return true; }
                    setColumnValues(c, res.values, t('menu.fill_empty'));
                    QS.ui.toast(tn('app.cells_changed', res.changed), 'success');
                    return true;
                },
            }],
        });
    }
    App.openFillDialog = openFillDialog;

    function openReplaceDialog(c = null) {
        if (!App.requireFull('edit')) return;
        const body = QS.el(`<div class="qs-form">
            <div class="qs-field-row">
                <label class="qs-field"><span class="qs-label">${esc(t('replace.find'))}</span><input class="qs-input" name="find" autofocus></label>
                <label class="qs-field"><span class="qs-label">${esc(t('replace.with'))}</span><input class="qs-input" name="with"></label>
            </div>
            <label class="qs-field"><span class="qs-label">${esc(t('replace.where'))}</span><select class="qs-input" name="col"><option value="-1">${esc(t('replace.all_cols'))}</option>${App.sheet.columns.map((col, i) => `<option value="${i}"${i === c ? ' selected' : ''}>${esc(col.name)}</option>`).join('')}</select></label>
            <div class="qs-check-inline">
                <label class="qs-check-row"><input type="checkbox" name="matchCase"><span>${esc(t('replace.match_case'))}</span></label>
                <label class="qs-check-row"><input type="checkbox" name="wholeCell"><span>${esc(t('replace.whole_cell'))}</span></label>
                <label class="qs-check-row"><input type="checkbox" name="regex"><span>${esc(t('replace.regex'))}</span></label>
            </div>
            <label class="qs-check-row"><input type="checkbox" name="onlyVisible" ${viewActive() ? 'checked' : 'disabled'}><span>${esc(t('replace.only_visible'))}</span></label>
        </div>`);
        QS.ui.modal({
            title: t('replace.title'),
            icon: 'replace',
            size: 'md',
            body,
            actions: [{ label: t('common.cancel') }, {
                label: t('replace.replace_all'), kind: 'primary', onClick: () => {
                    const find = body.querySelector('[name=find]').value;
                    if (!find) { body.querySelector('[name=find]').focus(); return false; }
                    const col = Number(body.querySelector('[name=col]').value);
                    const opts = { matchCase: body.querySelector('[name=matchCase]').checked, wholeCell: body.querySelector('[name=wholeCell]').checked, regex: body.querySelector('[name=regex]').checked };
                    const rows = body.querySelector('[name=onlyVisible]').checked ? App.visibleRows() : App.sheet.rows.map((_, i) => i);
                    const cols = col >= 0 ? [col] : App.sheet.columns.map((_, i) => i);
                    const replacement = body.querySelector('[name=with]').value;
                    const changes = [];
                    for (const ci of cols) {
                        const res = QS.ops.replaceValues(rows.map((r) => App.sheet.rows[r][ci]), find, replacement, opts);
                        if (res.error) { QS.ui.toast(res.error, 'error'); return false; }
                        res.values.forEach((v, k) => {
                            const r = rows[k];
                            if (v !== App.sheet.rows[r][ci]) changes.push({ r, c: ci, after: typeof v === 'string' ? QS.val.coerce(v, App.sheet.columns[ci]) : v });
                        });
                    }
                    if (!changes.length) { QS.ui.toast(t('replace.none'), 'info'); return false; }
                    setCells(changes, t('replace.title'));
                    QS.ui.toast(tn('app.cells_changed', changes.length), 'success');
                    return true;
                },
            }],
        });
    }
    App.openReplaceDialog = openReplaceDialog;

    function openSplitDialog(c) {
        if (!App.requireFull('edit')) return;
        const col = App.sheet.columns[c];
        const body = QS.el(`<div class="qs-form">
            <label class="qs-field"><span class="qs-label">${esc(t('split.delimiter'))}</span><select class="qs-input" name="delim"><option value=",">${esc(t('split.comma'))}</option><option value=";">${esc(t('split.semicolon'))}</option><option value=" ">${esc(t('split.space'))}</option><option value="-">-</option><option value="/">/</option><option value="|">|</option><option value="custom">${esc(t('split.custom'))}</option></select></label>
            <input class="qs-input" name="custom" placeholder="${esc(t('split.custom_ph'))}" hidden>
            <label class="qs-field"><span class="qs-label">${esc(t('split.max'))}</span><input class="qs-input" type="number" name="max" min="2" max="20" value="3"></label>
            <label class="qs-check-row"><input type="checkbox" name="keep" checked><span>${esc(t('split.keep'))}</span></label>
        </div>`);
        const sel = body.querySelector('[name=delim]');
        sel.addEventListener('change', () => { body.querySelector('[name=custom]').hidden = sel.value !== 'custom'; });
        QS.ui.modal({
            title: t('split.title', { col: col.name }),
            icon: 'scissors',
            size: 'sm',
            body,
            actions: [{ label: t('common.cancel') }, {
                label: t('common.apply'), kind: 'primary', onClick: () => {
                    const delim = sel.value === 'custom' ? body.querySelector('[name=custom]').value : sel.value;
                    if (!delim) return false;
                    const res = QS.ops.splitValues(App.sheet.rows.map((r) => r[c]), delim, QS.clamp(Number(body.querySelector('[name=max]').value) || 3, 2, 20));
                    const names = App.sheet.columns.map((x) => x.name);
                    const cols = [];
                    const valuesList = [];
                    for (let p = 0; p < res.parts; p += 1) {
                        const name = QS.data.uniqueName(names.concat(cols.map((x) => x.name)), `${col.name} ${p + 1}`);
                        const values = res.rows.map((parts) => (parts[p] === undefined || parts[p] === '' ? null : parts[p]));
                        const info = QS.data.inferColumn(values.slice(0, 2000));
                        cols.push({ id: QS.uid('c'), name, type: info.type, width: 140, ...(info.fmt ? { fmt: info.fmt } : {}) });
                        valuesList.push(values.map((v) => QS.data.convertValue(v, info)));
                    }
                    const keep = body.querySelector('[name=keep]').checked;
                    if (keep) insertColumns(c + 1, cols, valuesList, t('menu.split_col'));
                    else {
                        const removed = { col, values: App.sheet.rows.map((r) => r[c]) };
                        commit(t('menu.split_col'), (s) => {
                            s.columns.splice(c, 1, ...cols);
                            s.rows.forEach((row, i) => row.splice(c, 1, ...valuesList.map((v) => v[i])));
                        }, (s) => {
                            s.columns.splice(c, cols.length, removed.col);
                            s.rows.forEach((row, i) => row.splice(c, cols.length, removed.values[i]));
                        }, { structural: true });
                    }
                    QS.ui.toast(tn('app.split_done', res.parts), 'success');
                    return true;
                },
            }],
        });
    }

    async function removeDuplicates() {
        if (!App.requireFull('edit')) return;
        const dupes = QS.ops.duplicateRows(App.sheet.rows, []);
        if (!dupes.length) { QS.ui.toast(t('clean.no_duplicates'), 'info'); return; }
        if (!(await QS.ui.confirm(tn('clean.confirm_duplicates', dupes.length), { okLabel: t('common.delete'), danger: true }))) return;
        deleteRows(dupes, tn('clean.removed_duplicates', dupes.length));
        QS.ui.toast(tn('clean.removed_duplicates', dupes.length), 'success');
    }
    App.removeDuplicates = removeDuplicates;

    function removeEmptyRows() {
        if (!App.requireFull('edit')) return;
        const empty = QS.ops.emptyRows(App.sheet.rows);
        if (!empty.length) { QS.ui.toast(t('clean.no_empty_rows'), 'info'); return; }
        deleteRows(empty, tn('clean.removed_empty', empty.length));
        QS.ui.toast(tn('clean.removed_empty', empty.length), 'success');
    }
    App.removeEmptyRows = removeEmptyRows;

    function trimAllText() {
        if (!App.requireFull('edit')) return;
        const changes = [];
        App.sheet.columns.forEach((col, ci) => {
            const res = QS.ops.cleaners.trim(App.sheet.rows.map((r) => r[ci]));
            if (res.changed) res.values.forEach((v, r) => { if (v !== App.sheet.rows[r][ci]) changes.push({ r, c: ci, after: v }); });
        });
        if (!changes.length) { QS.ui.toast(t('app.nothing_changed'), 'info'); return; }
        setCells(changes, t('clean.trim_all'));
        QS.ui.toast(tn('app.cells_changed', changes.length), 'success');
    }

    function useFirstRowAsHeader() {
        if (!App.requireFull('edit') || !App.sheet.rows.length) return;
        const first = App.sheet.rows[0];
        const beforeNames = App.sheet.columns.map((c) => c.name);
        const names = [];
        first.forEach((v, i) => names.push(QS.data.uniqueName(names, v === null || v === undefined || v === '' ? beforeNames[i] : String(v))));
        commit(t('clean.first_row_header'), (s) => { s.columns.forEach((c, i) => { c.name = names[i]; }); s.rows.shift(); }, (s) => { s.rows.unshift(first); s.columns.forEach((c, i) => { c.name = beforeNames[i]; }); }, { structural: true });
    }

    function headerToRow() {
        if (!App.requireFull('edit')) return;
        const names = App.sheet.columns.map((c) => c.name);
        const newNames = names.map((_, i) => t('data.column_n', { n: QS.data.colLetter(i) }));
        commit(t('clean.header_to_row'), (s) => { s.rows.unshift(names.slice()); s.columns.forEach((c, i) => { c.name = newNames[i]; }); }, (s) => { s.rows.shift(); s.columns.forEach((c, i) => { c.name = names[i]; }); }, { structural: true });
    }

    function cleanMenu(anchor) {
        QS.ui.menu(anchor, [
            { label: t('clean.duplicates'), icon: 'copy', onClick: removeDuplicates },
            { label: t('clean.empty_rows'), icon: 'rows-3', onClick: removeEmptyRows },
            { label: t('clean.trim_all'), icon: 'eraser', onClick: trimAllText },
            { label: t('replace.title'), icon: 'replace', hint: 'Ctrl+H', onClick: () => openReplaceDialog(null) },
            { divider: true },
            { label: t('clean.first_row_header'), icon: 'table', onClick: useFirstRowAsHeader },
            { label: t('clean.header_to_row'), icon: 'rows-3', onClick: headerToRow },
            { divider: true },
            { label: t('clean.ai_suggest'), icon: 'sparkles', onClick: () => { showView('ai'); QS.views.openAiTab('insights'); } },
        ], { alignRight: false });
    }

    // ── Exportacao ────────────────────────────────────────────────────────
    function openExportDialog(preset = {}) {
        if (!App.file) return;
        if (!App.requireFull('export')) return;
        const filtered = viewActive();
        const checked = App.checked.size;
        const defaults = QS.lang === 'en' ? { delimiter: ',', decimal: '.' } : { delimiter: ';', decimal: ',' };
        const body = QS.el(`<div class="qs-form qs-export">
            <div class="qs-field"><span class="qs-label">${esc(t('export.format'))}</span><div class="qs-seg" data-format>
                <button type="button" data-v="xlsx">${icon('file-spreadsheet', 16)}<span>Excel (.xlsx)</span></button>
                <button type="button" data-v="csv">${icon('file-down', 16)}<span>CSV</span></button>
                <button type="button" data-v="json">${icon('file-json', 16)}<span>JSON</span></button>
            </div></div>
            <label class="qs-field"><span class="qs-label">${esc(t('export.rows'))}</span><select class="qs-input" name="rows">
                <option value="all">${esc(t('export.rows_all', { n: QS.fmt.int(App.sheet.rows.length) }))}</option>
                ${filtered ? `<option value="view">${esc(t('export.rows_view', { n: QS.fmt.int(rowCount()) }))}</option>` : ''}
                ${checked ? `<option value="checked">${esc(t('export.rows_checked', { n: QS.fmt.int(checked) }))}</option>` : ''}
            </select></label>
            <label class="qs-check-row" data-xlsx-only><input type="checkbox" name="allSheets" ${App.file.sheets.length > 1 ? '' : 'disabled'}><span>${esc(t('export.all_sheets', { n: App.file.sheets.length }))}</span></label>
            <div data-csv-only class="qs-field-row">
                <label class="qs-field"><span class="qs-label">${esc(t('export.delimiter'))}</span><select class="qs-input" name="delimiter"><option value=";">${esc(t('split.semicolon'))} ( ; )</option><option value=",">${esc(t('split.comma'))} ( , )</option><option value="tab">Tab</option></select></label>
                <label class="qs-field"><span class="qs-label">${esc(t('export.decimal'))}</span><select class="qs-input" name="decimal"><option value=",">1234,56</option><option value=".">1234.56</option></select></label>
            </div>
            <div data-csv-only class="qs-check-inline">
                <label class="qs-check-row"><input type="checkbox" name="bom" checked><span>${esc(t('export.bom'))}</span></label>
                <label class="qs-check-row"><input type="checkbox" name="localDates"><span>${esc(t('export.local_dates'))}</span></label>
            </div>
            <label class="qs-field"><span class="qs-label">${esc(t('export.filename'))}</span><input class="qs-input" name="filename" maxlength="80"></label>
        </div>`);
        let format = preset.format || 'xlsx';
        const form = body;
        form.querySelector('[name=rows]').value = preset.rows || (checked ? 'checked' : filtered ? 'view' : 'all');
        form.querySelector('[name=delimiter]').value = defaults.delimiter;
        form.querySelector('[name=decimal]').value = defaults.decimal;
        form.querySelector('[name=filename]').value = App.file.name;
        const sync = () => {
            form.querySelectorAll('[data-format] button').forEach((b) => b.classList.toggle('is-active', b.dataset.v === format));
            form.querySelectorAll('[data-csv-only]').forEach((n) => { n.hidden = format !== 'csv'; });
            form.querySelectorAll('[data-xlsx-only]').forEach((n) => { n.hidden = format !== 'xlsx'; });
        };
        form.querySelectorAll('[data-format] button').forEach((b) => b.addEventListener('click', () => { format = b.dataset.v; sync(); }));
        sync();
        QS.ui.modal({
            title: t('export.title'),
            icon: 'download',
            size: 'md',
            body,
            actions: [{ label: t('common.cancel') }, {
                label: t('export.download'), kind: 'primary', icon: 'download', onClick: () => {
                    const which = form.querySelector('[name=rows]').value;
                    const rows = which === 'view' ? App.visibleRows() : which === 'checked' ? [...App.checked].sort((a, b) => a - b) : null;
                    const filename = form.querySelector('[name=filename]').value.trim() || App.file.name;
                    try {
                        if (format === 'xlsx') {
                            const sheets = form.querySelector('[name=allSheets]').checked ? App.file.sheets : [App.sheet];
                            const map = rows ? { [App.sheet.id]: rows } : {};
                            QS.download(QS.data.toXLSX(sheets, map), QS.safeFilename(filename, 'xlsx'));
                        } else if (format === 'csv') {
                            const delim = form.querySelector('[name=delimiter]').value;
                            const csv = QS.data.toCSV(App.sheet, {
                                delimiter: delim === 'tab' ? '\t' : delim,
                                decimal: form.querySelector('[name=decimal]').value,
                                bom: form.querySelector('[name=bom]').checked,
                                localDates: form.querySelector('[name=localDates]').checked,
                            }, rows);
                            QS.download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), QS.safeFilename(filename, 'csv'));
                        } else {
                            QS.download(new Blob([QS.data.toJSON(App.sheet, rows)], { type: 'application/json' }), QS.safeFilename(filename, 'json'));
                        }
                        QS.ui.toast(t('export.done'), 'success');
                    } catch (e) {
                        console.error(e);
                        QS.ui.toast(t('export.failed'), 'error');
                    }
                    return true;
                },
            }],
        });
    }
    App.openExportDialog = openExportDialog;

    // ── Barra de ferramentas, abas, status ────────────────────────────────
    function renderToolbarState() {
        const search = $('#qsSearch');
        if (search && App.viewState) search.value = App.viewState.search || '';
        const chips = $('#qsFilterChips');
        if (!chips || !App.sheet) return;
        const parts = [];
        App.viewState.filters.forEach((f, i) => {
            const col = App.sheet.columns.find((c) => c.id === f.colId);
            if (!col) return;
            let desc;
            if (f.kind === 'in') desc = f.values.length === 1 ? QS.val.display(f.values[0], col) || t('pivot.blank') : tn('filter.n_values', f.values.length);
            else if (f.kind === 'empty' || f.kind === 'not_empty') desc = t(`filter.${f.kind}`);
            else desc = `${t(`filter.${f.kind}_short`)} ${f.value ?? ''}${f.kind === 'between' ? ` – ${f.value2 ?? ''}` : ''}`;
            parts.push(`<span class="qs-filter-chip" data-filter="${i}"><button type="button" data-edit-filter="${i}">${icon('filter', 12)}<b>${esc(col.name)}</b> ${esc(desc)}</button><button type="button" class="qs-chip-x" data-remove-filter="${i}" aria-label="${esc(t('filter.remove'))}">${icon('x', 12)}</button></span>`);
        });
        if (App.viewState.sort) {
            const col = App.sheet.columns.find((c) => c.id === App.viewState.sort.colId);
            if (col) parts.push(`<span class="qs-filter-chip is-sort"><button type="button" data-edit-sort>${icon(App.viewState.sort.dir === 'asc' ? 'arrow-up' : 'arrow-down', 12)}<b>${esc(col.name)}</b></button><button type="button" class="qs-chip-x" data-remove-sort aria-label="${esc(t('menu.sort_clear'))}">${icon('x', 12)}</button></span>`);
        }
        if (parts.length > 1) parts.push(`<button type="button" class="qs-link" data-clear-view>${esc(t('filter.clear_all'))}</button>`);
        chips.innerHTML = parts.join('');
        chips.hidden = !parts.length;
    }
    App.renderToolbarState = renderToolbarState;

    function renderSheetTabs() {
        const host = $('#qsSheetTabs');
        if (!host || !App.file) return;
        host.innerHTML = App.file.sheets.map((s) => `<button type="button" class="qs-sheet-tab${s === App.sheet ? ' is-active' : ''}" data-sheet="${s.id}" title="${esc(s.name)}">${icon('table', 14)}<span>${esc(s.name)}</span><em>${QS.fmt.int(s.rows.length)}</em></button>`).join('')
            + `<button type="button" class="qs-sheet-add" data-add-sheet title="${esc(t('sheets.add'))}">${icon('plus', 16)}</button>`;
    }
    App.renderSheetTabs = renderSheetTabs;

    function sheetMenu(sheetId, anchor) {
        const sheet = App.file.sheets.find((s) => s.id === sheetId);
        if (!sheet) return;
        QS.ui.menu(anchor, [
            { label: t('common.rename'), icon: 'pencil', onClick: async () => {
                if (!App.requireFull('edit')) return;
                const name = await QS.ui.prompt(t('sheets.rename'), { value: sheet.name, maxLength: 60 });
                if (!name) return;
                const before = sheet.name;
                commit(t('sheets.rename'), () => { sheet.name = name; }, () => { sheet.name = before; });
                renderSheetTabs();
            } },
            { label: t('common.duplicate'), icon: 'copy', onClick: () => {
                if (!App.requireFull('edit')) return;
                const copy = JSON.parse(JSON.stringify(sheet));
                copy.id = QS.uid('s');
                copy.name = `${sheet.name} (${t('app.copy_suffix')})`.slice(0, 60);
                addSheetObject(copy);
            } },
            { label: t('common.delete'), icon: 'trash-2', danger: true, disabled: App.file.sheets.length < 2, onClick: async () => {
                if (!App.requireFull('edit')) return;
                if (!(await QS.ui.confirm(t('sheets.confirm_delete', { name: sheet.name }), { danger: true, okLabel: t('common.delete') }))) return;
                const idx = App.file.sheets.indexOf(sheet);
                App.file.sheets.splice(idx, 1);
                App.file.charts = App.file.charts.filter((c) => c.sheetId !== sheet.id);
                App.history = { undo: [], redo: [] };
                activateSheet(App.file.sheets[Math.max(0, idx - 1)].id);
                updateUndoButtons();
            } },
        ]);
    }

    function addSheetObject(sheet) {
        App.file.sheets.push(sheet);
        activateSheet(sheet.id);
        markDirty();
        return sheet;
    }
    App.addSheetObject = addSheetObject;

    /** Cria uma aba a partir de uma tabela de resultado (pivot, pergunta a IA). */
    function addSheetFromTable(name, table) {
        if (!App.requireFull('edit')) return;
        const names = App.file.sheets.map((s) => s.name);
        const sheet = {
            id: QS.uid('s'),
            name: QS.data.uniqueName(names, String(name || t('data.sheet')).slice(0, 50)),
            columns: table.columns.map((c) => ({ id: QS.uid('c'), name: c.name, type: c.type || 'text', width: QS.data.defaultWidth(c.type || 'text', c.name), ...(c.fmt ? { fmt: c.fmt } : {}) })),
            rows: table.rows.map((r) => r.slice()),
        };
        addSheetObject(sheet);
        showView('sheet');
        QS.ui.toast(t('sheets.created', { name: sheet.name }), 'success');
    }
    App.addSheetFromTable = addSheetFromTable;

    function renderStatus() {
        const node = $('#qsStatusInfo');
        if (!node || !App.sheet) return;
        const total = App.sheet.rows.length;
        const visible = rowCount();
        const parts = [tn('status.rows', total), tn('status.cols', App.sheet.columns.length)];
        if (App.viewRows) parts.push(t('status.visible', { n: QS.fmt.int(visible) }));
        const meta = App.file && App.file.meta;
        if (meta && meta.format && meta.source !== 'sample' && meta.source !== 'blank') {
            let src = meta.format;
            if (meta.encoding) src += ` · ${meta.encoding}`;
            if (meta.delimiter) src += ` · ${t('status.delimiter')} “${meta.delimiter === '\t' ? 'Tab' : meta.delimiter}”`;
            parts.push(src);
        }
        node.textContent = parts.join(' · ');
    }
    App.renderStatus = renderStatus;

    function renderSelectionStats(sel) {
        const node = $('#qsSelStats');
        if (!node) return;
        const cells = (sel.r2 - sel.r1 + 1) * (sel.c2 - sel.c1 + 1);
        if (cells < 2 || cells > 300000) { node.textContent = ''; return; }
        let count = 0; let nums = 0; let sum = 0;
        for (let r = sel.r1; r <= sel.r2; r += 1) {
            const row = App.sheet.rows[rowAt(r)];
            for (let c = sel.c1; c <= sel.c2; c += 1) {
                const v = row[c];
                if (v === null || v === undefined || v === '') continue;
                count += 1;
                if (typeof v === 'number') { nums += 1; sum += v; }
            }
        }
        const parts = [`${t('status.count')}: ${QS.fmt.int(count)}`];
        if (nums) parts.push(`${t('status.sum')}: ${QS.fmt.number(sum, 4)}`, `${t('status.avg')}: ${QS.fmt.number(sum / nums, 4)}`);
        node.textContent = parts.join('   ');
    }

    function renderBulkBar() {
        const bar = $('#qsBulkBar');
        if (!bar) return;
        const n = App.checked.size;
        bar.classList.toggle('is-active', n > 0);
        const counter = $('#qsBulkCount');
        if (counter) counter.textContent = QS.fmt.int(n);
    }
    App.renderBulkBar = renderBulkBar;

    // ── Navegacao entre telas ─────────────────────────────────────────────
    function showView(view) {
        if ((view === 'sheet' || view === 'analysis') && !App.file) view = 'files';
        App.view = view;
        document.querySelectorAll('[data-view-panel]').forEach((p) => { p.hidden = p.dataset.viewPanel !== view; });
        document.querySelectorAll('.qs-nav-item[data-view]').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
        document.body.dataset.view = view;
        QS.views.render(view);
        if (view === 'sheet' && App.grid) setTimeout(() => { App.grid.refresh(); App.grid.focus(); }, 20);
        document.body.classList.remove('is-nav-open');
        if (location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
    }
    App.showView = showView;

    // ── Eventos ───────────────────────────────────────────────────────────
    function bindEvents() {
        document.addEventListener('click', (e) => {
            const nav = e.target.closest('[data-view]');
            if (nav && nav.classList.contains('qs-nav-item')) { showView(nav.dataset.view); return; }
            const act = e.target.closest('[data-act]');
            if (act) { handleAction(act.dataset.act, act, e); return; }
            const tab = e.target.closest('[data-sheet]');
            if (tab) {
                // Duplo clique (e.detail) abre o menu da aba; clicar na aba ativa nao a recria.
                if (e.detail >= 2) sheetMenu(tab.dataset.sheet, tab.getBoundingClientRect());
                else if (!App.sheet || tab.dataset.sheet !== App.sheet.id) activateSheet(tab.dataset.sheet);
                return;
            }
            if (e.target.closest('[data-add-sheet]')) {
                if (!App.requireFull('edit')) return;
                addSheetObject(QS.data.emptySheet(QS.data.uniqueName(App.file.sheets.map((s) => s.name), t('data.sheet_n', { n: App.file.sheets.length + 1 }))));
                return;
            }
            const rem = e.target.closest('[data-remove-filter]');
            if (rem) { App.viewState.filters.splice(Number(rem.dataset.removeFilter), 1); applyViewChange(); return; }
            const edit = e.target.closest('[data-edit-filter]');
            if (edit) {
                const f = App.viewState.filters[Number(edit.dataset.editFilter)];
                const ci = App.sheet.columns.findIndex((c) => c.id === f.colId);
                if (ci >= 0) openFilterDialog(ci);
                return;
            }
            if (e.target.closest('[data-remove-sort]')) { App.viewState.sort = null; applyViewChange(); return; }
            if (e.target.closest('[data-edit-sort]')) { App.viewState.sort.dir = App.viewState.sort.dir === 'asc' ? 'desc' : 'asc'; applyViewChange(); return; }
            if (e.target.closest('[data-clear-view]')) { App.viewState.filters = []; App.viewState.sort = null; App.viewState.search = ''; applyViewChange(); }
        });
        document.addEventListener('contextmenu', (e) => {
            const tab = e.target.closest('[data-sheet]');
            if (tab) { e.preventDefault(); sheetMenu(tab.dataset.sheet, { x: e.clientX, y: e.clientY }); }
        });
        const search = $('#qsSearch');
        if (search) {
            search.addEventListener('input', QS.debounce(() => {
                if (!App.viewState) return;
                App.viewState.search = search.value;
                applyViewChange();
            }, 220));
        }
        $('#qsFileInput').addEventListener('change', (e) => importFiles(e.target.files));

        // Arrastar e soltar arquivos em qualquer lugar
        let dragDepth = 0;
        const overlay = $('#qsDropOverlay');
        window.addEventListener('dragenter', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { dragDepth += 1; overlay.classList.add('is-active'); } });
        window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) overlay.classList.remove('is-active'); });
        window.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault(); });
        window.addEventListener('drop', (e) => {
            if (!e.dataTransfer || !e.dataTransfer.files.length) return;
            e.preventDefault();
            dragDepth = 0;
            overlay.classList.remove('is-active');
            importFiles(e.dataTransfer.files);
        });

        document.addEventListener('keydown', (e) => {
            const mod = e.ctrlKey || e.metaKey;
            if (!mod) return;
            const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
            const key = e.key.toLowerCase();
            if (key === 's') { e.preventDefault(); saveNow().then(() => QS.ui.toast(t('app.saved_local'), 'success', { duration: 1500 })); return; }
            if (key === 'o') { e.preventDefault(); pickFile(); return; }
            if (typing) return;
            if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
            else if ((key === 'y') || (key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
            else if (key === 'f' && App.view === 'sheet') { e.preventDefault(); $('#qsSearch').focus(); }
            else if (key === 'h' && App.view === 'sheet') { e.preventDefault(); openReplaceDialog(null); }
        });
        window.addEventListener('hashchange', () => {
            const v = location.hash.slice(1);
            if (v && v !== App.view && ['files', 'sheet', 'analysis', 'ai', 'account'].includes(v)) showView(v);
        });
    }

    function handleAction(act, node, e) {
        switch (act) {
            case 'open-file': pickFile(); break;
            case 'new-blank': newBlank(); break;
            case 'open-sample': openSample(); break;
            case 'undo': undo(); break;
            case 'redo': redo(); break;
            case 'add-row':
                if (!App.requireFull('edit')) break;
                addRows(App.sheet.rows.length, 1);
                if (!viewActive() && App.grid) App.grid.setActive(App.sheet.rows.length - 1, 0);
                break;
            case 'add-col': addColumn(App.sheet.columns.length); break;
            case 'formula': openFormulaDialog(App.sheet.columns.length); break;
            case 'clean': cleanMenu(node.getBoundingClientRect()); break;
            case 'filter-menu': filterMenu(node.getBoundingClientRect()); break;
            case 'chart': QS.views.newChart(); break;
            case 'pivot': showView('analysis'); QS.views.openAnalysisTab('pivot'); break;
            case 'ai': QS.views.openAutomation({}); break;
            case 'ask': showView('ai'); QS.views.openAiTab('ask'); break;
            case 'export': openExportDialog(); break;
            case 'bulk-ai': QS.views.openAutomation({ target: 'checked' }); break;
            case 'bulk-export': openExportDialog({ rows: 'checked' }); break;
            case 'bulk-delete': {
                if (!App.requireFull('edit')) break;
                const rows = [...App.checked];
                QS.ui.confirm(tn('app.confirm_delete_rows', rows.length), { danger: true, okLabel: t('common.delete') }).then((ok) => { if (ok) deleteRows(rows); });
                break;
            }
            case 'bulk-clear': App.checked.clear(); App.grid.version = (App.grid.version || 0) + 1; App.grid.render(); renderBulkBar(); break;
            case 'toggle-nav': document.body.classList.toggle('is-nav-open'); break;
            case 'go': showView(node.dataset.target); break;
            default: QS.views.handleAction(act, node, e);
        }
    }
    App.handleAction = handleAction;

    function filterMenu(anchor) {
        QS.ui.menu(anchor, [{ heading: t('filter.by_column') }].concat(App.sheet.columns.map((c, i) => ({
            label: c.name,
            icon: { text: 'type', number: 'hash', date: 'calendar', bool: 'toggle-left' }[c.type],
            checked: App.viewState.filters.some((f) => f.colId === c.id),
            onClick: () => openFilterDialog(i),
        }))));
    }

    // ── Inicio ────────────────────────────────────────────────────────────
    async function start() {
        bindEvents();
        QS.views.init();
        try {
            await QS.store.open(App.me.id);
            QS.store.persist();
        } catch (e) {
            QS.ui.toast(t('app.storage_unavailable'), 'error');
        }
        const hashView = location.hash.slice(1);
        const lastId = QS.storageGet('qs_last_file');
        if (lastId && ['sheet', 'analysis', ''].includes(hashView)) {
            try {
                const file = await QS.store.load(lastId);
                if (file) { await openFileObject(file, { view: hashView || 'sheet' }); return; }
            } catch (e) { /* segue para a lista de arquivos */ }
        }
        showView(['ai', 'account', 'files'].includes(hashView) ? hashView : 'files');
    }

    document.addEventListener('DOMContentLoaded', start);
})();
