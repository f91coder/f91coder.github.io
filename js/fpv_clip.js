/**
 * FPV91 — "botao magico" (bookmarklet) para capturar produtos de qualquer loja.
 *
 * Por que existe: Shopee, Mercado Livre e AliExpress bloqueiam leitores automaticos (servidor) e o
 * AliExpress so entrega o preco por uma API assinada. O bookmarklet roda na pagina que o proprio
 * usuario esta vendo — onde o preco esta visivel — e leva os dados para o planner via URL.
 *
 * fpvClipRun precisa ser 100% auto-contida: ela e serializada com Function#toString e vira o
 * corpo do favorito. Por isso nao referencia nada fora dela e usa ponto e virgula explicito.
 */
function fpvClipRun(origin, dryRun) {
    try {
        var doc = document;
        var loc = location;
        var host = loc.hostname;

        function clean(value) {
            return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
        }
        function attr(el, name) {
            return el ? clean(el.getAttribute(name)) : "";
        }
        function meta(names) {
            for (var i = 0; i < names.length; i++) {
                var el = doc.querySelector('meta[property="' + names[i] + '"],meta[name="' + names[i] + '"],meta[itemprop="' + names[i] + '"]');
                var value = attr(el, "content");
                if (value) return value;
            }
            return "";
        }
        function absUrl(url) {
            url = clean(url);
            if (!url) return "";
            try {
                return new URL(url, loc.href).href;
            } catch (e) {
                return "";
            }
        }
        function pickImage(value) {
            if (!value) return "";
            if (typeof value === "string") return value;
            if (Array.isArray(value)) return pickImage(value[0]);
            return pickImage(value.url || value.contentUrl || "");
        }
        function detectCurrency(text) {
            text = String(text || "");
            if (/R\s?\$|BRL/i.test(text)) return "BRL";
            if (/US\s?\$|USD/i.test(text)) return "USD";
            if (/CN\s?¥|RMB|CNY|¥|￥/i.test(text)) return "CNY";
            if (/₲|PYG/i.test(text)) return "PYG";
            if (/\$/.test(text)) return "USD";
            return "";
        }
        function normalizeCurrency(code) {
            code = clean(code).toUpperCase();
            return /^(BRL|USD|CNY|PYG)$/.test(code) ? code : "";
        }

        var found = { name: "", image: "", priceText: "", currency: "" };

        // 1) JSON-LD (schema.org Product)
        function readProduct(node) {
            if (!node || typeof node !== "object") return;
            if (Array.isArray(node)) {
                node.forEach(readProduct);
                return;
            }
            var type = node["@type"];
            var types = Array.isArray(type) ? type : [type];
            if (types.indexOf("Product") !== -1 && !found.name) {
                found.name = clean(node.name);
                found.image = pickImage(node.image);
                var offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
                if (offer) {
                    var priceValue = offer.price != null ? offer.price : (offer.lowPrice != null ? offer.lowPrice : (offer.priceSpecification && offer.priceSpecification.price));
                    if (priceValue != null) found.priceText = clean(priceValue);
                    found.currency = normalizeCurrency(offer.priceCurrency);
                }
            }
            if (node["@graph"]) readProduct(node["@graph"]);
        }
        var scripts = doc.querySelectorAll('script[type="application/ld+json"]');
        for (var s = 0; s < scripts.length; s++) {
            try {
                readProduct(JSON.parse(scripts[s].textContent));
            } catch (e) {
                // JSON-LD malformado: ignora
            }
        }

        // 2) meta tags / microdata
        if (!found.priceText) {
            found.priceText = meta(["product:price:amount", "og:price:amount"]);
            if (found.priceText && !found.currency) {
                found.currency = normalizeCurrency(meta(["product:price:currency", "og:price:currency"]));
            }
        }
        if (!found.priceText) {
            var itemprop = doc.querySelector('[itemprop="price"]');
            found.priceText = itemprop ? (attr(itemprop, "content") || clean(itemprop.textContent)) : "";
            if (found.priceText && !found.currency) {
                found.currency = normalizeCurrency(meta(["priceCurrency"]));
            }
        }

        // 3) seletores especificos de loja
        var isAmazon = /(^|\.)amazon\./.test(host);
        var isML = /mercadoli(vre|bre)\./.test(host);
        var isAli = /aliexpress\./.test(host);
        var siteTitle = "";
        if (isAmazon) siteTitle = clean((doc.querySelector("#productTitle") || {}).textContent);
        if (isML) siteTitle = clean((doc.querySelector("h1.ui-pdp-title") || {}).textContent);
        if (isAli) siteTitle = clean((doc.querySelector('h1[data-pl="product-title"], h1') || {}).textContent);

        if (!found.priceText) {
            var selectors = [];
            if (isAmazon) {
                selectors = ["#corePrice_feature_div .a-price .a-offscreen", "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen", ".priceToPay .a-offscreen", "#apex_desktop .a-price .a-offscreen", "#priceblock_ourprice", "#priceblock_dealprice", "#price_inside_buybox"];
            } else if (isAli) {
                selectors = ['[class*="price-default--current"]', '[class*="Price--current"]', '[class*="price--current"]'];
            }
            for (var k = 0; k < selectors.length && !found.priceText; k++) {
                var priceEl = doc.querySelector(selectors[k]);
                if (priceEl) found.priceText = clean(priceEl.textContent);
            }
            if (!found.priceText && isML) {
                var mlBox = doc.querySelector(".ui-pdp-price__second-line .andes-money-amount, .andes-money-amount--cents-superscript");
                if (mlBox) {
                    var fraction = clean((mlBox.querySelector(".andes-money-amount__fraction") || {}).textContent);
                    var cents = clean((mlBox.querySelector(".andes-money-amount__cents") || {}).textContent);
                    if (fraction) found.priceText = "R$ " + fraction + (cents ? "," + cents : "");
                }
            }
        }

        // 4) heuristica: o maior preco visivel perto do topo, ignorando riscados (preco antigo) e vitrines
        if (!found.priceText) {
            var money = /^(?:R\s?\$|US\s?\$|CN\s?¥|¥|￥|₲|\$)\s?\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?$|^\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?\s?(?:R\$|USD|BRL|CNY)$/;
            var skipZones = "header,footer,nav,aside,[class*=recommend],[class*=carousel],[class*=related],[class*=similar],[class*=sponsor],[class*=Recommend],[class*=Related]";
            var all = doc.body ? doc.body.querySelectorAll("*") : [];
            var best = null;
            for (var n = 0; n < all.length && n < 6000; n++) {
                var node = all[n];
                if (node.children.length > 3) continue;
                var raw = clean(node.textContent);
                if (raw.length < 3 || raw.length > 24 || !money.test(raw)) continue;
                var rect = node.getBoundingClientRect();
                if (rect.width < 1 || rect.height < 1) continue;
                var top = rect.top + (window.pageYOffset || 0);
                if (top > 1800) continue;
                if (node.closest(skipZones)) continue;
                var struck = false;
                for (var up = node, depth = 0; up && depth < 4; up = up.parentElement, depth++) {
                    if (/line-through/.test(getComputedStyle(up).textDecorationLine || "")) {
                        struck = true;
                        break;
                    }
                    if (/^(S|DEL|STRIKE)$/.test(up.tagName)) {
                        struck = true;
                        break;
                    }
                }
                if (struck) continue;
                var size = parseFloat(getComputedStyle(node).fontSize) || 0;
                if (!best || size > best.size || (size === best.size && top < best.top)) {
                    best = { text: raw, size: size, top: top };
                }
            }
            if (best) found.priceText = best.text;
        }

        // Nome
        var title = found.name || meta(["og:title", "twitter:title"]) || siteTitle || clean((doc.querySelector("h1") || {}).textContent) || clean(doc.title);

        // Imagem
        var image = found.image || meta(["og:image", "twitter:image"]);
        if (!image && isAmazon) {
            var landing = doc.querySelector("#landingImage");
            image = attr(landing, "data-old-hires") || attr(landing, "src");
        }
        if (!image) {
            var bestImg = null;
            var imgs = doc.images;
            for (var m = 0; m < imgs.length; m++) {
                var w = imgs[m].naturalWidth || 0;
                var h = imgs[m].naturalHeight || 0;
                var r = imgs[m].getBoundingClientRect();
                if (w < 200 || h < 200 || r.width < 120 || (r.top + (window.pageYOffset || 0)) > 1400) continue;
                if (!bestImg || w * h > bestImg.area) bestImg = { src: imgs[m].currentSrc || imgs[m].src, area: w * h };
            }
            image = bestImg ? bestImg.src : "";
        }

        // Moeda
        var currency = found.currency || detectCurrency(found.priceText);
        if (!currency && found.priceText) {
            if (/\.com\.br$|\.br$/.test(host) || /^pt/i.test(doc.documentElement.lang || "")) currency = "BRL";
            else if (/\.py$/.test(host)) currency = "PYG";
            else if (/\.cn$/.test(host)) currency = "CNY";
        }

        // URL limpa (sem rastreadores)
        var link = loc.href.split("#")[0];
        try {
            var parsed = new URL(link);
            var amazonId = isAmazon ? parsed.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/) : null;
            if (amazonId) {
                link = parsed.origin + "/dp/" + amazonId[1];
            } else if (isAli || isML || /shopee\./.test(host)) {
                link = parsed.origin + parsed.pathname;
            } else {
                var drop = [];
                parsed.searchParams.forEach(function (value, key) {
                    if (/^(utm_|aff_|spm|algo_|gatewayAdapt|pdp_|scm|gclid|fbclid|ref$|ref_|tag$|pf_rd|pd_rd)/i.test(key)) drop.push(key);
                });
                drop.forEach(function (key) { parsed.searchParams.delete(key); });
                link = parsed.href;
            }
        } catch (e) {
            // mantem o href original
        }

        var payload = {
            v: 1,
            title: title.slice(0, 250),
            image: absUrl(image).slice(0, 600),
            price_text: clean(found.priceText).slice(0, 40),
            currency: currency,
            url: link.slice(0, 600),
            store: host.replace(/^www\./, "")
        };
        if (dryRun) return payload;

        var json = JSON.stringify(payload);
        var encoded = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        var target = origin + "/fpv/planner#import=" + encoded;
        var opened = window.open(target, "_blank");
        if (!opened) {
            loc.href = target;
        }
        return payload;
    } catch (error) {
        if (dryRun) throw error;
        alert("FPV91: não consegui ler esta página. Copie o link e cole no planner.");
    }
}

