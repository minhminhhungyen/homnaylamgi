/* Hôm nay làm gì? — mã chạy trang. Cần ACTIVITIES (data.js) nạp trước. */
(() => {
'use strict';

const SITE = 'https://homnaylamgi.com';
const SITE_LABEL = 'homnaylamgi.com';
const KEY = 'hnlg.v1';
const DEPLOY = false; // bản web thật: build đổi thành true để bật service worker
document.documentElement.classList.remove('no-js');

/* ---------- tiện ích ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dm = d => `${d.getDate()}/${d.getMonth() + 1}`;
const hm = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const icon = (id, cls = 'ico') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;

/* ---------- âm lịch Việt Nam (thuật toán Hồ Ngọc Đức, múi giờ +7) ---------- */
const INT = Math.floor;
function jdFromDate(dd, mm, yy) { const a = INT((14 - mm) / 12), y = yy + 4800 - a, m = mm + 12 * a - 3; let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045; if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083; return jd; }
function newMoon(k, tz) { const T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = Math.PI / 180; let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3; Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr); const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3, Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3, F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3; let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M); C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr); C1 -= 0.0004 * Math.sin(dr * 3 * Mpr); C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr)); C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M)); C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr)); C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M)); const dt = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3 : -0.000278 + 0.000265 * T + 0.000262 * T2; return INT(Jd1 + C1 - dt + 0.5 + tz / 24); }
function sunLong(jdn, tz) { const T = (jdn - 2451545.5 - tz / 24) / 36525, T2 = T * T, dr = Math.PI / 180; const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2, L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2; let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M); DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M); let L = (L0 + DL) * dr; L -= Math.PI * 2 * INT(L / (Math.PI * 2)); return INT(L / Math.PI * 6); }
function month11(yy, tz) { const off = jdFromDate(31, 12, yy) - 2415021, k = INT(off / 29.530588853); let nm = newMoon(k, tz); if (sunLong(nm, tz) >= 9) nm = newMoon(k - 1, tz); return nm; }
function leapOffset(a11, tz) { const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5); let last = 0, i = 1, arc = sunLong(newMoon(k + i, tz), tz); do { last = arc; i++; arc = sunLong(newMoon(k + i, tz), tz); } while (arc !== last && i < 14); return i - 1; }
function solar2lunar(dd, mm, yy, tz) { const dn = jdFromDate(dd, mm, yy), k = INT((dn - 2415021.076998695) / 29.530588853); let ms = newMoon(k + 1, tz); if (ms > dn) ms = newMoon(k, tz); let a11 = month11(yy, tz), b11 = a11, ly; if (a11 >= ms) { ly = yy; a11 = month11(yy - 1, tz); } else { ly = yy + 1; b11 = month11(yy + 1, tz); } const ld = dn - ms + 1, diff = INT((ms - a11) / 29); let leap = 0, lm = diff + 11; if (b11 - a11 > 365) { const lmd = leapOffset(a11, tz); if (diff >= lmd) { lm = diff + 10; if (diff === lmd) leap = 1; } } if (lm > 12) lm -= 12; if (lm >= 11 && diff < 4) ly -= 1; return [ld, lm, ly, leap]; }
const lunarOf = d => { const r = solar2lunar(d.getDate(), d.getMonth() + 1, d.getFullYear(), 7); return { d: r[0], m: r[1], y: r[2], leap: r[3] }; };
const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const yearName = y => `${CAN[(y + 6) % 10]} ${CHI[(y + 8) % 12]}`;
const LM = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Một', 'Chạp'];
const WD = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/* ---------- hôm nay ---------- */
const NOW = new Date();
const TODAY = ymd(NOW);
const slotOf = h => (h >= 5 && h < 11) ? 's' : (h >= 11 && h < 17) ? 'c' : (h >= 17 && h < 22) ? 't' : 'k';
let SLOT = slotOf(NOW.getHours());
const WEEKEND = NOW.getDay() === 0 || NOW.getDay() === 6;
const SEASONS = ['xuan', 'he', 'thu', 'dong'];
const SEASON = (m => (m >= 2 && m <= 4) ? 'xuan' : (m >= 5 && m <= 8) ? 'he' : (m >= 9 && m <= 11) ? 'thu' : 'dong')(NOW.getMonth() + 1);

