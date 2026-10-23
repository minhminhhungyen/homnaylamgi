<?php
/* Khung trang HTML đơn giản cho các trang PHP (xác nhận email, đặt lại mật khẩu, bài viết). */
declare(strict_types=1);
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === '_page.php') { http_response_code(403); exit; }
function page_head(string $title, string $desc = '', array $og = []): void {
  header('X-Frame-Options: DENY');
  header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'");
  $site = site_url();
  echo '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
  echo '<title>' . e($title) . '</title>';
  if ($desc) echo '<meta name="description" content="' . e($desc) . '">';
  foreach ($og as $k => $v) echo '<meta property="og:' . e($k) . '" content="' . e($v) . '">';
  echo '<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/page.css"></head><body><header class="top"><a class="brand" href="/">Hôm nay làm gì<span>?</span></a><nav><a href="/bai-viet">Bài viết</a><a href="/#toi">Tài khoản</a></nav></header><main>';
}
function page_foot(): void {
  echo '</main><footer class="foot"><a href="/">Rút một quẻ</a> · <a href="/bai-viet">Bài viết</a> · <a href="/rieng-tu">Quyền riêng tư</a></footer></body></html>';
}
