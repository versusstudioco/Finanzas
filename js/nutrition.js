/* nutrition.js — Motor de nutrición ("el nutricionista").
   Calcula gasto energético, calorías y macros para DEFINICIÓN (bajar grasa
   manteniendo músculo), y arma planes de comida ajustados a tu entrenamiento.
   Todos los valores están calibrados para una atleta que corre + gym + fútbol. */
(function () {
  "use strict";

  // Multiplicadores de actividad (base, sin contar el entreno del día)
  const ACTIVIDAD = {
    sedentario: 1.2,
    ligero: 1.375,
    moderado: 1.55,
    alto: 1.725,
    atleta: 1.9,
  };

  // Gasto extra estimado por tipo de sesión (kcal aproximadas)
  const GASTO_SESION = {
    easy: 350, intervals: 500, tempo: 450, long: 650,
    gym: 300, futbol: 600, test5k: 400, carrera: 500, movilidad: 120,
  };

  // Mifflin-St Jeor (TMB / metabolismo basal)
  function tmb(p) {
    const base = 10 * p.pesoKg + 6.25 * p.alturaCm - 5 * p.edad;
    return Math.round(p.sexo === "M" ? base + 5 : base - 161);
  }

  // Gasto total diario (mantenimiento) según nivel de actividad
  function tdee(p) {
    const mult = ACTIVIDAD[p.nivelActividad] || 1.55;
    return Math.round(tmb(p) * mult);
  }

  // Objetivo calórico según la meta
  function objetivoCalorico(p) {
    const mant = tdee(p);
    let deficitPct = 0;
    if (p.objetivo === "definicion") deficitPct = 0.17; // déficit moderado: baja grasa sin perder rendimiento
    else if (p.objetivo === "perder") deficitPct = 0.22; // déficit algo mayor
    else deficitPct = 0; // mantener
    const objetivo = Math.round(mant * (1 - deficitPct));
    // Piso de seguridad: no bajar demasiado (rendimiento y salud hormonal)
    const piso = Math.round((p.sexo === "M" ? 1500 : 1300));
    return { mantenimiento: mant, objetivo: Math.max(objetivo, piso), deficitPct };
  }

  // Macros objetivo (g). Proteína alta para conservar músculo en déficit;
  // grasa suficiente para hormonas; el resto en carbos para rendimiento.
  function macros(p) {
    const cal = objetivoCalorico(p);
    const kcal = cal.objetivo;
    // Proteína: 2.0 g/kg (definición). Grasa: 0.9 g/kg. Carbos: el resto.
    const prot = Math.round((p.objetivo === "mantener" ? 1.8 : 2.0) * p.pesoKg);
    const grasa = Math.round(0.9 * p.pesoKg);
    const kcalRestante = kcal - prot * 4 - grasa * 9;
    const carbs = Math.max(80, Math.round(kcalRestante / 4)); // mínimo funcional
    return {
      kcal,
      mantenimiento: cal.mantenimiento,
      deficitPct: cal.deficitPct,
      prot, grasa, carbs,
      protKcal: prot * 4, carbsKcal: carbs * 4, grasaKcal: grasa * 9,
      gPorKgProt: +(prot / p.pesoKg).toFixed(1),
      agua: Math.round((35 * p.pesoKg + 500) / 250), // vasos de 250 ml aprox
    };
  }

  // Ajuste de carbohidratos según la carga del día de entreno.
  // Devuelve un objetivo de macros del día ("hoy") priorizando carbos en días duros.
  function macrosDelDia(p, tipoEntrenoHoy) {
    const base = macros(p);
    const duros = ["intervals", "tempo", "long", "test5k", "carrera", "futbol"];
    const suaves = ["easy", "gym", "movilidad"];
    let carbs = base.carbs, kcal = base.kcal, nota = "Día estándar.";
    if (duros.indexOf(tipoEntrenoHoy) >= 0) {
      // Día duro: sube carbos (+25%) y calorías para rendir y recuperar
      carbs = Math.round(base.carbs * 1.25);
      kcal = base.kcal + Math.round(base.carbs * 0.25 * 4);
      nota = "Día de carga alta: sube carbohidratos para rendir y recuperar.";
    } else if (!tipoEntrenoHoy || tipoEntrenoHoy === "descanso") {
      // Descanso: baja carbos (-20%), mantén proteína
      carbs = Math.round(base.carbs * 0.8);
      kcal = base.kcal - Math.round(base.carbs * 0.2 * 4);
      nota = "Descanso: baja un poco los carbohidratos, mantén la proteína.";
    } else if (suaves.indexOf(tipoEntrenoHoy) >= 0) {
      nota = "Día suave: carbohidratos moderados.";
    }
    return Object.assign({}, base, { kcal, carbs, carbsKcal: carbs * 4, nota });
  }

  // ---------- Base de alimentos (valores por porción indicada) ----------
  // { nombre, unidad, kcal, prot, carbs, grasa, cat }
  const ALIMENTOS = [
    // Proteínas
    { nombre: "Pechuga de pollo (150 g)", unidad: "porción", kcal: 248, prot: 47, carbs: 0, grasa: 5, cat: "Proteína" },
    { nombre: "Huevo entero (1 ud)", unidad: "ud", kcal: 72, prot: 6, carbs: 0.5, grasa: 5, cat: "Proteína" },
    { nombre: "Claras de huevo (3 ud)", unidad: "porción", kcal: 51, prot: 11, carbs: 0.7, grasa: 0.2, cat: "Proteína" },
    { nombre: "Atún al agua (1 lata 120 g)", unidad: "lata", kcal: 128, prot: 28, carbs: 0, grasa: 1.5, cat: "Proteína" },
    { nombre: "Salmón (150 g)", unidad: "porción", kcal: 280, prot: 34, carbs: 0, grasa: 16, cat: "Proteína" },
    { nombre: "Carne magra de res (150 g)", unidad: "porción", kcal: 270, prot: 39, carbs: 0, grasa: 12, cat: "Proteína" },
    { nombre: "Lomo de cerdo magro (150 g)", unidad: "porción", kcal: 250, prot: 40, carbs: 0, grasa: 9, cat: "Proteína" },
    { nombre: "Tilapia / pescado blanco (150 g)", unidad: "porción", kcal: 195, prot: 41, carbs: 0, grasa: 3, cat: "Proteína" },
    { nombre: "Yogur griego natural (150 g)", unidad: "porción", kcal: 90, prot: 15, carbs: 6, grasa: 0.5, cat: "Proteína" },
    { nombre: "Queso campesino bajo en grasa (60 g)", unidad: "porción", kcal: 110, prot: 12, carbs: 2, grasa: 6, cat: "Proteína" },
    { nombre: "Proteína whey (1 scoop)", unidad: "scoop", kcal: 120, prot: 24, carbs: 3, grasa: 1.5, cat: "Proteína" },
    { nombre: "Lentejas cocidas (1 taza)", unidad: "taza", kcal: 230, prot: 18, carbs: 40, grasa: 0.8, cat: "Proteína" },
    { nombre: "Frijoles cocidos (1 taza)", unidad: "taza", kcal: 245, prot: 15, carbs: 45, grasa: 1, cat: "Proteína" },
    { nombre: "Garbanzos cocidos (1 taza)", unidad: "taza", kcal: 269, prot: 15, carbs: 45, grasa: 4, cat: "Proteína" },
    { nombre: "Tofu firme (150 g)", unidad: "porción", kcal: 170, prot: 18, carbs: 4, grasa: 10, cat: "Proteína" },

    // Carbohidratos
    { nombre: "Arroz blanco cocido (1 taza)", unidad: "taza", kcal: 205, prot: 4, carbs: 45, grasa: 0.4, cat: "Carbohidrato" },
    { nombre: "Arroz integral cocido (1 taza)", unidad: "taza", kcal: 216, prot: 5, carbs: 45, grasa: 1.8, cat: "Carbohidrato" },
    { nombre: "Avena en hojuelas (40 g)", unidad: "porción", kcal: 150, prot: 5, carbs: 27, grasa: 3, cat: "Carbohidrato" },
    { nombre: "Arepa de maíz (1 mediana)", unidad: "ud", kcal: 165, prot: 3, carbs: 33, grasa: 2, cat: "Carbohidrato" },
    { nombre: "Pan integral (2 tajadas)", unidad: "porción", kcal: 160, prot: 8, carbs: 28, grasa: 2, cat: "Carbohidrato" },
    { nombre: "Papa cocida (1 mediana)", unidad: "ud", kcal: 130, prot: 3, carbs: 30, grasa: 0.2, cat: "Carbohidrato" },
    { nombre: "Batata / papa dulce (150 g)", unidad: "porción", kcal: 130, prot: 2, carbs: 30, grasa: 0.2, cat: "Carbohidrato" },
    { nombre: "Plátano cocido (150 g)", unidad: "porción", kcal: 195, prot: 1.5, carbs: 48, grasa: 0.4, cat: "Carbohidrato" },
    { nombre: "Yuca cocida (150 g)", unidad: "porción", kcal: 240, prot: 2, carbs: 57, grasa: 0.5, cat: "Carbohidrato" },
    { nombre: "Quinua cocida (1 taza)", unidad: "taza", kcal: 222, prot: 8, carbs: 39, grasa: 3.6, cat: "Carbohidrato" },
    { nombre: "Pasta cocida (1 taza)", unidad: "taza", kcal: 220, prot: 8, carbs: 43, grasa: 1.3, cat: "Carbohidrato" },

    // Frutas
    { nombre: "Banano (1 ud)", unidad: "ud", kcal: 105, prot: 1.3, carbs: 27, grasa: 0.4, cat: "Fruta" },
    { nombre: "Manzana (1 ud)", unidad: "ud", kcal: 95, prot: 0.5, carbs: 25, grasa: 0.3, cat: "Fruta" },
    { nombre: "Fresas (1 taza)", unidad: "taza", kcal: 49, prot: 1, carbs: 12, grasa: 0.5, cat: "Fruta" },
    { nombre: "Piña (1 taza)", unidad: "taza", kcal: 82, prot: 0.9, carbs: 22, grasa: 0.2, cat: "Fruta" },
    { nombre: "Papaya (1 taza)", unidad: "taza", kcal: 62, prot: 0.7, carbs: 16, grasa: 0.4, cat: "Fruta" },
    { nombre: "Arándanos (1 taza)", unidad: "taza", kcal: 85, prot: 1.1, carbs: 21, grasa: 0.5, cat: "Fruta" },

    // Grasas
    { nombre: "Aguacate (1/2 ud)", unidad: "porción", kcal: 160, prot: 2, carbs: 9, grasa: 15, cat: "Grasa" },
    { nombre: "Almendras (30 g)", unidad: "porción", kcal: 174, prot: 6, carbs: 6, grasa: 15, cat: "Grasa" },
    { nombre: "Maní / cacahuate (30 g)", unidad: "porción", kcal: 170, prot: 7, carbs: 5, grasa: 14, cat: "Grasa" },
    { nombre: "Aceite de oliva (1 cda)", unidad: "cda", kcal: 119, prot: 0, carbs: 0, grasa: 14, cat: "Grasa" },
    { nombre: "Mantequilla de maní (1 cda)", unidad: "cda", kcal: 95, prot: 4, carbs: 3, grasa: 8, cat: "Grasa" },
    { nombre: "Chía / linaza (1 cda)", unidad: "cda", kcal: 60, prot: 2, carbs: 5, grasa: 4, cat: "Grasa" },

    // Verduras
    { nombre: "Brócoli (1 taza)", unidad: "taza", kcal: 55, prot: 4, carbs: 11, grasa: 0.6, cat: "Verdura" },
    { nombre: "Ensalada verde mixta (1 plato)", unidad: "plato", kcal: 40, prot: 2, carbs: 7, grasa: 0.5, cat: "Verdura" },
    { nombre: "Espinaca (2 tazas)", unidad: "porción", kcal: 30, prot: 3, carbs: 4, grasa: 0.5, cat: "Verdura" },
    { nombre: "Tomate (1 ud)", unidad: "ud", kcal: 22, prot: 1, carbs: 5, grasa: 0.2, cat: "Verdura" },
    { nombre: "Verduras salteadas (1 taza)", unidad: "taza", kcal: 80, prot: 3, carbs: 12, grasa: 2.5, cat: "Verdura" },
  ];

  function alimentosBase() { return ALIMENTOS.slice(); }

  // Alimentos combinados (base + personalizados del usuario)
  function todosLosAlimentos() {
    const custom = (window.Store ? window.Store.get().alimentos : []) || [];
    return ALIMENTOS.concat(custom.map((c) => Object.assign({ cat: "Míos" }, c)));
  }

  function buscarAlimentos(q) {
    q = (q || "").trim().toLowerCase();
    const all = todosLosAlimentos();
    if (!q) return all;
    return all.filter((a) => a.nombre.toLowerCase().indexOf(q) >= 0 ||
      (a.cat || "").toLowerCase().indexOf(q) >= 0);
  }

  // ---------- Plan de comidas ejemplo ----------
  // Genera un día ejemplo que se acerca a las calorías/macros objetivo,
  // ajustando las porciones de carbohidrato según la carga (alta/media/baja).
  function planEjemplo(p, carga) {
    const m = macros(p);
    const carbFactor = carga === "alta" ? 1.3 : carga === "baja" ? 0.75 : 1;
    // Plantilla de un día (porciones "aprox"). Los números son guía, no exactos.
    const desayuno = {
      titulo: "Desayuno",
      items: [
        "Avena (40 g) con leche y " + (carga === "baja" ? "media" : "1") + " porción de fruta",
        "3 claras + 2 huevos revueltos",
        "Café o té sin azúcar",
      ],
      kcal: Math.round(430 * (0.9 + carbFactor * 0.1)),
    };
    const snack1 = {
      titulo: "Media mañana",
      items: ["Yogur griego natural (150 g)", "Puñado de almendras (20 g)"],
      kcal: 210,
    };
    const almuerzo = {
      titulo: "Almuerzo",
      items: [
        "Pechuga de pollo o pescado (150–180 g)",
        (carbFactor >= 1.2 ? "1½ taza" : carbFactor <= 0.8 ? "½ taza" : "1 taza") + " de arroz o quinua",
        "Ensalada abundante + ½ aguacate",
      ],
      kcal: Math.round(560 * (0.85 + carbFactor * 0.15)),
    };
    const snack2 = {
      titulo: "Pre-entreno",
      items: carga === "alta"
        ? ["1 banano", "1 scoop de proteína o café"]
        : ["1 fruta pequeña", "Té o café"],
      kcal: carga === "alta" ? 210 : 120,
    };
    const cena = {
      titulo: "Cena",
      items: [
        "Proteína magra (150 g: carne, pescado o tofu)",
        "Verduras salteadas o al vapor abundantes",
        (carbFactor >= 1.2 ? "1 taza" : "½ taza") + " de batata o papa",
      ],
      kcal: Math.round(480 * (0.85 + carbFactor * 0.15)),
    };
    const comidas = [desayuno, snack1, almuerzo, snack2, cena];
    const totalKcal = comidas.reduce((s, c) => s + c.kcal, 0);
    return { objetivo: m, comidas, totalKcal, carga };
  }

  // Consejos del nutricionista (reglas de experto) para tu objetivo.
  function consejos(p) {
    const m = macros(p);
    const out = [];
    out.push({
      ico: "🥩",
      titulo: "Proteína en cada comida",
      texto: `Apunta a ${m.prot} g/día (~${m.gPorKgProt} g/kg), repartidos en 4–5 tomas de 30–45 g. Es lo que protege tu músculo mientras bajas grasa y te deja "rayada".`,
    });
    out.push({
      ico: "🍚",
      titulo: "Carbohidratos alrededor del entreno",
      texto: "Concentra los carbos en el desayuno y antes/después de correr o del gym. En días de intervalos, tempo, fútbol o tirada larga, súbelos; en descanso, bájalos.",
    });
    out.push({
      ico: "🥑",
      titulo: "Grasas buenas, sin miedo",
      texto: `Unos ${m.grasa} g/día de aguacate, aceite de oliva, frutos secos, huevo y pescado. Son clave para tus hormonas y recuperación.`,
    });
    out.push({
      ico: "🥦",
      titulo: "Volumen y fibra",
      texto: "Llena medio plato de verduras en almuerzo y cena. Te sacian con pocas calorías y ayudan a la digestión y a mantener el déficit sin hambre.",
    });
    out.push({
      ico: "💧",
      titulo: "Hidratación",
      texto: `~${m.agua} vasos de agua al día, más en días de fútbol o tirada larga. La deshidratación arruina el rendimiento en el 5k.`,
    });
    out.push({
      ico: "⏱️",
      titulo: "Déficit inteligente, no extremo",
      texto: `Tu déficit es moderado (${Fmt.pct(m.deficitPct)}). Bajar muy rápido te quita energía para correr sub-20 y te hace perder músculo. Apunta a 0.3–0.5 kg/semana.`,
    });
    out.push({
      ico: "🍽️",
      titulo: "Comida real, flexible",
      texto: "80% comida de verdad (proteína, granos, fruta, verdura, grasas buenas) y 20% flexible. La sostenibilidad gana a la perfección.",
    });
    return out;
  }

  // Resumen de un día: suma de comidas registradas vs objetivo del día
  function resumenDia(dateStr, tipoEntrenoHoy) {
    const p = window.Store.get().profile;
    const objetivo = macrosDelDia(p, tipoEntrenoHoy);
    const comidas = window.Store.comidasDe(dateStr);
    const tot = comidas.reduce((s, c) => {
      s.kcal += c.kcal; s.prot += c.prot; s.carbs += c.carbs; s.grasa += c.grasa;
      return s;
    }, { kcal: 0, prot: 0, carbs: 0, grasa: 0 });
    return { objetivo, consumido: tot, comidas };
  }

  window.Nutri = {
    tmb, tdee, objetivoCalorico, macros, macrosDelDia,
    alimentosBase, todosLosAlimentos, buscarAlimentos,
    planEjemplo, consejos, resumenDia,
    ACTIVIDAD, GASTO_SESION,
  };
})();
