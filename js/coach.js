/* coach.js — El agente coach. Combina el nutricionista y el entrenador para
   decirte qué hacer HOY: tu entreno, qué comer, cuánta agua y las alertas. */
(function () {
  "use strict";

  // Plan de la semana cacheado (se regenera cuando cambia el perfil)
  function semana() {
    return window.Train.generarSemana(window.Store.get().profile);
  }

  // Índice del día de hoy (0=lun ... 6=dom)
  function idxHoy() {
    return Fmt.diaSemanaLun(Fmt.hoy());
  }

  // El plan de entreno de hoy
  function entrenoHoy() {
    const plan = semana();
    return plan[idxHoy()];
  }

  // Guía completa de hoy: entreno + nutrición del día + agua
  function hoy() {
    const p = window.Store.get().profile;
    const ent = entrenoHoy();
    const carga = window.Train.cargaDelDia(ent.tipo);
    const dateStr = Fmt.ymd(Fmt.hoy());
    const nut = window.Nutri.resumenDia(dateStr, ent.tipo);
    const plan = window.Nutri.planEjemplo(p, carga);
    const agua = window.Store.getAgua(dateStr);
    return { fecha: dateStr, entreno: ent, carga, nutricion: nut, planComida: plan, agua };
  }

  // Foco del día: una frase corta y motivadora
  function foco() {
    const ent = entrenoHoy();
    const t = ent.tipo;
    const map = {
      intervals: "Hoy toca velocidad. Estas repes son las que te llevan al sub-20. 💪",
      tempo: "Día de umbral: cómodamente duro. Aguanta el ritmo. ⚡",
      long: "Tirada larga y suave. Construyes el motor. Disfruta el km. 🛣️",
      easy: "Rodaje regenerativo. Suave de verdad: hoy se recupera. 🌿",
      test5k: "¡Día de test! Mide tu avance y aprieta al final. ⏱️",
      gym: "Fuerza hoy. Más fuerte = más rápida y sin lesiones. 🏋️‍♀️",
      futbol: "Partido: cuenta como tu trote de ~5 km. Disfruta los sprints e hidrátate bien. ⚽",
      descanso: "Descanso. El progreso se cocina hoy. Duerme bien y come tu proteína. 😴",
    };
    return map[t] || "A por el día. Consistencia > perfección.";
  }

  // Alertas inteligentes (nutrición + entreno + progreso)
  function alertas() {
    const p = window.Store.get().profile;
    const out = [];
    const dateStr = Fmt.ymd(Fmt.hoy());
    const ent = entrenoHoy();
    const nut = window.Nutri.resumenDia(dateStr, ent.tipo);
    const obj = nut.objetivo, con = nut.consumido;

    // ---- Proteína ----
    if (con.kcal > 0) {
      const faltaProt = obj.prot - con.prot;
      if (faltaProt > 25) {
        out.push({ tipo: "warn", ico: "🥩", titulo: "Te falta proteína",
          texto: `Llevas ${Fmt.num(con.prot)} g de ${obj.prot} g. Suma una fuente magra (pollo, atún, huevo, yogur griego o un scoop de whey).` });
      } else if (con.prot >= obj.prot * 0.9) {
        out.push({ tipo: "good", ico: "✅", titulo: "Proteína en meta", texto: "Vas muy bien con la proteína hoy. Así se conserva el músculo en déficit." });
      }
    }

    // ---- Calorías ----
    if (con.kcal > obj.kcal + 250) {
      out.push({ tipo: "warn", ico: "⚖️", titulo: "Por encima de tu objetivo",
        texto: `Vas en ${Fmt.num(con.kcal)} kcal (meta ${Fmt.num(obj.kcal)}). No pasa nada por un día; retoma mañana. Prioriza proteína y verduras.` });
    } else if (con.kcal > 0 && con.kcal < obj.kcal * 0.6 && new Date().getHours() >= 19) {
      out.push({ tipo: "info", ico: "🍽️", titulo: "Vas muy baja en calorías",
        texto: `Solo ${Fmt.num(con.kcal)} kcal hoy. Comer muy poco te quita energía para entrenar y rendir. Completa tu cena.` });
    }

    // ---- Agua ----
    const agua = window.Store.getAgua(dateStr);
    if (agua < (p.aguaMetaVasos || 8) && new Date().getHours() >= 15) {
      out.push({ tipo: "info", ico: "💧", titulo: "Hidrátate",
        texto: `Llevas ${agua}/${p.aguaMetaVasos || 8} vasos. ${["intervals","tempo","long","futbol","test5k"].indexOf(ent.tipo)>=0 ? "Hoy entrenas duro: bebe más." : "Sigue tomando agua a lo largo del día."}` });
    }

    // ---- Carbos en día duro ----
    if (window.Train.cargaDelDia(ent.tipo) === "alta" && con.kcal > 0 && con.carbs < obj.carbs * 0.6) {
      out.push({ tipo: "warn", ico: "🍚", titulo: "Sube carbohidratos hoy",
        texto: `Hoy es día de carga alta (${ent.info.label}). Vas en ${Fmt.num(con.carbs)} g de ${obj.carbs} g de carbos. Necesitas energía para rendir.` });
    }

    // ---- Test de 5k pendiente ----
    const tests = window.Store.tests5k();
    const ultimoTest = tests.length ? tests[tests.length - 1] : null;
    if (!ultimoTest) {
      out.push({ tipo: "info", ico: "⏱️", titulo: "Haz tu primer test de 5 km",
        texto: "Necesitamos tu tiempo actual para calcular tus ritmos y proyectar el sub-20. Registra un test cuando puedas." });
    } else if (Fmt.diasEntre(ultimoTest.date, Fmt.hoy()) > 28) {
      out.push({ tipo: "info", ico: "📈", titulo: "Toca test de 5 km",
        texto: `Tu último test fue hace ${Fmt.diasEntre(ultimoTest.date, Fmt.hoy())} días. Mide de nuevo para ver tu avance real.` });
    }

    // ---- Tendencia de peso ----
    const meds = window.Store.medicionesOrdenadas().filter((m) => m.pesoKg > 0);
    if (meds.length >= 2) {
      const prim = meds[0], ult = meds[meds.length - 1];
      const dKg = ult.pesoKg - prim.pesoKg;
      const dSem = Math.max(1, Fmt.diasEntre(prim.date, ult.date) / 7);
      const ritmoSem = dKg / dSem;
      if (p.objetivo !== "mantener") {
        if (ritmoSem < -0.8) {
          out.push({ tipo: "warn", ico: "⚠️", titulo: "Estás bajando muy rápido",
            texto: `~${Fmt.num(Math.abs(ritmoSem),1)} kg/semana. Bajar tan rápido te hace perder músculo y rendimiento. Sube un poco las calorías (sobre todo carbos).` });
        } else if (ritmoSem >= -0.6 && ritmoSem <= -0.15) {
          out.push({ tipo: "good", ico: "🎯", titulo: "Ritmo de definición ideal",
            texto: `Bajas ~${Fmt.num(Math.abs(ritmoSem),1)} kg/semana. Ese es el punto dulce: pierdes grasa y conservas músculo.` });
        } else if (ritmoSem > 0.1) {
          out.push({ tipo: "info", ico: "📊", titulo: "El peso no baja",
            texto: "Puede ser normal (agua, músculo, ciclo). Si sigue 2–3 semanas, ajusta un poco las calorías o el volumen de entreno." });
        }
      }
    } else if (meds.length === 0) {
      out.push({ tipo: "info", ico: "⚖️", titulo: "Registra tu peso y medidas",
        texto: "Añade tu primera medición para seguir tu progreso hacia la definición." });
    }

    return out;
  }

  // Resumen para la pantalla de inicio (KPIs)
  function resumen() {
    const p = window.Store.get().profile;
    const dateStr = Fmt.ymd(Fmt.hoy());
    const ent = entrenoHoy();
    const nut = window.Nutri.resumenDia(dateStr, ent.tipo);
    const proj = window.Train.proyeccion(p);
    return { entreno: ent, nutricion: nut, proyeccion: proj, foco: foco() };
  }

  window.Coach = { semana, idxHoy, entrenoHoy, hoy, foco, alertas, resumen };
})();
