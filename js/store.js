/* store.js — capa de datos local (localStorage). Todo vive en el teléfono. */
(function () {
  "use strict";

  const KEY = "rayada.v1";

  const DEFAULT = {
    version: 1,
    profile: {
      nombre: "",
      sexo: "F",            // F | M
      edad: 28,
      alturaCm: 165,
      pesoKg: 62,           // peso actual (se sincroniza con última medición)
      objetivo: "definicion", // definicion | perder | mantener
      nivelActividad: "alto", // sedentario | ligero | moderado | alto | atleta
      // Compromisos fijos de la semana (0=lun ... 6=dom)
      diasGym: [0, 1, 2, 3, 4], // lun a vie
      diasFutbol: [],        // sin fútbol por defecto (configúralo en Ajustes)
      diasDescanso: [6],     // dom
      // Split de gym: grupos musculares por día (0=lun ... 6=dom)
      gymGrupos: {
        0: ["pierna"],
        1: ["espalda", "hombro", "biceps"],
        2: ["pecho", "triceps"],
        3: ["pierna"],
        4: ["tren superior"],
      },
      // Reto de running
      objetivoTiempoSeg: 1200, // 20:00 en 5k
      objetivoDistanciaKm: 5,
      mejor5kSeg: 0,          // se calcula del último test; 0 = sin dato
      fechaReto: "",          // opcional
      aguaMetaVasos: 8,
      onboarded: false,
    },
    // Registro de comidas: {id, date, comida, label, kcal, prot, carbs, grasa}
    comidas: [],
    // Entrenamientos hechos: {id, date, tipo, titulo, minutos, km, timeSeg, rpe, nota}
    entrenos: [],
    // Mediciones: {id, date, pesoKg, cintura, cadera, grasaPct, nota}
    mediciones: [],
    // Alimentos personalizados: {id, nombre, unidad, kcal, prot, carbs, grasa}
    alimentos: [],
    // Agua por día: { 'YYYY-MM-DD': vasos }
    agua: {},
  };

  let state = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign({}, DEFAULT, parsed);
        state.profile = Object.assign({}, DEFAULT.profile, parsed.profile);
      } else {
        state = JSON.parse(JSON.stringify(DEFAULT));
      }
    } catch (e) {
      console.error("Error cargando datos, reiniciando:", e);
      state = JSON.parse(JSON.stringify(DEFAULT));
    }
    return state;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Error guardando:", e);
    }
    window.dispatchEvent(new CustomEvent("store:changed"));
  }

  function get() {
    if (!state) load();
    return state;
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ---------- Perfil ----------
  function updateProfile(patch) {
    Object.assign(get().profile, patch);
    save();
  }
  function setOnboarded(v) {
    get().profile.onboarded = !!v;
    save();
  }

  // ---------- Comidas ----------
  function addComida(c) {
    const item = {
      id: uid(),
      date: c.date || window.Fmt.ymd(window.Fmt.hoy()),
      comida: c.comida || "snack", // desayuno | almuerzo | cena | snack
      label: c.label || "Comida",
      kcal: Math.max(0, Math.round(+c.kcal || 0)),
      prot: Math.max(0, +c.prot || 0),
      carbs: Math.max(0, +c.carbs || 0),
      grasa: Math.max(0, +c.grasa || 0),
    };
    get().comidas.push(item);
    save();
    return item;
  }
  function deleteComida(id) {
    state.comidas = get().comidas.filter((x) => x.id !== id);
    save();
  }
  function comidasDe(dateStr) {
    return get().comidas.filter((c) => c.date === dateStr);
  }

  // ---------- Entrenamientos ----------
  function addEntreno(e) {
    const item = {
      id: uid(),
      date: e.date || window.Fmt.ymd(window.Fmt.hoy()),
      tipo: e.tipo || "easy", // easy|intervals|tempo|long|gym|futbol|test5k|carrera|movilidad
      titulo: e.titulo || "",
      minutos: Math.max(0, Math.round(+e.minutos || 0)),
      km: Math.max(0, +e.km || 0),
      timeSeg: Math.max(0, Math.round(+e.timeSeg || 0)),
      rpe: Math.min(10, Math.max(0, +e.rpe || 0)),
      nota: e.nota || "",
    };
    get().entrenos.push(item);
    // Si es un test de 5k, actualiza el mejor tiempo del perfil
    if (item.tipo === "test5k" && item.timeSeg > 0) {
      const p = get().profile;
      if (!p.mejor5kSeg || item.timeSeg < p.mejor5kSeg) p.mejor5kSeg = item.timeSeg;
    }
    save();
    return item;
  }
  function deleteEntreno(id) {
    state.entrenos = get().entrenos.filter((x) => x.id !== id);
    // Recalcula mejor 5k
    recomputeMejor5k();
    save();
  }
  function entrenosDe(dateStr) {
    return get().entrenos.filter((e) => e.date === dateStr);
  }
  function recomputeMejor5k() {
    const tests = get().entrenos.filter((e) => e.tipo === "test5k" && e.timeSeg > 0);
    get().profile.mejor5kSeg = tests.length ? Math.min.apply(null, tests.map((t) => t.timeSeg)) : 0;
  }
  function tests5k() {
    return get().entrenos
      .filter((e) => e.tipo === "test5k" && e.timeSeg > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ---------- Mediciones ----------
  function addMedicion(m) {
    const item = {
      id: uid(),
      date: m.date || window.Fmt.ymd(window.Fmt.hoy()),
      pesoKg: +m.pesoKg || 0,
      cintura: +m.cintura || 0,
      cadera: +m.cadera || 0,
      grasaPct: +m.grasaPct || 0,
      nota: m.nota || "",
    };
    get().mediciones.push(item);
    // sincroniza peso actual con la medición más reciente
    if (item.pesoKg > 0) {
      const recientes = get().mediciones.filter((x) => x.pesoKg > 0)
        .sort((a, b) => b.date.localeCompare(a.date));
      if (recientes.length && recientes[0].id === item.id) {
        get().profile.pesoKg = item.pesoKg;
      } else if (recientes.length) {
        get().profile.pesoKg = recientes[0].pesoKg;
      }
    }
    save();
    return item;
  }
  function deleteMedicion(id) {
    state.mediciones = get().mediciones.filter((x) => x.id !== id);
    const recientes = get().mediciones.filter((x) => x.pesoKg > 0)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (recientes.length) get().profile.pesoKg = recientes[0].pesoKg;
    save();
  }
  function medicionesOrdenadas() {
    return get().mediciones.slice().sort((a, b) => a.date.localeCompare(b.date));
  }

  // ---------- Alimentos personalizados ----------
  function addAlimento(a) {
    const item = {
      id: uid(),
      nombre: a.nombre || "Alimento",
      unidad: a.unidad || "porción",
      kcal: Math.max(0, Math.round(+a.kcal || 0)),
      prot: Math.max(0, +a.prot || 0),
      carbs: Math.max(0, +a.carbs || 0),
      grasa: Math.max(0, +a.grasa || 0),
    };
    get().alimentos.push(item);
    save();
    return item;
  }
  function deleteAlimento(id) {
    state.alimentos = get().alimentos.filter((x) => x.id !== id);
    save();
  }

  // ---------- Agua ----------
  function setAgua(dateStr, vasos) {
    get().agua[dateStr] = Math.max(0, Math.round(vasos));
    save();
  }
  function getAgua(dateStr) {
    return get().agua[dateStr] || 0;
  }

  // ---------- Import / Export ----------
  function exportJSON() {
    return JSON.stringify(get(), null, 2);
  }
  function importJSON(json) {
    try {
      const data = typeof json === "string" ? JSON.parse(json) : json;
      state = Object.assign({}, DEFAULT, data);
      state.profile = Object.assign({}, DEFAULT.profile, data.profile || {});
      save();
      return true;
    } catch (e) {
      console.error("Import inválido:", e);
      return false;
    }
  }
  function reset() {
    state = JSON.parse(JSON.stringify(DEFAULT));
    save();
  }

  window.Store = {
    load, save, get, uid,
    updateProfile, setOnboarded,
    addComida, deleteComida, comidasDe,
    addEntreno, deleteEntreno, entrenosDe, tests5k,
    addMedicion, deleteMedicion, medicionesOrdenadas,
    addAlimento, deleteAlimento,
    setAgua, getAgua,
    exportJSON, importJSON, reset,
  };
})();
