<?php
declare(strict_types=1);

/** Auxiliares de pagina do Quosheets (cabecalho HTML, navegacao, rodape, idioma). */

function qs_e(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

/** URL de asset com versao pelo mtime (o CDN e o navegador sempre pegam a versao nova). */
function qs_asset(string $path): string
{
    $full = __DIR__ . '/../' . $path;
    $mtime = @filemtime($full);
    return qs_config()['base_path'] . '/' . $path . ($mtime ? '?v=' . $mtime : '');
}

/** Icone Lucide (do mesmo subconjunto usado pelo JS) renderizado no servidor. */
function qs_icon(string $name, int $size = 20, string $class = ''): string
{
    static $icons = null;
    if ($icons === null) {
        $js = (string) @file_get_contents(__DIR__ . '/../assets/js/qs-icons.js');
        $start = strpos($js, '{');
        $end = strrpos($js, '}');
        $icons = $start !== false && $end !== false ? (json_decode(substr($js, $start, $end - $start + 1), true) ?: []) : [];
    }
    return '<svg class="qi ' . qs_e($class) . '" width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
        . ($icons[$name] ?? '') . '</svg>';
}

function qs_landing_path(string $lang): string
{
    return qs_config()['base_path'] . ($lang === 'pt' ? '/' : '/' . $lang . '/');
}

function qs_page_url(string $page, string $lang): string
{
    return qs_config()['base_path'] . '/' . $page . '?lang=' . $lang;
}

/**
 * <head> completo. $o: title, description, lang, nonce, css[], alternates (bool, landing), canonical, noindex, boot (array p/ JS)
 */
function qs_head(array $o): void
{
    $lang = $o['lang'];
    $htmlLang = ['pt' => 'pt-BR', 'en' => 'en', 'es' => 'es'][$lang];
    $origin = qs_config()['site_url'];
    $canonical = $origin . ($o['canonical'] ?? qs_landing_path($lang));
    echo '<!doctype html><html lang="' . $htmlLang . '"><head><meta charset="utf-8">';
    echo '<meta name="viewport" content="width=device-width,initial-scale=1">';
    echo '<title>' . qs_e($o['title']) . '</title>';
    echo '<meta name="description" content="' . qs_e($o['description']) . '">';
    echo '<meta name="theme-color" content="#8CC63F">';
    if (!empty($o['noindex'])) {
        echo '<meta name="robots" content="noindex,nofollow">';
    } else {
        echo '<link rel="canonical" href="' . qs_e($canonical) . '">';
    }
    if (!empty($o['alternates'])) {
        foreach (QS_LANGS as $alt) {
            echo '<link rel="alternate" hreflang="' . ['pt' => 'pt-BR', 'en' => 'en', 'es' => 'es'][$alt] . '" href="' . qs_e($origin . qs_landing_path($alt)) . '">';
        }
        echo '<link rel="alternate" hreflang="x-default" href="' . qs_e($origin . qs_landing_path('pt')) . '">';
    }
    echo '<meta property="og:type" content="website"><meta property="og:site_name" content="Quosheets">';
    echo '<meta property="og:title" content="' . qs_e($o['title']) . '"><meta property="og:description" content="' . qs_e($o['description']) . '">';
    $ogImage = $origin . qs_asset('assets/img/' . ['pt' => 'og.png', 'en' => 'og-en.png', 'es' => 'og-es.png'][$lang]);
    echo '<meta property="og:url" content="' . qs_e($canonical) . '"><meta property="og:image" content="' . qs_e($ogImage) . '">';
    echo '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">';
    echo '<meta property="og:locale" content="' . ['pt' => 'pt_BR', 'en' => 'en_US', 'es' => 'es_ES'][$lang] . '">';
    echo '<meta name="twitter:card" content="summary_large_image">';
    echo '<link rel="manifest" href="' . qs_asset('assets/manifest.json') . '">';
    echo '<link rel="icon" type="image/png" href="' . qs_asset('assets/img/favicon.png') . '">';
    echo '<link rel="apple-touch-icon" href="' . qs_asset('assets/img/apple-touch-icon.png') . '">';
    echo '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
    echo '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">';
    foreach ($o['css'] ?? [] as $css) {
        echo '<link rel="stylesheet" href="' . qs_asset($css) . '">';
    }
    if (!empty($o['jsonld'])) {
        echo '<script type="application/ld+json" nonce="' . qs_e($o['nonce']) . '">' . json_encode($o['jsonld'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) . '</script>';
    }
    if (isset($o['boot'])) {
        qs_boot_script($o['boot'], $o['nonce']);
    }
    echo '</head>';
}

/** Injeta window.QS_BOOT (idioma, dicionario e dados iniciais) de forma segura. */
function qs_boot_script(array $boot, string $nonce): void
{
    echo '<script nonce="' . qs_e($nonce) . '">window.QS_BOOT=' . json_encode($boot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) . ';</script>';
}

/** Dicionario para o JS: so as chaves com os prefixos pedidos (reduz o payload das paginas). */
function qs_dict_subset(string $lang, array $prefixes): array
{
    $out = [];
    foreach (qs_dict($lang) as $key => $value) {
        foreach ($prefixes as $prefix) {
            if (str_starts_with($key, $prefix)) {
                $out[$key] = $value;
                break;
            }
        }
    }
    return $out;
}

function qs_lang_menu(string $lang, string $mode = 'landing', string $page = ''): string
{
    $labels = ['pt' => 'Português', 'en' => 'English', 'es' => 'Español'];
    $html = '<details class="qs-lang"><summary aria-label="' . qs_e(qs_t('nav.language', [], $lang)) . '">'
        . '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>'
        . '<span>' . strtoupper($lang) . '</span></summary><div class="qs-lang-menu">';
    foreach ($labels as $code => $label) {
        $href = $mode === 'landing'
            ? qs_landing_path($code)
            : qs_config()['base_path'] . '/' . $page . (str_contains($page, '?') ? '&' : '?') . 'lang=' . $code;
        $html .= '<a href="' . qs_e($href) . '" hreflang="' . $code . '"' . ($code === $lang ? ' aria-current="true"' : '') . '>' . $label . '</a>';
    }
    return $html . '</div></details>';
}

function qs_site_header(string $lang, ?array $user, bool $landing = true): void
{
    $base = qs_config()['base_path'];
    $home = qs_landing_path($lang);
    $t = static fn(string $k): string => qs_e(qs_t($k, [], $lang));
    echo '<header class="qs-site-header"><div class="qs-container qs-site-header-inner">';
    echo '<a class="qs-brand" href="' . qs_e($home) . '"><img src="' . qs_asset('assets/img/logo-sm.png') . '" alt="Quosheets" width="172" height="30"></a>';
    if ($landing) {
        echo '<nav class="qs-site-nav" aria-label="Menu"><a href="#features">' . $t('nav.features') . '</a><a href="#ai">' . $t('nav.ai') . '</a><a href="#pricing">' . $t('nav.pricing') . '</a><a href="#faq">' . $t('nav.faq') . '</a></nav>';
    }
    echo '<div class="qs-site-actions">' . qs_lang_menu($lang, $landing ? 'landing' : 'page', '');
    if ($user) {
        echo '<a class="qs-btn qs-btn-primary" href="' . $base . '/app">' . $t('nav.open_app') . '</a>';
    } else {
        echo '<a class="qs-site-login" href="' . $base . '/login?lang=' . $lang . '">' . $t('nav.login') . '</a>';
        echo '<a class="qs-btn qs-btn-primary" href="' . $base . '/signup?lang=' . $lang . '">' . $t('nav.start_trial') . '</a>';
    }
    echo '</div></div></header>';
}

function qs_site_footer(string $lang): void
{
    $base = qs_config()['base_path'];
    $t = static fn(string $k, array $v = []): string => qs_e(qs_t($k, $v, $lang));
    echo '<footer class="qs-site-footer"><div class="qs-container qs-footer-grid">';
    echo '<div class="qs-footer-brand"><img src="' . qs_asset('assets/img/logo-white.png') . '" alt="Quosheets" width="172" height="30"><p>' . $t('footer.tagline') . '</p></div>';
    echo '<div><h4>' . $t('footer.product') . '</h4><a href="' . qs_landing_path($lang) . '#features">' . $t('nav.features') . '</a><a href="' . qs_landing_path($lang) . '#ai">' . $t('nav.ai') . '</a><a href="' . qs_landing_path($lang) . '#pricing">' . $t('nav.pricing') . '</a><a href="' . qs_landing_path($lang) . '#faq">' . $t('nav.faq') . '</a></div>';
    echo '<div><h4>' . $t('footer.account') . '</h4><a href="' . $base . '/signup?lang=' . $lang . '">' . $t('nav.start_trial') . '</a><a href="' . $base . '/login?lang=' . $lang . '">' . $t('nav.login') . '</a></div>';
    echo '<div><h4>' . $t('footer.legal') . '</h4><a href="' . $base . '/privacy?lang=' . $lang . '">' . $t('footer.privacy') . '</a><a href="' . $base . '/terms?lang=' . $lang . '">' . $t('footer.terms') . '</a><a href="/" rel="noopener">F91</a></div>';
    echo '</div><div class="qs-container qs-footer-bottom"><span>&copy; ' . gmdate('Y') . ' F91 — ' . $t('footer.rights') . '</span>' . qs_lang_menu($lang) . '</div></footer>';
}
