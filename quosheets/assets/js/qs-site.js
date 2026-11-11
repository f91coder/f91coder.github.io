/**
 * Quosheets — site publico: landing (animacoes, sugestao de idioma, menus) e formularios de conta
 * (cadastro, login, confirmacao por codigo, esqueci a senha, nova senha).
 */
(() => {
    const boot = window.QS_BOOT || {};
    const dict = boot.dict || {};
    const lang = ['pt', 'en', 'es'].includes(boot.lang) ? boot.lang : (document.documentElement.lang || 'pt').slice(0, 2);
    const base = boot.basePath || '/quosheets';
    const t = (key, vars) => {
        let text = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
        Object.entries(vars || {}).forEach(([k, v]) => { text = text.split(`{${k}}`).join(String(v)); });
        return text;
    };
    const storage = {
        get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
        set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* modo privado */ } },
    };

    // ── Cabecalho com sombra ao rolar e menus de idioma ───────────────────
    const header = document.querySelector('.qs-site-header');
    if (header) {
        const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }
    document.addEventListener('click', (e) => {
        document.querySelectorAll('details.qs-lang[open]').forEach((d) => { if (!d.contains(e.target)) d.removeAttribute('open'); });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') document.querySelectorAll('details.qs-lang[open]').forEach((d) => d.removeAttribute('open'));
    });

    // ── Animacao de entrada (respeita "reduzir movimento") ────────────────
    const reveal = document.querySelectorAll('.qs-feature, .qs-ai-card, .qs-pain, .qs-steps li, .qs-use, .qs-price-card, .qs-check-list li');
    if (reveal.length && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.classList.add('qs-anim');
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
        reveal.forEach((node, i) => { node.style.setProperty('--qs-delay', `${(i % 4) * 70}ms`); io.observe(node); });
        // Impressao (ou qualquer leitura fora da rolagem normal) mostra tudo de uma vez.
        window.addEventListener('beforeprint', () => reveal.forEach((node) => node.classList.add('is-visible')));
    }

    // ── Sugestao de idioma na landing (/quosheets/ e pt; navegador em en/es) ──
    if (document.querySelector('.qs-hero') && !storage.get('qs_lang_hint')) {
        const browser = (navigator.languages && navigator.languages[0]) || navigator.language || '';
        const code = browser.slice(0, 2).toLowerCase();
        const offers = {
            en: { text: 'This page is also available in English.', go: 'View in English', href: `${base}/en/` },
            es: { text: 'Esta página también está disponible en español.', go: 'Ver en español', href: `${base}/es/` },
            pt: { text: 'Esta página também está disponível em português.', go: 'Ver em português', href: `${base}/` },
        };
        if (offers[code] && code !== lang) {
            const offer = offers[code];
            const bar = document.createElement('div');
            bar.className = 'qs-lang-hint';
            bar.setAttribute('role', 'region');
            bar.innerHTML = '<span></span><a class="qs-btn qs-btn-primary qs-btn-sm"></a><button type="button" class="qs-lang-hint-x" aria-label="Close">×</button>';
            bar.querySelector('span').textContent = offer.text;
            const link = bar.querySelector('a');
            link.textContent = offer.go;
            link.href = offer.href;
            const dismiss = () => { storage.set('qs_lang_hint', '1'); bar.remove(); };
            link.addEventListener('click', () => storage.set('qs_lang_hint', '1'));
            bar.querySelector('button').addEventListener('click', dismiss);
            document.body.appendChild(bar);
            requestAnimationFrame(() => bar.classList.add('is-open'));
        }
    }

    // ── Formularios de conta ──────────────────────────────────────────────
    async function api(action, body) {
        let response;
        try {
            response = await fetch(`/php/quosheets/api.php?action=${encodeURIComponent(action)}`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'X-QS-Lang': lang },
                body: JSON.stringify(Object.assign({ lang }, body)),
            });
        } catch (e) {
            const err = new Error(t('err.network')); err.code = 'network'; throw err;
        }
        let data;
        try { data = await response.json(); } catch (e) { data = { ok: false, error: 'server_error', message: t('err.server_error') }; }
        if (!data.ok) {
            const err = new Error(data.message || t('err.server_error'));
            err.code = data.error || 'server_error';
            err.data = data;
            throw err;
        }
        return data;
    }

    const urlFor = (page, params) => {
        const q = new URLSearchParams(Object.assign({ lang }, params || {}));
        return `${base}/${page}?${q.toString()}`;
    };

    function setBusy(form, busy) {
        const btn = form.querySelector('[type=submit]');
        if (!btn) return;
        btn.disabled = busy;
        btn.classList.toggle('is-loading', busy);
    }
    function showError(form, message) {
        const box = form.querySelector('.qs-form-error');
        if (!box) return;
        box.textContent = message || '';
        box.hidden = !message;
    }
    function showSuccess(form, message) {
        const box = form.querySelector('.qs-form-success');
        if (!box) return;
        if (message) box.textContent = message;
        box.hidden = false;
    }

    function validate(form) {
        for (const input of form.querySelectorAll('input[required]')) {
            if (input.type === 'checkbox' ? !input.checked : !input.value.trim()) {
                input.focus();
                return input.type === 'checkbox' ? t('err.terms_required') : t('auth.fill_required');
            }
            if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) { input.focus(); return t('err.invalid_email'); }
            if (input.minLength > 0 && input.value.length < input.minLength) { input.focus(); return t('err.weak_password'); }
        }
        return '';
    }

    const handlers = {
        async register(form) {
            const email = form.email.value.trim();
            await api('register', { name: form.name.value.trim(), email, password: form.password.value, accept_terms: form.accept_terms.checked });
            window.location.href = urlFor('verify', { email });
        },
        async login(form) {
            const email = form.email.value.trim();
            try {
                const res = await api('login', { email, password: form.password.value, next: boot.next || '' });
                window.location.href = res.redirect;
            } catch (err) {
                if (err.code === 'not_verified') { window.location.href = urlFor('verify', { email: (err.data && err.data.email) || email, sent: '1' }); return; }
                throw err;
            }
        },
        async verify(form) {
            const email = form.email.value.trim();
            try {
                const res = await api('verify', { email, code: form.code.value });
                window.location.href = res.redirect;
            } catch (err) {
                if (err.code === 'already_verified') { window.location.href = urlFor('login', { email }); return; }
                form.code.select();
                throw err;
            }
        },
        async forgot(form) {
            await api('forgot', { email: form.email.value.trim() });
            showSuccess(form);
            form.querySelectorAll('input, button[type=submit]').forEach((el) => { el.disabled = true; });
        },
        async reset(form) {
            const res = await api('reset', { token: form.token.value, password: form.password.value });
            window.location.href = res.redirect;
        },
    };

    document.querySelectorAll('form[data-auth]').forEach((form) => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = validate(form);
            showError(form, message);
            if (message) return;
            setBusy(form, true);
            try {
                await handlers[form.dataset.auth](form);
            } catch (err) {
                showError(form, err.message);
                setBusy(form, false);
            }
        });
    });

    // Codigo de 6 digitos: so numeros e envio automatico ao completar
    const code = document.querySelector('.qs-code-input');
    if (code) {
        code.addEventListener('input', () => {
            code.value = code.value.replace(/\D+/g, '').slice(0, 6);
            if (code.value.length === 6) code.form.requestSubmit();
        });
    }

    // Reenviar codigo
    const resend = document.querySelector('[data-resend]');
    if (resend) {
        resend.addEventListener('click', async () => {
            const form = document.querySelector('form[data-auth="verify"]');
            const email = form.email.value.trim();
            if (!email) { form.email.focus(); return; }
            resend.disabled = true;
            try {
                await api('resendCode', { email });
                showError(form, '');
                const note = document.querySelector('[data-resend-note]');
                if (note) { note.hidden = false; note.textContent = t('auth.code_resent'); }
            } catch (err) {
                showError(form, err.message);
            }
            setTimeout(() => { resend.disabled = false; }, 45000);
        });
    }

    // Mostrar/ocultar senha
    document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            btn.classList.toggle('is-on', show);
            btn.setAttribute('aria-label', show ? t('auth.hide_password') : t('auth.show_password'));
        });
    });
})();
