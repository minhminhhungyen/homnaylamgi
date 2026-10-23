<?php
/* Hôm nay làm gì? — thư viện chung cho API (PHP 8.1+, MySQL/MariaDB).
   File cấu hình nằm NGOÀI public_html: ../hnlg-config.php (do /api/setup.php tạo), không bao giờ commit lên Git. */
declare(strict_types=1);
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === '_lib.php') { http_response_code(403); exit; }
ini_set('display_errors', '0');
date_default_timezone_set('Asia/Ho_Chi_Minh');
header_remove('X-Powered-By');
set_exception_handler(function (Throwable $e): void {
  error_log('hnlg: ' . $e);
  if (!headers_sent()) { http_response_code(500); header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store'); }
  echo json_encode(['ok' => false, 'error' => 'Máy chủ gặp lỗi, thử lại sau.'], JSON_UNESCAPED_UNICODE);
});

const HNLG_VERSION = '1.0';
const CATS = ['vd', 'kp', 'st', 'hh', 'kn', 'cm', 'au', 'sn', 'tt', 'gt'];
const EVS = ['halloween', '2011', 'noel', 'tet', 'trungthu', 'phunu', 'valentine', 'giadinh', 'thieunhi', 'giaothua', 'ram', 'cathangtu', 'doan', 'nghile'];
const XTAGS = ['cuoituan', 'canngay', 'xuan', 'he', 'thu', 'dong', 'ram', 'vulan', '2011', 'hoanghon', 'sao'];

function cfg_path(): string {
  $env = getenv('HNLG_CONFIG');
  if ($env) return $env;
  $root = rtrim($_SERVER['DOCUMENT_ROOT'] ?? dirname(__DIR__), '/');
  return dirname($root) . '/hnlg-config.php';
}
function cfg(?string $k = null, $def = null) {
  static $c = null;
  if ($c === null) { $p = cfg_path(); $c = is_file($p) ? (require $p) : []; if (!is_array($c)) $c = []; }
  return $k === null ? $c : ($c[$k] ?? $def);
}
function upload_dir(): string { return dirname(cfg_path()) . '/hnlg-uploads'; }
function installed(): bool { return (bool) cfg('db_name'); }

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  if (!installed()) fail('Hệ thống tài khoản chưa được cài đặt.', 503);
  $dsn = 'mysql:host=' . cfg('db_host', '127.0.0.1') . ';port=' . (int) cfg('db_port', 3306) . ';dbname=' . cfg('db_name') . ';charset=utf8mb4';
  try {
    $pdo = new PDO($dsn, cfg('db_user'), cfg('db_pass'), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]);
    $pdo->exec("SET time_zone = '+07:00'");
  } catch (Throwable $e) { error_log('hnlg db: ' . $e->getMessage()); fail('Không kết nối được cơ sở dữ liệu.', 503); }
  return $pdo;
}
function q(string $sql, array $p = []): PDOStatement { $s = db()->prepare($sql); $s->execute($p); return $s; }
function one(string $sql, array $p = []): ?array { $r = q($sql, $p)->fetch(); return $r ?: null; }
function now(): string { return date('Y-m-d H:i:s'); }

