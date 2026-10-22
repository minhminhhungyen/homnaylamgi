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
