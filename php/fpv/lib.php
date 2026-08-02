<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

// ─────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────

function login_fpv(array $input): array
{
    $pdo = fpv_pdo();
    $ipHash = fpv_ip_hash();

    if (fpv_login_rate_limited($pdo, $ipHash)) {
        return ['success' => false, 'message' => 'Muitas tentativas de login. Tente novamente mais tarde.', '_code' => 429];
    }

    $config = fpv_config();
    $expectedHash = (string) $config['dashboard_password_hash'];
    if ($expectedHash === '') {
        return ['success' => false, 'configured' => false, 'message' => 'Configure FPV_DASHBOARD_PASSWORD_HASH.', '_code' => 500];
    }

    $password = fpv_sanitize_string($input['password'] ?? '', 200);
    if ($password === '' || !password_verify($password, $expectedHash)) {
        fpv_record_login_attempt($pdo, $ipHash);
        return ['success' => false, 'message' => 'Senha invalida.', '_code' => 401];
    }

    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $stmt = $pdo->prepare(
        'INSERT INTO fpv_sessions (token_hash, ip_hash, expires_at) VALUES (:token_hash, :ip_hash, (NOW() + INTERVAL ' . FPV_SESSION_TTL_SECONDS . ' SECOND))'
    );
    $stmt->execute(['token_hash' => $tokenHash, 'ip_hash' => $ipHash]);

    return [
        'success' => true,
        'token' => $token,
        'expires_in_seconds' => FPV_SESSION_TTL_SECONDS,
    ];
}

function logout_fpv(array $input): array
{
    $token = fpv_sanitize_string($input['token'] ?? '', 128);
    if ($token !== '') {
        $stmt = fpv_pdo()->prepare('DELETE FROM fpv_sessions WHERE token_hash = :token_hash');
        $stmt->execute(['token_hash' => hash('sha256', $token)]);
    }
    return ['success' => true];
}

// ─────────────────────────────────────────────────────────────────────────
// Board (leitura combinada)
// ─────────────────────────────────────────────────────────────────────────

function get_fpv_board(array $params): array
{
    $pdo = fpv_pdo();
    require_fpv_session($pdo, (string) ($params['token'] ?? ''));

    $categories = $pdo->query('SELECT id, name, color_class, sort_order FROM fpv_categories ORDER BY sort_order, id')->fetchAll();

    $items = $pdo->query(
        'SELECT id, item_uuid, name, category_id, price, store_url, image_path, is_purchased, sort_order, created_at
         FROM fpv_items ORDER BY sort_order, id'
    )->fetchAll();

    $planningStmt = $pdo->query('SELECT saved_amount, target_date FROM fpv_planning WHERE id = 1');
    $planning = $planningStmt->fetch() ?: ['saved_amount' => '0.00', 'target_date' => null];

    $videos = $pdo->query('SELECT id, url, title, video_id FROM fpv_videos ORDER BY sort_order, id DESC')->fetchAll();

    return [
        'success' => true,
        'categories' => array_map(static fn($row) => [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'color_class' => $row['color_class'],
            'sort_order' => (int) $row['sort_order'],
        ], $categories),
        'items' => array_map(static fn($row) => [
            'id' => (int) $row['id'],
            'item_uuid' => $row['item_uuid'],
            'name' => $row['name'],
            'category_id' => $row['category_id'] !== null ? (int) $row['category_id'] : null,
            'price' => (float) $row['price'],
            'store_url' => $row['store_url'],
            'image_path' => $row['image_path'],
            'is_purchased' => (bool) $row['is_purchased'],
            'sort_order' => (int) $row['sort_order'],
            'created_at' => $row['created_at'],
        ], $items),
        'planning' => [
            'saved_amount' => (float) $planning['saved_amount'],
            'target_date' => $planning['target_date'],
        ],
        'videos' => array_map(static fn($row) => [
            'id' => (int) $row['id'],
            'url' => $row['url'],
            'title' => $row['title'],
            'video_id' => $row['video_id'],
        ], $videos),
    ];
}

// ─────────────────────────────────────────────────────────────────────────
// Categorias
// ─────────────────────────────────────────────────────────────────────────