/* ---------- phản hồi JSON ---------- */
function out($data, int $code = 200): never {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function fail(string $msg, int $code = 400, array $extra = []): never { out(['ok' => false, 'error' => $msg] + $extra, $code); }
function input(): array {
  static $in = null;
  if ($in !== null) return $in;
  $raw = file_get_contents('php://input') ?: '';
  $d = str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') ? json_decode($raw, true) : $_POST;
  $in = is_array($d) ? $d : [];
  return $in;
}
function str_in(string $k, int $max = 500): string { $v = input()[$k] ?? ''; return mb_substr(trim(is_string($v) ? $v : ''), 0, $max); }
function need_post(): void { if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('Sai phương thức.', 405); }

/* ---------- phiên đăng nhập ---------- */
function start_session(): void {
  if (session_status() === PHP_SESSION_ACTIVE) return;
  $secure = str_starts_with(site_url(), 'https://') || (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off');
  session_name('hnlg_s');
  session_set_cookie_params(['lifetime' => 60 * 60 * 24 * 30, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax']);
  ini_set('session.use_strict_mode', '1');
  ini_set('session.gc_maxlifetime', (string) (60 * 60 * 24 * 30));
  $dir = dirname(cfg_path()) . '/hnlg-sessions';
  if (is_dir($dir) || @mkdir($dir, 0700, true)) session_save_path($dir);
  session_start();
  if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
}
function csrf(): string { start_session(); return $_SESSION['csrf']; }
function check_csrf(): void {
  start_session();
  $t = $_SERVER['HTTP_X_CSRF'] ?? (input()['csrf'] ?? '');
  if (!is_string($t) || !hash_equals($_SESSION['csrf'], $t)) fail('Phiên làm việc đã hết hạn, hãy tải lại trang.', 419);
}
function me(): ?array {
  start_session();
  $id = $_SESSION['uid'] ?? 0;
  if (!$id) return null;
  $u = one('SELECT id, email, name, role, status, email_verified, google_sub, pass_hash IS NOT NULL AS has_pass, sess_ver, created_at FROM users WHERE id = ?', [$id]);
  if (!$u || $u['status'] !== 'active' || (int) ($_SESSION['ver'] ?? -1) !== (int) $u['sess_ver']) { logout_now(); return null; }
  return $u;
}
function login_now(array $u): void {
  start_session();
  session_regenerate_id(true);
  $_SESSION['uid'] = (int) $u['id'];
  $_SESSION['ver'] = (int) (one('SELECT sess_ver FROM users WHERE id = ?', [$u['id']])['sess_ver'] ?? 0);
  $_SESSION['csrf'] = bin2hex(random_bytes(16));
  q('UPDATE users SET last_login = ? WHERE id = ?', [now(), $u['id']]);
}
function logout_now(): void {
  start_session();
  $_SESSION = [];
  session_regenerate_id(true);
  $_SESSION['csrf'] = bin2hex(random_bytes(16));
}
function need_user(): array { $u = me(); if (!$u) fail('Bạn cần đăng nhập.', 401); return $u; }
function need_admin(): array { $u = need_user(); if ($u['role'] !== 'admin') fail('Chỉ quản trị viên mới làm được việc này.', 403); return $u; }
function public_user(array $u): array {
  return ['id' => (int) $u['id'], 'email' => $u['email'], 'name' => $u['name'], 'role' => $u['role'], 'verified' => (bool) $u['email_verified'], 'google' => !empty($u['google_sub']), 'hasPass' => (bool) $u['has_pass'], 'since' => substr((string) $u['created_at'], 0, 10)];
}
function audit(int $uid, string $action, string $detail = ''): void {
  try { q('INSERT INTO audit (user_id, action, detail, at, ip) VALUES (?, ?, ?, ?, ?)', [$uid, $action, mb_substr($detail, 0, 300), now(), client_ip()]); } catch (Throwable $e) { error_log('hnlg audit: ' . $e->getMessage()); }
}
function client_ip(): string { return substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45); }

/* ---------- chống dò mật khẩu, spam ---------- */
function limit_key(string $key): string { return substr(hash('sha256', $key), 0, 40); }
/* tăng bộ đếm trước (một câu lệnh, an toàn khi nhiều yêu cầu cùng lúc) rồi mới kiểm tra */
function limit_hit(string $key, int $seconds): array {
  $exp = date('Y-m-d H:i:s', time() + $seconds); $now = now();
  q('INSERT INTO limits (k, n, reset_at) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE n = IF(reset_at < ?, 1, n + 1), reset_at = IF(reset_at < ?, ?, reset_at)', [limit_key($key), $exp, $now, $now, $exp]);
  if (random_int(1, 200) === 1) q('DELETE FROM limits WHERE reset_at < ?', [$now]);
  return one('SELECT n, reset_at FROM limits WHERE k = ?', [limit_key($key)]) ?? ['n' => 1, 'reset_at' => $exp];
}
function limit_fail(string $reset_at): never { $wait = max(1, (int) ceil((strtotime($reset_at) - time()) / 60)); fail("Bạn thử quá nhiều lần. Đợi khoảng {$wait} phút rồi thử lại nhé.", 429); }
function limit(string $key, int $max, int $seconds): void { $r = limit_hit($key, $seconds); if ((int) $r['n'] > $max) limit_fail($r['reset_at']); }
/* chỉ kiểm tra, không tăng (dùng cho đăng nhập: chỉ đếm lần sai) */
function limit_over(string $key, int $max): ?string { $r = one('SELECT n, reset_at FROM limits WHERE k = ? AND reset_at >= ?', [limit_key($key), now()]); return ($r && (int) $r['n'] >= $max) ? $r['reset_at'] : null; }
function limit_clear(string $key): void { q('DELETE FROM limits WHERE k = ?', [limit_key($key)]); }
/* luôn chạy một lần kiểm mật khẩu để thời gian trả lời không lộ email có tồn tại hay không */
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=4,p=1$eDZqdERZc3U4T2hudFBFZA$9WYArFzFugQk6crq6wbZCY44GRTU64ajMI7MrN5jfVQ';
const DUMMY_BCRYPT = '$2y$10$GJLqaKo93LrLMSPWtk0HFe7SkiVMyBuR4hS3dM/YLmREVKWDoEB9u';
function login_pass_ok(?array $u, string $pass): bool {
  $h = ($u && $u['pass_hash']) ? (string) $u['pass_hash'] : (defined('PASSWORD_ARGON2ID') ? DUMMY_HASH : DUMMY_BCRYPT);
  return password_verify($pass, $h) && $u && $u['pass_hash'];
}

/* ---------- kiểm tra dữ liệu ---------- */
function valid_email(string $e): bool { return strlen($e) <= 190 && (bool) filter_var($e, FILTER_VALIDATE_EMAIL); }
function pass_ok(string $p): ?string {
  if (mb_strlen($p) < 8) return 'Mật khẩu cần ít nhất 8 ký tự.';
  if (mb_strlen($p) > 200) return 'Mật khẩu quá dài.';
  if (!preg_match('/\pL/u', $p) || !preg_match('/\d/', $p)) return 'Mật khẩu cần có cả chữ và số.';
  return null;
}
function clean_name(string $n): string { $n = preg_replace('/[\x00-\x1F\x7F<>]/u', '', $n) ?? ''; return mb_substr(trim(preg_replace('/\s+/u', ' ', $n) ?? ''), 0, 60); }
function hash_pass(string $p): string { return password_hash($p, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT); }

/* ---------- chốt chặn nội dung: cùng danh sách với tools/build.mjs ---------- */
const BANNED = [
  '/tự\s*tử/iu', '/tự\s*sát/iu', '/tự\s*(làm\s*)?hại/iu', '/tự\s*hủy/iu', '/quyên\s*sinh/iu', '/kết\s*liễu/iu', '/muốn\s*chết/iu',
  '/(rạch|cắt|cứa)\s*(tay|cổ\s*tay|da)/iu', '/nhảy\s*(cầu|lầu|sông|xuống)/iu', '/treo\s*cổ/iu', '/thuốc\s*(ngủ|chuột|độc|trừ\s*sâu)/iu',
  '/quá\s*liều/iu', '/nhịn\s*(ăn|đói|uống)/iu', '/thức\s*trắng/iu', '/(nín|nhịn)\s*thở\s*(lâu|tối\s*đa|đến)/iu', '/(tắm|ngâm)\s*(nước\s*)?đá/iu',
  '/chỗ\s*cao\s*nhất/iu', '/mép\s*(vực|tầng|mái|cầu)/iu', '/(?<!\pL)(bia|rượu)(?!\pL)/iu', '/thuốc\s*lá|thuốc\s*lào|vape|shisha|bóng\s*cười/iu',
  '/cá\s*cược|cờ\s*bạc|lô\s*đề|cá\s*độ/iu', '/đua\s*xe|bốc\s*đầu|lạng\s*lách|vượt\s*đèn\s*đỏ/iu'
];
function banned_hit(string ...$texts): ?string {
  foreach ($texts as $t) foreach (BANNED as $re) if (preg_match($re, $t, $m)) return $m[0];
  return null;
}
function guard_text(string ...$texts): void {
  $hit = banned_hit(...$texts);
  if ($hit !== null) fail("Nội dung có cụm “{$hit}” nằm trong danh sách chặn để bảo vệ người dùng. Hãy viết lại.", 422);
}

/* ---------- gửi thư (mail() của Hostinger; cần hộp thư/tên miền đã cấu hình email) ---------- */
function send_mail(string $to, string $subject, string $text): bool {
  $from = cfg('mail_from', 'noreply@homnaylamgi.com');
  $headers = "From: Hôm nay làm gì? <{$from}>\r\nReply-To: " . cfg('mail_reply', 'hotro@homnaylamgi.com') . "\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit";
  if (getenv('HNLG_MAIL_LOG')) { file_put_contents(getenv('HNLG_MAIL_LOG'), "TO: $to\nSUBJECT: $subject\n$text\n---\n", FILE_APPEND); return true; }
  return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $text, $headers, '-f' . $from);
}
function site_url(): string { return rtrim((string) cfg('site_url', 'https://homnaylamgi.com'), '/'); }
function new_token(int $uid, string $kind, int $ttl): string {
  $t = bin2hex(random_bytes(24));
  q('DELETE FROM tokens WHERE user_id = ? AND kind = ?', [$uid, $kind]);
  q('INSERT INTO tokens (user_id, kind, hash, expires) VALUES (?, ?, ?, ?)', [$uid, $kind, hash('sha256', $t), date('Y-m-d H:i:s', time() + $ttl)]);
  return $t;
}
function use_token(string $t, string $kind): ?int {
  if (!preg_match('/^[a-f0-9]{48}$/', $t)) return null;
  $r = one('SELECT id, user_id, expires FROM tokens WHERE hash = ? AND kind = ?', [hash('sha256', $t), $kind]);
  if (!$r) return null;
  q('DELETE FROM tokens WHERE id = ?', [$r['id']]);
  return strtotime($r['expires']) >= time() ? (int) $r['user_id'] : null;
}
function e(?string $s): string { return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
