/* make-icons.js — genera los PNG del PWA sin dependencias externas.
   Rasteriza el mismo diseño del icon.svg (barras + flecha de crecimiento).
   Uso: node scripts/make-icons.js */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// ---- utilidades de color ----
function lerp(a, b, t) { return a + (b - a) * t; }
function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}
function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function smoothstep(e0, e1, x) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

// distancia a rect redondeado centrado en (cx,cy) con semiejes (hw,hh) y radio r
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
  return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(qx, qy), 0) - r;
}
// distancia a segmento
function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const h = clamp01((pax * bax + pay * bay) / (bax * bax + bay * bay));
  const dx = pax - bax * h, dy = pay - bay * h;
  return Math.sqrt(dx * dx + dy * dy);
}

const BG1 = [23, 52, 42], BG2 = [18, 42, 58];
const BAR_LO = [23, 166, 115], BAR_HI = [34, 201, 138];
const ARROW = [232, 255, 245];

function renderPixel(x, y, N, maskable) {
  // escala a espacio 512
  const s = 512 / N;
  const px = x * s, py = y * s;

  // fondo
  let bgT = (px + py) / (512 * 2);
  let col = mix(BG1, BG2, clamp01(bgT));
  let alpha = 1;

  const corner = maskable ? 0 : 112;
  if (!maskable) {
    const d = sdRoundRect(px, py, 256, 256, 256, 256, corner);
    alpha = 1 - smoothstep(-1.5, 1.5, d);
    if (alpha <= 0) return [0, 0, 0, 0];
  }

  // barras: [x, y, w, h]
  const bars = [
    [118, 300, 54, 94],
    [200, 240, 54, 154],
    [282, 176, 54, 218],
  ];
  for (let i = 0; i < bars.length; i++) {
    const [bx, by, bw, bh] = bars[i];
    const d = sdRoundRect(px, py, bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 16);
    const cov = 1 - smoothstep(-1.2, 1.2, d);
    if (cov > 0) {
      const t = clamp01((py - by) / bh); // 0 arriba, 1 abajo
      const barCol = mix(BAR_HI, BAR_LO, t);
      col = mix(col, barCol, cov * (i === 2 ? 1 : 0.9));
    }
  }

  // línea/flecha de crecimiento (polilínea)
  const pts = [[132, 250], [232, 190], [300, 214], [388, 132]];
  let lineD = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    lineD = Math.min(lineD, sdSegment(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  }
  const lineCov = 1 - smoothstep(9, 11.5, lineD);
  if (lineCov > 0) col = mix(col, ARROW, lineCov);

  // punta de flecha (triángulo relleno) aprox con círculo en el vértice
  const headD = sdSegment(px, py, 370, 125, 388, 132);
  const headCov = 1 - smoothstep(14, 17, Math.min(headD, Math.hypot(px - 384, py - 128)));
  if (headCov > 0) col = mix(col, ARROW, headCov * 0.9);

  return [Math.round(col[0]), Math.round(col[1]), Math.round(col[2]), Math.round(alpha * 255)];
}

// ---- codificador PNG ----
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
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(N, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // raw con filtro 0 por scanline
  const raw = Buffer.alloc((N * 4 + 1) * N);
  for (let y = 0; y < N; y++) {
    raw[y * (N * 4 + 1)] = 0;
    for (let x = 0; x < N; x++) {
      const o = y * (N * 4 + 1) + 1 + x * 4;
      const i = (y * N + x) * 4;
      raw[o] = rgba[i]; raw[o + 1] = rgba[i + 1]; raw[o + 2] = rgba[i + 2]; raw[o + 3] = rgba[i + 3];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function generate(N, maskable) {
  const rgba = Buffer.alloc(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const [r, g, b, a] = renderPixel(x, y, N, maskable);
      const i = (y * N + x) * 4;
      rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
    }
  }
  return encodePNG(N, rgba);
}

const outDir = path.join(__dirname, "..", "icons");
const targets = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["apple-touch-icon.png", 180, true],
  ["maskable-512.png", 512, true],
];
for (const [name, size, mask] of targets) {
  fs.writeFileSync(path.join(outDir, name), generate(size, mask));
  console.log("✓", name, `(${size}px)`);
}
console.log("Iconos generados.");
