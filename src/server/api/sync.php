<?php
/* Đồng bộ dữ liệu cá nhân giữa các máy của cùng một tài khoản.
   - state: sao, lịch sử quẻ, huy hiệu, thử thách 7 ngày, danh sách để dành, tên gọi (KHÔNG có vị trí, thời tiết).
     Máy chủ lọc từng trường, bỏ phần tử sai kiểu, chặn mốc thời gian vượt quá giờ máy chủ.
   - diary: nhật ký ĐÃ MÃ HÓA trên máy người dùng (AES-GCM, khóa sinh từ mật khẩu riêng). Máy chủ chỉ cất, không giải mã được. Tối đa 1 MB.
   - Chỉ tài khoản đã xác nhận email (hoặc đăng nhập Google) mới đồng bộ: người tạo tài khoản bằng email của người khác không ghi được gì.
   - rev: phiên bản toàn bộ; drev: phiên bản riêng của nhật ký. Máy gửi bản cũ nhận 409, tải lại, gộp rồi gửi lại.
   - get?since=rev&dsince=drev: không đổi thì chỉ trả {unchanged}, nhật ký chỉ gửi khi drev đổi (đỡ tốn dung lượng điện thoại).
   - clear: xóa sạch nhưng để lại dấu (epoch; dcl = mã các cuốn nhật ký đã xóa) để máy khác không đẩy dữ liệu cũ lên lại. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';

const STATE_MAX = 200 * 1024, DIARY_MAX = 1024 * 1024;
const DAY_MS = 86400000;

if (!installed()) fail('Hệ thống tài khoản chưa được cài đặt.', 503);
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > STATE_MAX + DIARY_MAX + 65536) fail('Dữ liệu quá lớn.', 413);
start_session();
$u = need_user();
$uid = (int) $u['id'];
$act = (string) ($_GET['action'] ?? '');
$nowMs = (int) floor(microtime(true) * 1000);
if (!((int) $u['email_verified'] || !empty($u['google_sub']))) fail('Xác nhận email (xem thư trong hộp thư) để bật đồng bộ.', 403, ['needVerify' => true]);
$diaryOk = true;
/* khoảng trắng theo đúng tập \s của JavaScript, để máy chủ và trình duyệt chuẩn hóa tên giống hệt nhau */
const WS = '/[\t\n\x{000B}\f\r \x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]+/u';
function clean_name_sync($v): string {
  if (!is_string($v)) return '';
  $v = trim((string) preg_replace(WS, ' ', $v), ' ');
  return trim(mb_substr($v, 0, 30), ' ');
}

