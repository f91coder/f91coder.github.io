<?php
declare(strict_types=1);

/**
 * Lista de espera das paginas "em breve" (www.f91.tech/emaper/ e www.f91.tech/ttreino/).
 *
 *   POST api.php?action=join   corpo JSON: product, name, email, whatsapp, profile, lang,
 *                              source (utm), referrer, website (campo armadilha), elapsed (ms na pagina)
 *                              -> {ok, position, already}
 *   GET  api.php?action=count&product=emaper   -> {ok, count}
 *
 * As inscricoes ficam na tabela wl_signups, no mesmo banco das pesquisas/FPV/Quosheets. A tabela e
 * criada sozinha na primeira chamada. Cada inscricao nova gera um e-mail para o dono do site
 * (to_email do php/mail-config.php), enviado depois de responder ao visitante.
 *
 * Para ver a lista: phpMyAdmin -> tabela wl_signups (ou os e-mails "Nova inscricao na lista de espera").
 */

ob_start();

const WL_PRODUCTS = [
    'emaper' => [
        'name' => 'eMaper',
        'profiles' => [
            'solo' => 'Vende sozinho(a)',
            'team' => 'Time de 2 a 10 pessoas',
            'large' => 'Time com mais de 10 pessoas',
        ],
    ],
    'ttreino' => [
        'name' => 'Ttreino',
        'profiles' => [
            'presencial' => 'Personal presencial',
            'online' => 'Consultoria online',
            'hibrido' => 'Híbrido / studio',
        ],
    ],
];

const WL_MAX_SIGNUPS_PER_IP_HOUR = 10;
const WL_MIN_FILL_MS = 1500;
const WL_ALLOWED_ORIGIN_HOSTS = ['f91.tech', 'www.f91.tech', 'localhost', '127.0.0.1'];
const WL_LANG_LABELS = ['pt' => 'Português', 'en' => 'Inglês', 'es' => 'Espanhol'];

const WL_SCHEMA = "CREATE TABLE IF NOT EXISTS wl_signups (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    product VARCHAR(20) NOT NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL,
    whatsapp VARCHAR(40) NOT NULL DEFAULT '',
    profile VARCHAR(20) NOT NULL DEFAULT '',
    lang VARCHAR(5) NOT NULL DEFAULT 'pt',
    source VARCHAR(255) NOT NULL DEFAULT '',
    referrer VARCHAR(255) NOT NULL DEFAULT '',
    ip_hash CHAR(64) NOT NULL DEFAULT '',
    user_agent VARCHAR(255) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL,
    UNIQUE KEY uq_wl_product_email (product, email),
    KEY idx_wl_ip_created (ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

function wl_headers(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
}

function wl_json(array $payload, int $code = 200): never
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code($code);
    wl_headers();
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Entrega a resposta ao visitante e segue rodando (o e-mail para o dono nao atrasa o formulario). */
function wl_respond_and_continue(array $payload): void
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    ignore_user_abort(true);
    $body = (string) json_encode($payload, JSON_UNESCAPED_UNICODE);
    http_response_code(200);
    wl_headers();
    header('Content-Length: ' . strlen($body));
    echo $body;
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } elseif (function_exists('litespeed_finish_request')) {
        litespeed_finish_request();
    } else {
        flush();
    }
}

function wl_str(mixed $value, int $maxLen): string
{
    if (!is_scalar($value)) {
        return '';
    }
    $value = trim(str_replace(["\r", "\n", "\t"], ' ', (string) $value));
    return mb_substr($value, 0, $maxLen);
}

function wl_db_config(): array
{
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/../survey/db-config.php';
    }
    return $config;
}

