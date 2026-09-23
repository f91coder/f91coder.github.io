-- F91 - FPV Setup Planner v3: carteira (financeiro), link publico de compartilhamento,
-- feedback de visitantes e importador de produtos.
--
-- NAO E NECESSARIO RODAR ESTE ARQUIVO MANUALMENTE: php/fpv/schema_migrate.php aplica
-- exatamente estas mesmas instrucoes automaticamente (de forma idempotente e com lock)
-- na primeira requisicao apos o deploy. Este arquivo existe como documentacao e como
-- plano B caso o usuario do banco em producao nao tenha permissao de CREATE/ALTER.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS fpv_schema_migrations (
    name VARCHAR(64) NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Momento em que o item foi marcado como comprado (extrato da carteira).
-- (rode so se a coluna ainda nao existir)
ALTER TABLE fpv_items ADD COLUMN purchased_at DATETIME NULL AFTER is_purchased;
UPDATE fpv_items SET purchased_at = updated_at WHERE is_purchased = 1 AND purchased_at IS NULL;

-- Livro-caixa da carteira: depositos e retiradas manuais. O saldo NUNCA e gravado,
-- e sempre derivado: depositos - retiradas - soma(preco dos itens comprados).
CREATE TABLE IF NOT EXISTS fpv_wallet_entries (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migra o antigo "Valor em caixa" (fpv_planning.saved_amount) para um deposito inicial.
INSERT INTO fpv_wallet_entries (user_id, entry_type, amount, note)
SELECT user_id, 'deposit', saved_amount, 'Saldo inicial (valor em caixa anterior)'
FROM fpv_planning WHERE saved_amount > 0;
UPDATE fpv_planning SET saved_amount = 0 WHERE saved_amount > 0;

-- Link publico (uma configuracao por usuario).
CREATE TABLE IF NOT EXISTS fpv_shares (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Opinioes de visitantes (item_uuid NULL = comentario geral sobre a lista).
CREATE TABLE IF NOT EXISTS fpv_share_feedback (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Limite de uso do importador de produtos por usuario.
CREATE TABLE IF NOT EXISTS fpv_import_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_fpv_import_user_created (user_id, created_at),
    CONSTRAINT fk_fpv_import_user FOREIGN KEY (user_id)
        REFERENCES fpv_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO fpv_schema_migrations (name) VALUES ('v3_wallet_share_import');
