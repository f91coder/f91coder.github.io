/**
 * Quosheets — grade virtual. Renderiza so as celulas visiveis (linhas e colunas), entao abre arquivos
 * com centenas de milhares de linhas. Para alturas acima do limite do navegador usa rolagem escalonada.
 *
 * Recursos: edicao na celula, selecao de intervalo (mouse/teclado), copiar/colar compativel com Excel
 * (TSV), limpar, redimensionar/autoajustar coluna, marcar linhas, menus de contexto.
 * Toda alteracao de dados passa pelo adapter (o app aplica com desfazer/refazer).
 */
(() => {
    const QS = window.QS;
    const RH = 32;            // altura da linha
    const GUTTER = 72;        // largura da coluna de numeros/checkbox
    const OVERSCAN_R = 8;
    const OVERSCAN_C = 2;
    const MAX_SIZER = 12_000_000;

    const TYPE_ICON = { text: 'type', number: 'hash', date: 'calendar', bool: 'toggle-left' };
    const PILL = new Map();
    [['success', 'pago paid pagado ativo active activo concluído concluido completed completado aprovado approved aprobado entregue delivered entregado positivo positive sim yes sí'],
        ['warning', 'pendente pending pendiente aguardando waiting esperando neutro neutral "em andamento" "in progress" "en curso" processando processing'],
        ['danger', 'cancelado canceled cancelled erro error falha failed fallido recusado rejected rechazado inativo inactive inactivo negativo negative atrasado late'],
        ['info', 'novo new nuevo revisão revisão review revisión']].forEach(([cls, words]) => {
        (words.match(/"[^"]+"|\S+/g) || []).forEach((w) => PILL.set(w.replace(/"/g, ''), cls));
    });

    class Grid {
        constructor(container, adapter) {
            this.container = container;
            this.a = adapter;
            this.active = { r: 0, c: 0 };
            this.anchor = { r: 0, c: 0 };
            this.focusCell = { r: 0, c: 0 };
            this.editing = null;
            this.widths = [];
            this.xs = [];
            this.lastWindow = '';
            this.lastChecked = null;
            this.build();
            this.refresh();
        }

        // ── Estrutura ────────────────────────────────────────────────────
        build() {
            this.container.innerHTML = '';
            const root = QS.el(`<div class="qg" tabindex="0" role="grid" aria-multiselectable="true">
                <div class="qg-head">
                    <div class="qg-corner"><label class="qg-check" title=""><input type="checkbox" data-check-all><span></span></label></div>
                    <div class="qg-head-viewport"><div class="qg-head-cells"></div></div>
                </div>
                <div class="qg-main">
                    <div class="qg-gutter"><div class="qg-gutter-cells"></div></div>
                    <div class="qg-scroll"><div class="qg-sizer"><div class="qg-cells"></div><div class="qg-sel"></div><div class="qg-cursor"></div></div></div>
                </div>
                <div class="qg-empty" hidden></div>
            </div>`);
            this.container.appendChild(root);
            this.root = root;
            this.headCells = root.querySelector('.qg-head-cells');
            this.gutterCells = root.querySelector('.qg-gutter-cells');
            this.scroll = root.querySelector('.qg-scroll');
            this.sizer = root.querySelector('.qg-sizer');
            this.cells = root.querySelector('.qg-cells');
            this.selBox = root.querySelector('.qg-sel');
            this.cursorBox = root.querySelector('.qg-cursor');
            this.emptyBox = root.querySelector('.qg-empty');
            this.checkAll = root.querySelector('[data-check-all]');
            root.querySelector('.qg-corner .qg-check').title = QS.t('grid.select_all_rows');

            this.scroll.addEventListener('scroll', () => this.schedule(), { passive: true });
            this.resizeObserver = new ResizeObserver(() => this.schedule(true));
            this.resizeObserver.observe(this.scroll);

            // Duplo clique e detectado no proprio mousedown (e.detail): como cada clique redesenha as celulas,
            // o elemento do 1o clique deixa de existir e o navegador nao dispararia "dblclick".
            this.cells.addEventListener('mousedown', (e) => this.onCellMouseDown(e));
            this.cells.addEventListener('contextmenu', (e) => this.onContextMenu(e));
            this.headCells.addEventListener('mousedown', (e) => this.onHeadMouseDown(e));
            this.headCells.addEventListener('contextmenu', (e) => {
                const h = e.target.closest('[data-c]');
                if (!h) return;
                e.preventDefault();
                this.a.headerMenu(Number(h.dataset.c), { x: e.clientX, y: e.clientY });
            });
            this.gutterCells.addEventListener('mousedown', (e) => this.onGutterMouseDown(e));
            this.gutterCells.addEventListener('contextmenu', (e) => {
                const g = e.target.closest('[data-r]');
                if (!g) return;
                e.preventDefault();
                const r = Number(g.dataset.r);
                if (!this.inSel(r, this.sel().c1)) this.selectRows(r, r);
                this.a.rowMenu(r, { x: e.clientX, y: e.clientY });
            });
            this.gutterCells.addEventListener('change', (e) => {
                const input = e.target.closest('input[data-check-row]');
                if (!input) return;
                const r = Number(input.dataset.checkRow);
                this.a.toggleCheck(r, input.checked, this.shiftCheck ? this.lastChecked : null);
                this.lastChecked = r;
            });
            this.gutterCells.addEventListener('click', (e) => { if (e.target.closest('input[data-check-row]')) this.shiftCheck = e.shiftKey; }, true);
            this.checkAll.addEventListener('change', () => this.a.toggleAll(this.checkAll.checked));
            root.addEventListener('keydown', (e) => this.onKeyDown(e));
            this.onCopy = (e) => this.handleClipboard(e, 'copy');
            this.onCut = (e) => this.handleClipboard(e, 'cut');
            this.onPaste = (e) => this.handleClipboard(e, 'paste');
            document.addEventListener('copy', this.onCopy);
            document.addEventListener('cut', this.onCut);
            document.addEventListener('paste', this.onPaste);
            this.onMouseUp = () => { this.dragging = false; };
            document.addEventListener('mouseup', this.onMouseUp);
        }

        destroy() {
            this.resizeObserver.disconnect();
            document.removeEventListener('copy', this.onCopy);
            document.removeEventListener('cut', this.onCut);
            document.removeEventListener('paste', this.onPaste);
            document.removeEventListener('mouseup', this.onMouseUp);
            this.container.innerHTML = '';
        }

        // ── Geometria ────────────────────────────────────────────────────
        refresh() {
            const columns = this.a.columns();
            this.widths = columns.map((c) => c.width || 150);
            this.xs = [];
            let x = 0;
            for (const w of this.widths) { this.xs.push(x); x += w; }
            this.totalW = x;
            this.rowCount = this.a.rowCount();
            this.totalH = this.rowCount * RH;
            this.sizer.style.width = `${Math.max(this.totalW, 1)}px`;
            this.sizerH = Math.min(this.totalH, MAX_SIZER);
            this.sizer.style.height = `${Math.max(this.sizerH, 1)}px`;
            this.active.r = QS.clamp(this.active.r, 0, Math.max(0, this.rowCount - 1));
            this.active.c = QS.clamp(this.active.c, 0, Math.max(0, columns.length - 1));
            this.clampSel();
            const empty = this.a.emptyMessage ? this.a.emptyMessage() : '';
            this.emptyBox.hidden = !(this.rowCount === 0 && empty);
            this.emptyBox.textContent = empty;
            this.lastWindow = '';
            this.render();
        }

        clampSel() {
            const maxR = Math.max(0, this.rowCount - 1);
            const maxC = Math.max(0, this.widths.length - 1);
            for (const p of [this.anchor, this.focusCell]) { p.r = QS.clamp(p.r, 0, maxR); p.c = QS.clamp(p.c, 0, maxC); }
        }

        /** Topo "virtual" (em px de conteudo real) considerando a rolagem escalonada. */
        virtualTop() {
            const st = this.scroll.scrollTop;
            const vh = this.scroll.clientHeight;
            if (this.totalH <= MAX_SIZER || this.sizerH <= vh) return st;
            return (st / (this.sizerH - vh)) * (this.totalH - vh);
        }

        /** Posicao y (no espaco do sizer) de uma linha visivel. */
        rowY(r) { return this.scroll.scrollTop + (r * RH - this.virtualTop()); }

        schedule(force) {
            if (force) this.lastWindow = '';
            if (this.frame) return;
            this.frame = requestAnimationFrame(() => { this.frame = null; this.render(); });
        }

        visibleCols() {
            const sl = this.scroll.scrollLeft;
            const vw = this.scroll.clientWidth;
            let c0 = 0;
            while (c0 < this.xs.length - 1 && this.xs[c0] + this.widths[c0] < sl) c0 += 1;
            let c1 = c0;
            while (c1 < this.xs.length - 1 && this.xs[c1] < sl + vw) c1 += 1;
            return [Math.max(0, c0 - OVERSCAN_C), Math.min(this.xs.length - 1, c1 + OVERSCAN_C)];
        }

        // ── Renderizacao ─────────────────────────────────────────────────
        render() {
            const columns = this.a.columns();
            const vt = this.virtualTop();
            const vh = this.scroll.clientHeight;
            const st = this.scroll.scrollTop;
            const sl = this.scroll.scrollLeft;
            const r0 = Math.max(0, Math.floor(vt / RH) - OVERSCAN_R);
            const r1 = Math.min(this.rowCount - 1, Math.ceil((vt + vh) / RH) + OVERSCAN_R);
            const [c0, c1] = columns.length ? this.visibleCols() : [0, -1];
            const key = `${r0}|${r1}|${c0}|${c1}|${Math.round(vt)}|${st}|${this.version || 0}`;
            this.headCells.style.transform = `translateX(${-sl}px)`;
            if (key !== this.lastWindow) {
                this.lastWindow = key;
                this.renderCells(columns, r0, r1, c0, c1, vt, st);
                this.renderGutter(r0, r1, vt);
                this.renderHead(columns, c0, c1);
            }
            this.renderSelection();
            this.positionEditor();
        }

        renderCells(columns, r0, r1, c0, c1, vt, st) {
            const sel = this.sel();
            const html = [];
            for (let r = r0; r <= r1; r += 1) {
                const y = r * RH - vt;
                const checked = this.a.isChecked(r);
                for (let c = c0; c <= c1; c += 1) {
                    const col = columns[c];
                    const value = this.a.cell(r, c);
                    let text = QS.val.display(value, col);
                    let cls = 'qg-c';
                    if (typeof value === 'number') cls += ' is-num';
                    else if (value === null || value === undefined || value === '') cls += ' is-empty';
                    else if (typeof value === 'string' && col.type === 'number') cls += ' is-mismatch';
                    if (checked) cls += ' is-checked';
                    if (r >= sel.r1 && r <= sel.r2 && c >= sel.c1 && c <= sel.c2) cls += ' is-in-sel';
                    let inner = QS.esc(text.length > 300 ? `${text.slice(0, 300)}…` : text);
                    if (typeof value === 'string' && col.type === 'text' && value.length <= 24) {
                        const pill = PILL.get(value.trim().toLowerCase());
                        if (pill) inner = `<span class="qg-pill is-${pill}">${inner}</span>`;
                    }
                    html.push(`<div class="${cls}" data-r="${r}" data-c="${c}" style="transform:translate(${this.xs[c]}px,${y}px);width:${this.widths[c]}px">${inner}</div>`);
                }
            }
            this.cells.style.transform = `translateY(${st}px)`;
            this.cells.innerHTML = html.join('');
        }

        renderGutter(r0, r1, vt) {
            const sel = this.sel();
            const html = [];
            for (let r = r0; r <= r1; r += 1) {
                const checked = this.a.isChecked(r);
                const inSel = r >= sel.r1 && r <= sel.r2;
                html.push(`<div class="qg-g${checked ? ' is-checked' : ''}${inSel ? ' is-sel' : ''}" data-r="${r}" style="transform:translateY(${r * RH - vt}px)">`
                    + `<label class="qg-check"><input type="checkbox" data-check-row="${r}"${checked ? ' checked' : ''} aria-label="${QS.esc(QS.t('grid.select_row'))}"><span></span></label>`
                    + `<span class="qg-g-num">${QS.esc(this.a.rowLabel(r))}</span></div>`);
            }
            this.gutterCells.innerHTML = html.join('');
            const all = this.a.allChecked();
            this.checkAll.checked = all === 'all';
            this.checkAll.indeterminate = all === 'some';
        }

        renderHead(columns, c0, c1) {
            const sel = this.sel();
            const fullCols = sel.r1 === 0 && sel.r2 === this.rowCount - 1 && this.rowCount > 0;
            const html = [];
            for (let c = c0; c <= c1; c += 1) {
                const col = columns[c];
                const sort = this.a.sortState(c);
                const filtered = this.a.filterActive(c);
                const inSel = c >= sel.c1 && c <= sel.c2;
                html.push(`<div class="qg-h${inSel ? ' is-sel' : ''}${fullCols && inSel ? ' is-full' : ''}" data-c="${c}" style="transform:translateX(${this.xs[c]}px);width:${this.widths[c]}px" title="${QS.esc(col.name)}">`
                    + `<span class="qg-h-type" title="${QS.esc(QS.t(`type.${col.type}`))}">${QS.icon(TYPE_ICON[col.type] || 'type', 13)}</span>`
                    + `<span class="qg-h-name">${QS.esc(col.name)}</span>`
                    + (sort ? `<span class="qg-h-badge">${QS.icon(sort === 'asc' ? 'arrow-up' : 'arrow-down', 13)}</span>` : '')
                    + (filtered ? `<span class="qg-h-badge is-filter">${QS.icon('filter', 12)}</span>` : '')
                    + `<button type="button" class="qg-h-menu" data-menu="${c}" aria-label="${QS.esc(QS.t('grid.column_menu'))}">${QS.icon('chevron-down', 14)}</button>`
                    + '<span class="qg-resize" data-resize></span></div>');
            }
            this.headCells.innerHTML = html.join('');
            this.headCells.style.width = `${this.totalW + 400}px`;
        }

        sel() {
            return {
                r1: Math.min(this.anchor.r, this.focusCell.r), r2: Math.max(this.anchor.r, this.focusCell.r),
                c1: Math.min(this.anchor.c, this.focusCell.c), c2: Math.max(this.anchor.c, this.focusCell.c),
            };
        }
        inSel(r, c) { const s = this.sel(); return r >= s.r1 && r <= s.r2 && c >= s.c1 && c <= s.c2; }

        renderSelection() {
            if (!this.rowCount || !this.widths.length) { this.selBox.hidden = true; this.cursorBox.hidden = true; return; }
            const s = this.sel();
            const vt = this.virtualTop();
            const st = this.scroll.scrollTop;
            const vh = this.scroll.clientHeight;
            const top = Math.max(s.r1 * RH - vt, -RH) + st;
            const bottom = Math.min((s.r2 + 1) * RH - vt, vh + RH) + st;
            const multi = s.r1 !== s.r2 || s.c1 !== s.c2;
            this.selBox.hidden = !multi || bottom <= top;
            if (multi) {
                Object.assign(this.selBox.style, { left: `${this.xs[s.c1]}px`, top: `${top}px`, width: `${this.xs[s.c2] + this.widths[s.c2] - this.xs[s.c1]}px`, height: `${bottom - top}px` });
            }
            const ay = this.active.r * RH - vt;
            const visible = ay > -RH && ay < vh + RH;
            this.cursorBox.hidden = !visible;
            if (visible) Object.assign(this.cursorBox.style, { left: `${this.xs[this.active.c]}px`, top: `${ay + st}px`, width: `${this.widths[this.active.c]}px`, height: `${RH}px` });
            if (this.a.selectionChange) this.a.selectionChange(s, this.active);
        }

        // ── Selecao e rolagem ────────────────────────────────────────────
        setActive(r, c, extend = false) {
            if (!this.rowCount || !this.widths.length) return;
            r = QS.clamp(r, 0, this.rowCount - 1);
            c = QS.clamp(c, 0, this.widths.length - 1);
            if (extend) {
                this.focusCell = { r, c };
            } else {
                this.active = { r, c };
                this.anchor = { r, c };
                this.focusCell = { r, c };
            }
            this.ensureVisible(extend ? this.focusCell : this.active);
            this.lastWindow = '';
            this.render();
        }

        selectAll() {
            if (!this.rowCount) return;
            this.anchor = { r: 0, c: 0 };
            this.focusCell = { r: this.rowCount - 1, c: this.widths.length - 1 };
            this.lastWindow = '';
            this.render();
        }

        selectColumns(c1, c2) {
            if (!this.rowCount) { this.active = { r: 0, c: c1 }; this.lastWindow = ''; this.render(); return; }
            const top = QS.clamp(Math.floor(this.virtualTop() / RH), 0, this.rowCount - 1);
            this.active = { r: top, c: c1 };
            this.anchor = { r: 0, c: c1 };
            this.focusCell = { r: this.rowCount - 1, c: c2 };
            this.lastWindow = '';
            this.render();
        }

        selectRows(r1, r2) {
            this.active = { r: r1, c: QS.clamp(this.active.c, 0, this.widths.length - 1) };
            this.anchor = { r: r1, c: 0 };
            this.focusCell = { r: r2, c: Math.max(0, this.widths.length - 1) };
            this.lastWindow = '';
            this.render();
        }

        ensureVisible(p) {
            const vh = this.scroll.clientHeight;
            const vw = this.scroll.clientWidth;
            const vt = this.virtualTop();
            const y = p.r * RH;
            let targetVt = vt;
            if (y < vt) targetVt = y;
            else if (y + RH > vt + vh) targetVt = y + RH - vh;
            if (targetVt !== vt) this.scrollToVirtual(targetVt);
            const x = this.xs[p.c] || 0;
            const w = this.widths[p.c] || 0;
            if (x < this.scroll.scrollLeft) this.scroll.scrollLeft = x;
            else if (x + w > this.scroll.scrollLeft + vw) this.scroll.scrollLeft = x + w - vw;
        }

        scrollToVirtual(vt) {
            const vh = this.scroll.clientHeight;
            if (this.totalH <= MAX_SIZER || this.sizerH <= vh) this.scroll.scrollTop = vt;
            else this.scroll.scrollTop = (vt / (this.totalH - vh)) * (this.sizerH - vh);
        }

        scrollToRow(r) {
            this.scrollToVirtual(Math.max(0, r * RH - this.scroll.clientHeight / 3));
            this.lastWindow = '';
            this.render();
        }

        cellFromEvent(e) {
            const node = e.target.closest('.qg-c');
            if (node) return { r: Number(node.dataset.r), c: Number(node.dataset.c) };
            return null;
        }

        // ── Mouse ────────────────────────────────────────────────────────
        onCellMouseDown(e) {
            const p = this.cellFromEvent(e);
            if (!p) return;
            if (this.editing) this.commitEdit();
            if (e.button === 2 && this.inSel(p.r, p.c)) return; // botao direito dentro da selecao: mantem
            e.preventDefault();
            this.root.focus({ preventScroll: true });
            this.setActive(p.r, p.c, e.shiftKey);
            if (e.button === 0 && e.detail >= 2 && !e.shiftKey) {
                this.dragging = false;
                this.startEdit();
                return;
            }
            this.dragging = e.button === 0;
            const move = (ev) => {
                if (!this.dragging) { document.removeEventListener('mousemove', move); return; }
                const target = document.elementFromPoint(ev.clientX, ev.clientY);
                const cell = target && target.closest && target.closest('.qg-c');
                if (cell && this.root.contains(cell)) {
                    const r = Number(cell.dataset.r); const c = Number(cell.dataset.c);
                    if (r !== this.focusCell.r || c !== this.focusCell.c) { this.focusCell = { r, c }; this.lastWindow = ''; this.render(); }
                }
            };
            document.addEventListener('mousemove', move);
        }

        onContextMenu(e) {
            const p = this.cellFromEvent(e);
            if (!p) return;
            e.preventDefault();
            if (!this.inSel(p.r, p.c)) this.setActive(p.r, p.c);
            this.a.cellMenu(p.r, p.c, { x: e.clientX, y: e.clientY });
        }

        onHeadMouseDown(e) {
            const h = e.target.closest('[data-c]');
            if (!h) return;
            const c = Number(h.dataset.c);
            if (e.target.closest('[data-menu]')) {
                e.preventDefault();
                // Sem isto o mesmo mousedown chega ao document e o fechador de menus fecha o menu recem-aberto.
                e.stopPropagation();
                this.selectColumns(c, c);
                this.a.headerMenu(c, e.target.closest('[data-menu]').getBoundingClientRect());
                return;
            }
            if (e.target.closest('[data-resize]')) {
                if (e.detail >= 2) { e.preventDefault(); this.autoFit(c); return; } // duplo clique na borda: autoajuste
                this.startResize(e, c);
                return;
            }
            if (e.button !== 0) return;
            e.preventDefault();
            if (this.editing) this.commitEdit();
            this.root.focus({ preventScroll: true });
            if (e.detail >= 2 && !e.shiftKey && this.a.renameColumn) { this.a.renameColumn(c); return; } // duplo clique: renomear
            if (e.shiftKey) this.selectColumns(Math.min(this.anchor.c, c), Math.max(this.anchor.c, c));
            else this.selectColumns(c, c);
        }

        onGutterMouseDown(e) {
            if (e.target.closest('.qg-check')) return;
            const g = e.target.closest('[data-r]');
            if (!g || e.button !== 0) return;
            e.preventDefault();
            this.root.focus({ preventScroll: true });
            const r = Number(g.dataset.r);
            if (e.shiftKey) this.selectRows(Math.min(this.anchor.r, r), Math.max(this.anchor.r, r));
            else this.selectRows(r, r);
        }

        startResize(e, c) {
            e.preventDefault();
            e.stopPropagation();
            const startX = e.clientX;
            const startW = this.widths[c];
            const move = (ev) => {
                const w = QS.clamp(startW + ev.clientX - startX, 48, 900);
                this.a.columns()[c].width = w;
                this.refresh();
            };
            const up = () => {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
                this.a.resizeColumn(c, this.a.columns()[c].width, startW);
            };
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
        }

        autoFit(c) {
            const col = this.a.columns()[c];
            const ctx = (this.measureCtx ||= document.createElement('canvas').getContext('2d'));
            ctx.font = '13px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
            let max = ctx.measureText(col.name).width + 64;
            const n = Math.min(this.rowCount, 400);
            const step = Math.max(1, Math.floor(this.rowCount / n));
            for (let r = 0; r < this.rowCount; r += step) {
                const text = QS.val.display(this.a.cell(r, c), col);
                max = Math.max(max, ctx.measureText(text.slice(0, 120)).width + 28);
            }
            const before = col.width;
            col.width = Math.round(QS.clamp(max, 60, 520));
            this.refresh();
            this.a.resizeColumn(c, col.width, before);
        }

        // ── Teclado ──────────────────────────────────────────────────────
        onKeyDown(e) {
            if (this.editing) return;
            const mod = e.ctrlKey || e.metaKey;
            const k = e.key;
            const page = Math.max(1, Math.floor(this.scroll.clientHeight / RH) - 1);
            const lastR = this.rowCount - 1;
            const lastC = this.widths.length - 1;
            const cur = e.shiftKey ? this.focusCell : this.active;
            let move = null;
            switch (k) {
                case 'ArrowUp': move = { r: mod ? 0 : cur.r - 1, c: cur.c }; break;
                case 'ArrowDown': move = { r: mod ? lastR : cur.r + 1, c: cur.c }; break;
                case 'ArrowLeft': move = { r: cur.r, c: mod ? 0 : cur.c - 1 }; break;
                case 'ArrowRight': move = { r: cur.r, c: mod ? lastC : cur.c + 1 }; break;
                case 'PageUp': move = { r: cur.r - page, c: cur.c }; break;
                case 'PageDown': move = { r: cur.r + page, c: cur.c }; break;
                case 'Home': move = { r: mod ? 0 : cur.r, c: 0 }; break;
                case 'End': move = { r: mod ? lastR : cur.r, c: lastC }; break;
                case 'Tab':
                    e.preventDefault();
                    this.setActive(this.active.r, this.active.c + (e.shiftKey ? -1 : 1));
                    return;
                case 'Enter':
                case 'F2':
                    e.preventDefault();
                    if (k === 'Enter' && e.shiftKey) { this.setActive(this.active.r - 1, this.active.c); return; }
                    this.startEdit();
                    return;
                case 'Delete':
                case 'Backspace':
                    e.preventDefault();
                    this.a.clearRange(this.sel());
                    return;
                case 'Escape':
                    this.setActive(this.active.r, this.active.c);
                    return;
                default:
                    if (mod && (k === 'a' || k === 'A')) { e.preventDefault(); this.selectAll(); return; }
                    if (!mod && !e.altKey && k.length === 1) { e.preventDefault(); this.startEdit(k); }
                    return;
            }
            if (move) {
                e.preventDefault();
                this.setActive(move.r, move.c, e.shiftKey);
            }
        }

        // ── Edicao ───────────────────────────────────────────────────────
        startEdit(initial) {
            if (this.editing || !this.rowCount || !this.widths.length) return;
            if (this.a.readOnly()) { this.a.onReadOnly(); return; }
            const { r, c } = this.active;
            this.ensureVisible(this.active);
            const col = this.a.columns()[c];
            const input = document.createElement('input');
            input.className = 'qg-editor';
            input.type = 'text';
            input.spellcheck = false;
            input.value = initial !== undefined ? initial : QS.val.editText(this.a.cell(r, c), col);
            this.sizer.appendChild(input);
            this.editing = { r, c, input, quick: initial !== undefined, original: input.value };
            this.positionEditor();
            input.focus();
            if (initial === undefined) input.select(); else input.setSelectionRange(input.value.length, input.value.length);
            input.addEventListener('keydown', (e) => this.onEditorKey(e));
            input.addEventListener('blur', () => { if (this.editing && this.editing.input === input) this.commitEdit(); });
        }

        positionEditor() {
            if (!this.editing) return;
            const { r, c, input } = this.editing;
            Object.assign(input.style, { left: `${this.xs[c]}px`, top: `${this.rowY(r)}px`, width: `${Math.max(this.widths[c], 120)}px`, height: `${RH}px` });
        }

        onEditorKey(e) {
            const ed = this.editing;
            if (!ed) return;
            const moves = { Enter: [1, 0], Tab: [0, 1] };
            if (e.key === 'Escape') { e.preventDefault(); this.cancelEdit(); return; }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const [dr, dc] = moves[e.key];
                const sign = e.shiftKey ? -1 : 1;
                this.commitEdit();
                this.setActive(ed.r + dr * sign, ed.c + dc * sign);
                return;
            }
            if (ed.quick && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
                this.commitEdit();
                this.setActive(ed.r + d[0], ed.c + d[1]);
            }
        }

        commitEdit() {
            const ed = this.editing;
            if (!ed) return;
            this.editing = null;
            const value = ed.input.value;
            ed.input.remove();
            if (value !== ed.original) this.a.commit(ed.r, ed.c, value);
            this.root.focus({ preventScroll: true });
        }

        cancelEdit() {
            const ed = this.editing;
            if (!ed) return;
            this.editing = null;
            ed.input.remove();
            this.root.focus({ preventScroll: true });
        }

        isEditing() { return !!this.editing; }
        focus() { this.root.focus({ preventScroll: true }); }

        // ── Area de transferencia ────────────────────────────────────────
        hasFocus() {
            const ae = document.activeElement;
            return ae === this.root && !this.editing;
        }

        handleClipboard(e, kind) {
            if (!this.hasFocus() || !this.rowCount) return;
            const s = this.sel();
            if (kind === 'copy' || kind === 'cut') {
                const columns = this.a.columns();
                const lines = [];
                const maxCells = 2_000_000;
                if ((s.r2 - s.r1 + 1) * (s.c2 - s.c1 + 1) > maxCells) { QS.ui.toast(QS.t('grid.copy_too_big'), 'error'); e.preventDefault(); return; }
                for (let r = s.r1; r <= s.r2; r += 1) {
                    const cells = [];
                    for (let c = s.c1; c <= s.c2; c += 1) {
                        const text = QS.val.editText(this.a.cell(r, c), columns[c]);
                        cells.push(/[\t\n\r"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
                    }
                    lines.push(cells.join('\t'));
                }
                e.clipboardData.setData('text/plain', lines.join('\r\n'));
                e.preventDefault();
                if (kind === 'cut') {
                    if (this.a.readOnly()) { this.a.onReadOnly(); return; }
                    this.a.clearRange(s);
                }
                QS.ui.toast(QS.t(kind === 'cut' ? 'grid.cut_done' : 'grid.copy_done', { n: QS.fmt.int((s.r2 - s.r1 + 1) * (s.c2 - s.c1 + 1)) }), 'info', { duration: 1800 });
                return;
            }
            const text = e.clipboardData.getData('text/plain');
            if (text === '') return;
            e.preventDefault();
            if (this.a.readOnly()) { this.a.onReadOnly(); return; }
            let matrix = QS.data.parseCSV(text.replace(/\r?\n$/, ''), '\t');
            if (!matrix.length) return;
            const single = matrix.length === 1 && matrix[0].length === 1;
            if (single && (s.r1 !== s.r2 || s.c1 !== s.c2)) {
                // Um valor colado sobre um intervalo preenche o intervalo todo (como no Excel).
                matrix = Array.from({ length: s.r2 - s.r1 + 1 }, () => new Array(s.c2 - s.c1 + 1).fill(matrix[0][0]));
            }
            this.a.paste(s.r1, s.c1, matrix);
        }
    }

    QS.Grid = Grid;
    QS.Grid.ROW_HEIGHT = RH;
    QS.Grid.GUTTER = GUTTER;
})();
