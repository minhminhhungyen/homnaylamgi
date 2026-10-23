/* Trang quản trị Hôm nay làm gì? — chạy trên /quan-tri/, gọi /api/*.php. Mọi chữ hiển thị đều được thoát HTML. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');
let CSRF = '', ME = null, BASE = null;

async function api(path, body, isForm) {
  const opt = { credentials: 'same-origin', headers: { 'X-CSRF': CSRF } };
  if (body !== undefined) { opt.method = 'POST'; if (isForm) opt.body = body; else { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; } }
  let r, j;
  try { r = await fetch(path, opt); j = await r.json(); } catch (e) { throw new Error('Không kết nối được máy chủ.'); }
  if (j.csrf) CSRF = j.csrf;
  if (!j.ok) { if (r.status === 401 || r.status === 403) { if (path.includes('admin.php')) showLogin(j.error); } throw new Error(j.error || 'Có lỗi xảy ra.'); }
  return j;
}
let tt = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; }, 3500); }
const fail = e => toast(e.message || String(e));
const dt = s => s ? String(s).slice(0, 16).replace('T', ' ') : '';
const toLocal = s => s ? String(s).slice(0, 16).replace(' ', 'T') : '';

/* ---------- đăng nhập ---------- */
function showLogin(err) {
  $('#nav').hidden = true; $('#who').hidden = true;
  app.innerHTML = `<form class="card login" id="lf"><h1>Đăng nhập quản trị</h1>${err ? `<p class="err">${esc(err)}</p>` : ''}
  <label for="le">Email</label><input id="le" type="email" autocomplete="username" required>
  <label for="lp">Mật khẩu</label><input id="lp" type="password" autocomplete="current-password" required>
  <p><button class="btn" type="submit">Đăng nhập</button></p><p class="muted"><a href="/#toi">Quên mật khẩu?</a></p></form>`;
  $('#lf').addEventListener('submit', async e => {
    e.preventDefault();
    try { const j = await api('/api/auth.php?action=login', { email: $('#le').value, password: $('#lp').value }); if (j.need2fa) { show2fa(); return; } if (j.user.role !== 'admin') { showLogin('Tài khoản này không có quyền quản trị.'); return; } start(); } catch (x) { showLogin(x.message); }
  });
}
function show2fa(err) {
  app.innerHTML = `<form class="card login" id="tf"><h1>Xác thực 2 bước</h1>${err ? `<p class="err">${esc(err)}</p>` : ''}<p class="muted">Mở ứng dụng Google Authenticator (hoặc ứng dụng tương tự) và nhập mã 6 số của Hôm nay làm gì?.</p>
  <label for="tc">Mã 6 số</label><input id="tc" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required>
  <p><button class="btn" type="submit">Xác nhận</button></p></form>`;
  $('#tc').focus();
  $('#tf').addEventListener('submit', async e => {
    e.preventDefault();
    try { const j = await api('/api/auth.php?action=2fa', { code: $('#tc').value }); if (j.user.role !== 'admin') { showLogin('Tài khoản này không có quyền quản trị.'); return; } start(); } catch (x) { if (/đăng nhập lại|từ đầu/.test(x.message)) showLogin(x.message); else show2fa(x.message); }
  });
}
async function start() {
  const j = await api('/api/auth.php?action=me');
  if (j.installed === false) { app.innerHTML = '<div class="card"><h1>Chưa cài đặt</h1><p>Mở <a href="/api/setup.php">/api/setup.php</a> để cài đặt lần đầu.</p></div>'; return; }
  if (!j.user || j.user.role !== 'admin') { showLogin(j.user ? 'Tài khoản này không có quyền quản trị.' : ''); return; }
  ME = j.user; $('#whoName').textContent = ME.name; $('#who').hidden = false; $('#nav').hidden = false;
  route();
}
$('#logout').addEventListener('click', async () => { try { await api('/api/auth.php?action=logout', {}); } catch (e) { /* bỏ qua */ } showLogin(); });

/* ---------- điều hướng ---------- */
const TABS = { 'tong-quan': overview, 'bai-viet': posts, 'thong-bao': notices, que: library, 'nguoi-dung': users, 'cai-dat': settings };
function route() {
  if (!ME) return;
  const [tab, arg] = (location.hash.slice(1) || 'tong-quan').split('/');
  const fn = TABS[tab] || overview;
  $$('#nav button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === (TABS[tab] ? tab : 'tong-quan') ? 'page' : 'false'));
  app.onclick = null;
  app.innerHTML = '<p class="muted">Đang tải…</p>';
  fn(arg).catch(fail);
}
$('#nav').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) location.hash = b.dataset.tab; });
addEventListener('hashchange', route);

