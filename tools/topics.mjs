// Trang chủ đề (/chu-de/...) và khối liên kết chủ đề trên trang chủ, trang "Hôm nay ăn gì?".
// Mỗi trang có lời giới thiệu riêng và 30 gợi ý chọn từ thư viện (đã qua chốt an toàn khi build),
// chọn cố định theo mã băm để nội dung không đổi giữa các lần build. Không làm trang hàng loạt:
// 3.000 trang quẻ, món lẻ vẫn để noindex, chỉ các trang tổng hợp này cho tìm kiếm xếp hạng.
import { createHash } from 'node:crypto';

const CAT = { vd: 'Vận động', kp: 'Khám phá', st: 'Sáng tạo', hh: 'Học hỏi', kn: 'Kết nối', cm: 'Chăm mình', au: 'Ăn uống', sn: 'Sự nghiệp', tt: 'Tử tế', gt: 'Giải trí' };
const LVL = d => (d <= 3 ? 'Nhẹ nhàng' : d <= 6 ? 'Vừa sức' : 'Thử thách');
const COST = ['0 đồng', 'Dưới 100k', '100k–300k', 'Trên 300k'];
const WHERE = { i: 'Trong nhà', o: 'Ra ngoài', b: 'Đâu cũng được' };
const WHO = { a: 'một mình', b: 'bạn bè', y: 'người yêu', g: 'gia đình' };
const fmtWho = s => { if (s.length >= 4) return 'Ai cũng được'; const t = s.split('').map(c => WHO[c]).join(', '); return t[0].toUpperCase() + t.slice(1); };
const fmtTime = p => (p < 60 ? `${p} phút` : p % 60 === 0 ? `${p / 60} tiếng` : p % 60 === 30 ? `${(p - 30) / 60} tiếng rưỡi` : `${Math.floor(p / 60)} tiếng ${p % 60} phút`);
const MEAL = { s: 'sáng', c: 'trưa', t: 'tối', k: 'khuya', v: 'ăn vặt' };
const KIND = { n: 'Ăn ngoài', h: 'Tự nấu', nh: 'Ăn ngoài hoặc tự nấu' };
const REGION = { '': 'Cả nước', B: 'Miền Bắc', T: 'Miền Trung', N: 'Miền Nam', TN: 'Miền Trung, miền Nam' };
const PURSE = ['', 'Bình dân', 'Vừa phải', 'Hơi sang'];
const xs = a => (a.x ? a.x.split(' ') : []);
/* món nước ngoài nằm ở số 891–1000 trong FOODS: không đưa vào trang “cơm nhà” */
const FOREIGN = f => f.id >= 891 && f.id <= 1000;
/* nhóm việc hợp chủ đề vui, thư giãn (bỏ việc giấy tờ, nghề nghiệp, việc công ích khô khan) */
const FUN = a => !['sn', 'tt'].includes(a.c);

