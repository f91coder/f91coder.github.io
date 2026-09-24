<?php
declare(strict_types=1);

/**
 * Lista publica compartilhavel + feedback de visitantes.
 *
 * Privacidade: o token (128 bits aleatorios) e a unica "chave" da URL. A pagina publica nunca expoe a
 * carteira/saldo/meta do dono — so os itens (nome, foto, categoria, link da loja, status) e, se o dono
 * permitir, os precos. Os comentarios so aparecem para o dono (visitantes nao veem opiniao alheia,
 * o que evita viés e exposicao de nomes).
 */

const FPV_SHARE_FEEDBACK_PER_VISITOR_HOUR = 12;
const FPV_SHARE_FEEDBACK_PER_SHARE_HOUR = 80;
const FPV_SHARE_FEEDBACK_PER_SHARE_DAY = 300;
const FPV_SHARE_FEEDBACK_LIST_LIMIT = 300;
const FPV_SHARE_REACTIONS = ['like', 'doubt', 'dislike'];
// Reacoes de uma batida (fpv_share_reactions): so like/dislike, uma por visitante e item.
const FPV_TOGGLE_REACTIONS = ['like', 'dislike'];
const FPV_REACTIONS_NEW_PER_VISITOR_HOUR = 200;
const FPV_REACTIONS_NEW_PER_SHARE_HOUR = 600;
const FPV_VISITOR_COOKIE = 'fpv_visitor';

function fpv_share_unavailable(): array
{
    return ['success' => false, 'message' => 'Compartilhamento indisponivel: atualizacao do banco pendente.', '_code' => 503];
}

function fpv_share_base_url(): string
{
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
    if ($host !== '' && preg_match('/^[A-Za-z0-9.-]+(:\d{2,5})?$/', $host)) {
        return (fpv_is_https_request() ? 'https' : 'http') . '://' . $host . '/fpv';
    }
    return FPV_SITE_URL;
}

function fpv_share_public_url(string $token): string
{
    return fpv_share_base_url() . '/lista/' . $token;
}

/** Hash do visitante para rate limit. Atras de CDN o REMOTE_ADDR pode ser do proxy, entao considera o X-Forwarded-For. */
function fpv_visitor_hash(): string
{
    $ip = fpv_client_ip();
    $forwarded = (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '');
    if ($forwarded !== '') {
        $first = trim(explode(',', $forwarded)[0]);
        if (filter_var($first, FILTER_VALIDATE_IP)) {
            $ip = $first;
        }
    }
    $config = fpv_config();
    return hash('sha256', $ip . '|' . substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 120) . '|' . $config['ip_hash_pepper']);
}

/**
 * Identidade do visitante para reacoes: cookie aleatorio (distingue pessoas atras do mesmo IP/Wi-Fi);
 * sem cookie na requisicao (bloqueado ou 1a visita) cai no hash IP+UA, que e estavel. $issue = true
 * entrega o cookie a quem ainda nao tem (so chame antes de qualquer saida).
 */
