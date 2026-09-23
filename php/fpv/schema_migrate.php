<?php
declare(strict_types=1);

/**
 * Migracao automatica do schema (v3: carteira, compartilhamento, feedback, importador).
 *
 * O deploy do FPV e "git push -> rsync": nao ha passo manual de banco. Em vez de depender
 * de alguem colar SQL no phpMyAdmin (e deixar o site quebrado ate la), a primeira requisicao
 * apos o deploy aplica as mudancas de forma idempotente e serializada por GET_LOCK.
 * Se falhar (ex.: usuario do banco sem permissao de DDL), o erro e logado e o resto do
 * sistema continua funcionando — as features novas ficam desligadas (fpv_schema_ready() = false)
 * e php/fpv/schema_v3.sql pode ser rodado manualmente.
 */

const FPV_SCHEMA_MIGRATION_NAME = 'v3_wallet_share_import';

function fpv_schema_attempted(?bool $set = null): bool
{
    static $attempted = false;
    if ($set !== null) {
        $attempted = $set;
    }
    return $attempted;
}

/**
 * True quando as tabelas/colunas da v3 existem. Autossuficiente: se ninguem abriu a conexao ainda
 * (ex.: acao publica que checa isto antes de qualquer consulta), abre-a agora — e a abertura da
 * conexao e o que dispara a migracao.
 */
function fpv_schema_ready(?bool $set = null): bool
{
    static $ready = false;
    if ($set !== null) {
        $ready = $set;
        return $ready;
    }
    if (!$ready && !fpv_schema_attempted()) {
        fpv_pdo();
    }
    return $ready;
}

function fpv_ensure_schema(PDO $pdo): void
{
    if (fpv_schema_attempted()) {
        return;
    }
    fpv_schema_attempted(true);

    try {
        if (fpv_schema_migration_applied($pdo)) {
            fpv_schema_ready(true);
            return;
        }

        $lock = $pdo->query("SELECT GET_LOCK('fpv_schema_migrate_v3', 20)")->fetchColumn();
        if ((int) $lock !== 1) {
            throw new RuntimeException('Nao foi possivel obter o lock de migracao.');
        }

        try {
            // Outra requisicao pode ter terminado enquanto esperavamos o lock.
            if (!fpv_schema_migration_applied($pdo)) {
                fpv_schema_run_migration($pdo);
            }
        } finally {
            $pdo->query("SELECT RELEASE_LOCK('fpv_schema_migrate_v3')");
        }

        fpv_schema_ready(true);
    } catch (Throwable $e) {
        error_log('fpv schema migration failed: ' . $e->getMessage());
        fpv_schema_ready(false);
    }
}

function fpv_schema_migration_applied(PDO $pdo): bool
{
    try {
        $stmt = $pdo->prepare('SELECT 1 FROM fpv_schema_migrations WHERE name = :name LIMIT 1');
        $stmt->execute(['name' => FPV_SCHEMA_MIGRATION_NAME]);
        return (bool) $stmt->fetchColumn();
    } catch (PDOException $e) {
        // Tabela ainda nao existe (42S02) => migracao nunca rodou.
        if ($e->getCode() === '42S02') {
            return false;
        }
        throw $e;
    }
}

function fpv_schema_column_exists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare(
        'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = :t AND column_name = :c LIMIT 1'
    );
    $stmt->execute(['t' => $table, 'c' => $column]);
    return (bool) $stmt->fetchColumn();
}

function fpv_schema_run_migration(PDO $pdo): void
{
    $engine = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS fpv_schema_migrations (
            name VARCHAR(64) NOT NULL,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (name)
        ) $engine"
    );

    if (!fpv_schema_column_exists($pdo, 'fpv_items', 'purchased_at')) {
        $pdo->exec('ALTER TABLE fpv_items ADD COLUMN purchased_at DATETIME NULL AFTER is_purchased');
    }
    $pdo->exec('UPDATE fpv_items SET purchased_at = updated_at WHERE is_purchased = 1 AND purchased_at IS NULL');

    $walletExisted = (bool) $pdo->query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'fpv_wallet_entries' LIMIT 1"
    )->fetchColumn();

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS fpv_wallet_entries (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            entry_type ENUM('deposit','withdrawal') NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            note VARCHAR(160) NOT NULL DEFAULT '',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_fpv_wallet_user_created (user_id, created_at),
            CONSTRAINT fk_fpv_wallet_user FOREIGN KEY (user_id)
                REFERENCES fpv_users (id) ON DELETE CASCADE
        ) $engine"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS fpv_shares (
            user_id BIGINT UNSIGNED NOT NULL,
            token CHAR(32) NOT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            show_prices TINYINT(1) NOT NULL DEFAULT 1,
            allow_feedback TINYINT(1) NOT NULL DEFAULT 1,
            title VARCHAR(120) NOT NULL DEFAULT '',
            message VARCHAR(500) NOT NULL DEFAULT '',
            view_count INT UNSIGNED NOT NULL DEFAULT 0,
            last_viewed_at DATETIME NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id),
            UNIQUE KEY uq_fpv_shares_token (token),
            CONSTRAINT fk_fpv_shares_user FOREIGN KEY (user_id)
                REFERENCES fpv_users (id) ON DELETE CASCADE
        ) $engine"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS fpv_share_feedback (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            item_uuid CHAR(36) NULL,
            item_name VARCHAR(200) NOT NULL DEFAULT '',
            author_name VARCHAR(60) NOT NULL,
            reaction ENUM('like','doubt','dislike') NULL,
            message VARCHAR(600) NOT NULL DEFAULT '',
            ip_hash CHAR(64) NOT NULL,
            is_read TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_fpv_feedback_user_created (user_id, created_at),
            KEY idx_fpv_feedback_item (item_uuid),
            KEY idx_fpv_feedback_ip (ip_hash, created_at),
            CONSTRAINT fk_fpv_feedback_user FOREIGN KEY (user_id)
                REFERENCES fpv_users (id) ON DELETE CASCADE
        ) $engine"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS fpv_import_log (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_fpv_import_user_created (user_id, created_at),
            CONSTRAINT fk_fpv_import_user FOREIGN KEY (user_id)
                REFERENCES fpv_users (id) ON DELETE CASCADE
        ) $engine"
    );

    // O antigo "Valor em caixa" vira o primeiro deposito da carteira (so na primeira criacao da tabela,
    // para nunca duplicar o saldo em uma re-execucao).
    if (!$walletExisted) {
        $pdo->beginTransaction();
        try {
            $pdo->exec(
                "INSERT INTO fpv_wallet_entries (user_id, entry_type, amount, note)
                 SELECT user_id, 'deposit', saved_amount, 'Saldo inicial (valor em caixa anterior)'
                 FROM fpv_planning WHERE saved_amount > 0"
            );
            $pdo->exec('UPDATE fpv_planning SET saved_amount = 0 WHERE saved_amount > 0');
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    $stmt = $pdo->prepare('INSERT IGNORE INTO fpv_schema_migrations (name) VALUES (:name)');
    $stmt->execute(['name' => FPV_SCHEMA_MIGRATION_NAME]);
}