export const TOPICS = [
  { slug: 'mon-ngon-mien-bac', kind: 'an', short: 'Món ngon miền Bắc',
    title: 'Món ngon miền Bắc: 30 gợi ý cho hôm nay ăn gì',
    desc: '30 món miền Bắc cho bữa sáng, trưa, tối và ăn vặt: phở, bún, bánh cuốn, cơm nhà. Bấm một cái để rút món hợp bữa.',
    intro: 'Từ bát phở buổi sáng, suất bún trưa đến mâm cơm nhà buổi tối, miền Bắc có cả kho món ngon mà nhiều khi vẫn không biết chọn gì. Dưới đây là 30 gợi ý, có cả món ăn ngoài lẫn món tự nấu được. Muốn để may rủi quyết, bấm nút để rút một món hợp bữa sắp tới.',
    pick: f => f.r.includes('B'), cta: '/hom-nay-an-gi?reg=B', ctaText: 'Rút một món miền Bắc' },
  { slug: 'mon-ngon-mien-trung', kind: 'an', short: 'Món ngon miền Trung',
    title: 'Món ngon miền Trung: 30 gợi ý đậm vị Huế, Quảng, Nghệ',
    desc: '30 món miền Trung: bún bò Huế, mì Quảng, bánh bèo, cơm hến và nhiều món dân dã. Bấm một cái để rút món hợp bữa.',
    intro: 'Món miền Trung nổi tiếng cay nồng, đậm đà, nhiều món nhỏ xinh ăn hoài không chán. Danh sách dưới đây trải từ món sáng, món sợi đến món ăn chơi buổi chiều. Ở xa miền Trung thì chọn món tự nấu được, ở gần thì rủ bạn đi ăn luôn.',
    pick: f => f.r.includes('T'), cta: '/hom-nay-an-gi?reg=T', ctaText: 'Rút một món miền Trung' },
  { slug: 'mon-ngon-mien-nam', kind: 'an', short: 'Món ngon miền Nam',
    title: 'Món ngon miền Nam: 30 gợi ý cơm tấm, hủ tiếu, bánh xèo',
    desc: '30 món miền Nam cho bữa sáng, trưa, tối và ăn vặt: cơm tấm, hủ tiếu, bánh xèo, canh chua. Bấm một cái để rút món hợp bữa.',
    intro: 'Miền Nam có vị ngọt dịu, nhiều rau và nhiều món ăn vặt hấp dẫn. Từ dĩa cơm tấm sáng sớm, tô hủ tiếu đến nồi canh chua mát bụng, đây là 30 gợi ý cho những lúc không biết ăn gì.',
    pick: f => f.r.includes('N'), cta: '/hom-nay-an-gi?reg=N', ctaText: 'Rút một món miền Nam' },
  { slug: 'mon-chay', kind: 'an', short: 'Món chay',
    title: 'Món chay dễ ăn: 30 gợi ý cho ngày rằm, mùng một',
    desc: '30 món chay ăn ngoài hoặc tự nấu: phở chay, bún riêu chay, đậu phụ, nấm, chè. Không thịt, cá, trứng. Bấm để rút món chay hợp bữa.',
    intro: 'Ngày rằm, mùng một, hay đơn giản là muốn một bữa nhẹ bụng: món chay ngày nay đa dạng hơn nhiều người nghĩ. Các món dưới đây không có thịt, cá, trứng, nước mắm hay dầu hào trong cách nấu thông thường. Ai ăn chay kỹ (kiêng hành tỏi) thì hỏi lại quán hoặc tự điều chỉnh khi nấu.',
    pick: f => !!f.v && !/^(Nước|Sinh tố|Sữa)/.test(f.t), cta: '/hom-nay-an-gi?chay=1', ctaText: 'Rút một món chay' },
  { slug: 'com-nha-de-nau', kind: 'an', short: 'Tối nay ăn gì: cơm nhà',
    title: 'Tối nay ăn gì? 30 món cơm nhà dễ nấu',
    desc: 'Tối nay ăn gì? 30 món cơm nhà dễ nấu, nguyên liệu dễ mua: canh, xào, kho, rau. Bấm để rút một món cho bữa tối.',
    intro: 'Đi làm về mệt, mở tủ lạnh ra lại không biết nấu gì. Danh sách này gom 30 món cơm nhà quen thuộc, nguyên liệu dễ mua ở chợ gần nhà, phần lớn nấu trong nửa tiếng. Mỗi món có nút xem cách nấu khi bạn rút trên trang.',
    pick: f => f.o === 'h' && f.b.includes('t') && f.b.includes('c') && !f.b.includes('v') && !FOREIGN(f), cta: '/hom-nay-an-gi?bua=t&kieu=h', ctaText: 'Rút một món cho bữa tối' },
  { slug: 'an-sang', kind: 'an', short: 'Sáng nay ăn gì',
    title: 'Sáng nay ăn gì? 30 món ăn sáng ba miền',
    desc: 'Sáng nay ăn gì? 30 món ăn sáng: xôi, bánh mì, phở, bún, cháo, món tự làm nhanh. Bấm để rút một món cho bữa sáng.',
    intro: 'Bữa sáng nên nhanh, no vừa và đừng lặp lại mãi một món. Đây là 30 gợi ý từ xôi, bánh mì, bún phở ngoài hàng đến vài món tự làm trong mười phút trước giờ đi học, đi làm.',
    pick: f => f.b.includes('s'), cta: '/hom-nay-an-gi?bua=s', ctaText: 'Rút một món ăn sáng' },
  { slug: 'cuoi-tuan-lam-gi', kind: 'lam', short: 'Cuối tuần làm gì',
    title: 'Cuối tuần làm gì? 30 ý tưởng cho hai ngày nghỉ',
    desc: 'Cuối tuần làm gì cho vui mà không tốn nhiều? 30 ý tưởng đi chơi, ở nhà, cùng bạn bè, gia đình. Bấm để rút một việc cho hôm nay.',
    intro: 'Hai ngày nghỉ trôi qua rất nhanh nếu chỉ nằm lướt điện thoại. Không cần kế hoạch to tát, chỉ cần một việc nhỏ khác ngày thường: một chuyến đi gần, một món tự làm, một buổi gặp người thân. Mỗi gợi ý có bước bắt đầu ngay, thời gian và chi phí ước tính.',
    pick: a => xs(a).includes('cuoituan'), cta: '/?lau=240', ctaText: 'Rút một việc cho cuối tuần' },
  { slug: 'o-nha-lam-gi', kind: 'lam', short: 'Ở nhà làm gì cho đỡ chán',
    title: 'Ở nhà làm gì cho đỡ chán? 30 việc nhỏ trong nhà',
    desc: 'Ở nhà làm gì cho đỡ chán? 30 việc nhỏ làm ngay trong nhà: vận động nhẹ, học một điều mới, dọn dẹp, nấu ăn, giải trí.',
    intro: 'Ở nhà cả ngày dễ thấy chán, nhưng không cần ra ngoài mới có chuyện vui. Đây là 30 việc nhỏ làm được ngay trong nhà, từ vài phút đến vài tiếng, phần lớn không tốn tiền. Chọn một việc, làm xong rồi tính tiếp.',
    pick: a => a.o === 'i' && FUN(a), cta: '/?noi=i', ctaText: 'Rút một việc làm trong nhà' },
  { slug: 'hen-ho-lam-gi', kind: 'lam', short: 'Hẹn hò làm gì',
    title: 'Hẹn hò làm gì? 30 ý tưởng cho hai người',
    desc: 'Hẹn hò làm gì ngoài đi cà phê? 30 ý tưởng cho hai người: đi dạo, nấu ăn, học cùng nhau, chơi trò chơi, ở nhà vẫn vui.',
    intro: 'Đi cà phê mãi cũng nhạt. Danh sách này gợi ý 30 việc hai người làm cùng nhau, có việc ra ngoài, có việc ở nhà, có việc gần như không tốn tiền. Điều quan trọng là cùng nhau thử một điều mới.',
    pick: a => a.ai.includes('y') && a.ai.length < 4 && !['sn', 'tt', 'hh', 'cm'].includes(a.c), cta: '/?ai=y', ctaText: 'Rút một việc cho hai người' },
  { slug: 'viec-vui-khong-ton-tien', kind: 'lam', short: 'Việc vui không tốn tiền',
    title: '30 việc vui không tốn đồng nào',
    desc: '30 việc vui không tốn đồng nào: vận động, học hỏi, sáng tạo, kết nối, chăm sóc bản thân. Bấm để rút một việc 0 đồng cho hôm nay.',
    intro: 'Vui không nhất thiết phải tốn tiền. Mỗi việc dưới đây có chi phí ước tính 0 đồng: đi bộ, viết, vẽ, gọi điện cho người thân, học một kỹ năng nhỏ trên mạng. Hợp những ngày cuối tháng hay những lúc muốn sống chậm lại.',
    pick: a => a.k === 0 && FUN(a), cta: '/?tien=0', ctaText: 'Rút một việc 0 đồng' },
  { slug: 'lam-gi-cung-gia-dinh', kind: 'lam', short: 'Làm gì cùng gia đình',
    title: 'Làm gì cùng gia đình? 30 việc nhỏ cho cả nhà',
    desc: 'Làm gì cùng gia đình cuối tuần hay buổi tối? 30 việc nhỏ cho cả nhà: nấu ăn, chơi trò chơi, đi dạo, kể chuyện, chăm cây.',
    intro: 'Ở cùng một nhà mà nhiều khi mỗi người một màn hình. Đây là 30 việc nhỏ để cả nhà làm cùng nhau, hợp cả người lớn lẫn trẻ nhỏ, phần lớn làm ngay trong buổi tối hoặc cuối tuần.',
    pick: a => a.ai.includes('g') && a.ai.length < 4 && FUN(a), cta: '/?ai=g', ctaText: 'Rút một việc cho cả nhà' },
  { slug: 'buon-chan-lam-gi', kind: 'lam', short: 'Buồn chán nên làm gì', care: true,
    title: 'Buồn chán nên làm gì? 30 việc nhỏ cho đỡ chán',
    desc: 'Buồn chán nên làm gì? 30 việc nhỏ, nhẹ nhàng, làm được ngay để ngày hôm nay dễ chịu hơn một chút.',
    intro: 'Ai cũng có những ngày thấy chán, chẳng muốn làm gì. Những lúc đó, một việc thật nhỏ thường giúp nhiều hơn một kế hoạch lớn. Các gợi ý dưới đây đều nhẹ nhàng, làm được ngay, không cần chuẩn bị nhiều.',
    pick: a => a.m.includes('c') && a.d <= 5 && ['gt', 'st', 'kp', 'kn', 'au', 'vd'].includes(a.c), cta: '/?tam=c', ctaText: 'Rút một việc cho đỡ chán' }
];

