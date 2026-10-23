<?php
/* Tài khoản người dùng: đăng ký, đăng nhập (email + mật khẩu hoặc Google), quên mật khẩu, sửa hồ sơ, xóa tài khoản. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';

$act = (string) ($_GET['action'] ?? '');
/* tài khoản bật xác thực 2 bước: chưa đăng nhập ngay, chờ mã 6 số */
function finish_login(array $u): never {
  if (!empty($u['totp_secret'])) {
    start_session(); session_regenerate_id(true);
    $_SESSION['pending2fa'] = ['uid' => (int) $u['id'], 'at' => time()];
    out(['ok' => true, 'need2fa' => true, 'csrf' => csrf()]);
  }
  login_now($u);
  out(['ok' => true, 'user' => public_user(me()), 'csrf' => csrf()]);
}
if (!installed()) out(['ok' => true, 'installed' => false, 'user' => null, 'google' => '', 'csrf' => '']);
start_session();

switch ($act) {
  case 'me':
    $u = me();
    out(['ok' => true, 'installed' => true, 'user' => $u ? public_user($u) : null, 'google' => (string) cfg('google_client_id', ''), 'csrf' => csrf()]);

  case 'register':
    need_post(); check_csrf();
    limit('reg:' . client_ip(), 5, 3600);
    $email = mb_strtolower(str_in('email', 190)); $name = clean_name(str_in('name', 120)); $pass = (string) (input()['password'] ?? '');
    if (!valid_email($email)) fail('Email chưa đúng.');
    if (!$name) fail('Bạn điền tên gọi nhé.');
    if ($err = pass_ok($pass)) fail($err);
    if (empty(input()['age'])) fail('Dịch vụ dành cho người từ đủ 16 tuổi. Hãy xác nhận độ tuổi.');
    if (empty(input()['agree'])) fail('Bạn cần đồng ý với chính sách quyền riêng tư.');
    guard_text($name);
    if (one('SELECT id FROM users WHERE email = ?', [$email])) fail('Email này đã có tài khoản. Hãy đăng nhập hoặc dùng “Quên mật khẩu”.', 409);
    q('INSERT INTO users (email, name, pass_hash, age_ok, created_at) VALUES (?, ?, ?, 1, ?)', [$email, $name, hash_pass($pass), now()]);
    $u = one('SELECT * FROM users WHERE id = ?', [(int) db()->lastInsertId()]);
    login_now($u);
    $t = new_token((int) $u['id'], 'verify', 7 * 86400);
    send_mail($email, 'Xác nhận email cho Hôm nay làm gì?', "Chào {$name},\n\nBấm vào link sau để xác nhận email của bạn (hiệu lực 7 ngày):\n" . site_url() . "/api/verify.php?t={$t}\n\nNếu bạn không đăng ký, hãy bỏ qua thư này.\n\nHôm nay làm gì? — homnaylamgi.com");
    $u = me();
    out(['ok' => true, 'user' => public_user($u), 'csrf' => csrf()]);

  case 'login':
    need_post(); check_csrf();
    $email = mb_strtolower(str_in('email', 190)); $pass = (string) (input()['password'] ?? '');
    limit('login-ip:' . client_ip(), 30, 900);
    /* chỉ đếm lần sai, theo email + IP (người khác không khóa được tài khoản của bạn), thêm trần lỏng theo tài khoản */
    $kIp = 'login:' . $email . '|' . client_ip(); $kAcct = 'login-acct:' . $email;
    if ($t = limit_over($kIp, 8) ?? limit_over($kAcct, 200)) limit_fail($t);
    $u = one('SELECT * FROM users WHERE email = ?', [$email]);
    if (!login_pass_ok($u, $pass)) { limit_hit($kIp, 900); limit_hit($kAcct, 3600); fail('Email hoặc mật khẩu chưa đúng.', 401); }
    limit_clear($kIp);
    if ($u['status'] !== 'active') fail('Tài khoản đang bị khóa. Liên hệ hotro@homnaylamgi.com.', 403);
    if (password_needs_rehash($u['pass_hash'], defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT)) q('UPDATE users SET pass_hash = ? WHERE id = ?', [hash_pass($pass), $u['id']]);
    finish_login($u);

  case '2fa':
    need_post(); check_csrf();
    $p = $_SESSION['pending2fa'] ?? null;
    if (!$p || time() - (int) $p['at'] > 300) { unset($_SESSION['pending2fa']); fail('Hết thời gian nhập mã, hãy đăng nhập lại.', 401); }
    limit('2fa:' . $p['uid'], 6, 600);
    $u = one('SELECT * FROM users WHERE id = ?', [$p['uid']]);
    $sec = $u ? open_secret($u['totp_secret']) : null;
    if (!$u || $u['status'] !== 'active' || !$sec) { unset($_SESSION['pending2fa']); fail('Không đăng nhập được, thử lại từ đầu.', 401); }
    $c = totp_check($sec, str_in('code', 12), $u['totp_last'] !== null ? (int) $u['totp_last'] : null);
    if ($c === null) fail('Mã xác thực chưa đúng hoặc đã dùng.', 401);
    q('UPDATE users SET totp_last = ? WHERE id = ?', [$c, $u['id']]);
    login_now($u);
    out(['ok' => true, 'user' => public_user(me()), 'csrf' => csrf()]);

  case 'google':
    need_post(); check_csrf();
    $gid = (string) cfg('google_client_id', '');
    if (!$gid) fail('Đăng nhập Google chưa được bật.', 503);
    limit('google:' . client_ip(), 20, 900);
    $cred = str_in('credential', 4000);
    if (!preg_match('/^[\w-]+\.[\w-]+\.[\w-]+$/', $cred)) fail('Thông tin đăng nhập Google không hợp lệ.');
    $ch = curl_init('https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($cred));
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
    $res = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    $g = $code === 200 ? json_decode((string) $res, true) : null;
    if (!$g || ($g['aud'] ?? '') !== $gid || !in_array($g['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true) || (int) ($g['exp'] ?? 0) < time() || empty($g['sub'])) fail('Không xác thực được tài khoản Google. Thử lại nhé.', 401);
    $sub = (string) $g['sub']; $email = mb_strtolower((string) ($g['email'] ?? '')); $verified = ($g['email_verified'] ?? '') === 'true' || ($g['email_verified'] ?? false) === true;
    $u = one('SELECT * FROM users WHERE google_sub = ?', [$sub]);
    if (!$u && $email && $verified) {
      $x = one('SELECT * FROM users WHERE email = ?', [$email]);
      if ($x) {
        if ($x['role'] === 'admin') fail('Tài khoản quản trị: hãy đăng nhập bằng email và mật khẩu.', 409);
        if (!(int) $x['email_verified']) {
          /* chưa ai chứng minh sở hữu hộp thư này: bỏ mật khẩu cũ, đăng xuất mọi phiên của tài khoản */
          q('UPDATE users SET google_sub = ?, email_verified = 1, pass_hash = NULL, sess_ver = sess_ver + 1 WHERE id = ?', [$sub, $x['id']]);
          audit((int) $x['id'], 'google-link-reset', '#' . $x['id']);
        } else {
          q('UPDATE users SET google_sub = ?, sess_ver = sess_ver + 1 WHERE id = ?', [$sub, $x['id']]);
          audit((int) $x['id'], 'google-link', '#' . $x['id']);
        }
        $u = one('SELECT * FROM users WHERE id = ?', [$x['id']]);
      }
    }
    if (!$u) {
      if (empty(input()['age'])) fail('Dịch vụ dành cho người từ đủ 16 tuổi. Hãy đánh dấu xác nhận độ tuổi rồi bấm lại nút Google.', 422, ['needAge' => true]);
      $name = clean_name((string) ($g['name'] ?? '')) ?: 'Bạn mới';
      if (banned_hit($name) !== null) $name = 'Bạn mới';
      q('INSERT INTO users (email, name, google_sub, email_verified, age_ok, created_at) VALUES (?, ?, ?, ?, 1, ?)', [$verified && $email ? $email : null, $name, $sub, $verified ? 1 : 0, now()]);
      $u = one('SELECT * FROM users WHERE id = ?', [(int) db()->lastInsertId()]);
    }
    if ($u['status'] !== 'active') fail('Tài khoản đang bị khóa. Liên hệ hotro@homnaylamgi.com.', 403);
    finish_login($u);

  case 'logout':
    need_post(); check_csrf();
    logout_now();
    out(['ok' => true, 'csrf' => csrf()]);

  case 'forgot':
    need_post(); check_csrf();
    $email = mb_strtolower(str_in('email', 190));
    limit('forgot-ip:' . client_ip(), 5, 3600);
    limit('forgot:' . $email, 3, 3600);
    $u = valid_email($email) ? one('SELECT id, name, status FROM users WHERE email = ?', [$email]) : null;
    if ($u && $u['status'] === 'active') {
      $t = new_token((int) $u['id'], 'reset', 3600);
      send_mail($email, 'Đặt lại mật khẩu Hôm nay làm gì?', "Chào {$u['name']},\n\nBấm vào link sau để đặt mật khẩu mới (hiệu lực 1 giờ):\n" . site_url() . "/api/reset.php?t={$t}\n\nNếu bạn không yêu cầu, hãy bỏ qua thư này. Mật khẩu cũ vẫn dùng được.\n\nHôm nay làm gì? — homnaylamgi.com");
    }
    out(['ok' => true, 'message' => 'Nếu email có tài khoản, thư đặt lại mật khẩu sẽ tới trong vài phút. Nhớ xem cả thư mục Spam.']);

  case 'profile':
    need_post(); check_csrf(); $u = need_user();
    $name = clean_name(str_in('name', 120));
    if (!$name) fail('Tên gọi không được trống.');
    guard_text($name);
    q('UPDATE users SET name = ? WHERE id = ?', [$name, $u['id']]);
    out(['ok' => true, 'user' => public_user(me())]);

  case 'password':
    need_post(); check_csrf(); $u = need_user();
    limit('pw:' . $u['id'], 8, 900);
    $row = one('SELECT pass_hash FROM users WHERE id = ?', [$u['id']]);
    $old = (string) (input()['old'] ?? ''); $new = (string) (input()['new'] ?? '');
    if ($row['pass_hash'] && !password_verify($old, $row['pass_hash'])) fail('Mật khẩu hiện tại chưa đúng.', 401);
    if ($err = pass_ok($new)) fail($err);
    q('UPDATE users SET pass_hash = ?, sess_ver = sess_ver + 1 WHERE id = ?', [hash_pass($new), $u['id']]);
    login_now($u);
    out(['ok' => true, 'user' => public_user(me()), 'csrf' => csrf()]);

  case 'resend':
    need_post(); check_csrf(); $u = need_user();
    limit('resend:' . $u['id'], 3, 3600);
    if ($u['email'] && !$u['email_verified']) {
      $t = new_token((int) $u['id'], 'verify', 7 * 86400);
      send_mail($u['email'], 'Xác nhận email cho Hôm nay làm gì?', "Chào {$u['name']},\n\nBấm vào link sau để xác nhận email (hiệu lực 7 ngày):\n" . site_url() . "/api/verify.php?t={$t}\n\nHôm nay làm gì? — homnaylamgi.com");
    }
    out(['ok' => true]);

  case 'delete':
    need_post(); check_csrf(); $u = need_user();
    if ($u['role'] === 'admin' && (int) one("SELECT COUNT(*) n FROM users WHERE role = 'admin' AND status = 'active'")['n'] <= 1) fail('Bạn là quản trị viên duy nhất nên chưa xóa được tài khoản.', 409);
    if (str_in('confirm', 20) !== 'XÓA') fail('Gõ chữ XÓA để xác nhận.');
    q('DELETE FROM users WHERE id = ?', [$u['id']]);
    audit((int) $u['id'], 'self-delete', '#' . $u['id']);
    logout_now();
    out(['ok' => true, 'csrf' => csrf()]);
}
fail('Không có thao tác này.', 404);