function fpv_visitor_key(bool $issue = false): string
{
    $id = (string) ($_COOKIE[FPV_VISITOR_COOKIE] ?? '');
    if (!preg_match('/^[a-f0-9]{32}$/', $id)) {
        $id = '';
        if ($issue && !headers_sent()) {
            $fresh = bin2hex(random_bytes(16));
            setcookie(FPV_VISITOR_COOKIE, $fresh, [
                'expires' => time() + 31536000,
                'path' => '/',
                'secure' => fpv_is_https_request(),
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
        }
    }
    if ($id === '') {
        return fpv_visitor_hash();
    }
    return hash('sha256', 'visitor|' . $id . '|' . fpv_config()['ip_hash_pepper']);
}

function fpv_share_row(PDO $pdo, int $userId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM fpv_shares WHERE user_id = :user_id');
    $stmt->execute(['user_id' => $userId]);
    return $stmt->fetch() ?: null;
}

/** Reacoes de uma batida por item: item_uuid => ['like' => n, 'dislike' => n] (tabela fpv_share_reactions). */
function fpv_share_reaction_counts(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        "SELECT item_uuid, SUM(reaction = 'like') AS likes, SUM(reaction = 'dislike') AS dislikes
         FROM fpv_share_reactions WHERE user_id = :user_id GROUP BY item_uuid"
    );
    $stmt->execute(['user_id' => $userId]);
    $map = [];
    foreach ($stmt->fetchAll() as $row) {
        $map[$row['item_uuid']] = ['like' => (int) $row['likes'], 'dislike' => (int) $row['dislikes']];
    }
    return $map;
}

function fpv_share_feedback_counts(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        "SELECT item_uuid, COUNT(*) AS total,
                SUM(reaction = 'like') AS likes, SUM(reaction = 'doubt') AS doubts, SUM(reaction = 'dislike') AS dislikes,
                SUM(message <> '') AS comments, SUM(is_read = 0) AS unread
         FROM fpv_share_feedback WHERE user_id = :user_id GROUP BY item_uuid"
    );
    $stmt->execute(['user_id' => $userId]);

    $byItem = [];
    $general = ['total' => 0, 'unread' => 0];
    foreach ($stmt->fetchAll() as $row) {
        $entry = [
            'total' => (int) $row['total'],
            'like' => (int) $row['likes'],
            'doubt' => (int) $row['doubts'],
            'dislike' => (int) $row['dislikes'],
            'comments' => (int) $row['comments'],
            'unread' => (int) $row['unread'],
        ];
        if ($row['item_uuid'] === null) {
            $general = ['total' => $entry['total'], 'unread' => $entry['unread']];
        } else {
            $byItem[$row['item_uuid']] = $entry;
        }
    }

    // Soma as reacoes de uma batida (nao geram "nao lido": o dono ve so o placar).
    foreach (fpv_share_reaction_counts($pdo, $userId) as $uuid => $r) {
        $entry = $byItem[$uuid] ?? ['total' => 0, 'like' => 0, 'doubt' => 0, 'dislike' => 0, 'comments' => 0, 'unread' => 0];
        $entry['like'] += $r['like'];
        $entry['dislike'] += $r['dislike'];
        $entry['total'] += $r['like'] + $r['dislike'];
        $byItem[$uuid] = $entry;
    }

    $unread = $general['unread'];
    foreach ($byItem as $entry) {
        $unread += $entry['unread'];
    }
    return ['by_item' => $byItem, 'general' => $general, 'unread' => $unread];
}

/** Resumo leve para o board: badge do header + contadores por item. */
function fpv_share_summary(PDO $pdo, int $userId): ?array
{
    if (!fpv_schema_ready()) {
        return null;
    }
    $row = fpv_share_row($pdo, $userId);
    $counts = fpv_share_feedback_counts($pdo, $userId);
    return [
        'is_active' => $row ? (bool) $row['is_active'] : false,
        'has_share' => $row !== null,
        'unread' => $counts['unread'],
        'by_item' => (object) $counts['by_item'],
    ];
}

