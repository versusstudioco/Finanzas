/* photos.js — Fotos de progreso guardadas en IndexedDB (no llenan el
   localStorage). Cada foto: {id, date, nota, blob}. Solo viven en el teléfono. */
(function () {
  "use strict";

  const DB = "rayada.fotos";
  const STORE = "fotos";
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) { reject(new Error("Sin IndexedDB")); return; }
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: "id" });
          os.createIndex("date", "date", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }

  function tx(mode) {
    return open().then((db) => db.transaction(STORE, mode).objectStore(STORE));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // Redimensiona la imagen a máx ~1200px y comprime a JPEG para ahorrar espacio.
  function comprimir(file, maxLado, calidad) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        let { width, height } = img;
        const max = maxLado || 1200;
        if (Math.max(width, height) > max) {
          const r = max / Math.max(width, height);
          width = Math.round(width * r); height = Math.round(height * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          resolve(blob || file);
        }, "image/jpeg", calidad || 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  async function add(file, meta) {
    const blob = await comprimir(file, 1200, 0.82);
    const item = {
      id: uid(),
      date: (meta && meta.date) || window.Fmt.ymd(window.Fmt.hoy()),
      nota: (meta && meta.nota) || "",
      blob,
    };
    const store = await tx("readwrite");
    return new Promise((resolve, reject) => {
      const r = store.add(item);
      r.onsuccess = () => resolve(item);
      r.onerror = () => reject(r.error);
    });
  }

  // Devuelve metadatos (sin blob) ordenados por fecha ascendente.
  async function list() {
    const store = await tx("readonly");
    return new Promise((resolve, reject) => {
      const out = [];
      const req = store.openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (cur) {
          const v = cur.value;
          out.push({ id: v.id, date: v.date, nota: v.nota });
          cur.continue();
        } else {
          out.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
          resolve(out);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function getBlob(id) {
    const store = await tx("readonly");
    return new Promise((resolve, reject) => {
      const r = store.get(id);
      r.onsuccess = () => resolve(r.result ? r.result.blob : null);
      r.onerror = () => reject(r.error);
    });
  }

  async function url(id) {
    const blob = await getBlob(id);
    return blob ? URL.createObjectURL(blob) : null;
  }

  async function remove(id) {
    const store = await tx("readwrite");
    return new Promise((resolve, reject) => {
      const r = store.delete(id);
      r.onsuccess = () => resolve(true);
      r.onerror = () => reject(r.error);
    });
  }

  async function count() {
    try { return (await list()).length; } catch (e) { return 0; }
  }

  window.Fotos = { add, list, url, getBlob, remove, count };
})();
