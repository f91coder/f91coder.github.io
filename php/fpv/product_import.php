<?php
declare(strict_types=1);

/**
 * Importador de produtos: cola-se o link de uma loja e o servidor tenta descobrir nome, foto e preco.
 *
 * Realidade tecnica (validada empiricamente contra as lojas):
 *  - Lojas genericas / Amazon: JSON-LD, OpenGraph e microdados costumam trazer tudo.
 *  - AliExpress: o HTML traz nome e foto (og:*), mas o preco vem de uma API assinada (mtop) -> sem preco.
 *  - Mercado Livre / Shopee: verificacao anti-robo bloqueia leitura por servidor -> so o nome pela URL.
 * Para essas lojas o caminho completo e o "botao magico" (js/fpv_clip.js), que le a pagina no navegador
 * do proprio usuario e usa fpv_import_product() apenas para baixar a foto com seguranca.
 *
 * Como este endpoint faz requisicoes a URLs informadas pelo usuario (SSRF), TODAS as saidas sao validadas:
 * so http/https nas portas 80/443, host resolvido e fixado (CURLOPT_RESOLVE, contra DNS rebinding), IPs
 * privados/reservados bloqueados a cada redirecionamento, limite de tamanho, timeout e rate limit por usuario.
 */

const FPV_IMPORT_MAX_HTML_BYTES = 3 * 1024 * 1024;
const FPV_IMPORT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FPV_IMPORT_HOURLY_LIMIT = 40;
const FPV_IMPORT_MAX_REDIRECTS = 6;
const FPV_IMPORT_IMAGES_SUBDIR = 'imports';
const FPV_IMPORT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

final class FpvImportException extends RuntimeException
{
}

// ─────────────────────────────────────────────────────────────────────────
// Rede segura (anti-SSRF)
// ─────────────────────────────────────────────────────────────────────────

function fpv_import_is_public_ip(string $ip): bool
{
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
        return false;
    }
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        $long = ip2long($ip);
        // CGNAT 100.64.0.0/10 e link-local 169.254.0.0/16 (metadados de nuvem)
        if ($long !== false && (($long & 0xFFC00000) === 0x64400000 || ($long & 0xFFFF0000) === 0xA9FE0000)) {
            return false;
        }
    }
    return true;
}

/** @return string[] IPv4 publicos do host; lanca FpvImportException se o host for invalido/privado. */
function fpv_import_resolve_host(string $host): array
{
    $host = strtolower(trim($host, '[]'));
    if ($host === '' || strlen($host) > 253) {
        throw new FpvImportException('Endereco invalido.');
    }
    if (filter_var($host, FILTER_VALIDATE_IP)) {
        if (!filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) || !fpv_import_is_public_ip($host)) {
            throw new FpvImportException('Endereco nao permitido.');
        }
        return [$host];
    }
    if (!preg_match('/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/', $host)) {
        throw new FpvImportException('Endereco invalido.');
    }
    $ips = @gethostbynamel($host) ?: [];
    if (!$ips) {
        throw new FpvImportException('Nao foi possivel encontrar esse site.');
    }
    foreach ($ips as $ip) {
        if (!fpv_import_is_public_ip($ip)) {
            throw new FpvImportException('Endereco nao permitido.');
        }
    }
    return $ips;
}

function fpv_import_absolute_url(string $base, string $relative): string
{
    if (preg_match('#^https?://#i', $relative)) {
        return $relative;
    }
    $parts = parse_url($base);
    if ($parts === false || !isset($parts['scheme'], $parts['host'])) {
        return $relative;
    }
    $origin = $parts['scheme'] . '://' . $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : '');
    if (str_starts_with($relative, '//')) {
        return $parts['scheme'] . ':' . $relative;
    }
    if (str_starts_with($relative, '/')) {
        return $origin . $relative;
    }
    $path = $parts['path'] ?? '/';
    $dir = substr($path, 0, (int) strrpos($path, '/') + 1);
    return $origin . $dir . $relative;
}