function add_fpv_category(array $input): array
{
    $pdo = fpv_pdo();
    require_fpv_session($pdo, (string) ($input['token'] ?? ''));

    $name = fpv_sanitize_string($input['name'] ?? '', 80);
    $colorClass = fpv_sanitize_string($input['color_class'] ?? '', 60) ?: 'bg-gray-100 text-gray-800';

    if ($name === '') {
        return ['success' => false, 'message' => 'Nome da categoria obrigatorio.', '_code' => 400];
    }

    $sortOrder = (int) $pdo->query('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM fpv_categories')->fetchColumn();

    $stmt = $pdo->prepare('INSERT INTO fpv_categories (name, color_class, sort_order) VALUES (:name, :color_class, :sort_order)');
    $stmt->execute(['name' => $name, 'color_class' => $colorClass, 'sort_order' => $sortOrder]);

    return [
        'success' => true,
        'category' => ['id' => (int) $pdo->lastInsertId(), 'name' => $name, 'color_class' => $colorClass, 'sort_order' => $sortOrder],
    ];
}

function delete_fpv_category(array $input): array
{
    $pdo = fpv_pdo();
    require_fpv_session($pdo, (string) ($input['token'] ?? ''));

    $id = (int) ($input['category_id'] ?? 0);
    if ($id <= 0) {
        return ['success' => false, 'message' => 'category_id invalido.', '_code' => 400];
    }

    $stmt = $pdo->prepare('DELETE FROM fpv_categories WHERE id = :id');
    $stmt->execute(['id' => $id]);

    return ['success' => true];
}

// ─────────────────────────────────────────────────────────────────────────
// Itens
// ─────────────────────────────────────────────────────────────────────────

function fpv_upload_dir_ensure(): void
{
    if (!is_dir(FPV_UPLOAD_DIR)) {
        mkdir(FPV_UPLOAD_DIR, 0755, true);
    }
}

/** Valida e move um upload de imagem. Retorna o path publico relativo, ou '' se nao houver arquivo. */
function fpv_handle_image_upload(?array $file): string
{
    if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return '';
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Falha no upload da imagem.');
    }
    if ($file['size'] > FPV_UPLOAD_MAX_BYTES) {
        throw new RuntimeException('Imagem maior que 5MB.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->file($file['tmp_name']);
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
    if (!isset($allowed[$mime])) {
        throw new RuntimeException('Formato de imagem nao suportado.');
    }

    fpv_upload_dir_ensure();
    $filename = bin2hex(random_bytes(16)) . '.' . $allowed[$mime];
    $destination = FPV_UPLOAD_DIR . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        throw new RuntimeException('Nao foi possivel salvar a imagem.');
    }

    return FPV_UPLOAD_PUBLIC_PATH . '/' . $filename;
}

function fpv_delete_image_file(string $imagePath): void
{
    if ($imagePath === '') {
        return;
    }
    $full = __DIR__ . '/../../' . ltrim($imagePath, '/');
    if (is_file($full)) {
        @unlink($full);
    }
}

function add_fpv_item(array $input, ?array $file): array
{
    $pdo = fpv_pdo();
    require_fpv_session($pdo, (string) ($input['token'] ?? ''));

    $name = fpv_sanitize_string($input['name'] ?? '', 200);
    if ($name === '') {
        return ['success' => false, 'message' => 'Nome do item obrigatorio.', '_code' => 400];
    }

    $price = round((float) ($input['price'] ?? 0), 2);
    if ($price < 0) {
        $price = 0;
    }

    $storeUrl = fpv_sanitize_string($input['store_url'] ?? '', 500);
    $categoryId = isset($input['category_id']) && $input['category_id'] !== '' ? (int) $input['category_id'] : null;

    if ($categoryId !== null) {
        $check = $pdo->prepare('SELECT id FROM fpv_categories WHERE id = :id');
        $check->execute(['id' => $categoryId]);
        if (!$check->fetch()) {
            $categoryId = null;
        }
    }

    try {
        $imagePath = fpv_handle_image_upload($file);
    } catch (RuntimeException $e) {
        return ['success' => false, 'message' => $e->getMessage(), '_code' => 400];
    }

    $itemUuid = fpv_generate_uuid();
    $sortOrder = (int) $pdo->query('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM fpv_items')->fetchColumn();

    $stmt = $pdo->prepare(
        'INSERT INTO fpv_items (item_uuid, name, category_id, price, store_url, image_path, sort_order)
         VALUES (:item_uuid, :name, :category_id, :price, :store_url, :image_path, :sort_order)'
    );
    $stmt->execute([
        'item_uuid' => $itemUuid,
        'name' => $name,
        'category_id' => $categoryId,
        'price' => $price,
        'store_url' => $storeUrl,
        'image_path' => $imagePath,
        'sort_order' => $sortOrder,
    ]);

    return [
        'success' => true,
        'item' => [
            'id' => (int) $pdo->lastInsertId(),
            'item_uuid' => $itemUuid,
            'name' => $name,
            'category_id' => $categoryId,
            'price' => $price,
            'store_url' => $storeUrl,
            'image_path' => $imagePath,
            'is_purchased' => false,
            'sort_order' => $sortOrder,
        ],
    ];
}