/* ---------- kiểm tra dữ liệu (máy chủ không tin dữ liệu từ máy người dùng) ---------- */
function vint($v, int $min, int $max): ?int { return (is_int($v) || (is_float($v) && floor($v) === $v && abs($v) < 9.0e15)) && $v >= $min && $v <= $max ? (int) $v : null; }
function is_day($v): bool { return is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) === 1; }
function clean_state($s, int $nowMs): array {
  $I = 'vint'; $isDay = 'is_day';
  if (!is_array($s) || !isset($s['done']) || !is_array($s['done'])) fail('Dữ liệu đồng bộ không hợp lệ.', 422);
  $maxT = $nowMs + DAY_MS; // cho lệch đồng hồ tối đa 1 ngày
  $o = [];
  $o['stars'] = $I($s['stars'] ?? 0, 0, 10000000) ?? fail('Số sao không hợp lệ.', 422);
  $o['best'] = $I($s['best'] ?? 0, 0, 100000) ?? 0;
  $done = []; $seen = [];
  foreach (array_slice($s['done'], 0, 600) as $r) {
    if (!is_array($r)) continue;
    $id = $I($r['id'] ?? null, 1, 1000000); $ts = $I($r['ts'] ?? null, 0, $maxT); $d = $I($r['d'] ?? null, 1, 10);
    $day = $r['day'] ?? null; $f = $r['f'] ?? '';
    if ($id === null || $ts === null || $d === null || !$isDay($day) || !in_array($f, ['', 'vui', 'thuong', 'nho'], true)) continue;
    $k = "$id|$day"; if (isset($seen[$k])) continue; $seen[$k] = 1;
    $x = ['id' => $id, 'day' => $day, 'ts' => $ts, 'd' => $d, 'ch' => ($r['ch'] ?? 0) ? 1 : 0, 'f' => $f];
    $fu = $I($r['fu'] ?? null, 0, $maxT); if ($fu) $x['fu'] = $fu;
    $done[] = $x;
  }
  $o['done'] = $done;
  $ints = fn($a, int $n) => is_array($a) ? array_values(array_unique(array_filter(array_map(fn($v) => $I($v, 1, 1000000), array_slice($a, 0, $n)), fn($v) => $v !== null))) : [];
  $keys = fn($a, int $n) => is_array($a) ? array_values(array_unique(array_filter(array_slice($a, 0, $n), fn($v) => is_string($v) && preg_match('/^[a-z0-9_-]{1,24}$/', $v) === 1))) : [];
  $o['saved'] = $ints($s['saved'] ?? [], 100);
  $o['got'] = $keys($s['got'] ?? [], 100);
  $wk = $s['wk'] ?? null; $o['wk'] = null;
  if (is_array($wk) && is_string($wk['k'] ?? null) && preg_match('/^[a-z0-9_-]{1,24}$/', $wk['k']) && $isDay($wk['start'] ?? null) && is_array($wk['days'] ?? null)) {
    $days = array_values(array_unique(array_filter(array_slice($wk['days'], 0, 14), $isDay)));
    $o['wk'] = ['k' => $wk['k'], 'start' => $wk['start'], 'days' => $days];
  }
  $o['wkDone'] = $keys($s['wkDone'] ?? [], 100);
  $o['name'] = clean_name_sync($s['name'] ?? '');
  $ep = $I($s['epoch'] ?? 0, 0, PHP_INT_MAX);
  if ($ep === null) fail('Dữ liệu đồng bộ không hợp lệ.', 422);
  if ($ep > $maxT) fail('Đồng hồ trên máy bạn đang lệch quá nhiều. Chỉnh lại ngày giờ rồi thử lại nhé.', 422);
  $o['epoch'] = $ep;
  /* dcl: các cuốn nhật ký đã bị xóa (mã salt và lúc xóa); chỉ cuốn đúng mã, tạo trước lúc xóa mới bị xóa ở máy khác */
  $dcl = [];
  foreach (is_array($s['dcl'] ?? null) ? array_slice($s['dcl'], 0, 50) : [] as $c) {
    if (!is_array($c) || !is_string($c['s'] ?? null) || !preg_match('#^[A-Za-z0-9+/]{4,64}={0,2}$#', $c['s'])) continue;
    $at = $I($c['at'] ?? null, 0, $maxT); if ($at === null) continue;
    $dcl[$c['s']] = max($dcl[$c['s']] ?? 0, $at);
  }
  ksort($dcl, SORT_STRING);
  $o['dcl'] = array_map(fn($k, $v) => ['s' => (string) $k, 'at' => $v], array_keys($dcl), array_values($dcl));
  $mtf = [];
  foreach (['saved', 'wk', 'name'] as $k) {
    $v = $I(($s['mtf'] ?? [])[$k] ?? 0, 0, PHP_INT_MAX) ?? 0;
    if ($v > $maxT) fail('Đồng hồ trên máy bạn đang lệch quá nhiều. Chỉnh lại ngày giờ rồi thử lại nhé.', 422);
    $mtf[$k] = $v;
  }
  $o['mtf'] = $mtf;
  return $o;
}
/* nhật ký: chỉ kiểm hình dạng (nội dung đã mã hóa). Trả về chuỗi lỗi nếu không nhận. */
function diary_problem($d): ?string {
  if ($d === null) return null;
  $b64 = fn($v, int $max) => is_string($v) && strlen($v) <= $max && preg_match('#^[A-Za-z0-9+/]*={0,2}$#', $v) === 1;
  $box = fn($b) => is_array($b) && $b64($b['iv'] ?? null, 24) && $b64($b['ct'] ?? null, 200000);
  if (!is_array($d) || ($d['v'] ?? 0) !== 1 || !is_array($d['kdf'] ?? null) || !$b64($d['kdf']['salt'] ?? null, 64) || !$box($d['check'] ?? null) || !is_array($d['entries'] ?? null)) return 'Nhật ký không đúng định dạng nên chưa đồng bộ được.';
  foreach ($d['entries'] as $e) if (!is_array($e) || !is_string($e['id'] ?? null) || !preg_match('/^[0-9a-f]{16}$/', $e['id']) || !$box($e['box'] ?? null)) return 'Nhật ký có trang không đúng định dạng nên chưa đồng bộ được.';
  if (isset($d['del']) && (!is_array($d['del']) || count($d['del']) > 2000)) return 'Nhật ký không đúng định dạng nên chưa đồng bộ được.';
  return null;
}
/* trả nguyên chuỗi JSON đã lưu (đã được json_encode lúc ghi), không giải mã lại cho đỡ tốn bộ nhớ */
function send_raw(array $head, ?string $state, ?string $diary, bool $withDiary): never {
  http_response_code(200);
  header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff');
  $j = substr(json_encode($head + ['csrf' => csrf()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 0, -1);
  echo $j, ',"state":', $state ?? 'null';
  if ($withDiary) echo ',"diary":', $diary ?? 'null';
  echo '}';
  exit;
}

switch ($act) {
  case 'get':
    limit('sync-get:' . $uid, 1200, 3600);
    $r = one('SELECT rev, drev, state, ' . (isset($_GET['dsince']) ? 'IF(drev = ?, NULL, diary)' : 'diary') . ' AS diary FROM user_data WHERE user_id = ?', isset($_GET['dsince']) ? [(int) $_GET['dsince'], $uid] : [$uid]);
    $rev = $r ? (int) $r['rev'] : 0; $drev = $r ? (int) $r['drev'] : 0;
    $head = ['ok' => true, 'uid' => $uid, 'now' => $nowMs, 'rev' => $rev, 'drev' => $drev, 'dok' => $diaryOk];
    if (isset($_GET['since']) && (int) $_GET['since'] === $rev && $r) out($head + ['unchanged' => true, 'csrf' => csrf()]);
    $withDiary = !isset($_GET['dsince']) || (int) $_GET['dsince'] !== $drev;
    send_raw($head, $r['state'] ?? null, $r['diary'] ?? null, $withDiary);

  case 'put':
    need_post(); check_csrf();
    limit('sync:' . $uid, 600, 3600);
    $in = input();
    if (!$in || !array_key_exists('state', $in)) fail('Dữ liệu gửi lên không đọc được.', 400);
    if ((int) ($in['uid'] ?? 0) !== $uid) fail('Phiên đăng nhập đã đổi sang tài khoản khác. Tải lại trang nhé.', 409, ['wrongUser' => true]);
    $base = (int) ($in['rev'] ?? -1);
    $state = clean_state($in['state'] ?? null, $nowMs);
    $sj = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (strlen($sj) > STATE_MAX) fail('Lịch sử quá lớn để đồng bộ.', 413);
    $sendDiary = array_key_exists('diary', $in); $dj = null; $diaryErr = null;
    if ($sendDiary) {
      $d = $in['diary'];
      if ($p = diary_problem($d)) $diaryErr = $p;
      else { $dj = $d === null ? null : json_encode($d, JSON_UNESCAPED_SLASHES); if ($dj !== null && strlen($dj) > DIARY_MAX) { $diaryErr = 'Nhật ký quá lớn để đồng bộ (tối đa 1 MB). Sao, lịch sử vẫn được đồng bộ.'; } }
      if ($diaryErr) $sendDiary = false; // vẫn lưu phần sao, lịch sử
    }
    /* chặn đầy kho chung trên hosting: tổng dữ liệu đồng bộ của mọi tài khoản */
    /* chỉ tính khi gửi nhật ký hoặc tài khoản chưa có dữ liệu (các lần ghi khác rất nhỏ) */
    $cap = (int) cfg('sync_total_max_mb', 300) * 1048576;
    $grow = ($sendDiary && $dj !== null) || !one('SELECT 1 x FROM user_data WHERE user_id = ?', [$uid]);
    /* ước lượng nhanh dung lượng bảng (không quét từng dòng) */
    $total = $grow ? (int) (one("SELECT GREATEST(COALESCE(DATA_LENGTH + INDEX_LENGTH - DATA_FREE, 0), 0) n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_data'")['n'] ?? 0) : 0;
    if ($grow && $total + strlen($sj) + strlen((string) $dj) > $cap) { error_log('hnlg sync: kho đồng bộ đã đầy (' . $total . ' byte)'); fail('Kho đồng bộ đang đầy, tạm thời chưa lưu thêm được. Dữ liệu trên máy bạn vẫn an toàn.', 507); }
    $pdo = db();
    /* tạo sẵn dòng trống (không đụng nếu đã có) rồi khóa dòng: hai máy gửi lần đầu cùng lúc không gây lỗi */
    q('INSERT IGNORE INTO user_data (user_id, state, diary, rev, drev, updated_at) VALUES (?, \'{"done":[]}\', NULL, 0, 0, ?)', [$uid, now()]);
    $pdo->beginTransaction();
    try {
      $r = one('SELECT rev, drev FROM user_data WHERE user_id = ? FOR UPDATE', [$uid]);
      $cur = (int) $r['rev']; $drev = (int) $r['drev'];
      if ($base !== $cur) { $pdo->rollBack(); fail('Dữ liệu vừa được cập nhật từ máy khác.', 409, ['conflict' => true]); }
      if ($sendDiary) { q('UPDATE user_data SET state = ?, diary = ?, rev = rev + 1, drev = drev + 1, updated_at = ? WHERE user_id = ?', [$sj, $dj, now(), $uid]); $drev++; }
      else q('UPDATE user_data SET state = ?, rev = rev + 1, updated_at = ? WHERE user_id = ?', [$sj, now(), $uid]);
      $pdo->commit();
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      if ($e instanceof PDOException && in_array((int) ($e->errorInfo[1] ?? 0), [1213, 1205], true)) fail('Dữ liệu vừa được cập nhật từ máy khác.', 409, ['conflict' => true]);
      throw $e;
    }
    out(['ok' => true, 'uid' => $uid, 'rev' => $cur + 1, 'drev' => $drev, 'now' => $nowMs, 'dok' => $diaryOk] + ($diaryErr ? ['diary_error' => $diaryErr] : []) + ['csrf' => csrf()]);

  case 'clear':
    /* xóa sạch mà vẫn để dấu: epoch mới làm máy khác bỏ dữ liệu cũ, dcl làm máy khác xóa đúng cuốn nhật ký cũ */
    need_post(); check_csrf();
    limit('sync:' . $uid, 600, 3600);
    $old = one('SELECT state, diary FROM user_data WHERE user_id = ?', [$uid]);
    $dcl = [];
    if ($old) {
      foreach ((json_decode((string) $old['state'], true)['dcl'] ?? []) as $c) if (is_array($c) && is_string($c['s'] ?? null)) $dcl[$c['s']] = (int) ($c['at'] ?? 0);
      $od = $old['diary'] !== null ? json_decode((string) $old['diary'], true) : null;
      if (is_string($od['kdf']['salt'] ?? null)) $dcl[$od['kdf']['salt']] = $nowMs;
    }
    $in = input(); if (is_string($in['salt'] ?? null) && preg_match('#^[A-Za-z0-9+/]{4,64}={0,2}$#', $in['salt'])) $dcl[$in['salt']] = $nowMs; // cuốn trên máy đang xóa
    arsort($dcl); $dcl = array_slice($dcl, 0, 50, true); ksort($dcl, SORT_STRING); // giữ 50 lần xóa gần nhất
    $dclList = array_map(fn($k, $v) => ['s' => (string) $k, 'at' => $v], array_keys($dcl), array_values($dcl));
    $tomb = json_encode(['stars' => 0, 'best' => 0, 'done' => [], 'saved' => [], 'got' => [], 'wk' => null, 'wkDone' => [], 'name' => '', 'epoch' => $nowMs, 'dcl' => $dclList, 'mtf' => ['saved' => $nowMs, 'wk' => $nowMs, 'name' => $nowMs]]);
    q('INSERT INTO user_data (user_id, state, diary, rev, drev, updated_at) VALUES (?, ?, NULL, 1, 1, ?) ON DUPLICATE KEY UPDATE state = VALUES(state), diary = NULL, rev = rev + 1, drev = drev + 1, updated_at = VALUES(updated_at)', [$uid, $tomb, now()]);
    $r = one('SELECT rev, drev FROM user_data WHERE user_id = ?', [$uid]);
    out(['ok' => true, 'uid' => $uid, 'rev' => (int) $r['rev'], 'drev' => (int) $r['drev'], 'epoch' => $nowMs, 'dcl' => $dclList, 'now' => $nowMs, 'csrf' => csrf()]);
}
fail('Không có thao tác này.', 404);
