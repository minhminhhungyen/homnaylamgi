<?php
/* Đồng bộ dữ liệu cá nhân giữa các máy của cùng một tài khoản.
   - state: sao, lịch sử quẻ, huy hiệu, thử thách, tên gọi (KHÔNG có vị trí thời tiết).
   - diary: nhật ký đã mã hóa AES-GCM ngay trên máy người dùng bằng mật khẩu riêng; máy chủ chỉ cất, không giải mã được.
   Ghi theo số phiên bản (rev): máy nào gửi bản cũ hơn sẽ nhận 409 kèm bản mới nhất để gộp lại rồi gửi lại. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';

const STATE_MAX = 300 * 1024, DIARY_MAX = 4 * 1024 * 1024;
const STATE_KEYS = ['stars', 'best', 'done', 'saved', 'got', 'wk', 'wkDone', 'pref', 'name', 'epoch', 'mt'];

if (!installed()) fail('Hệ thống tài khoản chưa được cài đặt.', 503);
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > STATE_MAX + DIARY_MAX + 65536) fail('Dữ liệu quá lớn.', 413);
start_session();
$u = need_user();
$uid = (int) $u['id'];
$act = (string) ($_GET['action'] ?? '');

function current_data(int $uid): array {
  $r = one('SELECT state, diary, rev, updated_at FROM user_data WHERE user_id = ?', [$uid]);
  if (!$r) return ['rev' => 0, 'state' => null, 'diary' => null, 'at' => null];
  return ['rev' => (int) $r['rev'], 'state' => json_decode($r['state'], true), 'diary' => $r['diary'] !== null ? json_decode($r['diary'], true) : null, 'at' => $r['updated_at']];
}
/* chỉ giữ các trường được phép, kiểm kiểu dữ liệu cơ bản */
function clean_state($s): array {
  if (!is_array($s) || !isset($s['done']) || !is_array($s['done'])) fail('Dữ liệu đồng bộ không hợp lệ.', 422);
  $o = [];
  foreach (STATE_KEYS as $k) if (array_key_exists($k, $s)) $o[$k] = $s[$k];
  foreach (['stars', 'best', 'epoch', 'mt'] as $k) if (isset($o[$k]) && !is_int($o[$k]) && !is_float($o[$k])) fail('Dữ liệu đồng bộ không hợp lệ.', 422);
  foreach (['done', 'saved', 'got', 'wkDone'] as $k) if (isset($o[$k]) && !is_array($o[$k])) fail('Dữ liệu đồng bộ không hợp lệ.', 422);
  if (isset($o['name']) && !is_string($o['name'])) $o['name'] = '';
  if (isset($o['name'])) $o['name'] = mb_substr($o['name'], 0, 60);
  if (count($o['done']) > 600) $o['done'] = array_slice($o['done'], 0, 600);
  return $o;
}
function clean_diary($d): ?array {
  if ($d === null) return null;
  $ok = is_array($d) && ($d['v'] ?? 0) === 1 && is_array($d['kdf'] ?? null) && is_string($d['kdf']['salt'] ?? null) && is_array($d['check'] ?? null) && is_array($d['entries'] ?? null);
  if (!$ok) fail('Nhật ký đồng bộ không hợp lệ.', 422);
  return $d;
}

switch ($act) {
  case 'get':
    out(['ok' => true] + current_data($uid) + ['csrf' => csrf()]);

  case 'put':
    need_post(); check_csrf();
    limit('sync:' . $uid, 240, 3600);
    $in = input();
    $base = (int) ($in['rev'] ?? -1);
    $state = clean_state($in['state'] ?? null);
    $diary = clean_diary($in['diary'] ?? null);
    $sj = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $dj = $diary === null ? null : json_encode($diary, JSON_UNESCAPED_SLASHES);
    if (strlen($sj) > STATE_MAX) fail('Lịch sử quá lớn để đồng bộ.', 413);
    if ($dj !== null && strlen($dj) > DIARY_MAX) fail('Nhật ký quá lớn để đồng bộ (tối đa 4 MB).', 413);
    $pdo = db(); $pdo->beginTransaction();
    try {
      $r = one('SELECT rev FROM user_data WHERE user_id = ? FOR UPDATE', [$uid]);
      $cur = $r ? (int) $r['rev'] : 0;
      if ($base !== $cur) { $pdo->rollBack(); out(['ok' => false, 'conflict' => true, 'error' => 'Dữ liệu vừa được cập nhật từ máy khác.'] + current_data($uid), 409); }
      if ($r) q('UPDATE user_data SET state = ?, diary = ?, rev = rev + 1, updated_at = ? WHERE user_id = ?', [$sj, $dj, now(), $uid]);
      else q('INSERT INTO user_data (user_id, state, diary, rev, updated_at) VALUES (?, ?, ?, 1, ?)', [$uid, $sj, $dj, now()]);
      $pdo->commit();
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
    out(['ok' => true, 'rev' => $cur + 1, 'csrf' => csrf()]);

  case 'clear':
    need_post(); check_csrf();
    q('DELETE FROM user_data WHERE user_id = ?', [$uid]);
    out(['ok' => true, 'rev' => 0, 'csrf' => csrf()]);
}
fail('Không có thao tác này.', 404);