function update_fpv_item(array $input, ?array $file): array
{
    $pdo = fpv_pdo();
    require_fpv_session($pdo, (string) ($input['token'] ?? ''));

    $itemUuid = fpv_sanitize_string($input['item_uuid'] ?? '', 64);
    if ($itemUuid === '') {
        return ['success' => false, 'message' => 'item_uuid obrigatorio.', '_code' => 400];
    }

    $stmt = $pdo->prepare('SELECT * FROM fpv_items WHERE item_uuid = :item_uuid');
    $stmt->execute(['item_uuid' => $itemUuid]);
    $existing = $stmt->fetch();
    if (!$existing) {
        return ['success' => false, 'message' => 'Item nao encontrado.', '_code' => 404];
    }

    $name = isset($input['name']) ? fpv_sanitize_string($input['name'], 200) : $existing['name'];
    $price = isset($input['price']) ? round((float) $input['price'], 2) : (float) $existing['price'];
    if ($price < 0) {
        $price = 0;
    }
    $storeUrl = isset($input['store_url']) ? fpv_sanitize_string($input['store_url'], 500) : $existing['store_url'];
    $categoryId = $existing['category_id'] !== null ? (int) $existing['category_id'] : null;
    if (array_key_exists('category_id', $input)) {
        $categoryId = $input['category_id'] !== '' ? (int) $input['category_id'] : null;
        if ($categoryId !== null) {
            $check = $pdo->prepare('SELECT id FROM fpv_categories WHERE id = :id');
            $check->execute(['id' => $categoryId]);
            if (!$check->fetch()) {
                $categoryId = null;
            }
        }
    }
    $isPurchased = isset($input['is_purchased']) ? (int) filter_var($input['is_purchased'], FILTER_VALIDATE_BOOLEAN) : (int) $existing['is_purchased'];

    $imagePath = $existing['image_path'];
    try {
        $newImage = fpv_handle_image_upload($file);
    } catch (RuntimeException $e) {
        return ['success' => false, 'message' => $e->getMessage(), '_code' => 400];
    }
    if ($newImage !== '') {
        fpv_delete_image_file($imagePath);
        $imagePath = $newImage;
    }

    $update = $pdo->prepare(
        'UPDATE fpv_items SET name = :name, category_id = :category_id, price = :price, store_url = :store_url,
         image_path = :image_path, is_purchased = :is_purchased WHERE item_uuid = :item_uuid'
    );
    $update->execute([
        'name' => $name,
        'category_id' => $categoryId,
        'price' => $price,
        'store_url' => $storeUrl,
        'image_path' => $imagePath,
        'is_purchased' => $isPurchased,
        'item_uuid' => $itemUuid,
    ]);

    return [
        'success' => true,
        'item' => [
            'item_uuid' => $itemUuid,
            'name' => $name,
            'category_id' => $categoryId,
            'price' => $price,
            'store_url' => $storeUrl,
            'image_path' => $imagePath,
            'is_purchased' => (bool) $isPurchased,
        ],
    ];
}

function delete_fpv_item(array $input): array
{
    $pdo = fpv_pdo();
    require_fpv_session($pdo, (string) ($input['token'] ?? ''));

    $itemUuid = fpv_sanitize_string($input['item_uuid'] ?? '', 64);
    if ($itemUuid === '') {
        return ['success' => false, 'message' => 'item_uuid obrigatorio.', '_code' => 400];
    }

    $stmt = $pdo->prepare('SELECT image_path FROM fpv_items WHERE item_uuid = :item_uuid');
    $stmt->execute(['item_uuid' => $itemUuid]);
    $row = $stmt->fetch();

    $delete = $pdo->prepare('DELETE FROM fpv_items WHERE item_uuid = :item_uuid');
    $delete->execute(['item_uuid' => $itemUuid]);

    if ($row && $row['image_path']) {
        fpv_delete_image_file($row['image_path']);
    }

    return ['success' => true];
}

// ─────────────────────────────────────────────────────────────────────────
// Planejamento financeiro
// ─────────────────────────────────────────────────────────────────────────

