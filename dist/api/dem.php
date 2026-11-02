<?php
/* Đếm lượt dùng ẩn danh: trình duyệt gửi một lần mỗi lượt vào trang (sendBeacon), máy chủ chỉ cộng vào tổng của ngày.
   Không đọc, không đặt cookie; không mở phiên; không lưu IP hay bất kỳ mã định danh nào. Chưa cài CSDL thì bỏ qua. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';

const DEM_EV = ['open', 'draw', 'food', 'accept', 'done', 'veg', 'ban', 'group', 'share', 'wx', 'topic'];
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); exit; }
$raw = (string) file_get_contents('php://input', false, null, 0, 1024);
$in = json_decode($raw, true);
if (!is_array($in) || !is_array($in['e'] ?? null) || !installed()) { http_response_code(204); exit; }
try {
  foreach (DEM_EV as $k) {
    $n = (int) ($in['e'][$k] ?? 0);
    if ($n <= 0) continue;
    q('INSERT INTO counters (day, ev, n) VALUES (CURDATE(), ?, ?) ON DUPLICATE KEY UPDATE n = n + VALUES(n)', [$k, min($n, 50)]);
  }
} catch (Throwable $e) { error_log('hnlg dem: ' . $e->getMessage()); }
http_response_code(204);