function fpv_share_owner_payload(PDO $pdo, int $userId): array
{
    $row = fpv_share_row($pdo, $userId);
    $share = null;
    if ($row) {
        $share = [
            'is_active' => (bool) $row['is_active'],
            'token' => $row['token'],
            'url' => fpv_share_public_url($row['token']),
            'show_prices' => (bool) $row['show_prices'],
            'allow_feedback' => (bool) $row['allow_feedback'],
            'title' => $row['title'],
            'message' => $row['message'],
            'view_count' => (int) $row['view_count'],
            'last_viewed_at' => fpv_iso_utc($row['last_viewed_at']),
        ];
    }

    $stmt = $pdo->prepare(
        'SELECT id, item_uuid, item_name, author_name, reaction, message, is_read, created_at
         FROM fpv_share_feedback WHERE user_id = :user_id ORDER BY created_at DESC, id DESC LIMIT ' . FPV_SHARE_FEEDBACK_LIST_LIMIT
    );
    $stmt->execute(['user_id' => $userId]);
    $feedback = array_map(static fn(array $f): array => [
        'id' => (int) $f['id'],
        'item_uuid' => $f['item_uuid'],
        'item_name' => $f['item_name'],
        'author_name' => $f['author_name'],
        'reaction' => $f['reaction'],
        'message' => $f['message'],
        'is_read' => (bool) $f['is_read'],
        'created_at' => fpv_iso_utc($f['created_at']),
    ], $stmt->fetchAll());

    $counts = fpv_share_feedback_counts($pdo, $userId);

    return [
        'success' => true,
        'share' => $share,
        'feedback' => $feedback,
        'reactions' => (object) fpv_share_reaction_counts($pdo, $userId),
        'unread' => $counts['unread'],
    ];
}

function get_fpv_share(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);
    if (!fpv_schema_ready()) {
        return fpv_share_unavailable();
    }
    return fpv_share_owner_payload($pdo, $userId);
}

function save_fpv_share(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);
    if (!fpv_schema_ready()) {
        return fpv_share_unavailable();
    }

    $row = fpv_share_row($pdo, $userId);
    $flag = static fn(string $key, bool $default): int => array_key_exists($key, $input)
        ? (int) filter_var($input[$key], FILTER_VALIDATE_BOOLEAN)
        : (int) $default;

    $enabled = $flag('enabled', $row ? (bool) $row['is_active'] : true);
    $showPrices = $flag('show_prices', $row ? (bool) $row['show_prices'] : true);
    $allowFeedback = $flag('allow_feedback', $row ? (bool) $row['allow_feedback'] : true);
    $title = array_key_exists('title', $input) ? fpv_sanitize_string($input['title'], 120) : ($row['title'] ?? '');
    $message = array_key_exists('message', $input) ? fpv_sanitize_string($input['message'], 500) : ($row['message'] ?? '');
    $regenerate = !empty($input['regenerate']);

    if (!$row) {
        $stmt = $pdo->prepare(
            'INSERT INTO fpv_shares (user_id, token, is_active, show_prices, allow_feedback, title, message)
             VALUES (:user_id, :token, :is_active, :show_prices, :allow_feedback, :title, :message)'
        );
        $stmt->execute([
            'user_id' => $userId,
            'token' => bin2hex(random_bytes(16)),
            'is_active' => $enabled,
            'show_prices' => $showPrices,
            'allow_feedback' => $allowFeedback,
            'title' => $title,
            'message' => $message,
        ]);
    } else {
        $token = $regenerate ? bin2hex(random_bytes(16)) : $row['token'];
        $stmt = $pdo->prepare(
            'UPDATE fpv_shares SET token = :token, is_active = :is_active, show_prices = :show_prices,
             allow_feedback = :allow_feedback, title = :title, message = :message WHERE user_id = :user_id'
        );
        $stmt->execute([
            'token' => $token,
            'is_active' => $enabled,
            'show_prices' => $showPrices,
            'allow_feedback' => $allowFeedback,
            'title' => $title,
            'message' => $message,
            'user_id' => $userId,
        ]);
    }

    return fpv_share_owner_payload($pdo, $userId);
}

function mark_fpv_feedback_read(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);
    if (!fpv_schema_ready()) {
        return fpv_share_unavailable();
    }

    if (!empty($input['all'])) {
        $pdo->prepare('UPDATE fpv_share_feedback SET is_read = 1 WHERE user_id = :user_id AND is_read = 0')->execute(['user_id' => $userId]);
    } elseif (!empty($input['item_uuid'])) {
        $pdo->prepare('UPDATE fpv_share_feedback SET is_read = 1 WHERE user_id = :user_id AND item_uuid = :item_uuid')
            ->execute(['user_id' => $userId, 'item_uuid' => fpv_sanitize_string($input['item_uuid'], 36)]);
    }
    return fpv_share_owner_payload($pdo, $userId);
}

