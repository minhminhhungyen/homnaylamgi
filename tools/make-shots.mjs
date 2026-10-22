// Ảnh chụp màn hình cho manifest (cài app) và cho Google Play, ảnh bìa 1024×500.
// Chạy sau khi build: cd tools && npm run build && npm run shots   (cần Playwright + Chromium)
// Kết quả: src/static/screenshots/*.png (build lại để đưa vào web), store/android/*.png
import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist'), SHOTS = path.join(ROOT, 'src', 'static', 'screenshots'), STORE = path.join(ROOT, 'store', 'android');
let chromium;
try { const m = await import(process.env.PLAYWRIGHT_MODULE || 'playwright'); chromium = m.chromium || (m.default && m.default.chromium); } catch (e) { chromium = null; }
if (!chromium) { console.error('Cần Playwright: npm i -D playwright && npx playwright install chromium'); process.exit(1); }
mkdirSync(SHOTS, { recursive: true }); mkdirSync(STORE, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]); const m = u.match(/^\/(q|an)\/(\d+)\/?$/); if (m) u = `/${m[1]}/${m[2]}.html`;
  const f = u === '/' ? 'index.html' : u.slice(1);
  try { const d = readFileSync(path.join(DIST, f)); r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } catch (e) { r.writeHead(404); r.end(); }
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${srv.address().port}`;
const TIME = '2026-10-23T18:40:00+07:00', DAY = '2026-10-23';
const met = { properties: { timeseries: Array.from({ length: 18 }, (_, i) => ({ time: new Date(Date.parse('2026-10-23T11:00:00Z') + i * 36e5).toISOString().replace('.000', ''), data: { instant: { details: { air_temperature: 24, relative_humidity: 70 } }, next_1_hours: { summary: { symbol_code: 'fair_night' }, details: { precipitation_amount: 0 } } } })) } };
const aq = { current: { us_aqi: 46, pm2_5: 11, uv_index: 0 } };
const base = { v: 1, stars: 46, best: 6, recent: [], got: ['dau', 'lua3', 'c_vd', 'c_kn', 'c_gt'], cur: 195, curDay: DAY, acc: 0, accAt: 0, mood: 'all', moodDay: DAY, chAccDay: '', mode: 'lam', food: 28, foodDay: DAY, frecent: [28], meal: '', mealDay: '', ftype: '', fmt: 'story', pref: {}, prefDay: DAY, instNo: 1,
  wxOn: true, wxLoc: { lat: 21.03, lon: 105.85, name: 'Hà Nội' }, wx: null, aq: null, saved: [20, 182], f: { who: '', budget: '', dur: '', place: '', level: '', when: 'now' },
  done: [[1, '2026-10-23', 3], [133, '2026-10-22', 2], [86, '2026-10-21', 1], [57, '2026-10-20', 4], [179, '2026-10-19', 2], [12, '2026-10-18', 5]].map(([id, day, d]) => ({ id, day, ts: Date.parse(day + 'T07:30:00+07:00'), d, ch: 0, f: 'vui' })) };
const b = await chromium.launch();
async function page({ w, h, scale, mobile, state, url = '/' }) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale, isMobile: mobile, hasTouch: mobile, timezoneId: 'Asia/Bangkok', serviceWorkers: 'block', colorScheme: 'light' });
  await ctx.route('https://api.met.no/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', expires: new Date(Date.parse(TIME) + 30 * 60e3).toUTCString() }, body: JSON.stringify(met) }));
  await ctx.route('https://air-quality-api.open-meteo.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(aq) }));
  await ctx.addInitScript(([s]) => { if (!localStorage.getItem('hnlg.v1')) localStorage.setItem('hnlg.v1', JSON.stringify(s)); navigator.share = () => Promise.resolve(); navigator.canShare = () => true; }, [state]);
  const p = await ctx.newPage(); await p.clock.setFixedTime(new Date(TIME));
  await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  return { ctx, p };
}
const save = async (p, name, opts = {}) => { const buf = await p.screenshot(opts); writeFileSync(path.join(SHOTS, name), await sharp(buf).png({ compressionLevel: 9 }).toBuffer()); };
const phone = { w: 360, h: 640, scale: 3, mobile: true };
{ const { ctx, p } = await page({ ...phone, state: base }); await save(p, 'narrow-1.png'); await ctx.close(); }
{ const { ctx, p } = await page({ ...phone, state: { ...base, mode: 'an' } }); await save(p, 'narrow-2.png'); await ctx.close(); }
{ const { ctx, p } = await page({ ...phone, state: base }); await p.tap('#btnShare'); await p.waitForTimeout(500); await save(p, 'narrow-3.png'); await ctx.close(); }
{ const { ctx, p } = await page({ ...phone, state: base }); await p.evaluate(() => document.querySelector('#jTitle').scrollIntoView({ block: 'start' })); await p.evaluate(() => scrollBy(0, -12)); await p.waitForTimeout(300); await save(p, 'narrow-4.png'); await ctx.close(); }
{ const { ctx, p } = await page({ w: 1280, h: 720, scale: 1.5, mobile: false, state: base }); await save(p, 'wide-1.png'); await ctx.close(); }

// Ảnh bìa Google Play 1024×500 (PNG 24 bit, không kênh trong suốt)
const fg = await b.newPage({ viewport: { width: 1024, height: 500 } });
const font = (fam, w, st, f) => `@font-face{font-family:"${fam}";font-weight:${w};font-style:${st};src:url(data:font/woff2;base64,${readFileSync(path.join(ROOT, 'src', 'fonts', f)).toString('base64')}) format("woff2")}`;
await fg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${font('Be Vietnam Pro', 600, 'normal', 'be-vietnam-pro-600.woff2')}${font('Bricolage Grotesque', 800, 'normal', 'bricolage-grotesque-800.woff2')}${font('Fraunces', 400, 'italic', 'fraunces-400-italic.woff2')}
*{margin:0;box-sizing:border-box}body{width:1024px;height:500px;background:#D02842;color:#FFF3EC;font-family:"Be Vietnam Pro";position:relative;overflow:hidden}
.l{position:absolute;left:64px;top:70px;width:520px}.k{font:600 20px "Be Vietnam Pro";letter-spacing:.16em;opacity:.9}
h1{margin-top:18px;font:800 86px/1 "Bricolage Grotesque";letter-spacing:-.03em}.sub{margin-top:22px;font:600 26px/1.35 "Be Vietnam Pro";color:#FFE1E5}
.slip{position:absolute;right:70px;top:64px;width:330px;background:#FFF3EC;color:#241826;padding:30px 30px 28px;transform:rotate(4deg);box-shadow:0 26px 50px -18px rgba(60,0,20,.5);outline:2px solid #EBA7B2;outline-offset:-12px}
.no{font:600 15px "Be Vietnam Pro";letter-spacing:.14em;color:#D02842}.no b{display:block;margin-top:2px;font:800 30px "Bricolage Grotesque";letter-spacing:0}
.t{margin-top:16px;font:800 30px/1.15 "Bricolage Grotesque";color:#241826}.po{margin-top:10px;font:italic 400 18px/1.4 "Fraunces";color:#6A5B6E}
.st{display:flex;gap:4px;margin-top:16px}.st i{width:18px;height:18px;background:#E0A100;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}.st i.o{background:#EADBD5}
</style></head><body><div class="l"><p class="k">RÚT MỘT QUẺ MỖI NGÀY</p><h1>Hôm nay<br>làm gì?</h1><p class="sub">Việc nhỏ, món ngon, hợp tâm trạng và thời tiết.</p></div>
<div class="slip"><p class="no">QUẺ SỐ<b>195</b></p><p class="t">Nghe nhạc sống ở một quán acoustic</p><p class="po">Một giọng hát mộc giữa phố đêm, nghe xong lòng nhẹ hẳn.</p><div class="st"><i></i><i></i><i class="o"></i><i class="o"></i><i class="o"></i><i class="o"></i><i class="o"></i><i class="o"></i><i class="o"></i><i class="o"></i></div></div></body></html>`);
await fg.evaluate(() => document.fonts.ready); await fg.waitForTimeout(200);
writeFileSync(path.join(STORE, 'feature-graphic-1024x500.png'), await sharp(await fg.screenshot()).flatten({ background: '#D02842' }).removeAlpha().png({ compressionLevel: 9 }).toBuffer());
await b.close(); srv.close();
['narrow-1', 'narrow-2', 'narrow-3', 'narrow-4'].forEach((n, i) => copyFileSync(path.join(SHOTS, n + '.png'), path.join(STORE, `phone-${i + 1}.png`)));
copyFileSync(path.join(ROOT, 'src', 'static', 'icon-512.png'), path.join(STORE, 'icon-512.png'));
console.log('Đã tạo ảnh chụp màn hình (src/static/screenshots) và hồ sơ ảnh Google Play (store/android)');
