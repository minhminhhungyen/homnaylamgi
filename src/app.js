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
const F = FOODS;
const foodById = new Map(F.map(f => [f.id, f]));
const MEAL_OF_SLOT = { s: 's', c: 'c', t: 't', k: 'k' };
const MEAL_LV = { s: 'Gợi ý bữa sáng', c: 'Gợi ý bữa trưa', t: 'Gợi ý bữa tối', k: 'Gợi ý ăn khuya', v: 'Gợi ý ăn vặt' };
const MEAL_WORD = { s: 'sáng', c: 'trưa', t: 'tối', k: 'khuya', v: 'ăn vặt' };
const MEAL_WHEN = { s: 'sáng nay', c: 'trưa nay', t: 'tối nay', k: 'đêm nay', v: 'lát nữa' };
const FOOD_KIND = { n: 'Ăn ngoài', h: 'Tự nấu', nh: 'Ăn ngoài hoặc tự nấu' };
const FOOD_SEAL = { n: ['ĂN', 'NGOÀI'], h: ['TỰ', 'NẤU'], nh: ['MÓN', 'NGON'] };
const REGION = { '': 'Cả nước', B: 'Miền Bắc', T: 'Miền Trung', N: 'Miền Nam', TN: 'Miền Trung, miền Nam' };
const PURSE = ['', 'Bình dân', 'Vừa phải', 'Hơi sang'];
const SLOT_WHEN = { s: 'sáng nay', c: 'chiều nay', t: 'tối nay', k: 'mai' };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const lower1 = s => s.charAt(0).toLowerCase() + s.slice(1);
const mapsUrl = t => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t)}`;
const cookUrl = t => `https://www.youtube.com/results?search_query=${encodeURIComponent('cách làm ' + t)}`;
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
const DEF = () => ({ v: 1, stars: 0, best: 0, done: [], saved: [], recent: [], got: [], cur: 0, curDay: '', acc: 0, accAt: 0, mood: 'all', moodDay: '', chAccDay: '', mode: 'lam', food: 0, foodDay: '', frecent: [], meal: '', mealDay: '', ftype: '', fmt: 'story', pref: {}, prefDay: '', wxOn: false, wxLoc: null, wx: null, aq: null, f: { who: '', budget: '', dur: '', place: '', level: '', when: 'now' } });
let S = (() => {
  try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw), d = DEF(); return Object.assign(d, s, { f: Object.assign(d.f, s.f || {}) }); } } catch (e) { /* bỏ qua */ }
  return DEF();
})();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* trình duyệt chặn lưu: trang vẫn chạy */ } };
/* mở từ link rủ: trang /q/12 và /an/5 chuyển về /?q=12 và /?m=5 */
const INV = (() => {
  const none = { k: '', id: 0 };
  let p; try { p = new URLSearchParams(location.search); } catch (e) { return none; }
  const q = parseInt(p.get('q'), 10), m = parseInt(p.get('m'), 10);
  if (q && byId.has(q)) return { k: 'q', id: q };
  if (m && foodById.has(m)) return { k: 'an', id: m };
  return none;
})();
if (location.search) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* bỏ qua */ } }
/* học theo người dùng: chấm Vui/Đáng nhớ thì cộng điểm nhóm việc, bấm bỏ qua thì trừ nhẹ */
const nudge = (c, v) => { if (!c) return; S.pref[c] = Math.max(-6, Math.min(6, Math.round(((S.pref[c] || 0) + v) * 100) / 100)); };
const FEEL_PT = { vui: 1, thuong: 0, nho: 1.5 };
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
/* tâm trạng chưa tốt: ưu tiên nhóm việc dễ làm mình vui lên */
const LIFT = { c: ['gt', 'kp', 'vd'], b: ['gt', 'kn', 'vd', 'cm'], m: ['cm'], x: ['vd', 'cm', 'gt'], l: ['kn', 'tt', 'gt'] };
const MOOD_NOTE = {
  c: 'Chán thì đổi gió: mình ưu tiên việc mới lạ, vui vui.',
  b: 'Buồn thì làm gì đó nhẹ nhàng cho vui lên, có người bên cạnh càng tốt.',
  m: 'Mệt thì làm việc nhẹ thôi, nghỉ ngơi cũng là một việc đáng làm.',
  x: 'Căng thẳng thì ưu tiên việc giúp đầu óc thả lỏng.',
  l: 'Cô đơn thì ưu tiên việc kết nối với một người.',
  h: 'Đang hứng thì thử việc khó hơn một chút xem sao.'
};
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
  if (LIFT[S.mood] && LIFT[S.mood].includes(a.c)) w *= 1.5;
  w *= 1 + 0.08 * (S.pref[a.c] || 0);
  if (WX && S.f.when === 'now') w *= wxWeight(a, tags);
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
  /* mưa, dông, không khí xấu: chỉ gợi ý việc trong nhà (trừ khi người dùng tự chọn “Ra ngoài” ở Tinh chỉnh) */
  if (WX && S.f.when === 'now' && !S.f.place && (WX.cls === 'rain' || WX.cls === 'storm' || WX.cls === 'air')) { const dry = P.filter(a => a.o !== 'o'); if (dry.length >= 3) P = dry; }
  return { a: pickWeighted(P), relaxed };
}

/* ---------- vẽ giao diện ---------- */
const stars10 = d => Array.from({ length: 10 }, (_, i) => `<svg class="star${i < d ? ' on' : ''}" viewBox="0 0 24 24"><use href="#i-star"/></svg>`).join('');
let lastRelax = [];

function renderHeader() {
  const L = lunarOf(NOW);
  $('#today').innerHTML = `<span><b>${WD[NOW.getDay()]}, ${dm(NOW)}<span class="yr">/${NOW.getFullYear()}</span></b></span><span>Âm lịch ${L.d}/${L.m}${L.leap ? ' nhuận' : ''}<span class="yr"> năm ${yearName(L.y)}</span></span>`;
  const part = { s: 'Sáng', c: 'Chiều', t: 'Tối', k: 'Khuya' }[SLOT];
  const wd = WD[NOW.getDay()].replace('Thứ', 'thứ');
  let g = SLOT === 'k' ? 'Khuya rồi đấy' : `${part} ${wd}`;
  if (TODAY_EVENTS.length) g += ` · Hôm nay là ${TODAY_EVENTS[0].ev.name}`;
  $('#greet').textContent = g;
  $('#nightHint').hidden = !(SLOT === 'k' && S.f.when === 'now');
}