/* ---------- tổng quan ---------- */
const ACT_NAME = { 'user-update': 'Sửa quyền người dùng', 'user-delete': 'Xóa người dùng', 'post-save': 'Lưu bài viết', 'post-delete': 'Xóa bài viết', upload: 'Tải ảnh', 'notice-save': 'Lưu thông báo', 'notice-delete': 'Xóa thông báo', 'lib-save': 'Lưu quẻ/món', 'lib-hide': 'Ẩn quẻ/món', 'lib-show': 'Hiện lại quẻ/món', 'lib-revert': 'Bỏ chỉnh sửa quẻ/món', settings: 'Đổi cài đặt', 'self-delete': 'Người dùng tự xóa tài khoản', 'reset-password': 'Đặt lại mật khẩu' };
async function overview() {
  const s = await api('/api/admin.php?action=stats');
  const box = (n, t) => `<div class="card stat"><b>${n}</b>${t}</div>`;
  app.innerHTML = `<h1>Tổng quan</h1><div class="grid">${box(s.users, 'người dùng')}${box(s.users7, 'đăng ký trong 7 ngày')}${box(s.active7, 'đăng nhập trong 7 ngày')}${box(s.posts, 'bài đã đăng')}${box(s.drafts, 'bài nháp')}${box(s.notices, 'thông báo đang chạy')}${box(s.lib, 'quẻ/món đã thêm, sửa, ẩn')}</div>
  <div class="card"><h2>Hoạt động gần đây</h2>${s.audit.length ? `<div class="tablewrap"><table><tr><th>Lúc</th><th>Ai</th><th>Việc</th><th>Chi tiết</th></tr>${s.audit.map(a => `<tr><td>${esc(dt(a.at))}</td><td>${esc(a.name || '—')}</td><td>${esc(ACT_NAME[a.action] || a.action)}</td><td>${esc(a.detail)}</td></tr>`).join('')}</table></div>` : '<p class="muted">Chưa có.</p>'}</div>`;
}

