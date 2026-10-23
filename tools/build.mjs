// Build homnaylamgi.com
//   dist/                         bản web thật (Hostinger + Vercel): font tự host, CSP, SEO, PWA, nén
//   artifact/hom-nay-lam-gi.html  bản xem trên Claude (font Google, không service worker)
//   vercel.json                   cấu hình Vercel ở gốc repo
// Chạy: cd tools && npm ci && npm run build
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, readdirSync, cpSync } from 'node:fs';
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
const [ACT, FOODS, CHALLENGES] = new Function(`${data0}\nreturn [ACTIVITIES, FOODS, CHALLENGES];`)();
const COUNT = ACT.length;

/* ---------- 1b. chốt chặn nội dung: tuyệt đối không xúi giục tự tử, tự làm hại bản thân,
   không chất kích thích, cờ bạc, hành vi mạo hiểm. Có từ nào dưới đây là build dừng lại. ---------- */
const BANNED = [
  /tự\s*tử/iu, /tự\s*sát/iu, /tự\s*(làm\s*)?hại/iu, /tự\s*hủy/iu, /quyên\s*sinh/iu, /kết\s*liễu/iu, /muốn\s*chết/iu,
  /(rạch|cắt|cứa)\s*(tay|cổ\s*tay|da)/iu, /nhảy\s*(cầu|lầu|sông|xuống)/iu, /treo\s*cổ/iu, /thuốc\s*(ngủ|chuột|độc|trừ\s*sâu)/iu,
  /quá\s*liều/iu, /nhịn\s*(ăn|đói|uống)/iu, /thức\s*trắng/iu, /(nín|nhịn)\s*thở\s*(lâu|tối\s*đa|đến)/iu, /(tắm|ngâm)\s*(nước\s*)?đá/iu,
  /chỗ\s*cao\s*nhất/iu, /mép\s*(vực|tầng|mái|cầu)/iu, /(?<!\p{L})(bia|rượu)(?!\p{L})/iu, /thuốc\s*lá|thuốc\s*lào|vape|shisha|bóng\s*cười/iu,
  /cá\s*cược|cờ\s*bạc|lô\s*đề|cá\s*độ/iu, /đua\s*xe|bốc\s*đầu|lạng\s*lách|vượt\s*đèn\s*đỏ/iu
];
const scan = (list, fields, label) => list.flatMap(it => fields.flatMap(f => BANNED.filter(re => it[f] && re.test(it[f])).map(re => `${label} ${it.id || it.k} (${f}): “${it[f].match(re)[0]}”`)));
const BAD = [...scan(ACT, ['t', 'n', 's'], 'Quẻ'), ...scan(FOODS, ['t', 'n'], 'Món'), ...scan(CHALLENGES, ['t', 's'], 'Thử thách')];
if (BAD.length) throw new Error('Nội dung bị chặn vì an toàn người dùng:\n' + BAD.join('\n'));
/* quy tắc theo nhãn: việc cho người đang buồn, cô đơn phải nhẹ (độ khó ≤ 6); việc lúc khuya (22–5h) không bắt ra ngoài */
const RULE = [
  ...ACT.filter(a => /[bl]/.test(a.m) && a.d > 6).map(a => `Quẻ ${a.id}: gắn tâm trạng buồn/cô đơn nhưng độ khó ${a.d} > 6`),
  ...ACT.filter(a => a.g.includes('k') && a.o === 'o').map(a => `Quẻ ${a.id}: gợi ý ra ngoài lúc khuya`),
  /* thử thách chung: ai cũng nhận, mọi giờ, mọi tâm trạng → phải nhẹ, rẻ, có cả khung sáng và tối */
  ...ACT.filter(a => a.ch && (a.d > 5 || a.k > 1 || !a.g.includes('s') || !a.g.includes('t'))).map(a => `Quẻ ${a.id}: thử thách chung phải độ khó ≤ 5, chi phí dưới 100k, có khung sáng và tối`),
  /* việc chỉ làm cùng người yêu thì không gợi ý cho người đang buồn, cô đơn */
  ...ACT.filter(a => !/[abg]/.test(a.ai) && /[bl]/.test(a.m)).map(a => `Quẻ ${a.id}: chỉ dành cho người yêu nhưng gắn tâm trạng buồn/cô đơn`)
];
if (RULE.length) throw new Error('Nội dung bị chặn vì an toàn người dùng:\n' + RULE.join('\n'));
const dup = (list, key) => list.map(x => x[key]).filter((v, i, a) => a.indexOf(v) !== i);
if (dup(ACT, 'id').length || dup(FOODS, 'id').length || dup(CHALLENGES, 'k').length) throw new Error('Trùng số quẻ, số món hoặc mã thử thách');
if (dup(ACT.map(a => ({ t: a.t.toLowerCase() })), 't').length) throw new Error('Trùng tên quẻ: ' + dup(ACT.map(a => ({ t: a.t.toLowerCase() })), 't').join(', '));
if (!app0.includes('const DEPLOY = false;')) throw new Error('Không thấy cờ DEPLOY trong app.js');

