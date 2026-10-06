/**
 * FPV91 — hero da landing: video de fundo com revelacao no cursor (efeito de oculos/visor FPV).
 *
 * - Sem cursor: o video fica escurecido e so um "olho" bem pequeno aparece.
 * - Com o cursor sobre o hero: a abertura cresce (iris), o reticulo trava no ponto e o horizonte
 *   acompanha o cursor (roll/pitch) e o "km/h" reage a velocidade do movimento.
 * - Celular/tablet (sem mouse): a lente passeia sozinha pelo video, para o efeito aparecer tambem.
 * Puro JS, sem dependencias. Sem JS o hero continua funcionando (so o video e o texto).
 */
(() => {
    const hero = document.getElementById("fpvHero");
    if (!hero) return;

    const cinema = document.getElementById("fpvCinema");
    const lens = document.getElementById("fpvLens");
    const speedEl = document.getElementById("fpvSpeed");
    const timerEl = document.getElementById("fpvTimer");
    const video = cinema ? cinema.querySelector("video") : null;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touchOnly = window.matchMedia("(hover: none)").matches;

    // ── Video: muted + playsinline; iOS so libera o autoplay com a chamada explicita ──
    if (video) {
        video.muted = true;
        const started = video.play();
        if (started && typeof started.catch === "function") started.catch(() => {});
        video.addEventListener("error", () => hero.classList.add("is-no-video"));
    }

    // ── Relogio do REC ──
    const startedAt = performance.now();
    if (timerEl) {
        const pad = (n) => String(n).padStart(2, "0");
        const tick = () => {
            const total = Math.floor((performance.now() - startedAt) / 1000);
            timerEl.textContent = `${pad(Math.floor(total / 60) % 100)}:${pad(total % 60)}`;
        };
        tick();
        window.setInterval(tick, 1000);
    }

    // ── Estado da lente (posicao e raio em px, suavizados por frame) ──
    const state = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        r: 0,
        tx: window.innerWidth / 2,
        ty: window.innerHeight / 2,
        tr: 0,
        speed: 0,
        shownSpeed: -1,
        lastMoveAt: 0,
        dist: 0,
        lastEventAt: performance.now(),
        active: false,   // cursor/dedo sobre o hero
        running: false,
    };

    const openRadius = () => Math.min(Math.min(window.innerWidth, window.innerHeight) * 0.42, 430);
    const driftRadius = () => Math.min(window.innerWidth, window.innerHeight) * 0.3;

    function setLiveClasses(live, on) {
        hero.classList.toggle("is-live", live);
        hero.classList.toggle("is-lens-on", on);
    }

    function decideTargets(now) {
        const w = window.innerWidth;
        const h = window.innerHeight;

        if (state.active) {
            state.tr = openRadius();
            setLiveClasses(true, true);
            return;
        }

        // Celular: sem cursor, a lente passeia pelo video em curvas lentas.
        if (touchOnly && !reduceMotion) {
            const t = now / 1000;
            // Passeia pela metade direita: a esquerda e onde fica o texto.
            state.tx = w * (0.7 + 0.2 * Math.sin(t * 0.37));
            state.ty = h * (0.5 + 0.2 * Math.sin(t * 0.53 + 1.3));
            state.tr = driftRadius() * (0.92 + 0.08 * Math.sin(t * 0.9));
            setLiveClasses(true, true);
            return;
        }

        // Desktop com o cursor fora do hero: a lente fecha.
        state.tr = 0;
        setLiveClasses(false, state.r > 1);
    }

    function applyFrame() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const r = Math.max(0, state.r);

        if (cinema) {
            cinema.style.setProperty("--fx", `${state.x.toFixed(1)}px`);
            cinema.style.setProperty("--fy", `${state.y.toFixed(1)}px`);
            cinema.style.setProperty("--fr", `${r.toFixed(1)}px`);
        }
        if (video) {
            // Leve paralaxe: o video "responde" ao cursor, como uma camera que gira.
            const dx = ((state.x - w / 2) / w) * -18;
            const dy = ((state.y - h / 2) / h) * -12;
            video.style.setProperty("--px", `${dx.toFixed(2)}px`);
            video.style.setProperty("--py", `${dy.toFixed(2)}px`);
        }
        if (lens) {
            lens.style.width = `${(r * 2).toFixed(1)}px`;
            lens.style.height = `${(r * 2).toFixed(1)}px`;
            lens.style.left = `${state.x.toFixed(1)}px`;
            lens.style.top = `${state.y.toFixed(1)}px`;
            // Atitude: o horizonte inclina pelo deslocamento horizontal e sobe/desce pelo vertical.
            const roll = ((state.x - w / 2) / (w / 2)) * 12;
            const pitch = -((state.y - h / 2) / (h / 2)) * 16;
            lens.style.setProperty("--roll", `${roll.toFixed(2)}deg`);
            lens.style.setProperty("--pitch", `${pitch.toFixed(2)}px`);
        }
        if (speedEl) {
            const kmh = Math.min(199, Math.round(state.speed * 0.06));
            if (kmh !== state.shownSpeed) {
                state.shownSpeed = kmh;
                speedEl.textContent = String(kmh);
            }
        }
    }

    function frame(now) {
        decideTargets(now);

        // Velocidade do cursor (px/s), suavizada, alimenta o "km/h".
        const dt = Math.max(1, now - state.lastEventAt);
        const instant = (state.dist / dt) * 1000;
        state.speed += (instant - state.speed) * 0.12;
        state.dist = 0;
        state.lastEventAt = now;

        // Iris: abre um pouco mais devagar do que fecha. Sem movimento reduzido, suaviza.
        const k = reduceMotion ? 1 : 0.14;
        const kr = reduceMotion ? 1 : (state.tr > state.r ? 0.085 : 0.1);
        state.x += (state.tx - state.x) * k;
        state.y += (state.ty - state.y) * k;
        state.r += (state.tr - state.r) * kr;
        if (state.r < 0.4) state.r = 0;

        applyFrame();

        const settled = !state.active && state.r === 0 && Math.abs(state.speed) < 0.5 && !touchOnly;
        if (settled) {
            state.running = false;
            setLiveClasses(false, false);
            return;
        }
        window.requestAnimationFrame(frame);
    }

    function kick() {
        if (state.running) return;
        state.running = true;
        state.lastEventAt = performance.now();
        window.requestAnimationFrame(frame);
    }

    // ── Entrada: cursor / dedo ──
    hero.addEventListener("pointermove", (event) => {
        const dx = event.clientX - state.tx;
        const dy = event.clientY - state.ty;
        state.dist += Math.hypot(dx, dy);
        state.tx = event.clientX;
        state.ty = event.clientY;
        if (!state.active) {
            // Primeiro contato: a iris abre a partir do proprio ponto, sem "voar" da posicao antiga.
            state.x = event.clientX;
            state.y = event.clientY;
        }
        state.active = true;
        state.lastMoveAt = performance.now();
        kick();
    });

    hero.addEventListener("pointerleave", () => {
        state.active = false;
        kick();
    });

    hero.addEventListener("pointercancel", () => {
        state.active = false;
        kick();
    });

    window.addEventListener("resize", () => {
        state.tx = Math.min(Math.max(state.tx, 0), window.innerWidth);
        state.ty = Math.min(Math.max(state.ty, 0), window.innerHeight);
        applyFrame();
    });

    // Estado inicial: lente fechada; no celular ja comeca a passear.
    applyFrame();
    if (touchOnly && !reduceMotion) kick();
})();
