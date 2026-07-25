/* app.js — UI, navegación y render. Une Store + Advisor + Fmt. */
(function () {
  "use strict";
  const F = window.Fmt;
  const S = window.Store;

  S.load();

  const app = document.getElementById("app");
  let current = "inicio";

  // ---------- Utilidades de render ----------
  const el = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const catIcon = (cat) => {
    const m = {
      "Salario": "💼", "Freelance": "💻", "Ventas": "🛍️", "Otros ingresos": "➕",
      "Arriendo": "🏠", "Servicios": "💡", "Mercado": "🛒", "Transporte": "🚌",
      "Comida fuera": "🍔", "Salud": "🏥", "Educación": "📚", "Entretenimiento": "🎬",
      "Suscripciones": "📺", "Pago deuda": "🏦", "Ahorro": "🐷", "Otros": "📦",
    };
    return m[cat] || (/* fallback */ "📦");
  };

  const accIcon = (acc) => {
    const a = (acc || "").toLowerCase();
    if (a.includes("efectivo")) return "💵";
    if (a.includes("banc") || a.includes("cuenta")) return "🏦";
    if (a.includes("tarjeta") || a.includes("crédito") || a.includes("credito")) return "💳";
    if (a.includes("ahorro")) return "🐷";
    if (a.includes("nequi") || a.includes("daviplata") || a.includes("billetera")) return "📱";
    return "💰";
  };

  // ---------- Navegación ----------
  const screens = ["inicio", "movimientos", "deudas", "agente", "ajustes"];

  function navTo(name) {
    current = name;
    render();
    document.querySelectorAll(".nav button").forEach((b) =>
      b.classList.toggle("active", b.dataset.nav === name)
    );
    app.querySelector(".screen") && (app.scrollTop = 0);
    window.scrollTo(0, 0);
  }

  // ---------- Pantallas ----------
  function screenInicio() {
    const a = window.Advisor.analyze();
    const s = S.get();

    if (!a.hasData) {
      return `
        <div class="screen active" id="s-inicio">
          <div class="card" style="text-align:center;padding:28px 20px">
            <div style="font-size:52px">👋</div>
            <h2 style="margin:12px 0 6px">Hola, empecemos</h2>
            <p class="muted" style="margin:0 0 20px">Para darte un buen análisis necesito entender tu situación. Vamos primero por tus <b>deudas</b>.</p>
            <button class="btn primary" data-goto="deudas">🏦 Registrar mi primera deuda</button>
            <div class="btn-row">
              <button class="btn secondary sm" data-quick="income">💵 Agregar ingreso</button>
              <button class="btn secondary sm" data-quick="expense">🧾 Agregar gasto</button>
            </div>
          </div>
          ${planCard(a)}
        </div>`;
    }

    const hc = a.health;
    const ringColor = hc.color === "good" ? "var(--good)" : hc.color === "warn" ? "var(--warn)" : "var(--danger)";

    return `
      <div class="screen active" id="s-inicio">
        <div class="hero">
          <div class="label">Saldo disponible</div>
          <div class="amount">${F.money(a.balance)}</div>
          <div class="row">
            <div class="pill"><div class="k">Ingresos (mes)</div><div class="v" style="color:var(--income)">${F.money(a.monthIncome)}</div></div>
            <div class="pill"><div class="k">Gastos (mes)</div><div class="v" style="color:var(--expense)">${F.money(a.monthExpense)}</div></div>
          </div>
        </div>

        <div class="spend-banner ${a.canSpend ? "yes" : "no"}">
          <div class="emoji">${a.canSpend ? "🟢" : "🔴"}</div>
          <div style="flex:1">
            <div class="title">${a.canSpend ? "Sí puedes gastar" : "Mejor no gastes ahora"}</div>
            <div class="desc">${a.canSpend
              ? (a.nextPayday ? `Hasta tu próximo pago (${F.fecha(a.nextPayday)}), después de tus obligaciones y colchón:` : "Después de reservar tus pagos y colchón, te queda:")
              : "Necesitas ese dinero para tus próximos pagos y colchón."}</div>
            <div class="big">${a.canSpend ? F.money(a.safeToSpend) : F.money(Math.abs(a.safeToSpend)) + " en rojo"}</div>
          </div>
        </div>

        ${a.accountBalances && a.accountBalances.length ? `
        <div class="card tight">
          ${a.accountBalances.map((ac) => `
            <div class="list-item">
              <div class="avatar">${accIcon(ac.name)}</div>
              <div class="li-main"><div class="li-title">${esc(ac.name)}</div></div>
              <div class="li-amount ${ac.amount >= 0 ? "income" : "expense"}">${F.money(ac.amount)}</div>
            </div>`).join("")}
          ${a.savings > 0 ? `<div class="list-item"><div class="avatar">🐷</div><div class="li-main"><div class="li-title">Ahorro</div><div class="li-sub">guardado, no para gastar</div></div><div class="li-amount income">${F.money(a.savings)}</div></div>` : ""}
          ${a.nextPayday ? `<div class="list-item"><div class="avatar">🗓️</div><div class="li-main"><div class="li-title">Próxima nómina</div><div class="li-sub">${F.relativo(a.daysToPayday)}</div></div><div class="li-amount">${F.fecha(a.nextPayday)}</div></div>` : ""}
        </div>` : ""}

        <div class="card health">
          <div class="ring" style="--p:${hc.score || 0};--ring-color:${ringColor}">
            <span class="score">${hc.score == null ? "–" : hc.score}</span>
          </div>
          <div>
            <div class="h-label">Salud financiera: ${hc.label}</div>
            <div class="h-sub">${a.debtToIncome > 0 ? "Carga de deuda: " + F.pct(a.debtToIncome) + " del ingreso" : "Sin deudas activas 🎉"}</div>
            <div class="h-sub">Fondo de emergencia: ${a.savings > 0 ? F.money(a.savings) + " (" + a.emergencyMonths.toFixed(1) + " meses)" : "sin registrar"}</div>
          </div>
        </div>

        ${a.next30.length ? `
        <div class="section-title">Próximos pagos</div>
        <div class="card tight">
          ${a.next30.slice(0, 4).map((u) => `
            <div class="list-item">
              <div class="avatar">📅</div>
              <div class="li-main">
                <div class="li-title">${esc(u.name)}</div>
                <div class="li-sub">${F.relativo(u.dias)} · ${F.fechaLarga(u.due)}</div>
              </div>
              <div class="li-amount expense">${F.money(u.amount)}</div>
            </div>`).join("")}
        </div>` : ""}

        <div class="section-title">Alertas del agente</div>
        ${a.alerts.map(alertCard).join("")}

        <button class="btn primary mt8" data-goto="agente">🤖 Ver análisis y plan completo</button>
      </div>`;
  }

  function alertCard(al) {
    return `<div class="alert ${al.level}">
      <div class="ico">${al.icon}</div>
      <div><div class="a-title">${esc(al.title)}</div><div class="a-text">${esc(al.text)}</div></div>
    </div>`;
  }

  function planCard(a) {
    return `
      <div class="section-title">Plan de acción</div>
      ${a.plan.map((p) => `
        <div class="step">
          <div class="n">${p.n}</div>
          <div><div class="s-title"><span class="ico">${p.icon}</span>${esc(p.title)}</div>
          <div class="s-text">${esc(p.text)}</div></div>
        </div>`).join("")}`;
  }

  function screenMovimientos() {
    const s = S.get();
    const txs = s.transactions.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    // agrupar por fecha
    const groups = {};
    txs.forEach((t) => { (groups[t.date] = groups[t.date] || []).push(t); });
    const dates = Object.keys(groups).sort((a, b) => (a < b ? 1 : -1));

    const body = txs.length === 0
      ? `<div class="empty"><div class="big-emoji">🧾</div><p>Aún no hay movimientos.<br>Toca el botón <b>+</b> para agregar tu primer ingreso o gasto.</p></div>`
      : dates.map((d) => `
          <div class="section-title">${F.fechaLarga(d)}</div>
          <div class="card tight">
            ${groups[d].map((t) => `
              <div class="list-item" data-tx="${t.id}">
                <div class="avatar">${catIcon(t.category)}</div>
                <div class="li-main">
                  <div class="li-title">${esc(t.note || t.category)}</div>
                  <div class="li-sub">${esc(t.category)} · ${accIcon(t.account)} ${esc(t.account || "Efectivo")}${t.recurring ? " · 🔁" : ""}</div>
                </div>
                <div class="li-amount ${(t.type === "income" || t.type === "retiro") ? "income" : "expense"}">${(t.type === "income" || t.type === "retiro") ? "+" : "−"}${F.money(t.amount)}</div>
              </div>`).join("")}
          </div>`).join("");

    return `<div class="screen active" id="s-movimientos">
      <div class="btn-row" style="margin-bottom:14px">
        <button class="btn secondary sm" data-quick="income">💵 Ingreso</button>
        <button class="btn secondary sm" data-quick="expense">🧾 Gasto</button>
        <button class="btn secondary sm" data-quick="saving">🐷 Ahorro</button>
      </div>
      ${body}
    </div>`;
  }

  function screenDeudas() {
    const s = S.get();
    const a = window.Advisor.analyze();
    const debts = s.debts.slice().sort((x, y) => y.apr - x.apr);

    const totalCard = debts.length ? `
      <div class="hero" style="background:linear-gradient(135deg,#33201f,#2a1618)">
        <div class="label">Deuda total</div>
        <div class="amount">${F.money(a.totalDebt)}</div>
        <div class="row">
          <div class="pill"><div class="k">Cuotas/mes</div><div class="v">${F.money(a.totalMinPayments)}</div></div>
          <div class="pill"><div class="k">% de tu ingreso</div><div class="v">${a.refIncome ? F.pct(a.debtToIncome) : "–"}</div></div>
        </div>
      </div>` : "";

    const list = debts.length === 0
      ? `<div class="empty"><div class="big-emoji">🏦</div><p>Sin deudas registradas.<br>Registra tus deudas para que el agente arme tu plan de pago.</p></div>`
      : debts.map((d, i) => {
          const paid = d.total > 0 ? Math.max(0, Math.min(1, (d.total - d.remaining) / d.total)) : 0;
          const due = window.Advisor.nextDueDate(d.dueDay);
          const dias = F.diasEntre(F.hoy(), due);
          return `
          <div class="debt-card" data-debt="${d.id}">
            <div class="d-top">
              <div>
                <div class="d-name">${i === 0 && d.apr > 0 ? "🔥 " : ""}${esc(d.name)}</div>
                ${d.creditor ? `<div class="d-cred">${esc(d.creditor)}</div>` : ""}
              </div>
              <div style="text-align:right"><div class="d-rem">${F.money(d.remaining)}</div>
              <div class="d-cred">de ${F.money(d.total)}</div></div>
            </div>
            <div class="progress"><span style="width:${(paid * 100).toFixed(0)}%"></span></div>
            <div class="d-meta">
              <span class="tag ${d.apr >= 25 ? "hot" : ""}">${F.pct(d.apr / 100, 1)} E.A.</span>
              <span class="tag">Cuota ${F.money(d.minPayment)}</span>
              <span class="tag due">Vence ${F.relativo(dias)}</span>
            </div>
            <div class="debt-actions">
              <button class="btn secondary sm" data-pay="${d.id}">💸 Registrar abono</button>
              <button class="btn ghost sm" data-editdebt="${d.id}">✏️ Editar</button>
            </div>
          </div>`;
        }).join("");

    return `<div class="screen active" id="s-deudas">
      ${totalCard}
      <button class="btn primary" data-adddebt="1" style="margin-bottom:14px">＋ Agregar deuda</button>
      ${list}
    </div>`;
  }

  function screenAgente() {
    const a = window.Advisor.analyze();
    const s = S.get();

    if (!a.hasData) {
      return `<div class="screen active" id="s-agente">
        <div class="card" style="text-align:center;padding:28px 20px">
          <div style="font-size:48px">🤖</div>
          <h2 style="margin:12px 0 6px">Tu agente financiero</h2>
          <p class="muted">Registra tus deudas, ingresos y gastos y aquí verás tu diagnóstico completo, alertas, fechas de pago y un plan de acción.</p>
          <button class="btn primary" data-goto="deudas">Empezar por mis deudas</button>
        </div>
      </div>`;
    }

    // Simulación de pago
    const extra = window.__extra || 0;
    const av = window.Advisor.simulatePayoff(s.debts, extra, "avalanche");

    return `<div class="screen active" id="s-agente">
      <div class="section-title">Diagnóstico</div>
      <div class="kpi-grid">
        <div class="kpi"><div class="k">Saldo disponible</div><div class="v ${a.balance >= 0 ? "good" : "bad"}">${F.money(a.balance)}</div></div>
        <div class="kpi"><div class="k">Puedo gastar</div><div class="v ${a.canSpend ? "good" : "bad"}">${a.canSpend ? F.money(a.safeToSpend) : F.money(0)}</div></div>
        <div class="kpi"><div class="k">Deuda total</div><div class="v">${F.money(a.totalDebt)}</div></div>
        <div class="kpi"><div class="k">Ahorro del mes</div><div class="v ${a.savingsRate >= 0 ? "good" : "bad"}">${F.pct(a.savingsRate)}</div></div>
      </div>

      ${a.accountBalances && a.accountBalances.length ? `
      <div class="section-title">Saldos por cuenta</div>
      <div class="card tight">
        ${a.accountBalances.map((ac) => `
          <div class="list-item">
            <div class="avatar">${accIcon(ac.name)}</div>
            <div class="li-main"><div class="li-title">${esc(ac.name)}</div></div>
            <div class="li-amount ${ac.amount >= 0 ? "income" : "expense"}">${F.money(ac.amount)}</div>
          </div>`).join("")}
      </div>` : ""}

      ${a.refExpense > 0 ? `
      <div class="section-title">Fondo de emergencia</div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <div><div class="d-rem">${F.money(a.savings)}</div><div class="d-cred">${a.emergencyMonths.toFixed(1)} de 3 meses recomendados</div></div>
          <div class="tag ${a.emergencyMonths >= 3 ? "" : "hot"}">${a.emergencyMonths >= 6 ? "Excelente" : a.emergencyMonths >= 3 ? "Sólido" : a.emergencyMonths >= 1 ? "En camino" : "Bajo"}</div>
        </div>
        <div class="progress" style="margin-top:12px"><span style="width:${Math.min(100, (a.emergencyMonths / 3) * 100).toFixed(0)}%"></span></div>
        <div class="hint">Meta 3 meses: ${F.money(a.emergencyTarget)} · Ideal 6 meses: ${F.money(a.emergencyTargetFull)}. ${a.savings === 0 ? "Registra tu ahorro en Ajustes para un mejor análisis." : ""}</div>
      </div>` : ""}

      ${a.monthlyTarget > 0 ? `
      <div class="section-title">Plan de ahorro mensual</div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <div><div class="d-cred">Este mes deberías ahorrar (${F.pct(a.goalPct)})</div><div class="d-rem">${F.money(a.monthlyTarget)}</div></div>
          <div class="tag ${a.savedThisMonth >= a.monthlyTarget ? "" : "hot"}">${a.savedThisMonth >= a.monthlyTarget ? "✅ Cumplida" : "Vas " + F.money(Math.max(0, a.savedThisMonth))}</div>
        </div>
        <div class="progress" style="margin-top:12px"><span style="width:${Math.min(100, Math.max(0, a.savingsProgress * 100)).toFixed(0)}%"></span></div>
        <div class="hint">${a.savedThisMonth >= a.monthlyTarget
          ? `Ya cubriste tu meta este mes. Aparta ${F.money(a.monthlyTarget)} a tu ahorro. 🎉`
          : `Te faltan ${F.money(a.savingsGap)} para tu meta. ${a.categories[0] ? `Podrías recortar de "${a.categories[0].name}".` : "Revisa tus gastos."}`}</div>
        ${a.monthlyHistory.length > 1 ? `
        <div class="divider"></div>
        <div class="d-cred" style="margin-bottom:8px">Mes a mes (ahorrado vs meta)</div>
        ${a.monthlyHistory.map((m) => `
          <div class="list-item">
            <div class="avatar">${m.met ? "✅" : "•"}</div>
            <div class="li-main"><div class="li-title" style="text-transform:capitalize">${esc(m.label)}</div><div class="li-sub">meta ${F.money(m.target)}</div></div>
            <div class="li-amount ${m.saved > 0 ? "income" : ""}">${F.money(m.saved)}</div>
          </div>`).join("")}` : ""}
      </div>` : ""}

      <div class="section-title">Alertas</div>
      ${a.alerts.map(alertCard).join("")}

      ${a.upcoming.length ? `
      <div class="section-title">Calendario de pagos</div>
      <div class="card tight">
        ${a.upcoming.map((u) => `
          <div class="list-item">
            <div class="avatar" style="${u.dias <= 3 ? "border-color:#5a2a30" : ""}">${u.dias <= 3 ? "⏰" : "📅"}</div>
            <div class="li-main">
              <div class="li-title">${esc(u.name)}</div>
              <div class="li-sub">${F.fechaLarga(u.due)} · ${F.relativo(u.dias)}</div>
            </div>
            <div class="li-amount expense">${F.money(u.amount)}</div>
          </div>`).join("")}
      </div>` : ""}

      ${a.totalDebt > 0 ? `
      <div class="section-title">Plan de salida de deudas (método avalancha)</div>
      <div class="card">
        <p class="small muted" style="margin-top:0">Pagas el mínimo en todas y el excedente a la de mayor tasa. Simula cuánto rinde un abono extra mensual:</p>
        <div class="field amount">
          <label>Abono extra por mes</label>
          <input type="text" inputmode="numeric" id="extra-input" value="${extra ? F.num(extra) : ""}" placeholder="$ 0">
        </div>
        <div class="kpi-grid">
          <div class="kpi"><div class="k">Tiempo para saldar</div><div class="v">${av.feasible ? (av.years ? av.years + "a " : "") + av.remMonths + "m" : "> 50 años"}</div></div>
          <div class="kpi"><div class="k">Intereses totales</div><div class="v bad">${F.money(av.totalInterest)}</div></div>
        </div>
        ${!av.feasible ? `<div class="hint" style="color:var(--danger)">⚠️ Con esos abonos las deudas casi no bajan. Aumenta el abono extra o renegocia la tasa.</div>` : ""}
        <div class="hint">Orden sugerido: ${a.byRate.map((d, i) => `${i + 1}. ${esc(d.name)}`).join(" → ")}</div>
      </div>` : ""}

      ${a.categories.length ? `
      <div class="section-title">¿A dónde se va tu plata? (mes)</div>
      <div class="card">
        ${a.categories.slice(0, 6).map((c) => `
          <div class="catbar">
            <div class="cb-top"><span class="cb-name">${catIcon(c.name)} ${esc(c.name)}</span><span class="cb-amt">${F.money(c.amount)} · ${F.pct(c.pct)}</span></div>
            <div class="cb-track"><div class="cb-fill" style="width:${(c.pct * 100).toFixed(0)}%"></div></div>
          </div>`).join("")}
      </div>` : ""}

      ${planCard(a)}
    </div>`;
  }

  function screenAjustes() {
    const s = S.get();
    return `<div class="screen active" id="s-ajustes">
      <div class="section-title">💰 Mi ahorro</div>
      <div class="card">
        <div class="field amount" style="margin-bottom:8px">
          <label>Ahorro que ya tenías (inicial)</label>
          <input type="text" inputmode="numeric" id="set-savingsbal" value="${s.settings.savings ? F.num(s.settings.savings) : ""}" placeholder="$ 0">
        </div>
        <div class="hint" style="margin-bottom:14px">Lo que tenías guardado antes de empezar. De aquí en adelante, para apartar plata usa el botón <b>+ → 🐷 Ahorro</b> en Movimientos: eso baja tu saldo y suma a tu ahorro. Total ahorro hoy: <b>${F.money(window.Advisor.analyze().savings)}</b>.</div>
        <div class="field">
          <label>¿Cuánto quieres ahorrar cada mes? (% de tu ingreso)</label>
          <input type="number" min="0" max="90" id="set-savings" value="${Math.round((s.settings.savingsGoalPct || 0.1) * 100)}">
          <div class="hint">Ej: 10%. El agente calculará mes a mes cuánto apartar según tus ingresos y te dirá si vas bien.</div>
        </div>
        <button class="btn primary" data-savesettings="1">Guardar</button>
      </div>

      <div class="section-title">Días de pago (nómina)</div>
      <div class="card">
        <p class="small muted" style="margin-top:0">¿Qué días te pagan? Si es quincenal, pon los dos (ej. 15 y 30). El agente los usa para planear entre pagos.</p>
        <div class="field-row">
          <div class="field"><label>Día de pago 1</label>
            <input type="number" min="1" max="31" id="set-pay1" value="${(s.settings.paydays && s.settings.paydays[0]) || s.settings.payday || ""}" placeholder="Ej: 15"></div>
          <div class="field"><label>Día de pago 2</label>
            <input type="number" min="1" max="31" id="set-pay2" value="${(s.settings.paydays && s.settings.paydays[1]) || ""}" placeholder="Ej: 30"></div>
        </div>
        <button class="btn primary" data-savesettings="1">Guardar</button>
      </div>

      <div class="section-title">Cuentas / medios de pago</div>
      <div class="card">
        <p class="small muted" style="margin-top:0">Dónde tienes tu dinero. Cada movimiento se marca con una de estas.</p>
        <div class="chips" style="margin-bottom:12px">
          ${(s.accounts || []).map((a) => `<span class="chip" style="cursor:default">${accIcon(a)} ${esc(a)} ${(s.accounts.length > 1) ? `<span class="link" data-delacc="${esc(a)}" style="margin-left:6px">✕</span>` : ""}</span>`).join("")}
        </div>
        <button class="btn secondary block" data-addacc="1">➕ Agregar cuenta (ej. Nequi, Ahorros)</button>
      </div>

      ${window.Auth ? `
      <div class="section-title">Tu cuenta</div>
      <div class="card">
        <p class="small muted" style="margin-top:0">Sesión de <b>${esc(window.Auth.getActiveUser())}</b>. Cada usuario ve solo sus propias finanzas.</p>
        <button class="btn secondary block" data-changepw="1">🔑 Cambiar mi contraseña</button>
        <div class="btn-row">
          <button class="btn secondary sm" data-adduser="1">➕ Agregar usuario</button>
          <button class="btn ghost sm" data-switchuser="1">🔄 Cambiar de usuario</button>
        </div>
        <div class="divider"></div>
        <div class="d-cred" style="margin-bottom:8px">Usuarios en este teléfono</div>
        ${window.Auth.listProfiles().map((pr) => `
          <div class="list-item">
            <div class="avatar">👤</div>
            <div class="li-main"><div class="li-title">${esc(pr.user)}${pr.id === window.Auth.getActiveId() ? " (tú)" : ""}</div></div>
            ${pr.id === window.Auth.getActiveId()
              ? `<span class="small muted">sesión actual</span>`
              : `<button class="btn danger sm" style="flex:0 0 auto;padding:7px 12px" data-deluser="${pr.id}" data-delusername="${esc(pr.user)}">Eliminar</button>`}
          </div>`).join("")}
        <div class="hint">Para eliminar el usuario en el que estás ahora, primero cambia a otro (🔄) y elimínalo desde ahí.</div>
      </div>` : ""}

      <div class="section-title">Tus datos</div>
      <div class="card">
        <p class="small muted" style="margin-top:0">Todo se guarda solo en este dispositivo. Haz una copia para no perderla.</p>
        <div class="btn-row">
          <button class="btn secondary sm" data-export="1">⬇️ Exportar copia</button>
          <button class="btn secondary sm" data-import="1">⬆️ Importar</button>
        </div>
        <input type="file" id="import-file" accept="application/json" style="display:none">
        <button class="btn danger block mt16" data-reset="1">🗑️ Borrar todo</button>
      </div>

      <div class="section-title">Instalar en tu teléfono</div>
      <div class="card">
        <p class="small muted" style="margin-top:0">
          <b>Android/Chrome:</b> menú ⋮ → "Agregar a pantalla de inicio".<br>
          <b>iPhone/Safari:</b> compartir <span style="font-family:monospace">⬆️</span> → "Agregar a inicio".<br>
          Se abrirá como una app y funcionará sin internet.
        </p>
      </div>
      <div class="center muted small" style="margin-top:20px">Finanzas · versión 8 · hecho para ti 💚</div>
    </div>`;
  }

  // ---------- Render principal ----------
  function render() {
    let html = "";
    if (current === "inicio") html = screenInicio();
    else if (current === "movimientos") html = screenMovimientos();
    else if (current === "deudas") html = screenDeudas();
    else if (current === "agente") html = screenAgente();
    else if (current === "ajustes") html = screenAjustes();

    const existing = app.querySelector(".screen");
    const node = el(html);
    if (existing) existing.replaceWith(node); else app.insertBefore(node, app.querySelector(".nav"));
    updateHeader();
  }

  function updateHeader() {
    const titles = {
      inicio: ["Finanzas", fechaHoy()],
      movimientos: ["Movimientos", "Ingresos y gastos"],
      deudas: ["Deudas", "Tu plan para salir de ellas"],
      agente: ["Agente", "Tu análisis financiero"],
      ajustes: ["Ajustes", "Datos y preferencias"],
    };
    const h = document.querySelector(".header");
    h.querySelector("h1").textContent = titles[current][0];
    h.querySelector(".sub").textContent = titles[current][1];
  }

  function fechaHoy() {
    const d = new Date();
    return `${F.DIAS[d.getDay()]}, ${d.getDate()} de ${F.MESES[d.getMonth()]}`;
  }

  // ---------- Sheets (modales) ----------
  const overlay = document.getElementById("sheet-overlay");
  function openSheet(html) {
    overlay.innerHTML = `<div class="sheet"><div class="grab"></div>${html}</div>`;
    overlay.classList.add("open");
  }
  function closeSheet() { overlay.classList.remove("open"); overlay.innerHTML = ""; }
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeSheet(); });

  function txSheet(type, txId) {
    const s = S.get();
    const editing = txId ? s.transactions.find((t) => t.id === txId) : null;
    const t = editing || { type, amount: "", category: "", account: "", date: F.ymd(F.hoy()), note: "", recurring: false };
    const isSaving = t.type === "saving" || t.type === "retiro";
    const cats = isSaving ? [] : (s.categories[t.type] || s.categories.expense);
    const accts = (s.accounts && s.accounts.length) ? s.accounts : ["Efectivo", "Cuenta bancaria"];
    const curAcc = t.account || accts[0];

    const titleMap = { income: "Nuevo ingreso", expense: "Nuevo gasto", saving: "Aporte a ahorro", retiro: "Retiro de ahorro" };
    const accLabel = t.type === "income" ? "¿A dónde entra?"
      : t.type === "expense" ? "¿Con qué pagaste?"
      : t.type === "saving" ? "¿De qué cuenta lo apartas?"
      : "¿A qué cuenta vuelve?";

    openSheet(`
      <h2>${editing ? "Editar" : titleMap[t.type]}</h2>
      <div class="segmented" id="tx-type">
        <button data-t="income" class="${t.type === "income" ? "active" : ""}">💵 Ingreso</button>
        <button data-t="expense" class="${t.type === "expense" ? "active expense-active" : ""}">🧾 Gasto</button>
        <button data-t="saving" class="${isSaving ? "active" : ""}">🐷 Ahorro</button>
      </div>
      ${isSaving ? `
      <div class="segmented" id="tx-savekind">
        <button data-k="saving" class="${t.type === "saving" ? "active" : ""}">➕ Aporte (guardar)</button>
        <button data-k="retiro" class="${t.type === "retiro" ? "active expense-active" : ""}">➖ Retiro (sacar)</button>
      </div>` : ""}
      <div class="field amount">
        <label>Monto</label>
        <input type="text" inputmode="numeric" id="tx-amount" value="${t.amount ? F.num(t.amount) : ""}" placeholder="$ 0" autofocus>
      </div>
      ${!isSaving ? `
      <div class="field">
        <label>Categoría</label>
        <div class="chips" id="tx-cats">
          ${cats.map((c) => `<button class="chip ${t.category === c ? "active" : ""}" data-cat="${esc(c)}">${catIcon(c)} ${esc(c)}</button>`).join("")}
        </div>
      </div>` : `
      <div class="alert info" style="margin-bottom:14px"><div class="ico">🐷</div><div class="a-text">${t.type === "saving"
        ? "Este dinero <b>sale de tu saldo disponible</b> y suma a tu ahorro."
        : "Este dinero <b>vuelve a tu saldo disponible</b> y baja de tu ahorro."}</div></div>`}
      <div class="field">
        <label>${accLabel}</label>
        <div class="chips" id="tx-accs">
          ${accts.map((a) => `<button class="chip ${curAcc === a ? "active" : ""}" data-acc="${esc(a)}">${accIcon(a)} ${esc(a)}</button>`).join("")}
        </div>
      </div>
      <div class="field">
        <label>Nota (opcional)</label>
        <input type="text" id="tx-note" value="${esc(t.note)}" placeholder="${isSaving ? "Ej: ahorro del mes" : "Ej: mercado del mes"}">
      </div>
      <div class="field">
        <label>Fecha</label>
        <input type="date" id="tx-date" value="${t.date}">
      </div>
      ${!isSaving ? `
      <label style="display:flex;align-items:center;gap:10px;margin-bottom:16px;color:var(--muted);font-size:14px">
        <input type="checkbox" id="tx-rec" ${t.recurring ? "checked" : ""} style="width:20px;height:20px"> 🔁 Es recurrente (cada mes)
      </label>` : ""}
      <button class="btn primary" id="tx-save">${editing ? "Guardar cambios" : "Agregar"}</button>
      ${editing ? `<button class="btn danger block mt8" id="tx-del">Eliminar</button>` : ""}
    `);

    let selType = t.type;
    let selCat = isSaving ? "Ahorro" : (t.category || cats[0]);
    let selAcc = curAcc;
    if (!isSaving && !t.category) {
      const first = overlay.querySelector(`[data-cat="${cats[0]}"]`);
      first && first.classList.add("active");
    }
    overlay.querySelector("#tx-accs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-acc]"); if (!b) return;
      overlay.querySelectorAll("#tx-accs .chip").forEach((c) => c.classList.remove("active"));
      b.classList.add("active"); selAcc = b.dataset.acc;
    });
    overlay.querySelector("#tx-type").addEventListener("click", (e) => {
      const b = e.target.closest("[data-t]"); if (!b) return;
      const nt = b.dataset.t;
      txSheet(nt, txId && editing && editing.type === nt ? txId : null);
    });
    const sk = overlay.querySelector("#tx-savekind");
    sk && sk.addEventListener("click", (e) => {
      const b = e.target.closest("[data-k]"); if (!b) return;
      txSheet(b.dataset.k, txId && editing && editing.type === b.dataset.k ? txId : null);
    });
    const catsEl = overlay.querySelector("#tx-cats");
    catsEl && catsEl.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cat]"); if (!b) return;
      overlay.querySelectorAll("#tx-cats .chip").forEach((c) => c.classList.remove("active"));
      b.classList.add("active"); selCat = b.dataset.cat;
    });
    overlay.querySelector("#tx-save").addEventListener("click", () => {
      const amount = F.parseMoney(overlay.querySelector("#tx-amount").value);
      if (amount <= 0) { overlay.querySelector("#tx-amount").focus(); return; }
      const recEl = overlay.querySelector("#tx-rec");
      const data = {
        type: selType, amount,
        category: isSaving ? "Ahorro" : selCat,
        account: selAcc,
        note: overlay.querySelector("#tx-note").value,
        date: overlay.querySelector("#tx-date").value,
        recurring: recEl ? recEl.checked : false,
      };
      if (editing) S.updateTransaction(editing.id, data); else S.addTransaction(data);
      closeSheet(); render();
    });
    const del = overlay.querySelector("#tx-del");
    del && del.addEventListener("click", () => {
      if (confirm("¿Eliminar este movimiento?")) { S.deleteTransaction(editing.id); closeSheet(); render(); }
    });
  }

  function debtSheet(debtId) {
    const s = S.get();
    const d = debtId ? s.debts.find((x) => x.id === debtId) : { name: "", creditor: "", total: "", remaining: "", apr: "", minPayment: "", dueDay: "" };
    openSheet(`
      <h2>${debtId ? "Editar deuda" : "Nueva deuda"}</h2>
      <div class="field"><label>Nombre</label>
        <input type="text" id="d-name" value="${esc(d.name)}" placeholder="Ej: Tarjeta Visa" autofocus></div>
      <div class="field"><label>Entidad / acreedor (opcional)</label>
        <input type="text" id="d-cred" value="${esc(d.creditor)}" placeholder="Ej: Bancolombia"></div>
      <div class="field-row">
        <div class="field"><label>Monto original</label>
          <input type="text" inputmode="numeric" id="d-total" value="${d.total ? F.num(d.total) : ""}" placeholder="$ 0"></div>
        <div class="field"><label>Saldo actual</label>
          <input type="text" inputmode="numeric" id="d-rem" value="${d.remaining !== "" && d.remaining != null ? F.num(d.remaining) : ""}" placeholder="$ 0"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Tasa % anual (E.A.)</label>
          <input type="text" inputmode="decimal" id="d-apr" value="${d.apr || ""}" placeholder="Ej: 28"></div>
        <div class="field"><label>Cuota mínima/mes</label>
          <input type="text" inputmode="numeric" id="d-min" value="${d.minPayment ? F.num(d.minPayment) : ""}" placeholder="$ 0"></div>
      </div>
      <div class="field"><label>Día de pago (del mes)</label>
        <input type="number" min="1" max="31" id="d-due" value="${d.dueDay || ""}" placeholder="Ej: 15">
        <div class="hint">¿No sabes la tasa? Pon un estimado; para tarjetas suele ser 25–30% E.A.</div>
      </div>
      <button class="btn primary" id="d-save">${debtId ? "Guardar cambios" : "Agregar deuda"}</button>
      ${debtId ? `<button class="btn danger block mt8" id="d-del">Eliminar deuda</button>` : ""}
    `);
    overlay.querySelector("#d-save").addEventListener("click", () => {
      const data = {
        name: overlay.querySelector("#d-name").value || "Deuda",
        creditor: overlay.querySelector("#d-cred").value,
        total: F.parseMoney(overlay.querySelector("#d-total").value),
        remaining: F.parseMoney(overlay.querySelector("#d-rem").value) || F.parseMoney(overlay.querySelector("#d-total").value),
        apr: parseFloat(String(overlay.querySelector("#d-apr").value).replace(",", ".")) || 0,
        minPayment: F.parseMoney(overlay.querySelector("#d-min").value),
        dueDay: +overlay.querySelector("#d-due").value || 1,
      };
      if (data.total <= 0 && data.remaining <= 0) { overlay.querySelector("#d-total").focus(); return; }
      if (debtId) S.updateDebt(debtId, data); else S.addDebt(data);
      closeSheet(); render();
    });
    const del = overlay.querySelector("#d-del");
    del && del.addEventListener("click", () => {
      if (confirm("¿Eliminar esta deuda?")) { S.deleteDebt(debtId); closeSheet(); render(); }
    });
  }

  function paySheet(debtId) {
    const s = S.get();
    const d = s.debts.find((x) => x.id === debtId);
    if (!d) return;
    const accts = (s.accounts && s.accounts.length) ? s.accounts : ["Efectivo", "Cuenta bancaria"];
    let selAcc = accts.includes("Cuenta bancaria") ? "Cuenta bancaria" : accts[0];
    openSheet(`
      <h2>Abono a ${esc(d.name)}</h2>
      <p class="muted small" style="margin-top:-8px">Saldo actual: <b>${F.money(d.remaining)}</b></p>
      <div class="field amount"><label>Monto del abono</label>
        <input type="text" inputmode="numeric" id="pay-amt" value="${d.minPayment ? F.num(d.minPayment) : ""}" placeholder="$ 0" autofocus></div>
      <div class="field"><label>¿Con qué pagaste?</label>
        <div class="chips" id="pay-accs">
          ${accts.map((a) => `<button class="chip ${selAcc === a ? "active" : ""}" data-acc="${esc(a)}">${accIcon(a)} ${esc(a)}</button>`).join("")}
        </div>
      </div>
      <div class="alert info" style="margin-bottom:14px"><div class="ico">✅</div><div class="a-text">No tienes que anotarlo aparte: esto <b>baja el saldo de la deuda</b> y se registra solo como gasto "Pago deuda".</div></div>
      <button class="btn primary" id="pay-go">Registrar abono</button>
    `);
    overlay.querySelector("#pay-accs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-acc]"); if (!b) return;
      overlay.querySelectorAll("#pay-accs .chip").forEach((c) => c.classList.remove("active"));
      b.classList.add("active"); selAcc = b.dataset.acc;
    });
    overlay.querySelector("#pay-go").addEventListener("click", () => {
      const amt = F.parseMoney(overlay.querySelector("#pay-amt").value);
      if (amt <= 0) return;
      S.payDebt(debtId, amt, selAcc);
      closeSheet(); render();
    });
  }

  function changePwSheet() {
    openSheet(`
      <h2>Cambiar contraseña</h2>
      <div class="field"><label>Contraseña actual</label>
        <input type="password" id="cp-cur" inputmode="numeric" autocomplete="current-password" autofocus></div>
      <div class="field"><label>Nueva contraseña</label>
        <input type="password" id="cp-new" inputmode="numeric" autocomplete="new-password"></div>
      <div class="field"><label>Repite la nueva</label>
        <input type="password" id="cp-new2" inputmode="numeric" autocomplete="new-password"></div>
      <div class="lock-error" id="cp-err" style="min-height:18px"></div>
      <button class="btn primary" id="cp-go">Guardar</button>
    `);
    overlay.querySelector("#cp-go").addEventListener("click", async () => {
      const cur = overlay.querySelector("#cp-cur").value;
      const nw = overlay.querySelector("#cp-new").value;
      const nw2 = overlay.querySelector("#cp-new2").value;
      const err = overlay.querySelector("#cp-err");
      if (nw !== nw2) { err.textContent = "Las contraseñas no coinciden."; return; }
      const r = await window.Auth.changePassword(cur, nw);
      if (!r.ok) { err.textContent = r.msg; return; }
      closeSheet(); flash("Contraseña actualizada ✅");
    });
  }

  function addUserSheet() {
    openSheet(`
      <h2>Agregar usuario</h2>
      <p class="small muted" style="margin-top:-8px">El nuevo usuario tendrá sus propias finanzas, separadas de las tuyas.</p>
      <div class="field"><label>Usuario</label>
        <input type="text" id="su-user" autocapitalize="none" autocomplete="username" placeholder="Ej: Michelle"></div>
      <div class="field"><label>Contraseña</label>
        <input type="password" id="su-pw" inputmode="numeric" autocomplete="new-password"></div>
      <div class="field"><label>Repite la contraseña</label>
        <input type="password" id="su-pw2" inputmode="numeric" autocomplete="new-password"></div>
      <div class="lock-error" id="su-err" style="min-height:18px"></div>
      <button class="btn primary" id="su-go">Crear usuario 🔒</button>
    `);
    overlay.querySelector("#su-go").addEventListener("click", async () => {
      const user = overlay.querySelector("#su-user").value.trim();
      const pw = overlay.querySelector("#su-pw").value;
      const pw2 = overlay.querySelector("#su-pw2").value;
      const err = overlay.querySelector("#su-err");
      if (pw !== pw2) { err.textContent = "Las contraseñas no coinciden."; return; }
      const r = await window.Auth.createProfile(user, pw);
      if (!r.ok) { err.textContent = r.msg; return; }
      closeSheet(); flash(`Usuario "${user}" creado ✅`); render();
    });
  }

  // ---------- Eventos globales (delegación) ----------
  document.addEventListener("click", (e) => {
    const t = e.target;
    const nav = t.closest("[data-nav]"); if (nav) return navTo(nav.dataset.nav);
    const goto = t.closest("[data-goto]"); if (goto) return navTo(goto.dataset.goto);
    const quick = t.closest("[data-quick]"); if (quick) return txSheet(quick.dataset.quick);
    if (t.closest("[data-adddebt]")) return debtSheet();
    const ed = t.closest("[data-editdebt]"); if (ed) return debtSheet(ed.dataset.editdebt);
    const pay = t.closest("[data-pay]"); if (pay) return paySheet(pay.dataset.pay);
    const tx = t.closest("[data-tx]"); if (tx) { const o = S.get().transactions.find((x) => x.id === tx.dataset.tx); return txSheet(o.type, tx.dataset.tx); }
    const debtCard = t.closest(".debt-card"); // no-op, uses buttons

    if (t.closest("[data-savesettings]")) {
      const p1 = +document.getElementById("set-pay1").value || 0;
      const p2 = +document.getElementById("set-pay2").value || 0;
      const paydays = [p1, p2].filter((d) => d >= 1 && d <= 31);
      S.updateSettings({
        paydays,
        savings: F.parseMoney(document.getElementById("set-savingsbal").value),
        savingsGoalPct: (+document.getElementById("set-savings").value || 10) / 100,
      });
      flash("Guardado ✅"); render(); return;
    }
    const addacc = t.closest("[data-addacc]");
    if (addacc) {
      const name = prompt("Nombre de la cuenta o medio de pago (ej. Nequi, Ahorros, Tarjeta):");
      if (name && name.trim()) { S.addAccount(name.trim()); render(); }
      return;
    }
    const delacc = t.closest("[data-delacc]");
    if (delacc) {
      if (confirm(`¿Quitar "${delacc.dataset.delacc}" de tus cuentas? (No borra los movimientos)`)) {
        S.removeAccount(delacc.dataset.delacc); render();
      }
      return;
    }
    if (t.closest("[data-changepw]")) return changePwSheet();
    if (t.closest("[data-adduser]")) return addUserSheet();
    const deluser = t.closest("[data-deluser]");
    if (deluser) {
      const uname = deluser.dataset.delusername || "ese usuario";
      if (confirm(`¿Eliminar a "${uname}"? Se borrarán TODOS sus datos (movimientos, deudas, ahorro). Esto no se puede deshacer.`)) {
        window.Auth.deleteProfile(deluser.dataset.deluser);
        flash(`Usuario "${uname}" eliminado`); render();
      }
      return;
    }
    if (t.closest("[data-switchuser]")) {
      if (confirm("¿Cambiar de usuario? Se cerrará esta sesión y volverá a la pantalla de acceso.")) {
        window.Auth.lockNow();
      }
      return;
    }
    if (t.closest("[data-export]")) return doExport();
    if (t.closest("[data-import]")) { document.getElementById("import-file").click(); return; }
    if (t.closest("[data-reset]")) {
      if (confirm("Esto borrará TODOS tus datos de este dispositivo. ¿Continuar?")) { S.reset(); navTo("inicio"); }
      return;
    }
  });

  // input del abono extra (simulador) — recalcula al vuelo
  document.addEventListener("input", (e) => {
    if (e.target.id === "extra-input") {
      window.__extra = F.parseMoney(e.target.value);
      clearTimeout(window.__extraT);
      window.__extraT = setTimeout(() => {
        const pos = e.target.selectionStart;
        render();
        const inp = document.getElementById("extra-input");
        if (inp) { inp.focus(); inp.setSelectionRange(pos, pos); }
      }, 500);
    }
  });

  // import file
  document.addEventListener("change", (e) => {
    if (e.target.id === "import-file" && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        if (S.importJSON(reader.result)) { flash("Datos importados ✅"); navTo("inicio"); }
        else alert("Archivo inválido.");
      };
      reader.readAsText(e.target.files[0]);
    }
  });

  function doExport() {
    const blob = new Blob([S.exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `finanzas-${F.ymd(F.hoy())}.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  function flash(msg) {
    const f = el(`<div style="position:fixed;bottom:calc(96px + var(--safe-bottom));left:50%;transform:translateX(-50%);background:var(--card);border:1px solid var(--border);color:var(--text);padding:12px 18px;border-radius:12px;z-index:60;box-shadow:var(--shadow);font-weight:600">${esc(msg)}</div>`);
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1800);
  }

  // FAB
  document.getElementById("fab").addEventListener("click", () => {
    if (current === "deudas") debtSheet(); else txSheet("expense");
  });

  // reaccionar a cambios de datos desde otras pestañas
  window.addEventListener("store:changed", () => {}); // el render se hace manualmente tras cada acción

  // ---------- Init ----------
  function boot() {
    navTo("inicio");
  }

  // registrar service worker (offline) + auto-actualización
  if ("serviceWorker" in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController && !reloading) { reloading = true; location.reload(); }
    });
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
        .then((reg) => {
          reg.update();
          reg.addEventListener("updatefound", () => {
            const nw = reg.installing;
            nw && nw.addEventListener("statechange", () => {
              if (nw.state === "installed" && navigator.serviceWorker.controller) {
                nw.postMessage("skipWaiting");
              }
            });
          });
        })
        .catch(() => {});
    });
  }

  // Arranque con candado (usuario/contraseña) si está disponible
  if (window.Auth) window.Auth.guard(boot); else boot();
})();
