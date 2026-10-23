<?php
/* Phục vụ ảnh quản trị viên tải lên (lưu ngoài public_html). Đường dẫn công khai: /uploads/YYYY/MM/<tên>.jpg */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
$f = (string) ($_GET['f'] ?? '');
if (!preg_match('#^\d{4}/\d{2}/[a-f0-9]{16}\.jpg$#', $f)) { http_response_code(404); exit; }
$path = upload_dir() . '/' . $f;
if (!is_file($path)) { http_response_code(404); exit; }
header('Content-Type: image/jpeg');
header('Content-Length: ' . filesize($path));
header('Cache-Control: public, max-age=2592000, immutable');
header('X-Content-Type-Options: nosniff');
readfile($path);
