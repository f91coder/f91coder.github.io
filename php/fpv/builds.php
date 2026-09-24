<?php
declare(strict_types=1);

/**
 * Montagens ("builds"): varias listas por usuario — um drone/projeto cada.
 *
 * O que e da montagem: itens, data meta e o link publico (com opinioes e reacoes dos visitantes).
 * O que continua do usuario e e compartilhado entre montagens: categorias, videos favoritos e a CARTEIRA.
 * A carteira e unica de proposito: o dinheiro e um so; o saldo continua derivado
 * (depositos - retiradas - itens comprados de TODAS as montagens), ver wallet.php.
 */

const FPV_BUILD_COLORS = ['orange', 'blue', 'green', 'purple', 'pink', 'teal', 'yellow', 'red', 'slate'];
const FPV_BUILDS_MAX_PER_USER = 20;
const FPV_BUILD_DEFAULT_NAME = 'Minha montagem';

function fpv_builds_unavailable(): array
{
    return ['success' => false, 'message' => 'Montagens indisponiveis: atualizacao do banco pendente.', '_code' => 503];
}

function fpv_build_color(mixed $value): string
{
    $value = is_string($value) ? strtolower(trim($value)) : '';
    return in_array($value, FPV_BUILD_COLORS, true) ? $value : 'orange';
}

function fpv_build_row_by_uuid(PDO $pdo, int $userId, string $uuid): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM fpv_builds WHERE build_uuid = :uuid AND user_id = :user_id');
    $stmt->execute(['uuid' => $uuid, 'user_id' => $userId]);
    return $stmt->fetch() ?: null;
}

function fpv_first_build_row(PDO $pdo, int $userId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM fpv_builds WHERE user_id = :user_id ORDER BY sort_order, id LIMIT 1');
    $stmt->execute(['user_id' => $userId]);
    return $stmt->fetch() ?: null;
}

function fpv_next_build_sort(PDO $pdo, int $userId): int
{
    $stmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM fpv_builds WHERE user_id = :user_id');
    $stmt->execute(['user_id' => $userId]);
    return (int) $stmt->fetchColumn();
}

function fpv_insert_build(PDO $pdo, int $userId, string $name, string $description = '', string $color = 'orange', ?string $targetDate = null): array
{
    $uuid = fpv_generate_uuid();
    $pdo->prepare(
        'INSERT INTO fpv_builds (user_id, build_uuid, name, description, color, target_date, sort_order)
         VALUES (:user_id, :uuid, :name, :description, :color, :target_date, :sort_order)'
    )->execute([
        'user_id' => $userId,
        'uuid' => $uuid,
        'name' => $name,
        'description' => $description,
        'color' => fpv_build_color($color),
        'target_date' => $targetDate,
        'sort_order' => fpv_next_build_sort($pdo, $userId),
    ]);
    return fpv_build_row_by_uuid($pdo, $userId, $uuid);
}

/** Primeira montagem do usuario; cria "Minha montagem" se ele ainda nao tem nenhuma. */
function fpv_ensure_default_build(PDO $pdo, int $userId): array
{
    return fpv_first_build_row($pdo, $userId) ?? fpv_insert_build($pdo, $userId, FPV_BUILD_DEFAULT_NAME);
}

/** Montagem pedida (validada como do usuario) ou, sem pedido/invalida, a primeira. */
function fpv_resolve_build(PDO $pdo, int $userId, ?string $uuid): array
{
    $uuid = fpv_sanitize_string($uuid ?? '', 36);
    if ($uuid !== '') {
        $row = fpv_build_row_by_uuid($pdo, $userId, $uuid);
        if ($row) {
            return $row;
        }
    }
    return fpv_ensure_default_build($pdo, $userId);
}

function fpv_build_public(array $row): array
{
    return [
        'build_uuid' => $row['build_uuid'],
        'name' => $row['name'],
        'description' => $row['description'],
        'color' => $row['color'],
        'target_date' => $row['target_date'],
        'sort_order' => (int) $row['sort_order'],
    ];
}

