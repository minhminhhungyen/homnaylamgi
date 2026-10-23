<?php
/* Trang Bài viết: /bai-viet (danh sách) và /bai-viet/<đường-dẫn> (một bài). */
declare(strict_types=1);
require dirname(__DIR__) . '/api/_lib.php';
require dirname(__DIR__) . '/api/_content.php';
require dirname(__DIR__) . '/api/_page.php';
$slug = (string) ($_GET['slug'] ?? '');
if (!installed()) { http_response_code(503); page_head('Bài viết | Hôm nay làm gì?'); echo '<div class="card"><h1>Bài viết</h1><p>Mục bài viết sắp có.</p></div>'; page_foot(); exit; }
header('Cache-Control: public, max-age=120');
if ($slug !== '') {
  if (!preg_match('/^[a-z0-9-]{1,120}$/', $slug)) { http_response_code(404); }
  $p = one("SELECT * FROM posts WHERE slug = ? AND status = 'published' AND published_at <= NOW()", [$slug]);
  if (!$p) { http_response_code(404); page_head('Không tìm thấy bài | Hôm nay làm gì?'); echo '<div class="card"><h1>Không tìm thấy bài viết</h1><p><a href="/bai-viet">Xem các bài khác</a></p></div>'; page_foot(); exit; }
  $url = site_url() . '/bai-viet/' . $p['slug'];
  page_head($p['title'] . ' | Hôm nay làm gì?', $p['summary'], ['type' => 'article', 'site_name' => 'Hôm nay làm gì?', 'url' => $url, 'title' => $p['title'], 'description' => $p['summary'], 'image' => $p['cover'] ? site_url() . $p['cover'] : site_url() . '/og-image.png']);
  echo '<article class="card"><p class="meta"><a href="/bai-viet">← Bài viết</a> · ' . e(date('d/m/Y', strtotime($p['published_at']))) . '</p><h1>' . e($p['title']) . '</h1>';
  if ($p['summary']) echo '<p class="muted">' . e($p['summary']) . '</p>';
  if ($p['cover']) echo '<img class="cover" src="' . e($p['cover']) . '" alt="">';
  echo '<div class="body">' . md($p['body']) . '</div><p><a class="btn" href="/">Rút một quẻ cho hôm nay</a></p></article>';
  page_foot(); exit;
}
$page = max(1, (int) ($_GET['trang'] ?? 1)); $per = 12;
$total = (int) one("SELECT COUNT(*) n FROM posts WHERE status = 'published' AND published_at <= NOW()")['n'];
$rows = q("SELECT slug, title, summary, cover, published_at FROM posts WHERE status = 'published' AND published_at <= NOW() ORDER BY published_at DESC LIMIT $per OFFSET " . (($page - 1) * $per))->fetchAll();
page_head('Bài viết | Hôm nay làm gì?', 'Bài viết, mẹo hay và tin mới từ Hôm nay làm gì?', ['type' => 'website', 'site_name' => 'Hôm nay làm gì?', 'title' => 'Bài viết | Hôm nay làm gì?', 'url' => site_url() . '/bai-viet', 'image' => site_url() . '/og-image.png']);
echo '<h1>Bài viết</h1>';
if (!$rows) echo '<p class="muted">Chưa có bài viết nào. Quay lại sau nhé.</p>';
else {
  echo '<ul class="posts">';
  foreach ($rows as $r) echo '<li><a href="/bai-viet/' . e($r['slug']) . '">' . ($r['cover'] ? '<img src="' . e($r['cover']) . '" alt="" loading="lazy">' : '') . '<div class="tx"><h2>' . e($r['title']) . '</h2><p class="meta">' . e(date('d/m/Y', strtotime($r['published_at']))) . '</p><p>' . e($r['summary']) . '</p></div></a></li>';
  echo '</ul><nav class="pager">' . ($page > 1 ? '<a href="/bai-viet?trang=' . ($page - 1) . '">← Mới hơn</a>' : '<span></span>') . ($page * $per < $total ? '<a href="/bai-viet?trang=' . ($page + 1) . '">Cũ hơn →</a>' : '') . '</nav>';
}
page_foot();
