/* build-standalone.js — junta CSS + JS + markup en un solo archivo HTML.
   Genera:
     dist/finanzas-standalone.html   (documento completo, para descargar/abrir)
   Uso: node scripts/build-standalone.js */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const css = read("css/styles.css");
const js = [
  read("js/format.js"),
  read("js/store.js"),
  read("js/advisor.js"),
  // en standalone no hay sw.js: quitamos el registro del service worker
  read("js/app.js").replace(/\/\/ registrar service worker[\s\S]*?\n {2}}\n/, "\n"),
].join("\n");

const bodyMarkup = `
  <div id="app">
    <div class="header">
      <h1>Finanzas</h1>
      <div class="sub">Tu dinero, bajo control</div>
    </div>
    <nav class="nav">
      <button data-nav="inicio" class="active"><span class="ni">🏠</span>Inicio</button>
      <button data-nav="movimientos"><span class="ni">🧾</span>Movimientos</button>
      <button data-nav="deudas"><span class="ni">🏦</span>Deudas</button>
      <button data-nav="agente"><span class="ni">🤖</span>Agente</button>
      <button data-nav="ajustes"><span class="ni">⚙️</span>Ajustes</button>
    </nav>
  </div>
  <button class="fab" id="fab" aria-label="Agregar">＋</button>
  <div class="sheet-overlay" id="sheet-overlay"></div>`;

// --- Documento completo (para dist/) ---
const fullDoc = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
<title>Finanzas</title>
<meta name="theme-color" content="#0b0f14">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Finanzas">
<style>
${css}
</style>
</head>
<body>
${bodyMarkup}
<script>
${js}
</script>
</body>
</html>`;

const distDir = path.join(root, "dist");
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, "finanzas-standalone.html"), fullDoc);
console.log("✓ dist/finanzas-standalone.html", (fullDoc.length / 1024).toFixed(1) + " KB");

// --- Fragmento para Artifact (style + markup + script, sin html/head/body) ---
const fragment = `<style>
${css}
</style>
${bodyMarkup}
<script>
${js}
</script>`;
fs.writeFileSync(path.join(root, "scripts", ".artifact-fragment.html"), fragment);
console.log("✓ scripts/.artifact-fragment.html (para publicar)");
