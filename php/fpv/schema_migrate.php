<?php
declare(strict_types=1);

/**
 * Migracao automatica do schema (v3: carteira, compartilhamento, feedback, importador;
 * v4: reacoes like/dislike de uma unica batida na lista publica;
 * v5: montagens — varias listas por usuario, cada uma com seu link publico).
 *
 * O deploy do FPV e "git push -> rsync": nao ha passo manual de banco. Em vez de depender
 * de alguem colar SQL no phpMyAdmin (e deixar o site quebrado ate la), a primeira requisicao
 * apos o deploy aplica as mudancas de forma idempotente e serializada por GET_LOCK.
 * Se falhar (ex.: usuario do banco sem permissao de DDL), o erro e logado e o resto do
 * sistema continua funcionando — as features novas ficam desligadas (fpv_schema_ready() = false)
 * e php/fpv/schema_v3.sql pode ser rodado manualmente.
 */

// Todo o corpo da migracao e idempotente: subir este nome apenas reexecuta os CREATE ... IF NOT EXISTS
// (e o saldo inicial da carteira so e importado na primeira criacao da tabela). Mantenha assim.
const FPV_SCHEMA_MIGRATION_NAME = 'v5_builds';

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
    $buildSharesExisted = (bool) $pdo->query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'fpv_build_shares' LIMIT 1"
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

    // Reacoes de uma batida (like/dislike) da lista publica: no maximo uma por visitante e item.
    // visitor_key = hash do cookie do visitante (ou do IP+UA quando cookies estao bloqueados);
    // ip_hash serve so ao limite de criacoes por hora.
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS fpv_share_reactions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            item_uuid CHAR(36) NOT NULL,
            visitor_key CHAR(64) NOT NULL,
            ip_hash CHAR(64) NOT NULL,
            reaction ENUM('like','dislike') NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_fpv_reaction_visitor_item (item_uuid, visitor_key),
            KEY idx_fpv_reaction_user (user_id, item_uuid),
            KEY idx_fpv_reaction_ip (ip_hash, created_at),
            CONSTRAINT fk_fpv_reaction_user FOREIGN KEY (user_id)
                REFERENCES fpv_users (id) ON DELETE CASCADE
        ) $engine"
    );

    // ── v5: montagens ────────────────────────────────────────────────────────
    // Cada usuario tem N montagens (listas); itens e link publico pertencem a uma montagem.
    // Categorias, carteira e videos continuam por usuario (compartilhados entre montagens).
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS fpv_builds (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            build_uuid CHAR(36) NOT NULL,
            name VARCHAR(80) NOT NULL,
            description VARCHAR(240) NOT NULL DEFAULT '',
            color VARCHAR(16) NOT NULL DEFAULT 'orange',
            target_date DATE NULL,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_fpv_builds_uuid (build_uuid),
            KEY idx_fpv_builds_user (user_id, sort_order),
            CONSTRAINT fk_fpv_builds_user FOREIGN KEY (user_id)
                REFERENCES fpv_users (id) ON DELETE CASCADE
        ) $engine"
    );

    if (!fpv_schema_column_exists($pdo, 'fpv_items', 'build_id')) {
        $pdo->exec('ALTER TABLE fpv_items ADD COLUMN build_id BIGINT UNSIGNED NULL AFTER user_id, ADD KEY idx_fpv_items_build (build_id)');
    }
    if (!fpv_schema_column_exists($pdo, 'fpv_share_feedback', 'build_id')) {
        // So para a opiniao geral (item_uuid NULL); a de item segue o item, onde quer que ele esteja.
        $pdo->exec('ALTER TABLE fpv_share_feedback ADD COLUMN build_id BIGINT UNSIGNED NULL AFTER item_uuid, ADD KEY idx_fpv_feedback_build (build_id)');
    }

    // Um link publico por montagem (fpv_shares, 1 por usuario, fica como legado sem uso).
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS fpv_build_shares (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            build_id BIGINT UNSIGNED NOT NULL,
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
            PRIMARY KEY (id),
            UNIQUE KEY uq_fpv_build_shares_build (build_id),
            UNIQUE KEY uq_fpv_build_shares_token (token),
            KEY idx_fpv_build_shares_user (user_id),
            CONSTRAINT fk_fpv_build_shares_user FOREIGN KEY (user_id)
                REFERENCES fpv_users (id) ON DELETE CASCADE,
            CONSTRAINT fk_fpv_build_shares_build FOREIGN KEY (build_id)
                REFERENCES fpv_builds (id) ON DELETE CASCADE
        ) $engine"
    );

    // Usuarios existentes ganham a montagem "Minha montagem" (herdando a data meta antiga)...
    $pdo->exec(
        "INSERT INTO fpv_builds (user_id, build_uuid, name, target_date, sort_order)
         SELECT u.id, UUID(), 'Minha montagem', p.target_date, 1
         FROM fpv_users u LEFT JOIN fpv_planning p ON p.user_id = u.id
         WHERE NOT EXISTS (SELECT 1 FROM fpv_builds b WHERE b.user_id = u.id)"
    );
    // ...e tudo que ja existia passa a viver nela.
    $pdo->exec(
        'UPDATE fpv_items i
         JOIN (SELECT user_id, MIN(id) AS bid FROM fpv_builds GROUP BY user_id) d ON d.user_id = i.user_id
         SET i.build_id = d.bid WHERE i.build_id IS NULL'
    );
    $pdo->exec(
        'UPDATE fpv_share_feedback f
         JOIN (SELECT user_id, MIN(id) AS bid FROM fpv_builds GROUP BY user_id) d ON d.user_id = f.user_id
         SET f.build_id = d.bid WHERE f.build_id IS NULL AND f.item_uuid IS NULL'
    );
    // O link publico que o usuario ja tinha continua valendo (mesmo token), agora atrelado a essa montagem.
    // So na primeira criacao da tabela: nunca ressuscita links antigos em uma re-execucao.
    if (!$buildSharesExisted) {
        $pdo->exec(
            'INSERT IGNORE INTO fpv_build_shares
                (user_id, build_id, token, is_active, show_prices, allow_feedback, title, message, view_count, last_viewed_at, created_at)
             SELECT s.user_id, d.bid, s.token, s.is_active, s.show_prices, s.allow_feedback, s.title, s.message, s.view_count, s.last_viewed_at, s.created_at
             FROM fpv_shares s
             JOIN (SELECT user_id, MIN(id) AS bid FROM fpv_builds GROUP BY user_id) d ON d.user_id = s.user_id'
        );
    }

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
