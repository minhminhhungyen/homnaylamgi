<?php
/* Trang link rủ cho quẻ/món do quản trị viên thêm (không có file q/<số>.html dựng sẵn). */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
$k = ($_GET['k'] ?? '') === 'an' ? 'an' : 'q'; $id = (int) ($_GET['id'] ?? 0);
$r = installed() && $id > 0 ? one('SELECT data FROM library WHERE kind = ? AND id = ? AND hidden = 0', [$k, $id]) : null;
$d = $r ? json_decode((string) $r['data'], true) : null;
if (!$d) { http_response_code(404); header('Location: /'); exit; }
$go = ($k === 'q' ? 'q' : 'm') . '=' . $id;
$title = ($k === 'q' ? 'Hôm nay làm gì? ' : 'Hôm nay ăn gì? ') . $d['t'];
header("Content-Security-Policy: default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'");
?><!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title) ?></title><meta name="description" content="<?= e($d['n']) ?>"><meta name="robots" content="noindex">
<meta property="og:type" content="website"><meta property="og:site_name" content="Hôm nay làm gì?"><meta property="og:url" content="<?= e(site_url() . '/' . $k . '/' . $id) ?>">
<meta property="og:title" content="<?= e($title) ?>"><meta property="og:description" content="<?= e($d['n']) ?>"><meta property="og:image" content="<?= e(site_url()) ?>/og-image.png">
<meta http-equiv="refresh" content="0;url=/?<?= e($go) ?>"></head>
<body style="font:16px/1.6 system-ui,sans-serif;padding:24px"><h1><?= e($d['t']) ?></h1><p><?= e($d['n']) ?></p><p><a href="/?<?= e($go) ?>">Mở trên Hôm nay làm gì?</a></p></body></html>
