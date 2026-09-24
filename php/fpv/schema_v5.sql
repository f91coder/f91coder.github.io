-- FPV91 v5 — montagens (varias listas por usuario, cada uma com seu link publico).
-- Plano B manual: a migracao automatica (php/fpv/schema_migrate.php) ja faz tudo isto na primeira requisicao
-- apos o deploy, de forma idempotente. So use este arquivo se o usuario do banco nao tiver permissao de DDL.
-- Depois registre: INSERT IGNORE INTO fpv_schema_migrations (name) VALUES ('v5_builds');

CREATE TABLE IF NOT EXISTS fpv_builds (
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
    CONSTRAINT fk_fpv_builds_user FOREIGN KEY (user_id) REFERENCES fpv_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE fpv_items ADD COLUMN build_id BIGINT UNSIGNED NULL AFTER user_id, ADD KEY idx_fpv_items_build (build_id);
ALTER TABLE fpv_share_feedback ADD COLUMN build_id BIGINT UNSIGNED NULL AFTER item_uuid, ADD KEY idx_fpv_feedback_build (build_id);

CREATE TABLE IF NOT EXISTS fpv_build_shares (
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
    CONSTRAINT fk_fpv_build_shares_user FOREIGN KEY (user_id) REFERENCES fpv_users (id) ON DELETE CASCADE,
    CONSTRAINT fk_fpv_build_shares_build FOREIGN KEY (build_id) REFERENCES fpv_builds (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cada usuario existente ganha "Minha montagem" (com a data meta antiga) e tudo que ja tinha passa para ela.
INSERT INTO fpv_builds (user_id, build_uuid, name, target_date, sort_order)
SELECT u.id, UUID(), 'Minha montagem', p.target_date, 1
FROM fpv_users u LEFT JOIN fpv_planning p ON p.user_id = u.id
WHERE NOT EXISTS (SELECT 1 FROM fpv_builds b WHERE b.user_id = u.id);

UPDATE fpv_items i
JOIN (SELECT user_id, MIN(id) AS bid FROM fpv_builds GROUP BY user_id) d ON d.user_id = i.user_id
SET i.build_id = d.bid WHERE i.build_id IS NULL;

UPDATE fpv_share_feedback f
JOIN (SELECT user_id, MIN(id) AS bid FROM fpv_builds GROUP BY user_id) d ON d.user_id = f.user_id
SET f.build_id = d.bid WHERE f.build_id IS NULL AND f.item_uuid IS NULL;

-- O link publico que o usuario ja tinha continua valendo (mesmo token). Rode SO UMA VEZ.
INSERT IGNORE INTO fpv_build_shares
    (user_id, build_id, token, is_active, show_prices, allow_feedback, title, message, view_count, last_viewed_at, created_at)
SELECT s.user_id, d.bid, s.token, s.is_active, s.show_prices, s.allow_feedback, s.title, s.message, s.view_count, s.last_viewed_at, s.created_at
FROM fpv_shares s
JOIN (SELECT user_id, MIN(id) AS bid FROM fpv_builds GROUP BY user_id) d ON d.user_id = s.user_id;
