// Build homnaylamgi.com
//   dist/                         bản web thật (Hostinger + Vercel): font tự host, CSP, SEO, PWA, nén
//   artifact/hom-nay-lam-gi.html  bản xem trên Claude (font Google, không service worker)
//   vercel.json                   cấu hình Vercel ở gốc repo
// Chạy: cd tools && npm ci && npm run build
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as esbuild from 'esbuild';
import { minify as minifyHtml } from 'html-minifier-terser';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src'), DIST = path.join(ROOT, 'dist'), ART = path.join(ROOT, 'artifact');
const SITE = 'https://homnaylamgi.com';
const TODAY = new Date().toISOString().slice(0, 10);
const read = f => readFileSync(path.join(SRC, f), 'utf8');
const sha256 = s => createHash('sha256').update(s, 'utf8').digest('base64');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- 1. nguồn ---------- */
const css0 = read('style.css'), body0 = read('body.html'), data0 = read('data.js'), app0 = read('app.js');
const ACT = new Function(`${data0}\nreturn ACTIVITIES;`)();
const COUNT = ACT.length;
if (!app0.includes('const DEPLOY = false;')) throw new Error('Không thấy cờ DEPLOY trong app.js');

/* ---------- 2. quẻ mẫu dựng sẵn vào HTML (hiện khi tắt JavaScript; JS thay ngay khi chạy) ---------- */
const SEAL = { vd: ['VẬN', 'ĐỘNG', 'Vận động'], kp: ['KHÁM', 'PHÁ', 'Khám phá'], st: ['SÁNG', 'TẠO', 'Sáng tạo'], hh: ['HỌC', 'HỎI', 'Học hỏi'], kn: ['KẾT', 'NỐI', 'Kết nối'], cm: ['CHĂM', 'MÌNH', 'Chăm mình'], au: ['ĂN', 'UỐNG', 'Ăn uống'], sn: ['SỰ', 'NGHIỆP', 'Sự nghiệp'], tt: ['TỬ', 'TẾ', 'Tử tế'], gt: ['GIẢI', 'TRÍ', 'Giải trí'] };
const LVL = d => (d <= 3 ? 'Nhẹ nhàng' : d <= 6 ? 'Vừa sức' : d <= 8 ? 'Thử thách' : 'Liều mới ăn nhiều');
const WHO = { a: 'một mình', b: 'bạn bè', y: 'người yêu', g: 'gia đình' };
const fmtWho = s => { if (s.length >= 4) return 'Ai cũng được'; const t = s.split('').map(c => WHO[c]).join(', '); return t[0].toUpperCase() + t.slice(1); };
const fmtTime = p => (p < 60 ? `${p} phút` : p % 60 === 0 ? `${p / 60} tiếng` : p % 60 === 30 ? `${(p - 30) / 60} tiếng rưỡi` : `${Math.floor(p / 60)} tiếng ${p % 60} phút`);
const Q = ACT.find(a => a.id === 1);
const fill = {
  qNo: '001', qLv: LVL(Q.d), qSealLabel: `Nhóm ${SEAL[Q.c][2]}`, qSeal: `<span>${SEAL[Q.c][0]}</span><span>${SEAL[Q.c][1]}</span>`,
  qTitle: esc(Q.t), qPoem: esc(Q.n), qStep: esc(Q.s),
  qStars: Array.from({ length: 10 }, (_, i) => `<svg class="star${i < Q.d ? ' on' : ''}" viewBox="0 0 24 24"><use href="#i-star"/></svg>`).join(''),
  qStarsTxt: `Độ khó ${Q.d}/10 · nhận ${Q.d} sao`, qTime: fmtTime(Q.p), qCost: ['0 đồng', 'Dưới 100k', '100k–300k', 'Trên 300k'][Q.k],
  qWhere: { i: 'Trong nhà', o: 'Ra ngoài', b: 'Đâu cũng được' }[Q.o], qWho: fmtWho(Q.ai), count: String(COUNT)
};
const body = body0.replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!(k in fill)) throw new Error('Thiếu giá trị cho ' + m); return fill[k]; });

