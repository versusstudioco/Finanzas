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

const BG1 = [16, 53, 40], BG2 = [18, 48, 58];
const RUNNER = [234, 252, 241];
const LIME = [182, 242, 74];

// segmentos del cuerpo de la corredora (mismos que icon.svg)
const RUN_SEG = [
  [258, 190, 240, 262], // torso
  [240, 262, 308, 280], // muslo delantero
  [308, 280, 336, 348], // pierna delantera
  [240, 262, 198, 316], // muslo trasero
  [198, 316, 252, 356], // pierna trasera
  [252, 198, 322, 216], // brazo delantero
  [258, 208, 192, 236], // brazo trasero
];
const SPEED_SEG = [
  [70, 205, 150, 205],
  [60, 255, 170, 255],
  [80, 305, 150, 305],
];

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

  // líneas de velocidad (lime)
  for (let i = 0; i < SPEED_SEG.length; i++) {
    const [ax, ay, bx, by] = SPEED_SEG[i];
    const d = sdSegment(px, py, ax, ay, bx, by);
    const cov = 1 - smoothstep(7, 9, d);
    if (cov > 0) col = mix(col, LIME, cov);
  }

  // cuerpo de la corredora (blanco), trazo grueso con puntas redondeadas
  let bodyD = 1e9;
  for (let i = 0; i < RUN_SEG.length; i++) {
    const [ax, ay, bx, by] = RUN_SEG[i];
    bodyD = Math.min(bodyD, sdSegment(px, py, ax, ay, bx, by));
  }
  // cabeza
  const headD = Math.hypot(px - 266, py - 150) - 33;
  bodyD = Math.min(bodyD, headD + 15); // el círculo se suma al trazo de radio 15
  const bodyCov = 1 - smoothstep(14, 16.5, bodyD);
  if (bodyCov > 0) col = mix(col, RUNNER, bodyCov);

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
