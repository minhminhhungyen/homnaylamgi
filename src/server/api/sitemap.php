<?php
/* Sơ đồ trang cho bài viết đã đăng (robots.txt trỏ tới đây). Chưa cài CSDL hoặc chưa có bài thì trả danh sách rỗng hợp lệ. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
if (installed()) {
  try {
    $rows = q("SELECT slug, published_at, updated_at FROM posts WHERE status = 'published' AND published_at <= NOW() ORDER BY published_at DESC LIMIT 5000")->fetchAll();
    if ($rows) echo '  <url><loc>' . htmlspecialchars(site_url() . '/bai-viet', ENT_XML1) . '</loc></url>' . "\n";
    foreach ($rows as $r) {
      $mod = substr((string) ($r['updated_at'] ?: $r['published_at']), 0, 10);
      echo '  <url><loc>' . htmlspecialchars(site_url() . '/bai-viet/' . $r['slug'], ENT_XML1) . '</loc><lastmod>' . htmlspecialchars($mod, ENT_XML1) . '</lastmod></url>' . "\n";
    }
  } catch (Throwable $e) { error_log('hnlg sitemap: ' . $e->getMessage()); }
}
echo '</urlset>' . "\n";