function wl_pdo(): PDO
{
    $config = wl_db_config();
    $pdo = new PDO(
        sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['host'], $config['port'], $config['database']),
        $config['username'],
        $config['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    $pdo->exec("SET time_zone = '+00:00'");
    return $pdo;
}

/** Roda $fn; se a tabela ainda nao existir (primeiro uso no servidor), cria e tenta de novo. */
function wl_with_table(PDO $pdo, callable $fn): mixed
{
    try {
        return $fn();
    } catch (PDOException $e) {
        if ($e->getCode() !== '42S02') {
            throw $e;
        }
        $pdo->exec(WL_SCHEMA);
        return $fn();
    }
}

function wl_product(mixed $key): array
{
    $key = wl_str($key, 20);
    if (!isset(WL_PRODUCTS[$key])) {
        wl_json(['ok' => false, 'error' => 'invalid_product'], 400);
    }
    return ['key' => $key] + WL_PRODUCTS[$key];
}

function wl_count(PDO $pdo, string $product): int
{
    return (int) wl_with_table($pdo, function () use ($pdo, $product): int {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM wl_signups WHERE product = :p');
        $stmt->execute(['p' => $product]);
        return (int) $stmt->fetchColumn();
    });
}

function wl_join(PDO $pdo, array $in): void
{
    $product = wl_product($in['product'] ?? '');

    // Bot: preencheu o campo escondido ou enviou rapido demais. Finge que deu certo e nao grava nada.
    if (wl_str($in['website'] ?? '', 200) !== '' || (int) ($in['elapsed'] ?? 0) < WL_MIN_FILL_MS) {
        wl_json(['ok' => true, 'position' => null, 'already' => false]);
    }

    $name = (string) preg_replace('/\s+/u', ' ', wl_str($in['name'] ?? '', 120));
    $email = mb_strtolower(wl_str($in['email'] ?? '', 190));
    $whatsapp = wl_str($in['whatsapp'] ?? '', 40);
    $digits = (string) preg_replace('/\D+/', '', $whatsapp);
    $profile = wl_str($in['profile'] ?? '', 20);
    if (!isset($product['profiles'][$profile])) {
        $profile = '';
    }
    $lang = in_array($in['lang'] ?? '', ['pt', 'en', 'es'], true) ? (string) $in['lang'] : 'pt';

    $invalid = [];
    if (mb_strlen($name) < 2) {
        $invalid[] = 'name';
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $invalid[] = 'email';
    }
    if (strlen($digits) < 8 || strlen($digits) > 16) {
        $invalid[] = 'whatsapp';
    }
    if ($invalid) {
        wl_json(['ok' => false, 'error' => 'invalid_fields', 'fields' => $invalid], 422);
    }

    $ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . (wl_db_config()['ip_hash_pepper'] ?? ''));
    $lead = [
        'product' => $product['key'],
        'name' => $name,
        'email' => $email,
        'whatsapp' => $whatsapp,
        'profile' => $profile,
        'lang' => $lang,
        'source' => wl_str($in['source'] ?? '', 255),
        'referrer' => wl_str($in['referrer'] ?? '', 255),
        'ip' => $ipHash,
        'ua' => wl_str($_SERVER['HTTP_USER_AGENT'] ?? '', 255),
    ];

    [$id, $inserted] = wl_with_table($pdo, function () use ($pdo, $lead): array {
        $recent = $pdo->prepare('SELECT COUNT(*) FROM wl_signups WHERE ip_hash = :ip AND created_at > (NOW() - INTERVAL 1 HOUR)');
        $recent->execute(['ip' => $lead['ip']]);
        if ((int) $recent->fetchColumn() >= WL_MAX_SIGNUPS_PER_IP_HOUR) {
            wl_json(['ok' => false, 'error' => 'rate_limited'], 429);
        }

        // Mesmo e-mail no mesmo produto: atualiza os dados e mantem a posicao original na fila.
        $stmt = $pdo->prepare(
            'INSERT INTO wl_signups (product, name, email, whatsapp, profile, lang, source, referrer, ip_hash, user_agent)
             VALUES (:product, :name, :email, :whatsapp, :profile, :lang, :source, :referrer, :ip, :ua)
             ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), name = VALUES(name), whatsapp = VALUES(whatsapp),
                 profile = VALUES(profile), lang = VALUES(lang), updated_at = NOW()'
        );
        $stmt->execute($lead);
        return [(int) $pdo->lastInsertId(), $stmt->rowCount() === 1];
    });

    $pos = $pdo->prepare('SELECT COUNT(*) FROM wl_signups WHERE product = :p AND id <= :id');
    $pos->execute(['p' => $product['key'], 'id' => $id]);
    $position = (int) $pos->fetchColumn();

    wl_respond_and_continue(['ok' => true, 'position' => $position, 'already' => !$inserted]);

    if ($inserted) {
        try {
            wl_notify_owner($product, $lead, $position);
        } catch (Throwable $e) {
            error_log('waitlist mail failed: ' . $e->getMessage());
        }
    }
}

