/* auth.js — perfiles con usuario y contraseña (multi-usuario).
   Cada perfil tiene SUS propios datos, guardados solo en este dispositivo.
   Es un candado personal, no seguridad de nivel bancario. */
(function () {
  "use strict";

  const PKEY = "finanzas.profiles.v1"; // { profiles: [{id, user, hash}] }
  const LAST = "finanzas.lastuser";
  const SESS = "finanzas.session";     // sessionStorage: id del perfil activo
  // claves heredadas (versión de un solo usuario)
  const OLD_AUTH = "finanzas.auth.v1";
  const OLD_DATA = "finanzas.v1";

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const dataKey = (id) => "finanzas.data." + id;
  const safe = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };

  function loadReg() {
    migrate();
    return safe(localStorage.getItem(PKEY)) || { profiles: [] };
  }
  function saveReg(reg) { localStorage.setItem(PKEY, JSON.stringify(reg)); }

  // Migra la versión de un solo usuario (Vero) a un perfil, conservando datos
  function migrate() {
    if (localStorage.getItem(PKEY)) return;
    const oldAuth = safe(localStorage.getItem(OLD_AUTH));
    if (oldAuth && oldAuth.user) {
      const id = uid();
      const reg = { profiles: [{ id, user: oldAuth.user, hash: oldAuth.hash }] };
      const oldData = localStorage.getItem(OLD_DATA);
      if (oldData && !localStorage.getItem(dataKey(id))) localStorage.setItem(dataKey(id), oldData);
      saveReg(reg);
    }
  }

  async function hash(user, pw) {
    const str = (user || "").trim().toLowerCase() + ":" + pw;
    if (window.crypto && crypto.subtle) {
      try {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
        return "sha256:" + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
      } catch (e) { /* fallback */ }
    }
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return "fnv:" + (h >>> 0).toString(16);
  }

  function listUsers() { return loadReg().profiles.map((p) => p.user); }
  function listProfiles() { return loadReg().profiles.map((p) => ({ id: p.id, user: p.user })); }
  function count() { return loadReg().profiles.length; }
  function findByUser(user) {
    const u = (user || "").trim().toLowerCase();
    return loadReg().profiles.find((p) => (p.user || "").toLowerCase() === u) || null;
  }
  function getActiveId() { return sessionStorage.getItem(SESS); }
  function getActiveUser() {
    const id = getActiveId(); if (!id) return "";
    const p = loadReg().profiles.find((x) => x.id === id);
    return p ? p.user : "";
  }

  function setActive(id) {
    sessionStorage.setItem(SESS, id);
    const p = loadReg().profiles.find((x) => x.id === id);
    if (p) localStorage.setItem(LAST, p.user);
    if (window.Store) window.Store.setKey(dataKey(id));
  }

  async function createProfile(user, pw) {
    user = (user || "").trim();
    if (!user) return { ok: false, msg: "Escribe un usuario." };
    if (pw == null || pw.length < 2) return { ok: false, msg: "La contraseña es muy corta." };
    if (findByUser(user)) return { ok: false, msg: "Ese usuario ya existe en este dispositivo." };
    const reg = loadReg();
    const firstProfile = reg.profiles.length === 0;
    const id = uid();
    reg.profiles.push({ id, user, hash: await hash(user, pw) });
    saveReg(reg);
    // el primer usuario adopta datos previos sueltos (si los hubiera)
    if (firstProfile) {
      const old = localStorage.getItem(OLD_DATA);
      if (old && !localStorage.getItem(dataKey(id))) localStorage.setItem(dataKey(id), old);
    }
    return { ok: true, id };
  }

  async function verify(user, pw) {
    const p = findByUser(user);
    if (!p) return null;
    const h = await hash(user, pw);
    return h === p.hash ? p.id : null;
  }

  async function changePassword(current, newPw) {
    const id = getActiveId();
    const reg = loadReg();
    const p = reg.profiles.find((x) => x.id === id);
    if (!p) return { ok: false, msg: "No hay sesión activa." };
    if ((await hash(p.user, current)) !== p.hash) return { ok: false, msg: "La contraseña actual no es correcta." };
    if (!newPw || newPw.length < 2) return { ok: false, msg: "La nueva contraseña es muy corta." };
    p.hash = await hash(p.user, newPw);
    saveReg(reg);
    return { ok: true };
  }

  function deleteProfile(id) {
    const reg = loadReg();
    reg.profiles = reg.profiles.filter((p) => p.id !== id);
    saveReg(reg);
    localStorage.removeItem(dataKey(id));
    if (getActiveId() === id) sessionStorage.removeItem(SESS);
  }

  function lockNow() { sessionStorage.removeItem(SESS); location.reload(); }

  // ---------- UI ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function overlay(html) {
    let root = document.getElementById("lock-root");
    if (!root) { root = document.createElement("div"); root.id = "lock-root"; document.body.appendChild(root); }
    root.innerHTML = `<div class="lock-card">
      <div class="lock-logo"><img src="./icons/icon.svg" alt="" width="64" height="64" onerror="this.style.display='none'"></div>
      ${html}</div>`;
    root.classList.add("show");
    return root;
  }
  function removeOverlay() { const r = document.getElementById("lock-root"); if (r) r.remove(); }

  // Crear acceso (primer usuario o "nuevo usuario")
  function renderCreate(onDone, canBack) {
    const root = overlay(`
      <h1 class="lock-title">${canBack ? "Nuevo usuario" : "Crea tu acceso"}</h1>
      <p class="lock-sub">Elige un usuario y una contraseña. Solo se guardan en este teléfono.</p>
      <div class="lock-field"><label>Usuario</label>
        <input type="text" id="lk-user" autocapitalize="none" autocomplete="username" placeholder="Ej: Michelle"></div>
      <div class="lock-field"><label>Contraseña</label>
        <input type="password" id="lk-pw" inputmode="numeric" autocomplete="new-password" placeholder="Tu contraseña"></div>
      <div class="lock-field"><label>Repite la contraseña</label>
        <input type="password" id="lk-pw2" inputmode="numeric" autocomplete="new-password" placeholder="Otra vez"></div>
      <div class="lock-error" id="lk-err"></div>
      <button class="btn primary lock-btn" id="lk-go">Crear usuario 🔒</button>
      ${canBack ? `<div class="link" id="lk-back" style="margin-top:16px">← Volver a entrar</div>` : ""}
    `);
    const err = root.querySelector("#lk-err");
    root.querySelector("#lk-go").addEventListener("click", async () => {
      const user = root.querySelector("#lk-user").value.trim();
      const pw = root.querySelector("#lk-pw").value;
      const pw2 = root.querySelector("#lk-pw2").value;
      if (pw !== pw2) { err.textContent = "Las contraseñas no coinciden."; return; }
      const r = await createProfile(user, pw);
      if (!r.ok) { err.textContent = r.msg; return; }
      setActive(r.id); removeOverlay(); onDone();
    });
    const back = root.querySelector("#lk-back");
    back && back.addEventListener("click", () => renderLogin(onDone));
  }

  // Entrar (elige/escribe usuario + contraseña)
  function renderLogin(onDone) {
    const last = localStorage.getItem(LAST) || "";
    const users = listUsers();
    const chips = users.length > 1
      ? `<div class="chips" id="lk-chips" style="justify-content:center;margin-bottom:16px">
          ${users.map((u) => `<button class="chip ${u === last ? "active" : ""}" data-u="${esc(u)}">${esc(u)}</button>`).join("")}
        </div>` : "";
    const root = overlay(`
      <h1 class="lock-title">Hola de nuevo 👋</h1>
      <p class="lock-sub">Ingresa para ver tus finanzas.</p>
      ${chips}
      <div class="lock-field"><label>Usuario</label>
        <input type="text" id="lk-user" value="${esc(last)}" autocapitalize="none" autocomplete="username"></div>
      <div class="lock-field"><label>Contraseña</label>
        <input type="password" id="lk-pw" inputmode="numeric" autocomplete="current-password" placeholder="Tu contraseña" autofocus></div>
      <div class="lock-error" id="lk-err"></div>
      <button class="btn primary lock-btn" id="lk-go">Entrar</button>
      <div class="link" id="lk-new" style="margin-top:16px">➕ Crear nuevo usuario</div>
    `);
    const err = root.querySelector("#lk-err");
    const chipsEl = root.querySelector("#lk-chips");
    chipsEl && chipsEl.addEventListener("click", (e) => {
      const b = e.target.closest("[data-u]"); if (!b) return;
      chipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      b.classList.add("active");
      root.querySelector("#lk-user").value = b.dataset.u;
      root.querySelector("#lk-pw").focus();
    });
    async function submit() {
      const user = root.querySelector("#lk-user").value.trim();
      const pw = root.querySelector("#lk-pw").value;
      const id = await verify(user, pw);
      if (id) { setActive(id); removeOverlay(); onDone(); }
      else { err.textContent = "Usuario o contraseña incorrectos."; const p = root.querySelector("#lk-pw"); p.value = ""; p.focus(); }
    }
    root.querySelector("#lk-go").addEventListener("click", submit);
    root.querySelector("#lk-pw").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    root.querySelector("#lk-new").addEventListener("click", () => renderCreate(onDone, true));
  }

  function guard(boot) {
    if (count() === 0) { renderCreate(boot, false); return; }
    const id = getActiveId();
    if (id && loadReg().profiles.some((p) => p.id === id)) { setActive(id); boot(); return; }
    renderLogin(boot);
  }

  window.Auth = {
    guard, lockNow, changePassword, createProfile, deleteProfile,
    getActiveUser, getActiveId, listUsers, listProfiles, count,
  };
})();