/** Todas as montagens com os totais de cada uma (para as abas, a visao geral e o resumo consolidado). */
function fpv_builds_summary(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        "SELECT b.id, b.build_uuid, b.name, b.description, b.color, b.target_date, b.sort_order,
                COUNT(i.id) AS items_count,
                COALESCE(SUM(i.price), 0) AS total,
                COALESCE(SUM(CASE WHEN i.is_purchased = 1 THEN i.price ELSE 0 END), 0) AS purchased_total,
                COALESCE(SUM(i.is_purchased), 0) AS purchased_count,
                (SELECT x.image_path FROM fpv_items x WHERE x.build_id = b.id AND x.image_path <> '' ORDER BY x.sort_order, x.id LIMIT 1) AS cover_image,
                MAX(s.is_active) AS share_active
         FROM fpv_builds b
         LEFT JOIN fpv_items i ON i.build_id = b.id
         LEFT JOIN fpv_build_shares s ON s.build_id = b.id
         WHERE b.user_id = :user_id
         GROUP BY b.id, b.build_uuid, b.name, b.description, b.color, b.target_date, b.sort_order
         ORDER BY b.sort_order, b.id"
    );
    $stmt->execute(['user_id' => $userId]);
    $rows = $stmt->fetchAll();

    // Opinioes ainda nao lidas por montagem (item -> montagem do item; opiniao geral -> build_id dela).
    $unreadStmt = $pdo->prepare(
        'SELECT COALESCE(i.build_id, f.build_id) AS bid, COUNT(*) AS n
         FROM fpv_share_feedback f LEFT JOIN fpv_items i ON i.item_uuid = f.item_uuid
         WHERE f.user_id = :user_id AND f.is_read = 0
         GROUP BY COALESCE(i.build_id, f.build_id)'
    );
    $unreadStmt->execute(['user_id' => $userId]);
    $unread = [];
    foreach ($unreadStmt->fetchAll() as $row) {
        if ($row['bid'] !== null) {
            $unread[(int) $row['bid']] = (int) $row['n'];
        }
    }

    return array_map(static function (array $row) use ($unread): array {
        $total = round((float) $row['total'], 2);
        $purchased = round((float) $row['purchased_total'], 2);
        return [
            'build_uuid' => $row['build_uuid'],
            'name' => $row['name'],
            'description' => $row['description'],
            'color' => $row['color'],
            'target_date' => $row['target_date'],
            'sort_order' => (int) $row['sort_order'],
            'items_count' => (int) $row['items_count'],
            'purchased_count' => (int) $row['purchased_count'],
            'total' => $total,
            'purchased_total' => $purchased,
            'to_buy' => round(max(0, $total - $purchased), 2),
            'cover_image' => $row['cover_image'],
            'share_active' => $row['share_active'] === null ? null : (bool) (int) $row['share_active'],
            'unread' => $unread[(int) $row['id']] ?? 0,
        ];
    }, $rows);
}

/** Copia fisicamente a foto de um item (cada item e dono do proprio arquivo; apagar um nao quebra o outro). */
function fpv_copy_image_file(string $imagePath): string
{
    if ($imagePath === '' || str_contains($imagePath, '..') || !str_starts_with($imagePath, FPV_UPLOAD_PUBLIC_PATH . '/')) {
        return '';
    }
    $source = __DIR__ . '/../../' . $imagePath;
    $ext = strtolower(pathinfo($source, PATHINFO_EXTENSION));
    if (!is_file($source) || !in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
        return '';
    }
    $dir = fpv_upload_dir_ensure('items');
    $filename = bin2hex(random_bytes(16)) . '.' . $ext;
    if (!@copy($source, $dir . '/' . $filename)) {
        return '';
    }
    return FPV_UPLOAD_PUBLIC_PATH . '/items/' . $filename;
}

/**
 * Duplica um item em outra montagem (nunca herda "comprado": a compra ja debitou a carteira uma vez).
 * Devolve o item novo e a lista de fotos criadas (para desfazer se a transacao falhar).
 */
function fpv_duplicate_item(PDO $pdo, int $userId, array $item, int $targetBuildId, int $sortOrder): array
{
    $newUuid = fpv_generate_uuid();
    $imagePath = fpv_copy_image_file((string) $item['image_path']);
    $pdo->prepare(
        'INSERT INTO fpv_items (user_id, build_id, item_uuid, name, category_id, price, store_url, image_path, sort_order)
         VALUES (:user_id, :build_id, :item_uuid, :name, :category_id, :price, :store_url, :image_path, :sort_order)'
    )->execute([
        'user_id' => $userId,
        'build_id' => $targetBuildId,
        'item_uuid' => $newUuid,
        'name' => $item['name'],
        'category_id' => $item['category_id'],
        'price' => $item['price'],
        'store_url' => $item['store_url'],
        'image_path' => $imagePath,
        'sort_order' => $sortOrder,
    ]);
    return ['item_uuid' => $newUuid, 'image_path' => $imagePath];
}