function delete_fpv_feedback(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);
    if (!fpv_schema_ready()) {
        return fpv_share_unavailable();
    }

    $id = (int) ($input['feedback_id'] ?? 0);
    if ($id <= 0) {
        return ['success' => false, 'message' => 'feedback_id invalido.', '_code' => 400];
    }
    $pdo->prepare('DELETE FROM fpv_share_feedback WHERE id = :id AND user_id = :user_id')->execute(['id' => $id, 'user_id' => $userId]);
    return fpv_share_owner_payload($pdo, $userId);
}

// ─────────────────────────────────────────────────────────────────────────
// Lado publico (visitantes, sem login)
// ─────────────────────────────────────────────────────────────────────────

/** Reacao atual do visitante em cada item da lista: item_uuid => 'like'|'dislike'. */
function fpv_share_my_reactions(PDO $pdo, int $ownerId, string $visitorKey): array
{
    $stmt = $pdo->prepare('SELECT item_uuid, reaction FROM fpv_share_reactions WHERE user_id = :user_id AND visitor_key = :key');
    $stmt->execute(['user_id' => $ownerId, 'key' => $visitorKey]);
    return $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
}

/** Placar publico de um item (o texto dos comentarios continua so para o dono). */
function fpv_share_item_score(PDO $pdo, int $ownerId, string $itemUuid): array
{
    $by = fpv_share_feedback_counts($pdo, $ownerId)['by_item'][$itemUuid] ?? null;
    return [
        'likes' => (int) ($by['like'] ?? 0),
        'dislikes' => (int) ($by['dislike'] ?? 0),
        'comments' => (int) ($by['comments'] ?? 0),
    ];
}

/** Carrega a lista publica pelo token; null se o token nao existir ou o dono tiver desativado o link. */
function fpv_public_share_load(string $token, ?int $viewerUserId = null): ?array
{
    if (!fpv_schema_ready() || !preg_match('/^[a-f0-9]{32}$/', $token)) {
        return null;
    }
    $pdo = fpv_pdo();

    $stmt = $pdo->prepare('SELECT * FROM fpv_shares WHERE token = :token AND is_active = 1');
    $stmt->execute(['token' => $token]);
    $share = $stmt->fetch();
    if (!$share) {
        return null;
    }
    $ownerId = (int) $share['user_id'];

    $owner = $pdo->prepare('SELECT name, avatar_path FROM fpv_users WHERE id = :id');
    $owner->execute(['id' => $ownerId]);
    $ownerRow = $owner->fetch();
    if (!$ownerRow) {
        return null;
    }

    $categories = $pdo->prepare('SELECT id, name, color_class FROM fpv_categories WHERE user_id = :user_id ORDER BY sort_order, id');
    $categories->execute(['user_id' => $ownerId]);

    $items = $pdo->prepare(
        'SELECT item_uuid, name, category_id, price, store_url, image_path, is_purchased
         FROM fpv_items WHERE user_id = :user_id ORDER BY sort_order, id'
    );
    $items->execute(['user_id' => $ownerId]);

    $showPrices = (bool) $share['show_prices'];

    // Placar (curtidas/descurtidas/comentarios) e a reacao do proprio visitante. O cookie do visitante
    // e entregue aqui, na 1a visita, antes de qualquer saida.
    $counts = fpv_share_feedback_counts($pdo, $ownerId)['by_item'];
    $mine = fpv_share_my_reactions($pdo, $ownerId, fpv_visitor_key());
    fpv_visitor_key(true);

    $itemRows = [];
    $total = 0.0;
    $purchased = 0;
    foreach ($items->fetchAll() as $row) {
        $url = fpv_normalize_store_url((string) $row['store_url']);
        $price = (float) $row['price'];
        $total += $price;
        $purchased += (int) $row['is_purchased'];
        $itemRows[] = [
            'uuid' => $row['item_uuid'],
            'name' => $row['name'],
            'category_id' => $row['category_id'] !== null ? (int) $row['category_id'] : null,
            'price' => $showPrices ? $price : null,
            'store_url' => $url,
            'image_path' => $row['image_path'],
            'is_purchased' => (bool) $row['is_purchased'],
            'likes' => (int) ($counts[$row['item_uuid']]['like'] ?? 0),
            'dislikes' => (int) ($counts[$row['item_uuid']]['dislike'] ?? 0),
            'comments' => (int) ($counts[$row['item_uuid']]['comments'] ?? 0),
            'my_reaction' => $mine[$row['item_uuid']] ?? null,
        ];
    }

    // Conta a visualizacao (menos a do proprio dono olhando o preview).
    if ($viewerUserId !== $ownerId) {
        $pdo->prepare('UPDATE fpv_shares SET view_count = view_count + 1, last_viewed_at = NOW() WHERE user_id = :user_id')
            ->execute(['user_id' => $ownerId]);
    }

    return [
        'token' => $token,
        'owner_name' => explode(' ', trim((string) $ownerRow['name']))[0],
        'owner_avatar' => $ownerRow['avatar_path'],
        'title' => $share['title'],
        'message' => $share['message'],
        'show_prices' => $showPrices,
        'allow_feedback' => (bool) $share['allow_feedback'],
        'categories' => array_map(static fn(array $c): array => [
            'id' => (int) $c['id'], 'name' => $c['name'], 'color_class' => $c['color_class'],
        ], $categories->fetchAll()),
        'items' => $itemRows,
        'total' => $showPrices ? round($total, 2) : null,
        'purchased_count' => $purchased,
    ];
}

