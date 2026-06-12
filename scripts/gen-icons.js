// PWA用アイコンPNGを依存ライブラリなしで生成する
import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // filter: none
    rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// 線分への距離 - r （カプセル形のSDF）
function sdCapsule(px, py, ax, ay, bx, by, r) {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const hRaw = (pax * bax + pay * bay) / (bax * bax + bay * bay || 1);
  const h = Math.max(0, Math.min(1, hRaw));
  const dx = pax - bax * h, dy = pay - bay * h;
  return Math.hypot(dx, dy) - r;
}

function makeIcon(S) {
  const rgba = Buffer.alloc(S * S * 4);
  const aa = 1.5 / S;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = (x + 0.5) / S, v = (y + 0.5) / S;
      // 背景: 上が少し明るいチャコールのグラデーション
      let r = 24 + (10 - 24) * v;
      let g = 24 + (10 - 24) * v;
      let b = 27 + (12 - 27) * v;

      // マイク（白）
      const dCap = sdCapsule(u, v, 0.5, 0.33, 0.5, 0.46, 0.085);
      let dRing = Math.abs(Math.hypot(u - 0.5, v - 0.47) - 0.155) - 0.027;
      dRing = Math.max(dRing, 0.475 - v); // 下半分だけ
      const dStem = sdCapsule(u, v, 0.5, 0.625, 0.5, 0.69, 0.022);
      const dBase = sdCapsule(u, v, 0.42, 0.715, 0.58, 0.715, 0.022);
      const d = Math.min(dCap, dRing, dStem, dBase);
      const alpha = Math.max(0, Math.min(1, 0.5 - d / aa));

      r = r + (255 - r) * alpha;
      g = g + (255 - g) * alpha;
      b = b + (255 - b) * alpha;

      const i = (y * S + x) * 4;
      rgba[i] = Math.round(r);
      rgba[i + 1] = Math.round(g);
      rgba[i + 2] = Math.round(b);
      rgba[i + 3] = 255;
    }
  }
  return encodePNG(S, S, rgba);
}

for (const [size, name] of [
  [512, 'icon-512.png'],
  [192, 'icon-192.png'],
  [180, 'apple-touch-icon.png'],
]) {
  writeFileSync(join(outDir, name), makeIcon(size));
  console.log('generated', name);
}
