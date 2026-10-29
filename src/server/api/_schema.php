<?php
/* Cấu trúc cơ sở dữ liệu. Chạy lại an toàn (CREATE TABLE IF NOT EXISTS). */
declare(strict_types=1);
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === '_schema.php') { http_response_code(403); exit; }

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NULL UNIQUE,
    name VARCHAR(80) NOT NULL DEFAULT '',
    pass_hash VARCHAR(255) NULL,
    google_sub VARCHAR(64) NULL UNIQUE,
    role ENUM('user','admin') NOT NULL DEFAULT 'user',
    status ENUM('active','locked') NOT NULL DEFAULT 'active',
    email_verified TINYINT(1) NOT NULL DEFAULT 0,
    sess_ver INT UNSIGNED NOT NULL DEFAULT 0,
    age_ok TINYINT(1) NOT NULL DEFAULT 0,
    totp_secret VARCHAR(255) NULL,
    totp_last BIGINT NULL,
    created_at DATETIME NOT NULL,
    last_login DATETIME NULL,
    INDEX (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
  "CREATE TABLE IF NOT EXISTS tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    kind VARCHAR(10) NOT NULL,
    hash CHAR(64) NOT NULL UNIQUE,
    expires DATETIME NOT NULL,
    INDEX (user_id, kind),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
  "CREATE TABLE IF NOT EXISTS limits (
    k CHAR(40) PRIMARY KEY,
    n INT UNSIGNED NOT NULL,
    reset_at DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
  "CREATE TABLE IF NOT EXISTS posts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    summary VARCHAR(300) NOT NULL DEFAULT '',
    body MEDIUMTEXT NOT NULL,
    cover VARCHAR(255) NOT NULL DEFAULT '',
    status ENUM('draft','published') NOT NULL DEFAULT 'draft',
    published_at DATETIME NULL,
    author_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX (status, published_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
  "CREATE TABLE IF NOT EXISTS notices (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    text VARCHAR(300) NOT NULL,
    link VARCHAR(255) NOT NULL DEFAULT '',
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
  "CREATE TABLE IF NOT EXISTS library (
    kind ENUM('q','an') NOT NULL,
    id INT UNSIGNED NOT NULL,
    data TEXT NULL,
    hidden TINYINT(1) NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL,
    updated_by INT UNSIGNED NULL,
    PRIMARY KEY (kind, id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
  "CREATE TABLE IF NOT EXISTS audit (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    action VARCHAR(40) NOT NULL,
    detail VARCHAR(300) NOT NULL DEFAULT '',
    ip VARCHAR(45) NOT NULL DEFAULT '',
    at DATETIME NOT NULL,
    INDEX (at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
  /* dữ liệu đồng bộ của người dùng: sao, lịch sử, huy hiệu (JSON) và nhật ký ĐÃ MÃ HÓA trên máy người dùng (máy chủ không đọc được) */
  "CREATE TABLE IF NOT EXISTS user_data (
    user_id INT UNSIGNED NOT NULL PRIMARY KEY,
    state MEDIUMTEXT NOT NULL,
    diary MEDIUMTEXT NULL,
    rev INT UNSIGNED NOT NULL DEFAULT 0,
    drev INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_user_data_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
];
/* số phiên bản cấu trúc nằm ở SCHEMA_V trong _lib.php (tên file cờ hnlg-schema-vN) */
/* nâng cấp cơ sở dữ liệu đã cài từ bản cũ: thêm cột nếu chưa có (chạy được trên cả MySQL và MariaDB) */
function migrate(PDO $pdo): void {
  foreach (SCHEMA as $sql) $pdo->exec($sql);
  $has = fn(string $t, string $c) => (bool) $pdo->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '$t' AND COLUMN_NAME = '$c'")->fetchColumn();
  if (!$has('users', 'totp_secret')) $pdo->exec('ALTER TABLE users ADD COLUMN totp_secret VARCHAR(255) NULL, ADD COLUMN totp_last BIGINT NULL');
  if (!$has('user_data', 'drev')) { try { $pdo->exec('ALTER TABLE user_data ADD COLUMN drev INT UNSIGNED NOT NULL DEFAULT 0 AFTER rev'); } catch (PDOException $e) { if ((int) ($e->errorInfo[1] ?? 0) !== 1060) throw $e; } } // 1060: yêu cầu khác vừa thêm cột
  /* v5 (phòng hờ): dữ liệu đồng bộ của tài khoản chưa xác nhận do bản đầu ghi thì bỏ; mốc thời gian vượt quá hiện tại thì kéo về hiện tại */
  $pdo->exec('DELETE d FROM user_data d JOIN users u ON u.id = d.user_id WHERE u.email_verified = 0 AND u.google_sub IS NULL');
  $now = (int) floor(microtime(true) * 1000); $max = $now + 86400000;
  foreach (['$.epoch', '$.mtf.saved', '$.mtf.wk', '$.mtf.name'] as $path) $pdo->exec("UPDATE user_data SET state = JSON_SET(state, '$path', $now) WHERE JSON_VALID(state) AND JSON_EXTRACT(state, '$path') IS NOT NULL AND CAST(JSON_EXTRACT(state, '$path') AS DECIMAL(20,0)) > $max");
}
