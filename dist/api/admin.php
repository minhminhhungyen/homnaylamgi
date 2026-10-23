<?php
/* API trang quản trị. Mọi thao tác cần đăng nhập tài khoản quản trị; thao tác ghi cần mã CSRF. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require __DIR__ . '/_content.php';
$act = (string) ($_GET['action'] ?? '');
$me = need_admin();
$post = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST';
if ($post) check_csrf();
$base = is_file(__DIR__ . '/_basemax.php') ? (require __DIR__ . '/_basemax.php') : ['q' => 0, 'an' => 0];
$I = fn(string $k) => (int) (input()[$k] ?? $_GET[$k] ?? 0);

switch ($act) {
  /* ---------- tổng quan ---------- */
  case 'stats':
    $c = fn($sql) => (int) one($sql)['n'];
    out(['ok' => true,
      'users' => $c('SELECT COUNT(*) n FROM users'), 'users7' => $c('SELECT COUNT(*) n FROM users WHERE created_at >= NOW() - INTERVAL 7 DAY'),
      'active7' => $c('SELECT COUNT(*) n FROM users WHERE last_login >= NOW() - INTERVAL 7 DAY'), 'admins' => $c("SELECT COUNT(*) n FROM users WHERE role = 'admin'"),
      'posts' => $c("SELECT COUNT(*) n FROM posts WHERE status = 'published'"), 'drafts' => $c("SELECT COUNT(*) n FROM posts WHERE status = 'draft'"),
      'notices' => $c('SELECT COUNT(*) n FROM notices WHERE active = 1 AND (ends_at IS NULL OR ends_at >= NOW())'), 'lib' => $c('SELECT COUNT(*) n FROM library'),
      'audit' => q('SELECT a.action, a.detail, a.at, u.name FROM audit a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 15')->fetchAll(),
      'base' => $base, 'me' => public_user($me)]);

  /* ---------- người dùng ---------- */
  case 'users':
    $s = mb_substr(trim((string) ($_GET['q'] ?? '')), 0, 100); $page = min(10000, max(1, (int) ($_GET['page'] ?? 1))); $per = 30;
    $where = $s !== '' ? 'WHERE email LIKE ? OR name LIKE ?' : ''; $p = $s !== '' ? ['%' . $s . '%', '%' . $s . '%'] : [];
    $total = (int) one("SELECT COUNT(*) n FROM users $where", $p)['n'];
    $rows = q("SELECT id, email, name, role, status, email_verified, google_sub IS NOT NULL google, created_at, last_login FROM users $where ORDER BY id DESC LIMIT $per OFFSET " . (($page - 1) * $per), $p)->fetchAll();
    out(['ok' => true, 'total' => $total, 'page' => $page, 'per' => $per, 'rows' => $rows]);

  case 'user-update':
    if (!$post) fail('Sai phương thức.', 405);
    $id = $I('id'); $u = one('SELECT * FROM users WHERE id = ?', [$id]);
    if (!$u) fail('Không tìm thấy người dùng.', 404);
    $role = (string) (input()['role'] ?? $u['role']); $status = (string) (input()['status'] ?? $u['status']);
    if (!in_array($role, ['user', 'admin'], true) || !in_array($status, ['active', 'locked'], true)) fail('Giá trị không hợp lệ.');
    if ($id === (int) $me['id'] && ($role !== 'admin' || $status !== 'active')) fail('Bạn không tự hạ quyền hoặc tự khóa chính mình được.', 409);
    $kick = $status !== $u['status'] || $role !== $u['role'];
    q('UPDATE users SET role = ?, status = ?' . ($kick ? ', sess_ver = sess_ver + 1' : '') . ' WHERE id = ?', [$role, $status, $id]);
    audit((int) $me['id'], 'user-update', "#$id: $role/$status");
    out(['ok' => true]);

  case 'user-delete':
    if (!$post) fail('Sai phương thức.', 405);
    $id = $I('id');
    if ($id === (int) $me['id']) fail('Không xóa chính mình ở đây được.', 409);
    $u = one('SELECT email, name FROM users WHERE id = ?', [$id]);
    if (!$u) fail('Không tìm thấy người dùng.', 404);
    q('DELETE FROM user_data WHERE user_id = ?', [$id]);
    q('DELETE FROM users WHERE id = ?', [$id]);
    audit((int) $me['id'], 'user-delete', "#$id");
    out(['ok' => true]);

  /* ---------- bài viết ---------- */
  case 'posts':
    out(['ok' => true, 'rows' => q("SELECT id, slug, title, status, published_at, updated_at FROM posts ORDER BY COALESCE(published_at, updated_at) DESC")->fetchAll()]);

  case 'post':
    $p = one('SELECT * FROM posts WHERE id = ?', [$I('id')]);
    if (!$p) fail('Không tìm thấy bài viết.', 404);
    out(['ok' => true, 'post' => $p]);

  case 'post-save':
    if (!$post) fail('Sai phương thức.', 405);
    $id = $I('id'); $title = str_in('title', 200); $summary = str_in('summary', 300); $body = (string) (input()['body'] ?? ''); $cover = str_in('cover', 255);
    $status = str_in('status', 10) === 'published' ? 'published' : 'draft'; $when = str_in('published_at', 20);
    if (mb_strlen($title) < 4) fail('Tiêu đề cần ít nhất 4 ký tự.');
    if (mb_strlen($body) > 100000) fail('Bài viết quá dài.');
    if ($cover !== '' && !preg_match('#^/uploads/[\w/.-]+$#', $cover)) fail('Ảnh bìa phải là ảnh đã tải lên.');
    guard_text($title, $summary, $body);
    $slug = slugify(str_in('slug', 120) ?: $title);
    $dup = one('SELECT id FROM posts WHERE slug = ? AND id <> ?', [$slug, $id]);
    if ($dup) $slug .= '-' . substr(bin2hex(random_bytes(2)), 0, 4);
    $pub = null;
    if ($status === 'published') { $ts = $when ? strtotime($when) : false; $pub = $ts ? date('Y-m-d H:i:s', $ts) : now(); }
    if ($id) {
      if (!one('SELECT id FROM posts WHERE id = ?', [$id])) fail('Không tìm thấy bài viết.', 404);
      q('UPDATE posts SET slug = ?, title = ?, summary = ?, body = ?, cover = ?, status = ?, published_at = ?, updated_at = ? WHERE id = ?', [$slug, $title, $summary, $body, $cover, $status, $pub, now(), $id]);
    } else {
      q('INSERT INTO posts (slug, title, summary, body, cover, status, published_at, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [$slug, $title, $summary, $body, $cover, $status, $pub, $me['id'], now(), now()]);
      $id = (int) db()->lastInsertId();
    }
    audit((int) $me['id'], 'post-save', "#$id $title ($status)");
    out(['ok' => true, 'id' => $id, 'slug' => $slug]);

  case 'post-delete':
    if (!$post) fail('Sai phương thức.', 405);
    $p = one('SELECT title FROM posts WHERE id = ?', [$I('id')]);
    if (!$p) fail('Không tìm thấy bài viết.', 404);
    q('DELETE FROM posts WHERE id = ?', [$I('id')]);
    audit((int) $me['id'], 'post-delete', $p['title']);
    out(['ok' => true]);

  case 'preview':
    if (!$post) fail('Sai phương thức.', 405);
    out(['ok' => true, 'html' => md((string) (input()['body'] ?? '')), 'hit' => banned_hit((string) (input()['body'] ?? ''))]);

  case 'upload':
    if (!$post) fail('Sai phương thức.', 405);
    $f = $_FILES['file'] ?? null;
    if (!$f || $f['error'] !== UPLOAD_ERR_OK) fail('Chưa nhận được ảnh.');
    if ($f['size'] > 8 * 1024 * 1024) fail('Ảnh tối đa 8 MB.');
    $info = @getimagesize($f['tmp_name']);
    if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP, IMAGETYPE_GIF], true)) fail('Chỉ nhận ảnh JPG, PNG, WebP, GIF.');
    if ($info[0] < 1 || $info[1] < 1 || $info[0] * $info[1] > 40000000) fail('Ảnh quá lớn (tối đa khoảng 40 megapixel).');
    $src = match ($info[2]) { IMAGETYPE_JPEG => @imagecreatefromjpeg($f['tmp_name']), IMAGETYPE_PNG => @imagecreatefrompng($f['tmp_name']), IMAGETYPE_WEBP => @imagecreatefromwebp($f['tmp_name']), default => @imagecreatefromgif($f['tmp_name']) };
    if (!$src) fail('Không đọc được ảnh.');
    [$w, $h] = [imagesx($src), imagesy($src)]; $max = 1600; $r = min(1, $max / max($w, $h));
    $dst = imagecreatetruecolor((int) round($w * $r), (int) round($h * $r));
    imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
    imagecopyresampled($dst, $src, 0, 0, 0, 0, imagesx($dst), imagesy($dst), $w, $h);
    /* ảnh lưu NGOÀI public_html (cạnh file cấu hình) để đưa bản web mới lên không làm mất ảnh; phục vụ qua api/img.php */
    $rel = 'uploads/' . date('Y/m'); $dir = upload_dir() . '/' . date('Y/m');
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) fail('Không tạo được thư mục ảnh.', 500);
    $name = bin2hex(random_bytes(8)) . '.jpg';
    imagejpeg($dst, "$dir/$name", 84);
    audit((int) $me['id'], 'upload', "/$rel/$name");
    out(['ok' => true, 'url' => "/$rel/$name", 'w' => imagesx($dst), 'h' => imagesy($dst)]);

  /* ---------- thông báo trên trang chủ ---------- */
  case 'notices':
    out(['ok' => true, 'rows' => q('SELECT * FROM notices ORDER BY id DESC LIMIT 100')->fetchAll()]);

  case 'notice-save':
    if (!$post) fail('Sai phương thức.', 405);
    $id = $I('id'); $text = str_in('text', 300); $link = str_in('link', 255);
    $from = str_in('starts_at', 20); $to = str_in('ends_at', 20); $active = !empty(input()['active']) ? 1 : 0;
    if (mb_strlen($text) < 4) fail('Nội dung thông báo quá ngắn.');
    if ($link !== '' && !preg_match('#^(https://[^\s"<>\\\\]+|/(?![/\\\\])[^\s"<>\\\\]*)$#', $link)) fail('Link phải bắt đầu bằng https:// hoặc /.');
    guard_text($text);
    $dt = fn($s) => $s !== '' && strtotime($s) ? date('Y-m-d H:i:s', strtotime($s)) : null;
    if ($id) q('UPDATE notices SET text = ?, link = ?, starts_at = ?, ends_at = ?, active = ? WHERE id = ?', [$text, $link, $dt($from), $dt($to), $active, $id]);
    else { q('INSERT INTO notices (text, link, starts_at, ends_at, active, created_at) VALUES (?, ?, ?, ?, ?, ?)', [$text, $link, $dt($from), $dt($to), $active, now()]); $id = (int) db()->lastInsertId(); }
    audit((int) $me['id'], 'notice-save', "#$id $text");
    out(['ok' => true, 'id' => $id]);

  case 'notice-delete':
    if (!$post) fail('Sai phương thức.', 405);
    q('DELETE FROM notices WHERE id = ?', [$I('id')]);
    audit((int) $me['id'], 'notice-delete', '#' . $I('id'));
    out(['ok' => true]);

  /* ---------- quẻ và món ---------- */
  case 'lib':
    $rows = q('SELECT kind, id, data, hidden, updated_at FROM library ORDER BY updated_at DESC')->fetchAll();
    foreach ($rows as &$r) $r['data'] = $r['data'] ? json_decode($r['data'], true) : null;
    out(['ok' => true, 'rows' => $rows, 'base' => $base]);

  case 'lib-save':
    if (!$post) fail('Sai phương thức.', 405);
    $kind = str_in('kind', 2) === 'an' ? 'an' : 'q'; $id = $I('id');
    $data = input()['data'] ?? null;
    if (!is_array($data)) fail('Thiếu nội dung.');
    if ($id <= 0) {
      $dbmax = (int) (one('SELECT MAX(id) n FROM library WHERE kind = ?', [$kind])['n'] ?? 0);
      $id = max((int) ($base[$kind] ?? 0), $dbmax) + 1;
    } elseif ($id > (int) ($base[$kind] ?? 0) && !one('SELECT id FROM library WHERE kind = ? AND id = ?', [$kind, $id])) fail('Số này chưa có.', 404);
    $clean = clean_item($kind, $data, $id);
    $tl = mb_strtolower($clean['t']);
    foreach (q('SELECT id, data FROM library WHERE kind = ? AND id <> ? AND hidden = 0', [$kind, $id])->fetchAll() as $r) { $d = json_decode((string) $r['data'], true); if ($d && mb_strtolower($d['t']) === $tl) fail("Trùng tên với số {$r['id']}."); }
    q('REPLACE INTO library (kind, id, data, hidden, updated_at, updated_by) VALUES (?, ?, ?, 0, ?, ?)', [$kind, $id, json_encode($clean, JSON_UNESCAPED_UNICODE), now(), $me['id']]);
    audit((int) $me['id'], 'lib-save', "$kind#$id {$clean['t']}");
    out(['ok' => true, 'id' => $id, 'item' => $clean]);

  case 'lib-hide':
    if (!$post) fail('Sai phương thức.', 405);
    $kind = str_in('kind', 2) === 'an' ? 'an' : 'q'; $id = $I('id'); $hide = !empty(input()['hidden']) ? 1 : 0;
    if ($id <= 0) fail('Số không hợp lệ.');
    $row = one('SELECT data FROM library WHERE kind = ? AND id = ?', [$kind, $id]);
    if ($row) q('UPDATE library SET hidden = ?, updated_at = ?, updated_by = ? WHERE kind = ? AND id = ?', [$hide, now(), $me['id'], $kind, $id]);
    elseif ($id <= (int) ($base[$kind] ?? 0)) q('INSERT INTO library (kind, id, data, hidden, updated_at, updated_by) VALUES (?, ?, NULL, ?, ?, ?)', [$kind, $id, $hide, now(), $me['id']]);
    else fail('Số này chưa có.', 404);
    audit((int) $me['id'], $hide ? 'lib-hide' : 'lib-show', "$kind#$id");
    out(['ok' => true]);

  case 'lib-revert':
    if (!$post) fail('Sai phương thức.', 405);
    $kind = str_in('kind', 2) === 'an' ? 'an' : 'q'; $id = $I('id');
    q('DELETE FROM library WHERE kind = ? AND id = ?', [$kind, $id]);
    audit((int) $me['id'], 'lib-revert', "$kind#$id");
    out(['ok' => true]);

  /* ---------- xác thực 2 bước cho chính quản trị viên ---------- */
  case 'totp-begin':
    if (!$post) fail('Sai phương thức.', 405);
    if (!empty(one('SELECT totp_secret FROM users WHERE id = ?', [$me['id']])['totp_secret'])) fail('Bạn đã bật xác thực 2 bước rồi.', 409);
    $sec = b32_encode(random_bytes(20));
    $_SESSION['totp_new'] = ['s' => $sec, 'at' => time()];
    $label = rawurlencode('Hôm nay làm gì?:' . ($me['email'] ?: $me['name']));
    out(['ok' => true, 'secret' => $sec, 'uri' => "otpauth://totp/{$label}?secret={$sec}&issuer=" . rawurlencode('Hôm nay làm gì?') . '&algorithm=SHA1&digits=6&period=30']);

  case 'totp-enable':
    if (!$post) fail('Sai phương thức.', 405);
    $n = $_SESSION['totp_new'] ?? null;
    if (!$n || time() - (int) $n['at'] > 900) fail('Hết thời gian, bấm bật lại từ đầu.', 409);
    limit('totp-en:' . $me['id'], 10, 900);
    $c = totp_check($n['s'], str_in('code', 12), null);
    if ($c === null) fail('Mã chưa đúng. Kiểm tra giờ trên điện thoại rồi thử lại.');
    q('UPDATE users SET totp_secret = ?, totp_last = ?, sess_ver = sess_ver + 1 WHERE id = ?', [seal_secret($n['s']), $c, $me['id']]);
    unset($_SESSION['totp_new']);
    login_now(one('SELECT * FROM users WHERE id = ?', [$me['id']]));
    audit((int) $me['id'], 'totp-on', '#' . $me['id']);
    out(['ok' => true, 'csrf' => csrf()]);

  case 'totp-disable':
    if (!$post) fail('Sai phương thức.', 405);
    limit('totp-off:' . $me['id'], 6, 900);
    $row = one('SELECT pass_hash, totp_secret, totp_last FROM users WHERE id = ?', [$me['id']]);
    $sec = open_secret($row['totp_secret']);
    if (!$sec) fail('Bạn chưa bật xác thực 2 bước.', 409);
    if (!$row['pass_hash'] || !password_verify((string) (input()['password'] ?? ''), $row['pass_hash'])) fail('Mật khẩu chưa đúng.', 401);
    if (totp_check($sec, str_in('code', 12), $row['totp_last'] !== null ? (int) $row['totp_last'] : null) === null) fail('Mã xác thực chưa đúng.', 401);
    q('UPDATE users SET totp_secret = NULL, totp_last = NULL WHERE id = ?', [$me['id']]);
    audit((int) $me['id'], 'totp-off', '#' . $me['id']);
    out(['ok' => true]);

  /* ---------- cài đặt ---------- */
  case 'settings':
    if (!$post) out(['ok' => true, 'google_client_id' => (string) cfg('google_client_id', ''), 'site_url' => site_url(), 'mail_from' => (string) cfg('mail_from', ''), 'twofa' => !empty(one('SELECT totp_secret FROM users WHERE id = ?', [$me['id']])['totp_secret']), 'admins_no2fa' => (int) one("SELECT COUNT(*) n FROM users WHERE role = 'admin' AND totp_secret IS NULL")['n']]);
    $gid = str_in('google_client_id', 200);
    if ($gid !== '' && !preg_match('/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/', $gid)) fail('Google Client ID không đúng dạng.');
    $c = cfg(); $c['google_client_id'] = $gid;
    $path = cfg_path();
    if (@file_put_contents($path, "<?php\n// Cấu hình Hôm nay làm gì? — KHÔNG đưa file này lên Git, không chia sẻ.\nreturn " . var_export($c, true) . ";\n", LOCK_EX) === false) fail('Không ghi được file cấu hình.', 500);
    @chmod($path, 0600);
    audit((int) $me['id'], 'settings', 'google_client_id ' . ($gid ? 'bật' : 'tắt'));
    out(['ok' => true]);
}
fail('Không có thao tác này.', 404);
