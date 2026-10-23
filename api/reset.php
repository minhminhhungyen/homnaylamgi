<?php
/* Đặt lại mật khẩu từ link trong thư. Token chỉ bị dùng khi gửi mật khẩu mới thành công. */
declare(strict_types=1);
require __DIR__ . '/_lib.php'; require __DIR__ . '/_page.php';
header('Cache-Control: no-store'); header('Referrer-Policy: no-referrer');
$t = (string) ($_GET['t'] ?? $_POST['t'] ?? '');
$msg = ''; $done = false;
if (!installed()) { http_response_code(503); $msg = 'Hệ thống tài khoản chưa được cài đặt.'; }
elseif (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
  start_session();
  if (!hash_equals($_SESSION['csrf'] ?? '', (string) ($_POST['csrf'] ?? ''))) $msg = 'Phiên đã hết hạn, tải lại trang nhé.';
  elseif ($err = pass_ok((string) ($_POST['p1'] ?? ''))) $msg = $err;
  elseif (($_POST['p1'] ?? '') !== ($_POST['p2'] ?? '')) $msg = 'Hai mật khẩu chưa khớp.';
  else {
    limit('reset:' . client_ip(), 10, 3600);
    $uid = use_token($t, 'reset');
    if (!$uid) $msg = 'Link đã hết hạn hoặc đã dùng. Hãy yêu cầu đặt lại mật khẩu lần nữa.';
    else { q('UPDATE users SET pass_hash = ?, sess_ver = sess_ver + 1, email_verified = 1 WHERE id = ?', [hash_pass((string) $_POST['p1']), $uid]); audit($uid, 'reset-password'); $done = true; }
  }
}
page_head('Đặt lại mật khẩu | Hôm nay làm gì?');
echo '<div class="card"><h1>Đặt lại mật khẩu</h1>';
if ($msg) echo '<p class="msg">' . e($msg) . '</p>';
if ($done) echo '<p>Xong rồi. Bạn đăng nhập bằng mật khẩu mới nhé. Các thiết bị khác đã được đăng xuất.</p><p><a class="btn" href="/#toi">Đăng nhập</a></p>';
elseif (installed()) echo '<form class="stack" method="post"><input type="hidden" name="csrf" value="' . e(csrf()) . '"><input type="hidden" name="t" value="' . e($t) . '"><label for="p1">Mật khẩu mới (ít nhất 8 ký tự, có chữ và số)</label><input id="p1" name="p1" type="password" autocomplete="new-password" required minlength="8"><label for="p2">Nhập lại</label><input id="p2" name="p2" type="password" autocomplete="new-password" required minlength="8"><button type="submit">Lưu mật khẩu mới</button></form>';
echo '</div>';
page_foot();
