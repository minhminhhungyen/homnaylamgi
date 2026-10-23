<?php
/* Dữ liệu công khai cho trang chính: thông báo đang chạy, các quẻ/món quản trị viên thêm hoặc sửa, bài viết mới. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
$act = (string) ($_GET['action'] ?? '');
if (!installed()) out(['ok' => true, 'notice' => null, 'lib' => '', 'posts' => []]);
switch ($act) {
  case 'boot':
    $n = one('SELECT id, text, link FROM notices WHERE active = 1 AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW()) ORDER BY id DESC LIMIT 1');
    $l = one('SELECT COUNT(*) n, MAX(updated_at) t FROM library');
    $p = q("SELECT slug, title, summary, cover, DATE_FORMAT(published_at, '%d/%m/%Y') day FROM posts WHERE status = 'published' AND published_at <= NOW() ORDER BY published_at DESC LIMIT 3")->fetchAll();
    header('Cache-Control: public, max-age=60');
    out(['ok' => true, 'notice' => $n ? ['id' => (int) $n['id'], 'text' => $n['text'], 'link' => $n['link']] : null, 'lib' => $l['n'] ? $l['n'] . '-' . strtotime((string) $l['t']) : '', 'posts' => $p]);
  case 'library':
    $res = ['ok' => true, 'q' => [], 'an' => [], 'hide' => ['q' => [], 'an' => []]];
    foreach (q('SELECT kind, id, data, hidden FROM library ORDER BY kind, id')->fetchAll() as $r) {
      if ($r['hidden']) { $res['hide'][$r['kind']][] = (int) $r['id']; continue; }
      $d = json_decode((string) $r['data'], true);
      if (is_array($d)) $res[$r['kind']][] = $d;
    }
    $l = one('SELECT COUNT(*) n, MAX(updated_at) t FROM library');
    $res['v'] = $l['n'] ? $l['n'] . '-' . strtotime((string) $l['t']) : '';
    header('Cache-Control: public, max-age=60');
    out($res);
}
fail('Không có thao tác này.', 404);