const H = (slug, id) => createHash('sha1').update(slug + ':' + id).digest('hex');
/* chọn 30 mục: chia nhóm (nhóm việc hoặc bữa ăn), trong nhóm xếp theo mã băm cố định, lấy lần lượt từng nhóm cho đa dạng */
function select(t, list, n = 30) {
  const pool = list.filter(t.pick);
  const key = t.kind === 'an' ? (f => f.b[0]) : (a => a.c);
  const groups = new Map();
  for (const x of pool) { const k = key(x); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); }
  for (const g of groups.values()) g.sort((x, y) => (H(t.slug, x.id) < H(t.slug, y.id) ? -1 : 1));
  const out = [], gs = [...groups.keys()].sort().map(k => groups.get(k));
  for (let i = 0; out.length < n && gs.some(g => g.length > i); i++) for (const g of gs) if (g[i] && out.length < n) out.push(g[i]);
  return out;
}

const itemLam = a => `<li><h2><a href="/q/${a.id}">${escH(a.t)}</a></h2><p class="n">${escH(a.n)}</p><p><b>Bắt đầu:</b> ${escH(a.s)}</p><p class="m">${CAT[a.c]} · ${LVL(a.d)} · ${fmtTime(a.p)} · ${COST[a.k]} · ${WHERE[a.o]} · ${fmtWho(a.ai)}</p></li>`;
const itemAn = f => `<li><h2><a href="/an/${f.id}">${escH(f.t)}</a></h2><p class="n">${escH(f.n)}</p><p class="m">Bữa ${f.b.split('').map(c => MEAL[c]).join(', ')} · ${KIND[f.o]} · ${REGION[f.r] || 'Cả nước'} · ${PURSE[f.k]}${f.v ? ' · Món chay' : ''}</p></li>`;
let escH = s => s;

