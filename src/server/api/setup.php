<?php
/* Cài đặt lần đầu: nối MySQL của Hostinger, tạo bảng, tạo tài khoản quản trị, ghi file cấu hình ra NGOÀI public_html.
   Sau khi cài xong trang này tự khóa. Chỉ chấp nhận máy chủ CSDL nội bộ (localhost/127.0.0.1). */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require __DIR__ . '/_schema.php';
header('X-Frame-Options: DENY');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'");

$msg = ''; $done = false;
/* chống chiếm quyền trước khi cài: phải có file mã cài đặt nằm ngoài public_html (chỉ người có quyền vào File Manager tạo được) */
$keyFile = dirname(cfg_path()) . '/hnlg-setup-key.txt';
$keyOk = is_file($keyFile) && strlen(trim((string) @file_get_contents($keyFile))) >= 16;
if (installed() || is_file(cfg_path())) {
  $done = true;
} elseif (!$keyOk) {
  $msg = '';
} elseif (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
  start_session();
  $f = fn($k, $m = 200) => mb_substr(trim((string) ($_POST[$k] ?? '')), 0, $m);
  try {
    if (!hash_equals($_SESSION['csrf'] ?? '', (string) ($_POST['csrf'] ?? ''))) throw new RuntimeException('Phiên đã hết hạn, hãy tải lại trang.');
    if (!$keyOk) throw new RuntimeException('Chưa có file mã cài đặt.');
    $tries = (int) ($_SESSION['setup_tries'] ?? 0); $_SESSION['setup_tries'] = $tries + 1;
    if ($tries >= 10) throw new RuntimeException('Thử quá nhiều lần. Đóng trình duyệt rồi mở lại trang này.');
    if (!hash_equals(trim((string) file_get_contents($keyFile)), trim((string) ($_POST['setup_key'] ?? '')))) throw new RuntimeException('Mã cài đặt chưa đúng.');
    $host = $f('db_host') ?: '127.0.0.1';
    if (!in_array($host, ['127.0.0.1', 'localhost'], true)) throw new RuntimeException('Chỉ dùng máy chủ CSDL nội bộ: 127.0.0.1 hoặc localhost.');
    $name = $f('db_name'); $user = $f('db_user'); $pass = (string) ($_POST['db_pass'] ?? '');
    if (!$name || !$user) throw new RuntimeException('Điền đủ tên cơ sở dữ liệu và tên người dùng.');
    $aname = clean_name($f('admin_name')); $aemail = mb_strtolower($f('admin_email', 190)); $apass = (string) ($_POST['admin_pass'] ?? '');
    if (!$aname) throw new RuntimeException('Điền tên quản trị viên.');
    if (!valid_email($aemail)) throw new RuntimeException('Email quản trị không hợp lệ.');
    if ($err = pass_ok($apass)) throw new RuntimeException($err);
    if (mb_strlen($apass) < 12) throw new RuntimeException('Mật khẩu quản trị cần ít nhất 12 ký tự.');
    $gid = $f('google_client_id');
    if ($gid && !preg_match('/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/', $gid)) throw new RuntimeException('Google Client ID không đúng dạng (…apps.googleusercontent.com).');
    $site = rtrim($f('site_url') ?: 'https://homnaylamgi.com', '/');
    try {
      $port = (int) (getenv('HNLG_DB_PORT') ?: 3306);
      $pdo = new PDO("mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4", $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    } catch (Throwable $e) { throw new RuntimeException('Không kết nối được cơ sở dữ liệu. Kiểm tra lại tên CSDL, người dùng, mật khẩu.'); }
    migrate($pdo);
    $pdo->prepare('INSERT INTO users (email, name, pass_hash, role, email_verified, age_ok, created_at) VALUES (?, ?, ?, \'admin\', 1, 1, ?) ON DUPLICATE KEY UPDATE role = \'admin\', pass_hash = VALUES(pass_hash), name = VALUES(name)')
        ->execute([$aemail, $aname, hash_pass($apass), now()]);
    $conf = ['db_host' => $host, 'db_port' => $port, 'db_name' => $name, 'db_user' => $user, 'db_pass' => $pass, 'google_client_id' => $gid, 'site_url' => $site,
             'mail_from' => 'noreply@' . (parse_url($site, PHP_URL_HOST) ?: 'homnaylamgi.com'), 'mail_reply' => 'hotro@homnaylamgi.com', 'installed_at' => now()];
    $path = cfg_path();
    if (@file_put_contents($path, "<?php\n// Cấu hình Hôm nay làm gì? — KHÔNG đưa file này lên Git, không chia sẻ.\nreturn " . var_export($conf, true) . ";\n", LOCK_EX) === false) throw new RuntimeException('Không ghi được file cấu hình ở ' . e($path) . '.');
    @chmod($path, 0600);
    @unlink($keyFile);
    $done = true; $msg = 'Đã cài đặt xong. Đăng nhập bằng tài khoản quản trị vừa tạo.';
  } catch (RuntimeException $e) { $msg = $e->getMessage(); }
}
start_session();
?><!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Cài đặt tài khoản | Hôm nay làm gì?</title>
<style>body{font:16px/1.6 system-ui,sans-serif;background:#F5F2F6;color:#241826;margin:0;padding:24px 16px}main{max-width:560px;margin:0 auto;background:#fff;border:1px solid #E4DCE6;border-radius:10px;padding:24px}h1{margin:0 0 8px;font-size:1.5rem}fieldset{border:1px solid #E4DCE6;border-radius:8px;margin:16px 0;padding:12px 16px}legend{font-weight:600}label{display:block;margin:10px 0 4px;font-size:.92rem}input{width:100%;box-sizing:border-box;padding:10px;border:1px solid #CFC3D2;border-radius:6px;font:inherit}button{margin-top:16px;padding:12px 20px;border:0;border-radius:999px;background:#D02842;color:#fff;font:inherit;cursor:pointer}.msg{padding:10px 14px;border-radius:6px;background:#FFF3EC;border-left:3px solid #D02842}.hint{color:#6A5B6E;font-size:.88rem;margin:4px 0 0}a{color:#D02842}</style></head>
<body><main><h1>Cài đặt tài khoản và trang quản trị</h1>
<?php if ($msg): ?><p class="msg"><?= e($msg) ?></p><?php endif; ?>
<?php if ($done): ?>
<p>Hệ thống đã được cài đặt. Trang này không dùng được nữa.</p><p><a href="/quan-tri/">Vào trang quản trị →</a></p>
<?php elseif (!$keyOk): ?>
<p><b>Bước 1.</b> Mở hPanel → Quản lý tệp. Vào thư mục <b>chứa</b> public_html (thư mục <code>domains/homnaylamgi.com</code>), tạo file mới tên <code>hnlg-setup-key.txt</code>, gõ vào một chuỗi bất kỳ dài ít nhất 16 ký tự rồi lưu.</p>
<p><b>Bước 2.</b> Tải lại trang này và nhập đúng chuỗi đó vào ô “Mã cài đặt”. Cài xong, file tự bị xóa.</p>
<p class="hint">File này chứng minh người cài đặt là chủ tài khoản hosting, để người lạ không chiếm được trang quản trị.</p>
<?php else: ?>
<p>Làm một lần. Tạo cơ sở dữ liệu MySQL trong hPanel → Cơ sở dữ liệu → MySQL, rồi điền vào đây. Thông tin được lưu ra file nằm ngoài public_html, không ai xem được qua web.</p>
<form method="post" autocomplete="off">
<input type="hidden" name="csrf" value="<?= e(csrf()) ?>">
<fieldset><legend>Mã cài đặt</legend><label>Chuỗi trong file hnlg-setup-key.txt</label><input name="setup_key" type="password" required autocomplete="off"></fieldset>
<fieldset><legend>Cơ sở dữ liệu MySQL</legend>
<label>Máy chủ</label><input name="db_host" value="127.0.0.1"><p class="hint">Trên Hostinger giữ nguyên 127.0.0.1.</p>
<label>Tên cơ sở dữ liệu</label><input name="db_name" required placeholder="u123456789_hnlg">
<label>Tên người dùng</label><input name="db_user" required placeholder="u123456789_hnlg">
<label>Mật khẩu</label><input name="db_pass" type="password" required>
</fieldset>
<fieldset><legend>Tài khoản quản trị</legend>
<label>Tên hiển thị</label><input name="admin_name" required value="Admin">
<label>Email</label><input name="admin_email" type="email" required>
<label>Mật khẩu (ít nhất 12 ký tự, có chữ và số)</label><input name="admin_pass" type="password" required minlength="12">
</fieldset>
<fieldset><legend>Tùy chọn</legend>
<label>Google Client ID (để trống nếu chưa có)</label><input name="google_client_id" placeholder="123…-abc….apps.googleusercontent.com">
<label>Địa chỉ trang</label><input name="site_url" value="https://homnaylamgi.com">
</fieldset>
<button type="submit">Cài đặt</button>
</form>
<?php endif; ?>
</main></body></html>
