(() => {
    const nav = document.querySelector(".fpv-nav");
    if (!nav) return;

    // Pages with a dark hero (.fpv-hero on home, .fpv-page-hero elsewhere) start
    // with a transparent nav + white logo so it reads over the dark background,
    // and only switch to the light/solid nav once scrolled past that hero. Pages
    // with no hero (profile, admin) have a light background right under the nav
    // from the start, so they skip straight to the light nav state.
    const heroEl = document.querySelector(".fpv-hero, .fpv-page-hero");

    function updateNavState() {
        if (!heroEl) {
            nav.classList.add("is-scrolled");
            return;
        }
        const threshold = Math.max(heroEl.offsetHeight - 80, 24);
        nav.classList.toggle("is-scrolled", window.scrollY > threshold);
    }

    updateNavState();
    window.addEventListener("scroll", updateNavState, { passive: true });

    // ── Mobile menu ──────────────────────────────────────────────────────
    const mobileToggle = document.getElementById("fpvMobileToggle");
    const mobilePanel = document.getElementById("fpvMobilePanel");
    if (mobileToggle && mobilePanel) {
        mobileToggle.addEventListener("click", () => {
            const isOpen = mobilePanel.classList.toggle("is-open");
            mobileToggle.classList.toggle("is-open", isOpen);
            mobileToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
            document.body.classList.toggle("fpv-no-scroll", isOpen);
        });
        mobilePanel.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                mobilePanel.classList.remove("is-open");
                mobileToggle.classList.remove("is-open");
                document.body.classList.remove("fpv-no-scroll");
            });
        });
    }

    // ── GSAP: hero entrance + scroll reveals (only where GSAP is loaded) ──
    if (!window.gsap) return;

    gsap.set(nav, { opacity: 0, y: -16 });
    gsap.to(nav, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", delay: 0.1 });

    const hero = document.querySelector(".fpv-hero");
    if (hero) {
        const headline = hero.querySelector("h1");
        if (headline && !headline.dataset.split) {
            headline.dataset.split = "1";
            const wrapWord = (html) => `<span class="fpv-word"><span class="fpv-word-inner">${html}</span></span>`;
            const wordHtml = Array.from(headline.childNodes).map((node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    return node.textContent
                        .split(/\s+/)
                        .filter(Boolean)
                        .map((word) => wrapWord(word))
                        .join(" ");
                }
                // Element nodes (e.g. the <span> highlight) are kept intact as a single
                // reveal unit so their own styling/color survives the split.
                return wrapWord(node.outerHTML);
            }).join(" ");
            headline.innerHTML = wordHtml;
        }

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(hero.querySelectorAll(".fpv-eyebrow"), { opacity: 0, y: 14, duration: 0.6 }, 0.15);
        tl.from(hero.querySelectorAll(".fpv-word-inner"), {
            yPercent: 120,
            opacity: 0,
            duration: 0.9,
            stagger: 0.06,
        }, 0.25);
        tl.from(hero.querySelectorAll("p"), { opacity: 0, y: 16, duration: 0.7 }, "-=0.45");
        tl.from(hero.querySelectorAll(".fpv-hero-actions .fpv-btn"), {
            opacity: 0,
            y: 14,
            scale: 0.96,
            duration: 0.6,
            stagger: 0.1,
        }, "-=0.35");
        tl.from(hero.querySelectorAll(".fpv-hero-drone"), {
            opacity: 0,
            scale: 0.92,
            duration: 1.1,
            ease: "power2.out",
        }, 0.3);

        const drone = hero.querySelector(".fpv-hero-drone");
        if (drone) {
            gsap.to(drone, { y: 16, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.2 });

            if (window.ScrollTrigger) {
                gsap.to(drone, {
                    yPercent: 22,
                    ease: "none",
                    scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
                });
            }
        }
    }

    if (window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
        gsap.utils.toArray("[data-reveal]").forEach((el) => {
            const isGroup = el.hasAttribute("data-reveal-group");
            const targets = isGroup ? el.querySelectorAll("[data-reveal-item]") : el;
            gsap.from(targets, {
                opacity: 0,
                y: 26,
                duration: 0.7,
                ease: "power3.out",
                stagger: isGroup ? 0.08 : 0,
                scrollTrigger: { trigger: el, start: "top 87%" },
            });
        });
    }
})();