(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
    } else {
        root.FpvClip = api;
    }
})(typeof window !== "undefined" ? window : globalThis, function () {
    "use strict";

    /** Codigo do favorito, minificado de forma segura (o fonte usa ; explicito e so comentarios de linha inteira). */
    function bookmarkletCode(origin) {
        const source = fpvClipRun
            .toString()
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*\/\/.*$/gm, "")
            .replace(/\s*\n\s*/g, " ");
        // encodeURI mantem o codigo bem menor que encodeURIComponent; "#" precisa ser escapado a parte.
        return "javascript:" + encodeURI("(" + source + ")(" + JSON.stringify(origin) + ")").replace(/#/g, "%23");
    }

    /** Decodifica o fragmento "#import=<base64url>" produzido pelo bookmarklet; null se invalido. */
    function decodePayload(hash) {
        const match = /^#?import=([A-Za-z0-9_-]+)$/.exec(String(hash || ""));
        if (!match) return null;
        try {
            const base64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
            const padded = base64 + "===".slice((base64.length + 3) % 4);
            const json = decodeURIComponent(escape(atob(padded)));
            const payload = JSON.parse(json);
            if (!payload || payload.v !== 1 || typeof payload !== "object") return null;
            return {
                title: String(payload.title || "").slice(0, 250),
                image: String(payload.image || "").slice(0, 600),
                price_text: String(payload.price_text || "").slice(0, 40),
                currency: String(payload.currency || "").toUpperCase(),
                url: String(payload.url || "").slice(0, 600),
                store: String(payload.store || "").slice(0, 80),
            };
        } catch (error) {
            return null;
        }
    }

    return { run: fpvClipRun, bookmarkletCode, decodePayload };
});
