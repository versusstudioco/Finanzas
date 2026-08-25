/* training.js — Motor de running ("el entrenador").
   Calcula tus ritmos de entrenamiento, arma tu semana alrededor del gym y el
   fútbol, y te guía hacia el reto: 5 km en 20:00 (4:00/km).
   Basado en principios de entrenamiento por zonas (fácil / umbral / VO2 / velocidad). */
(function () {
  "use strict";

  // Etiquetas de tipos de sesión
  const TIPOS = {
    easy:      { label: "Rodaje suave", ico: "🏃‍♀️", color: "easy" },
    intervals: { label: "Intervalos (VO2 máx)", ico: "🔥", color: "hard" },
    tempo:     { label: "Tempo / umbral", ico: "⚡", color: "tempo" },
    long:      { label: "Tirada larga", ico: "🛣️", color: "long" },
    test5k:    { label: "Test 5 km", ico: "⏱️", color: "test" },
    gym:       { label: "Gimnasio (fuerza)", ico: "🏋️‍♀️", color: "gym" },
    futbol:    { label: "Fútbol", ico: "⚽", color: "futbol" },
    movilidad: { label: "Movilidad / core", ico: "🧘‍♀️", color: "mov" },
    descanso:  { label: "Descanso", ico: "😴", color: "rest" },
    carrera:   { label: "Carrera", ico: "🏅", color: "test" },
  };

  const HARD = ["intervals", "tempo", "test5k", "carrera", "futbol"];

  // Ritmo objetivo del reto (seg/km). 20:00 en 5 km = 240 s/km.
  function ritmoObjetivo(p) {
    return (p.objetivoTiempoSeg || 1200) / (p.objetivoDistanciaKm || 5);
  }

  // Ritmo de referencia = tu 5k actual, o una estimación conservadora si no hay test.
  function ritmoReferencia(p) {
    if (p.mejor5kSeg && p.mejor5kSeg > 0) return p.mejor5kSeg / 5;
    return ritmoObjetivo(p) + 55; // ~55 s/km más lento como punto de partida
  }

  // Zonas de ritmo (seg/km) calculadas desde tu referencia actual.
  function zonas(p) {
    const ref = ritmoReferencia(p);
    const g = ritmoObjetivo(p);
    return {
      referencia: ref,
      objetivo: g,
      facil:    ref + 80,   // rodajes suaves (conversar sin ahogarse)
      larga:    ref + 70,   // tirada larga
      tempo:    ref + 22,   // umbral (cómodamente duro, 20–40 min)
      intervalos: ref - 3,  // VO2máx (repes de 400–1000 m)
      velocidad: ref - 18,  // repes cortas de 200–400 m
      objetivoPace: g,      // ritmo del reto (4:00/km)
    };
  }

  // ---------- Fase / periodización ----------
  function fase(p) {
    // Si hay fecha del reto, calcula semanas restantes.
    let semanas = null;
    if (p.fechaReto) {
      const d = Fmt.diasEntre(Fmt.hoy(), p.fechaReto);
      semanas = Math.ceil(d / 7);
    }
    if (semanas != null && semanas <= 0) {
      return { nombre: "¡Semana del reto!", semanas, desc: "Baja el volumen, mantén algo de intensidad y llega descansada." };
    }
    if (semanas != null && semanas <= 2) {
      return { nombre: "Afinamiento (tapering)", semanas, desc: "Reduce volumen ~30–40%, conserva la calidad. Descansa y llega fresca." };
    }
    if (semanas != null && semanas <= 5) {
      return { nombre: "Fase específica", semanas, desc: "Trabajo a ritmo de meta (4:00/km) y umbral. Aquí se afila la velocidad del 5k." };
    }
    if (semanas != null && semanas <= 9) {
      return { nombre: "Fase de calidad (VO2máx)", semanas, desc: "Intervalos duros para subir tu techo aeróbico. El motor del sub-20." };
    }
    return { nombre: "Fase base", semanas, desc: "Construye kilometraje fácil y fuerza. La base que sostiene todo lo demás." };
  }

  // ---------- Detalle de cada sesión de running ----------
  function detalleSesion(tipo, p) {
    const z = zonas(p);
    const f = fase(p);
    const objetivo = Fmt.ritmo(z.objetivo);
    switch (tipo) {
      case "intervals": {
        // Menú de intervalos según fase
        let bloque;
        if (f.nombre.indexOf("base") >= 0) {
          bloque = "5 × 3 min fuerte / 2 min trote suave";
        } else if (f.nombre.indexOf("VO2") >= 0 || f.nombre.indexOf("calidad") >= 0) {
          bloque = `6 × 800 m a ${Fmt.ritmo(z.intervalos)} · recup. 90 s trote`;
        } else if (f.nombre.indexOf("específica") >= 0) {
          bloque = `5 × 1000 m a ${objetivo} (ritmo de meta) · recup. 90 s`;
        } else {
          bloque = `4 × 1000 m a ${objetivo} · recup. 2 min`;
        }
        return {
          titulo: "Intervalos (VO2 máx)",
          detalle: bloque,
          calienta: "10–15 min suave + 4 progresiones de 20 s",
          enfria: "10 min muy suave",
          ritmo: `Repes ~${Fmt.ritmo(z.intervalos)} · meta ${objetivo}`,
          tip: "La sesión clave para el sub-20. Corre las repes controlada pero fuerte; las últimas deben costar.",
        };
      }
      case "tempo":
        return {
          titulo: "Tempo / umbral",
          detalle: `20–30 min continuos a ${Fmt.ritmo(z.tempo)} (cómodamente duro)`,
          calienta: "10 min suave",
          enfria: "10 min suave",
          ritmo: `Umbral ~${Fmt.ritmo(z.tempo)}`,
          tip: "Ritmo 'cómodamente duro': podrías decir solo frases cortas. Sube tu resistencia a la velocidad.",
        };
      case "long":
        return {
          titulo: "Tirada larga",
          detalle: `8–12 km a ${Fmt.ritmo(z.larga)} (suave, conversando)`,
          calienta: "Arranca fácil",
          enfria: "Camina 3–5 min al final",
          ritmo: `Suave ~${Fmt.ritmo(z.larga)}`,
          tip: "Construye base aeróbica. Si quieres, termina los últimos 2 km algo más rápidos.",
        };
      case "easy":
        return {
          titulo: "Rodaje suave",
          detalle: `30–40 min a ${Fmt.ritmo(z.facil)} (regenerativo)`,
          calienta: "",
          enfria: "Estiramientos suaves",
          ritmo: `Fácil ~${Fmt.ritmo(z.facil)}`,
          tip: "Debe sentirse fácil. Corre lento para poder correr rápido los días de calidad.",
        };
      case "test5k":
        return {
          titulo: "Test de 5 km",
          detalle: `5 km a tope. Objetivo: acercarte a ${Fmt.tiempo(p.objetivoTiempoSeg)} (${objetivo})`,
          calienta: "15 min suave + 4 progresiones",
          enfria: "10 min muy suave",
          ritmo: `Meta ${objetivo}`,
          tip: "Sal controlada los primeros 1–2 km (no más rápido que el ritmo meta) y aprieta al final. Registra el tiempo.",
        };
      default:
        return { titulo: TIPOS[tipo] ? TIPOS[tipo].label : tipo, detalle: "", calienta: "", enfria: "", ritmo: "", tip: "" };
    }
  }

  // ---------- Generador de la semana ----------
  // Coloca sesiones de calidad en los mejores días libres respetando la
  // recuperación (no dos días duros seguidos, no calidad el día después del fútbol).
  function generarSemana(p) {
    const gym = new Set(p.diasGym || []);
    const fut = new Set(p.diasFutbol || []);
    const desc = new Set(p.diasDescanso || []);

    const dias = [];
    for (let i = 0; i < 7; i++) {
      let fijo = null;
      if (desc.has(i)) fijo = "descanso";
      else if (fut.has(i)) fijo = "futbol";
      else if (gym.has(i)) fijo = "gym";
      dias.push({ idx: i, fijo, run: null });
    }

    const esDuro = (d) => d.fijo === "futbol" || (d.run && HARD.indexOf(d.run) >= 0) || d.run === "long";
    function diasDuros() {
      const s = [];
      dias.forEach((d) => { if (esDuro(d)) s.push(d.idx); });
      return s;
    }
    function libres() { return dias.filter((d) => d.fijo === null && !d.run); }
    function gap(idx) {
      const hd = diasDuros();
      let min = 7;
      hd.forEach((h) => {
        const g = Math.min(Math.abs(h - idx), 7 - Math.abs(h - idx));
        if (g < min) min = g;
      });
      return min;
    }

    function colocarCalidad(tipo, preferFinde) {
      const cands = libres();
      if (!cands.length) return false;
      let best = null, bestScore = -Infinity;
      cands.forEach((d) => {
        let score = gap(d.idx); // más separación de días duros = mejor
        if (preferFinde && (d.idx === 5 || d.idx === 6)) score += 1.5;
        if (preferFinde && d.idx === 4) score += 0.5;
        // penaliza el día justo después del fútbol (piernas cansadas)
        if (fut.has((d.idx + 6) % 7)) score -= 1.2;
        // penaliza el día antes del fútbol (llegar cansada al partido)
        if (fut.has((d.idx + 1) % 7)) score -= 0.6;
        if (score > bestScore) { bestScore = score; best = d; }
      });
      if (best) { best.run = tipo; return true; }
      return false;
    }

    // Prioridad: intervalos, tempo, tirada larga (finde). Luego rodajes suaves.
    colocarCalidad("intervals", false);
    colocarCalidad("tempo", false);
    colocarCalidad("long", true);

    // Rodaje suave: 1 en un día libre restante bien separado
    if (libres().length) colocarCalidad("easy", false);

    // Rodaje suave opcional combinado con un día de gym (doble sesión) si el
    // gym no está pegado a un día duro de running.
    dias.forEach((d) => {
      if (d.fijo === "gym") {
        const antes = dias[(d.idx + 6) % 7], despues = dias[(d.idx + 1) % 7];
        const pegadoADuro = esDuro(antes) || esDuro(despues);
        if (!pegadoADuro && !d.combo) d.combo = "easy-opcional";
      }
    });

    // Construir la salida legible
    return dias.map((d) => {
      const idx = d.idx;
      let principal, extra = null, tag = "";
      if (d.fijo === "descanso") { principal = "descanso"; }
      else if (d.fijo === "futbol") { principal = "futbol"; extra = "Cuenta como velocidad + agilidad. Hidrátate y come carbos antes."; }
      else if (d.fijo === "gym") {
        principal = "gym";
        // sugerencia de enfoque de gym según el running del día siguiente/anterior
        const siguiente = dias[(idx + 1) % 7];
        if (siguiente && (siguiente.run === "intervals" || siguiente.run === "tempo")) {
          extra = "Enfoca tren superior + core hoy (mañana hay calidad de piernas).";
        } else {
          extra = "Fuerza de piernas (sentadilla, peso muerto, zancadas) + core. Clave para no lesionarte y correr más económica.";
        }
        if (d.combo === "easy-opcional") extra += " Opcional: 20–25 min de rodaje muy suave.";
      }
      else if (d.run) { principal = d.run; }
      else { principal = "descanso"; }

      return {
        idx,
        dia: Fmt.DIAS_LARGO[(idx + 1) % 7], // idx0=lunes -> DIAS_LARGO index 1
        tipo: principal,
        info: TIPOS[principal] || TIPOS.descanso,
        extra,
        detalle: (principal === "intervals" || principal === "tempo" || principal === "long" || principal === "easy" || principal === "test5k")
          ? detalleSesion(principal, p) : null,
      };
    });
  }

  // Etiqueta corta de la carga del día (para nutrición)
  function cargaDelDia(tipo) {
    if (["intervals", "tempo", "long", "test5k", "carrera", "futbol"].indexOf(tipo) >= 0) return "alta";
    if (["easy", "gym", "movilidad"].indexOf(tipo) >= 0) return "media";
    return "baja";
  }

  // ---------- Proyección hacia el reto ----------
  function proyeccion(p) {
    const objetivo = p.objetivoTiempoSeg || 1200;
    const tests = window.Store.tests5k();
    const actual = p.mejor5kSeg || 0;
    if (!actual) {
      return {
        hayDato: false,
        mensaje: "Haz un test de 5 km para medir tu punto de partida y proyectar tu avance hacia el sub-20.",
      };
    }
    const gap = actual - objetivo; // segundos que faltan por recortar
    const listo = gap <= 0;
    // Mejora realista: ~1.5% del tiempo por mes con entreno consistente (intermedio)
    const mejoraMensual = actual * 0.015;
    const mesesEstimados = listo ? 0 : Math.ceil(gap / mejoraMensual);
    // Tendencia con los últimos tests (si hay 2+)
    let tendencia = null;
    if (tests.length >= 2) {
      const primero = tests[0], ultimo = tests[tests.length - 1];
      const dSeg = ultimo.timeSeg - primero.timeSeg;
      const dDias = Math.max(1, Fmt.diasEntre(primero.date, ultimo.date));
      tendencia = { segPorSemana: (dSeg / dDias) * 7, mejorando: dSeg < 0 };
    }
    const pct = Math.max(0, Math.min(100, Math.round(
      // progreso desde un 5k de referencia "principiante" (28:00) hacia la meta
      ((1680 - actual) / (1680 - objetivo)) * 100
    )));
    return {
      hayDato: true, listo, actual, objetivo, gap,
      mesesEstimados, mejoraMensual, tendencia, progresoPct: pct,
      mensaje: listo
        ? "¡Ya estás en tiempo de sub-20! Ahora se trata de consolidarlo y repetirlo."
        : `Te faltan ${Fmt.tiempo(gap)} por recortar. Con constancia, ~${mesesEstimados} ${mesesEstimados === 1 ? "mes" : "meses"} de entreno enfocado.`,
    };
  }

  // Consejos del entrenador (reglas de experto)
  function consejos(p) {
    const z = zonas(p);
    return [
      { ico: "🎯", titulo: "El 80/20 del corredor", texto: `El 80% de tus km deben ser suaves (~${Fmt.ritmo(z.facil)}) y solo el 20% duros. Correr fácil la mayoría del tiempo es lo que permite correr rápido el día de calidad.` },
      { ico: "🔥", titulo: "Dos calidades por semana", texto: "Intervalos (VO2máx) + tempo (umbral). Son las sesiones que suben tu velocidad para el 5k. No más de dos por semana para no lesionarte." },
      { ico: "⚽", titulo: "El fútbol ya es entrenamiento", texto: "Los sprints del partido mejoran tu velocidad y potencia. Cuéntalo como un día duro: no metas intervalos el día antes ni el día después." },
      { ico: "🏋️‍♀️", titulo: "La fuerza te hace más rápida", texto: "Sentadilla, peso muerto, zancadas y core 2×/semana te dan economía de carrera y previenen lesiones. Levantar no te pone 'voluminosa', te pone potente." },
      { ico: "🦵", titulo: "Respeta la recuperación", texto: "Nunca dos días duros seguidos. El progreso ocurre cuando descansas, no solo cuando entrenas. Duerme 7–9 h." },
      { ico: "⏱️", titulo: "Ritmo de meta: 4:00/km", texto: "Para sentir el sub-20, incluye repes al ritmo objetivo (4:00/km). Tu cuerpo aprende ese ritmo y deja de parecer imposible." },
      { ico: "📈", titulo: "Progresa poco a poco", texto: "Sube el volumen máximo ~10% por semana y haz un test de 5k cada 3–4 semanas para ver el avance real." },
      { ico: "👟", titulo: "Técnica y cadencia", texto: "Apunta a ~170–180 pasos/min, pisada bajo tu cuerpo y postura erguida. Corres más económica y con menos impacto." },
    ];
  }

  window.Train = {
    TIPOS, ritmoObjetivo, ritmoReferencia, zonas, fase,
    detalleSesion, generarSemana, cargaDelDia, proyeccion, consejos,
  };
})();