function fpv_share_clean_text(string $value, int $max): string
{
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
    return fpv_sanitize_string($value, $max);
}

/** Acao PUBLICA: visitante deixa reacao e/ou comentario. */
function add_fpv_feedback(array $input): array
{
    if (!fpv_schema_ready()) {
        return fpv_share_unavailable();
    }
    $pdo = fpv_pdo();

    // Honeypot: robos preenchem o campo escondido; respondemos "ok" sem gravar nada.
    if (!empty($input['website'])) {
        return ['success' => true];
    }

    $token = fpv_sanitize_string($input['token'] ?? '', 32);
    if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
        return ['success' => false, 'message' => 'Link invalido.', '_code' => 404];
    }
    $stmt = $pdo->prepare('SELECT user_id, allow_feedback FROM fpv_shares WHERE token = :token AND is_active = 1');
    $stmt->execute(['token' => $token]);
    $share = $stmt->fetch();
    if (!$share) {
        return ['success' => false, 'message' => 'Esta lista nao esta mais disponivel.', '_code' => 404];
    }
    if (!(int) $share['allow_feedback']) {
        return ['success' => false, 'message' => 'O dono desta lista desativou os comentarios.', '_code' => 403];
    }
    $ownerId = (int) $share['user_id'];

    $author = fpv_share_clean_text((string) ($input['author_name'] ?? ''), 60);
    if ($author === '') {
        $author = 'Visitante';
    }
    $message = fpv_share_clean_text((string) ($input['message'] ?? ''), 600);
    $reaction = (string) ($input['reaction'] ?? '');
    if (!in_array($reaction, FPV_SHARE_REACTIONS, true)) {
        $reaction = '';
    }
    if ($reaction === '' && $message === '') {
        return ['success' => false, 'message' => 'Escolha uma reacao ou escreva um comentario.', '_code' => 400];
    }

    $itemUuid = null;
    $itemName = '';
    $rawUuid = fpv_sanitize_string($input['item_uuid'] ?? '', 36);
    if ($rawUuid !== '') {
        $itemStmt = $pdo->prepare('SELECT item_uuid, name FROM fpv_items WHERE item_uuid = :uuid AND user_id = :user_id');
        $itemStmt->execute(['uuid' => $rawUuid, 'user_id' => $ownerId]);
        $item = $itemStmt->fetch();
        if (!$item) {
            return ['success' => false, 'message' => 'Item nao encontrado nesta lista.', '_code' => 404];
        }
        $itemUuid = $item['item_uuid'];
        $itemName = $item['name'];
    }

    // Limites: por visitante e por lista (defesa em profundidade contra spam).
    $visitor = fpv_visitor_hash();
    $perVisitor = $pdo->prepare('SELECT COUNT(*) FROM fpv_share_feedback WHERE user_id = :u AND ip_hash = :h AND created_at > (NOW() - INTERVAL 1 HOUR)');
    $perVisitor->execute(['u' => $ownerId, 'h' => $visitor]);
    $perShareHour = $pdo->prepare('SELECT COUNT(*) FROM fpv_share_feedback WHERE user_id = :u AND created_at > (NOW() - INTERVAL 1 HOUR)');
    $perShareHour->execute(['u' => $ownerId]);
    $perShareDay = $pdo->prepare('SELECT COUNT(*) FROM fpv_share_feedback WHERE user_id = :u AND created_at > (NOW() - INTERVAL 1 DAY)');
    $perShareDay->execute(['u' => $ownerId]);
    if ((int) $perVisitor->fetchColumn() >= FPV_SHARE_FEEDBACK_PER_VISITOR_HOUR
        || (int) $perShareHour->fetchColumn() >= FPV_SHARE_FEEDBACK_PER_SHARE_HOUR
        || (int) $perShareDay->fetchColumn() >= FPV_SHARE_FEEDBACK_PER_SHARE_DAY) {
        return ['success' => false, 'message' => 'Muitas opinioes em pouco tempo. Tente novamente mais tarde.', '_code' => 429];
    }

    // Duplo clique / reenvio identico no ultimo minuto: ignora.
    $dup = $pdo->prepare(
        'SELECT 1 FROM fpv_share_feedback WHERE user_id = :u AND ip_hash = :h AND message = :m
         AND ((item_uuid IS NULL AND :i1 IS NULL) OR item_uuid = :i2) AND COALESCE(reaction, \'\') = :r
         AND created_at > (NOW() - INTERVAL 1 MINUTE) LIMIT 1'
    );
    $dup->execute(['u' => $ownerId, 'h' => $visitor, 'm' => $message, 'i1' => $itemUuid, 'i2' => $itemUuid, 'r' => $reaction]);
    if ($dup->fetchColumn()) {
        return ['success' => true] + ($itemUuid !== null ? fpv_share_item_score($pdo, $ownerId, $itemUuid) : []);
    }

    $insert = $pdo->prepare(
        'INSERT INTO fpv_share_feedback (user_id, item_uuid, item_name, author_name, reaction, message, ip_hash)
         VALUES (:user_id, :item_uuid, :item_name, :author, :reaction, :message, :ip_hash)'
    );
    $insert->execute([
        'user_id' => $ownerId,
        'item_uuid' => $itemUuid,
        'item_name' => $itemName,
        'author' => $author,
        'reaction' => $reaction !== '' ? $reaction : null,
        'message' => $message,
        'ip_hash' => $visitor,
    ]);

    return ['success' => true] + ($itemUuid !== null ? fpv_share_item_score($pdo, $ownerId, $itemUuid) : []);
}