/* ---------- bài viết ---------- */
async function posts(id) {
  if (id) return postEdit(id === 'moi' ? 0 : +id);
  const j = await api('/api/admin.php?action=posts');
  app.innerHTML = `<div class="row"><h1 class="grow">Bài viết</h1><a class="btn" href="#bai-viet/moi">Viết bài mới</a></div>
  <div class="card">${j.rows.length ? `<div class="tablewrap"><table><tr><th>Tiêu đề</th><th>Trạng thái</th><th>Ngày đăng</th><th></th></tr>${j.rows.map(p => `<tr><td><a href="#bai-viet/${p.id}">${esc(p.title)}</a></td><td>${p.status === 'published' ? '<span class="pill ok">Đã đăng</span>' : '<span class="pill">Nháp</span>'}</td><td>${esc(dt(p.published_at))}</td><td>${p.status === 'published' ? `<a href="/bai-viet/${esc(p.slug)}" target="_blank" rel="noopener">Xem</a>` : ''}</td></tr>`).join('')}</table></div>` : '<p class="muted">Chưa có bài nào. Bấm “Viết bài mới”.</p>'}</div>`;
}
async function postEdit(id) {
  const p = id ? (await api('/api/admin.php?action=post&id=' + id)).post : { title: '', slug: '', summary: '', body: '', cover: '', status: 'draft', published_at: '' };
  app.innerHTML = `<p><a href="#bai-viet">← Danh sách bài</a></p><h1>${id ? 'Sửa bài viết' : 'Viết bài mới'}</h1>
  <form class="card" id="pf"><div class="split"><div>
  <label for="pt">Tiêu đề</label><input id="pt" type="text" maxlength="200" required value="${esc(p.title)}">
  <label for="ps">Đường dẫn (để trống sẽ tự tạo từ tiêu đề)</label><input id="ps" type="text" maxlength="120" value="${esc(p.slug)}" placeholder="vi-du-bai-viet">
  <label for="pm">Tóm tắt (hiện ở danh sách và khi chia sẻ)</label><textarea id="pm" maxlength="300">${esc(p.summary)}</textarea>
  <label>Ảnh bìa (tỉ lệ đẹp nhất 1200×630)</label><div class="row"><input type="file" id="pc" accept="image/jpeg,image/png,image/webp,image/gif"><button type="button" class="link" id="pcx">Bỏ ảnh</button></div><div id="pcv">${p.cover ? `<img class="cover" src="${esc(p.cover)}" alt="">` : ''}</div>
  <label for="pb">Nội dung</label><textarea id="pb" class="big">${esc(p.body)}</textarea>
  <p class="muted">Cách viết: để trống một dòng giữa các đoạn · <code>## Tiêu đề nhỏ</code> · <code>**đậm**</code> · <code>*nghiêng*</code> · <code>- gạch đầu dòng</code> · <code>&gt; trích dẫn</code> · <code>[chữ](https://link)</code>. Chèn ảnh: <input type="file" id="pi" accept="image/*"></p>
  </div><div><label>Xem trước</label><div class="preview" id="pv"></div>
  <label for="pst">Trạng thái</label><select id="pst"><option value="draft">Nháp (chưa ai thấy)</option><option value="published">Đăng</option></select>
  <label for="pd">Ngày giờ đăng (để trống là ngay bây giờ; đặt giờ tương lai để hẹn đăng)</label><input id="pd" type="datetime-local" value="${esc(toLocal(p.published_at))}">
  <p class="row"><button class="btn" type="submit">Lưu</button>${id ? '<button class="btn ghost" type="button" id="pdel">Xóa bài</button>' : ''}</p><p class="err" id="perr"></p></div></div></form>`;
  $('#pst').value = p.status;
  let cover = p.cover || '';
  const preview = async () => { try { const j = await api('/api/admin.php?action=preview', { body: $('#pb').value }); $('#pv').innerHTML = j.html; $('#perr').textContent = j.hit ? `Nội dung có cụm “${j.hit}” nằm trong danh sách chặn, sẽ không lưu được.` : ''; } catch (e) { /* bỏ qua */ } };
  let pt = 0; $('#pb').addEventListener('input', () => { clearTimeout(pt); pt = setTimeout(preview, 600); }); preview();
  const up = async file => { const fd = new FormData(); fd.append('file', file); const j = await api('/api/admin.php?action=upload', fd, true); return j.url; };
  $('#pc').addEventListener('change', async e => { if (!e.target.files[0]) return; try { cover = await up(e.target.files[0]); $('#pcv').innerHTML = `<img class="cover" src="${esc(cover)}" alt="">`; } catch (x) { fail(x); } });
  $('#pcx').addEventListener('click', () => { cover = ''; $('#pcv').innerHTML = ''; });
  $('#pi').addEventListener('change', async e => { if (!e.target.files[0]) return; try { const u = await up(e.target.files[0]); const ta = $('#pb'); ta.setRangeText(`\n![ảnh](${u})\n`, ta.selectionStart, ta.selectionEnd, 'end'); preview(); e.target.value = ''; } catch (x) { fail(x); } });
  $('#pf').addEventListener('submit', async e => {
    e.preventDefault(); $('#perr').textContent = '';
    try { const j = await api('/api/admin.php?action=post-save', { id, title: $('#pt').value, slug: $('#ps').value, summary: $('#pm').value, body: $('#pb').value, cover, status: $('#pst').value, published_at: $('#pd').value }); toast('Đã lưu bài viết.'); if (!id) location.hash = 'bai-viet/' + j.id; else route(); } catch (x) { $('#perr').textContent = x.message; }
  });
  if (id) $('#pdel').addEventListener('click', async () => { if (!confirm('Xóa hẳn bài viết này?')) return; try { await api('/api/admin.php?action=post-delete', { id }); toast('Đã xóa bài.'); location.hash = 'bai-viet'; } catch (x) { fail(x); } });
}

