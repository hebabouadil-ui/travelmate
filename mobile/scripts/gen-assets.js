// Generates branded placeholder PNG assets (icon, adaptive icon, splash) so the
// project builds out of the box. Replace with real artwork before publishing.
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Radial-ish two-color gradient with a soft glowing center.
function makePng(w, h, c1, c2, glow) {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  const [gr, gg, gb] = hexToRgb(glow);
  const cx = w / 2;
  const cy = h / 2;
  const maxD = Math.sqrt(cx * cx + cy * cy);
  const raw = Buffer.alloc((w * 4 + 1) * h);
  let o = 0;
  for (let y = 0; y < h; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxD; // 0 center -> 1 edge
      const t = Math.min(1, d);
      // base vertical gradient
      const vy = y / h;
      let r = r1 + (r2 - r1) * vy;
      let g = g1 + (g2 - g1) * vy;
      let b = b1 + (b2 - b1) * vy;
      // central glow
      const glowAmt = Math.max(0, 1 - t * 1.6) * 0.55;
      r = r + (gr - r) * glowAmt;
      g = g + (gg - g) * glowAmt;
      b = b + (gb - b) * glowAmt;
      raw[o++] = Math.round(r);
      raw[o++] = Math.round(g);
      raw[o++] = Math.round(b);
      raw[o++] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, "..", "assets");
fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(path.join(dir, "icon.png"), makePng(1024, 1024, "#7C6CF0", "#22D3EE", "#FFFFFF"));
fs.writeFileSync(path.join(dir, "adaptive-icon.png"), makePng(1024, 1024, "#7C6CF0", "#6C5CE7", "#22D3EE"));
fs.writeFileSync(path.join(dir, "splash.png"), makePng(1284, 2778, "#1A1340", "#0B0F1A", "#6C5CE7"));
fs.writeFileSync(path.join(dir, "favicon.png"), makePng(48, 48, "#7C6CF0", "#22D3EE", "#FFFFFF"));

console.log("Generated assets in", dir);