/* ---------- ngày đặc biệt ---------- */
const EVENTS = [
  { key: 'tet', name: 'Tết Nguyên đán', lunar: [1, 1], before: 21, after: 3, horizon: 60, items: 'tet' },
  { key: 'ongtao', name: 'Ông Công ông Táo', lunar: [23, 12], before: 2, after: 0, items: 'tet' },
  { key: 'ramgieng', name: 'Rằm tháng Giêng', lunar: [15, 1], before: 1, after: 0, items: 'ram', boost: 'ram' },
  { key: 'hungvuong', name: 'Giỗ Tổ Hùng Vương', lunar: [10, 3], before: 3, after: 0, items: 'nghile' },
  { key: 'vulan', name: 'Lễ Vu Lan', lunar: [15, 7], before: 3, after: 0, items: 'ram', boost: 'vulan ram' },
  { key: 'trungthu', name: 'Tết Trung thu', lunar: [15, 8], before: 7, after: 0, items: 'trungthu ram', boost: 'ram' },
  { key: 'duonglich', name: 'Tết Dương lịch', solar: [1, 1], before: 3, after: 0, items: 'nghile' },
  { key: 'giaothua', name: 'Đêm giao thừa', solar: [31, 12], before: 2, after: 0, items: 'giaothua' },
  { key: 'valentine', name: 'Lễ Tình nhân', solar: [14, 2], before: 3, after: 0, items: 'valentine' },
  { key: '83', name: 'Quốc tế Phụ nữ 8/3', solar: [8, 3], before: 3, after: 0, items: 'phunu' },
  { key: 'doan', name: 'Ngày thành lập Đoàn 26/3', solar: [26, 3], before: 5, after: 0, items: 'doan' },
  { key: 'cathangtu', name: 'Cá tháng Tư', solar: [1, 4], before: 1, after: 0, items: 'cathangtu' },
  { key: '304', name: 'Nghỉ lễ 30/4 và 1/5', solar: [30, 4], before: 5, after: 1, items: 'nghile' },
  { key: 'thieunhi', name: 'Quốc tế Thiếu nhi 1/6', solar: [1, 6], before: 3, after: 0, items: 'thieunhi' },
  { key: 'giadinh', name: 'Ngày Gia đình Việt Nam', solar: [28, 6], before: 3, after: 0, items: 'giadinh' },
  { key: '29', name: 'Quốc khánh 2/9', solar: [2, 9], before: 4, after: 0, items: 'nghile' },
  { key: '2010', name: 'Phụ nữ Việt Nam 20/10', solar: [20, 10], before: 3, after: 0, items: 'phunu' },
  { key: 'halloween', name: 'Halloween', solar: [31, 10], before: 10, after: 0, items: 'halloween' },
  { key: '2011', name: 'Nhà giáo Việt Nam 20/11', solar: [20, 11], before: 7, after: 0, items: '2011', boost: '2011' },
  { key: 'noel', name: 'Giáng sinh', solar: [25, 12], before: 10, after: 0, items: 'noel' }
];
function scanEvents(base) {
  const out = [];
  for (let i = -3; i <= 60; i++) {
    const d = addDays(base, i), L = lunarOf(d);
    let named = false;
    for (const ev of EVENTS) {
      const hit = ev.solar ? (d.getDate() === ev.solar[0] && d.getMonth() + 1 === ev.solar[1])
                           : (!L.leap && L.d === ev.lunar[0] && L.m === ev.lunar[1]);
      if (hit) { out.push({ ev, date: d, diff: i }); if (ev.lunar && (L.d === 1 || L.d === 15)) named = true; }
    }
    if (!named && (L.d === 1 || L.d === 15)) {
      out.push({ ev: { key: 'ram', name: `${L.d === 15 ? 'Rằm' : 'Mùng Một'} tháng ${LM[L.m - 1]}${L.leap ? ' nhuận' : ''}`, before: 1, after: 0, horizon: 16, items: 'ram', boost: 'ram' }, date: d, diff: i });
    }
  }
  return out;
}
const EVS = scanEvents(NOW);
const ACTIVE = EVS.filter(e => e.diff <= e.ev.before && e.diff >= -(e.ev.after || 0));
const ACTIVE_ITEMS = new Set(ACTIVE.flatMap(e => e.ev.items.split(' ')));
const ACTIVE_BOOST = new Set(ACTIVE.flatMap(e => (e.ev.boost ? e.ev.boost.split(' ') : [])));
const TODAY_EVENTS = EVS.filter(e => e.diff === 0);

/* ---------- dữ liệu ---------- */
const A = ACTIVITIES;
const byId = new Map(A.map(a => [a.id, a]));
const CATS = {
  vd: { name: 'Vận động', seal: ['VẬN', 'ĐỘNG'], ab: 'VĐ', badge: 'Đôi chân không mỏi' },
  kp: { name: 'Khám phá', seal: ['KHÁM', 'PHÁ'], ab: 'KP', badge: 'Kẻ lang thang' },
  st: { name: 'Sáng tạo', seal: ['SÁNG', 'TẠO'], ab: 'ST', badge: 'Bàn tay vàng' },
  hh: { name: 'Học hỏi', seal: ['HỌC', 'HỎI'], ab: 'HH', badge: 'Mọt chữ' },
  kn: { name: 'Kết nối', seal: ['KẾT', 'NỐI'], ab: 'KN', badge: 'Người giữ lửa' },
  cm: { name: 'Chăm mình', seal: ['CHĂM', 'MÌNH'], ab: 'CM', badge: 'Ốc đảo bình yên' },
  au: { name: 'Ăn uống', seal: ['ĂN', 'UỐNG'], ab: 'ĂU', badge: 'Đầu bếp tại gia' },
  sn: { name: 'Sự nghiệp', seal: ['SỰ', 'NGHIỆP'], ab: 'SN', badge: 'Đầu tư cho mình' },
  tt: { name: 'Tử tế', seal: ['TỬ', 'TẾ'], ab: 'TT', badge: 'Trái tim ấm' },
  gt: { name: 'Giải trí', seal: ['GIẢI', 'TRÍ'], ab: 'GT', badge: 'Vua giải trí' }
};
const LEVELS = [[0, 'Chiến binh nằm dài'], [10, 'Người bắt đầu'], [30, 'Kẻ tò mò'], [60, 'Người chủ động'], [100, 'Tay chơi có kế hoạch'], [160, 'Nhà thám hiểm'], [240, 'Người truyền cảm hứng'], [350, 'Huyền thoại sống'], [500, 'Bậc thầy Hôm nay']];
const xs = a => (a.x ? a.x.split(' ') : []);
const band = d => (d <= 3 ? 1 : d <= 6 ? 2 : 3);
const LVL = d => (d <= 3 ? 'Nhẹ nhàng' : d <= 6 ? 'Vừa sức' : d <= 8 ? 'Thử thách' : 'Liều mới ăn nhiều');
const COST = ['0 đồng', 'Dưới 100k', '100k–300k', 'Trên 300k'];
const WHERE = { i: 'Trong nhà', o: 'Ra ngoài', b: 'Đâu cũng được' };
const WHO = { a: 'một mình', b: 'bạn bè', y: 'người yêu', g: 'gia đình' };
const FEEL = { vui: 'Vui', thuong: 'Bình thường', nho: 'Đáng nhớ' };
const fmtWho = s => { if (s.length >= 4) return 'Ai cũng được'; const t = s.split('').map(c => WHO[c]).join(', '); return t.charAt(0).toUpperCase() + t.slice(1); };
const fmtTime = a => {
  if (xs(a).includes('canngay')) return 'Rải rác cả ngày';
  const p = a.p; if (p < 60) return `${p} phút`; if (p >= 480) return 'Cả ngày';
  const h = INT(p / 60), m = p % 60; return m === 0 ? `${h} tiếng` : m === 30 ? `${h} tiếng rưỡi` : `${h} tiếng ${m} phút`;
};

