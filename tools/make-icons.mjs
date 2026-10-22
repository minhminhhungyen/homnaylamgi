// Tạo bộ biểu tượng PNG + favicon.ico từ src/static/favicon.svg (chạy lại khi đổi logo)
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const STATIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/static');
const svg = readFileSync(path.join(STATIC, 'favicon.svg'));
const png = size => sharp(svg, { density: 72 * size / 64 * 4 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
// Biểu tượng "maskable": nền tràn viền, dấu hỏi nằm trong vùng an toàn 60%
const maskSvg = Buffer.from(String(svg).replace('rx="14"', 'rx="0"').replace('<path', '<g transform="translate(32 32) scale(.72) translate(-32 -32)"><path').replace('</svg>', '</g></svg>'));
const mask = await sharp(maskSvg, { density: 2048 }).resize(512, 512).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(path.join(STATIC, 'apple-touch-icon.png'), await png(180));
writeFileSync(path.join(STATIC, 'icon-192.png'), await png(192));
writeFileSync(path.join(STATIC, 'icon-512.png'), await png(512));
writeFileSync(path.join(STATIC, 'icon-maskable-512.png'), mask);
// favicon.ico chứa ảnh PNG 16/32/48
const sizes = [16, 32, 48], bufs = await Promise.all(sizes.map(png));
const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
const dir = Buffer.alloc(16 * sizes.length); let off = 6 + 16 * sizes.length;
sizes.forEach((s, i) => { const o = i * 16; dir.writeUInt8(s, o); dir.writeUInt8(s, o + 1); dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6); dir.writeUInt32LE(bufs[i].length, o + 8); dir.writeUInt32LE(off, o + 12); off += bufs[i].length; });
writeFileSync(path.join(STATIC, 'favicon.ico'), Buffer.concat([head, dir, ...bufs]));
console.log('Đã tạo biểu tượng:', ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'favicon.ico'].join(', '));

// Biểu tượng phím tắt (giữ lâu biểu tượng app trên điện thoại): Rút quẻ, Ăn gì
const RED = '#D02842', CREAM = '#FFF3EC';
const tile = inner => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><rect width="192" height="192" rx="42" fill="${RED}"/>${inner}</svg>`);
const tube = tile(`<g fill="${CREAM}"><rect x="70" y="34" width="10" height="70" rx="4" transform="rotate(-10 75 104)"/><rect x="91" y="26" width="10" height="78" rx="4"/><rect x="112" y="34" width="10" height="70" rx="4" transform="rotate(10 117 104)"/><rect x="58" y="86" width="76" height="80" rx="12"/></g><rect x="84" y="112" width="24" height="24" rx="3" fill="${RED}"/>`);
const bowl = tile(`<g fill="none" stroke="${CREAM}" stroke-width="9" stroke-linecap="round"><path d="M70 64c-6-10 6-16 0-26M96 60c-6-10 6-16 0-26M122 64c-6-10 6-16 0-26"/></g><path d="M34 92h124c0 36-28 64-62 64S34 128 34 92z" fill="${CREAM}"/><rect x="74" y="152" width="44" height="10" rx="5" fill="${CREAM}"/>`);
writeFileSync(path.join(STATIC, 'shortcut-que.png'), await sharp(tube, { density: 300 }).resize(192, 192).png({ compressionLevel: 9 }).toBuffer());
writeFileSync(path.join(STATIC, 'shortcut-an.png'), await sharp(bowl, { density: 300 }).resize(192, 192).png({ compressionLevel: 9 }).toBuffer());
// Biểu tượng một màu (Android 13+ tô theo màu hình nền): chỉ giữ dấu hỏi, nền trong suốt, nằm trong vùng an toàn
const mono = Buffer.from(String(svg).replace(/<rect[^>]*\/>/, '').replace(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="#FFFFFF"').replace('<path', '<g transform="translate(32 32) scale(.62) translate(-32 -32)"><path').replace('</svg>', '</g></svg>'));
writeFileSync(path.join(STATIC, 'icon-monochrome-512.png'), await sharp(mono, { density: 2048 }).resize(512, 512).png({ compressionLevel: 9 }).toBuffer());
console.log('Đã tạo thêm: shortcut-que.png, shortcut-an.png, icon-monochrome-512.png');
