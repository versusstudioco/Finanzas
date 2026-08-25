/* build-standalone.js — junta CSS + JS + markup en un solo archivo HTML.
   Genera:
     dist/rayada-standalone.html   (documento completo, para descargar/abrir)
     scripts/.artifact-fragment.html (fragmento para publicar como Artifact)
   Uso: node scripts/build-standalone.js */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const css = read("css/styles.css");

const js = [
  read("js/format.js"),
  read("js/store.js"),
  read("js/nutrition.js"),
  read("js/training.js"),
  read("js/coach.js"),
  // en standalone no hay sw.js: quitamos el registro del service worker
  read("js/app.js").replace(/\n\s*\/\/ Service worker[\s\S]*?\n {2}}\n/, "\n"),
].join("\n");

const bodyMarkup = `
  <div id="app">
    <div class="header">
      <div>
        <h1>Rayada<span class="logo-dot">.</span></h1>
        <div class="sub" id="header-sub">Tu coach de nutrición y running</div>
      </div>
      <button class="btn ghost sm" id="btn-ajustes" style="flex:0 0 auto;padding:8px 12px;" aria-label="Ajustes">⚙️</button>
    </div>
    <main id="main"></main>
    <nav class="nav">
      <button data-nav="inicio" class="active"><span class="ni">🏠</span>Inicio</button>
      <button data-nav="nutricion"><span class="ni">🥗</span>Nutrición</button>
      <button data-nav="entreno"><span class="ni">🏃‍♀️</span>Entreno</button>
      <button data-nav="progreso"><span class="ni">📈</span>Progreso</button>
      <button data-nav="coach"><span class="ni">🤖</span>Coach</button>
    </nav>
  </div>
  <button class="fab" id="fab" aria-label="Agregar">＋</button>
  <div class="sheet-overlay" id="sheet-overlay"></div>
  <div id="onb-root" style="display:none;"></div>`;

// --- Documento completo (para dist/) ---
const fullDoc = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
<title>Rayada</title>
<meta name="theme-color" content="#0a0e0c">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Rayada">
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
fs.writeFileSync(path.join(distDir, "rayada-standalone.html"), fullDoc);
console.log("✓ dist/rayada-standalone.html", (fullDoc.length / 1024).toFixed(1) + " KB");

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