/* ---------- 3. font tự host: đã cắt sẵn chỉ còn chữ Latin + tiếng Việt (tools/subset-fonts.sh) ---------- */
const RANGE = 'U+0020-007E,U+00A0-00FF,U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0309,U+0323,U+1EA0-1EF9,U+2013-2014,U+2018-201D,U+2022,U+2026,U+20AB,U+2192,U+2212';
const FONTS = [
  ['Be Vietnam Pro', 400, 'normal', 'be-vietnam-pro-400.woff2'],
  ['Be Vietnam Pro', 600, 'normal', 'be-vietnam-pro-600.woff2'],
  ['Bricolage Grotesque', 700, 'normal', 'bricolage-grotesque-700.woff2'],
  ['Bricolage Grotesque', 800, 'normal', 'bricolage-grotesque-800.woff2'],
  ['Fraunces', 400, 'italic', 'fraunces-400-italic.woff2']
];
const face = ([fam, w, st, file]) => `@font-face{font-family:"${fam}";font-style:${st};font-weight:${w};font-display:swap;src:url(/assets/fonts/${file}) format("woff2");unicode-range:${RANGE}}`;
const fontFace = FONTS.map(face).join('\n');
const fontFiles = FONTS.map(f => f[3]);
const PRELOAD = ['bricolage-grotesque-800.woff2', 'be-vietnam-pro-400.woff2'];

/* ---------- 4. thu gọn CSS + JS ---------- */
const TARGET = ['es2019'];
const minCss = async css => (await esbuild.transform(css, { loader: 'css', minify: true, target: TARGET, charset: 'utf8' })).code.trim();
const minJs = async js => (await esbuild.transform(js, { loader: 'js', minify: true, target: TARGET, legalComments: 'none', charset: 'utf8' })).code.trim();
const cssSite = await minCss(fontFace + css0);
const cssArt = await minCss(css0);
const jsSite = await minJs(data0 + '\n' + app0.replace('const DEPLOY = false;', 'const DEPLOY = true;'));
const jsArt = await minJs(data0 + '\n' + app0);
const htmlOpts = { collapseWhitespace: true, conservativeCollapse: true, removeComments: true, minifyCSS: false, minifyJS: false, keepClosingSlash: true, decodeEntities: false };

/* ---------- 5. dist/index.html ---------- */
const DESC = `Không biết hôm nay làm gì? Rút một quẻ để nhận ngay một việc hợp tâm trạng, thời gian và túi tiền. ${COUNT} quẻ cho người trẻ 16–40 tuổi, có sao, huy hiệu và thử thách chung mỗi ngày.`;
const ldjson = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Hôm nay làm gì?', url: SITE + '/', inLanguage: 'vi', description: DESC });
const page = `<!doctype html>
<html lang="vi" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="__CSP__">
<title>Hôm nay làm gì? | Rút một quẻ, làm một việc nhỏ</title>
<meta name="description" content="${DESC}">
<link rel="canonical" href="${SITE}/">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#D02842" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#141018" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Hôm nay làm gì?">
<meta property="og:locale" content="vi_VN">
<meta property="og:url" content="${SITE}/">
<meta property="og:title" content="Hôm nay làm gì?">
<meta property="og:description" content="Khỏi nghĩ nữa. Rút một quẻ, làm một việc nhỏ, để hôm nay khác hôm qua một chút.">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Hôm nay làm gì? Lá quẻ gợi ý việc nên làm hôm nay">
<meta name="twitter:card" content="summary_large_image">
${PRELOAD.map(f => `<link rel="preload" href="/assets/fonts/${f}" as="font" type="font/woff2" crossorigin>`).join('\n')}
<style>${cssSite}</style>
<script type="application/ld+json">${ldjson}</script>
</head>
<body>
${body}
<script>${jsSite}</script>
</body>
</html>`;
let index = await minifyHtml(page, htmlOpts);
const inlineHashes = re => [...index.matchAll(re)].map(m => `'sha256-${sha256(m[1])}'`);
const scriptHashes = inlineHashes(/<script(?: type="application\/ld\+json")?>([\s\S]*?)<\/script>/g);
const styleHashes = inlineHashes(/<style>([\s\S]*?)<\/style>/g);
const CSP = [
  "default-src 'self'", `script-src 'self' ${scriptHashes.join(' ')}`, `style-src 'self' ${styleHashes.join(' ')}`,
  "img-src 'self' data: blob:", "font-src 'self'", "connect-src 'self'", "manifest-src 'self'", "worker-src 'self'",
  "object-src 'none'", "base-uri 'none'", "form-action 'none'", 'upgrade-insecure-requests'
].join('; ');
index = index.replace('__CSP__', CSP);
const VERSION = createHash('sha256').update(index).digest('hex').slice(0, 10);