/**
 * GET seguro. Devolve ['status','body','final_url','content_type','truncated'].
 * $maxBytes: acima disso a leitura e interrompida (o que ja foi lido e mantido).
 */
function fpv_import_http_get(string $url, array $extraHeaders = [], int $maxBytes = FPV_IMPORT_MAX_HTML_BYTES): array
{
    if (!function_exists('curl_init')) {
        throw new FpvImportException('Servidor sem suporte a cURL.');
    }

    $ch = curl_init();
    $current = $url;
    $config = fpv_config();
    $hasCustomAccept = (bool) array_filter($extraHeaders, static fn(string $h): bool => stripos($h, 'accept:') === 0);

    for ($hop = 0; $hop <= FPV_IMPORT_MAX_REDIRECTS; $hop++) {
        $parts = parse_url($current);
        if ($parts === false || !isset($parts['scheme'], $parts['host']) || !in_array(strtolower($parts['scheme']), ['http', 'https'], true)) {
            throw new FpvImportException('Link invalido.');
        }
        $scheme = strtolower($parts['scheme']);
        $port = (int) ($parts['port'] ?? ($scheme === 'https' ? 443 : 80));
        if (!in_array($port, [80, 443], true)) {
            throw new FpvImportException('Porta nao permitida.');
        }
        $ips = fpv_import_resolve_host($parts['host']);

        $body = '';
        $truncated = false;
        $responseHeaders = [];
        $options = [
            CURLOPT_URL => $current,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_TIMEOUT => 14,
            CURLOPT_ENCODING => '',
            CURLOPT_USERAGENT => FPV_IMPORT_UA,
            CURLOPT_COOKIEFILE => '',
            CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_RESOLVE => [strtolower($parts['host']) . ':' . $port . ':' . $ips[0]],
            CURLOPT_HTTPHEADER => array_merge(
                ['Accept-Language: pt-BR,pt;q=0.9,en;q=0.8'],
                // Duas linhas "Accept" fariam o CDN escolher o formato errado (ex.: AVIF).
                $hasCustomAccept ? [] : ['Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'],
                $extraHeaders
            ),
            CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$responseHeaders): int {
                $pos = strpos($line, ':');
                if ($pos !== false) {
                    $responseHeaders[strtolower(trim(substr($line, 0, $pos)))] = trim(substr($line, $pos + 1));
                }
                return strlen($line);
            },
            CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$body, &$truncated, $maxBytes): int {
                $body .= $chunk;
                if (strlen($body) >= $maxBytes) {
                    $truncated = true;
                    return -1;
                }
                return strlen($chunk);
            },
        ];
        if (!empty($config['curl_cainfo'])) {
            $options[CURLOPT_CAINFO] = $config['curl_cainfo'];
        }
        curl_setopt_array($ch, $options);

        $ok = curl_exec($ch);
        $errno = curl_errno($ch);
        if ($ok === false && !($truncated && $errno === CURLE_WRITE_ERROR)) {
            $message = curl_error($ch);
            curl_close($ch);
            throw new FpvImportException('Nao foi possivel abrir o link (' . ($message !== '' ? $message : 'erro de rede') . ').');
        }

        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        if ($status >= 300 && $status < 400 && !empty($responseHeaders['location'])) {
            $current = fpv_import_absolute_url($current, $responseHeaders['location']);
            continue;
        }

        curl_close($ch);
        return [
            'status' => $status,
            'body' => $body,
            'final_url' => $current,
            'content_type' => $responseHeaders['content-type'] ?? '',
            'truncated' => $truncated,
        ];
    }

    curl_close($ch);
    throw new FpvImportException('Redirecionamentos demais neste link.');
}

// ─────────────────────────────────────────────────────────────────────────
// Parsing de preco / moeda
// ─────────────────────────────────────────────────────────────────────────