/**
 * Acao PUBLICA: curtir/descurtir com uma batida. Bater de novo na mesma reacao a desfaz; bater na outra troca.
 * Uma reacao por visitante e item (UNIQUE), sem nome nem texto.
 */
function toggle_fpv_reaction(array $input): array
{
    if (!fpv_schema_ready()) {
        return fpv_share_unavailable();
    }
    $pdo = fpv_pdo();

    $token = fpv_sanitize_string($input['token'] ?? '', 32);
    if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
        return ['success' => false, 'message' => 'Link invalido.', '_code' => 404];
    }
    $stmt = $pdo->prepare('SELECT user_id, allow_feedback FROM fpv_shares WHERE token = :token AND is_active = 1');
    $stmt->execute(['token' => $token]);
    $share = $stmt->fetch();
    if (!$share) {
        return ['success' => false, 'message' => 'Esta lista nao esta mais disponivel.', '_code' => 404];
    }
    if (!(int) $share['allow_feedback']) {
        return ['success' => false, 'message' => 'O dono desta lista desativou as reacoes.', '_code' => 403];
    }
    $ownerId = (int) $share['user_id'];

    $reaction = (string) ($input['reaction'] ?? '');
    if (!in_array($reaction, FPV_TOGGLE_REACTIONS, true)) {
        return ['success' => false, 'message' => 'Reacao invalida.', '_code' => 400];
    }

    $itemUuid = fpv_sanitize_string($input['item_uuid'] ?? '', 36);
    $itemStmt = $pdo->prepare('SELECT 1 FROM fpv_items WHERE item_uuid = :uuid AND user_id = :user_id');
    $itemStmt->execute(['uuid' => $itemUuid, 'user_id' => $ownerId]);
    if ($itemUuid === '' || !$itemStmt->fetchColumn()) {
        return ['success' => false, 'message' => 'Item nao encontrado nesta lista.', '_code' => 404];
    }

    $key = fpv_visitor_key(true);
    $existing = $pdo->prepare('SELECT reaction FROM fpv_share_reactions WHERE item_uuid = :uuid AND visitor_key = :key');
    $existing->execute(['uuid' => $itemUuid, 'key' => $key]);
    $current = $existing->fetchColumn();

    if ($current === $reaction) {
        $pdo->prepare('DELETE FROM fpv_share_reactions WHERE item_uuid = :uuid AND visitor_key = :key')
            ->execute(['uuid' => $itemUuid, 'key' => $key]);
        $mine = null;
    } else {
        $ipHash = fpv_visitor_hash();
        if ($current === false) {
            // Reacao nova: limita criacoes por visitante (IP+UA) e por lista para conter inflacao de placar.
            $perVisitor = $pdo->prepare('SELECT COUNT(*) FROM fpv_share_reactions WHERE ip_hash = :h AND created_at > (NOW() - INTERVAL 1 HOUR)');
            $perVisitor->execute(['h' => $ipHash]);
            $perShare = $pdo->prepare('SELECT COUNT(*) FROM fpv_share_reactions WHERE user_id = :u AND created_at > (NOW() - INTERVAL 1 HOUR)');
            $perShare->execute(['u' => $ownerId]);
            if ((int) $perVisitor->fetchColumn() >= FPV_REACTIONS_NEW_PER_VISITOR_HOUR
                || (int) $perShare->fetchColumn() >= FPV_REACTIONS_NEW_PER_SHARE_HOUR) {
                return ['success' => false, 'message' => 'Muitas reacoes em pouco tempo. Tente novamente mais tarde.', '_code' => 429];
            }
        }
        $pdo->prepare(
            'INSERT INTO fpv_share_reactions (user_id, item_uuid, visitor_key, ip_hash, reaction)
             VALUES (:user_id, :item_uuid, :key, :ip_hash, :reaction)
             ON DUPLICATE KEY UPDATE reaction = VALUES(reaction)'
        )->execute(['user_id' => $ownerId, 'item_uuid' => $itemUuid, 'key' => $key, 'ip_hash' => $ipHash, 'reaction' => $reaction]);
        $mine = $reaction;
    }

    return ['success' => true, 'my_reaction' => $mine] + fpv_share_item_score($pdo, $ownerId, $itemUuid);
}