/* ---------- trạng thái (lưu trên máy người dùng) ---------- */
const DEF = () => ({ v: 1, stars: 0, best: 0, done: [], saved: [], recent: [], got: [], cur: 0, curDay: '', acc: 0, accAt: 0, mood: 'all', moodDay: '', chAccDay: '', f: { who: '', budget: '', dur: '', place: '', level: '', when: 'now' } });
let S = (() => {
  try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw), d = DEF(); return Object.assign(d, s, { f: Object.assign(d.f, s.f || {}) }); } } catch (e) { /* bỏ qua */ }
  return DEF();
})();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* trình duyệt chặn lưu: trang vẫn chạy */ } };
const doneToday = id => S.done.some(r => r.id === id && r.day === TODAY);
const recToday = id => S.done.find(r => r.id === id && r.day === TODAY);
const doneWithin = (id, days) => { const lim = Date.now() - days * 864e5; return S.done.some(r => r.id === id && r.ts >= lim); };
function streak() {
  const days = new Set(S.done.map(r => r.day));
  let d = new Date(NOW), n = 0;
  if (!days.has(ymd(d))) d = addDays(d, -1);
  while (days.has(ymd(d))) { n++; d = addDays(d, -1); }
  return n;
}
const BADGES = [
  { k: 'dau', g: '1', name: 'Quẻ đầu tiên', hint: 'Làm xong quẻ đầu tiên', ok: s => s.done.length >= 1 },
  { k: 'lua3', g: '3', name: 'Lửa 3 ngày', hint: 'Giữ chuỗi 3 ngày', ok: s => s.best >= 3 },
  { k: 'lua7', g: '7', name: 'Lửa 7 ngày', hint: 'Giữ chuỗi 7 ngày', ok: s => s.best >= 7 },
  { k: 'lieu', g: '8+', name: 'Liều ăn nhiều', hint: 'Xong quẻ độ khó từ 8', ok: s => s.done.some(r => r.d >= 8) },
  { k: 'chung', g: '5', name: 'Đồng hành', hint: 'Xong 5 thử thách chung', ok: s => s.done.filter(r => r.ch).length >= 5 },
  { k: 'som', g: '6h', name: 'Chim sớm', hint: 'Xong một quẻ trước 7 giờ sáng', ok: s => s.done.some(r => { const h = new Date(r.ts).getHours(); return h >= 4 && h < 7; }) }
].concat(Object.keys(CATS).map(c => ({ k: 'c_' + c, g: CATS[c].ab, name: CATS[c].badge, hint: `Xong 3 quẻ ${CATS[c].name}`, ok: s => s.done.filter(r => (byId.get(r.id) || {}).c === c).length >= 3 })));

/* ---------- thử thách chung: ai vào trang trong ngày cũng nhận cùng một quẻ ---------- */
const CH_POOL = A.filter(a => a.ch && !a.ev);
const CH = CH_POOL[hash('hnlg' + TODAY) % CH_POOL.length];

/* ---------- chọn quẻ ---------- */
const RELAX = ['place', 'level', 'dur', 'budget', 'who', 'when'];
const RELAX_NAME = { place: 'nơi chốn', level: 'mức thử thách', dur: 'thời gian', budget: 'ngân sách', who: 'đi cùng ai', when: 'khung giờ' };
const isSet = k => (k === 'when' ? S.f.when === 'now' : !!S.f[k]);
function eligible(a, f, relax) {
  if (a.ev && !ACTIVE_ITEMS.has(a.ev)) return false;
  if (!relax.has('when')) {
    if (f.when === 'now') { if (!a.g.includes(SLOT)) return false; }
    else if (!/[sct]/.test(a.g)) return false;
  }
  if (!relax.has('who') && f.who && !a.ai.includes(f.who)) return false;
  if (!relax.has('budget') && f.budget !== '' && a.k > +f.budget) return false;
  if (!relax.has('dur') && f.dur && f.dur !== '999' && !xs(a).includes('canngay') && a.p > +f.dur) return false;
  if (!relax.has('place') && f.place && a.o !== f.place && a.o !== 'b') return false;
  if (!relax.has('level') && f.level && band(a.d) !== +f.level) return false;
  return true;
}
function buildPool() {
  const relax = new Set();
  let pool = A.filter(a => eligible(a, S.f, relax));
  for (let i = 0; pool.length < 3 && i < RELAX.length; i++) { relax.add(RELAX[i]); pool = A.filter(a => eligible(a, S.f, relax)); }
  return { pool, relaxed: [...relax].filter(isSet) };
}
function weight(a) {
  let w = 1;
  const tags = xs(a);
  if (a.ev) w *= S.mood === 'all' ? 3 : 1.5;
  for (const t of tags) {
    if (t === 'cuoituan') w *= WEEKEND ? 1.7 : 0.45;
    else if (ACTIVE_BOOST.has(t)) w *= 4;
  }
  const ss = tags.filter(t => SEASONS.includes(t));
  if (ss.length) w *= ss.includes(SEASON) ? 1.5 : 0.4;
  if (S.mood === 'h' && a.d >= 5) w *= 1.6;
  if (S.mood === 'm' && a.d >= 6) w *= 0.4;
  if (SLOT === 'k' && S.f.when === 'now' && a.id === 97) w *= 5;
  if (S.f.dur === '999' && a.p >= 120) w *= 1.8;
  const ri = S.recent.indexOf(a.id);
  if (ri >= 0) w *= Math.min(1, 0.03 + ri * 0.035);
  if (doneWithin(a.id, 5)) w *= 0.15;
  return w;
}
function pickWeighted(list) {
  if (!list.length) return null;
  const ws = list.map(weight), total = ws.reduce((x, y) => x + y, 0);
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}
function choose(exclude) {
  const { pool, relaxed } = buildPool();
  let P = pool.filter(a => a.id !== exclude);
  if (!P.length) P = pool;
  if (S.mood !== 'all') { const mm = P.filter(a => a.m.includes(S.mood)); if (mm.length >= 3) P = mm; }
  return { a: pickWeighted(P), relaxed };
}