export function buildTopics({ ACT, FOODS, SITE, esc }) {
  escH = esc;
  const acts = ACT.filter(a => !a.ev);
  const pages = TOPICS.map(t => {
    const items = select(t, t.kind === 'an' ? FOODS : acts);
    if (items.length < 20) throw new Error(`Chủ đề ${t.slug} chỉ có ${items.length} mục`);
    const others = TOPICS.filter(o => o.slug !== t.slug);
    const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: t.title, url: `${SITE}/chu-de/${t.slug}`, numberOfItems: items.length,
      itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.t, url: `${SITE}/${t.kind === 'an' ? 'an' : 'q'}/${x.id}` })) };
    const ctaHref = t.cta + (t.cta.includes('?') ? '&' : '?') + 'tu=1';
    const body = `<nav class="crumb"><a href="/">Hôm nay làm gì?</a> › <a href="/chu-de/">Chủ đề</a></nav>
<h1>${esc(t.title)}</h1>
<p class="lead">${esc(t.intro)}</p>
${t.care ? '<p class="care">Nếu nỗi buồn kéo dài nhiều ngày, bạn không phải chịu một mình: hãy kể với người bạn tin tưởng, người nhà, thầy cô hoặc gặp bác sĩ. Khi thấy mình không an toàn, gọi ngay cấp cứu <a href="tel:115">115</a>.</p>' : ''}
<p class="cta"><a class="btn" href="${ctaHref}">${esc(t.ctaText)}</a></p>
<ol class="items">${items.map(t.kind === 'an' ? itemAn : itemLam).join('')}</ol>
<p class="cta"><a class="btn" href="${ctaHref}">${esc(t.ctaText)}</a></p>
<p class="note">Thời gian, chi phí, túi tiền là ước tính. Mỗi gợi ý mở ra trên trang chính, nơi bạn rút thêm theo tâm trạng, thời tiết và vùng miền.</p>
<h2 class="more">Chủ đề khác</h2>
<ul class="topics">${others.map(o => `<li><a href="/chu-de/${o.slug}">${esc(o.short)}</a></li>`).join('')}<li><a href="/hom-nay-an-gi">Hôm nay ăn gì?</a></li></ul>`;
    return { path: `chu-de/${t.slug}.html`, url: `${SITE}/chu-de/${t.slug}`, title: t.title, desc: t.desc, body, ld, count: items.length };
  });
  const hubBody = `<nav class="crumb"><a href="/">Hôm nay làm gì?</a></nav>
<h1>Chủ đề gợi ý</h1>
<p class="lead">Không biết bắt đầu từ đâu thì chọn một chủ đề. Mỗi trang gom 30 gợi ý có sẵn bước bắt đầu, thời gian và chi phí ước tính, kèm nút rút một quẻ theo đúng chủ đề.</p>
<h2 class="more">Hôm nay ăn gì?</h2>
<ul class="hub">${[{ slug: '', short: 'Hôm nay ăn gì?', desc: 'Rút một món hợp bữa, vùng miền, thời tiết; có món chay và chọn cho cả nhóm.', href: '/hom-nay-an-gi' }].concat(TOPICS.filter(t => t.kind === 'an')).map(t => `<li><a href="${t.href || '/chu-de/' + t.slug}">${esc(t.short)}</a><span>${esc(t.desc)}</span></li>`).join('')}</ul>
<h2 class="more">Hôm nay làm gì?</h2>
<ul class="hub">${TOPICS.filter(t => t.kind === 'lam').map(t => `<li><a href="/chu-de/${t.slug}">${esc(t.short)}</a><span>${esc(t.desc)}</span></li>`).join('')}</ul>
<p class="cta"><a class="btn" href="/">Rút một quẻ cho hôm nay</a></p>`;
  const hub = { path: 'chu-de/index.html', url: `${SITE}/chu-de/`, title: 'Chủ đề gợi ý: hôm nay làm gì, ăn gì | Hôm nay làm gì?', desc: 'Chủ đề gợi ý: món ngon ba miền, món chay, cơm nhà, ăn sáng, cuối tuần làm gì, ở nhà làm gì, hẹn hò, cùng gia đình, việc không tốn tiền.', body: hubBody, ld: null };
  const linkList = ks => `<ul class="tp-list">${TOPICS.filter(t => ks.includes(t.kind)).map(t => `<li><a href="/chu-de/${t.slug}">${esc(t.short)}</a></li>`).join('')}</ul>`;
  const blockIndex = `<section class="tp" aria-labelledby="tpTitle"><div class="wrap"><h2 id="tpTitle">Gợi ý theo chủ đề</h2>${linkList(['lam', 'an'])}<p class="tp-more"><a href="/hom-nay-an-gi">Hôm nay ăn gì?</a> · <a href="/chu-de/">Tất cả chủ đề</a></p></div></section>`;
  const blockFood = `<section class="tp" aria-labelledby="tpTitle"><div class="wrap"><h2 id="tpTitle">Hôm nay ăn gì?</h2><p>Không biết hôm nay ăn gì thì bấm “Rút món khác” cho tới khi gặp món ưng. Trang gợi ý theo bữa (sáng, trưa, tối, khuya, ăn vặt), theo miền Bắc, Trung, Nam, theo trời nóng hay mưa; có lọc món chay, nút “Không ăn món này” và “Chọn cho cả nhóm” để cả bàn cùng chốt.</p>${linkList(['an'])}<p class="tp-more"><a href="/">Hôm nay làm gì?</a> · <a href="/chu-de/">Tất cả chủ đề</a></p></div></section>`;
  return { pages, hub, blockIndex, blockFood };
}
