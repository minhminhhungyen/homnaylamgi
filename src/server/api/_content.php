<?php
/* Nội dung do quản trị viên nhập: kiểm tra quẻ/món, chuyển bài viết dạng chữ đơn giản sang HTML an toàn. */
declare(strict_types=1);
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === '_content.php') { http_response_code(403); exit; }

/* Kiểm tra một quẻ (kind=q) hoặc món (kind=an). Trả về mảng sạch hoặc dừng với lỗi tiếng Việt.
   Áp cùng quy tắc an toàn với bước build: từ cấm, người buồn/cô đơn chỉ việc nhẹ, khuya không ra ngoài, thử thách chung phải nhẹ. */
function clean_item(string $kind, array $d, int $id): array {
  $s = fn($k, $max) => mb_substr(trim((string) ($d[$k] ?? '')), 0, $max);
  $t = $s('t', 90); $n = $s('n', 160);
  if (mb_strlen($t) < 4) fail('Tên cần ít nhất 4 ký tự.');
  if (mb_strlen($n) < 4) fail('Lời quẻ cần ít nhất 4 ký tự.');
  if ($kind === 'an') {
    $b = $s('b', 5); $o = $s('o', 2); $r = $s('r', 2); $k = (int) ($d['k'] ?? 1); $w = $s('w', 1);
    if (!preg_match('/^(?!.*(.).*\1)[sctkv]+$/', $b)) fail('Bữa: chọn ít nhất một trong sáng, trưa, tối, khuya, ăn vặt.');
    if (!in_array($o, ['n', 'h', 'nh'], true)) fail('Kiểu món không hợp lệ.');
    if (!in_array($r, ['', 'B', 'T', 'N', 'TN'], true)) fail('Vùng miền không hợp lệ.');
    if ($k < 0 || $k > 3) fail('Chi phí không hợp lệ.');
    if (!in_array($w, ['', 'n', 'm'], true)) fail('Nhãn nóng/mát không hợp lệ.');
    guard_text($t, $n);
    $out = ['id' => $id, 't' => $t, 'n' => $n, 'b' => $b, 'o' => $o, 'r' => $r, 'k' => $k];
    if ($w) $out['w'] = $w;
    return $out;
  }
  $c = $s('c', 2); $st = $s('s', 300); $ai = $s('ai', 4); $o = $s('o', 1); $g = $s('g', 4); $m = $s('m', 6); $x = $s('x', 80); $ev = $s('ev', 12);
  $p = (int) ($d['p'] ?? 30); $k = (int) ($d['k'] ?? 0); $dd = (int) ($d['d'] ?? 3); $ch = !empty($d['ch']);
  if (!in_array($c, CATS, true)) fail('Nhóm không hợp lệ.');
  if (mb_strlen($st) < 8) fail('Bước bắt đầu cần ít nhất 8 ký tự.');
  if ($p < 1 || $p > 1440) fail('Số phút từ 1 đến 1440.');
  if ($k < 0 || $k > 3) fail('Chi phí không hợp lệ.');
  if ($dd < 1 || $dd > 10) fail('Độ khó từ 1 đến 10.');
  if (!preg_match('/^(?!.*(.).*\1)[abyg]+$/', $ai)) fail('Chọn ít nhất một người đi cùng.');
  if (!in_array($o, ['i', 'o', 'b'], true)) fail('Nơi chốn không hợp lệ.');
  if (!preg_match('/^(?!.*(.).*\1)[sctk]+$/', $g)) fail('Chọn ít nhất một khung giờ.');
  if (!preg_match('/^(?!.*(.).*\1)[cbmxlh]+$/', $m)) fail('Chọn ít nhất một tâm trạng.');
  $xs = array_values(array_filter(preg_split('/\s+/', $x) ?: []));
  foreach ($xs as $tag) if (!in_array($tag, XTAGS, true)) fail("Nhãn phụ “{$tag}” không hợp lệ.");
  if ($ev !== '' && !in_array($ev, EVS, true)) fail('Dịp không hợp lệ.');
  guard_text($t, $n, $st);
  if (preg_match('/[bl]/', $m) && $dd > 6) fail('Quẻ cho người đang buồn hoặc cô đơn phải có độ khó tối đa 6.');
  if (str_contains($g, 'k') && $o === 'o') fail('Quẻ lúc khuya (22–5h) không được bắt ra ngoài.');
  if (str_contains($g, 'k') && $dd > 3) fail('Quẻ lúc khuya phải nhẹ: độ khó tối đa 3.');
  if ($ch && ($dd > 5 || $k > 1 || !str_contains($g, 's') || !str_contains($g, 't') || $ev !== '' || $o === 'o')) fail('Thử thách chung phải có độ khó tối đa 5, chi phí dưới 100k, có khung sáng và tối, không theo dịp, không bắt ra ngoài.');
  if (!preg_match('/[abg]/', $ai) && preg_match('/[bl]/', $m)) fail('Quẻ chỉ dành cho người yêu không gắn tâm trạng buồn, cô đơn.');
  $out = ['id' => $id, 'c' => $c];
  if ($ev !== '') $out['ev'] = $ev;
  $out += ['t' => $t, 'n' => $n, 's' => $st, 'p' => $p, 'k' => $k, 'ai' => $ai, 'o' => $o, 'g' => $g, 'm' => $m, 'd' => $dd];
  if ($ch) $out['ch'] = 1;
  if ($xs) $out['x'] = implode(' ', $xs);
  return $out;
}

