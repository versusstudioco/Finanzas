/* auth.js — candado local con usuario y contraseña.
   Las credenciales se guardan (con hash) SOLO en este dispositivo,
   nunca en el código ni en internet. Es un bloqueo personal, no
   seguridad de nivel bancario. */
(function () {
  "use strict";

  const AKEY = "finanzas.auth.v1"; // {user, hash}
  const SKEY = "finanzas.auth.session";
  const SUGGESTED_USER = "Vero"; // solo una sugerencia editable, no es secreto

  function getAuth() {
    try { return JSON.parse(localStorage.getItem(AKEY)); } catch (e) { return null; }
  }
  function setAuth(a) { localStorage.setItem(AKEY, JSON.stringify(a)); }
  function clearAuth() { localStorage.removeItem(AKEY); sessionStorage.removeItem(SKEY); }
  function isEnabled() { return !!getAuth(); }
  function isUnlocked() { return sessionStorage.getItem(SKEY) === "1"; }
  function markUnlocked() { sessionStorage.setItem(SKEY, "1"); }

  async function hash(user, pw) {
    const str = (user || "").trim().toLowerCase() + ":" + pw;
    if (window.crypto && crypto.subtle) {
      try {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
        return "sha256:" + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
      } catch (e) { /* cae al fallback */ }
    }
    // fallback (contexto no seguro, ej. file://)
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return "fnv:" + (h >>> 0).toString(16);
  }

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function overlay(html) {
    let root = document.getElementById("lock-root");
    if (!root) { root = document.createElement("div"); root.id = "lock-root"; document.body.appendChild(root); }
    root.innerHTML = `<div class="lock-card">
      <div class="lock-logo">
        <img src="./icons/icon.svg" alt="" width="64" height="64" onerror="this.style.display='none'">
      </div>
      ${html}
    </div>`;
    root.classList.add("show");
    return root;
  }
  function removeOverlay() {
    const root = document.getElementById("lock-root");
    if (root) root.remove();
  }

  // Pantalla para CREAR acceso (primera vez)
  function renderSetup(onDone) {
    const root = overlay(`
      <h1 class="lock-title">Crea tu acceso</h1>
      <p class="lock-sub">Elige un usuario y una contraseña para proteger tu app. Solo se guardan en este teléfono.</p>
      <div class="lock-field"><label>Usuario</label>
        <input type="text" id="lk-user" value="${esc(SUGGESTED_USER)}" autocomplete="username" autocapitalize="none"></div>
      <div class="lock-field"><label>Contraseña</label>
        <input type="password" id="lk-pw" inputmode="numeric" autocomplete="new-password" placeholder="Tu contraseña"></div>
      <div class="lock-field"><label>Repite la contraseña</label>
        <input type="password" id="lk-pw2" inputmode="numeric" autocomplete="new-password" placeholder="Otra vez"></div>
      <div class="lock-error" id="lk-err"></div>
      <button class="btn primary lock-btn" id="lk-go">Crear acceso 🔒</button>
    `);
    const err = root.querySelector("#lk-err");
    async function submit() {
      const user = root.querySelector("#lk-user").value.trim();
      const pw = root.querySelector("#lk-pw").value;
      const pw2 = root.querySelector("#lk-pw2").value;
      if (!user) { err.textContent = "Escribe un usuario."; return; }
      if (pw.length < 2) { err.textContent = "La contraseña es muy corta."; return; }
      if (pw !== pw2) { err.textContent = "Las contraseñas no coinciden."; return; }
      setAuth({ user, hash: await hash(user, pw) });
      markUnlocked();
      removeOverlay();
      onDone();
    }
    root.querySelector("#lk-go").addEventListener("click", submit);
    root.querySelector("#lk-pw2").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  }

  // Pantalla de BLOQUEO (entrar)
  function renderLock(onDone) {
    const a = getAuth();
    const root = overlay(`
      <h1 class="lock-title">Hola de nuevo 👋</h1>
      <p class="lock-sub">Ingresa para ver tus finanzas.</p>
      <div class="lock-field"><label>Usuario</label>
        <input type="text" id="lk-user" value="${esc(a.user)}" autocomplete="username" autocapitalize="none"></div>
      <div class="lock-field"><label>Contraseña</label>
        <input type="password" id="lk-pw" inputmode="numeric" autocomplete="current-password" placeholder="Tu contraseña" autofocus></div>
      <div class="lock-error" id="lk-err"></div>
      <button class="btn primary lock-btn" id="lk-go">Entrar</button>
    `);
    const err = root.querySelector("#lk-err");
    async function submit() {
      const user = root.querySelector("#lk-user").value.trim();
      const pw = root.querySelector("#lk-pw").value;
      const h = await hash(user, pw);
      if (user.toLowerCase() === (a.user || "").toLowerCase() && h === a.hash) {
        markUnlocked(); removeOverlay(); onDone();
      } else {
        err.textContent = "Usuario o contraseña incorrectos.";
        const pwEl = root.querySelector("#lk-pw"); pwEl.value = ""; pwEl.focus();
      }
    }
    root.querySelector("#lk-go").addEventListener("click", submit);
    root.querySelector("#lk-pw").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  }

  // Punto de entrada: decide qué mostrar antes de arrancar la app
  function guard(boot) {
    if (!isEnabled()) { renderSetup(boot); return; }
    if (isUnlocked()) { boot(); return; }
    renderLock(boot);
  }

  function lockNow() { sessionStorage.removeItem(SKEY); location.reload(); }

  async function changePassword(current, newPw) {
    const a = getAuth();
    if (!a) return { ok: false, msg: "No hay acceso configurado." };
    const h = await hash(a.user, current);
    if (h !== a.hash) return { ok: false, msg: "La contraseña actual no es correcta." };
    if (!newPw || newPw.length < 2) return { ok: false, msg: "La nueva contraseña es muy corta." };
    setAuth({ user: a.user, hash: await hash(a.user, newPw) });
    return { ok: true };
  }

  window.Auth = { guard, isEnabled, getAuth, clearAuth, lockNow, changePassword, hash, setAuth, markUnlocked };
})();
