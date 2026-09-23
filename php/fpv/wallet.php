<?php
declare(strict_types=1);

/**
 * Carteira do FPV planner.
 *
 * Modelo: o saldo NUNCA e gravado — e sempre derivado de uma unica fonte de verdade:
 *   saldo = SUM(depositos) - SUM(retiradas) - SUM(preco dos itens marcados como comprados)
 * Assim, marcar/desmarcar um item como comprado, editar o preco de um item comprado ou apagar um
 * deposito atualiza o saldo de forma consistente, sem risco de "drift" entre tabelas.
 */

const FPV_WALLET_MAX_AMOUNT = 10000000.00;
const FPV_WALLET_ENTRIES_LIMIT = 300;

function fpv_iso_utc(?string $mysqlDatetime): ?string
{
    if ($mysqlDatetime === null || $mysqlDatetime === '') {
        return null;
    }
    $ts = strtotime($mysqlDatetime . ' UTC');
    return $ts === false ? null : gmdate('Y-m-d\TH:i:s\Z', $ts);
}

function fpv_wallet_totals(PDO $pdo, int $userId): array
{
    $entries = $pdo->prepare(
        "SELECT
            COALESCE(SUM(CASE WHEN entry_type = 'deposit' THEN amount ELSE 0 END), 0) AS deposits,
            COALESCE(SUM(CASE WHEN entry_type = 'withdrawal' THEN amount ELSE 0 END), 0) AS withdrawals
         FROM fpv_wallet_entries WHERE user_id = :user_id"
    );
    $entries->execute(['user_id' => $userId]);
    $row = $entries->fetch();

    $items = $pdo->prepare(
        'SELECT
            COALESCE(SUM(CASE WHEN is_purchased = 1 THEN price ELSE 0 END), 0) AS purchased,
            COALESCE(SUM(price), 0) AS total
         FROM fpv_items WHERE user_id = :user_id'
    );
    $items->execute(['user_id' => $userId]);
    $itemsRow = $items->fetch();

    $deposits = round((float) $row['deposits'], 2);
    $withdrawals = round((float) $row['withdrawals'], 2);
    $purchased = round((float) $itemsRow['purchased'], 2);
    $total = round((float) $itemsRow['total'], 2);

    return [
        'deposits_total' => $deposits,
        'withdrawals_total' => $withdrawals,
        'purchased_total' => $purchased,
        'items_total' => $total,
        'remaining_to_buy' => round(max(0, $total - $purchased), 2),
        'balance' => round($deposits - $withdrawals - $purchased, 2),
    ];
}

function fpv_wallet_entries(PDO $pdo, int $userId, int $limit = FPV_WALLET_ENTRIES_LIMIT): array
{
    $stmt = $pdo->prepare(
        'SELECT id, entry_type, amount, note, created_at FROM fpv_wallet_entries
         WHERE user_id = :user_id ORDER BY created_at DESC, id DESC LIMIT ' . (int) $limit
    );
    $stmt->execute(['user_id' => $userId]);

    return array_map(static fn(array $row): array => [
        'id' => (int) $row['id'],
        'type' => $row['entry_type'],
        'amount' => (float) $row['amount'],
        'note' => $row['note'],
        'created_at' => fpv_iso_utc($row['created_at']),
    ], $stmt->fetchAll());
}

function fpv_wallet_payload(PDO $pdo, int $userId): ?array
{
    if (!fpv_schema_ready()) {
        return null;
    }
    return fpv_wallet_totals($pdo, $userId) + ['entries' => fpv_wallet_entries($pdo, $userId)];
}

function add_fpv_wallet_entry(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);

    if (!fpv_schema_ready()) {
        return ['success' => false, 'message' => 'Carteira indisponivel: atualizacao do banco pendente.', '_code' => 503];
    }

    $type = (string) ($input['type'] ?? '');
    if (!in_array($type, ['deposit', 'withdrawal'], true)) {
        return ['success' => false, 'message' => 'Tipo de movimentacao invalido.', '_code' => 400];
    }

    $amount = round((float) ($input['amount'] ?? 0), 2);
    if ($amount <= 0) {
        return ['success' => false, 'message' => 'Informe um valor maior que zero.', '_code' => 400];
    }
    if ($amount > FPV_WALLET_MAX_AMOUNT) {
        return ['success' => false, 'message' => 'Valor acima do limite permitido.', '_code' => 400];
    }

    $note = fpv_sanitize_string($input['note'] ?? '', 160);

    $stmt = $pdo->prepare(
        'INSERT INTO fpv_wallet_entries (user_id, entry_type, amount, note) VALUES (:user_id, :type, :amount, :note)'
    );
    $stmt->execute(['user_id' => $userId, 'type' => $type, 'amount' => $amount, 'note' => $note]);

    return ['success' => true, 'wallet' => fpv_wallet_payload($pdo, $userId)];
}

function delete_fpv_wallet_entry(array $input): array
{
    $pdo = fpv_pdo();
    $userId = require_fpv_session($pdo);

    if (!fpv_schema_ready()) {
        return ['success' => false, 'message' => 'Carteira indisponivel: atualizacao do banco pendente.', '_code' => 503];
    }

    $id = (int) ($input['entry_id'] ?? 0);
    if ($id <= 0) {
        return ['success' => false, 'message' => 'entry_id invalido.', '_code' => 400];
    }

    $stmt = $pdo->prepare('DELETE FROM fpv_wallet_entries WHERE id = :id AND user_id = :user_id');
    $stmt->execute(['id' => $id, 'user_id' => $userId]);

    return ['success' => true, 'wallet' => fpv_wallet_payload($pdo, $userId)];
}
