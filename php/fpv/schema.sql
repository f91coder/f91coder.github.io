-- F91 - FPV Setup Planner backend (MySQL)
-- Rode este arquivo uma unica vez no banco de dados do projeto (via phpMyAdmin ou mysql CLI).
-- Reutiliza o mesmo banco do survey (f91_survey / u766700901_f91), tabelas com prefixo fpv_.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS fpv_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(80) NOT NULL,
    color_class VARCHAR(60) NOT NULL DEFAULT 'bg-gray-100 text-gray-800',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fpv_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    item_uuid CHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_id BIGINT UNSIGNED NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    store_url VARCHAR(500) NOT NULL DEFAULT '',
    image_path VARCHAR(300) NOT NULL DEFAULT '',
    is_purchased TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_item_uuid (item_uuid),
    KEY idx_category_id (category_id),
    CONSTRAINT fk_fpv_items_category FOREIGN KEY (category_id)
        REFERENCES fpv_categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Linha unica (id sempre 1) com o estado do planejamento financeiro.
CREATE TABLE IF NOT EXISTS fpv_planning (
    id TINYINT UNSIGNED NOT NULL,
    saved_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    target_date DATE NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fpv_videos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    url VARCHAR(500) NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT '',
    video_id VARCHAR(20) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fpv_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    token_hash CHAR(64) NOT NULL,
    ip_hash CHAR(64) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_token_hash (token_hash),
    KEY idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fpv_login_attempts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ip_hash CHAR(64) NOT NULL,
    attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ip_hash_attempted_at (ip_hash, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO fpv_categories (name, color_class, sort_order) VALUES
    ('Frame',      'bg-gray-100 text-gray-800',   1),
    ('Motores',    'bg-red-100 text-red-800',     2),
    ('FC / ESC',   'bg-blue-100 text-blue-800',   3),
    ('Camera/VTx', 'bg-purple-100 text-purple-800', 4),
    ('Radio/RX',   'bg-yellow-100 text-yellow-800', 5),
    ('Bateria',    'bg-green-100 text-green-800', 6),
    ('Acessorios', 'bg-teal-100 text-teal-800',   7);