/* ---------- 6. trang 404 ---------- */
const css404 = await minCss(FONTS.filter(f => PRELOAD.includes(f[3])).map(face).join('') + `
:root{--bg:#F5F2F6;--ink:#241826;--muted:#6A5B6E;--do:#D02842;--slip:#FFF3EC;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#141018;--ink:#F4ECF2;--muted:#B7A8BB;--do:#FF5C72;--slip:#241820;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font:400 1rem/1.6 "Be Vietnam Pro",system-ui,sans-serif;padding:24px max(16px,env(safe-area-inset-right,0px)) 24px max(16px,env(safe-area-inset-left,0px))}
main{max-width:520px;width:100%;background:var(--slip);border:2px solid var(--do);border-radius:4px;padding:32px 28px}
.no{margin:0;font-weight:400;letter-spacing:.12em;text-transform:uppercase;color:var(--do);font-size:.8rem}
h1{margin:10px 0 8px;font:800 clamp(1.7rem,6vw,2.3rem)/1.15 "Bricolage Grotesque",system-ui,sans-serif;text-wrap:balance}
p{margin:0;color:var(--muted)}a{display:inline-block;margin-top:20px;padding:12px 20px;border-radius:999px;background:var(--do);color:var(--slip);font-weight:400;text-decoration:none}
a:focus-visible{outline:3px solid var(--ink);outline-offset:3px}`);
let p404 = await minifyHtml(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'sha256-__H__'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>Không tìm thấy trang | Hôm nay làm gì?</title><meta name="robots" content="noindex"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>${css404}</style></head><body><main><p class="no">Quẻ số 404</p><h1>Trang này không có trong ống quẻ.</h1><p>Có thể đường dẫn đã cũ hoặc gõ nhầm. Về trang chính để rút một quẻ cho hôm nay nhé.</p><a href="/">Về trang chính</a></main></body></html>`, htmlOpts);
p404 = p404.replace('__H__', sha256(p404.match(/<style>([\s\S]*?)<\/style>/)[1]));

/* ---------- 7. ghi dist/ ---------- */
rmSync(DIST, { recursive: true, force: true });
mkdirSync(path.join(DIST, 'assets', 'fonts'), { recursive: true });
const out = (f, s) => writeFileSync(path.join(DIST, f), s);
out('index.html', index);
out('404.html', p404);
for (const f of fontFiles.concat('OFL.txt')) copyFileSync(path.join(SRC, 'fonts', f), path.join(DIST, 'assets', 'fonts', f));
for (const f of readdirSync(path.join(SRC, 'static'))) copyFileSync(path.join(SRC, 'static', f), path.join(DIST, f));
out('site.webmanifest', JSON.stringify({
  name: 'Hôm nay làm gì?', short_name: 'Hôm nay làm gì', description: 'Rút một quẻ, làm một việc nhỏ, để hôm nay khác hôm qua một chút.',
  lang: 'vi', dir: 'ltr', start_url: '/', scope: '/', display: 'standalone', background_color: '#F5F2F6', theme_color: '#D02842',
  icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }]
}, null, 2));
out('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}/</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`);
out('sw.js', await minJs(readFileSync(path.join(SRC, 'sw.js'), 'utf8').replace('__VERSION__', VERSION)));