function fpv_import_detect_currency(string $text): string
{
    if (preg_match('/R\s?\$|BRL/i', $text)) {
        return 'BRL';
    }
    if (preg_match('/US\s?\$|USD/i', $text)) {
        return 'USD';
    }
    if (preg_match('/CN\s?¥|RMB|CNY|¥|￥/u', $text)) {
        return 'CNY';
    }
    if (preg_match('/₲|PYG/u', $text)) {
        return 'PYG';
    }
    if (str_contains($text, '$')) {
        return 'USD';
    }
    return '';
}

function fpv_import_normalize_currency(string $code): string
{
    $code = strtoupper(trim($code));
    return in_array($code, ['BRL', 'USD', 'CNY', 'PYG'], true) ? $code : '';
}

/** Mesma regra do FpvMoney.parseAmount (js/fpv_money.js): "1.234,56", "1,234.56", "12,5", "1.234" (milhar). */
function fpv_import_parse_amount(string $raw): ?float
{
    $text = preg_replace('/[^\d.,]/', '', $raw) ?? '';
    if ($text === '' || !preg_match('/\d/', $text)) {
        return null;
    }

    $lastDot = strrpos($text, '.');
    $lastComma = strrpos($text, ',');
    $decimalSep = null;
    if ($lastDot !== false && $lastComma !== false) {
        $decimalSep = $lastDot > $lastComma ? '.' : ',';
    } elseif ($lastDot !== false || $lastComma !== false) {
        $sep = $lastDot !== false ? '.' : ',';
        $occurrences = substr_count($text, $sep);
        $digitsAfter = strlen($text) - (int) strrpos($text, $sep) - 1;
        $decimalSep = ($occurrences === 1 && $digitsAfter !== 3) ? $sep : null;
    }

    if ($decimalSep !== null) {
        $thousandSep = $decimalSep === '.' ? ',' : '.';
        $normalized = str_replace($decimalSep, '.', str_replace($thousandSep, '', $text));
    } else {
        $normalized = str_replace(['.', ','], '', $text);
    }
    return is_numeric($normalized) ? (float) $normalized : null;
}

// ─────────────────────────────────────────────────────────────────────────
// Leitura do HTML
// ─────────────────────────────────────────────────────────────────────────

function fpv_import_to_utf8(string $html, string $contentType): string
{
    $charset = '';
    if (preg_match('/charset=([\w-]+)/i', $contentType, $m)) {
        $charset = $m[1];
    } elseif (preg_match('/<meta[^>]+charset=["\']?([\w-]+)/i', substr($html, 0, 4096), $m)) {
        $charset = $m[1];
    }
    if ($charset !== '' && !preg_match('/^utf-?8$/i', $charset) && function_exists('mb_convert_encoding')) {
        $converted = @mb_convert_encoding($html, 'UTF-8', $charset);
        if (is_string($converted)) {
            return $converted;
        }
    }
    return $html;
}

function fpv_import_text(?DOMNode $node): string
{
    return $node ? trim((string) preg_replace('/\s+/u', ' ', $node->textContent)) : '';
}

function fpv_import_meta(DOMXPath $xp, array $names): string
{
    foreach ($names as $name) {
        $nodes = $xp->query('//meta[@property="' . $name . '" or @name="' . $name . '" or @itemprop="' . $name . '"]/@content');
        if ($nodes && $nodes->length > 0) {
            $value = trim((string) $nodes->item(0)->nodeValue);
            if ($value !== '') {
                return $value;
            }
        }
    }
    return '';
}

function fpv_import_pick_image(mixed $value): string
{
    if (is_string($value)) {
        return $value;
    }
    if (is_array($value)) {
        if (isset($value['url']) || isset($value['contentUrl'])) {
            return fpv_import_pick_image($value['url'] ?? $value['contentUrl']);
        }
        return $value ? fpv_import_pick_image(reset($value)) : '';
    }
    return '';
}

