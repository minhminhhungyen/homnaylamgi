<?php
/* Link xác nhận email trong thư gửi sau khi đăng ký. */
declare(strict_types=1);
require __DIR__ . '/_lib.php'; require __DIR__ . '/_page.php';
$ok = false;
if (installed()) { $uid = use_token((string) ($_GET['t'] ?? ''), 'verify'); if ($uid) { q('UPDATE users SET email_verified = 1 WHERE id = ?', [$uid]); $ok = true; } }
page_head('Xác nhận email | Hôm nay làm gì?');
echo '<div class="card"><h1>' . ($ok ? 'Đã xác nhận email' : 'Link đã hết hạn hoặc đã dùng') . '</h1><p>' . ($ok ? 'Cảm ơn bạn. Tài khoản của bạn đã sẵn sàng.' : 'Bạn đăng nhập rồi bấm “Gửi lại thư xác nhận” trong Trang của bạn nhé.') . '</p><p><a class="btn" href="/#toi">Về Trang của bạn</a></p></div>';
page_foot();