const SECURITY = [
  ['X-Content-Type-Options', 'nosniff'], ['X-Frame-Options', 'DENY'], ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()']
];
out('.htaccess', `# homnaylamgi.com — cấu hình cho Hostinger (LiteSpeed/Apache). File này do tools/build.mjs tạo.
Options -Indexes
DirectoryIndex index.html
ErrorDocument 404 /404.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  # Luôn dùng HTTPS
  RewriteCond %{HTTPS} off
  RewriteCond %{HTTP:X-Forwarded-Proto} !https
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  # Bỏ www
  RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]
  RewriteRule ^ https://%1%{REQUEST_URI} [L,R=301]
  # Chặn thư mục .git do Hostinger Git tạo ra
  RewriteRule (^|/)\\.git(/|$) - [F,L]
</IfModule>

<IfModule mod_mime.c>
  AddType application/manifest+json .webmanifest
  AddType font/woff2 .woff2
  AddType image/svg+xml .svg
  AddCharset utf-8 .html .css .js .txt .xml .webmanifest
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json application/manifest+json application/xml image/svg+xml
</IfModule>

<IfModule mod_headers.c>
${SECURITY.map(([k, v]) => `  Header always set ${k} "${v}"`).join('\n')}
  Header always set Strict-Transport-Security "max-age=15552000"
  <FilesMatch "\\.(html|webmanifest|xml|txt)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  <FilesMatch "^sw\\.js$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  <FilesMatch "\\.woff2$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.(png|svg|ico)$">
    Header set Cache-Control "public, max-age=604800"
  </FilesMatch>
</IfModule>
`);

/* ---------- 8. vercel.json ở gốc repo ---------- */
writeFileSync(path.join(ROOT, 'vercel.json'), JSON.stringify({
  $schema: 'https://openapi.vercel.sh/vercel.json',
  outputDirectory: 'dist',
  cleanUrls: true,
  trailingSlash: false,
  headers: [
    { source: '/(.*)', headers: SECURITY.map(([key, value]) => ({ key, value })) },
    { source: '/assets/fonts/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    { source: '/(favicon.ico|favicon.svg|apple-touch-icon.png|icon-192.png|icon-512.png|icon-maskable-512.png|og-image.png)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] }
  ]
}, null, 2) + '\n');

/* ---------- 9. bản artifact cho Claude ---------- */
mkdirSync(ART, { recursive: true });
const artifact = await minifyHtml(`<title>Hôm nay làm gì?</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="${DESC}">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(readFileSync(path.join(SRC, 'static', 'favicon.svg'), 'utf8').trim())}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600&family=Bricolage+Grotesque:opsz,wght@12..96,700..800&family=Fraunces:ital,opsz,wght@1,9..144,400&display=swap">
<style>${cssArt}</style>
${body}
<script>${jsArt}</script>`, htmlOpts);
writeFileSync(path.join(ART, 'hom-nay-lam-gi.html'), artifact);

/* ---------- 10. báo cáo ---------- */
const { gzipSync, brotliCompressSync } = await import('node:zlib');
const kb = n => (n / 1024).toFixed(1) + ' KB';
const fontBytes = fontFiles.reduce((s, f) => s + readFileSync(path.join(DIST, 'assets', 'fonts', f)).length, 0);
console.log(`Đã build ${COUNT} quẻ · phiên bản ${VERSION}`);
console.log(`index.html: ${kb(index.length)} → gzip ${kb(gzipSync(index).length)} · brotli ${kb(brotliCompressSync(index).length)}`);
console.log(`font: ${fontFiles.length} file, tổng ${kb(fontBytes)}`);
console.log(`artifact: ${kb(artifact.length)}`);