/* ---------- vẽ giao diện ---------- */
const stars10 = d => Array.from({ length: 10 }, (_, i) => `<svg class="star${i < d ? ' on' : ''}" viewBox="0 0 24 24"><use href="#i-star"/></svg>`).join('');
let lastRelax = [];

function renderHeader() {
  const L = lunarOf(NOW);
  $('#today').innerHTML = `<span><b>${WD[NOW.getDay()]}, ${dm(NOW)}/${NOW.getFullYear()}</b></span><span>Âm lịch ${L.d}/${L.m}${L.leap ? ' nhuận' : ''} năm ${yearName(L.y)}</span>`;
  const part = { s: 'Sáng', c: 'Chiều', t: 'Tối', k: 'Khuya' }[SLOT];
  const wd = WD[NOW.getDay()].replace('Thứ', 'thứ');
  let g = SLOT === 'k' ? 'Khuya rồi đấy' : `${part} ${wd}`;
  if (TODAY_EVENTS.length) g += ` · Hôm nay là ${TODAY_EVENTS[0].ev.name}`;
  $('#greet').textContent = g;
  $('#nightHint').hidden = !(SLOT === 'k' && S.f.when === 'now');
}

function renderSlip() {
  const a = byId.get(S.cur); if (!a) return;
  const cat = CATS[a.c];
  $('#qNo').textContent = String(a.id).padStart(3, '0');
  $('#qLv').textContent = LVL(a.d);
  const seal = $('#qSeal');
  seal.innerHTML = `<span>${cat.seal[0]}</span><span>${cat.seal[1]}</span>`;
  seal.setAttribute('aria-label', `Nhóm ${cat.name}`);
  $('#qTitle').textContent = a.t;
  $('#qPoem').textContent = a.n;
  $('#qStep').textContent = a.s;
  $('#qStars').innerHTML = stars10(a.d);
  $('#qStarsTxt').textContent = `Độ khó ${a.d}/10 · nhận ${a.d} sao`;
  $('#qTime').textContent = fmtTime(a);
  $('#qCost').textContent = COST[a.k];
  $('#qWhere').textContent = WHERE[a.o];
  $('#qWho').textContent = fmtWho(a.ai);
  const rec = recToday(a.id), slip = $('#slip'), st = $('#qStatus');
  slip.classList.toggle('is-done', !!rec);
  if (rec) { st.hidden = false; st.textContent = `Đã làm lúc ${hm(rec.ts)} · +${rec.d} sao`; }
  else if (S.acc && S.curDay === TODAY) { st.hidden = false; st.textContent = `Đang làm · nhận lúc ${hm(S.accAt)}`; }
  else st.hidden = true;

  const main = $('#btnMain'), drawBtn = $('#btnDraw');
  if (rec) { main.dataset.mode = 'next'; main.className = 'btn btn-main'; main.innerHTML = `${icon('shuffle')}<span>Rút quẻ tiếp</span>`; drawBtn.hidden = true; }
  else if (S.acc && S.curDay === TODAY) { main.dataset.mode = 'done'; main.className = 'btn btn-main is-go'; main.innerHTML = `${icon('check')}<span>Mình làm xong rồi</span>`; drawBtn.hidden = false; }
  else { main.dataset.mode = 'accept'; main.className = 'btn btn-main'; main.innerHTML = '<span>Nhận quẻ này</span>'; drawBtn.hidden = false; }
  const saved = S.saved.includes(a.id), sb = $('#btnSave');
  sb.setAttribute('aria-pressed', String(saved));
  $('span', sb).textContent = saved ? 'Đã để dành' : 'Để dành';
  $('#feel').hidden = !rec;
  if (rec) $$('#feel [data-feel]').forEach(b => b.setAttribute('aria-pressed', String(rec.f === b.dataset.feel)));
  const rn = $('#relaxNote');
  rn.hidden = !lastRelax.length;
  if (lastRelax.length) rn.textContent = `Không có quẻ nào khớp hết lựa chọn của bạn lúc này, nên mình nới bớt phần ${lastRelax.map(k => RELAX_NAME[k]).join(', ')}.`;
  $('#careNote').hidden = !(S.mood === 'b' || S.mood === 'l');
}

function renderMood() {
  $$('#moods .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === S.mood)));
}

function renderTune() {
  $$('#groups [data-f]').forEach(g => { const f = g.dataset.f; $$('.chip', g).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.f[f]))); });
  const labels = [];
  $$('#groups [data-f]').forEach(g => {
    const f = g.dataset.f, v = S.f[f];
    if ((f === 'when' && v === 'day') || (f !== 'when' && v)) { const b = $(`.chip[data-v="${v}"]`, g); if (b) labels.push(b.textContent); }
  });
  $('#tuneSum').textContent = labels.length ? labels.join(' · ') : 'Chưa chọn gì';
  const n = A.filter(a => eligible(a, S.f, new Set())).length;
  $('#poolCount').textContent = n ? `Có ${n} quẻ hợp với lựa chọn của bạn lúc này.` : 'Không có quẻ nào khớp hết. Khi rút, mình sẽ nới bớt cho bạn.';
}