/* ---------- 2. quẻ mẫu dựng sẵn vào HTML (hiện khi tắt JavaScript; JS thay ngay khi chạy) ---------- */
const SEAL = { vd: ['VẬN', 'ĐỘNG', 'Vận động'], kp: ['KHÁM', 'PHÁ', 'Khám phá'], st: ['SÁNG', 'TẠO', 'Sáng tạo'], hh: ['HỌC', 'HỎI', 'Học hỏi'], kn: ['KẾT', 'NỐI', 'Kết nối'], cm: ['CHĂM', 'MÌNH', 'Chăm mình'], au: ['ĂN', 'UỐNG', 'Ăn uống'], sn: ['SỰ', 'NGHIỆP', 'Sự nghiệp'], tt: ['TỬ', 'TẾ', 'Tử tế'], gt: ['GIẢI', 'TRÍ', 'Giải trí'] };
const LVL = d => (d <= 3 ? 'Nhẹ nhàng' : d <= 6 ? 'Vừa sức' : d <= 8 ? 'Thử thách' : 'Thử thách lớn');
const WHO = { a: 'một mình', b: 'bạn bè', y: 'người yêu', g: 'gia đình' };
const fmtWho = s => { if (s.length >= 4) return 'Ai cũng được'; const t = s.split('').map(c => WHO[c]).join(', '); return t[0].toUpperCase() + t.slice(1); };
const fmtTime = p => (p < 60 ? `${p} phút` : p % 60 === 0 ? `${p / 60} tiếng` : p % 60 === 30 ? `${(p - 30) / 60} tiếng rưỡi` : `${Math.floor(p / 60)} tiếng ${p % 60} phút`);
const Q = ACT.find(a => a.id === 1);
const fill = {
  qNo: '001', qLv: LVL(Q.d), qSealLabel: `Nhóm ${SEAL[Q.c][2]}`, qSeal: `<span>${SEAL[Q.c][0]}</span><span>${SEAL[Q.c][1]}</span>`,
  qTitle: esc(Q.t), qPoem: esc(Q.n), qStep: esc(Q.s),
  qStars: Array.from({ length: 10 }, (_, i) => `<svg class="star${i < Q.d ? ' on' : ''}" viewBox="0 0 24 24"><use href="#i-star"/></svg>`).join(''),
  qStarsTxt: `Độ khó ${Q.d}/10 · nhận ${Q.d} sao`, qTime: fmtTime(Q.p), qCost: ['0 đồng', 'Dưới 100k', '100k–300k', 'Trên 300k'][Q.k],
  qWhere: { i: 'Trong nhà', o: 'Ra ngoài', b: 'Đâu cũng được' }[Q.o], qWho: fmtWho(Q.ai), count: String(COUNT), foods: String(FOODS.length)
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
const DESC = `Không biết hôm nay làm gì, ăn gì? Rút một quẻ để nhận ngay một việc hợp tâm trạng, thời gian và túi tiền. ${COUNT} quẻ việc và ${FOODS.length} món ăn cho người trẻ 16–40 tuổi, có sao, huy hiệu và thử thách chung mỗi ngày.`;
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
/* script, style, khung của Google chỉ dùng khi quản trị viên bật đăng nhập Google */
const CSP = [
  "default-src 'self'", `script-src 'self' ${scriptHashes.join(' ')} https://accounts.google.com/gsi/client`, `style-src 'self' ${styleHashes.join(' ')} https://accounts.google.com/gsi/style`,
  "img-src 'self' data: blob: https://*.googleusercontent.com", "font-src 'self'", "connect-src 'self' https://api.met.no https://air-quality-api.open-meteo.com https://accounts.google.com/gsi/", "manifest-src 'self'", "worker-src 'self'",
  "frame-src https://accounts.google.com/gsi/",
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

/* ---------- 6b. trang link rủ cho từng quẻ: /q/12 và /an/5 ----------
   Mạng xã hội đọc og:title, og:description, og:image của trang này để hiện thẻ xem trước;
   người bấm vào được chuyển ngay về trang chính, mở đúng quẻ đó. */
const OG_DIR = path.join(SRC, 'og');
const hasOg = f => { try { readFileSync(path.join(OG_DIR, f)); return true; } catch (e) { return false; } };
const cssLand = await minCss(css404 + '.po{margin-top:10px;font-style:italic}.meta{margin-top:12px;font-size:.9rem}');
const GO = "location.replace('/?'+document.documentElement.dataset.go)";
const LAND_CSP = `default-src 'none'; script-src 'sha256-${sha256(GO)}'; style-src 'sha256-${sha256(cssLand)}'; font-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'`;
const MEAL_NAME = { s: 'sáng', c: 'trưa', t: 'tối', k: 'khuya', v: 'ăn vặt' };
const FOOD_KIND = { n: 'Ăn ngoài', h: 'Tự nấu', nh: 'Ăn ngoài hoặc tự nấu' };
const landing = ({ kind, id, label, title, poem, meta, ogTitle, desc, og, cta }) => `<!doctype html>
<html lang="vi" data-go="${kind === 'q' ? 'q' : 'm'}=${id}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${LAND_CSP}">
<title>${esc(ogTitle)}</title>
<meta name="description" content="${esc(desc)}"><meta name="robots" content="noindex">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website"><meta property="og:site_name" content="Hôm nay làm gì?"><meta property="og:locale" content="vi_VN">
<meta property="og:url" content="${SITE}/${kind}/${id}"><meta property="og:title" content="${esc(ogTitle)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${og}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(ogTitle)}">
<meta name="twitter:card" content="summary_large_image">
<style>${cssLand}</style><script>${GO}</script></head>
<body><main><p class="no">${label}</p><h1>${esc(title)}</h1><p class="po">${esc(poem)}</p><p class="meta">${esc(meta)}</p><a href="/?${kind === 'q' ? 'q' : 'm'}=${id}">${cta}</a></main></body></html>`;
const LANDS = [];
for (const a of ACT) {
  const no = String(a.id).padStart(3, '0');
  LANDS.push([`q/${a.id}.html`, landing({
    kind: 'q', id: a.id, label: `Quẻ số ${no} · ${LVL(a.d)}`, title: a.t, poem: a.n, meta: `Độ khó ${a.d}/10 · ${fmtTime(a.p)} · ${['0 đồng', 'Dưới 100k', '100k–300k', 'Trên 300k'][a.k]}`,
    ogTitle: `Hôm nay làm gì? ${a.t}`, desc: `${a.n} Quẻ số ${no}, độ khó ${a.d}/10. Rút quẻ của bạn tại homnaylamgi.com.`,
    og: hasOg(`q-${a.id}.png`) ? `${SITE}/og/q-${a.id}.png` : `${SITE}/og-image.png`, cta: 'Mở quẻ này'
  })]);
}
for (const f of FOODS) {
  const no = String(f.id).padStart(3, '0');
  LANDS.push([`an/${f.id}.html`, landing({
    kind: 'an', id: f.id, label: `Quẻ ăn số ${no}`, title: f.t, poem: f.n, meta: `${FOOD_KIND[f.o]} · bữa ${f.b.split('').map(c => MEAL_NAME[c]).join(', ')}`,
    ogTitle: `Hôm nay ăn gì? ${f.t}`, desc: `${f.n} Rút quẻ ăn của bạn tại homnaylamgi.com.`,
    og: hasOg(`an-${f.id}.png`) ? `${SITE}/og/an-${f.id}.png` : `${SITE}/og-image.png`, cta: 'Xem món này'
  })]);
}
for (const L of LANDS) {
  L[1] = await minifyHtml(L[1], htmlOpts);
  const sh = L[1].match(/<script>([\s\S]*?)<\/script>/)[1], st = L[1].match(/<style>([\s\S]*?)<\/style>/)[1];
  if (sh !== GO || st !== cssLand) throw new Error('Mã trong trang link rủ bị đổi khi thu gọn: ' + L[0]);
}

/* ---------- 6c. Chính sách quyền riêng tư: /rieng-tu ---------- */
const COMPANY = { name: 'CÔNG TY TNHH MINH MINH HƯNG YÊN', tax: '0901197922', addr: 'Đường Huyện Đội, Thôn Trai Trang, Xã Yên Mỹ, Tỉnh Hưng Yên', phone: '0368 386 357', email: 'minhminhhungyenco.ltd@gmail.com' };
const SUPPORT = { email: 'hotro@homnaylamgi.com', phone: '0919 391 060' };
const PRIV_DATE = '23/10/2026';
const cssDoc = await minCss(FONTS.filter(f => PRELOAD.includes(f[3])).map(face).join('') + `
:root{--bg:#F5F2F6;--ink:#241826;--muted:#6A5B6E;--do:#D02842;--line:#E4DCE6;--card:#FFFFFF;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#141018;--ink:#F4ECF2;--muted:#B7A8BB;--do:#FF5C72;--line:#352B3A;--card:#1D1722;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:400 1rem/1.65 "Be Vietnam Pro",system-ui,sans-serif;padding:28px max(16px,env(safe-area-inset-right,0px)) 48px max(16px,env(safe-area-inset-left,0px))}
main{max-width:720px;margin:0 auto;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:28px clamp(18px,4vw,40px)}
.back{display:inline-block;margin-bottom:16px;color:var(--do);font-weight:400;text-decoration:none}.back:hover{text-decoration:underline}
h1{margin:0 0 4px;font:800 clamp(1.6rem,5vw,2.1rem)/1.2 "Bricolage Grotesque",system-ui,sans-serif;text-wrap:balance}
h2{margin:28px 0 8px;font:800 1.15rem/1.3 "Bricolage Grotesque",system-ui,sans-serif}
p,ul{margin:0 0 10px}ul{padding-left:1.2em}li{margin-bottom:4px}.date{color:var(--muted);font-size:.9rem}
.sum{margin-top:16px;padding:14px 18px;border-left:3px solid var(--do);background:var(--bg);border-radius:6px}
a{color:var(--do)}a:focus-visible{outline:3px solid var(--ink);outline-offset:2px}`);
let privacy = await minifyHtml(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'sha256-__H__'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>Chính sách quyền riêng tư | Hôm nay làm gì?</title>
<meta name="description" content="Hôm nay làm gì? dùng được không cần tài khoản, không quảng cáo, không theo dõi. Tài khoản là tùy chọn; sao, lịch sử, nhật ký nằm trên thiết bị của bạn.">
<link rel="canonical" href="${SITE}/rieng-tu"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>${cssDoc}</style></head><body><main>
<a class="back" href="/">← Về trang chính</a>
<h1>Chính sách quyền riêng tư</h1>
<p class="date">Cập nhật ngày ${PRIV_DATE}</p>
<p>“Hôm nay làm gì?” gồm website homnaylamgi.com và ứng dụng cùng tên trên điện thoại, máy tính. Dịch vụ do ${COMPANY.name} vận hành. Trang này nói rõ dịch vụ xử lý dữ liệu nào và vì sao.</p>
<div class="sum"><ul>
<li>Dùng được ngay không cần tài khoản. Tài khoản là tùy chọn: nếu đăng ký, công ty lưu tên gọi, email và mật khẩu đã băm một chiều.</li>
<li>Sao, huy hiệu, lịch sử và lựa chọn của bạn chỉ lưu trên thiết bị của bạn.</li>
<li>Nhật ký riêng tư được mã hóa trên thiết bị bằng mật khẩu của bạn; không ai khác đọc được, kể cả công ty.</li>
<li>Vị trí chỉ dùng khi bạn tự bật gợi ý theo thời tiết, và được làm tròn khoảng 1 km.</li>
<li>Không quảng cáo, không công cụ theo dõi, không bán dữ liệu.</li>
</ul></div>
<h2>1. Dữ liệu lưu trên thiết bị của bạn</h2>
<p>Các thông tin sau được lưu trong bộ nhớ trình duyệt trên thiết bị của bạn (localStorage): quẻ đang làm, số sao, huy hiệu, lịch sử quẻ đã làm và cảm nhận, danh sách để dành, tâm trạng, bữa ăn, các lựa chọn ở phần Tinh chỉnh. Nếu bạn bật thời tiết, có thêm vị trí đã làm tròn hoặc tỉnh, thành bạn chọn và bản dự báo gần nhất.</p>
<p>Các dữ liệu này không được gửi về máy chủ của công ty. Bạn xóa được bất cứ lúc nào bằng nút “Xóa dữ liệu” ở phần Hành trình, bằng cách xóa dữ liệu trang web trong trình duyệt, hoặc gỡ ứng dụng.</p>
<h2>2. Nhật ký riêng tư</h2>
<p>Nhật ký được mã hóa ngay trên thiết bị của bạn (AES-GCM 256 bit, khóa sinh từ mật khẩu bằng PBKDF2-SHA256 với 600.000 vòng lặp) trước khi lưu vào bộ nhớ trình duyệt. Mật khẩu nhật ký không được lưu và không được gửi đi đâu. Vì vậy công ty và bất kỳ ai không có mật khẩu đều không đọc được nhật ký của bạn. Điều này cũng có nghĩa là nếu quên mật khẩu, không ai khôi phục được nội dung nhật ký.</p>
<p>Khi bạn tải bản sao lưu, file sao lưu chứa nhật ký ở dạng đã mã hóa cùng sao, huy hiệu và lịch sử. File nằm trên thiết bị của bạn; hãy cất ở nơi an toàn.</p>
<h2>3. Vị trí và thời tiết (tùy chọn)</h2>
<p>Dịch vụ chỉ hỏi quyền vị trí khi bạn bấm “Gợi ý theo thời tiết chỗ bạn”. Tọa độ được làm tròn đến 2 chữ số thập phân (khoảng 1 km), rồi gửi thẳng từ thiết bị của bạn tới:</p>
<ul><li><a href="https://www.met.no/en" rel="noopener">MET Norway</a> (Viện Khí tượng Na Uy, api.met.no) để lấy dự báo thời tiết;</li>
<li><a href="https://open-meteo.com/" rel="noopener">Open-Meteo</a> (air-quality-api.open-meteo.com) để lấy chất lượng không khí và chỉ số UV.</li></ul>
<p>Như mọi dịch vụ trên mạng, các nhà cung cấp này cũng nhận địa chỉ IP của bạn khi trả dữ liệu và xử lý theo chính sách của họ. Bạn có thể không cho phép vị trí mà chọn tỉnh, thành thay thế, hoặc bấm “Tắt thời tiết” để xóa vị trí đã lưu.</p>
<h2>4. Chia sẻ, hỗ trợ</h2>
<p>Khi bạn bấm chia sẻ, lời rủ và đường link được chuyển tới ứng dụng bạn chọn (Zalo, Messenger, Facebook, Instagram…) hoặc bảng chia sẻ của thiết bị. Dịch vụ không đọc danh bạ và không đăng bài thay bạn. Việc xử lý sau đó theo chính sách của ứng dụng bạn chọn.</p>
<p>Khi bạn gửi yêu cầu hỗ trợ hoặc góp ý, ứng dụng email trên máy bạn gửi thư tới hotro@homnaylamgi.com. Công ty chỉ dùng nội dung thư và địa chỉ email bạn để lại để trả lời bạn.</p>
<h2>4b. Tài khoản (tùy chọn)</h2>
<p>Bạn có thể dùng toàn bộ trang mà không cần tài khoản. Nếu bạn tạo tài khoản, công ty xử lý các dữ liệu sau để đăng nhập, gửi thư xác nhận và đặt lại mật khẩu, gửi tin và bài viết mới:</p>
<ul><li>Tên gọi và email bạn nhập; mật khẩu chỉ được lưu dưới dạng băm một chiều (Argon2id), không ai đọc được mật khẩu gốc.</li>
<li>Nếu đăng nhập bằng Google: mã định danh tài khoản Google, tên và email mà Google cung cấp sau khi bạn đồng ý. Công ty không nhận mật khẩu Google của bạn.</li>
<li>Thời điểm tạo tài khoản, lần đăng nhập gần nhất, xác nhận bạn từ đủ 16 tuổi; địa chỉ IP được dùng tạm thời để chống dò mật khẩu và ghi nhật ký thao tác quản trị.</li>
<li>Một cookie đăng nhập (hnlg_s), chỉ dùng để giữ phiên đăng nhập, không dùng để theo dõi hay quảng cáo.</li></ul>
<p>Dữ liệu tài khoản lưu trên máy chủ của Hostinger mà công ty thuê, không bán, không chia sẻ cho bên thứ ba để quảng cáo. Sao, lịch sử và nhật ký vẫn chỉ nằm trên thiết bị của bạn, không gửi lên tài khoản. Bạn xóa tài khoản bất cứ lúc nào trong Trang của bạn; dữ liệu tài khoản bị xóa khỏi cơ sở dữ liệu ngay khi bạn bấm.</p>
<h2>5. Máy chủ lưu trữ</h2>
<p>Website được phục vụ qua Hostinger và Vercel. Như mọi trang web, các nhà cung cấp này có thể ghi nhật ký kỹ thuật (địa chỉ IP, thời gian truy cập, loại trình duyệt) để vận hành và chống tấn công. Công ty không dùng nhật ký này để nhận diện cá nhân.</p>
<h2>6. Không quảng cáo, không theo dõi</h2>
<p>Website và ứng dụng không hiển thị quảng cáo, không dùng cookie quảng cáo hay công cụ phân tích hành vi, không bán hay cho thuê dữ liệu.</p>
<h2>7. Độ tuổi</h2>
<p>Dịch vụ dành cho người từ 16 tuổi trở lên. Khi tạo tài khoản, bạn xác nhận mình từ đủ 16 tuổi.</p>
<h2>8. Quyền của bạn</h2>
<p>Theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15, bạn có quyền được biết về việc xử lý dữ liệu của mình, đồng ý hoặc rút lại đồng ý, và yêu cầu xóa dữ liệu. Vì dữ liệu nằm trên thiết bị của bạn, bạn có thể tự xóa ngay như ở mục 1, hoặc dùng nút “Xóa toàn bộ dữ liệu” ở Trang của bạn. Nếu có tài khoản, bạn xem, sửa tên, đổi mật khẩu và xóa tài khoản ngay trong Trang của bạn. Mọi câu hỏi xin gửi về <a href="mailto:${SUPPORT.email}">${SUPPORT.email}</a>.</p>
<h2>9. Liên hệ</h2>
<p>Hỗ trợ người dùng: email <a href="mailto:${SUPPORT.email}">${SUPPORT.email}</a> hoặc gọi Admin: <a href="tel:${SUPPORT.phone.replace(/ /g, '')}">${SUPPORT.phone}</a>.</p>
<p>Đơn vị vận hành: ${COMPANY.name}<br>Mã số thuế: ${COMPANY.tax}<br>Địa chỉ: ${COMPANY.addr}<br>Điện thoại: <a href="tel:${COMPANY.phone.replace(/ /g, '')}">${COMPANY.phone}</a> · Email: <a href="mailto:${COMPANY.email}">${COMPANY.email}</a></p>
<h2>10. Thay đổi chính sách</h2>
<p>Khi chính sách thay đổi, trang này được cập nhật và ghi lại ngày cập nhật ở đầu trang.</p>
</main></body></html>`, htmlOpts);
privacy = privacy.replace('__H__', sha256(privacy.match(/<style>([\s\S]*?)<\/style>/)[1]));

/* ---------- 7. ghi dist/ ---------- */
rmSync(DIST, { recursive: true, force: true });
mkdirSync(path.join(DIST, 'assets', 'fonts'), { recursive: true });
const out = (f, s) => writeFileSync(path.join(DIST, f), s);
out('index.html', index);
out('404.html', p404);
for (const f of fontFiles.concat('OFL.txt')) copyFileSync(path.join(SRC, 'fonts', f), path.join(DIST, 'assets', 'fonts', f));
for (const f of readdirSync(path.join(SRC, 'static'), { withFileTypes: true })) if (f.isFile()) copyFileSync(path.join(SRC, 'static', f.name), path.join(DIST, f.name));
mkdirSync(path.join(DIST, 'q'), { recursive: true }); mkdirSync(path.join(DIST, 'an'), { recursive: true });
for (const [f, html] of LANDS) out(f, html);
let ogCount = 0;
try { mkdirSync(path.join(DIST, 'og'), { recursive: true }); for (const f of readdirSync(OG_DIR)) if (f.endsWith('.png')) { copyFileSync(path.join(OG_DIR, f), path.join(DIST, 'og', f)); ogCount++; } } catch (e) { /* chưa có ảnh xem trước riêng */ }
const SHOTS = (() => { try { return readdirSync(path.join(SRC, 'static', 'screenshots')).filter(f => f.endsWith('.png')).sort(); } catch (e) { return []; } })();
const SHOT_LABEL = { 'narrow-1': 'Mở ra là có ngay một quẻ hợp giờ, tâm trạng và thời tiết', 'narrow-2': 'Hôm nay ăn gì? Rút món hợp bữa và hợp trời', 'narrow-3': 'Rủ bạn qua Zalo, Messenger, Facebook, Instagram, Threads', 'narrow-4': 'Gom sao, lên danh hiệu, mở khóa huy hiệu', 'wide-1': 'Hôm nay làm gì? trên máy tính' };
out('site.webmanifest', JSON.stringify({
  id: '/', name: 'Hôm nay làm gì?', short_name: 'Hôm nay làm gì', description: 'Rút một quẻ, làm một việc nhỏ, để hôm nay khác hôm qua một chút.',
  lang: 'vi', dir: 'ltr', start_url: '/', scope: '/', display: 'standalone', background_color: '#F5F2F6', theme_color: '#D02842',
  categories: ['lifestyle', 'entertainment'],
  icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }, { src: '/icon-monochrome-512.png', sizes: '512x512', type: 'image/png', purpose: 'monochrome' }],
  shortcuts: [
    { name: 'Rút quẻ hôm nay', short_name: 'Rút quẻ', url: '/?mode=lam', icons: [{ src: '/shortcut-que.png', sizes: '192x192', type: 'image/png' }] },
    { name: 'Hôm nay ăn gì?', short_name: 'Ăn gì', url: '/?mode=an', icons: [{ src: '/shortcut-an.png', sizes: '192x192', type: 'image/png' }] }
  ],
  screenshots: SHOTS.map(f => { const k = f.replace('.png', ''), wide = k.startsWith('wide'); return { src: `/screenshots/${f}`, sizes: wide ? '1920x1080' : '1080x1920', type: 'image/png', form_factor: wide ? 'wide' : 'narrow', label: SHOT_LABEL[k] || 'Hôm nay làm gì?' }; })
}, null, 2));
if (SHOTS.length) { mkdirSync(path.join(DIST, 'screenshots'), { recursive: true }); for (const f of SHOTS) copyFileSync(path.join(SRC, 'static', 'screenshots', f), path.join(DIST, 'screenshots', f)); }

/* app Android (Trusted Web Activity): khai báo quyền mở web toàn màn hình */
const ANDROID = JSON.parse(readFileSync(path.join(ROOT, 'tools', 'android.json'), 'utf8'));
mkdirSync(path.join(DIST, '.well-known'), { recursive: true });
out('.well-known/assetlinks.json', JSON.stringify(Object.entries(ANDROID.packages).map(([pkg, fps]) => ({
  relation: ['delegate_permission/common.handle_all_urls'],
  target: { namespace: 'android_app', package_name: pkg, sha256_cert_fingerprints: fps }
})), null, 2) + '\n');
out('rieng-tu.html', privacy);
/* máy chủ PHP (tài khoản, quản trị, bài viết) chỉ chạy trên Hostinger; file cấu hình nằm ngoài public_html */
cpSync(path.join(SRC, 'server'), DIST, { recursive: true });
out('api/_basemax.php', `<?php\n// Số lớn nhất của thư viện gốc (do tools/build.mjs tạo)\nreturn ['q' => ${Math.max(...ACT.map(a => a.id))}, 'an' => ${Math.max(...FOODS.map(f => f.id))}];\n`);
mkdirSync(path.join(DIST, 'data'), { recursive: true });
out('data/library.json', JSON.stringify({ q: ACT, an: FOODS }));
out('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}/</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n  <url><loc>${SITE}/bai-viet</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>\n  <url><loc>${SITE}/rieng-tu</loc><lastmod>${TODAY}</lastmod><changefreq>yearly</changefreq><priority>0.2</priority></url>\n</urlset>\n`);
out('sw.js', await minJs(readFileSync(path.join(SRC, 'sw.js'), 'utf8').replace('__VERSION__', VERSION)));

const SECURITY = [
  ['X-Content-Type-Options', 'nosniff'], ['X-Frame-Options', 'DENY'], ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(), usb=()']
];
out('.htaccess', `# homnaylamgi.com — cấu hình cho Hostinger (LiteSpeed/Apache). File này do tools/build.mjs tạo.
Options -Indexes
DirectoryIndex index.html index.php
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
  # Chặn file ẩn, file cấu hình, sao lưu
  RewriteRule (^|/)\\.(?!well-known/) - [F,L]
  RewriteRule \\.(sql|bak|log|ini|env|sh)$ - [F,L]
  # Ảnh tải lên (lưu ngoài public_html): /uploads/2026/10/abc.jpg → api/img.php
  RewriteRule ^uploads/([0-9]{4}/[0-9]{2}/[a-f0-9]{16}\\.jpg)$ api/img.php?f=$1 [L]
  # Bài viết: /bai-viet/<đường-dẫn> → bai-viet/index.php
  RewriteRule ^bai-viet/([a-z0-9-]+)/?$ bai-viet/index.php?slug=$1 [L,QSA]
  RewriteRule ^bai-viet/?$ bai-viet/index.php [L,QSA]
  # Link rủ từng quẻ: /q/12 → q/12.html, /an/5 → an/5.html; quẻ do quản trị viên thêm → api/q.php
  RewriteCond %{DOCUMENT_ROOT}/$1/$2.html !-f
  RewriteRule ^(q|an)/([0-9]+)/?$ api/q.php?k=$1&id=$2 [L,QSA]
  RewriteRule ^(q|an)/([0-9]+)/?$ $1/$2.html [L]
  # Trang không đuôi: /rieng-tu → rieng-tu.html
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME}.html -f
  RewriteRule ^(.+)$ $1.html [L]
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

{ const ht = readFileSync(path.join(DIST, '.htaccess'), 'utf8'); if (!ht.includes('RewriteRule (^|/)\\.(?!well-known/)') || !ht.includes('RewriteRule \\.(sql|') || !ht.includes('[a-f0-9]{16}\\.jpg')) throw new Error('.htaccess: mất dấu \\ trong biểu thức chặn'); }

/* ---------- 8. vercel.json ở gốc repo ---------- */
writeFileSync(path.join(ROOT, 'vercel.json'), JSON.stringify({
  $schema: 'https://openapi.vercel.sh/vercel.json',
  outputDirectory: 'dist',
  cleanUrls: true,
  /* Vercel không chạy PHP: tài khoản, quản trị, bài viết chỉ có trên homnaylamgi.com */
  redirects: [
    { source: '/api/:path*', destination: 'https://homnaylamgi.com/api/:path*', permanent: false },
    { source: '/quan-tri/:path*', destination: 'https://homnaylamgi.com/quan-tri/:path*', permanent: false },
    { source: '/bai-viet/:path*', destination: 'https://homnaylamgi.com/bai-viet/:path*', permanent: false },
    { source: '/bai-viet', destination: 'https://homnaylamgi.com/bai-viet', permanent: false }
  ],
  trailingSlash: false,
  headers: [
    { source: '/(.*)', headers: SECURITY.map(([key, value]) => ({ key, value })) },
    { source: '/assets/fonts/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    { source: '/(favicon.ico|favicon.svg|apple-touch-icon.png|icon-192.png|icon-512.png|icon-maskable-512.png|og-image.png)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] },
    { source: '/og/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] }
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
console.log(`link rủ: ${LANDS.length} trang (/q, /an) · ảnh xem trước riêng: ${ogCount}`);
console.log(`artifact: ${kb(artifact.length)}`);