/* ---------- thông báo ---------- */
async function notices() {
  const j = await api('/api/admin.php?action=notices');
  const live = n => +n.active && (!n.starts_at || new Date(n.starts_at.replace(' ', 'T')) <= new Date()) && (!n.ends_at || new Date(n.ends_at.replace(' ', 'T')) >= new Date());
  app.innerHTML = `<h1>Thông báo trên trang chủ</h1><p class="muted">Hiện một dòng ở đầu trang chính. Nếu nhiều thông báo cùng chạy, trang hiện cái mới nhất.</p>
  <form class="card" id="nf"><input type="hidden" id="nid" value="0"><label for="nt">Nội dung (tối đa 300 ký tự)</label><textarea id="nt" maxlength="300" required></textarea>
  <label for="nl">Link khi bấm (tùy chọn, bắt đầu bằng https:// hoặc /)</label><input id="nl" type="text" maxlength="255" placeholder="/bai-viet/...">
  <div class="row"><div class="grow"><label for="ns">Bắt đầu (để trống: ngay)</label><input id="ns" type="datetime-local"></div><div class="grow"><label for="ne">Kết thúc (để trống: không hết hạn)</label><input id="ne" type="datetime-local"></div></div>
  <label class="row"><input type="checkbox" id="na" checked> Đang bật</label><p class="row"><button class="btn" type="submit">Lưu thông báo</button><button class="btn ghost" type="reset" id="nr">Tạo mới</button></p><p class="err" id="nerr"></p></form>
  <div class="card"><ul class="list">${j.rows.map(n => `<li><span>${live(n) ? '<span class="pill ok">Đang hiện</span>' : '<span class="pill">Không hiện</span>'} ${esc(n.text)}<br><span class="muted">${esc(dt(n.starts_at) || 'ngay')} → ${esc(dt(n.ends_at) || 'không hết hạn')}</span></span><span class="row"><button class="link" data-ed="${n.id}">Sửa</button><button class="link" data-del="${n.id}">Xóa</button></span></li>`).join('') || '<li class="muted">Chưa có thông báo.</li>'}</ul></div>`;
  const byId = new Map(j.rows.map(n => [String(n.id), n]));
  app.onclick = async e => {
    const ed = e.target.closest('[data-ed]'), del = e.target.closest('[data-del]');
    if (ed) { const n = byId.get(ed.dataset.ed); $('#nid').value = n.id; $('#nt').value = n.text; $('#nl').value = n.link; $('#ns').value = toLocal(n.starts_at); $('#ne').value = toLocal(n.ends_at); $('#na').checked = !!+n.active; scrollTo(0, 0); }
    if (del && confirm('Xóa thông báo này?')) { try { await api('/api/admin.php?action=notice-delete', { id: +del.dataset.del }); toast('Đã xóa.'); route(); } catch (x) { fail(x); } }
  };
  $('#nr').addEventListener('click', () => { $('#nid').value = 0; });
  $('#nf').addEventListener('submit', async e => {
    e.preventDefault();
    try { await api('/api/admin.php?action=notice-save', { id: +$('#nid').value, text: $('#nt').value, link: $('#nl').value, starts_at: $('#ns').value, ends_at: $('#ne').value, active: $('#na').checked }); toast('Đã lưu thông báo.'); route(); } catch (x) { $('#nerr').textContent = x.message; }
  });
}