function wl_notify_owner(array $product, array $lead, int $position): void
{
    $config = require __DIR__ . '/../mail-config.php';
    foreach (['host', 'username', 'password', 'from_email', 'to_email'] as $key) {
        if (empty($config[$key])) {
            error_log('waitlist mail skipped: missing ' . $key);
            return;
        }
    }

    require_once __DIR__ . '/../phpmailer/src/Exception.php';
    require_once __DIR__ . '/../phpmailer/src/PHPMailer.php';
    require_once __DIR__ . '/../phpmailer/src/SMTP.php';

    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = (string) $config['host'];
    $mail->SMTPAuth = true;
    $mail->Username = (string) $config['username'];
    $mail->Password = (string) $config['password'];
    $mail->Port = (int) $config['port'];
    $mail->Timeout = 20;
    $encryption = strtolower((string) ($config['encryption'] ?? ''));
    if (in_array($encryption, ['ssl', 'smtps'], true)) {
        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
    } elseif (in_array($encryption, ['none', 'off'], true)) {
        $mail->SMTPSecure = '';
        $mail->SMTPAutoTLS = false;
    } else {
        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    }

    $mail->CharSet = 'UTF-8';
    $mail->setFrom((string) $config['from_email'], $product['name'] . ' - lista de espera');
    foreach (preg_split('/[,;]+/', (string) $config['to_email']) ?: [] as $to) {
        if (trim($to) !== '') {
            $mail->addAddress(trim($to));
        }
    }
    $mail->addReplyTo($lead['email'], $lead['name']);

    $digits = (string) preg_replace('/\D+/', '', $lead['whatsapp']);
    $when = (new DateTime('now', new DateTimeZone('America/Sao_Paulo')))->format('d/m/Y H:i');
    $e = static fn(string $v): string => htmlspecialchars($v, ENT_QUOTES, 'UTF-8');

    $rows = [
        'Nome' => $e($lead['name']),
        'E-mail' => '<a href="mailto:' . $e($lead['email']) . '">' . $e($lead['email']) . '</a>',
        'WhatsApp' => '<a href="https://wa.me/' . $digits . '">' . $e($lead['whatsapp']) . '</a>',
        'Perfil' => $e($product['profiles'][$lead['profile']] ?? '-'),
        'Idioma da página' => $e(WL_LANG_LABELS[$lead['lang']] ?? $lead['lang']),
        'Origem (UTM)' => $lead['source'] !== '' ? $e($lead['source']) : '-',
        'Veio de' => $lead['referrer'] !== '' ? $e($lead['referrer']) : '-',
        'Data' => $when . ' (horário de Brasília)',
    ];

    $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2937;max-width:560px">'
        . '<p style="margin:0 0 6px">Nova inscrição na lista de espera do <strong>' . $e($product['name']) . '</strong>.</p>'
        . '<p style="margin:0 0 16px;color:#6b7280">Posição na fila: <strong style="color:#111827">#' . $position . '</strong></p>'
        . '<table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb">';
    $text = 'Nova inscrição na lista de espera do ' . $product['name'] . " (posição #$position)\n\n";
    foreach ($rows as $label => $value) {
        $html .= '<tr><td style="border-bottom:1px solid #e5e7eb;background:#f9fafb;width:150px;color:#6b7280">' . $label
            . '</td><td style="border-bottom:1px solid #e5e7eb">' . $value . '</td></tr>';
        $text .= $label . ': ' . html_entity_decode(strip_tags($value), ENT_QUOTES, 'UTF-8') . "\n";
    }
    $html .= '</table><p style="margin:16px 0 0;color:#9ca3af;font-size:12px">Responder este e-mail escreve direto para a pessoa inscrita. '
        . 'A lista completa fica na tabela wl_signups do banco do site.</p></div>';

    $mail->isHTML(true);
    $mail->Subject = sprintf('[%s] Nova inscrição na lista de espera: %s (#%d)', $product['name'], $lead['name'], $position);
    $mail->Body = $html;
    $mail->AltBody = $text;
    $mail->send();
}

// ---------------------------------------------------------------------------------------------------------------

$action = (string) ($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($action === 'count' && $method === 'GET') {
        $product = wl_product($_GET['product'] ?? '');
        wl_json(['ok' => true, 'count' => wl_count(wl_pdo(), $product['key'])]);
    }

    if ($action === 'join' && $method === 'POST') {
        $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
        if ($origin !== '' && !in_array(strtolower((string) parse_url($origin, PHP_URL_HOST)), WL_ALLOWED_ORIGIN_HOSTS, true)) {
            wl_json(['ok' => false, 'error' => 'forbidden'], 403);
        }
        $raw = (string) file_get_contents('php://input', false, null, 0, 16384);
        $input = json_decode($raw, true);
        if (!is_array($input)) {
            wl_json(['ok' => false, 'error' => 'invalid_body'], 400);
        }
        wl_join(wl_pdo(), $input);
        exit;
    }

    wl_json(['ok' => false, 'error' => 'not_found'], 404);
} catch (Throwable $e) {
    error_log('waitlist/api.php [' . $action . ']: ' . $e->getMessage());
    wl_json(['ok' => false, 'error' => 'server_error'], 500);
}