function renderDaily() {
  $('#dDate').textContent = `Ngày ${dm(NOW)}`;
  $('#dStars').textContent = `+${CH.d} sao`;
  $('#dTitle').textContent = CH.t;
  $('#dWhy').textContent = CH.n;
  $('#dStep').textContent = CH.s;
  const b = $('#dBtn');
  if (doneToday(CH.id)) { b.disabled = true; b.className = 'btn btn-main is-go btn-sm'; b.innerHTML = `${icon('check')}<span>Đã hoàn thành</span>`; }
  else if (S.chAccDay === TODAY) { b.disabled = false; b.className = 'btn btn-main is-go btn-sm'; b.innerHTML = `${icon('check')}<span>Mình làm xong rồi</span>`; }
  else { b.disabled = false; b.className = 'btn btn-main btn-sm'; b.innerHTML = '<span>Nhận thử thách</span>'; }
}

function whenText(e) {
  if (e.diff === 0) return 'Hôm nay';
  if (e.diff === 1) return 'Ngày mai';
  return `${WD[e.date.getDay()]} ${dm(e.date)} · còn ${e.diff} ngày`;
}
function eventPool(ev) {
  const keys = ev.items.split(' '), boosts = ev.boost ? ev.boost.split(' ') : [];
  return A.filter(a => (a.ev && keys.includes(a.ev)) || (!a.ev && xs(a).some(t => boosts.includes(t))));
}
let SOON = [];
function renderSoon() {
  const seen = new Set();
  SOON = EVS.filter(e => e.diff >= 0 && e.diff <= (e.ev.horizon || 30)).sort((x, y) => x.diff - y.diff).filter(e => { if (seen.has(e.ev.name)) return false; seen.add(e.ev.name); return true; }).slice(0, 3);
  $('#soonSec').hidden = !SOON.length;
  $('#soonList').innerHTML = SOON.map((e, i) => {
    const has = eventPool(e.ev).length > 0;
    return `<li><button class="soon-item" type="button" data-i="${i}"${has ? '' : ' disabled'}><span><span class="soon-name">${esc(e.ev.name)}</span>${has ? '<span class="soon-cta">Rút quẻ cho dịp này</span>' : ''}</span><span class="soon-when">${whenText(e)}</span></button></li>`;
  }).join('');
}

function levelOf(n) {
  let i = 0; while (i + 1 < LEVELS.length && n >= LEVELS[i + 1][0]) i++;
  return [LEVELS[i], LEVELS[i + 1] || null];
}
let NEW_BADGES = [];
function renderJourney() {
  $('#jStars').textContent = S.stars;
  $('#jDone').textContent = S.done.length;
  const st = streak();
  $('#jStreak').textContent = st;
  $('#jStreakLab').textContent = S.done.some(r => r.day === TODAY) ? 'ngày liên tiếp · hôm nay đã giữ lửa' : st ? 'ngày liên tiếp · làm một quẻ để giữ lửa' : 'ngày liên tiếp';
  const [cur, next] = levelOf(S.stars);
  $('#jLevel').textContent = cur[1];
  const pct = next ? Math.round((S.stars - cur[0]) / (next[0] - cur[0]) * 100) : 100;
  $('#jBar').style.width = pct + '%';
  $('#jBarWrap').setAttribute('aria-valuenow', String(pct));
  $('#jNext').textContent = next ? `Còn ${next[0] - S.stars} sao nữa để thành “${next[1]}”.` : 'Bạn đã lên danh hiệu cao nhất.';
  $('#badges').innerHTML = BADGES.map(b => {
    const on = S.got.includes(b.k);
    return `<li class="badge ${on ? 'on' : 'off'}${NEW_BADGES.includes(b.k) ? ' new' : ''}"><span class="badge-seal" aria-hidden="true">${on ? esc(b.g) : '?'}</span><span class="badge-name">${esc(b.name)}</span>${on ? '' : `<span class="badge-hint">${esc(b.hint)}</span>`}</li>`;
  }).join('');
  NEW_BADGES = [];
  const hist = S.done.slice(0, 8);
  $('#hist').innerHTML = hist.length ? `<ul class="rows">${hist.map(r => {
    const a = byId.get(r.id); if (!a) return '';
    const d = new Date(r.ts);
    return `<li><div class="row-main"><p class="row-t">${esc(a.t)}</p><p class="row-m">+${r.d} sao · ${dm(d)}${r.ch ? ' · thử thách chung' : ''}${r.f ? ' · ' + FEEL[r.f] : ''}</p></div></li>`;
  }).join('')}</ul>` : '<p class="empty">Chưa có quẻ nào. Làm xong quẻ đầu tiên để nhận sao và huy hiệu “Quẻ đầu tiên”.</p>';
  const sv = S.saved.map(id => byId.get(id)).filter(Boolean);
  $('#saved').innerHTML = sv.length ? `<ul class="rows">${sv.map(a => `<li><div class="row-main"><p class="row-t">${esc(a.t)}</p><p class="row-m">Độ khó ${a.d}/10 · ${CATS[a.c].name}</p></div><div class="row-act"><button class="link" type="button" data-open="${a.id}">Rút quẻ này</button><button class="link muted" type="button" data-rm="${a.id}" aria-label="Bỏ khỏi danh sách để dành">Bỏ</button></div></li>`).join('')}</ul>` : '<p class="empty">Gặp quẻ hay mà chưa làm được ngay? Bấm “Để dành” để lưu lại đây.</p>';
}

function renderAll() { renderHeader(); renderSlip(); renderMood(); renderTune(); renderDaily(); renderJourney(); }

