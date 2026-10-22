// Ảnh xem trước 1200×630 cho từng quẻ và từng món (hiện khi dán link /q/12, /an/5 lên Facebook, Zalo, Threads…)
// Chạy lại khi thêm hoặc sửa quẻ: cd tools && npm run og   (cần Playwright + Chromium: npx playwright install chromium)
// Kết quả: src/og/q-<số>.png, src/og/an-<số>.png — build.mjs tự chép sang dist/og/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src'), OUT = path.join(SRC, 'og');
let chromium;
try { const m = await import(process.env.PLAYWRIGHT_MODULE || 'playwright'); chromium = m.chromium || (m.default && m.default.chromium); } catch (e) { chromium = null; }
if (!chromium) { console.error('Cần Playwright: npm i -D playwright && npx playwright install chromium'); process.exit(1); }

const [ACT, FOODS] = new Function(`${readFileSync(path.join(SRC, 'data.js'), 'utf8')}\nreturn [ACTIVITIES, FOODS];`)();
const font = (fam, w, st, f) => `@font-face{font-family:"${fam}";font-weight:${w};font-style:${st};src:url(data:font/woff2;base64,${readFileSync(path.join(SRC, 'fonts', f)).toString('base64')}) format("woff2")}`;
const FONTS = [font('Be Vietnam Pro', 400, 'normal', 'be-vietnam-pro-400.woff2'), font('Be Vietnam Pro', 600, 'normal', 'be-vietnam-pro-600.woff2'),
  font('Bricolage Grotesque', 800, 'normal', 'bricolage-grotesque-800.woff2'), font('Fraunces', 400, 'italic', 'fraunces-400-italic.woff2')].join('');