/* ---------- quẻ & món ---------- */
const CATS = { vd: 'Vận động', kp: 'Khám phá', st: 'Sáng tạo', hh: 'Học hỏi', kn: 'Kết nối', cm: 'Chăm mình', au: 'Ăn uống', sn: 'Sự nghiệp, tiền bạc', tt: 'Sống tử tế', gt: 'Giải trí' };
const AI = { a: 'Một mình', b: 'Bạn bè', y: 'Người yêu', g: 'Gia đình' }, PLACE = { i: 'Trong nhà', o: 'Ra ngoài', b: 'Đâu cũng được' };
const SLOTS = { s: 'Sáng 5–11h', c: 'Chiều 11–17h', t: 'Tối 17–22h', k: 'Khuya 22–5h' }, MOODS = { c: 'Chán', b: 'Buồn', m: 'Mệt', x: 'Căng thẳng', l: 'Cô đơn', h: 'Hứng khởi' };
const COST = ['0 đồng', 'Dưới 100k', '100k–300k', 'Trên 300k'], MEALS = { s: 'Sáng', c: 'Trưa', t: 'Tối', k: 'Khuya', v: 'Ăn vặt' }, FKIND = { n: 'Ăn ngoài', h: 'Tự nấu', nh: 'Cả hai' };
const REG = { '': 'Cả nước', B: 'Miền Bắc', T: 'Miền Trung', N: 'Miền Nam', TN: 'Trung, Nam' }, WARM = { '': 'Không', n: 'Món nóng', m: 'Món mát' };
const EVS = { '': 'Không', halloween: 'Halloween', 2011: '20/11', noel: 'Giáng sinh', tet: 'Tết', trungthu: 'Trung thu', phunu: '8/3, 20/10', valentine: 'Valentine', giadinh: 'Ngày Gia đình', thieunhi: '1/6', giaothua: 'Giao thừa', ram: 'Rằm, mùng Một', cathangtu: 'Cá tháng Tư', doan: '26/3', nghile: 'Nghỉ lễ' };
const XT = { cuoituan: 'Cuối tuần', canngay: 'Cả ngày', xuan: 'Xuân', he: 'Hạ', thu: 'Thu', dong: 'Đông', ram: 'Rằm', vulan: 'Vu Lan', 2011: '20/11', hoanghon: 'Hoàng hôn', sao: 'Ngắm sao' };
let LIB = null;
async function loadLib() {
  if (!BASE) { const r = await fetch('/data/library.json', { cache: 'no-cache' }); BASE = await r.json(); }
  const j = await api('/api/admin.php?action=lib');
  const over = { q: new Map(), an: new Map() };
  for (const r of j.rows) over[r.kind].set(+r.id, r);
  const merged = k => { const m = new Map(BASE[k].map(x => [x.id, { item: x, state: 'goc' }])); for (const [id, r] of over[k]) { if (r.data) m.set(id, { item: r.data, state: id > j.base[k] ? 'moi' : 'sua', hidden: !!+r.hidden }); else if (m.has(id)) m.get(id).hidden = !!+r.hidden; } return m; };
  LIB = { q: merged('q'), an: merged('an'), over, base: j.base };
}
async function library(arg) {
  await loadLib();
  if (arg) { const [k, id] = arg.split('-'); return libEdit(k === 'an' ? 'an' : 'q', +id || 0); }
  app.innerHTML = `<div class="row"><h1 class="grow">Quẻ &amp; món</h1><a class="btn" href="#que/q-0">Thêm quẻ</a><a class="btn soft" href="#que/an-0">Thêm món</a></div>
  <p class="muted">Sửa hoặc ẩn ở đây thì người dùng thấy thay đổi từ lần mở trang sau. Quẻ mới phải qua cùng chốt an toàn như thư viện gốc.</p>
  <div class="card"><div class="row"><select id="lk"><option value="q">Quẻ việc (${LIB.q.size})</option><option value="an">Món ăn (${LIB.an.size})</option></select><input class="grow" type="search" id="ls" placeholder="Tìm theo số hoặc tên…"><select id="lf"><option value="">Tất cả</option><option value="doi">Đã thêm, sửa hoặc ẩn</option><option value="an">Đang ẩn</option></select></div>
  <div class="tablewrap"><table id="lt"></table></div></div>`;
  const draw = () => {
    const k = $('#lk').value, s = $('#ls').value.trim().toLowerCase(), f = $('#lf').value;
    let rows = [...LIB[k].entries()].sort((a, b) => b[0] - a[0]);
    if (s) rows = rows.filter(([id, r]) => String(id) === s || r.item.t.toLowerCase().includes(s));
    if (f === 'doi') rows = rows.filter(([, r]) => r.state !== 'goc' || r.hidden); if (f === 'an') rows = rows.filter(([, r]) => r.hidden);
    const st = r => (r.hidden ? '<span class="pill">Đang ẩn</span> ' : '') + (r.state === 'moi' ? '<span class="pill ok">Mới</span>' : r.state === 'sua' ? '<span class="pill ok">Đã sửa</span>' : '');
    $('#lt').innerHTML = `<tr><th>Số</th><th>Tên</th><th>${k === 'q' ? 'Nhóm' : 'Kiểu'}</th><th></th></tr>` + rows.slice(0, 200).map(([id, r]) => `<tr><td>${id}</td><td><a href="#que/${k}-${id}">${esc(r.item.t)}</a></td><td>${esc(k === 'q' ? CATS[r.item.c] : FKIND[r.item.o])}</td><td>${st(r)}</td></tr>`).join('') + (rows.length > 200 ? `<tr><td colspan="4" class="muted">Còn ${rows.length - 200} mục, gõ để tìm.</td></tr>` : '');
  };
  ['#lk', '#ls', '#lf'].forEach(s => $(s).addEventListener('input', draw)); draw();
}
const chips = (name, map, val) => `<div class="chips">${Object.entries(map).map(([k, v]) => `<label><input type="checkbox" name="${name}" value="${k}"${val.includes(k) ? ' checked' : ''}>${esc(v)}</label>`).join('')}</div>`;
const sel = (id, map, val) => `<select id="${id}">${Object.entries(map).map(([k, v]) => `<option value="${esc(k)}"${String(val) === k ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select>`;
function libEdit(kind, id) {
  const cur = id ? LIB[kind].get(id) : null;
  if (id && !cur) { app.innerHTML = '<p>Không tìm thấy.</p>'; return; }
  const it = cur ? cur.item : (kind === 'q' ? { c: 'vd', t: '', n: '', s: '', p: 30, k: 0, ai: 'a', o: 'b', g: 'sct', m: 'c', d: 3 } : { t: '', n: '', b: 't', o: 'nh', r: '', k: 1 });
  const head = `<p><a href="#que">← Danh sách</a></p><h1>${id ? `${kind === 'q' ? 'Quẻ' : 'Món'} số ${id}` : kind === 'q' ? 'Thêm quẻ mới' : 'Thêm món mới'}</h1>`;
  const common = `<label for="ft">Tên</label><input id="ft" type="text" maxlength="90" value="${esc(it.t)}"><label for="fn">Lời quẻ (in lên ảnh chia sẻ, phải đọc riêng vẫn ấm áp, an toàn)</label><textarea id="fn" maxlength="160">${esc(it.n)}</textarea>`;
  const body = kind === 'q' ? `${common}<label for="fs">Bước bắt đầu</label><textarea id="fs" maxlength="300">${esc(it.s)}</textarea>
    <div class="row"><div class="grow"><label for="fc">Nhóm</label>${sel('fc', CATS, it.c)}</div><div class="grow"><label for="fo">Nơi</label>${sel('fo', PLACE, it.o)}</div><div class="grow"><label for="fk">Chi phí</label>${sel('fk', Object.fromEntries(COST.map((v, i) => [i, v])), it.k)}</div></div>
    <div class="row"><div class="grow"><label for="fp">Số phút</label><input id="fp" type="number" min="1" max="1440" value="${it.p}"></div><div class="grow"><label for="fd">Độ khó 1–10 (= số sao)</label><input id="fd" type="number" min="1" max="10" value="${it.d}"></div><div class="grow"><label for="fe">Chỉ hiện quanh dịp</label>${sel('fe', EVS, it.ev || '')}</div></div>
    <label>Đi cùng</label>${chips('ai', AI, it.ai)}<label>Khung giờ</label>${chips('g', SLOTS, it.g)}<label>Tâm trạng hợp</label>${chips('m', MOODS, it.m)}<label>Nhãn phụ</label>${chips('x', XT, (it.x || '').split(' '))}
    <label class="row"><input type="checkbox" id="fch"${it.ch ? ' checked' : ''}> Có thể làm thử thách chung (độ khó ≤ 5, dưới 100k, có sáng và tối, không bắt ra ngoài)</label>`
    : `${common}<label>Bữa</label>${chips('b', MEALS, it.b)}<div class="row"><div class="grow"><label for="fo">Kiểu</label>${sel('fo', FKIND, it.o)}</div><div class="grow"><label for="fr">Vùng miền</label>${sel('fr', REG, it.r || '')}</div><div class="grow"><label for="fk">Chi phí</label>${sel('fk', Object.fromEntries(COST.map((v, i) => [i, v])), it.k)}</div><div class="grow"><label for="fw">Nóng/mát</label>${sel('fw', WARM, it.w || '')}</div></div>`;
  app.innerHTML = `${head}<form class="card" id="qf">${body}<p class="err" id="qerr"></p><p class="row"><button class="btn" type="submit">Lưu</button>${id ? `<button class="btn ghost" type="button" id="qh">${cur.hidden ? 'Hiện lại' : 'Ẩn khỏi trang'}</button>` : ''}${cur && cur.state !== 'goc' ? '<button class="btn ghost" type="button" id="qr">Bỏ chỉnh sửa</button>' : ''}${id ? `<a href="/${kind}/${id}" target="_blank" rel="noopener">Xem link</a>` : ''}</p></form>`;
  const pick = n => $$(`input[name="${n}"]:checked`).map(x => x.value).join('');
  $('#qf').addEventListener('submit', async e => {
    e.preventDefault(); $('#qerr').textContent = '';
    const data = kind === 'q'
      ? { c: $('#fc').value, t: $('#ft').value, n: $('#fn').value, s: $('#fs').value, p: +$('#fp').value, k: +$('#fk').value, ai: pick('ai'), o: $('#fo').value, g: pick('g'), m: pick('m'), d: +$('#fd').value, ch: $('#fch').checked, ev: $('#fe').value, x: $$('input[name="x"]:checked').map(x => x.value).join(' ') }
      : { t: $('#ft').value, n: $('#fn').value, b: pick('b'), o: $('#fo').value, r: $('#fr').value, k: +$('#fk').value, w: $('#fw').value };
    try { const j = await api('/api/admin.php?action=lib-save', { kind, id, data }); toast('Đã lưu.'); location.hash = `que/${kind}-${j.id}`; route(); } catch (x) { $('#qerr').textContent = x.message; }
  });
  if (id) $('#qh').addEventListener('click', async () => { try { await api('/api/admin.php?action=lib-hide', { kind, id, hidden: !cur.hidden }); toast(cur.hidden ? 'Đã hiện lại.' : 'Đã ẩn.'); route(); } catch (x) { fail(x); } });
  const qr = $('#qr'); if (qr) qr.addEventListener('click', async () => { if (!confirm(cur.state === 'moi' ? 'Xóa hẳn mục mới này?' : 'Trở về bản gốc của thư viện?')) return; try { await api('/api/admin.php?action=lib-revert', { kind, id }); toast('Đã bỏ chỉnh sửa.'); location.hash = 'que'; } catch (x) { fail(x); } });
}

/* ---------- người dùng ---------- */
async function users() {
  app.innerHTML = `<h1>Người dùng</h1><div class="card"><div class="row"><input class="grow" type="search" id="us" placeholder="Tìm theo email hoặc tên…"></div><div class="tablewrap"><table id="ut"></table></div><div class="row" id="upg"></div></div>`;
  let page = 1;
  const draw = async () => {
    const j = await api(`/api/admin.php?action=users&page=${page}&q=${encodeURIComponent($('#us').value.trim())}`);
    $('#ut').innerHTML = `<tr><th>Tên</th><th>Email</th><th>Đăng ký</th><th>Lần cuối</th><th>Quyền</th><th>Trạng thái</th><th></th></tr>` + j.rows.map(u => `<tr data-id="${u.id}"><td>${esc(u.name)}</td><td>${esc(u.email || '(Google)')} ${+u.email_verified ? '<span class="pill ok">đã xác nhận</span>' : ''} ${+u.google ? '<span class="pill">Google</span>' : ''}</td><td>${esc(dt(u.created_at))}</td><td>${esc(dt(u.last_login))}</td>
      <td><select data-f="role"${+u.id === ME.id ? ' disabled' : ''}><option value="user"${u.role === 'user' ? ' selected' : ''}>Người dùng</option><option value="admin"${u.role === 'admin' ? ' selected' : ''}>Quản trị</option></select></td>
      <td><select data-f="status"${+u.id === ME.id ? ' disabled' : ''}><option value="active"${u.status === 'active' ? ' selected' : ''}>Hoạt động</option><option value="locked"${u.status === 'locked' ? ' selected' : ''}>Khóa</option></select></td>
      <td>${+u.id === ME.id ? '<span class="muted">Bạn</span>' : '<button class="link" data-del>Xóa</button>'}</td></tr>`).join('');
    const pages = Math.ceil(j.total / j.per);
    $('#upg').innerHTML = `<span class="muted">${j.total} người dùng</span>${page > 1 ? '<button class="link" data-pg="-1">← Trước</button>' : ''}${page < pages ? '<button class="link" data-pg="1">Sau →</button>' : ''}`;
  };
  let st = 0; $('#us').addEventListener('input', () => { clearTimeout(st); st = setTimeout(() => { page = 1; draw().catch(fail); }, 300); });
  $('#upg').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b) { page += +b.dataset.pg; draw().catch(fail); } });
  $('#ut').addEventListener('change', async e => {
    const tr = e.target.closest('tr'); if (!tr) return;
    const id = +tr.dataset.id, role = $('[data-f="role"]', tr).value, status = $('[data-f="status"]', tr).value;
    if (role === 'admin' && !confirm('Cấp quyền quản trị cho người này? Họ sẽ sửa được mọi thứ ở trang quản trị.')) { draw(); return; }
    try { await api('/api/admin.php?action=user-update', { id, role, status }); toast('Đã cập nhật.'); } catch (x) { fail(x); draw(); }
  });
  $('#ut').addEventListener('click', async e => {
    if (!e.target.closest('[data-del]')) return;
    const tr = e.target.closest('tr');
    if (!confirm('Xóa hẳn tài khoản này? Không khôi phục được.')) return;
    try { await api('/api/admin.php?action=user-delete', { id: +tr.dataset.id }); toast('Đã xóa.'); draw(); } catch (x) { fail(x); }
  });
  await draw();
}

/* ---------- cài đặt ---------- */
async function settings() {
  const s = await api('/api/admin.php?action=settings');
  app.innerHTML = `<h1>Cài đặt</h1><form class="card" id="sf"><label for="sg">Google Client ID (đăng nhập bằng Google)</label><input id="sg" type="text" value="${esc(s.google_client_id)}" placeholder="…apps.googleusercontent.com">
  <p class="muted">Tạo trong Google Cloud Console → APIs &amp; Services → Credentials → OAuth client ID, loại Web application, thêm “Authorized JavaScript origins”: ${esc(s.site_url)}. Để trống là tắt đăng nhập Google.</p>
  <p class="muted">Thư gửi đi từ: ${esc(s.mail_from)}. Cần tạo hộp thư này (hoặc bật email cho tên miền) trong hPanel để thư xác nhận và quên mật khẩu không bị vào Spam.</p>
  <p><button class="btn" type="submit">Lưu</button></p><p class="err" id="serr"></p></form>
  <div class="card" id="tfa"><h2>Xác thực 2 bước cho tài khoản của bạn</h2>${s.twofa
    ? `<p><span class="pill ok">Đang bật</span> Mỗi lần đăng nhập cần thêm mã 6 số từ điện thoại.</p><details><summary>Tắt xác thực 2 bước</summary><form id="tfOff"><label for="tfp">Mật khẩu</label><input id="tfp" type="password" autocomplete="current-password" required><label for="tfc">Mã 6 số hiện tại</label><input id="tfc" type="text" inputmode="numeric" maxlength="7" required><p><button class="btn ghost" type="submit">Tắt</button></p><p class="err" id="tferr"></p></form></details>`
    : `<p><span class="pill">Chưa bật</span> Nên bật: kể cả khi lộ mật khẩu, người khác vẫn không vào được trang quản trị nếu không có điện thoại của bạn.</p><p><button class="btn" type="button" id="tfOn">Bật xác thực 2 bước</button></p><div id="tfSetup"></div>`}
  ${s.admins_no2fa ? `<p class="muted">Hiện có ${s.admins_no2fa} tài khoản quản trị chưa bật xác thực 2 bước.</p>` : ''}</div>`;
  $('#sf').addEventListener('submit', async e => { e.preventDefault(); try { await api('/api/admin.php?action=settings', { google_client_id: $('#sg').value.trim() }); toast('Đã lưu cài đặt.'); } catch (x) { $('#serr').textContent = x.message; } });
  const on = $('#tfOn');
  if (on) on.addEventListener('click', async () => {
    try {
      const j = await api('/api/admin.php?action=totp-begin', {});
      let img = '';
      try { const qr = qrcode(0, 'M'); qr.addData(j.uri); qr.make(); img = `<img src="${qr.createDataURL(5, 8)}" alt="Mã QR để quét bằng ứng dụng xác thực" width="240" height="240">`; } catch (e) { img = ''; }
      $('#tfSetup').innerHTML = `<ol><li>Cài ứng dụng Google Authenticator (hoặc Microsoft Authenticator) trên điện thoại.</li><li>Quét mã QR này, hoặc nhập tay khóa: <code>${esc(j.secret.replace(/(.{4})/g, '$1 ').trim())}</code></li><li>Nhập mã 6 số ứng dụng hiện ra.</li></ol>${img}
        <form id="tfEn"><label for="tfn">Mã 6 số</label><input id="tfn" type="text" inputmode="numeric" maxlength="7" required><p><button class="btn" type="submit">Xác nhận và bật</button></p><p class="err" id="tfnerr"></p></form>`;
      $('#tfEn').addEventListener('submit', async e => { e.preventDefault(); try { await api('/api/admin.php?action=totp-enable', { code: $('#tfn').value }); toast('Đã bật xác thực 2 bước.'); route(); } catch (x) { $('#tfnerr').textContent = x.message; } });
    } catch (x) { fail(x); }
  });
  const off = $('#tfOff');
  if (off) off.addEventListener('submit', async e => { e.preventDefault(); try { await api('/api/admin.php?action=totp-disable', { password: $('#tfp').value, code: $('#tfc').value }); toast('Đã tắt xác thực 2 bước.'); route(); } catch (x) { $('#tferr').textContent = x.message; } });
}

start().catch(e => { app.innerHTML = `<div class="card"><p class="err">${esc(e.message)}</p></div>`; });
})();