function fpv_import_walk_ld(mixed $node, array &$found): void
{
    if (!is_array($node) || $found['name'] !== '') {
        return;
    }
    if (array_is_list($node)) {
        foreach ($node as $child) {
            fpv_import_walk_ld($child, $found);
        }
        return;
    }
    $type = $node['@type'] ?? '';
    $types = is_array($type) ? $type : [$type];
    if (in_array('Product', $types, true)) {
        $found['name'] = trim((string) ($node['name'] ?? ''));
        $found['image'] = fpv_import_pick_image($node['image'] ?? '');
        $offers = $node['offers'] ?? null;
        if (is_array($offers) && array_is_list($offers)) {
            $offers = $offers[0] ?? null;
        }
        if (is_array($offers)) {
            $price = $offers['price'] ?? $offers['lowPrice'] ?? ($offers['priceSpecification']['price'] ?? null);
            if ($price !== null && !is_array($price)) {
                $found['price_text'] = trim((string) $price);
            }
            $found['currency'] = fpv_import_normalize_currency((string) ($offers['priceCurrency'] ?? ''));
        }
    }
    if (isset($node['@graph'])) {
        fpv_import_walk_ld($node['@graph'], $found);
    }
}

function fpv_import_clean_title(string $title): string
{
    $title = html_entity_decode($title, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $title = preg_replace('/^\s*Amazon\.com(\.br)?\s*:\s*/iu', '', $title) ?? $title;
    $title = preg_replace('/\s*[\|\-–—:]\s*(AliExpress|Mercado\s*Livre|MercadoLibre|Shopee(\s+Brasil)?|Amazon(\.com(\.br)?)?|Magazine\s*Luiza|Americanas|KaBuM!?|Toys\s*&\s*Games)\s*$/iu', '', $title) ?? $title;
    $title = trim((string) preg_replace('/\s+/u', ' ', $title));
    return function_exists('mb_substr') ? mb_substr($title, 0, 200) : substr($title, 0, 200);
}

function fpv_import_title_from_url(string $url): string
{
    $parts = parse_url($url);
    if ($parts === false || empty($parts['path'])) {
        return '';
    }
    $segments = array_values(array_filter(explode('/', $parts['path']), static fn(string $s): bool => $s !== ''));
    $host = strtolower($parts['host'] ?? '');
    $slug = '';

    if (str_contains($host, 'shopee.')) {
        $slug = $segments[0] ?? '';
        $slug = preg_replace('/-i\.\d+\.\d+$/', '', $slug) ?? $slug;
    } elseif (str_contains($host, 'mercadoli')) {
        $first = $segments[0] ?? '';
        if (preg_match('/^MLB-?\d+-(.+?)(-_JM)?$/i', $first, $m)) {
            $slug = $m[1];
        } elseif (!preg_match('/^(p|up|MLB)/i', $first) || strlen($first) > 12) {
            $slug = $first;
        }
    } elseif (str_contains($host, 'amazon.')) {
        $first = $segments[0] ?? '';
        $slug = strtolower($first) === 'dp' ? '' : $first;
    } else {
        $slug = end($segments) ?: '';
        $slug = preg_replace('/\.(html?|php|aspx?)$/i', '', $slug) ?? $slug;
    }

    $slug = rawurldecode($slug);
    if (substr_count($slug, '-') < 1 || !preg_match('/\p{L}{3,}/u', $slug)) {
        return '';
    }
    $text = trim((string) preg_replace('/[-_+]+/', ' ', $slug));
    return function_exists('mb_strtoupper') ? mb_strtoupper(mb_substr($text, 0, 1)) . mb_substr($text, 1, 200) : ucfirst($text);
}

function fpv_import_store_name(string $host): string
{
    $host = strtolower($host);
    foreach (['aliexpress' => 'AliExpress', 'amazon' => 'Amazon', 'mercadoli' => 'Mercado Livre', 'shopee' => 'Shopee'] as $needle => $label) {
        if (str_contains($host, $needle)) {
            return $label;
        }
    }
    return preg_replace('/^www\./', '', $host) ?? $host;
}

/** URL sem rastreadores/hash — o que vai para o campo "link da loja". */
function fpv_import_canonical_url(string $url): string
{
    $parts = parse_url($url);
    if ($parts === false || !isset($parts['scheme'], $parts['host'])) {
        return $url;
    }
    $host = strtolower($parts['host']);
    $origin = $parts['scheme'] . '://' . $parts['host'];
    $path = $parts['path'] ?? '/';
    $path = rtrim($path, '/') === '' ? '/' : preg_replace('#/+$#', '', $path);

    if (str_contains($host, 'amazon.') && preg_match('#/(?:dp|gp/product)/([A-Z0-9]{10})#', $path, $m)) {
        return $origin . '/dp/' . $m[1];
    }
    if (str_contains($host, 'aliexpress') || str_contains($host, 'mercadoli') || str_contains($host, 'shopee.')) {
        return $origin . $path;
    }

    $query = [];
    if (!empty($parts['query'])) {
        parse_str($parts['query'], $query);
        foreach (array_keys($query) as $key) {
            if (preg_match('/^(utm_|aff_|spm|algo_|gatewayAdapt|pdp_|scm|gclid|fbclid|ref$|ref_|tag$|pf_rd|pd_rd)/i', (string) $key)) {
                unset($query[$key]);
            }
        }
    }
    return $origin . $path . ($query ? '?' . http_build_query($query) : '');
}

function fpv_import_extract_from_html(string $html, string $finalUrl, string $contentType): array
{
    $html = fpv_import_to_utf8($html, $contentType);
    $host = strtolower((string) parse_url($finalUrl, PHP_URL_HOST));
    $result = ['title' => '', 'image' => '', 'price_text' => '', 'currency' => ''];

    $previous = libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    $loaded = $dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOWARNING | LIBXML_NOERROR | LIBXML_COMPACT);
    libxml_clear_errors();
    libxml_use_internal_errors($previous);
    if (!$loaded) {
        return $result;
    }
    $xp = new DOMXPath($dom);

    // 1) JSON-LD
    $found = ['name' => '', 'image' => '', 'price_text' => '', 'currency' => ''];
    $lds = $xp->query('//script[@type="application/ld+json"]');
    if ($lds) {
        foreach ($lds as $script) {
            $json = json_decode(trim((string) $script->textContent), true);
            if (is_array($json)) {
                fpv_import_walk_ld($json, $found);
            }
        }
    }
    $result['title'] = $found['name'];
    $result['image'] = $found['image'];
    $result['price_text'] = $found['price_text'];
    $result['currency'] = $found['currency'];

    // 2) meta tags / microdados
    if ($result['price_text'] === '') {
        $result['price_text'] = fpv_import_meta($xp, ['product:price:amount', 'og:price:amount']);
        if ($result['price_text'] !== '' && $result['currency'] === '') {
            $result['currency'] = fpv_import_normalize_currency(fpv_import_meta($xp, ['product:price:currency', 'og:price:currency']));
        }
    }
    if ($result['price_text'] === '') {
        $node = $xp->query('//*[@itemprop="price"]')->item(0);
        if ($node instanceof DOMElement) {
            $result['price_text'] = $node->getAttribute('content') !== '' ? $node->getAttribute('content') : fpv_import_text($node);
            if ($result['currency'] === '') {
                $result['currency'] = fpv_import_normalize_currency(fpv_import_meta($xp, ['priceCurrency']));
            }
        }
    }

    // 3) Amazon: SO dentro dos containers do produto principal (a pagina tem varios precos de vitrines)
    if (str_contains($host, 'amazon.')) {
        $title = fpv_import_text($xp->query('//*[@id="productTitle"]')->item(0));
        if ($title !== '') {
            $result['title'] = $title;
        }
        if ($result['price_text'] === '') {
            $queries = [
                '//*[@id="corePrice_feature_div"]//*[contains(@class,"a-offscreen")]',
                '//*[@id="corePriceDisplay_desktop_feature_div"]//*[contains(@class,"a-offscreen")]',
                '//*[contains(@class,"priceToPay")]//*[contains(@class,"a-offscreen")]',
                '//*[@id="apex_desktop"]//*[contains(@class,"a-price")]//*[contains(@class,"a-offscreen")]',
                '//*[@id="priceblock_ourprice"]',
                '//*[@id="priceblock_dealprice"]',
                '//*[@id="price_inside_buybox"]',
            ];
            foreach ($queries as $query) {
                $node = $xp->query($query)->item(0);
                $text = fpv_import_text($node);
                if ($text !== '') {
                    $result['price_text'] = $text;
                    break;
                }
            }
        }
        if ($result['image'] === '') {
            $landing = $xp->query('//*[@id="landingImage"]')->item(0);
            if ($landing instanceof DOMElement) {
                $result['image'] = $landing->getAttribute('data-old-hires') ?: $landing->getAttribute('src');
                if ($result['image'] === '' && $landing->getAttribute('data-a-dynamic-image') !== '') {
                    $dynamic = json_decode($landing->getAttribute('data-a-dynamic-image'), true);
                    if (is_array($dynamic) && $dynamic) {
                        $result['image'] = (string) array_key_first($dynamic);
                    }
                }
            }
        }
    }

    // 4) OpenGraph / <title>
    if ($result['title'] === '') {
        $result['title'] = fpv_import_meta($xp, ['og:title', 'twitter:title']);
    }
    if ($result['title'] === '') {
        $result['title'] = fpv_import_text($xp->query('//title')->item(0));
    }
    if ($result['title'] === '') {
        $result['title'] = fpv_import_text($xp->query('//h1')->item(0));
    }
    if ($result['image'] === '') {
        $result['image'] = fpv_import_meta($xp, ['og:image', 'og:image:url', 'twitter:image']);
    }

    $result['title'] = fpv_import_clean_title($result['title']);
    if ($result['image'] !== '') {
        $result['image'] = fpv_import_absolute_url($finalUrl, html_entity_decode($result['image'], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }
    if ($result['currency'] === '' && $result['price_text'] !== '') {
        $result['currency'] = fpv_import_detect_currency($result['price_text']);
    }
    return $result;
}

// ─────────────────────────────────────────────────────────────────────────
// Foto do produto
// ─────────────────────────────────────────────────────────────────────────

function fpv_import_prepare_image_url(string $url): string
{
    $url = trim($url);
    if (str_starts_with($url, '//')) {
        $url = 'https:' . $url;
    }
    // CDNs da Alibaba oferecem "foto.jpg_.avif"/"_.webp": removemos o sufixo para receber o JPG original.
    return preg_replace('/_\.(avif|webp)$/i', '', $url) ?? $url;
}

function fpv_import_purge_old_images(): void
{
    $dir = FPV_UPLOAD_DIR . '/' . FPV_IMPORT_IMAGES_SUBDIR;
    if (!is_dir($dir)) {
        return;
    }
    foreach (glob($dir . '/*') ?: [] as $file) {
        if (is_file($file) && filemtime($file) < time() - 86400) {
            @unlink($file);
        }
    }
}

/** Baixa a foto para a pasta de importacoes. @return array{token:string,url:string} */
function fpv_import_download_image(string $imageUrl, int $userId): array
{
    $imageUrl = fpv_import_prepare_image_url($imageUrl);
    if (!preg_match('#^https?://#i', $imageUrl)) {
        throw new FpvImportException('Endereco da foto invalido.');
    }

    $response = fpv_import_http_get(
        $imageUrl,
        ['Accept: image/jpeg,image/png,image/webp,image/gif;q=0.9,*/*;q=0.5'],
        FPV_IMPORT_MAX_IMAGE_BYTES
    );
    if ($response['status'] < 200 || $response['status'] >= 300 || $response['body'] === '' || $response['truncated']) {
        throw new FpvImportException('Nao foi possivel baixar a foto do produto.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->buffer($response['body']);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
    if (!isset($extensions[$mime])) {
        throw new FpvImportException('Formato de foto nao suportado.');
    }
    $size = @getimagesizefromstring($response['body']);
    if ($size === false || min($size[0], $size[1]) < 120) {
        throw new FpvImportException('A foto encontrada e pequena demais.');
    }

    fpv_import_purge_old_images();
    $dir = fpv_upload_dir_ensure(FPV_IMPORT_IMAGES_SUBDIR);
    $filename = $userId . '-' . bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
    if (file_put_contents($dir . '/' . $filename, $response['body']) === false) {
        throw new FpvImportException('Nao foi possivel salvar a foto.');
    }

    return ['token' => $filename, 'url' => '/' . FPV_UPLOAD_PUBLIC_PATH . '/' . FPV_IMPORT_IMAGES_SUBDIR . '/' . $filename];
}

/**
 * Consome uma foto importada (token devolvido por import_fpv_product) movendo-a para a pasta de itens.
 * O token precisa pertencer ao usuario (prefixo "<user_id>-"), senao seria possivel apagar/usar fotos alheias.
 * Devolve o caminho publico relativo, ou '' se o token for invalido/inexistente.
 */
function fpv_claim_imported_image(int $userId, string $token): string
{
    if (!preg_match('/^' . $userId . '-[a-f0-9]{32}\.(jpg|png|webp|gif)$/', $token, $m)) {
        return '';
    }
    $source = FPV_UPLOAD_DIR . '/' . FPV_IMPORT_IMAGES_SUBDIR . '/' . $token;
    if (!is_file($source)) {
        return '';
    }
    $dir = fpv_upload_dir_ensure('items');
    $filename = bin2hex(random_bytes(16)) . '.' . $m[1];
    if (!@rename($source, $dir . '/' . $filename)) {
        return '';
    }
    return FPV_UPLOAD_PUBLIC_PATH . '/items/' . $filename;
}

// ─────────────────────────────────────────────────────────────────────────
// Endpoint
// ─────────────────────────────────────────────────────────────────────────

function fpv_import_rate_limited(PDO $pdo, int $userId): bool
{
    if (!fpv_schema_ready()) {
        return false;
    }
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM fpv_import_log WHERE user_id = :user_id AND created_at > (NOW() - INTERVAL 1 HOUR)');
    $stmt->execute(['user_id' => $userId]);
    if ((int) $stmt->fetchColumn() >= FPV_IMPORT_HOURLY_LIMIT) {
        return true;
    }
    $pdo->prepare('INSERT INTO fpv_import_log (user_id) VALUES (:user_id)')->execute(['user_id' => $userId]);
    $pdo->exec('DELETE FROM fpv_import_log WHERE created_at < (NOW() - INTERVAL 2 DAY)');
    return false;
}

function import_fpv_product(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);
    @set_time_limit(45);

    $url = fpv_normalize_store_url(fpv_sanitize_string($input['url'] ?? '', 600));
    if ($url === '') {
        return ['success' => false, 'message' => 'Cole o link completo do produto (http/https).', '_code' => 400];
    }
    if (fpv_import_rate_limited($pdo, $userId)) {
        return ['success' => false, 'message' => 'Muitas buscas seguidas. Tente novamente em alguns minutos.', '_code' => 429];
    }

    $notes = [];
    $data = ['title' => '', 'image' => '', 'price_text' => '', 'currency' => ''];
    $finalUrl = $url;
    $source = 'url_only';

    if (!empty($input['client_data'])) {
        // O bookmarklet ja leu a pagina no navegador do usuario; aqui so tratamos e baixamos a foto.
        $source = 'client';
        $data['title'] = fpv_import_clean_title(fpv_sanitize_string($input['title'] ?? '', 250));
        $data['price_text'] = fpv_sanitize_string($input['price_text'] ?? '', 40);
        $data['currency'] = fpv_import_normalize_currency((string) ($input['currency'] ?? ''));
        $data['image'] = fpv_sanitize_string($input['image_url'] ?? '', 600);
    } else {
        try {
            $response = fpv_import_http_get($url);
            $finalUrl = $response['final_url'];
            if ($response['status'] >= 200 && $response['status'] < 300 && $response['body'] !== '') {
                $data = fpv_import_extract_from_html($response['body'], $finalUrl, $response['content_type']);
                $source = 'page';
            } else {
                $notes[] = 'A loja recusou a leitura automatica desta pagina.';
            }
        } catch (FpvImportException $e) {
            $notes[] = $e->getMessage();
        } catch (Throwable $e) {
            error_log('fpv import: ' . $e->getMessage());
            $notes[] = 'Nao foi possivel ler a pagina.';
        }
    }

    $storeUrl = fpv_import_canonical_url($finalUrl !== '' && $source !== 'client' ? $finalUrl : $url);
    $host = strtolower((string) parse_url($storeUrl, PHP_URL_HOST));
    $store = fpv_import_store_name($host);

    // Paginas de "verificacao anti-robo" tem titulo generico: melhor deduzir o nome pela URL.
    $looksBlocked = $data['title'] === ''
        || preg_match('/^(verify|verifica|robot|captcha|acesso negado|access denied|shopee brasil|mercado livre|just a moment|attention required|checking your browser|forbidden|are you a (human|robot)|error|erro|403|404|503)\b/i', $data['title']) === 1
        || preg_match('/^(www\.)?(amazon|aliexpress|shopee|mercado ?livre|getfpv)(\.[a-z]{2,3}){0,2}\s*$/i', $data['title']) === 1;
    if ($looksBlocked) {
        $data['title'] = '';
        $slugTitle = fpv_import_title_from_url($url);
        if ($slugTitle !== '') {
            $data['title'] = $slugTitle;
            $notes[] = 'O nome foi deduzido do link — confira antes de salvar.';
        }
    }

    $price = null;
    $currency = $data['currency'];
    if ($data['price_text'] !== '') {
        $price = fpv_import_parse_amount($data['price_text']);
        if ($price !== null && $price <= 0) {
            $price = null;
        }
        if ($currency === '') {
            $currency = fpv_import_detect_currency($data['price_text']);
        }
        if ($currency === '' && preg_match('/\.br$/', $host)) {
            $currency = 'BRL';
        }
    }

    $image = null;
    if ($data['image'] !== '' && empty($input['price_only'])) {
        try {
            $image = fpv_import_download_image($data['image'], $userId);
        } catch (FpvImportException $e) {
            $notes[] = $e->getMessage();
        } catch (Throwable $e) {
            error_log('fpv import image: ' . $e->getMessage());
        }
    }

    if ($data['title'] === '' && $price === null && $image === null && $data['image'] === '') {
        return [
            'success' => false,
            'message' => 'Nao consegui ler nada desse link. Preencha manualmente ou use o botao magico do FPV91.',
            'notes' => $notes,
            '_code' => 422,
        ];
    }

    return [
        'success' => true,
        'product' => [
            'title' => $data['title'],
            'price' => $price,
            'currency' => $currency,
            'price_text' => $data['price_text'],
            'url' => $storeUrl,
            'store' => $store,
            'image' => $image,
            'source' => $source,
        ],
        'notes' => $notes,
    ];
}
