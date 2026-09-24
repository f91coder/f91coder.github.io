/**
 * FPV91 — moedas, cotacoes e conversao.
 *
 * Modulo puro (sem DOM) para que a matematica financeira possa ser testada em Node.
 * Convencao: os valores no banco e na logica do planner estao SEMPRE em BRL; as demais moedas
 * existem para exibir e para digitar valores (ex.: preco em USD/CNY numa loja chinesa).
 * As cotacoes vem da open.er-api.com com base USD: rates[X] = quantas unidades de X valem 1 USD.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
    } else {
        root.FpvMoney = api;
    }
})(typeof window !== "undefined" ? window : globalThis, function () {
    "use strict";

    const RATES_API_URL = "https://open.er-api.com/v6/latest/USD";
    const RATES_CACHE_KEY = "f91_fpv_rates_cache_v2";
    const RATES_CACHE_TTL_MS = 30 * 60 * 1000;

    const CURRENCIES = {
        BRL: { code: "BRL", symbol: "R$", label: "Real", unit: 1, decimals: 2 },
        USD: { code: "USD", symbol: "US$", label: "Dólar", unit: 1, decimals: 2 },
        CNY: { code: "CNY", symbol: "¥", label: "Yuan", unit: 1, decimals: 2 },
        PYG: { code: "PYG", symbol: "₲", label: "Guarani", unit: 1000, decimals: 0 },
    };
    const CODES = Object.keys(CURRENCIES);

    function isSupported(code) {
        return Object.prototype.hasOwnProperty.call(CURRENCIES, code);
    }

    /** Converte a resposta da API na estrutura interna; null se faltar a base (BRL). */
    function parseRates(data, now) {
        if (!data || data.result !== "success" || !data.rates || !(data.rates.BRL > 0)) {
            return null;
        }
        const rates = { USD: 1, BRL: Number(data.rates.BRL), fetchedAt: now || Date.now() };
        ["CNY", "PYG"].forEach((code) => {
            rates[code] = data.rates[code] > 0 ? Number(data.rates[code]) : null;
        });
        return rates;
    }

    function hasRate(rates, code) {
        return !!rates && isSupported(code) && (code === "BRL" || Number(rates[code]) > 0);
    }

    /** Quantos BRL vale 1 unidade da moeda `code`. */
    function brlPerUnit(rates, code) {
        if (code === "BRL") return 1;
        if (!hasRate(rates, code)) return null;
        return rates.BRL / rates[code];
    }

    /** amount (na moeda `code`) -> BRL, arredondado em centavos. null se nao houver cotacao. */
    function toBrl(rates, amount, code) {
        const value = Number(amount);
        if (!Number.isFinite(value)) return null;
        const perUnit = brlPerUnit(rates, code);
        if (perUnit === null) return null;
        return Math.round(value * perUnit * 100) / 100;
    }

    /** BRL -> valor na moeda `code` (sem arredondar; a formatacao arredonda). null sem cotacao. */
    function fromBrl(rates, brl, code) {
        const value = Number(brl);
        if (!Number.isFinite(value)) return null;
        const perUnit = brlPerUnit(rates, code);
        if (perUnit === null) return null;
        return value / perUnit;
    }

    function groupNumber(value, locale, decimals) {
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(value);
    }

    /** Formata um valor JA na moeda `code`. */
    function format(amount, code) {
        const value = Number(amount) || 0;
        switch (code) {
            case "USD":
                return "US$ " + groupNumber(value, "en-US", 2);
            case "CNY":
                return "¥ " + groupNumber(value, "en-US", 2);
            case "PYG":
                return "₲ " + groupNumber(Math.round(value), "pt-BR", 0);
            case "BRL":
            default:
                return "R$ " + groupNumber(value, "pt-BR", 2);
        }
    }

    /** Valor em BRL -> texto na moeda de exibicao (cai para BRL se nao houver cotacao). */
    function formatFromBrl(rates, brl, displayCode) {
        if (displayCode === "BRL" || !hasRate(rates, displayCode)) {
            return format(brl, "BRL");
        }
        return format(fromBrl(rates, brl, displayCode), displayCode);
    }

    /** Texto de cotacao: "R$ 5,10" para 1 USD, "R$ 0,86" para ₲ 1.000, etc. */
    function formatRateInBrl(rates, code) {
        const perUnit = brlPerUnit(rates, code);
        if (perUnit === null) return null;
        return format(perUnit * CURRENCIES[code].unit, "BRL");
    }

    /**
     * Interpreta numeros digitados/lidos em varios formatos: "1.234,56", "1,234.56", "1234.56", "12,5",
     * "1.234" (milhar) e "US $ 12.34". Retorna null se nao houver numero.
     */
    function parseAmount(raw) {
        if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
        let text = String(raw ?? "").replace(/[^\d.,\-]/g, "");
        if (!/\d/.test(text)) return null;
        const negative = text.startsWith("-");
        text = text.replace(/-/g, "");

        const lastDot = text.lastIndexOf(".");
        const lastComma = text.lastIndexOf(",");
        let decimalSep = null;
        if (lastDot !== -1 && lastComma !== -1) {
            decimalSep = lastDot > lastComma ? "." : ",";
        } else if (lastDot !== -1 || lastComma !== -1) {
            const sep = lastDot !== -1 ? "." : ",";
            const occurrences = text.split(sep).length - 1;
            const digitsAfter = text.length - text.lastIndexOf(sep) - 1;
            // "1.234" / "1.234.567" = milhar; "12.5" / "12,50" = decimal.
            decimalSep = occurrences === 1 && digitsAfter !== 3 ? sep : null;
            if (occurrences === 1 && digitsAfter === 3 && sep === ",") {
                // "1,234" e ambiguo; no contexto de lojas em pt-BR virgula seguida de 3 digitos e milhar em en-US.
                decimalSep = null;
            }
        }

        let normalized = text;
        if (decimalSep) {
            const thousandSep = decimalSep === "." ? "," : ".";
            normalized = normalized.split(thousandSep).join("").replace(decimalSep, ".");
        } else {
            normalized = normalized.replace(/[.,]/g, "");
        }
        const number = parseFloat(normalized);
        if (!Number.isFinite(number)) return null;
        return negative ? -number : number;
    }

    /** Detecta a moeda a partir de um texto de preco ("R$ 12,00", "US $3.5", "¥45", "₲ 50.000"). */
    function detectCurrency(text) {
        const t = String(text ?? "");
        if (/R\s?\$|BRL|reais/i.test(t)) return "BRL";
        if (/US\s?\$|USD|U\$S/i.test(t)) return "USD";
        if (/CN\s?¥|RMB|CNY|元|¥|￥/i.test(t)) return "CNY";
        if (/₲|PYG|Gs\.?/i.test(t)) return "PYG";
        if (/\$/.test(t)) return "USD";
        return null;
    }

    function round2(value) {
        return Math.round((Number(value) || 0) * 100) / 100;
    }

    /**
     * Resumo financeiro do planner — fonte unica de verdade (o servidor calcula o mesmo saldo em wallet.php).
     *   saldo   = depositos - retiradas - itens comprados
     *   falta juntar = max(0, falta comprar - saldo)   (saldo negativo aumenta o que falta juntar)
     *   progresso = comprado / total; "coberto" = parte do que falta comprar que a carteira ja paga
     * `items` sao os da montagem aberta; `otherPurchased` = compras ja feitas em OUTRAS montagens (a carteira e
     * unica, entao o saldo desconta as compras de todas). Total/comprado/falta comprar sao da montagem aberta.
     */
    function summarizeFinance(items, wallet, otherPurchased) {
        const list = Array.isArray(items) ? items : [];
        const total = round2(list.reduce((sum, item) => sum + (Number(item.price) || 0), 0));
        const purchased = round2(list.filter((item) => item.is_purchased).reduce((sum, item) => sum + (Number(item.price) || 0), 0));
        const toBuy = round2(total - purchased);
        const deposits = round2(wallet && wallet.deposits_total);
        const withdrawals = round2(wallet && wallet.withdrawals_total);
        const balance = round2(deposits - withdrawals - purchased - round2(otherPurchased));
        const covered = round2(Math.min(toBuy, Math.max(0, balance)));
        const shortfall = round2(Math.max(0, toBuy - balance));
        const surplus = round2(Math.max(0, balance - toBuy));
        const pct = (value) => (total > 0 ? Math.min(100, (value / total) * 100) : 0);
        return {
            total, purchased, toBuy, deposits, withdrawals, balance, covered, shortfall, surplus,
            purchasedPct: pct(purchased), coveredPct: pct(covered),
        };
    }

    async function fetchRates(force, storage, fetchImpl) {
        const store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
        const doFetch = fetchImpl || (typeof fetch !== "undefined" ? fetch : null);

        if (!force && store) {
            try {
                const cached = JSON.parse(store.getItem(RATES_CACHE_KEY) || "null");
                if (cached && cached.BRL > 0 && Date.now() - cached.fetchedAt < RATES_CACHE_TTL_MS) {
                    return cached;
                }
            } catch (error) {
                // cache corrompido: ignora e busca de novo
            }
        }

        if (!doFetch) throw new Error("Sem suporte a rede.");
        const response = await doFetch(RATES_API_URL);
        if (!response.ok) throw new Error("Nao foi possivel buscar a cotacao.");
        const rates = parseRates(await response.json());
        if (!rates) throw new Error("Cotacao indisponivel no momento.");

        if (store) {
            try {
                store.setItem(RATES_CACHE_KEY, JSON.stringify(rates));
            } catch (error) {
                // storage cheio/bloqueado: segue sem cache
            }
        }
        return rates;
    }

    return {
        CURRENCIES,
        CODES,
        isSupported,
        parseRates,
        hasRate,
        brlPerUnit,
        toBrl,
        fromBrl,
        format,
        formatFromBrl,
        formatRateInBrl,
        parseAmount,
        detectCurrency,
        summarizeFinance,
        round2,
        fetchRates,
    };
});
