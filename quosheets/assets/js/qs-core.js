/**
 * Quosheets — nucleo do front-end: i18n, formatacao por idioma, icones, toasts, modais, menus e API.
 * Os modulos seguintes (formula, data, ops, grid, charts, ai, app) penduram-se em window.QS.
 */
(() => {
    const boot = window.QS_BOOT || {};
    const lang = ['pt', 'en', 'es'].includes(boot.lang) ? boot.lang : 'pt';
    const dict = boot.dict || {};
    const LOCALE = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' }[lang];

    // ── i18n ──────────────────────────────────────────────────────────────
    function t(key, vars) {
        let text = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
        if (vars) {
            for (const [name, value] of Object.entries(vars)) {
                text = text.split(`{${name}}`).join(String(value));
            }
        }
        return text;
    }
    /** t() com plural: usa "<key>.one" quando n === 1, senao "<key>.other". */
    function tn(key, n, vars) {
        return t(`${key}.${n === 1 ? 'one' : 'other'}`, Object.assign({ n: fmtInt(n) }, vars || {}));
    }

    // ── Formatacao ────────────────────────────────────────────────────────
    const nfCache = new Map();
    function nf(minFrac, maxFrac) {
        const key = `${minFrac}|${maxFrac}`;
        if (!nfCache.has(key)) {
            nfCache.set(key, new Intl.NumberFormat(LOCALE, { minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac }));
        }
        return nfCache.get(key);
    }
    function fmtInt(n) { return nf(0, 0).format(Math.round(Number(n) || 0)); }
    function fmtNumber(n, maxFrac = 2) {
        if (typeof n !== 'number' || !Number.isFinite(n)) return '';
        return nf(0, maxFrac).format(n);
    }
    function fmtCurrency(amount, currency) {
        return new Intl.NumberFormat(LOCALE, { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
    }
    /** Data ISO (YYYY-MM-DD ou com hora) no formato do idioma. */
    function fmtDate(iso) {
        if (!iso || typeof iso !== 'string') return '';
        const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(iso);
        if (!m) return iso;
        const date = lang === 'en' ? `${m[2]}/${m[3]}/${m[1]}` : `${m[3]}/${m[2]}/${m[1]}`;
        return m[4] !== undefined && (m[4] !== '00' || m[5] !== '00') ? `${date} ${m[4]}:${m[5]}` : date;
    }
    function fmtDateTime(isoUtc) {
        if (!isoUtc) return '';
        const d = new Date(isoUtc);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    /** So a data (sem hora) de um instante ISO/UTC, no formato do idioma. */
    function fmtDay(isoUtc) {
        if (!isoUtc) return '';
        const d = new Date(isoUtc);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    function relTime(isoOrMs) {
        const ms = typeof isoOrMs === 'number' ? isoOrMs : new Date(isoOrMs).getTime();
        const diff = (Date.now() - ms) / 1000;
        const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
        if (diff < 60) return rtf.format(-Math.round(diff), 'second');
        if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
        if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
        if (diff < 86400 * 30) return rtf.format(-Math.round(diff / 86400), 'day');
        return new Date(ms).toLocaleDateString(LOCALE);
    }
    function fmtBytes(bytes) {
        if (!bytes) return '0 KB';
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        let v = bytes;
        while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
        return `${fmtNumber(v, i ? 1 : 0)} ${units[i]}`;
    }

    // ── Utilitarios ───────────────────────────────────────────────────────
    function esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function debounce(fn, ms) {
        let timer = null;
        const wrapped = (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
        wrapped.flush = () => { clearTimeout(timer); fn(); };
        return wrapped;
    }
    function uid(prefix = '') {
        const rnd = crypto.getRandomValues(new Uint32Array(2));
        return prefix + rnd[0].toString(36) + rnd[1].toString(36);
    }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    function download(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
    function safeFilename(name, ext) {
        const base = String(name || 'quosheets').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'quosheets';
        return `${base}.${ext}`;
    }
    function el(html) {
        const tpl = document.createElement('template');
        tpl.innerHTML = html.trim();
        return tpl.content.firstElementChild;
    }
    function storageGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
    function storageSet(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* modo privado */ } }

    // ── Icones (subconjunto Lucide em QS_ICONS) ───────────────────────────
    function icon(name, size = 18, cls = '') {
        const inner = (window.QS_ICONS || {})[name] || '';
        return `<svg class="qi ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
    }
    /** Troca <i data-icon="nome"> por SVG dentro de um container. */
    function hydrateIcons(root = document) {
        root.querySelectorAll('i[data-icon]').forEach((node) => {
            const size = Number(node.dataset.size) || 18;
            node.outerHTML = icon(node.dataset.icon, size, node.className || '');
        });
    }

    // ── Toasts ────────────────────────────────────────────────────────────
    function toast(message, type = 'success', opts = {}) {
        let host = document.getElementById('qs-toasts');
        if (!host) {
            host = el('<div id="qs-toasts" class="qs-toasts" role="status" aria-live="polite"></div>');
            document.body.appendChild(host);
        }
        const icons = { success: 'circle-check', error: 'triangle-alert', info: 'info', ai: 'sparkles' };
        const node = el(`<div class="qs-toast is-${type}">${icon(icons[type] || 'info', 18)}<span></span></div>`);
        node.querySelector('span').textContent = message;
        if (opts.action) {
            const btn = el(`<button type="button" class="qs-toast-action"></button>`);
            btn.textContent = opts.action.label;
            btn.addEventListener('click', () => { opts.action.onClick(); dismiss(); });
            node.appendChild(btn);
        }
        host.appendChild(node);
        const dismiss = () => { node.classList.add('is-leaving'); setTimeout(() => node.remove(), 250); };
        setTimeout(dismiss, opts.duration || (type === 'error' ? 6000 : 3800));
        return dismiss;
    }

    // ── Modais ────────────────────────────────────────────────────────────
    const openModals = [];
    /**
     * modal({title, subtitle, icon, body: Node|string, size: 'sm'|'md'|'lg'|'xl', actions: [{label, kind, id, onClick}], onClose})
     * onClick recebe o modal e pode retornar false para nao fechar.
     */
    function modal(opts) {
        const overlay = el(`<div class="qs-modal-overlay" role="presentation">
            <div class="qs-modal is-${opts.size || 'md'}" role="dialog" aria-modal="true">
                <div class="qs-modal-head">
                    <div class="qs-modal-title">${opts.icon ? `<span class="qs-modal-icon">${icon(opts.icon, 20)}</span>` : ''}<div><h3></h3>${opts.subtitle ? '<p></p>' : ''}</div></div>
                    <button type="button" class="qs-icon-btn" data-close aria-label="${esc(t('common.close'))}">${icon('x', 20)}</button>
                </div>
                <div class="qs-modal-body"></div>
                ${opts.actions && opts.actions.length ? '<div class="qs-modal-foot"></div>' : ''}
            </div>
        </div>`);
        const box = overlay.querySelector('.qs-modal');
        overlay.querySelector('h3').textContent = opts.title || '';
        if (opts.subtitle) overlay.querySelector('.qs-modal-title p').textContent = opts.subtitle;
        const body = overlay.querySelector('.qs-modal-body');
        if (typeof opts.body === 'string') body.innerHTML = opts.body; else if (opts.body) body.appendChild(opts.body);

        const api = {
            el: overlay,
            body,
            close() {
                if (!overlay.isConnected) return;
                overlay.classList.add('is-leaving');
                setTimeout(() => overlay.remove(), 160);
                const idx = openModals.indexOf(api);
                if (idx >= 0) openModals.splice(idx, 1);
                if (opts.onClose) opts.onClose();
                if (api.returnFocus && api.returnFocus.focus) api.returnFocus.focus();
            },
            setBusy(busy) { box.classList.toggle('is-busy', busy); box.querySelectorAll('.qs-modal-foot button').forEach((b) => { b.disabled = busy; }); },
            button(id) { return box.querySelector(`.qs-modal-foot [data-action-id="${id}"]`); },
        };
        api.returnFocus = document.activeElement;

        if (opts.actions) {
            const foot = overlay.querySelector('.qs-modal-foot');
            opts.actions.forEach((action) => {
                const btn = el(`<button type="button" class="qs-btn ${action.kind === 'primary' ? 'qs-btn-primary' : action.kind === 'danger' ? 'qs-btn-danger' : 'qs-btn-ghost'}"></button>`);
                if (action.id) btn.dataset.actionId = action.id;
                btn.innerHTML = `${action.icon ? icon(action.icon, 16) : ''}<span></span>`;
                btn.querySelector('span').textContent = action.label;
                btn.addEventListener('click', async () => {
                    if (!action.onClick) { api.close(); return; }
                    const result = await action.onClick(api);
                    if (result !== false) api.close();
                });
                foot.appendChild(btn);
            });
        }
        overlay.addEventListener('mousedown', (e) => { if (e.target === overlay && opts.dismissible !== false) api.close(); });
        overlay.querySelector('[data-close]').addEventListener('click', () => api.close());
        document.body.appendChild(overlay);
        openModals.push(api);
        requestAnimationFrame(() => {
            overlay.classList.add('is-open');
            const focusable = body.querySelector('[autofocus], input:not([type=hidden]), select, textarea');
            (focusable || overlay.querySelector('.qs-modal-foot .qs-btn-primary') || box).focus?.();
        });
        return api;
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && openModals.length) {
            e.stopPropagation();
            openModals[openModals.length - 1].close();
        }
    }, true);

    function confirmDialog(message, opts = {}) {
        return new Promise((resolve) => {
            let answered = false;
            const body = el('<p class="qs-confirm-text"></p>');
            body.textContent = message;
            modal({
                title: opts.title || t('common.confirm'),
                icon: opts.danger ? 'triangle-alert' : opts.icon,
                size: 'sm',
                body,
                actions: [
                    { label: t('common.cancel'), onClick: () => { answered = true; resolve(false); } },
                    { label: opts.okLabel || t('common.confirm'), kind: opts.danger ? 'danger' : 'primary', onClick: () => { answered = true; resolve(true); } },
                ],
                onClose: () => { if (!answered) resolve(false); },
            });
        });
    }

    function promptDialog(title, opts = {}) {
        return new Promise((resolve) => {
            let answered = false;
            const body = el(`<label class="qs-field"><span class="qs-label"></span><input type="text" class="qs-input" maxlength="${opts.maxLength || 120}"></label>`);
            body.querySelector('.qs-label').textContent = opts.label || '';
            const input = body.querySelector('input');
            input.value = opts.value || '';
            input.placeholder = opts.placeholder || '';
            const submit = (api) => {
                const value = input.value.trim();
                if (!value && !opts.allowEmpty) { input.focus(); return false; }
                answered = true;
                resolve(value);
                return true;
            };
            const m = modal({
                title,
                size: 'sm',
                body,
                actions: [
                    { label: t('common.cancel'), onClick: () => { answered = true; resolve(null); } },
                    { label: opts.okLabel || t('common.save'), kind: 'primary', onClick: submit },
                ],
                onClose: () => { if (!answered) resolve(null); },
            });
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && submit(m)) m.close(); });
            setTimeout(() => { input.focus(); input.select(); }, 30);
        });
    }

    // ── Menus flutuantes ──────────────────────────────────────────────────
    let openMenu = null;
    function closeMenu() {
        if (openMenu) { openMenu.remove(); openMenu = null; }
    }
    /** menu({x, y} | DOMRect, items[{label, icon, onClick, danger, disabled, divider, hint, checked}]) */
    function menu(anchor, items, opts = {}) {
        closeMenu();
        const node = el('<div class="qs-menu" role="menu"></div>');
        items.forEach((item) => {
            if (!item) return;
            if (item.divider) { node.appendChild(el('<div class="qs-menu-divider" role="separator"></div>')); return; }
            if (item.heading) { const h = el('<div class="qs-menu-heading"></div>'); h.textContent = item.heading; node.appendChild(h); return; }
            const btn = el(`<button type="button" role="menuitem" class="qs-menu-item${item.danger ? ' is-danger' : ''}">${item.icon ? icon(item.icon, 16) : '<span class="qi-spacer"></span>'}<span class="qs-menu-label"></span>${item.hint ? '<span class="qs-menu-hint"></span>' : ''}${item.checked ? icon('check', 15, 'qs-menu-check') : ''}</button>`);
            btn.querySelector('.qs-menu-label').textContent = item.label;
            if (item.hint) btn.querySelector('.qs-menu-hint').textContent = item.hint;
            btn.disabled = !!item.disabled;
            btn.addEventListener('click', (e) => { e.stopPropagation(); closeMenu(); item.onClick && item.onClick(); });
            node.appendChild(btn);
        });
        document.body.appendChild(node);
        const rect = anchor instanceof DOMRect || (anchor && 'bottom' in anchor)
            ? { x: opts.alignRight ? anchor.right : anchor.left, y: anchor.bottom + 4 }
            : anchor;
        const w = node.offsetWidth;
        const h = node.offsetHeight;
        let x = opts.alignRight ? rect.x - w : rect.x;
        let y = rect.y;
        if (x + w > window.innerWidth - 8) x = window.innerWidth - w - 8;
        if (y + h > window.innerHeight - 8) y = Math.max(8, (anchor.top !== undefined ? anchor.top - h - 4 : y - h));
        node.style.left = `${Math.max(8, x)}px`;
        node.style.top = `${Math.max(8, y)}px`;
        openMenu = node;
        const first = node.querySelector('.qs-menu-item:not(:disabled)');
        if (first && opts.focus !== false) first.focus();
        return node;
    }
    document.addEventListener('mousedown', (e) => { if (openMenu && !openMenu.contains(e.target)) closeMenu(); });
    document.addEventListener('keydown', (e) => {
        if (!openMenu) return;
        if (e.key === 'Escape') { closeMenu(); e.stopPropagation(); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const items = [...openMenu.querySelectorAll('.qs-menu-item:not(:disabled)')];
            const idx = items.indexOf(document.activeElement);
            const next = items[(idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
            if (next) { next.focus(); e.preventDefault(); }
        }
    }, true);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('blur', closeMenu);

    // ── API ───────────────────────────────────────────────────────────────
    const API_URL = '/php/quosheets/api.php';
    class ApiError extends Error {
        constructor(message, code, status, data) { super(message); this.code = code; this.status = status; this.data = data; }
    }
    async function api(action, body, opts = {}) {
        const method = opts.method || (body === undefined ? 'GET' : 'POST');
        let response;
        try {
            response = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
                method,
                credentials: 'same-origin',
                headers: Object.assign({ 'X-QS-Lang': lang }, method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
                body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
                signal: opts.signal,
            });
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            throw new ApiError(t('err.network'), 'network', 0, {});
        }
        let data;
        try { data = await response.json(); } catch (e) { data = { ok: false, error: 'server_error', message: t('err.server_error') }; }
        if (!data.ok) {
            if (response.status === 401 && !opts.allow401) {
                window.location.href = `${boot.basePath || '/quosheets'}/login?next=${encodeURIComponent(location.pathname + location.search)}`;
            }
            throw new ApiError(data.message || t('err.server_error'), data.error || 'server_error', response.status, data);
        }
        return data;
    }

    window.QS = Object.assign(window.QS || {}, {
        boot, lang, LOCALE, t, tn, esc, debounce, uid, clamp, download, safeFilename, el,
        storageGet, storageSet, icon, hydrateIcons,
        fmt: { int: fmtInt, number: fmtNumber, currency: fmtCurrency, date: fmtDate, dateTime: fmtDateTime, day: fmtDay, rel: relTime, bytes: fmtBytes },
        ui: { toast, modal, confirm: confirmDialog, prompt: promptDialog, menu, closeMenu },
        api, ApiError,
    });
})();
