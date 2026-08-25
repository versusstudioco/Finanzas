/* app.js — interfaz, navegación y formularios de Rayada. */
(function () {
  "use strict";

  const main = document.getElementById("main");
  const overlay = document.getElementById("sheet-overlay");
  const onbRoot = document.getElementById("onb-root");
  let navActual = "inicio";
  const expandidos = new Set(); // días del plan expandidos

  // ---------- utilidades ----------
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pctFill = (val, obj) => obj > 0 ? clamp(Math.round((val / obj) * 100), 0, 100) : 0;

  function openSheet(html) {
    overlay.innerHTML = `<div class="sheet"><div class="grab"></div>${html}</div>`;
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeSheet() {
    overlay.classList.remove("open");
    overlay.innerHTML = "";
    document.body.style.overflow = "";
  }
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeSheet(); });

  // ---------- navegación ----------
  function irA(nav) {
    navActual = nav;
    document.querySelectorAll(".nav button").forEach((b) =>
      b.classList.toggle("active", b.dataset.nav === nav));
    render();
    main.scrollIntoView({ block: "start" });
    window.scrollTo(0, 0);
  }
  document.querySelectorAll(".nav button").forEach((b) =>
    b.addEventListener("click", () => irA(b.dataset.nav)));
  document.getElementById("btn-ajustes").addEventListener("click", sheetAjustes);
  document.getElementById("fab").addEventListener("click", sheetAgregar);

  // ======================================================================
  //  COMPONENTES REUTILIZABLES
  // ======================================================================
  function macroRing(nut) {
    const o = nut.objetivo, c = nut.consumido;
    const p = pctFill(c.kcal, o.kcal);
    const restante = Math.max(0, o.kcal - c.kcal);
    return `
      <div class="macro-ring-row">
        <div class="big-ring" style="--p:${p}">
          <div class="rv">
            <div class="n">${Fmt.num(c.kcal)}</div>
            <div class="l">de ${Fmt.num(o.kcal)} kcal</div>
          </div>
        </div>
        <div class="macro-bars">
          ${macroBar("Proteína", "prot", c.prot, o.prot)}
          ${macroBar("Carbos", "carbs", c.carbs, o.carbs)}
          ${macroBar("Grasa", "grasa", c.grasa, o.grasa)}
          <div class="small muted" style="margin-top:8px">${restante > 0 ? `Te quedan <b>${Fmt.num(restante)} kcal</b>` : "Objetivo cubierto ✅"}</div>
        </div>
      </div>`;
  }
  function macroBar(nombre, clase, val, obj) {
    return `<div class="mbar">
      <div class="mt"><span class="nm ${clase}">${nombre}</span><span class="vl">${Fmt.num(val)} / ${Fmt.num(obj)} g</span></div>
      <div class="track"><div class="fill ${clase}" style="width:${pctFill(val, obj)}%"></div></div>
    </div>`;
  }

  function alertaHTML(a) {
    return `<div class="alert ${a.tipo}">
      <div class="ico">${a.ico}</div>
      <div><div class="a-title">${esc(a.titulo)}</div><div class="a-text">${esc(a.texto)}</div></div>
    </div>`;
  }
  function tipHTML(t) {
    return `<div class="tip"><div class="ico">${t.ico}</div>
      <div><div class="t-title">${esc(t.titulo)}</div><div class="t-text">${esc(t.texto)}</div></div></div>`;
  }

  function waterTracker(dateStr) {
    const p = Store.get().profile;
    const meta = p.aguaMetaVasos || 8;
    const actual = Store.getAgua(dateStr);
    let cups = "";
    for (let i = 1; i <= meta; i++) {
      cups += `<div class="cup ${i <= actual ? "full" : ""}" data-water="${i}">${i <= actual ? '<span>💧</span>' : ""}</div>`;
    }
    return `<div class="card">
      <div class="row-between"><div class="card-title"><span class="ico">💧</span>Agua</div>
      <div class="muted small">${actual}/${meta} vasos</div></div>
      <div class="water-row" id="water-row">${cups}</div>
    </div>`;
  }

  function diaBadgeClase(tipo) {
    const map = { intervals: "hard", tempo: "tempo", long: "long", easy: "easy",
      gym: "gym", futbol: "futbol", test5k: "hard", descanso: "rest", movilidad: "rest" };
    return map[tipo] || "rest";
  }

  function sessDetalleHTML(d) {
    if (!d) return "";
    return `<div class="sess">
      <div class="main-detail">${esc(d.detalle)}</div>
      ${d.calienta ? `<div class="srow"><span class="sk">Calentar</span><span class="sv">${esc(d.calienta)}</span></div>` : ""}
      ${d.enfria ? `<div class="srow"><span class="sk">Enfriar</span><span class="sv">${esc(d.enfria)}</span></div>` : ""}
      ${d.ritmo ? `<div class="srow"><span class="sk">Ritmo</span><span class="sv">${esc(d.ritmo)}</span></div>` : ""}
      <div class="stip">💡 ${esc(d.tip)}</div>
    </div>`;
  }

  // ======================================================================
  //  PANTALLA: INICIO
  // ======================================================================
  function renderInicio() {
    const p = Store.get().profile;
    const h = Coach.hoy();
    const ent = h.entreno;
    const alertas = Coach.alertas().slice(0, 3);
    const proj = Train.proyeccion(p);
    const nombre = p.nombre ? `, ${esc(p.nombre)}` : "";
    document.getElementById("header-sub").textContent = Fmt.fechaLarga(Fmt.hoy());

    let html = `
      <div class="hero">
        <div class="label">Hola${nombre} · foco de hoy</div>
        <div class="foco">${esc(Coach.foco())}</div>
      </div>

      <div class="section-title">Entreno de hoy</div>
      <div class="card">
        <div class="workout-hero">
          <div class="wi">${ent.info.ico}</div>
          <div style="flex:1;min-width:0">
            <div class="wt">${esc(ent.info.label)}</div>
            <div class="ws">${ent.detalle ? esc(ent.detalle.detalle) : (ent.extra ? esc(ent.extra) : "Día de recuperación")}</div>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn secondary sm" data-go="entreno">Ver semana</button>
          <button class="btn primary sm" data-add="entreno">Registrar</button>
        </div>
      </div>

      <div class="section-title">Nutrición de hoy <span class="r" data-go="nutricion">Detalle ›</span></div>
      <div class="card">
        ${macroRing(h.nutricion)}
        <div class="small muted" style="margin-top:12px">🍽️ ${esc(h.nutricion.objetivo.nota)}</div>
        <div class="btn-row"><button class="btn primary sm" data-add="comida">＋ Registrar comida</button></div>
      </div>

      ${waterTracker(h.fecha)}`;

    // Proyección reto
    if (proj.hayDato) {
      html += `
      <div class="section-title">Reto: 5k en ${Fmt.tiempo(p.objetivoTiempoSeg)}</div>
      <div class="progress-hero">
        <div class="ph-label">Mejor 5k actual</div>
        <div class="ph-big">${Fmt.tiempo(proj.actual)} <span class="muted" style="font-size:16px">· ${Fmt.ritmo(proj.actual/5)}</span></div>
        <div class="ph-sub">${esc(proj.mensaje)}</div>
        <div class="progress-track"><span style="width:${proj.progresoPct}%"></span></div>
      </div>`;
    }

    if (alertas.length) {
      html += `<div class="section-title">El coach dice</div>`;
      alertas.forEach((a) => (html += alertaHTML(a)));
      html += `<button class="btn ghost block mt8" data-go="coach">Ver todo el análisis del coach ›</button>`;
    }

    main.innerHTML = html;
  }

  // ======================================================================
  //  PANTALLA: NUTRICIÓN
  // ======================================================================
  let nutTab = "hoy";
  function renderNutricion() {
    const p = Store.get().profile;
    document.getElementById("header-sub").textContent = "Nutrición";
    let html = `<div class="segmented">
      <button data-nt="hoy" class="${nutTab==="hoy"?"active":""}">Hoy</button>
      <button data-nt="plan" class="${nutTab==="plan"?"active":""}">Plan</button>
      <button data-nt="consejos" class="${nutTab==="consejos"?"active":""}">Consejos</button>
    </div>`;

    if (nutTab === "hoy") {
      const dateStr = Fmt.ymd(Fmt.hoy());
      const ent = Coach.entrenoHoy();
      const nut = Nutri.resumenDia(dateStr, ent.tipo);
      html += `<div class="card">${macroRing(nut)}
        <div class="small muted" style="margin-top:12px">🍽️ ${esc(nut.objetivo.nota)}</div></div>`;
      // comidas registradas agrupadas
      const orden = ["desayuno", "almuerzo", "cena", "snack"];
      const nombres = { desayuno: "🌅 Desayuno", almuerzo: "☀️ Almuerzo", cena: "🌙 Cena", snack: "🍎 Snacks" };
      if (!nut.comidas.length) {
        html += `<div class="empty"><div class="big-emoji">🥗</div>Aún no has registrado comidas hoy.<br>Toca <b>＋ Registrar comida</b>.</div>`;
      } else {
        orden.forEach((tipo) => {
          const items = nut.comidas.filter((c) => c.comida === tipo);
          if (!items.length) return;
          const kcal = items.reduce((s, c) => s + c.kcal, 0);
          html += `<div class="meal-group"><div class="meal-head"><span class="mh-name">${nombres[tipo]}</span><span class="mh-kcal">${Fmt.num(kcal)} kcal</span></div><div class="card tight">`;
          items.forEach((c) => {
            html += `<div class="list-item">
              <div class="li-main"><div class="li-title">${esc(c.label)}</div>
              <div class="li-sub">P ${Fmt.num(c.prot)} · C ${Fmt.num(c.carbs)} · G ${Fmt.num(c.grasa)} g</div></div>
              <div class="li-right"><div class="li-amount">${Fmt.num(c.kcal)}</div></div>
              <div class="li-del" data-delcomida="${c.id}">🗑</div>
            </div>`;
          });
          html += `</div></div>`;
        });
      }
      html += `<button class="btn primary block mt8" data-add="comida">＋ Registrar comida</button>`;
      html += waterTracker(dateStr);
    }

    if (nutTab === "plan") {
      const m = Nutri.macros(p);
      html += `<div class="card">
        <div class="card-title"><span class="ico">🎯</span>Tus números (objetivo diario)</div>
        <div class="card-sub">Calculados para tu meta: <b>${objetivoTxt(p.objetivo)}</b></div>
        <div class="kpi-grid" style="margin-top:12px">
          <div class="kpi"><div class="k">Calorías objetivo</div><div class="v accent">${Fmt.num(m.kcal)}</div><div class="vs">mantenimiento ${Fmt.num(m.mantenimiento)}</div></div>
          <div class="kpi"><div class="k">Proteína</div><div class="v">${Fmt.num(m.prot)} g</div><div class="vs">${m.gPorKgProt} g/kg</div></div>
          <div class="kpi"><div class="k">Carbohidratos</div><div class="v">${Fmt.num(m.carbs)} g</div><div class="vs">${Fmt.num(m.carbsKcal)} kcal</div></div>
          <div class="kpi"><div class="k">Grasa</div><div class="v">${Fmt.num(m.grasa)} g</div><div class="vs">${Fmt.num(m.grasaKcal)} kcal</div></div>
        </div>
        <div class="small muted" style="margin-top:12px">Déficit ${Fmt.pct(m.deficitPct)} sobre tu mantenimiento. Meta de agua: ~${m.agua} vasos/día.</div>
      </div>`;
      html += aprendizajeHTML(p);

      // plan ejemplo por carga
      const carga = window._cargaPlan || "media";
      const plan = Nutri.planEjemplo(p, carga);
      html += `<div class="section-title">Día de comidas ejemplo</div>
      <div class="segmented">
        <button data-carga="baja" class="${carga==="baja"?"active":""}">Descanso</button>
        <button data-carga="media" class="${carga==="media"?"active":""}">Suave</button>
        <button data-carga="alta" class="${carga==="alta"?"active":""}">Día duro</button>
      </div>
      <div class="card">`;
      plan.comidas.forEach((c) => {
        html += `<div class="plan-meal"><div class="pm-top"><span class="pm-title">${esc(c.titulo)}</span><span class="pm-kcal">~${Fmt.num(c.kcal)} kcal</span></div>
          <ul>${c.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`;
      });
      html += `<div class="small muted">Total aprox: <b>${Fmt.num(plan.totalKcal)} kcal</b>. Ajusta porciones para acercarte a tu objetivo. Es una guía, no una regla estricta.</div></div>`;
    }

    if (nutTab === "consejos") {
      html += `<div class="section-title">Guía del nutricionista</div>`;
      Nutri.consejos(p).forEach((c) => (html += tipHTML(c)));
    }

    main.innerHTML = html;
  }

  function objetivoTxt(o) {
    return o === "definicion" ? "Definición (bajar grasa, quedar rayada)"
      : o === "perder" ? "Bajar de peso" : "Mantener";
  }

  // ======================================================================
  //  PANTALLA: ENTRENO
  // ======================================================================
  let entTab = "semana";
  function renderEntreno() {
    const p = Store.get().profile;
    document.getElementById("header-sub").textContent = "Entrenamiento";
    let html = `<div class="segmented">
      <button data-et="semana" class="${entTab==="semana"?"active":""}">Semana</button>
      <button data-et="ritmos" class="${entTab==="ritmos"?"active":""}">Ritmos</button>
      <button data-et="consejos" class="${entTab==="consejos"?"active":""}">Consejos</button>
    </div>`;

    if (entTab === "semana") {
      const f = Train.fase(p);
      html += `<div class="card">
        <div class="card-title"><span class="ico">📍</span>Fase: ${esc(f.nombre)}${f.semanas!=null?` · ${f.semanas} sem. al reto`:""}</div>
        <div class="card-sub">${esc(f.desc)}</div>
      </div>`;
      const plan = Coach.semana();
      const hoyIdx = Coach.idxHoy();
      html += `<div class="week">`;
      plan.forEach((d) => {
        const esHoy = d.idx === hoyIdx;
        const exp = expandidos.has(d.idx) || esHoy;
        const titulo = tituloDia(d);
        html += `<div class="day-row ${esHoy?"today":""}" data-day="${d.idx}">
          <div class="dd"><div class="dn">${Fmt.DIAS[(d.idx+1)%7]}</div><div class="di">${d.info.ico}</div></div>
          <div class="dmain"><div class="dtitle">${esc(titulo)}${esHoy?' · hoy':''}</div>
          ${d.extra?`<div class="dtext">${esc(d.extra)}</div>`:""}
          ${d.detalle?`<div class="dtext">🏃‍♀️ ${esc(d.detalle.detalle)}</div>`:""}</div>
          <div class="badge ${diaBadgeClase(d.tipo)}">${cargaLabel(d.tipo)}</div>
        </div>`;
        if (exp && d.gymDetalle) html += gymDetalleHTML(d.gymDetalle);
        if (exp && d.detalle) html += sessDetalleHTML(d.detalle);
      });
      html += `</div>`;
      html += `<div class="small muted center mt16">Tu plan se arma solo alrededor de tus días de gym y fútbol, respetando la recuperación. Cámbialos en ⚙️ Ajustes.</div>`;
      html += `<button class="btn primary block mt16" data-add="entreno">＋ Registrar entrenamiento</button>`;
    }

    if (entTab === "ritmos") {
      const z = Train.zonas(p);
      html += `<div class="card">
        <div class="card-title"><span class="ico">⏱️</span>Tus ritmos de entrenamiento</div>
        <div class="card-sub">${p.mejor5kSeg?`Calculados desde tu 5k de ${Fmt.tiempo(p.mejor5kSeg)}.`:"Estimados. Haz un test de 5k para afinarlos."}</div>
        <div style="margin-top:8px">
          ${zonaHTML("Fácil / regenerativo", "Rodajes suaves, conversando", z.facil)}
          ${zonaHTML("Tirada larga", "Base aeróbica, cómodo", z.larga)}
          ${zonaHTML("Tempo / umbral", "Cómodamente duro (20–40 min)", z.tempo)}
          ${zonaHTML("Intervalos (VO2máx)", "Repes de 400–1000 m", z.intervalos)}
          ${zonaHTML("Velocidad", "Repes cortas 200–400 m", z.velocidad)}
          <div class="zone goal"><div><div class="zn">🎯 Ritmo del reto</div><div class="zd">5k en ${Fmt.tiempo(p.objetivoTiempoSeg)}</div></div><div class="zv">${Fmt.ritmo(z.objetivo)}</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">📖</span>Cómo usarlos</div>
        <div class="card-sub">El 80% de tus kilómetros deben ir en ritmo <b>Fácil</b>. Solo el 20% (intervalos + tempo) va duro. Correr lento la mayoría del tiempo es lo que te permite correr rápido el día de calidad y llegar al sub-20 sin lesionarte.</div>
      </div>`;
    }

    if (entTab === "consejos") {
      html += `<div class="section-title">Guía del entrenador</div>`;
      Train.consejos(p).forEach((c) => (html += tipHTML(c)));
    }

    main.innerHTML = html;
  }

  function zonaHTML(nombre, desc, seg) {
    return `<div class="zone"><div><div class="zn">${esc(nombre)}</div><div class="zd">${esc(desc)}</div></div><div class="zv">${Fmt.ritmo(seg)}</div></div>`;
  }
  // Título del día combinando gym + running cuando ambos existen
  function tituloDia(d) {
    const partes = [];
    if (d.gymDetalle) partes.push("Gym: " + d.gymDetalle.bloques.map((b) => b.label).join(" · "));
    if (d.run && Train.TIPOS[d.run]) partes.push(Train.TIPOS[d.run].label);
    if (partes.length) return partes.join("  +  ");
    return d.info.label;
  }
  function gymDetalleHTML(gd) {
    let filas = gd.bloques.map((b) =>
      `<div class="srow"><span class="sk">${b.ico} ${esc(b.label)}</span><span class="sv">${esc(b.ejercicios.join(", "))}</span></div>`).join("");
    return `<div class="sess">
      <div class="main-detail">🏋️‍♀️ Gimnasio — ${esc(gd.bloques.map((b)=>b.label).join(" · "))}</div>
      ${filas}
      <div class="stip">💡 3–4 series por ejercicio, 8–12 reps. Prioriza técnica y progresar cargas. ${gd.esPierna?"Día de piernas: no metas intervalos ni tempo hoy.":"Día de tren superior: ideal para combinar con un rodaje."}</div>
    </div>`;
  }
  function cargaLabel(tipo) {
    const c = Train.cargaDelDia(tipo);
    if (tipo === "descanso") return "descanso";
    return c === "alta" ? "carga alta" : c === "media" ? "suave" : "ligero";
  }

  // ======================================================================
  //  PANTALLA: PROGRESO
  // ======================================================================
  function renderProgreso() {
    const p = Store.get().profile;
    document.getElementById("header-sub").textContent = "Progreso";
    const proj = Train.proyeccion(p);
    let html = "";

    // Reto sub-20
    html += `<div class="progress-hero">
      <div class="ph-label">Reto · 5k en ${Fmt.tiempo(p.objetivoTiempoSeg)}</div>`;
    if (proj.hayDato) {
      html += `<div class="ph-big">${Fmt.tiempo(proj.actual)}</div>
        <div class="ph-sub">${esc(proj.mensaje)}${proj.tendencia?` · ${proj.tendencia.mejorando?"📉 mejorando":"📈 estable"}`:""}</div>
        <div class="progress-track"><span style="width:${proj.progresoPct}%"></span></div>`;
    } else {
      html += `<div class="ph-big muted" style="font-size:18px">Sin datos</div><div class="ph-sub">${esc(proj.mensaje)}</div>`;
    }
    html += `<div class="btn-row"><button class="btn secondary sm" data-add="test">＋ Registrar test 5k</button></div></div>`;

    // Gráfico de 5k
    const tests = Store.tests5k();
    if (tests.length) {
      html += `<div class="section-title">Tus 5k</div><div class="card">
        ${chartTiempos(tests, p.objetivoTiempoSeg)}
        <div style="margin-top:10px">`;
      tests.slice().reverse().forEach((t) => {
        html += `<div class="list-item"><div class="li-main"><div class="li-title">${Fmt.tiempo(t.timeSeg)} <span class="muted" style="font-weight:400">· ${Fmt.ritmo(t.timeSeg/5)}</span></div>
          <div class="li-sub">${Fmt.fecha(t.date)}</div></div>
          <div class="li-del" data-delentreno="${t.id}">🗑</div></div>`;
      });
      html += `</div></div>`;
    }

    // Peso
    const meds = Store.medicionesOrdenadas().filter((m) => m.pesoKg > 0);
    html += `<div class="section-title">Peso <span class="r" data-add="peso">＋ Registrar</span></div>`;
    if (meds.length) {
      const ult = meds[meds.length - 1];
      const prim = meds[0];
      const delta = ult.pesoKg - prim.pesoKg;
      html += `<div class="card">
        <div class="kpi-grid three">
          <div class="kpi"><div class="k">Actual</div><div class="v">${Fmt.num(ult.pesoKg,1)} kg</div></div>
          <div class="kpi"><div class="k">Cambio</div><div class="v ${delta<=0?'good':'bad'}">${delta>0?'+':''}${Fmt.num(delta,1)} kg</div></div>
          <div class="kpi"><div class="k">Registros</div><div class="v">${meds.length}</div></div>
        </div>
        ${meds.length>1?chartPeso(meds):""}
      </div>`;
    } else {
      html += `<div class="empty"><div class="big-emoji">⚖️</div>Registra tu peso para ver tu progreso.</div>`;
    }

    // Medidas (cintura)
    const conCintura = Store.medicionesOrdenadas().filter((m) => m.cintura > 0);
    if (conCintura.length) {
      const ult = conCintura[conCintura.length - 1];
      const prim = conCintura[0];
      html += `<div class="section-title">Cintura</div><div class="card">
        <div class="kpi-grid">
          <div class="kpi"><div class="k">Actual</div><div class="v">${Fmt.num(ult.cintura,1)} cm</div></div>
          <div class="kpi"><div class="k">Cambio</div><div class="v ${ult.cintura-prim.cintura<=0?'good':'bad'}">${ult.cintura-prim.cintura>0?'+':''}${Fmt.num(ult.cintura-prim.cintura,1)} cm</div></div>
        </div></div>`;
    }

    // Fotos de progreso (se cargan async desde IndexedDB)
    html += `<div class="section-title">Fotos de progreso <span class="r" data-add="foto">＋ Añadir</span></div>
      <div id="fotos-cont"><div class="empty small"><div class="big-emoji">📸</div>Cargando…</div></div>`;

    main.innerHTML = html;
    cargarFotos();
  }

  // Rellena #fotos-cont de forma asíncrona
  async function cargarFotos() {
    const cont = document.getElementById("fotos-cont");
    if (!cont || !window.Fotos) return;
    let metas;
    try { metas = await Fotos.list(); } catch (e) { cont.innerHTML = `<div class="empty small">No se pudieron cargar las fotos.</div>`; return; }
    if (!metas.length) {
      cont.innerHTML = `<div class="empty"><div class="big-emoji">📸</div>Aún no tienes fotos.<br>Toma una hoy y compara tu progreso con el tiempo.</div>
        <button class="btn secondary block" data-add="foto">📸 Tomar / subir foto</button>`;
      return;
    }
    // grid con placeholders; carga cada imagen
    cont.innerHTML = `<div class="photo-grid">${metas.map((m)=>`
      <div class="photo-cell" data-foto="${m.id}"><div class="pc-date">${Fmt.fecha(m.date)}</div></div>`).join("")}</div>
      <div class="small muted center mt8">${metas.length} foto${metas.length>1?"s":""}. Toca una para verla en grande.</div>`;
    metas.forEach(async (m) => {
      const cell = cont.querySelector(`[data-foto="${m.id}"]`);
      if (!cell) return;
      try {
        const url = await Fotos.url(m.id);
        if (url) { const img = new Image(); img.src = url; img.alt = ""; cell.insertBefore(img, cell.firstChild); }
      } catch (e) {}
    });
  }

  // Visor de foto a pantalla completa
  async function verFoto(id) {
    let url, metas;
    try { url = await Fotos.url(id); metas = await Fotos.list(); } catch (e) { return; }
    if (!url) return;
    const m = metas.find((x) => x.id === id) || {};
    const div = document.createElement("div");
    div.className = "photo-viewer";
    div.innerHTML = `<img src="${url}" alt="">
      <div class="pv-meta">${Fmt.fechaLarga(m.date||Fmt.hoy())}${m.nota?`<div class="small muted">${esc(m.nota)}</div>`:""}</div>
      <div class="pv-actions"><button class="btn danger sm" id="pv-del">🗑 Borrar</button><button class="btn primary sm" id="pv-close">Cerrar</button></div>`;
    document.body.appendChild(div);
    const cerrar = () => { document.body.removeChild(div); URL.revokeObjectURL(url); };
    div.addEventListener("click", (e) => { if (e.target === div) cerrar(); });
    div.querySelector("#pv-close").onclick = cerrar;
    div.querySelector("#pv-del").onclick = async () => {
      if (confirm("¿Borrar esta foto?")) { await Fotos.remove(id); cerrar(); if (navActual === "progreso") cargarFotos(); }
    };
  }

  // Gráfico de líneas simple (SVG) para tiempos de 5k (menor = mejor)
  function chartTiempos(tests, objetivo) {
    const pts = tests.map((t) => ({ x: t.date, y: t.timeSeg }));
    const ys = pts.map((p) => p.y).concat([objetivo]);
    let min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
    if (max - min < 30) { max += 30; min -= 30; }
    const W = 320, H = 140, pad = 24;
    const n = pts.length;
    const xAt = (i) => n <= 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (n - 1);
    const yAt = (v) => H - pad - ((v - min) / (max - min)) * (H - 2 * pad);
    let line = "", dots = "";
    pts.forEach((p, i) => {
      const x = xAt(i), y = yAt(p.y);
      line += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
      dots += `<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5"/>`;
    });
    const gy = yAt(objetivo);
    return `<div class="chart-wrap"><svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
      <line class="goal-line" x1="${pad}" y1="${gy.toFixed(1)}" x2="${W-pad}" y2="${gy.toFixed(1)}"/>
      <text class="lbl" x="${W-pad}" y="${(gy-5).toFixed(1)}" text-anchor="end">meta ${Fmt.tiempo(objetivo)}</text>
      <path class="line" d="${line}"/>${dots}
    </svg></div>`;
  }

  // Gráfico de peso
  function chartPeso(meds) {
    const pts = meds.map((m) => m.pesoKg);
    let min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
    if (max - min < 2) { max += 1; min -= 1; }
    const W = 320, H = 130, pad = 20;
    const n = pts.length;
    const xAt = (i) => n <= 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (n - 1);
    const yAt = (v) => H - pad - ((v - min) / (max - min)) * (H - 2 * pad);
    let line = "", dots = "";
    pts.forEach((v, i) => {
      const x = xAt(i), y = yAt(v);
      line += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
      dots += `<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3"/>`;
    });
    return `<div class="chart-wrap" style="margin-top:8px"><svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <path class="line" d="${line}"/>${dots}</svg></div>`;
  }

  // Tarjeta del coach que "aprende" de tu progreso de peso
  function aprendizajeHTML(p) {
    const a = Nutri.aprendizaje(p);
    const emoji = !a.hayDato ? "🧠" : a.ajuste === 0 ? "🎯" : "🧠";
    const badge = a.hayDato && a.ajuste ? `<div class="pill-stat">${a.ajuste>0?"+":""}${a.ajuste} kcal</div>` : "";
    return `<div class="card">
      <div class="row-between"><div class="card-title"><span class="ico">${emoji}</span>El coach aprende de ti</div>${badge}</div>
      <div class="card-sub" style="margin-top:4px">${esc(a.texto)}</div>
    </div>`;
  }

  // ======================================================================
  //  PANTALLA: COACH (agente)
  // ======================================================================
  function renderCoach() {
    const p = Store.get().profile;
    document.getElementById("header-sub").textContent = "Tu coach";
    const h = Coach.hoy();
    const ent = h.entreno;
    const alertas = Coach.alertas();
    let html = `<div class="hero">
      <div class="label">🤖 Tu coach · ${Fmt.fechaLarga(Fmt.hoy())}</div>
      <div class="foco">${esc(Coach.foco())}</div>
    </div>`;

    // Qué hacer hoy — entreno
    html += `<div class="section-title">1. Tu entrenamiento hoy</div><div class="card">
      <div class="workout-hero"><div class="wi">${ent.info.ico}</div>
      <div style="flex:1;min-width:0"><div class="wt">${esc(ent.info.label)}</div>
      <div class="ws">${ent.detalle?esc(ent.detalle.detalle):(ent.extra?esc(ent.extra):"Descanso: recupera y duerme bien.")}</div></div></div>`;
    if (ent.detalle) html += sessDetalleHTML(ent.detalle);
    else if (ent.extra) html += `<div class="stip" style="margin-top:10px">💡 ${esc(ent.extra)}</div>`;
    html += `<div class="btn-row"><button class="btn primary sm" data-add="entreno">Registrar entreno</button></div></div>`;

    // Qué comer hoy
    html += `<div class="section-title">2. Qué comer hoy <span class="r">${cargaTxt(h.carga)}</span></div>
      <div class="card">${macroRing(h.nutricion)}
      <div class="small muted" style="margin-top:10px">🍽️ ${esc(h.nutricion.objetivo.nota)}</div></div>`;
    html += `<div class="card">`;
    h.planComida.comidas.forEach((c) => {
      html += `<div class="plan-meal"><div class="pm-top"><span class="pm-title">${esc(c.titulo)}</span><span class="pm-kcal">~${Fmt.num(c.kcal)} kcal</span></div>
        <ul>${c.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`;
    });
    html += `<button class="btn primary block" data-add="comida">＋ Registrar comida</button></div>`;

    // Hidratación
    html += waterTracker(h.fecha);

    // Análisis / alertas
    html += `<div class="section-title">3. Análisis del día</div>`;
    html += aprendizajeHTML(p);
    if (alertas.length) alertas.forEach((a) => (html += alertaHTML(a)));
    else html += `<div class="alert good"><div class="ico">🎉</div><div><div class="a-title">Todo en orden</div><div class="a-text">Vas por buen camino. Sigue con tu plan de hoy.</div></div></div>`;

    main.innerHTML = html;
  }
  function cargaTxt(c) { return c === "alta" ? "día de carga alta" : c === "media" ? "día suave" : "día de descanso"; }

  // ======================================================================
  //  SHEETS (formularios)
  // ======================================================================
  function sheetAgregar() {
    openSheet(`<h2>¿Qué quieres registrar?</h2>
      <button class="btn secondary block mb8" data-add="comida">🥗 Comida</button>
      <button class="btn secondary block mb8" data-add="entreno">🏃‍♀️ Entrenamiento</button>
      <button class="btn secondary block mb8" data-add="test">⏱️ Test de 5k</button>
      <button class="btn secondary block mb8" data-add="peso">⚖️ Peso y medidas</button>
      <button class="btn secondary block" data-add="foto">📸 Foto de progreso</button>`);
  }

  function sheetFoto() {
    openSheet(`<h2>📸 Foto de progreso</h2>
      <div class="small muted mb8">Toma una foto (o sube una de tu galería). Se guarda solo en tu teléfono, comprimida. Ideal: misma pose, luz y ropa cada vez.</div>
      <div class="field"><label>Foto</label><input id="f-file" type="file" accept="image/*" capture="environment"></div>
      <div class="field"><label>Fecha</label><input id="f-date" type="date" value="${Fmt.ymd(Fmt.hoy())}"></div>
      <div class="field"><label>Nota</label><input id="f-nota" type="text" placeholder="Ej: semana 4, en ayunas"></div>
      <button class="btn primary block" id="f-save">Guardar foto</button>
      <div class="hint" id="f-status"></div>`);
    document.getElementById("f-save").addEventListener("click", async () => {
      const file = document.getElementById("f-file").files[0];
      if (!file) { document.getElementById("f-status").textContent = "Elige una foto primero."; return; }
      const btn = document.getElementById("f-save");
      btn.textContent = "Guardando…"; btn.disabled = true;
      try {
        await Fotos.add(file, {
          date: document.getElementById("f-date").value || Fmt.ymd(Fmt.hoy()),
          nota: document.getElementById("f-nota").value.trim(),
        });
        closeSheet();
        if (navActual !== "progreso") irA("progreso"); else render();
      } catch (e) {
        document.getElementById("f-status").textContent = "No se pudo guardar la foto en este dispositivo.";
        btn.textContent = "Guardar foto"; btn.disabled = false;
      }
    });
  }

  function sheetComida(comidaTipo) {
    const tipo = comidaTipo || sugerirComida();
    openSheet(`<h2>Registrar comida</h2>
      <div class="field"><label>Momento</label>
        <div class="chips" id="comida-chips">
          ${["desayuno","almuerzo","cena","snack"].map((t)=>`<div class="chip ${t===tipo?"active":""}" data-comida-tipo="${t}">${comidaNombre(t)}</div>`).join("")}
        </div></div>
      <div class="field"><label>Buscar alimento</label>
        <input id="food-search" type="text" placeholder="Ej: pollo, arroz, avena..." autocomplete="off"></div>
      <div class="food-results" id="food-results"></div>
      <div class="divider"></div>
      <div class="small muted mb8">O agrégalo manualmente:</div>
      <div class="field"><label>Nombre</label><input id="c-label" type="text" placeholder="Mi comida"></div>
      <div class="field-row">
        <div class="field"><label>Calorías</label><input id="c-kcal" type="number" inputmode="numeric" placeholder="0"></div>
        <div class="field"><label>Proteína (g)</label><input id="c-prot" type="number" inputmode="decimal" placeholder="0"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Carbos (g)</label><input id="c-carbs" type="number" inputmode="decimal" placeholder="0"></div>
        <div class="field"><label>Grasa (g)</label><input id="c-grasa" type="number" inputmode="decimal" placeholder="0"></div>
      </div>
      <button class="btn primary block" id="c-save">Guardar comida</button>`);

    let sel = tipo;
    const chips = document.getElementById("comida-chips");
    chips.addEventListener("click", (e) => {
      const c = e.target.closest("[data-comida-tipo]"); if (!c) return;
      sel = c.dataset.comidaTipo;
      chips.querySelectorAll(".chip").forEach((x) => x.classList.toggle("active", x === c));
    });

    const results = document.getElementById("food-results");
    const search = document.getElementById("food-search");
    function pintaResultados(q) {
      const lista = Nutri.buscarAlimentos(q).slice(0, 40);
      results.innerHTML = lista.map((a, i) =>
        `<div class="food-item" data-food="${i}">
          <div><div class="fname">${esc(a.nombre)}</div><div class="fmacro">P ${Fmt.num(a.prot)} · C ${Fmt.num(a.carbs)} · G ${Fmt.num(a.grasa)} g</div></div>
          <div class="fkcal">${Fmt.num(a.kcal)}</div></div>`).join("");
      results._lista = lista;
    }
    pintaResultados("");
    search.addEventListener("input", () => pintaResultados(search.value));
    results.addEventListener("click", (e) => {
      const it = e.target.closest("[data-food]"); if (!it) return;
      const a = results._lista[+it.dataset.food];
      Store.addComida({ comida: sel, label: a.nombre, kcal: a.kcal, prot: a.prot, carbs: a.carbs, grasa: a.grasa });
      closeSheet(); render();
    });
    document.getElementById("c-save").addEventListener("click", () => {
      const label = document.getElementById("c-label").value.trim();
      const kcal = +document.getElementById("c-kcal").value || 0;
      if (!label && !kcal) { closeSheet(); return; }
      Store.addComida({
        comida: sel, label: label || "Comida",
        kcal, prot: +document.getElementById("c-prot").value || 0,
        carbs: +document.getElementById("c-carbs").value || 0,
        grasa: +document.getElementById("c-grasa").value || 0,
      });
      closeSheet(); render();
    });
  }
  function comidaNombre(t) { return { desayuno: "Desayuno", almuerzo: "Almuerzo", cena: "Cena", snack: "Snack" }[t]; }
  function sugerirComida() {
    const h = new Date().getHours();
    if (h < 11) return "desayuno";
    if (h < 15) return "almuerzo";
    if (h < 20) return "cena";
    return "snack";
  }

  function sheetEntreno() {
    const sugerido = Coach.entrenoHoy().tipo;
    const tipos = [
      ["easy", "Rodaje suave"], ["intervals", "Intervalos"], ["tempo", "Tempo"],
      ["long", "Tirada larga"], ["gym", "Gimnasio"], ["futbol", "Fútbol"], ["movilidad", "Movilidad"],
    ];
    openSheet(`<h2>Registrar entrenamiento</h2>
      <div class="field"><label>Tipo</label>
        <div class="chips" id="ent-chips">
          ${tipos.map(([v,l])=>`<div class="chip ${v===sugerido&&["easy","intervals","tempo","long","gym","futbol","movilidad"].includes(sugerido)?"active":""}" data-ent-tipo="${v}">${l}</div>`).join("")}
        </div></div>
      <div class="field-row">
        <div class="field"><label>Duración (min)</label><input id="e-min" type="number" inputmode="numeric" placeholder="0"></div>
        <div class="field"><label>Distancia (km)</label><input id="e-km" type="number" inputmode="decimal" placeholder="0"></div>
      </div>
      <div class="field"><label>Esfuerzo (RPE 1–10)</label><input id="e-rpe" type="number" inputmode="numeric" placeholder="opcional" min="0" max="10"></div>
      <div class="field"><label>Nota</label><input id="e-nota" type="text" placeholder="¿Cómo te sentiste?"></div>
      <button class="btn primary block" id="e-save">Guardar</button>`);
    let sel = ["easy","intervals","tempo","long","gym","futbol","movilidad"].includes(sugerido) ? sugerido : "easy";
    const chips = document.getElementById("ent-chips");
    chips.addEventListener("click", (e) => {
      const c = e.target.closest("[data-ent-tipo]"); if (!c) return;
      sel = c.dataset.entTipo;
      chips.querySelectorAll(".chip").forEach((x) => x.classList.toggle("active", x === c));
    });
    document.getElementById("e-save").addEventListener("click", () => {
      let km = +document.getElementById("e-km").value || 0;
      // El fútbol cuenta como un trote de ~5 km si no anotas la distancia
      if (sel === "futbol" && !km) km = 5;
      Store.addEntreno({
        tipo: sel, minutos: +document.getElementById("e-min").value || 0,
        km,
        rpe: +document.getElementById("e-rpe").value || 0,
        nota: document.getElementById("e-nota").value.trim(),
        titulo: sel === "futbol" ? "Fútbol (≈ trote 5 km)" : "",
      });
      closeSheet(); render();
    });
  }

  function sheetTest5k() {
    openSheet(`<h2>⏱️ Test de 5 km</h2>
      <div class="small muted mb8">Corre 5 km a tope y registra tu tiempo. Con esto calculo tus ritmos y proyecto tu avance hacia el sub-20.</div>
      <div class="field amount"><label>Tiempo (mm:ss)</label><input id="t-time" type="text" inputmode="numeric" placeholder="22:30"></div>
      <div class="field"><label>Fecha</label><input id="t-date" type="date" value="${Fmt.ymd(Fmt.hoy())}"></div>
      <div class="field"><label>Nota</label><input id="t-nota" type="text" placeholder="opcional"></div>
      <button class="btn primary block" id="t-save">Guardar test</button>`);
    document.getElementById("t-save").addEventListener("click", () => {
      const seg = Fmt.parseTiempo(document.getElementById("t-time").value);
      if (!seg) { alert("Ingresa un tiempo válido, ej: 22:30"); return; }
      Store.addEntreno({ tipo: "test5k", titulo: "Test 5k", km: 5, timeSeg: seg,
        date: document.getElementById("t-date").value || Fmt.ymd(Fmt.hoy()),
        nota: document.getElementById("t-nota").value.trim() });
      closeSheet(); render();
    });
  }

  function sheetPeso() {
    const p = Store.get().profile;
    openSheet(`<h2>⚖️ Peso y medidas</h2>
      <div class="field amount"><label>Peso (kg)</label><input id="m-peso" type="number" inputmode="decimal" placeholder="${p.pesoKg||''}"></div>
      <div class="field-row">
        <div class="field"><label>Cintura (cm)</label><input id="m-cintura" type="number" inputmode="decimal" placeholder="opcional"></div>
        <div class="field"><label>Cadera (cm)</label><input id="m-cadera" type="number" inputmode="decimal" placeholder="opcional"></div>
      </div>
      <div class="field"><label>% Grasa (si lo sabes)</label><input id="m-grasa" type="number" inputmode="decimal" placeholder="opcional"></div>
      <div class="field"><label>Fecha</label><input id="m-date" type="date" value="${Fmt.ymd(Fmt.hoy())}"></div>
      <button class="btn primary block" id="m-save">Guardar</button>`);
    document.getElementById("m-save").addEventListener("click", () => {
      const peso = +document.getElementById("m-peso").value || 0;
      const cintura = +document.getElementById("m-cintura").value || 0;
      if (!peso && !cintura) { closeSheet(); return; }
      Store.addMedicion({
        pesoKg: peso, cintura,
        cadera: +document.getElementById("m-cadera").value || 0,
        grasaPct: +document.getElementById("m-grasa").value || 0,
        date: document.getElementById("m-date").value || Fmt.ymd(Fmt.hoy()),
      });
      closeSheet(); render();
    });
  }

  function sheetAjustes() {
    const p = Store.get().profile;
    const wk = planActual(p);
    openSheet(`<h2>⚙️ Ajustes</h2>
      <div class="field"><label>Nombre</label><input id="s-nombre" type="text" value="${esc(p.nombre)}" placeholder="Tu nombre"></div>
      <div class="field-row">
        <div class="field"><label>Sexo</label><select id="s-sexo"><option value="F" ${p.sexo==="F"?"selected":""}>Femenino</option><option value="M" ${p.sexo==="M"?"selected":""}>Masculino</option></select></div>
        <div class="field"><label>Edad</label><input id="s-edad" type="number" inputmode="numeric" value="${p.edad}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Altura (cm)</label><input id="s-altura" type="number" inputmode="numeric" value="${p.alturaCm}"></div>
        <div class="field"><label>Peso (kg)</label><input id="s-peso" type="number" inputmode="decimal" value="${p.pesoKg}"></div>
      </div>
      <div class="field"><label>Objetivo</label><select id="s-obj">
        <option value="definicion" ${p.objetivo==="definicion"?"selected":""}>Definición (bajar grasa, quedar rayada)</option>
        <option value="perder" ${p.objetivo==="perder"?"selected":""}>Bajar de peso</option>
        <option value="mantener" ${p.objetivo==="mantener"?"selected":""}>Mantener</option>
      </select></div>
      <div class="field"><label>Nivel de actividad</label><select id="s-act">
        ${actOptions(p.nivelActividad)}
      </select></div>
      <div class="divider"></div>
      <div class="section-title" style="margin-top:0">Tu semana</div>
      <div class="small muted mb8">Elige qué haces cada día. En los días de gym, marca los grupos musculares. El running se arma solo alrededor.</div>
      <div id="week-editor">${weekEditorHTML(wk)}</div>
      <div class="divider"></div>
      <div class="section-title" style="margin-top:0">El reto</div>
      <div class="field-row">
        <div class="field"><label>Meta 5k (mm:ss)</label><input id="s-reto" type="text" inputmode="numeric" value="${Fmt.tiempo(p.objetivoTiempoSeg)}"></div>
        <div class="field"><label>Fecha meta</label><input id="s-fecha" type="date" value="${esc(p.fechaReto)}"></div>
      </div>
      <button class="btn primary block" id="s-save">Guardar</button>
      <div class="divider"></div>
      <div class="btn-row">
        <button class="btn secondary sm" id="s-export">Exportar copia</button>
        <button class="btn secondary sm" id="s-import">Importar</button>
      </div>
      <button class="btn danger block mt8" id="s-reset">Borrar todos mis datos</button>
      <div class="small muted center mt16">Rayada · 100% privada. Todo se guarda solo en tu teléfono.</div>`);

    // editor de la semana (tipo por día + grupos de gym)
    overlay.querySelectorAll("[data-de]").forEach((row) => {
      const i = +row.dataset.de;
      row.addEventListener("click", (e) => {
        const tt = e.target.closest("[data-detipo]");
        if (tt) {
          wk[i].tipo = tt.dataset.detipo;
          row.querySelectorAll("[data-detipo]").forEach((b) => b.classList.toggle("active", b === tt));
          const gr = row.querySelector(".de-grupos");
          if (gr) gr.style.display = wk[i].tipo === "gym" ? "" : "none";
          return;
        }
        const gg = e.target.closest("[data-degrupo]");
        if (gg) {
          const g = gg.dataset.degrupo;
          if (wk[i].grupos.has(g)) wk[i].grupos.delete(g); else wk[i].grupos.add(g);
          gg.classList.toggle("active");
          return;
        }
      });
    });

    document.getElementById("s-save").addEventListener("click", () => {
      const diasGym = [], diasFutbol = [], diasDescanso = [], gymGrupos = {};
      for (let i = 0; i < 7; i++) {
        const d = wk[i];
        if (d.tipo === "gym") { diasGym.push(i); gymGrupos[i] = [...d.grupos]; }
        else if (d.tipo === "futbol") diasFutbol.push(i);
        else if (d.tipo === "descanso") diasDescanso.push(i);
      }
      Store.updateProfile({
        nombre: document.getElementById("s-nombre").value.trim(),
        sexo: document.getElementById("s-sexo").value,
        edad: +document.getElementById("s-edad").value || p.edad,
        alturaCm: +document.getElementById("s-altura").value || p.alturaCm,
        pesoKg: +document.getElementById("s-peso").value || p.pesoKg,
        objetivo: document.getElementById("s-obj").value,
        nivelActividad: document.getElementById("s-act").value,
        diasGym, diasFutbol, diasDescanso, gymGrupos,
        objetivoTiempoSeg: Fmt.parseTiempo(document.getElementById("s-reto").value) || p.objetivoTiempoSeg,
        fechaReto: document.getElementById("s-fecha").value,
      });
      closeSheet(); render();
    });
    document.getElementById("s-export").addEventListener("click", exportarDatos);
    document.getElementById("s-import").addEventListener("click", importarDatos);
    document.getElementById("s-reset").addEventListener("click", () => {
      if (confirm("¿Seguro? Se borrará tu perfil, comidas, entrenos y progreso de este dispositivo.")) {
        Store.reset(); closeSheet(); location.reload();
      }
    });
  }
  function actOptions(sel) {
    const opts = [["sedentario","Sedentaria (poco movimiento)"],["ligero","Ligera (1–2 entrenos/sem)"],
      ["moderado","Moderada (3–4/sem)"],["alto","Alta (5–6/sem: corres + gym + fútbol)"],["atleta","Atleta (2/día)"]];
    return opts.map(([v,l])=>`<option value="${v}" ${v===sel?"selected":""}>${l}</option>`).join("");
  }
  // Estado editable de la semana a partir del perfil
  function planActual(p) {
    const gym = new Set(p.diasGym || []), fut = new Set(p.diasFutbol || []), desc = new Set(p.diasDescanso || []);
    const gr = p.gymGrupos || {};
    const wk = {};
    for (let i = 0; i < 7; i++) {
      let tipo = "libre";
      if (desc.has(i)) tipo = "descanso";
      else if (fut.has(i)) tipo = "futbol";
      else if (gym.has(i)) tipo = "gym";
      const grupos = new Set(tipo === "gym" ? ((gr[i] && gr[i].length) ? gr[i] : ["tren superior"]) : (gr[i] || []));
      wk[i] = { tipo, grupos };
    }
    return wk;
  }
  function weekEditorHTML(wk) {
    const tipos = [["gym","🏋️","Gym"],["futbol","⚽","Fútbol"],["descanso","😴","Descanso"],["libre","·","Libre"]];
    let h = "";
    for (let i = 0; i < 7; i++) {
      const d = wk[i];
      h += `<div class="day-edit" data-de="${i}">
        <div class="de-top"><span class="de-day">${Fmt.DIAS_LARGO[(i+1)%7]}</span>
        <div class="de-types">${tipos.map(([v,ic,l])=>`<button class="de-t ${d.tipo===v?"active":""}" data-detipo="${v}">${ic} ${l}</button>`).join("")}</div></div>
        <div class="de-grupos" ${d.tipo==="gym"?"":'style="display:none"'}>
          ${Train.GRUPOS_ORDEN.map((g)=>`<div class="chip2 ${d.grupos.has(g)?"active":""}" data-degrupo="${g}">${esc(Train.grupoLabel(g))}</div>`).join("")}
        </div>
      </div>`;
    }
    return h;
  }

  function exportarDatos() {
    const blob = new Blob([Store.exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `rayada-${Fmt.ymd(Fmt.hoy())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function importarDatos() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "application/json";
    input.addEventListener("change", () => {
      const file = input.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (Store.importJSON(reader.result)) { closeSheet(); location.reload(); }
        else alert("Archivo inválido.");
      };
      reader.readAsText(file);
    });
    input.click();
  }

  // ======================================================================
  //  ONBOARDING
  // ======================================================================
  const onb = { paso: 0, datos: {} };
  const PASOS = 6;
  function renderOnboarding() {
    onbRoot.style.display = "block";
    document.getElementById("app").style.display = "none";
    document.getElementById("fab").style.display = "none";
    pintaPaso();
  }
  function terminarOnboarding() {
    onbRoot.style.display = "none";
    onbRoot.innerHTML = "";
    document.getElementById("app").style.display = "";
    document.getElementById("fab").style.display = "";
    irA("inicio");
  }
  function dots(activo) {
    let s = `<div class="progress-dots">`;
    for (let i = 0; i < PASOS; i++) s += `<div class="pd ${i<=activo?"on":""}"></div>`;
    return s + `</div>`;
  }
  function pintaPaso() {
    const d = onb.datos;
    let cuerpo = "", titulo = "";
    if (onb.paso === 0) {
      onbRoot.innerHTML = `<div class="onb-wrap">
        <div class="onb-spacer"></div>
        <div class="onb-logo"><div class="em">🏃‍♀️💚</div></div>
        <div class="onb-title">Rayada</div>
        <div class="onb-sub">Tu coach de nutrición y running. Vas a definir tu cuerpo, bajar grasa y correr 5k en 20 minutos. Con un experto en nutrición y uno en running de tu lado.</div>
        <div class="card"><div class="small">Te haré unas preguntas rápidas para armar tu plan. Todo se guarda solo en tu teléfono. 🔒</div></div>
        <button class="btn primary block" id="onb-start">Empezar</button>
        <div class="onb-spacer"></div>`;
      document.getElementById("onb-start").onclick = () => { onb.paso = 1; pintaPaso(); };
      return;
    }
    if (onb.paso === 1) {
      titulo = "Cuéntame de ti";
      cuerpo = `<div class="field"><label>¿Cómo te llamas?</label><input id="o-nombre" type="text" value="${esc(d.nombre||'')}" placeholder="Tu nombre"></div>
        <div class="field-row">
          <div class="field"><label>Sexo</label><select id="o-sexo"><option value="F" ${d.sexo!=="M"?"selected":""}>Femenino</option><option value="M" ${d.sexo==="M"?"selected":""}>Masculino</option></select></div>
          <div class="field"><label>Edad</label><input id="o-edad" type="number" inputmode="numeric" value="${d.edad||28}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Altura (cm)</label><input id="o-altura" type="number" inputmode="numeric" value="${d.alturaCm||165}"></div>
          <div class="field"><label>Peso (kg)</label><input id="o-peso" type="number" inputmode="decimal" value="${d.pesoKg||62}"></div>
        </div>`;
    }
    if (onb.paso === 2) {
      titulo = "¿Cuál es tu objetivo?";
      const o = d.objetivo || "definicion";
      cuerpo = `<div class="chips" id="o-obj-chips" style="flex-direction:column">
        ${objChip("definicion","💪 Definición","Bajar grasa y quedar rayada, sin perder músculo",o)}
        ${objChip("perder","⚖️ Bajar de peso","Perder peso priorizando la grasa",o)}
        ${objChip("mantener","🎯 Mantener","Rendimiento y composición actual",o)}
      </div>`;
    }
    if (onb.paso === 3) {
      titulo = "¿Qué tan activa eres?";
      const a = d.nivelActividad || "alto";
      cuerpo = `<div class="chips" id="o-act-chips" style="flex-direction:column">
        ${objChip("moderado","Moderada","3–4 entrenos por semana",a)}
        ${objChip("alto","Alta","5–6/sem: corres + gym + fútbol",a)}
        ${objChip("atleta","Muy alta","Casi todos los días, a veces 2/día",a)}
        ${objChip("ligero","Ligera","1–2 entrenos por semana",a)}
      </div>`;
    }
    if (onb.paso === 4) {
      titulo = "Tu semana";
      const dd = (sel, campo) => `<div class="day-toggles" data-odays="${campo}">
        ${["L","M","M","J","V","S","D"].map((x,i)=>`<div class="dt ${(sel||[]).includes(i)?"active":""}" data-di="${i}">${x}</div>`).join("")}</div>`;
      cuerpo = `<div class="small muted mb8">Marca los días que ya tienes fijos. Yo armo el running alrededor, respetando tu recuperación. Los grupos musculares del gym los defines luego en ⚙️ Ajustes.</div>
        <div class="field"><label>🏋️‍♀️ Días de gimnasio</label>${dd(d.diasGym||[0,1,2,3,4],"gym")}</div>
        <div class="field"><label>⚽ Días de fútbol</label>${dd(d.diasFutbol||[],"futbol")}</div>
        <div class="field"><label>😴 Descanso total</label>${dd(d.diasDescanso||[6],"descanso")}</div>`;
    }
    if (onb.paso === 5) {
      titulo = "Tu reto de running";
      cuerpo = `<div class="field-row">
          <div class="field"><label>Meta de 5k</label><input id="o-reto" type="text" inputmode="numeric" value="${d.reto||'20:00'}"></div>
          <div class="field"><label>Fecha meta (opcional)</label><input id="o-fecha" type="date" value="${d.fechaReto||''}"></div>
        </div>
        <div class="field"><label>Tu 5k actual (opcional, mm:ss)</label><input id="o-5k" type="text" inputmode="numeric" value="${d.mejor5k||''}" placeholder="Ej: 24:30"></div>
        <div class="card"><div class="small muted">Si no sabes tu 5k actual, no pasa nada: haz un test más adelante desde la app y afino tus ritmos.</div></div>`;
    }

    onbRoot.innerHTML = `<div class="onb-wrap">
      ${dots(onb.paso-1)}
      <div class="onb-step-label">Paso ${onb.paso} de ${PASOS-1}</div>
      <div class="onb-q">${titulo}</div>
      ${cuerpo}
      <div class="onb-spacer"></div>
      <div class="btn-row">
        ${onb.paso>1?`<button class="btn secondary sm" id="onb-back">Atrás</button>`:""}
        <button class="btn primary sm" id="onb-next">${onb.paso===PASOS-1?"¡Crear mi plan!":"Siguiente"}</button>
      </div>
    </div>`;

    // handlers de chips de objetivo/actividad
    ["o-obj-chips","o-act-chips"].forEach((id) => {
      const grp = document.getElementById(id); if (!grp) return;
      grp.addEventListener("click", (e) => {
        const c = e.target.closest("[data-val]"); if (!c) return;
        grp.querySelectorAll(".chip").forEach((x) => x.classList.toggle("active", x === c));
        grp._val = c.dataset.val;
      });
    });
    // toggles de días onboarding
    const oseleccion = {
      gym: new Set(d.diasGym || [0,1,2,3,4]), futbol: new Set(d.diasFutbol || []), descanso: new Set(d.diasDescanso || [6]),
    };
    onbRoot.querySelectorAll("[data-odays]").forEach((grp) => {
      const campo = grp.dataset.odays;
      grp.addEventListener("click", (e) => {
        const dt = e.target.closest("[data-di]"); if (!dt) return;
        const i = +dt.dataset.di;
        if (oseleccion[campo].has(i)) oseleccion[campo].delete(i); else oseleccion[campo].add(i);
        dt.classList.toggle("active");
      });
    });

    const back = document.getElementById("onb-back");
    if (back) back.onclick = () => { guardarPaso(oseleccion); onb.paso--; pintaPaso(); };
    document.getElementById("onb-next").onclick = () => {
      guardarPaso(oseleccion);
      if (onb.paso < PASOS - 1) { onb.paso++; pintaPaso(); }
      else finalizar();
    };
  }
  function objChip(val, titulo, desc, actual) {
    return `<div class="chip ${val===actual?"active":""}" data-val="${val}" style="width:100%;text-align:left;padding:14px">
      <div style="font-weight:700">${titulo}</div><div class="small muted" style="margin-top:2px">${desc}</div></div>`;
  }
  function guardarPaso(oseleccion) {
    const d = onb.datos, g = (id) => document.getElementById(id);
    if (onb.paso === 1) {
      if (g("o-nombre")) d.nombre = g("o-nombre").value.trim();
      if (g("o-sexo")) d.sexo = g("o-sexo").value;
      if (g("o-edad")) d.edad = +g("o-edad").value || 28;
      if (g("o-altura")) d.alturaCm = +g("o-altura").value || 165;
      if (g("o-peso")) d.pesoKg = +g("o-peso").value || 62;
    }
    if (onb.paso === 2) { const c = document.getElementById("o-obj-chips"); if (c && c._val) d.objetivo = c._val; else d.objetivo = d.objetivo || "definicion"; }
    if (onb.paso === 3) { const c = document.getElementById("o-act-chips"); if (c && c._val) d.nivelActividad = c._val; else d.nivelActividad = d.nivelActividad || "alto"; }
    if (onb.paso === 4 && oseleccion) {
      d.diasGym = [...oseleccion.gym].sort(); d.diasFutbol = [...oseleccion.futbol].sort(); d.diasDescanso = [...oseleccion.descanso].sort();
    }
    if (onb.paso === 5) {
      if (g("o-reto")) d.reto = g("o-reto").value;
      if (g("o-fecha")) d.fechaReto = g("o-fecha").value;
      if (g("o-5k")) d.mejor5k = g("o-5k").value;
    }
  }
  function finalizar() {
    const d = onb.datos;
    const diasGym = d.diasGym || [0,1,2,3,4];
    // split por defecto; se mantiene para los días de gym elegidos
    const splitDefault = { 0:["pierna"], 1:["espalda","hombro","biceps"], 2:["pecho","triceps"], 3:["pierna"], 4:["tren superior"], 5:["full body"], 6:["full body"] };
    const gymGrupos = {};
    diasGym.forEach((i) => { gymGrupos[i] = splitDefault[i] || ["tren superior"]; });
    Store.updateProfile({
      nombre: d.nombre || "", sexo: d.sexo || "F", edad: d.edad || 28,
      alturaCm: d.alturaCm || 165, pesoKg: d.pesoKg || 62,
      objetivo: d.objetivo || "definicion", nivelActividad: d.nivelActividad || "alto",
      diasGym, diasFutbol: d.diasFutbol || [], diasDescanso: d.diasDescanso || [6], gymGrupos,
      objetivoTiempoSeg: Fmt.parseTiempo(d.reto || "20:00") || 1200,
      fechaReto: d.fechaReto || "",
    });
    // registra 5k inicial y peso inicial si los dio
    const seg5k = Fmt.parseTiempo(d.mejor5k || "");
    if (seg5k) Store.addEntreno({ tipo: "test5k", titulo: "Test inicial", km: 5, timeSeg: seg5k });
    if (d.pesoKg) Store.addMedicion({ pesoKg: d.pesoKg });
    Store.setOnboarded(true);
    terminarOnboarding();
  }

  // ======================================================================
  //  DELEGACIÓN GLOBAL DE CLICKS (data-*)
  // ======================================================================
  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) { irA(go.dataset.go); return; }
    const add = e.target.closest("[data-add]");
    if (add) {
      const tipo = add.dataset.add;
      if (tipo === "comida") sheetComida();
      else if (tipo === "entreno") sheetEntreno();
      else if (tipo === "test") sheetTest5k();
      else if (tipo === "peso") sheetPeso();
      else if (tipo === "foto") sheetFoto();
      return;
    }
    const foto = e.target.closest("[data-foto]"); if (foto) { verFoto(foto.dataset.foto); return; }
    const nt = e.target.closest("[data-nt]"); if (nt) { nutTab = nt.dataset.nt; render(); return; }
    const et = e.target.closest("[data-et]"); if (et) { entTab = et.dataset.et; render(); return; }
    const carga = e.target.closest("[data-carga]"); if (carga) { window._cargaPlan = carga.dataset.carga; render(); return; }
    const day = e.target.closest("[data-day]");
    if (day) {
      const i = +day.dataset.day;
      if (expandidos.has(i)) expandidos.delete(i); else expandidos.add(i);
      render(); return;
    }
    const w = e.target.closest("[data-water]");
    if (w) {
      const n = +w.dataset.water;
      const dateStr = Fmt.ymd(Fmt.hoy());
      const actual = Store.getAgua(dateStr);
      Store.setAgua(dateStr, n === actual ? n - 1 : n); // tocar el vaso lleno lo baja
      render(); return;
    }
    const dc = e.target.closest("[data-delcomida]");
    if (dc) { Store.deleteComida(dc.dataset.delcomida); render(); return; }
    const de = e.target.closest("[data-delentreno]");
    if (de) { if (confirm("¿Borrar este registro?")) { Store.deleteEntreno(de.dataset.delentreno); render(); } return; }
  });

  // ======================================================================
  //  RENDER PRINCIPAL
  // ======================================================================
  function render() {
    switch (navActual) {
      case "inicio": return renderInicio();
      case "nutricion": return renderNutricion();
      case "entreno": return renderEntreno();
      case "progreso": return renderProgreso();
      case "coach": return renderCoach();
    }
  }

  // ---------- arranque ----------
  Store.load();
  if (!Store.get().profile.onboarded) renderOnboarding();
  else render();

  // Service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();