const SEAL = { vd: 'VẬN ĐỘNG', kp: 'KHÁM PHÁ', st: 'SÁNG TẠO', hh: 'HỌC HỎI', kn: 'KẾT NỐI', cm: 'CHĂM MÌNH', au: 'ĂN UỐNG', sn: 'SỰ NGHIỆP', tt: 'TỬ TẾ', gt: 'GIẢI TRÍ' };
const FSEAL = { n: 'ĂN NGOÀI', h: 'TỰ NẤU', nh: 'MÓN NGON' };
const LVL = d => (d <= 3 ? 'Nhẹ nhàng' : d <= 6 ? 'Vừa sức' : d <= 8 ? 'Thử thách' : 'Liều mới ăn nhiều');
const KIND = { n: 'Ăn ngoài', h: 'Tự nấu', nh: 'Ăn ngoài hoặc tự nấu' };
const REGION = { '': 'Cả nước', B: 'Miền Bắc', T: 'Miền Trung', N: 'Miền Nam', TN: 'Miền Trung, miền Nam' };
const PURSE = ['', 'Bình dân', 'Vừa phải', 'Hơi sang'];
const MEAL = { s: 'sáng', c: 'trưa', t: 'tối', k: 'khuya', v: 'ăn vặt' };
const STAR = 'M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45l-5.8 3.05 1.1-6.45-4.7-4.6 6.5-.95z';

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#D02842;position:relative;overflow:hidden;font-family:"Be Vietnam Pro",sans-serif;color:#241826}
.card{position:absolute;inset:36px;background:#FFF3EC;border-radius:6px;padding:52px 64px 44px;display:flex;flex-direction:column}
.card::before{content:"";position:absolute;inset:14px;border:3px solid #D02842;border-radius:3px;pointer-events:none}
.card::after{content:"";position:absolute;inset:24px;border:1.5px solid #EBA7B2;border-radius:2px;pointer-events:none}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
.lab{font:600 22px/1.2 "Be Vietnam Pro";letter-spacing:.16em;color:#D02842}
.no{margin-top:8px;font:800 34px/1.1 "Bricolage Grotesque";letter-spacing:-.01em}
.no span{font:600 24px "Be Vietnam Pro";color:#6A5B6E;letter-spacing:0}
.seal{flex:none;width:118px;height:118px;background:#D02842;color:#FFF3EC;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font:800 24px/1.12 "Bricolage Grotesque";transform:rotate(-5deg);box-shadow:inset 0 0 0 5px #D02842,inset 0 0 0 7.5px #FFF3EC;margin-top:-6px}
.mid{flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0}
h1{font:800 72px/1.06 "Bricolage Grotesque";letter-spacing:-.025em;text-wrap:balance}
.po{margin-top:14px;font:italic 400 27px/1.38 "Fraunces";color:#6A5B6E;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bot{display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
.stars{display:flex;gap:5px}.stars svg{width:30px;height:30px}
.dk{margin-top:8px;font:600 21px "Be Vietnam Pro";color:#8A6200}
.meta{font:600 23px/1.3 "Be Vietnam Pro";color:#6A5B6E}
.site{font:800 36px/1 "Bricolage Grotesque";color:#D02842;letter-spacing:-.01em;white-space:nowrap}
.site small{display:block;margin-bottom:8px;font:600 19px "Be Vietnam Pro";color:#6A5B6E;letter-spacing:0;text-align:right}
</style></head><body><div class="card"><div class="top"><div><p class="lab" id="lab"></p><p class="no" id="no"></p></div><div class="seal" id="seal"></div></div>
<div class="mid"><h1 id="t"></h1><p class="po" id="po"></p></div>
<div class="bot"><div id="left"></div><p class="site"><small>Rút quẻ của bạn tại</small>homnaylamgi.com</p></div></div></body></html>`;

mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const pg = await b.newPage({ viewport: { width: 1200, height: 630 } });
await pg.setContent(html);
await pg.evaluate(() => document.fonts.ready);
const jobs = ACT.map(a => ({ file: `q-${a.id}.png`, lab: 'HÔM NAY LÀM GÌ?', no: `Quẻ số ${String(a.id).padStart(3, '0')} <span>· ${LVL(a.d)}</span>`, seal: SEAL[a.c], t: a.t, po: a.n,
  left: `<div class="stars">${Array.from({ length: 10 }, (_, i) => `<svg viewBox="0 0 24 24"><path fill="${i < a.d ? '#E0A100' : '#EADBD5'}" d="${STAR}"/></svg>`).join('')}</div><p class="dk">Độ khó ${a.d}/10 · nhận ${a.d} sao</p>` }))
  .concat(FOODS.map(f => ({ file: `an-${f.id}.png`, lab: 'HÔM NAY ĂN GÌ?', no: `Quẻ ăn số ${String(f.id).padStart(3, '0')} <span>· ${KIND[f.o]}</span>`, seal: FSEAL[f.o], t: f.t, po: f.n,
    left: `<p class="meta">Bữa ${f.b.split('').map(c => MEAL[c]).join(', ')}<br>${REGION[f.r]} · ${PURSE[f.k]}</p>` })));
let n = 0, bytes = 0;
for (const j of jobs) {
  await pg.evaluate(j => {
    const $ = s => document.querySelector(s);
    $('#lab').textContent = j.lab; $('#no').innerHTML = j.no; $('#po').textContent = j.po; $('#left').innerHTML = j.left;
    $('#seal').innerHTML = j.seal.split(' ').map(w => `<span>${w}</span>`).join('');
    const t = $('#t'); t.textContent = j.t;
    let size = 76; t.style.fontSize = size + 'px';
    const mid = $('.mid');
    while (size > 44 && (t.scrollHeight > size * 1.06 * 3 + 4 || mid.scrollHeight > mid.clientHeight + 1)) { size -= 4; t.style.fontSize = size + 'px'; }
  }, j);
  const png = await pg.screenshot({ type: 'png' });
  const small = await sharp(png).png({ palette: true, colours: 96, effort: 8, compressionLevel: 9 }).toBuffer();
  writeFileSync(path.join(OUT, j.file), small); n++; bytes += small.length;
}
await b.close();
console.log(`Đã tạo ${n} ảnh xem trước trong src/og (tổng ${(bytes / 1048576).toFixed(1)} MB)`);