/* ---------- hành động ---------- */
function setCur(id) {
  S.cur = id; S.curDay = TODAY; S.acc = 0; S.accAt = 0;
  S.recent = [id].concat(S.recent.filter(x => x !== id)).slice(0, 30);
  save();
}
function announce() { const a = byId.get(S.cur); if (a) $('#live').textContent = `Quẻ số ${a.id}: ${a.t}`; }
function animateSwap(swap) {
  if (reduced) { swap(); return; }
  const slip = $('#slip'), tube = $('#tube');
  tube.classList.remove('shake'); void tube.getBoundingClientRect(); tube.classList.add('shake');
  slip.classList.remove('in'); slip.classList.add('out');
  setTimeout(() => {
    swap();
    slip.classList.remove('out'); slip.classList.add('in');
    setTimeout(() => slip.classList.remove('in'), 460);
  }, 230);
}
/* trang mở qua nửa đêm thì tải lại để sang ngày mới; đổi khung giờ thì cập nhật bộ lọc */
function refreshClock() {
  const now = new Date();
  if (ymd(now) !== TODAY) { location.reload(); return false; }
  const s = slotOf(now.getHours());
  if (s !== SLOT) { SLOT = s; renderHeader(); renderTune(); }
  return true;
}
function draw() {
  if (!refreshClock()) return;
  const res = choose(S.cur);
  if (!res.a) { toast('Chưa có quẻ hợp. Thử nới bớt phần Tinh chỉnh nhé.'); return; }
  animateSwap(() => { lastRelax = res.relaxed; setCur(res.a.id); renderSlip(); announce(); });
}
function busy() { return S.acc && S.curDay === TODAY && !doneToday(S.cur); }
function complete(id) {
  if (doneToday(id)) return;
  const a = byId.get(id); if (!a) return;
  S.done.unshift({ id, day: TODAY, ts: Date.now(), d: a.d, ch: id === CH.id ? 1 : 0, f: '' });
  S.done = S.done.slice(0, 600);
  S.stars += a.d;
  S.best = Math.max(S.best, streak());
  if (S.cur === id) S.acc = 0;
  if (id === CH.id) S.chAccDay = '';
  const fresh = BADGES.filter(b => !S.got.includes(b.k) && b.ok(S));
  fresh.forEach(b => S.got.push(b.k));
  NEW_BADGES = fresh.map(b => b.k);
  save(); renderAll(); confetti();
  toast(fresh.length ? `+${a.d} sao. Mở khóa huy hiệu “${fresh[0].name}”!` : `+${a.d} sao. Giỏi lắm!`);
}

$('#btnMain').addEventListener('click', () => {
  const mode = $('#btnMain').dataset.mode;
  if (mode === 'accept') { S.acc = 1; S.accAt = Date.now(); save(); renderSlip(); toast('Đã nhận quẻ. Làm xong nhớ quay lại bấm nhé!'); }
  else if (mode === 'done') complete(S.cur);
  else { lastRelax = []; draw(); }
});
$('#btnDraw').addEventListener('click', draw);
$('#tube').addEventListener('click', () => { if (busy()) { toast('Bạn đang làm một quẻ. Bấm “Rút quẻ khác” nếu muốn đổi.'); return; } draw(); });
$('#btnSave').addEventListener('click', () => {
  const id = S.cur;
  if (S.saved.includes(id)) { S.saved = S.saved.filter(x => x !== id); toast('Đã bỏ khỏi danh sách để dành.'); }
  else { S.saved = [id].concat(S.saved).slice(0, 40); toast('Đã để dành. Xem lại ở phần Hành trình.'); }
  save(); renderSlip(); renderJourney();
});
$$('#feel [data-feel]').forEach(b => b.addEventListener('click', () => {
  const rec = recToday(S.cur); if (!rec) return;
  rec.f = rec.f === b.dataset.feel ? '' : b.dataset.feel;
  save(); renderSlip(); renderJourney();
}));
$$('#moods .chip').forEach(b => b.addEventListener('click', () => {
  S.mood = b.dataset.m; S.moodDay = TODAY; save(); renderMood();
  if (busy()) { renderSlip(); toast('Bạn đang làm một quẻ. Bấm “Rút quẻ khác” nếu muốn đổi.'); return; }
  draw();
}));
$$('#groups [data-f]').forEach(g => $$('.chip', g).forEach(b => b.addEventListener('click', () => {
  S.f[g.dataset.f] = b.dataset.v; save(); renderTune(); renderHeader();
  if (busy()) { toast('Đã lưu lựa chọn. Quẻ đang làm vẫn giữ nguyên.'); return; }
  draw();
})));
$('#dBtn').addEventListener('click', () => {
  if (doneToday(CH.id)) return;
  if (S.chAccDay === TODAY) complete(CH.id);
  else { S.chAccDay = TODAY; save(); renderDaily(); toast('Đã nhận thử thách chung. Cố lên!'); }
});
$('#soonList').addEventListener('click', e => {
  const btn = e.target.closest('.soon-item'); if (!btn) return;
  const ev = SOON[+btn.dataset.i]; if (!ev) return;
  if (busy()) { toast('Bạn đang làm một quẻ. Làm xong rồi rút quẻ cho dịp này nhé.'); return; }
  const list = eventPool(ev.ev).filter(a => a.id !== S.cur);
  const a = list.length ? list[INT(Math.random() * list.length)] : null;
  if (!a) { toast('Chưa có quẻ mới cho dịp này.'); return; }
  animateSwap(() => { lastRelax = []; setCur(a.id); renderSlip(); announce(); });
  $('#slip').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
});
$('#saved').addEventListener('click', e => {
  const o = e.target.closest('[data-open]'), r = e.target.closest('[data-rm]');
  if (o) {
    if (busy()) { toast('Bạn đang làm một quẻ. Làm xong rồi mở quẻ này nhé.'); return; }
    const id = +o.dataset.open;
    animateSwap(() => { lastRelax = []; setCur(id); renderSlip(); announce(); });
    $('#slip').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  }
  if (r) { S.saved = S.saved.filter(x => x !== +r.dataset.rm); save(); renderSlip(); renderJourney(); }
});
let resetAt = 0;
$('#btnReset').addEventListener('click', () => {
  const b = $('#btnReset');
  if (Date.now() - resetAt < 5000) {
    resetAt = 0; S = DEF(); save(); lastRelax = [];
    setCur(choose(0).a.id); renderAll(); announce();
    b.textContent = 'Xóa dữ liệu'; toast('Đã xóa sạch. Bắt đầu lại từ một quẻ mới.');
  } else {
    resetAt = Date.now(); b.textContent = 'Bấm lần nữa để xóa hết sao, huy hiệu và lịch sử';
    setTimeout(() => { if (resetAt && Date.now() - resetAt >= 5000) { resetAt = 0; b.textContent = 'Xóa dữ liệu'; } }, 5100);
  }
});
$('#btnHotline').addEventListener('click', () => copyText('0963061414', 'Đã chép số 096 306 1414.'));

