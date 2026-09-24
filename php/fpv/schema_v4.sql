-- FPV91 v4 — reacoes de uma batida (like/dislike) na lista publica.
-- Plano B manual: a migracao automatica (php/fpv/schema_migrate.php) ja cria esta tabela na primeira
-- requisicao apos o deploy. So rode isto no phpMyAdmin se o usuario do banco nao tiver permissao de DDL.
-- Depois, registre: INSERT IGNORE INTO fpv_schema_migrations (name) VALUES ('v4_share_reactions');

CREATE TABLE IF NOT EXISTS fpv_share_reactions (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
