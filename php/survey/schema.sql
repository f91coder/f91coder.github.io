-- F91 - Survey backend (MySQL)
-- Rode este arquivo uma única vez no banco de dados do survey (via phpMyAdmin ou mysql CLI).
-- Charset utf8mb4 para suportar acentos/emojis sem problemas.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS survey_responses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    response_id CHAR(36) NOT NULL,
    survey_slug VARCHAR(60) NOT NULL,
    survey_title VARCHAR(200) NOT NULL DEFAULT '',
    survey_niche VARCHAR(120) NOT NULL DEFAULT '',
    survey_version VARCHAR(30) NOT NULL DEFAULT '',
    source_file VARCHAR(120) NOT NULL DEFAULT '',
    source_url VARCHAR(500) NOT NULL DEFAULT '',
    language CHAR(2) NOT NULL DEFAULT 'pt',
    question_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    answered_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    primary_label VARCHAR(255) NOT NULL DEFAULT '',
    primary_value VARCHAR(255) NOT NULL DEFAULT '',
    contact_name VARCHAR(150) NOT NULL DEFAULT '',
    contact_email VARCHAR(190) NOT NULL DEFAULT '',
    contact_phone VARCHAR(40) NOT NULL DEFAULT '',
    answers_json LONGTEXT NULL,
    ip_hash CHAR(64) NOT NULL DEFAULT '',
    user_agent VARCHAR(255) NOT NULL DEFAULT '',
    submitted_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_response_id (response_id),
    KEY idx_survey_slug (survey_slug),
    KEY idx_submitted_at (submitted_at),
    KEY idx_language (language),
    KEY idx_contact_email (contact_email),
    KEY idx_ip_hash_created_at (ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS survey_answers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    response_id CHAR(36) NOT NULL,
    question_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    question_key VARCHAR(100) NOT NULL,
    question_label VARCHAR(255) NOT NULL DEFAULT '',
    question_type VARCHAR(30) NOT NULL DEFAULT 'text',
    answer_value TEXT NULL,
    answer_json LONGTEXT NULL,
    PRIMARY KEY (id),
    KEY idx_response_id (response_id),
    KEY idx_question_key (question_key),
    CONSTRAINT fk_survey_answers_response
        FOREIGN KEY (response_id) REFERENCES survey_responses (response_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dashboard_sessions (
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

CREATE TABLE IF NOT EXISTS dashboard_login_attempts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ip_hash CHAR(64) NOT NULL,
    attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ip_hash_attempted_at (ip_hash, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