/* Bài viết: chữ thường kiểu Markdown đơn giản → HTML. Mọi chữ đều được thoát HTML trước. */
function md_inline(string $s): string {
  $s = e($s);
  $s = preg_replace('/!\[([^\]]*)\]\((\/uploads\/[\w\/.-]+)\)/u', '<img src="$2" alt="$1" loading="lazy">', $s);
  $s = preg_replace_callback('/\[([^\]]+)\]\(((?:https?:\/\/|\/(?![\/\\\\]))[^\s)\\\\]+)\)/u', function ($m) {
    $host = parse_url(html_entity_decode($m[2], ENT_QUOTES), PHP_URL_HOST);
    $ext = $host !== null && $host !== parse_url(site_url(), PHP_URL_HOST);
    return '<a href="' . $m[2] . '"' . ($ext ? ' rel="noopener nofollow ugc" target="_blank"' : '') . '>' . $m[1] . '</a>';
  }, $s);
  $s = preg_replace('/\*\*(.+?)\*\*/u', '<strong>$1</strong>', $s);
  $s = preg_replace('/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/u', '<em>$1</em>', $s);
  return $s;
}
function md(string $src): string {
  $html = ''; $list = ''; $para = [];
  $flush = function () use (&$html, &$para, &$list) {
    if ($para) { $html .= '<p>' . implode('<br>', array_map('md_inline', $para)) . '</p>'; $para = []; }
    if ($list) { $html .= "</$list>"; $list = ''; }
  };
  foreach (preg_split('/\r?\n/', $src) as $line) {
    $l = rtrim($line);
    if ($l === '') { $flush(); continue; }
    if (preg_match('/^(#{2,3})\s+(.+)$/u', $l, $m)) { $flush(); $h = strlen($m[1]); $html .= "<h$h>" . md_inline($m[2]) . "</h$h>"; continue; }
    if (preg_match('/^>\s?(.*)$/u', $l, $m)) { $flush(); $html .= '<blockquote>' . md_inline($m[1]) . '</blockquote>'; continue; }
    if (preg_match('/^(?:[-*]|(\d+)[.)])\s+(.+)$/u', $l, $m)) {
      $tag = $m[1] !== '' ? 'ol' : 'ul';
      if ($para) { $html .= '<p>' . implode('<br>', array_map('md_inline', $para)) . '</p>'; $para = []; }
      if ($list !== $tag) { if ($list) $html .= "</$list>"; $html .= "<$tag>"; $list = $tag; }
      $html .= '<li>' . md_inline($m[2]) . '</li>'; continue;
    }
    if ($list) { $html .= "</$list>"; $list = ''; }
    $para[] = $l;
  }
  $flush();
  return $html;
}
function slugify(string $s): string {
  $map = ['à'=>'a','á'=>'a','ả'=>'a','ã'=>'a','ạ'=>'a','ă'=>'a','ằ'=>'a','ắ'=>'a','ẳ'=>'a','ẵ'=>'a','ặ'=>'a','â'=>'a','ầ'=>'a','ấ'=>'a','ẩ'=>'a','ẫ'=>'a','ậ'=>'a','đ'=>'d',
    'è'=>'e','é'=>'e','ẻ'=>'e','ẽ'=>'e','ẹ'=>'e','ê'=>'e','ề'=>'e','ế'=>'e','ể'=>'e','ễ'=>'e','ệ'=>'e','ì'=>'i','í'=>'i','ỉ'=>'i','ĩ'=>'i','ị'=>'i',
    'ò'=>'o','ó'=>'o','ỏ'=>'o','õ'=>'o','ọ'=>'o','ô'=>'o','ồ'=>'o','ố'=>'o','ổ'=>'o','ỗ'=>'o','ộ'=>'o','ơ'=>'o','ờ'=>'o','ớ'=>'o','ở'=>'o','ỡ'=>'o','ợ'=>'o',
    'ù'=>'u','ú'=>'u','ủ'=>'u','ũ'=>'u','ụ'=>'u','ư'=>'u','ừ'=>'u','ứ'=>'u','ử'=>'u','ữ'=>'u','ự'=>'u','ỳ'=>'y','ý'=>'y','ỷ'=>'y','ỹ'=>'y','ỵ'=>'y'];
  $s = strtr(mb_strtolower(Normalizer::normalize($s, Normalizer::FORM_C) ?: $s), $map);
  $s = trim(preg_replace('/[^a-z0-9]+/', '-', $s) ?? '', '-');
  return substr($s, 0, 80) ?: 'bai-viet';
}