function save_fpv_planning(array $input): array
{
    $pdo = fpv_pdo();
    require_fpv_session($pdo, (string) ($input['token'] ?? ''));

    $savedAmount = round((float) ($input['saved_amount'] ?? 0), 2);
    if ($savedAmount < 0) {
        $savedAmount = 0;
    }
    $targetDate = fpv_sanitize_string($input['target_date'] ?? '', 10);
    $targetDate = preg_match('/^\d{4}-\d{2}-\d{2}$/', $targetDate) ? $targetDate : null;

    $stmt = $pdo->prepare(
        'INSERT INTO fpv_planning (id, saved_amount, target_date) VALUES (1, :saved_amount, :target_date)
         ON DUPLICATE KEY UPDATE saved_amount = VALUES(saved_amount), target_date = VALUES(target_date)'
    );
    $stmt->execute(['saved_amount' => $savedAmount, 'target_date' => $targetDate]);

    return ['success' => true, 'planning' => ['saved_amount' => $savedAmount, 'target_date' => $targetDate]];
}

// ─────────────────────────────────────────────────────────────────────────
// Videos favoritos
// ─────────────────────────────────────────────────────────────────────────

function fpv_extract_youtube_id(string $url): string
{
    if (preg_match('/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/', $url, $matches)) {
        return $matches[1];
    }
    return '';
}

function add_fpv_video(array $input): array
{
    $pdo = fpv_pdo();
    require_fpv_session($pdo, (string) ($input['token'] ?? ''));

    $url = fpv_sanitize_string($input['url'] ?? '', 500);
    $title = fpv_sanitize_string($input['title'] ?? '', 255);
    if ($url === '' || !filter_var($url, FILTER_VALIDATE_URL)) {
        return ['success' => false, 'message' => 'URL invalida.', '_code' => 400];
    }

    $videoId = fpv_extract_youtube_id($url);
    if ($videoId === '') {
        return ['success' => false, 'message' => 'Informe um link valido do YouTube.', '_code' => 400];
    }

    $stmt = $pdo->prepare('INSERT INTO fpv_videos (url, title, video_id) VALUES (:url, :title, :video_id)');
    $stmt->execute(['url' => $url, 'title' => $title, 'video_id' => $videoId]);

    return [
        'success' => true,
        'video' => ['id' => (int) $pdo->lastInsertId(), 'url' => $url, 'title' => $title, 'video_id' => $videoId],
    ];
}

function delete_fpv_video(array $input): array
{
    $pdo = fpv_pdo();
    require_fpv_session($pdo, (string) ($input['token'] ?? ''));

    $id = (int) ($input['video_id'] ?? 0);
    if ($id <= 0) {
        return ['success' => false, 'message' => 'video_id invalido.', '_code' => 400];
    }

    $stmt = $pdo->prepare('DELETE FROM fpv_videos WHERE id = :id');
    $stmt->execute(['id' => $id]);

    return ['success' => true];
}

// ─────────────────────────────────────────────────────────────────────────
// Reset total
// ─────────────────────────────────────────────────────────────────────────

function reset_fpv_data(array $input): array
{
    $pdo = fpv_pdo();
    require_fpv_session($pdo, (string) ($input['token'] ?? ''));

    $images = $pdo->query('SELECT image_path FROM fpv_items WHERE image_path <> \'\'')->fetchAll();

    $pdo->exec('DELETE FROM fpv_items');
    $pdo->exec('DELETE FROM fpv_categories');
    $pdo->exec('DELETE FROM fpv_videos');
    $pdo->exec('DELETE FROM fpv_planning');
    $pdo->exec('ALTER TABLE fpv_items AUTO_INCREMENT = 1');
    $pdo->exec('ALTER TABLE fpv_categories AUTO_INCREMENT = 1');
    $pdo->exec('ALTER TABLE fpv_videos AUTO_INCREMENT = 1');

    foreach ($images as $row) {
        fpv_delete_image_file($row['image_path']);
    }

    $defaults = [
        ['Frame', 'bg-gray-100 text-gray-800', 1],
        ['Motores', 'bg-red-100 text-red-800', 2],
        ['FC / ESC', 'bg-blue-100 text-blue-800', 3],
        ['Camera/VTx', 'bg-purple-100 text-purple-800', 4],
        ['Radio/RX', 'bg-yellow-100 text-yellow-800', 5],
        ['Bateria', 'bg-green-100 text-green-800', 6],
        ['Acessorios', 'bg-teal-100 text-teal-800', 7],
    ];
    $insert = $pdo->prepare('INSERT INTO fpv_categories (name, color_class, sort_order) VALUES (:name, :color_class, :sort_order)');
    foreach ($defaults as [$name, $colorClass, $sortOrder]) {
        $insert->execute(['name' => $name, 'color_class' => $colorClass, 'sort_order' => $sortOrder]);
    }

    return ['success' => true];
}
