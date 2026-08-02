-- F91 - FPV Setup Planner: cadastro publico multiusuario, blog e paginas de interesse
-- Rode DEPOIS do schema.sql original. Idempotente onde possivel (checa antes de alterar).

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS fpv_users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(190) NOT NULL,
    phone VARCHAR(20) NOT NULL DEFAULT '',
    cpf_digits CHAR(11) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_path VARCHAR(300) NOT NULL DEFAULT '',
    is_admin TINYINT(1) NOT NULL DEFAULT 0,
    email_verified_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_fpv_users_email (email),
    UNIQUE KEY uq_fpv_users_cpf (cpf_digits)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fpv_email_verifications (
    user_id BIGINT UNSIGNED NOT NULL,
    code CHAR(4) NOT NULL,
    expires_at DATETIME NOT NULL,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_fpv_email_verifications_user FOREIGN KEY (user_id)
        REFERENCES fpv_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fpv_password_resets (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_fpv_password_resets_token (token_hash),
    KEY idx_fpv_password_resets_user (user_id),
    CONSTRAINT fk_fpv_password_resets_user FOREIGN KEY (user_id)
        REFERENCES fpv_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fpv_posts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    type ENUM('blog','tutorial') NOT NULL DEFAULT 'blog',
    slug VARCHAR(160) NOT NULL,
    title VARCHAR(200) NOT NULL,
    excerpt VARCHAR(300) NOT NULL DEFAULT '',
    cover_image_path VARCHAR(300) NOT NULL DEFAULT '',
    content_markdown MEDIUMTEXT NOT NULL,
    author_id BIGINT UNSIGNED NULL,
    is_published TINYINT(1) NOT NULL DEFAULT 0,
    published_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_fpv_posts_slug (slug),
    KEY idx_fpv_posts_type_published (type, is_published, published_at),
    CONSTRAINT fk_fpv_posts_author FOREIGN KEY (author_id)
        REFERENCES fpv_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fpv_interest_signups (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    topic ENUM('comunidade','cursos') NOT NULL,
    email VARCHAR(190) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_fpv_interest_topic (topic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tabelas existentes viram por-usuario ────────────────────────────────
-- Nao ha usuario de verdade ainda dono desses dados (planner era single-tenant
-- ate agora, so tinha as 7 categorias padrao globais) — limpa antes de adicionar
-- a coluna NOT NULL pra nao quebrar a ALTER em linhas orfas.
DELETE FROM fpv_items;
DELETE FROM fpv_categories;
DELETE FROM fpv_videos;
DELETE FROM fpv_sessions;

ALTER TABLE fpv_sessions
    ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id,
    ADD CONSTRAINT fk_fpv_sessions_user FOREIGN KEY (user_id)
        REFERENCES fpv_users (id) ON DELETE CASCADE;

ALTER TABLE fpv_categories
    ADD COLUMN user_id BIGINT UNSIGNED NOT NULL AFTER id,
    ADD CONSTRAINT fk_fpv_categories_user FOREIGN KEY (user_id)
        REFERENCES fpv_users (id) ON DELETE CASCADE;

ALTER TABLE fpv_items
    ADD COLUMN user_id BIGINT UNSIGNED NOT NULL AFTER id,
    ADD CONSTRAINT fk_fpv_items_user FOREIGN KEY (user_id)
        REFERENCES fpv_users (id) ON DELETE CASCADE;

ALTER TABLE fpv_videos
    ADD COLUMN user_id BIGINT UNSIGNED NOT NULL AFTER id,
    ADD CONSTRAINT fk_fpv_videos_user FOREIGN KEY (user_id)
        REFERENCES fpv_users (id) ON DELETE CASCADE;

-- fpv_planning era uma linha global (id=1) — vira uma linha por usuario.
DROP TABLE IF EXISTS fpv_planning;
CREATE TABLE fpv_planning (
    user_id BIGINT UNSIGNED NOT NULL,
    saved_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    target_date DATE NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_fpv_planning_user FOREIGN KEY (user_id)
        REFERENCES fpv_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