function fpv_user_next_item_sort(PDO $pdo, int $userId): int
{
    $stmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM fpv_items WHERE user_id = :user_id');
    $stmt->execute(['user_id' => $userId]);
    return (int) $stmt->fetchColumn();
}

/** Apaga itens (fotos, opinioes e reacoes deles). Nao mexe na carteira: o saldo e derivado e se ajusta sozinho. */
function fpv_delete_items_cascade(PDO $pdo, int $userId, array $itemRows): void
{
    foreach ($itemRows as $item) {
        $pdo->prepare('DELETE FROM fpv_share_feedback WHERE user_id = :user_id AND item_uuid = :uuid')
            ->execute(['user_id' => $userId, 'uuid' => $item['item_uuid']]);
        $pdo->prepare('DELETE FROM fpv_share_reactions WHERE user_id = :user_id AND item_uuid = :uuid')
            ->execute(['user_id' => $userId, 'uuid' => $item['item_uuid']]);
        $pdo->prepare('DELETE FROM fpv_items WHERE user_id = :user_id AND item_uuid = :uuid')
            ->execute(['user_id' => $userId, 'uuid' => $item['item_uuid']]);
        if (!empty($item['image_path'])) {
            fpv_delete_image_file($item['image_path']);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────
// Acoes da API (autenticadas)
// ─────────────────────────────────────────────────────────────────────────

function add_fpv_build(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);
    if (!fpv_schema_ready()) {
        return fpv_builds_unavailable();
    }

    $name = fpv_sanitize_string($input['name'] ?? '', 80);
    if ($name === '') {
        return ['success' => false, 'message' => 'Dê um nome para a montagem.', '_code' => 400];
    }
    $count = $pdo->prepare('SELECT COUNT(*) FROM fpv_builds WHERE user_id = :user_id');
    $count->execute(['user_id' => $userId]);
    if ((int) $count->fetchColumn() >= FPV_BUILDS_MAX_PER_USER) {
        return ['success' => false, 'message' => 'Limite de ' . FPV_BUILDS_MAX_PER_USER . ' montagens atingido.', '_code' => 400];
    }

    $source = null;
    $copyFrom = fpv_sanitize_string($input['copy_from'] ?? '', 36);
    if ($copyFrom !== '') {
        $source = fpv_build_row_by_uuid($pdo, $userId, $copyFrom);
        if (!$source) {
            return ['success' => false, 'message' => 'Montagem de origem nao encontrada.', '_code' => 404];
        }
    }

    $createdImages = [];
    $pdo->beginTransaction();
    try {
        $build = fpv_insert_build(
            $pdo,
            $userId,
            $name,
            fpv_sanitize_string($input['description'] ?? '', 240),
            fpv_build_color($input['color'] ?? 'orange')
        );

        if ($source) {
            $items = $pdo->prepare('SELECT * FROM fpv_items WHERE build_id = :build_id AND user_id = :user_id ORDER BY sort_order, id');
            $items->execute(['build_id' => $source['id'], 'user_id' => $userId]);
            $sort = fpv_user_next_item_sort($pdo, $userId);
            foreach ($items->fetchAll() as $item) {
                $copy = fpv_duplicate_item($pdo, $userId, $item, (int) $build['id'], $sort++);
                if ($copy['image_path'] !== '') {
                    $createdImages[] = $copy['image_path'];
                }
            }
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        foreach ($createdImages as $path) {
            fpv_delete_image_file($path);
        }
        throw $e;
    }

    return ['success' => true, 'build' => fpv_build_public($build), 'builds' => fpv_builds_summary($pdo, $userId)];
}

function update_fpv_build(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);
    if (!fpv_schema_ready()) {
        return fpv_builds_unavailable();
    }

    $build = fpv_build_row_by_uuid($pdo, $userId, fpv_sanitize_string($input['build_uuid'] ?? '', 36));
    if (!$build) {
        return ['success' => false, 'message' => 'Montagem nao encontrada.', '_code' => 404];
    }

    $name = array_key_exists('name', $input) ? fpv_sanitize_string($input['name'], 80) : $build['name'];
    if ($name === '') {
        return ['success' => false, 'message' => 'Dê um nome para a montagem.', '_code' => 400];
    }
    $description = array_key_exists('description', $input) ? fpv_sanitize_string($input['description'], 240) : $build['description'];
    $color = array_key_exists('color', $input) ? fpv_build_color($input['color']) : $build['color'];

    $pdo->prepare('UPDATE fpv_builds SET name = :name, description = :description, color = :color WHERE id = :id')
        ->execute(['name' => $name, 'description' => $description, 'color' => $color, 'id' => $build['id']]);

    return [
        'success' => true,
        'build' => fpv_build_public(fpv_build_row_by_uuid($pdo, $userId, $build['build_uuid'])),
        'builds' => fpv_builds_summary($pdo, $userId),
    ];
}

/**
 * Exclui uma montagem. Se ela tem itens, o cliente diz o que fazer: mode=move + move_to (leva os itens
 * para outra montagem) ou mode=delete (apaga tambem os itens). A ultima montagem nao pode ser excluida.
 */
function delete_fpv_build(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);
    if (!fpv_schema_ready()) {
        return fpv_builds_unavailable();
    }

    $build = fpv_build_row_by_uuid($pdo, $userId, fpv_sanitize_string($input['build_uuid'] ?? '', 36));
    if (!$build) {
        return ['success' => false, 'message' => 'Montagem nao encontrada.', '_code' => 404];
    }
    $count = $pdo->prepare('SELECT COUNT(*) FROM fpv_builds WHERE user_id = :user_id');
    $count->execute(['user_id' => $userId]);
    if ((int) $count->fetchColumn() <= 1) {
        return ['success' => false, 'message' => 'Você precisa ter pelo menos uma montagem.', '_code' => 400];
    }

    $itemsStmt = $pdo->prepare('SELECT item_uuid, image_path FROM fpv_items WHERE build_id = :build_id AND user_id = :user_id');
    $itemsStmt->execute(['build_id' => $build['id'], 'user_id' => $userId]);
    $items = $itemsStmt->fetchAll();

    $mode = (string) ($input['mode'] ?? '');
    $target = null;
    if ($items) {
        if ($mode === 'move') {
            $target = fpv_build_row_by_uuid($pdo, $userId, fpv_sanitize_string($input['move_to'] ?? '', 36));
            if (!$target || (int) $target['id'] === (int) $build['id']) {
                return ['success' => false, 'message' => 'Escolha a montagem que vai receber os itens.', '_code' => 400];
            }
        } elseif ($mode !== 'delete') {
            return ['success' => false, 'message' => 'Diga se os itens devem ser movidos ou apagados.', '_code' => 400];
        }
    }

    $pdo->beginTransaction();
    try {
        if ($items && $target) {
            $pdo->prepare('UPDATE fpv_items SET build_id = :target WHERE build_id = :build_id AND user_id = :user_id')
                ->execute(['target' => $target['id'], 'build_id' => $build['id'], 'user_id' => $userId]);
        } elseif ($items) {
            fpv_delete_items_cascade($pdo, $userId, $items);
        }
        // Opiniao geral desta montagem e o proprio link (FK em cascata) saem junto.
        $pdo->prepare('DELETE FROM fpv_share_feedback WHERE user_id = :user_id AND item_uuid IS NULL AND build_id = :build_id')
            ->execute(['user_id' => $userId, 'build_id' => $build['id']]);
        $pdo->prepare('DELETE FROM fpv_builds WHERE id = :id AND user_id = :user_id')
            ->execute(['id' => $build['id'], 'user_id' => $userId]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $builds = fpv_builds_summary($pdo, $userId);
    return [
        'success' => true,
        'builds' => $builds,
        'next_build_uuid' => $target ? $target['build_uuid'] : ($builds[0]['build_uuid'] ?? null),
    ];
}

/** Copia um item para outra montagem (mesma peca em dois projetos), sem "comprado". */
function copy_fpv_item(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);
    if (!fpv_schema_ready()) {
        return fpv_builds_unavailable();
    }

    $stmt = $pdo->prepare('SELECT * FROM fpv_items WHERE item_uuid = :uuid AND user_id = :user_id');
    $stmt->execute(['uuid' => fpv_sanitize_string($input['item_uuid'] ?? '', 64), 'user_id' => $userId]);
    $item = $stmt->fetch();
    if (!$item) {
        return ['success' => false, 'message' => 'Item nao encontrado.', '_code' => 404];
    }
    $target = fpv_build_row_by_uuid($pdo, $userId, fpv_sanitize_string($input['build_uuid'] ?? '', 36));
    if (!$target) {
        return ['success' => false, 'message' => 'Montagem de destino nao encontrada.', '_code' => 404];
    }

    $copy = fpv_duplicate_item($pdo, $userId, $item, (int) $target['id'], fpv_user_next_item_sort($pdo, $userId));

    return [
        'success' => true,
        'item_uuid' => $copy['item_uuid'],
        'build' => fpv_build_public($target),
        'builds' => fpv_builds_summary($pdo, $userId),
    ];
}