function renderSlip() {
  if (S.mode === 'an') { renderFood(); return; }
  const a = byId.get(S.cur); if (!a) return;
  const cat = CATS[a.c];
  $('#qNoLbl').textContent = 'Quẻ số';
  $('#qStepLbl').textContent = 'Bắt đầu ngay';
  $('#qLinks').hidden = true;
  [['#qM1', 'Thời gian'], ['#qM2', 'Chi phí'], ['#qM3', 'Ở đâu'], ['#qM4', 'Đi cùng']].forEach(([s, t]) => { $(s).textContent = t; });
  $('#actions2').hidden = false;
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
  drawBtn.innerHTML = `${icon('shuffle')}<span>Rút quẻ khác</span>`;
  $('#btnCal').hidden = !!rec;
  if (rec) $('#calBox').hidden = true;
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
  const inv = $('#invite');
  inv.hidden = !(INV.k === 'q' && INV.id === a.id);
  if (!inv.hidden) inv.textContent = rec ? 'Quẻ bạn bè gửi, bạn làm xong rồi đó 👏' : '👋 Bạn bè rủ bạn làm quẻ này. Nhận lời không?';
}

function renderMood() {
  $$('#moods .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === S.mood)));
  const mn = $('#moodNote');
  mn.hidden = S.mode === 'an' || !MOOD_NOTE[S.mood];
  if (!mn.hidden) mn.textContent = MOOD_NOTE[S.mood];
}

/* ---------- ống quẻ "Hôm nay ăn gì?" ---------- */
const curMeal = () => ((S.mealDay === TODAY && S.meal) ? S.meal : MEAL_OF_SLOT[SLOT]);
function foodStep(f) {
  if (f.o === 'n') return `Mở bản đồ tìm “${f.t}” quanh chỗ bạn, chọn quán đông khách và nhiều đánh giá tốt.`;
  if (f.o === 'h') return 'Xem nhanh một video hướng dẫn, kiểm tra tủ lạnh rồi đi chợ mua phần còn thiếu.';
  return `Lười thì tìm quán “${f.t}” gần nhất. Rảnh thì tự nấu, xem video hướng dẫn rồi đi chợ.`;
}
function renderFood() {
  const f = foodById.get(S.food); if (!f) return;
  const meal = curMeal(), seal = FOOD_SEAL[f.o];
  $('#qNoLbl').textContent = 'Quẻ ăn số';
  $('#qNo').textContent = String(f.id).padStart(3, '0');
  $('#qLv').textContent = MEAL_LV[meal];
  const sealEl = $('#qSeal');
  sealEl.innerHTML = `<span>${seal[0]}</span><span>${seal[1]}</span>`;
  sealEl.setAttribute('aria-label', FOOD_KIND[f.o]);
  $('#qTitle').textContent = f.t;
  $('#qPoem').textContent = f.n;
  $('#qStepLbl').textContent = 'Ăn thế nào';
  $('#qStep').textContent = foodStep(f);
  const map = $('#lnkMap'), cook = $('#lnkCook');
  map.hidden = !f.o.includes('n'); map.href = mapsUrl(f.t);
  cook.hidden = !f.o.includes('h'); cook.href = cookUrl(f.t);
  $('#qLinks').hidden = false;
  [['#qM1', 'Bữa'], ['#qM2', 'Kiểu'], ['#qM3', 'Vùng'], ['#qM4', 'Túi tiền']].forEach(([s, t]) => { $(s).textContent = t; });
  $('#qTime').textContent = cap(f.b.split('').map(c => MEAL_WORD[c]).join(', '));
  $('#qCost').textContent = FOOD_KIND[f.o];
  $('#qWhere').textContent = REGION[f.r] || 'Cả nước';
  $('#qWho').textContent = PURSE[f.k];
  $('#slip').classList.remove('is-done');
  const main = $('#btnMain'), drawBtn = $('#btnDraw');
  main.dataset.mode = 'food'; main.className = 'btn btn-main'; main.innerHTML = `${icon('users')}<span>Rủ bạn đi ăn</span>`;
  drawBtn.hidden = false; drawBtn.innerHTML = `${icon('shuffle')}<span>Rút món khác</span>`;
  ['#actions2', '#calBox', '#feel', '#relaxNote', '#careNote'].forEach(s => { $(s).hidden = true; });
  const inv = $('#invite');
  inv.hidden = !(INV.k === 'an' && INV.id === f.id);
  if (!inv.hidden) inv.textContent = '😋 Bạn bè rủ bạn đi ăn món này';
}
function renderMeals() {
  const meal = curMeal();
  $$('#meals [data-meal]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.meal === meal)));
  $$('#meals [data-ft]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ft === S.ftype)));
}
function chooseFood(exclude) {
  const meal = curMeal(), ft = S.ftype;
  let P = F.filter(f => f.b.includes(meal) && (!ft || f.o.includes(ft)));
  if (P.length < 3) P = F.filter(f => f.b.includes(meal));
  if (P.length < 3) P = F;
  const list = P.filter(f => f.id !== exclude).length ? P.filter(f => f.id !== exclude) : P;
  const ws = list.map(f => { const ri = S.frecent.indexOf(f.id); return (ri >= 0 ? Math.min(1, 0.05 + ri * 0.08) : 1) * wxFood(f); });
  let r = Math.random() * ws.reduce((x, y) => x + y, 0);
  for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}
function setFood(id) {
  S.food = id; S.foodDay = TODAY;
  S.frecent = [id].concat(S.frecent.filter(x => x !== id)).slice(0, 15);
  save();
}
function setMode(m) {
  S.mode = m === 'an' ? 'an' : 'lam'; save();
  const an = S.mode === 'an';
  document.body.classList.toggle('mode-an', an);
  $('#hVerb').textContent = an ? 'ăn' : 'làm';
  $('#tabLam').setAttribute('aria-selected', String(!an));
  $('#tabAn').setAttribute('aria-selected', String(an));
  $('#moods').hidden = an;
  $('#meals').hidden = !an;
  $('#tuneSec').hidden = an;
  renderMood(); renderWx();
  $('#tube').setAttribute('aria-label', an ? 'Lắc ống quẻ để rút món khác' : 'Lắc ống quẻ để rút quẻ khác');
  if (an && !(S.foodDay === TODAY && foodById.get(S.food))) setFood(chooseFood(0).id);
  if (an) renderMeals();
  renderSlip(); announce();
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
function announce() {
  if (S.mode === 'an') { const f = foodById.get(S.food); if (f) $('#live').textContent = `Món gợi ý: ${f.t}`; return; }
  const a = byId.get(S.cur); if (a) $('#live').textContent = `Quẻ số ${a.id}: ${a.t}`;
}
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
  if (s !== SLOT) { SLOT = s; renderHeader(); renderTune(); renderMeals(); }
  return true;
}
function drawFood() {
  if (!refreshClock()) return;
  const f = chooseFood(S.food);
  animateSwap(() => { setFood(f.id); renderSlip(); announce(); });
}
function draw() {
  if (S.mode === 'an') { drawFood(); return; }
  if (!refreshClock()) return;
  const res = choose(S.cur);
  if (!res.a) { toast('Chưa có quẻ hợp. Thử nới bớt phần Tinh chỉnh nhé.'); return; }
  animateSwap(() => { lastRelax = res.relaxed; setCur(res.a.id); renderSlip(); announce(); });
}
function busy() { return S.acc && S.curDay === TODAY && !doneToday(S.cur); }
/* người dùng chủ động bấm đổi quẻ: ghi nhận là chưa hứng thú với nhóm việc đó */
function skipDraw() {
  const a = byId.get(S.cur);
  if (S.mode !== 'an' && a && !busy() && !doneToday(a.id)) nudge(a.c, -0.25);
  draw();
}
function complete(id) {
  if (doneToday(id)) return;
  const a = byId.get(id); if (!a) return;
  S.done.unshift({ id, day: TODAY, ts: Date.now(), d: a.d, ch: id === CH.id ? 1 : 0, f: '' });
  S.done = S.done.slice(0, 600);
  S.stars += a.d;
  nudge(a.c, 0.5);
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
  else if (mode === 'food') openShare('item');
  else { lastRelax = []; draw(); }
});
$('#btnDraw').addEventListener('click', skipDraw);
$('#tube').addEventListener('click', () => { if (S.mode !== 'an' && busy()) { toast('Bạn đang làm một quẻ. Bấm “Rút quẻ khác” nếu muốn đổi.'); return; } skipDraw(); });
$$('#pickrow [role="tab"]').forEach(b => b.addEventListener('click', () => { if (S.mode !== b.dataset.mode) setMode(b.dataset.mode); }));
$$('#meals [data-meal]').forEach(b => b.addEventListener('click', () => { S.meal = b.dataset.meal; S.mealDay = TODAY; save(); renderMeals(); drawFood(); }));
$$('#meals [data-ft]').forEach(b => b.addEventListener('click', () => { S.ftype = S.ftype === b.dataset.ft ? '' : b.dataset.ft; save(); renderMeals(); drawFood(); }));

/* ---------- thêm vào lịch ---------- */
const utc = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const localInput = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
function calDefault(a) {
  const now = new Date(), t = new Date(now);
  t.setSeconds(0, 0); t.setMinutes(t.getMinutes() < 30 ? 30 : 60);
  if (a.g.includes(slotOf(t.getHours()))) return t;
  const startHour = { s: 7, c: 14, t: 19 };
  for (const day of [0, 1]) for (const sl of ['s', 'c', 't']) {
    if (!a.g.includes(sl)) continue;
    const d = addDays(now, day); d.setHours(startHour[sl], 0, 0, 0);
    if (d > now) return d;
  }
  return t;
}
function calRange() {
  const a = byId.get(S.cur), v = $('#calTime').value;
  const start = v ? new Date(v) : calDefault(a);
  const mins = xs(a).includes('canngay') ? 30 : Math.min(240, Math.max(15, a.p));
  return { a, start, end: new Date(start.getTime() + mins * 60000) };
}
function updateCal() {
  const { a, start, end } = calRange();
  if (isNaN(start)) return;
  $('#calGoogle').href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(a.t)}&dates=${utc(start)}/${utc(end)}&details=${encodeURIComponent(`${a.s}\n\nQuẻ từ ${SITE}`)}`;
}
$('#btnCal').addEventListener('click', () => {
  const box = $('#calBox'), open = box.hidden;
  box.hidden = !open; $('#btnCal').setAttribute('aria-expanded', String(open));
  if (open) { $('#calTime').value = localInput(calDefault(byId.get(S.cur))); updateCal(); }
});
$('#calTime').addEventListener('input', updateCal);
const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function icsFold(line) {
  const enc = new TextEncoder(); let out = '', cur = '', bytes = 0;
  for (const ch of line) { const b = enc.encode(ch).length; if (bytes + b > 73) { out += cur + '\r\n '; cur = ''; bytes = 1; } cur += ch; bytes += b; }
  return out + cur;
}
$('#calIcs').addEventListener('click', () => {
  const { a, start, end } = calRange();
  if (isNaN(start)) { toast('Giờ hẹn chưa hợp lệ, bạn chọn lại nhé.'); return; }
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//homnaylamgi.com//Hom nay lam gi//VI', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:que-${a.id}-${Date.now()}@homnaylamgi.com`, `DTSTAMP:${utc(new Date())}`, `DTSTART:${utc(start)}`, `DTEND:${utc(end)}`,
    `SUMMARY:${icsEsc(a.t)}`, `DESCRIPTION:${icsEsc(`${a.s}\n\nQuẻ từ ${SITE}`)}`, `URL:${SITE}`,
    'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(a.t)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
  const blob = new Blob([lines.map(icsFold).join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `que-${a.id}-homnaylamgi.ics`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Đã tạo file lịch. Mở file để thêm vào lịch của bạn.');
});
$('#btnSave').addEventListener('click', () => {
  const id = S.cur;
  if (S.saved.includes(id)) { S.saved = S.saved.filter(x => x !== id); toast('Đã bỏ khỏi danh sách để dành.'); }
  else { S.saved = [id].concat(S.saved).slice(0, 40); toast('Đã để dành. Xem lại ở phần Hành trình.'); }
  save(); renderSlip(); renderJourney();
});
$$('#feel [data-feel]').forEach(b => b.addEventListener('click', () => {
  const rec = recToday(S.cur); if (!rec) return;
  const was = rec.f;
  rec.f = rec.f === b.dataset.feel ? '' : b.dataset.feel;
  const a = byId.get(rec.id); if (a) nudge(a.c, (FEEL_PT[rec.f] || 0) - (FEEL_PT[was] || 0));
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
  if (S.mode === 'an') setMode('lam');
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
    if (S.mode === 'an') setMode('lam');
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
    setCur(choose(0).a.id); renderAll(); setMode('lam');
    b.textContent = 'Xóa dữ liệu'; toast('Đã xóa sạch. Bắt đầu lại từ một quẻ mới.');
  } else {
    resetAt = Date.now(); b.textContent = 'Bấm lần nữa để xóa hết sao, huy hiệu và lịch sử';
    setTimeout(() => { if (resetAt && Date.now() - resetAt >= 5000) { resetAt = 0; b.textContent = 'Xóa dữ liệu'; } }, 5100);
  }
});
$('#btnHotline').addEventListener('click', () => copyText('0963061414').then(ok => toast(ok ? 'Đã chép số 096 306 1414.' : 'Máy chưa cho chép tự động. Bạn bôi đen số giúp mình nhé.')));

/* ---------- thời tiết: chỉ hỏi vị trí khi người dùng bấm ----------
   Thời tiết: MET Norway (miễn phí, cho dùng thương mại, CC BY 4.0).
   Không khí + UV: Open-Meteo Air Quality, mô hình CAMS (miễn phí cho web phi thương mại, CC BY 4.0).
   Gọi thẳng từ trình duyệt, không khóa API; tọa độ làm tròn 2 chữ số (~1 km). */
const CITIES = [
  ['Hà Nội', 21.03, 105.85], ['TP. Hồ Chí Minh', 10.78, 106.7], ['Hải Phòng', 20.84, 106.69], ['Đà Nẵng', 16.05, 108.2],
  ['Cần Thơ', 10.05, 105.75], ['Huế', 16.46, 107.59], ['Hưng Yên', 20.65, 106.05], ['Bắc Ninh', 21.19, 106.08],
  ['Hải Dương', 20.94, 106.33], ['Hạ Long', 20.95, 107.08], ['Thái Nguyên', 21.59, 105.85], ['Nam Định', 20.42, 106.17],
  ['Ninh Bình', 20.25, 105.97], ['Thanh Hóa', 19.81, 105.78], ['Vinh', 18.68, 105.68], ['Quy Nhơn', 13.78, 109.22],
  ['Nha Trang', 12.24, 109.2], ['Đà Lạt', 11.94, 108.46], ['Buôn Ma Thuột', 12.67, 108.04], ['Pleiku', 13.98, 108],
  ['Biên Hòa', 10.96, 106.84], ['Thủ Dầu Một', 10.98, 106.65], ['Vũng Tàu', 10.35, 107.08], ['Phan Thiết', 10.93, 108.1],
  ['Mỹ Tho', 10.36, 106.36], ['Long Xuyên', 10.39, 105.44], ['Rạch Giá', 10.01, 105.08], ['Cà Mau', 9.18, 105.15],
  ['Phú Quốc', 10.22, 103.96], ['Sa Pa', 22.34, 103.84]
];
const WX_SYM = [
  [/thunder/, 'có dông', '⛈️'], [/heavyrain/, 'mưa to', '🌧️'], [/lightrain/, 'mưa nhỏ', '🌦️'], [/rainshowers/, 'mưa rào', '🌦️'],
  [/rain/, 'có mưa', '🌧️'], [/sleet|snow/, 'mưa tuyết', '🌨️'], [/fog/, 'sương mù', '🌫️'], [/clearsky/, 'trời quang', '☀️'],
  [/fair/, 'ít mây', '🌤️'], [/partlycloudy/, 'có mây', '⛅'], [/cloudy/, 'nhiều mây', '☁️']
];
const WX_TIP = { storm: 'ưu tiên việc trong nhà', rain: 'ưu tiên việc trong nhà', air: 'nên ở trong nhà', hot: 'tránh nắng, ưu tiên chỗ mát', cold: 'trời lạnh, nhớ mặc ấm', fog: 'ra đường đi chậm thôi', nice: 'hợp ra ngoài đấy' };
const WX_TIP_FOOD = { storm: 'ưu tiên món nóng', rain: 'ưu tiên món nóng', cold: 'ưu tiên món nóng', hot: 'ưu tiên món mát' };
const WX_TOAST = { air: 'Không khí đang xấu, mình ưu tiên việc trong nhà nhé.', storm: 'Trời đang có dông, mình đổi sang việc trong nhà nhé.', rain: 'Trời đang mưa, mình ưu tiên việc trong nhà nhé.', hot: 'Trời nắng nóng, mình ưu tiên việc trong nhà hoặc chỗ mát.', cold: 'Trời lạnh, nhớ mặc ấm nhé.', nice: 'Trời đẹp, hợp ra ngoài đấy!' };
let WX = null, wxLoading = false, wxFail = '';
/* nơi gần nhất trong danh sách (tính trên máy, không gửi tọa độ đi đâu thêm) */
function nearCity(lat, lon) {
  let best = null, bd = 1e9;
  for (const c of CITIES) { const dx = (c[2] - lon) * Math.cos(lat * Math.PI / 180), dy = c[1] - lat, d = Math.sqrt(dx * dx + dy * dy) * 111; if (d < bd) { bd = d; best = c[0]; } }
  return bd <= 35 ? best : '';
}
const AIR = aqi => (aqi >= 301 ? 'nguy hại' : aqi >= 201 ? 'rất xấu' : aqi >= 151 ? 'xấu' : aqi >= 101 ? 'kém' : aqi >= 51 ? 'trung bình' : 'tốt');

/* giờ mặt trời lặn tính ngay trên máy (công thức thiên văn rút gọn, sai số vài phút) */
function sunSet(day, lat, lon) {
  const rad = Math.PI / 180, J1970 = 2440588, J2000 = 2451545, J0 = 0.0009, PI2 = 2 * Math.PI;
  const d = day.valueOf() / 864e5 - 0.5 + J1970 - J2000, lw = -lon * rad, phi = lat * rad;
  const n = Math.round(d - J0 - lw / PI2), ds = J0 + lw / PI2 + n;
  const M = rad * (357.5291 + 0.98560028 * ds);
  const L = M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(rad * 23.4397) * Math.sin(L));
  const w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
  const J = J2000 + J0 + (w + lw) / PI2 + n + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  return new Date((J + 0.5 - J1970) * 864e5);
}
function parseMet(j, loc, exp) {
  const ts = (j && j.properties && j.properties.timeseries) || [];
  const rows = ts.slice(0, 18).map(t => {
    const det = (t.data && t.data.instant && t.data.instant.details) || {}, nx = t.data.next_1_hours || t.data.next_6_hours || {};
    return { t: Date.parse(t.time), c: det.air_temperature, h: det.relative_humidity, s: (nx.summary && nx.summary.symbol_code) || '', mm: (nx.details && nx.details.precipitation_amount) || 0 };
  }).filter(r => isFinite(r.t) && typeof r.c === 'number');
  const now = Date.now();
  return { lat: loc.lat, lon: loc.lon, at: now, exp: exp && exp > now ? Math.min(exp, now + 3 * 36e5) : now + 30 * 60e3, rows };
}
/* tình hình lúc này: dữ liệu quá 6 tiếng thì không dùng */
function wxNow() {
  const W = S.wx, now = Date.now();
  if (!S.wxOn || !S.wxLoc || !W || !W.rows || !W.rows.length || now - W.at > 6 * 36e5) return null;
  if (W.lat !== S.wxLoc.lat || W.lon !== S.wxLoc.lon) return null;
  let r = W.rows[0];
  for (const x of W.rows) { if (x.t <= now + 30 * 60e3) r = x; else break; }
  const s = r.s || '', hr = new Date().getHours();
  const set = sunSet(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 12), W.lat, W.lon);
  const toSet = (set - now) / 6e4;
  const night = /_night/.test(s) || toSet < -25 || hr < 5;
  const wet = /rain|sleet|snow/.test(s) || r.mm >= 0.3;
  const Q = S.aq && S.aq.lat === W.lat && S.aq.lon === W.lon && now - S.aq.at < 3 * 36e5 ? S.aq : null;
  const aqi = Q && typeof Q.aqi === 'number' ? Math.round(Q.aqi) : null, uv = Q && typeof Q.uv === 'number' ? Q.uv : null;
  let cls = 'ok';
  if (/thunder/.test(s)) cls = 'storm';
  else if (wet) cls = 'rain';
  else if (aqi !== null && aqi >= 151) cls = 'air';
  else if (hr >= 9 && hr < 17 && (r.c >= 33 || (r.c >= 31 && r.h >= 70))) cls = 'hot';
  else if (r.c <= 16) cls = 'cold';
  else if (/fog/.test(s)) cls = 'fog';
  else if (r.c >= 17 && r.c <= 32 && !(aqi !== null && aqi >= 101)) cls = 'nice';
  const m = WX_SYM.find(x => x[0].test(s));
  return {
    cls, c: r.c, s, txt: m ? m[1] : '', emo: m ? (m[2] === '☀️' && night ? '🌙' : m[2]) : '🌡️', set,
    aqi, air: aqi === null ? '' : AIR(aqi), airSens: aqi !== null && aqi >= 101 && aqi < 151, uvHigh: uv !== null && uv >= 8 && hr >= 9 && hr < 16,
    golden: !wet && /clearsky|fair|partlycloudy/.test(s) && toSet >= 10 && toSet <= 100,
    clearNight: night && /clearsky|fair/.test(s)
  };
}
function wxWeight(a, tags) {
  const o = a.o; let w = 1;
  if (WX.cls === 'storm') w = o === 'o' ? 0.04 : o === 'i' ? 1.6 : 1;
  else if (WX.cls === 'rain') w = o === 'o' ? 0.12 : o === 'i' ? 1.5 : 1;
  else if (WX.cls === 'air') w = (o === 'o' ? 0.25 : o === 'i' ? 1.4 : 1) * (a.c === 'vd' && o !== 'i' ? 0.5 : 1);
  else if (WX.cls === 'hot') w = o === 'o' ? 0.35 : o === 'i' ? 1.3 : 1;
  else if (WX.cls === 'cold') w = o === 'o' ? 0.6 : o === 'i' ? 1.2 : 1;
  else if (WX.cls === 'fog') w = o === 'o' ? 0.7 : 1;
  else if (WX.cls === 'nice') w = (o === 'o' ? 1.8 : 1) * (a.c === 'vd' ? 1.3 : 1);
  if (WX.airSens && a.c === 'vd' && o === 'o') w *= 0.5;
  if (WX.uvHigh && o === 'o') w *= 0.6;
  if (tags.includes('sao')) w *= WX.clearNight ? 4 : 0.05;
  if (tags.includes('hoanghon')) w *= WX.golden ? 6 : (WX.cls === 'rain' || WX.cls === 'storm' ? 0.1 : 1);
  return w;
}
function wxFood(f) {
  if (!WX) return 1;
  if (WX.cls === 'rain' || WX.cls === 'storm' || WX.cls === 'cold') return (f.w === 'n' ? 2.5 : f.w === 'm' ? 0.4 : 1) * (f.o === 'h' && WX.cls !== 'cold' ? 1.2 : 1);
  if (WX.cls === 'hot') return f.w === 'm' ? 2.2 : f.w === 'n' ? 0.5 : 1;
  return 1;
}
function renderWx() {
  WX = wxNow();
  const ask = $('#wxAsk'), now = $('#wxNow');
  if (!WX) {
    ask.hidden = false; now.hidden = true; ask.disabled = wxLoading;
    $('span', ask).textContent = wxLoading ? 'Đang xem thời tiết…' : (S.wxOn && wxFail) ? wxFail : 'Gợi ý theo thời tiết chỗ bạn';
    return;
  }
  ask.hidden = true; now.hidden = false;
  let tip = S.mode === 'an' ? (WX_TIP_FOOD[WX.cls] || '') : (S.f.when === 'now' ? (WX_TIP[WX.cls] || '') : '');
  if (S.mode !== 'an' && S.f.when === 'now' && !tip) tip = WX.airSens ? 'hạn chế vận động mạnh ngoài trời' : WX.uvHigh ? 'UV cao, nhớ che nắng' : '';
  const L = S.wxLoc, place = L ? (L.name || nearCity(L.lat, L.lon)) : '';
  const where = place ? ` ${L.name ? 'ở' : 'gần'} ${place}` : '';
  $('#wxEmo').textContent = WX.emo;
  $('#wxTxt').textContent = `${Math.round(WX.c)}°, ${WX.txt}${where}${WX.air ? ` · không khí ${WX.air} (AQI ${WX.aqi})` : ''}${tip ? ' · ' + tip : ''}`;
}
function openWxBox(msg) {
  $('#wxMsg').textContent = msg || 'Lấy thời tiết ở đâu?';
  $('#wxBox').hidden = false; $('#wxEdit').setAttribute('aria-expanded', 'true');
  const sel = $('#wxCity');
  sel.value = S.wxLoc && S.wxLoc.name ? String(CITIES.findIndex(c => c[0] === S.wxLoc.name)) : '';
}
function closeWxBox() { $('#wxBox').hidden = true; $('#wxEdit').setAttribute('aria-expanded', 'false'); }
function getWx(userAction) {
  const L = S.wxLoc; if (!S.wxOn || !L) { renderWx(); return; }
  const now = Date.now(), W = S.wx, Q = S.aq;
  const needW = !(W && W.lat === L.lat && W.lon === L.lon && now < W.exp);
  const needQ = !(Q && Q.lat === L.lat && Q.lon === L.lon && now < Q.exp);
  if (!needW && !needQ) { wxLoading = false; afterWx(userAction); return; }
  wxLoading = true; wxFail = ''; renderWx();
  const jobs = [];
  if (needW) jobs.push(fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${L.lat}&lon=${L.lon}`)
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); const exp = Date.parse(r.headers.get('expires') || ''); return r.json().then(j => parseMet(j, L, exp)); })
    .then(w => { if (!w.rows.length) throw new Error('trống'); S.wx = w; }));
  if (needQ) jobs.push(fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${L.lat}&longitude=${L.lon}&current=us_aqi,pm2_5,uv_index`)
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(j => { const c = (j && j.current) || {}; S.aq = { lat: L.lat, lon: L.lon, at: now, exp: now + 60 * 60e3, aqi: c.us_aqi, pm: c.pm2_5, uv: c.uv_index }; })
    .catch(() => { S.aq = null; }));
  Promise.all(jobs.map(p => p.catch(e => e))).then(() => {
    wxLoading = false; save();
    if (!wxNow()) { wxFail = 'Chưa xem được thời tiết, bấm để thử lại'; renderWx(); return; }
    afterWx(userAction);
  });
}
function afterWx(userAction) {
  renderWx();
  if (!userAction || !WX) return;
  closeWxBox();
  if (S.mode === 'an') drawFood();
  else if (!busy() && !doneToday(S.cur) && S.f.when === 'now') { lastRelax = []; draw(); }
  if (WX_TOAST[WX.cls]) toast(WX_TOAST[WX.cls]);
}
function locate() {
  if (!navigator.geolocation) { openWxBox('Máy này không lấy được vị trí. Bạn chọn nơi gần nhất nhé.'); return; }
  wxLoading = true; wxFail = ''; renderWx();
  navigator.geolocation.getCurrentPosition(p => {
    S.wxOn = true;
    S.wxLoc = { lat: Math.round(p.coords.latitude * 100) / 100, lon: Math.round(p.coords.longitude * 100) / 100, name: '' };
    save(); getWx(true);
  }, err => {
    wxLoading = false; renderWx();
    openWxBox(err && err.code === 1 ? 'Bạn chưa cho xem vị trí, không sao. Chọn nơi gần bạn để xem thời tiết nhé.' : 'Chưa lấy được vị trí. Chọn nơi gần bạn nhé.');
  }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 30 * 60e3 });
}
if (!DEPLOY) $('#wx').hidden = true; // bản xem trước trên Claude không gọi được dịch vụ thời tiết bên ngoài
$('#wxCity').innerHTML = '<option value="">Hoặc chọn nơi gần bạn…</option>' + CITIES.map((c, i) => `<option value="${i}">${esc(c[0])}</option>`).join('');
$('#wxAsk').addEventListener('click', () => { if (S.wxOn && S.wxLoc) getWx(true); else locate(); });
$('#wxEdit').addEventListener('click', () => { if ($('#wxBox').hidden) openWxBox(); else closeWxBox(); });
$('#wxLoc').addEventListener('click', locate);
$('#wxCity').addEventListener('change', e => {
  const c = CITIES[+e.target.value]; if (!c || e.target.value === '') return;
  S.wxOn = true; S.wxLoc = { lat: c[1], lon: c[2], name: c[0] }; save(); getWx(true);
});
$('#wxOff').addEventListener('click', () => {
  S.wxOn = false; S.wxLoc = null; S.wx = null; S.aq = null; wxFail = ''; save(); closeWxBox(); renderWx(); toast('Đã tắt gợi ý theo thời tiết.');
});