/* ---------- chia sẻ ---------- */
let shareId = 0, cardFile = null;
function shareMsg(id) {
  const a = byId.get(id);
  return doneToday(id)
    ? `Hôm nay mình đã làm xong quẻ: “${a.t}” (+${a.d} sao). Còn bạn, hôm nay làm gì? Rút một quẻ tại ${SITE_LABEL}`
    : `Quẻ hôm nay của mình: “${a.t}” (độ khó ${a.d}/10). Còn bạn, hôm nay làm gì? Rút một quẻ tại ${SITE_LABEL}`;
}
function copyText(t, okMsg) {
  const fail = () => toast('Máy chưa cho chép tự động. Bạn bôi đen rồi chép giúp mình nhé.');
  try { navigator.clipboard.writeText(t).then(() => toast(okMsg), fail); } catch (e) { fail(); }
}
let lastFocus = null;
const BEHIND = ['.top', 'main', '.foot'];
const setInert = on => BEHIND.forEach(s => { const el = $(s); if (el) el.inert = on; });
function openModal(m) { lastFocus = document.activeElement; m.hidden = false; document.body.classList.add('modal-open'); setInert(true); const f = $('[data-close]', m); if (f) f.focus(); }
function closeModal(m) { m.hidden = true; document.body.classList.remove('modal-open'); setInert(false); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
function openShare(withCard) {
  shareId = S.cur; cardFile = null;
  $('#shareText').value = shareMsg(shareId);
  $('#btnNative').hidden = typeof navigator.share !== 'function';
  $('#cardWrap').hidden = true;
  openModal($('#shareModal'));
  if (withCard) buildCard();
}
$('#btnShare').addEventListener('click', () => openShare(false));
$('#btnCard').addEventListener('click', () => openShare(true));
$('#btnCard2').addEventListener('click', buildCard);
$('#btnCopy').addEventListener('click', () => {
  const ta = $('#shareText');
  try { navigator.clipboard.writeText(ta.value).then(() => toast('Đã chép. Dán vào Zalo, Messenger hay story nhé.'), () => { ta.focus(); ta.select(); toast('Đã bôi đen sẵn, bạn bấm chép giúp mình nhé.'); }); }
  catch (e) { ta.focus(); ta.select(); }
});
$('#btnNative').addEventListener('click', () => {
  navigator.share({ title: 'Hôm nay làm gì?', text: $('#shareText').value, url: SITE }).catch(err => { if (!err || err.name !== 'AbortError') toast('Thiết bị này chưa gửi trực tiếp được. Dùng nút Chép lời mời nhé.'); });
});
$('#btnShareImg').addEventListener('click', () => {
  if (cardFile && navigator.canShare && navigator.canShare({ files: [cardFile] })) {
    navigator.share({ files: [cardFile], text: $('#shareText').value }).catch(err => { if (!err || err.name !== 'AbortError') toast('Chưa gửi được. Nhấn giữ ảnh để lưu nhé.'); });
  } else toast('Thiết bị này chưa gửi ảnh trực tiếp được. Nhấn giữ ảnh để lưu nhé.');
});
$$('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.closest('.modal'))));
$('#shareModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(e.currentTarget); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.modal').forEach(m => { if (!m.hidden) closeModal(m); }); });