/* ---------- rủ bạn, chia sẻ ---------- */
const TOUCH = !!(window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches);
const canNative = () => typeof navigator.share === 'function';
const APPS = {
  zalo: { name: 'Zalo', web: 'https://chat.zalo.me/', webName: 'Mở Zalo Web' },
  messenger: { name: 'Messenger', web: 'https://www.facebook.com/messages/', webName: 'Mở tin nhắn Facebook' },
  facebook: { name: 'Facebook' }, instagram: { name: 'Instagram' }, tiktok: { name: 'TikTok' }
};
let shareKind = 'item', SH = { title: '', msg: '', url: SITE + '/' };
function shareInfo() {
  if (shareKind === 'site') return {
    title: 'Hôm nay làm gì?', url: SITE + '/',
    msg: S.stars > 0 ? `Mình gom được ${S.stars} sao ở “Hôm nay làm gì?” rồi đó ⭐ Bạn vào rút một quẻ xem, mỗi ngày một việc nhỏ thôi:` : 'Không biết hôm nay làm gì, ăn gì? Vào đây rút một quẻ, có cả sao với huy hiệu, vui phết 😆'
  };
  if (S.mode === 'an') {
    const f = foodById.get(S.food);
    return { title: `Hôm nay ăn gì? ${f.t}`, url: `${SITE}/an/${f.id}`, msg: `Ê, ${MEAL_WHEN[curMeal()]} ăn ${lower1(f.t)} không? 😋` };
  }
  const a = byId.get(S.cur);
  return {
    title: `Hôm nay làm gì? ${a.t}`, url: `${SITE}/q/${a.id}`,
    msg: doneToday(a.id) ? `Hôm nay mình làm xong quẻ “${a.t}”, +${a.d} sao ✨ Còn bạn, hôm nay làm gì?` : `Ê, ${SLOT_WHEN[SLOT]} làm cái này với mình không: “${a.t}” 👀`
  };
}
const shareMsg = () => $('#shareText').value.trim() || SH.msg;
const shareFull = () => `${shareMsg()}\n${SH.url}`;
function refreshNets() {
  const m = encodeURIComponent(shareMsg()), u = encodeURIComponent(SH.url);
  $('#netFacebook').href = `https://www.facebook.com/sharer/sharer.php?u=${u}`;
  $('#netThreads').href = `https://www.threads.com/intent/post?text=${m}&url=${u}`;
  $('#netTelegram').href = `https://t.me/share/url?url=${u}&text=${m}`;
  $('#netX').href = `https://x.com/intent/tweet?text=${m}&url=${u}`;
}
function hint(msg, link) {
  const h = $('#shareHint');
  h.textContent = msg;
  if (link) { const a = document.createElement('a'); a.href = link.href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = link.text; h.append(' ', a); }
  h.hidden = false;
}
/* chép chữ ngay trong cú bấm (kịp trước khi mở tab mới); không được thì dùng Clipboard API */
function copyNow(t) {
  const ta = document.createElement('textarea'), back = document.activeElement;
  ta.value = t; ta.setAttribute('readonly', ''); ta.setAttribute('aria-hidden', 'true');
  ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0';
  document.body.appendChild(ta);
  let ok = false;
  try { ta.focus({ preventScroll: true }); ta.select(); ta.setSelectionRange(0, t.length); ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  if (back && back.focus) { try { back.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ } }
  return ok;
}
function copyText(t) {
  if (copyNow(t)) return Promise.resolve(true);
  try { return navigator.clipboard.writeText(t).then(() => true, () => false); } catch (e) { return Promise.resolve(false); }
}
function sheet(app) {
  if (app) hint(`Chọn ${app} trong bảng chia sẻ của máy nhé.`);
  navigator.share({ title: SH.title, text: shareMsg(), url: SH.url })
    .then(() => hint('Gửi xong rồi. Rủ thêm ai nữa không?'))
    .catch(err => {
      if (err && err.name === 'AbortError') return;
      copyText(shareFull()).then(ok => hint(ok ? `Máy chưa mở được bảng chia sẻ. Lời rủ kèm link đã chép sẵn, bạn mở ${app || 'ứng dụng'} rồi dán vào nhé.` : 'Máy chưa mở được bảng chia sẻ. Bạn chép lời rủ ở trên rồi gửi nhé.'));
    });
}
$('#nets').addEventListener('click', e => {
  const el = e.target.closest('[data-net]'); if (!el) return;
  const k = el.dataset.net, app = APPS[k];
  if (k === 'threads' || k === 'telegram' || k === 'x') { refreshNets(); return; }
  if (k === 'instagram' || k === 'tiktok') { e.preventDefault(); shareImage(app.name); return; }
  if (k === 'more') {
    if (canNative()) sheet('');
    else copyText(SH.url).then(ok => hint(ok ? 'Đã chép link.' : 'Máy chưa cho chép tự động, bạn chép link ở trên nhé.'));
    return;
  }
  if (TOUCH && canNative()) { e.preventDefault(); sheet(app.name); return; }
  if (k === 'facebook') { refreshNets(); if (copyNow(shareMsg())) hint('Lời rủ đã chép sẵn: khi Facebook mở ra, dán vào ô viết bài là xong.'); return; }
  copyText(shareFull()).then(ok => hint(ok ? `Đã chép lời rủ kèm link. Mở ${app.name}, chọn bạn rồi dán (Ctrl+V) là xong.` : `Bạn chép lời rủ ở trên rồi dán vào ${app.name} nhé.`, { href: app.web, text: app.webName }));
});

/* ảnh khoe 1080×1920 (story) hoặc 1080×1350 (bài đăng), vẽ bằng canvas */
let card = null, cardJob = null;
const cardKey = () => [S.mode, S.mode === 'an' ? S.food : S.cur, S.fmt === 'post' ? 'post' : 'story', S.mode !== 'an' && doneToday(S.cur) ? 1 : 0].join('|');
const fileOk = f => { try { return !!(f && navigator.canShare && navigator.canShare({ files: [f] })); } catch (e) { return false; } };
function ensureCard() {
  const key = cardKey();
  if (card && card.key === key) return Promise.resolve(card);
  if (cardJob && cardJob.key === key) return cardJob.p;
  const p = drawCard().then(c => {
    if (cardJob && cardJob.key === key) cardJob = null;
    if (!c) return null;
    c.key = key;
    if (card && card.url && card.url.indexOf('blob:') === 0) URL.revokeObjectURL(card.url);
    card = c; putCard(); return c;
  }, () => { cardJob = null; return null; });
  cardJob = { key, p };
  return p;
}
function putCard() {
  const img = new Image(), dl = $('#btnSaveImg');
  img.alt = 'Ảnh quẻ để đăng lên mạng xã hội'; img.width = card.w; img.height = card.h;
  img.onerror = () => {
    img.onerror = null; if (!card.file) return;
    const r = new FileReader(); r.onload = () => { img.src = r.result; dl.href = r.result; }; r.readAsDataURL(card.file);
  };
  img.src = card.url;
  $('#cardBox').replaceChildren(img);
  dl.href = card.url; dl.download = card.name;
  $('#btnShareImg').hidden = !fileOk(card.file);
}
async function showCard(app) {
  $('#cardWrap').hidden = false;
  const c = await ensureCard();
  if (!c) { hint('Máy này chưa tạo được ảnh. Bạn chụp màn hình lá quẻ để đăng nhé.'); return; }
  hint(fileOk(c.file) ? `Ảnh xong rồi. Bấm “Gửi ảnh” rồi chọn ${app || 'ứng dụng muốn đăng'}.` : `Tải ảnh về rồi đăng lên ${app || 'story'} nhé, nhớ gắn link ${SH.url.replace('https://', '')}.`);
  $('#cardWrap').scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
}
function shareImage(app) {
  if (card && card.key === cardKey() && fileOk(card.file)) {
    if (app === 'Instagram' && copyNow(SH.url)) hint('Chọn Instagram rồi chọn Tin. Link đã chép sẵn: thêm nhãn dán Liên kết rồi dán vào.');
    else hint(`Chọn ${app} để đăng ảnh này nhé.`);
    navigator.share({ files: [card.file] }).catch(err => { if (!err || err.name !== 'AbortError') showCard(app); });
    return;
  }
  showCard(app);
}
let lastFocus = null;
const BEHIND = ['.top', 'main', '.foot'];
const setInert = on => BEHIND.forEach(s => { const el = $(s); if (el) el.inert = on; });
function openModal(m) { lastFocus = document.activeElement; m.hidden = false; document.body.classList.add('modal-open'); setInert(true); const f = $('[data-close]', m); if (f) f.focus(); }
function closeModal(m) { m.hidden = true; document.body.classList.remove('modal-open'); setInert(false); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
const renderFmt = () => $$('[data-fmt]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fmt === (S.fmt === 'post' ? 'post' : 'story'))));
function openShare(kind) {
  shareKind = kind === 'site' ? 'site' : 'item';
  SH = shareInfo();
  $('#shTitle').textContent = shareKind === 'site' ? 'Rủ bạn bè cùng chơi' : S.mode === 'an' ? 'Rủ bạn đi ăn' : (doneToday(S.cur) ? 'Khoe với bạn bè' : 'Rủ thêm người cùng làm');
  $('#shareText').value = SH.msg;
  const su = $('#shareUrl'); su.href = SH.url; su.textContent = SH.url.replace('https://', '');
  const more = $('#netMore'), nat = canNative();
  $('use', more).setAttribute('href', nat ? '#i-share' : '#i-link');
  $('span', more).textContent = nat ? 'Khác' : 'Chép link';
  $('#shareHint').hidden = true; $('#cardWrap').hidden = true;
  renderFmt(); refreshNets();
  openModal($('#shareModal'));
  if (kind === 'card') showCard('');
  else setTimeout(() => { if (!$('#shareModal').hidden) ensureCard(); }, 450);
}
$('#shareText').addEventListener('input', refreshNets);
$$('[data-fmt]').forEach(b => b.addEventListener('click', () => { S.fmt = b.dataset.fmt; save(); renderFmt(); showCard(''); }));
$('#btnShare').addEventListener('click', () => openShare('item'));
$('#btnCard').addEventListener('click', () => openShare('card'));
$('#btnInvite').addEventListener('click', () => openShare('site'));
$('#btnCard2').addEventListener('click', () => showCard(''));
$('#btnCopy').addEventListener('click', () => copyText(shareFull()).then(ok => {
  if (ok) { hint('Đã chép lời rủ kèm link. Dán vào Zalo, Messenger, bình luận hay story đều được.'); return; }
  const ta = $('#shareText'); ta.focus(); ta.select(); hint('Máy chưa cho chép tự động. Bạn nhấn giữ vào lời rủ để chép nhé.');
}));
$('#btnShareImg').addEventListener('click', () => {
  if (!card || !fileOk(card.file)) { hint('Thiết bị này chưa gửi ảnh trực tiếp được. Bấm Tải ảnh hoặc nhấn giữ ảnh để lưu nhé.'); return; }
  navigator.share({ files: [card.file] }).catch(err => { if (!err || err.name !== 'AbortError') hint('Chưa gửi được. Bấm Tải ảnh rồi đăng từ thư viện ảnh nhé.'); });
});
$$('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.closest('.modal'))));
$('#shareModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(e.currentTarget); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.modal').forEach(m => { if (!m.hidden) closeModal(m); }); });

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
async function drawCard() {
  const food = S.mode === 'an';
  const a = food ? foodById.get(S.food) : byId.get(S.cur); if (!a) return null;
  try { await Promise.all(['800 80px "Bricolage Grotesque"', 'italic 400 40px "Fraunces"', '600 30px "Be Vietnam Pro"'].map(f => document.fonts.load(f))); } catch (e) { /* dùng font dự phòng */ }
  const story = S.fmt !== 'post';
  const W = 1080, H = story ? 1920 : 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const RED = '#D02842', PAPER = '#FFF3EC', INK = '#241826', MUTED = '#6A5B6E', GOLD = '#E0A100', LINE = '#EBA7B2';
  const DISP = '"Bricolage Grotesque", "Be Vietnam Pro", sans-serif', BODY = '"Be Vietnam Pro", sans-serif', POEM = '"Fraunces", Georgia, serif';
  x.fillStyle = RED; x.fillRect(0, 0, W, H);
  x.fillStyle = PAPER; x.fillRect(64, 64, W - 128, H - 128);
  x.strokeStyle = RED; x.lineWidth = 4; x.strokeRect(84, 84, W - 168, H - 168);
  x.strokeStyle = LINE; x.lineWidth = 2; x.strokeRect(96, 96, W - 192, H - 192);
  const L = 140, R = W - 140, TW = R - L, y0 = story ? 300 : 180;
  x.textBaseline = 'alphabetic';
  x.fillStyle = RED; x.font = `600 28px ${BODY}`;
  if ('letterSpacing' in x) x.letterSpacing = '4px';
  x.fillText(food ? 'HÔM NAY ĂN GÌ?' : 'HÔM NAY LÀM GÌ?', L, y0);
  if ('letterSpacing' in x) x.letterSpacing = '0px';
  x.font = `800 64px ${DISP}`; x.fillText(`${food ? 'Quẻ ăn số' : 'Quẻ số'} ${String(a.id).padStart(3, '0')}`, L, y0 + 82);
  x.fillStyle = MUTED; x.font = `600 30px ${BODY}`; x.fillText(food ? MEAL_LV[curMeal()] : LVL(a.d), L, y0 + 132);
  // con dấu
  x.save(); x.translate(R - 82, y0 + 52); x.rotate(-5 * Math.PI / 180);
  x.fillStyle = RED; x.fillRect(-82, -82, 164, 164);
  x.strokeStyle = PAPER; x.lineWidth = 4; x.strokeRect(-70, -70, 140, 140);
  x.fillStyle = PAPER; x.textAlign = 'center'; x.font = `800 34px ${DISP}`;
  const seal = food ? FOOD_SEAL[a.o] : CATS[a.c].seal; x.fillText(seal[0], 0, -6); x.fillText(seal[1], 0, 38);
  x.restore(); x.textAlign = 'left';
  // tiêu đề + lời quẻ
  let y = y0 + (story ? 330 : 250);
  const TS = story ? 88 : 74, TL = story ? 104 : 88, PS = story ? 46 : 40, PL = story ? 64 : 56;
  x.fillStyle = INK; x.font = `800 ${TS}px ${DISP}`;
  for (const ln of wrapLines(x, a.t, TW, story ? 5 : 4)) { x.fillText(ln, L, y); y += TL; }
  y += 18; x.fillStyle = MUTED; x.font = `italic 400 ${PS}px ${POEM}`;
  for (const ln of wrapLines(x, a.n, TW, story ? 4 : 3)) { x.fillText(ln, L, y); y += PL; }
  y += 40;
  if (food) {
    x.fillStyle = MUTED; x.font = `600 32px ${BODY}`;
    x.fillText(`${FOOD_KIND[a.o]} · ${PURSE[a.k]} · ${REGION[a.r] || 'Cả nước'}`, L, y + 10);
  } else {
    for (let i = 0; i < 10; i++) { starPath(x, L + 26 + i * 62, y, 26); x.fillStyle = i < a.d ? GOLD : '#EADBD5'; x.fill(); }
    y += 74; x.fillStyle = MUTED; x.font = `600 32px ${BODY}`; x.fillText(`Độ khó ${a.d}/10 · ${a.d} sao`, L, y);
  }
  // dấu "đã làm"
  if (!food && doneToday(a.id)) {
    x.save(); x.translate(R - 150, H - (story ? 520 : 400)); x.rotate(-12 * Math.PI / 180);
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
  const name = `${food ? 'mon' : 'que'}-${a.id}-homnaylamgi.png`;
  return new Promise(res => {
    const viaData = () => { try { res({ url: c.toDataURL('image/png'), file: null, w: W, h: H, name }); } catch (e) { res(null); } };
    try {
      c.toBlob(b => {
        if (!b) { viaData(); return; }
        let file = null; try { file = new File([b], name, { type: 'image/png' }); } catch (e) { file = null; }
        res({ url: URL.createObjectURL(b), file, w: W, h: H, name });
      }, 'image/png');
    } catch (e) { viaData(); }
  });
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
if (S.prefDay !== TODAY) { Object.keys(S.pref).forEach(k => { S.pref[k] = Math.round(S.pref[k] * 92) / 100; }); S.prefDay = TODAY; }
WX = wxNow(); // thời tiết đã lưu (nếu còn mới) dùng luôn cho quẻ đầu tiên
let startMsg = '';
if (INV.k === 'q') {
  if (busy() && S.cur !== INV.id && !S.saved.includes(S.cur)) { S.saved = [S.cur].concat(S.saved).slice(0, 40); startMsg = 'Quẻ bạn đang làm đã được cất vào mục Để dành.'; }
  S.mode = 'lam';
  if (!(S.cur === INV.id && S.curDay === TODAY)) { lastRelax = []; setCur(INV.id); }
} else if (INV.k === 'an') { S.mode = 'an'; setFood(INV.id); }
let start = S.curDay === TODAY ? byId.get(S.cur) : null;
if (INV.k !== 'q' && start && !S.acc && !doneToday(start.id)) {
  if (start.ev && !ACTIVE_ITEMS.has(start.ev)) start = null;
  else if (S.f.when === 'now' && !start.g.includes(SLOT)) start = null;
}
if (!start) { const r = choose(0); lastRelax = r.relaxed; setCur(r.a.id); }
else if (S.curDay !== TODAY) S.acc = 0;
if (S.mealDay !== TODAY) { S.meal = ''; S.mealDay = ''; }
if (window.matchMedia && matchMedia('(min-width: 960px)').matches) $('#tune').open = true;
renderAll(); renderSoon(); setMode(S.mode); save();
if (startMsg) toast(startMsg);
if (S.wxOn && S.wxLoc) getWx(false);
document.addEventListener('visibilitychange', () => { if (!document.hidden && refreshClock() && S.wxOn && S.wxLoc) getWx(false); });
window.addEventListener('focus', refreshClock);
window.addEventListener('pageshow', e => { if (e.persisted) refreshClock(); });
if (DEPLOY && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* không có service worker thì trang vẫn chạy */ }); });
}
window.__hnlg = { choose, buildPool, eligible, chooseFood, setMode, state: () => S, CH, EVS, SLOT, A, F, sunSet, parseMet, wxNow, nearCity, wx: () => WX, weight, INV };
})();