/* ảnh khoe 1080×1350 vẽ bằng canvas */
function wrapLines(ctx, text, maxW, maxLines) {
  const words = text.split(' '), lines = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { const keep = lines.slice(0, maxLines); keep[maxLines - 1] = keep[maxLines - 1].replace(/\s+\S*$/, '') + '…'; return keep; }
  return lines;
}
function starPath(ctx, cx, cy, R) {
  const r = R * 0.45; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const ang = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; ctx[i ? 'lineTo' : 'moveTo'](cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)); }
  ctx.closePath();
}
async function buildCard() {
  const a = byId.get(shareId || S.cur); if (!a) return;
  try { await Promise.all(['800 80px "Bricolage Grotesque"', 'italic 400 40px "Fraunces"', '600 30px "Be Vietnam Pro"'].map(f => document.fonts.load(f))); } catch (e) { /* dùng font dự phòng */ }
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const RED = '#D02842', PAPER = '#FFF3EC', INK = '#241826', MUTED = '#6A5B6E', GOLD = '#E0A100', LINE = '#EBA7B2';
  const DISP = '"Bricolage Grotesque", "Be Vietnam Pro", sans-serif', BODY = '"Be Vietnam Pro", sans-serif', POEM = '"Fraunces", Georgia, serif';
  x.fillStyle = RED; x.fillRect(0, 0, W, H);
  x.fillStyle = PAPER; x.fillRect(64, 64, W - 128, H - 128);
  x.strokeStyle = RED; x.lineWidth = 4; x.strokeRect(84, 84, W - 168, H - 168);
  x.strokeStyle = LINE; x.lineWidth = 2; x.strokeRect(96, 96, W - 192, H - 192);
  const L = 140, R = W - 140, TW = R - L;
  x.textBaseline = 'alphabetic';
  x.fillStyle = RED; x.font = `600 28px ${BODY}`;
  if ('letterSpacing' in x) x.letterSpacing = '4px';
  x.fillText('HÔM NAY LÀM GÌ?', L, 180);
  if ('letterSpacing' in x) x.letterSpacing = '0px';
  x.font = `800 64px ${DISP}`; x.fillText(`Quẻ số ${String(a.id).padStart(3, '0')}`, L, 262);
  x.fillStyle = MUTED; x.font = `600 30px ${BODY}`; x.fillText(LVL(a.d), L, 312);
  // con dấu nhóm
  x.save(); x.translate(R - 82, 232); x.rotate(-5 * Math.PI / 180);
  x.fillStyle = RED; x.fillRect(-82, -82, 164, 164);
  x.strokeStyle = PAPER; x.lineWidth = 4; x.strokeRect(-70, -70, 140, 140);
  x.fillStyle = PAPER; x.textAlign = 'center'; x.font = `800 34px ${DISP}`;
  const seal = CATS[a.c].seal; x.fillText(seal[0], 0, -6); x.fillText(seal[1], 0, 38);
  x.restore(); x.textAlign = 'left';
  // tiêu đề + lời quẻ
  let y = 430;
  x.fillStyle = INK; x.font = `800 74px ${DISP}`;
  for (const ln of wrapLines(x, a.t, TW, 4)) { x.fillText(ln, L, y); y += 88; }
  y += 18; x.fillStyle = MUTED; x.font = `italic 400 40px ${POEM}`;
  for (const ln of wrapLines(x, a.n, TW, 3)) { x.fillText(ln, L, y); y += 56; }
  // sao độ khó
  y += 40;
  for (let i = 0; i < 10; i++) { starPath(x, L + 26 + i * 62, y, 26); x.fillStyle = i < a.d ? GOLD : '#EADBD5'; x.fill(); }
  y += 74; x.fillStyle = MUTED; x.font = `600 32px ${BODY}`; x.fillText(`Độ khó ${a.d}/10 · ${a.d} sao`, L, y);
  // dấu "đã làm"
  if (doneToday(a.id)) {
    x.save(); x.translate(R - 150, H - 400); x.rotate(-12 * Math.PI / 180);
    x.strokeStyle = RED; x.lineWidth = 6; x.strokeRect(-150, -62, 300, 112); x.lineWidth = 2; x.strokeRect(-140, -52, 280, 92);
    x.fillStyle = RED; x.textAlign = 'center'; x.font = `800 60px ${DISP}`; x.fillText('ĐÃ LÀM', 0, 18);
    x.restore(); x.textAlign = 'left';
  }
  // chân ảnh
  x.strokeStyle = LINE; x.lineWidth = 3; x.setLineDash([14, 12]);
  x.beginPath(); x.moveTo(96, H - 272); x.lineTo(W - 96, H - 272); x.stroke(); x.setLineDash([]);
  x.fillStyle = MUTED; x.font = `600 30px ${BODY}`; x.fillText('Rút quẻ của bạn tại', L, H - 196);
  x.fillStyle = RED; x.font = `800 58px ${DISP}`; x.fillText(SITE_LABEL, L, H - 130);
  x.fillStyle = MUTED; x.font = `600 28px ${BODY}`; x.textAlign = 'right';
  x.fillText(`${WD[NOW.getDay()]}, ${dm(NOW)}/${NOW.getFullYear()}`, R, H - 196); x.textAlign = 'left';
  const box = $('#cardBox'), img = new Image();
  img.alt = 'Ảnh quẻ hôm nay để đăng lên mạng xã hội'; img.width = W; img.height = H;
  img.src = c.toDataURL('image/png');
  box.replaceChildren(img);
  $('#cardWrap').hidden = false;
  try { c.toBlob(b => { if (b) cardFile = new File([b], `que-${a.id}-homnaylamgi.png`, { type: 'image/png' }); }, 'image/png'); } catch (e) { cardFile = null; }
  $('#shareImgRow').hidden = !navigator.canShare;
}

/* ---------- hiệu ứng ---------- */
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); }
function confetti() {
  if (reduced) return;
  const cv = $('#confetti'), ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.hidden = false; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const cs = getComputedStyle(document.documentElement);
  const cols = ['--do', '--gold', '--tre', '--do-line'].map(v => cs.getPropertyValue(v).trim() || '#D02842');
  const r = $('#slip').getBoundingClientRect();
  const ox = (r.left + r.width / 2) * dpr, oy = (Math.max(40, r.top) + 60) * dpr, P = [];
  for (let i = 0; i < 140; i++) P.push({ x: ox, y: oy, vx: (Math.random() - 0.5) * 16 * dpr, vy: (-Math.random() * 13 - 4) * dpr, w: (5 + Math.random() * 6) * dpr, h: (8 + Math.random() * 9) * dpr, a: Math.random() * 6.28, va: (Math.random() - 0.5) * 0.3, c: cols[i % cols.length] });
  const t0 = performance.now();
  const frame = t => {
    const el = t - t0; ctx.clearRect(0, 0, cv.width, cv.height);
    for (const p of P) { p.vy += 0.42 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.globalAlpha = Math.max(0, 1 - el / 1700); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); }
    if (el < 1700) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, cv.width, cv.height); cv.hidden = true; }
  };
  requestAnimationFrame(frame);
}

/* ---------- khởi động ---------- */
if (S.moodDay !== TODAY) { S.mood = 'all'; S.moodDay = TODAY; }
if (S.chAccDay && S.chAccDay !== TODAY) S.chAccDay = '';
let start = S.curDay === TODAY ? byId.get(S.cur) : null;
if (start && !S.acc && !doneToday(start.id)) {
  if (start.ev && !ACTIVE_ITEMS.has(start.ev)) start = null;
  else if (S.f.when === 'now' && !start.g.includes(SLOT)) start = null;
}
if (!start) { const r = choose(0); lastRelax = r.relaxed; setCur(r.a.id); }
else if (S.curDay !== TODAY) S.acc = 0;
renderAll(); renderSoon(); announce(); save();
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshClock(); });
window.addEventListener('focus', refreshClock);
window.addEventListener('pageshow', e => { if (e.persisted) refreshClock(); });
if (DEPLOY && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* không có service worker thì trang vẫn chạy */ }); });
}
window.__hnlg = { choose, buildPool, eligible, state: () => S, CH, EVS, SLOT, A };
})();
