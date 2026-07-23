/* advisor.js — el "agente" financiero. Motor de reglas que analiza tus datos
   y produce: diagnóstico de deudas, fechas de pago, si puedes gastar,
   alertas y un plan de acción priorizado. Todo local, sin internet. */
(function () {
  "use strict";

  const F = window.Fmt;

  // ---------- Helpers de periodo ----------
  function inMonth(dateStr, ref) {
    const d = F.toDate(dateStr);
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  }

  function sum(arr, f) {
    return arr.reduce((a, x) => a + (f ? f(x) : x), 0);
  }

  // Próxima fecha de nómina dada una lista de días del mes (ej. [15, 30]).
  function nextPaydayDate(paydays, desde) {
    const days = (paydays || []).map((n) => +n).filter((n) => n >= 1 && n <= 31);
    if (!days.length) return null;
    const dates = days.map((d) => nextDueDate(d, desde));
    return dates.sort((a, b) => a - b)[0];
  }

  // Próxima fecha de vencimiento (día del mes) a partir de "desde".
  function nextDueDate(dueDay, desde) {
    const base = desde || F.hoy();
    let y = base.getFullYear();
    let m = base.getMonth();
    // ajustar por meses con menos días
    function build(yy, mm) {
      const last = new Date(yy, mm + 1, 0).getDate();
      return new Date(yy, mm, Math.min(dueDay, last));
    }
    let candidate = build(y, m);
    if (candidate < base) {
      m += 1;
      if (m > 11) { m = 0; y += 1; }
      candidate = build(y, m);
    }
    return candidate;
  }

  // ---------- Análisis principal ----------
  function analyze(state, refDate) {
    const s = state || window.Store.get();
    const ref = refDate || F.hoy();
    const tx = s.transactions || [];
    const debts = s.debts || [];

    // Balance disponible (histórico): ingresos - gastos
    const totalIncome = sum(tx.filter((t) => t.type === "income"), (t) => t.amount);
    const totalExpense = sum(tx.filter((t) => t.type === "expense"), (t) => t.amount);
    const balance = totalIncome - totalExpense;

    // Saldo por cuenta / medio de pago (efectivo, banco, etc.)
    const accMap = {};
    (s.accounts || []).forEach((a) => { accMap[a] = 0; });
    tx.forEach((t) => {
      const a = t.account || "Efectivo";
      if (!(a in accMap)) accMap[a] = 0;
      accMap[a] += t.type === "income" ? t.amount : -t.amount;
    });
    const accountBalances = Object.entries(accMap).map(([name, amount]) => ({ name, amount }));

    // Mes actual
    const monthTx = tx.filter((t) => inMonth(t.date, ref));
    const monthIncome = sum(monthTx.filter((t) => t.type === "income"), (t) => t.amount);
    const monthExpense = sum(monthTx.filter((t) => t.type === "expense"), (t) => t.amount);
    const monthNet = monthIncome - monthExpense;

    // Ingreso mensual de referencia (mes actual, o promedio de últimos 3 meses)
    let refIncome = monthIncome;
    if (refIncome === 0) {
      const last3 = [0, 1, 2].map((k) => {
        const r = new Date(ref.getFullYear(), ref.getMonth() - k, 1);
        return sum(tx.filter((t) => t.type === "income" && inMonth(t.date, r)), (t) => t.amount);
      });
      const nonZero = last3.filter((v) => v > 0);
      refIncome = nonZero.length ? sum(nonZero) / nonZero.length : 0;
    }

    // Gasto mensual de referencia (promedio simple del mes actual o histórico mensual)
    const refExpense = monthExpense > 0 ? monthExpense : avgMonthlyExpense(tx, ref);

    // ---- Deudas ----
    const totalDebt = sum(debts, (d) => d.remaining);
    const totalMinPayments = sum(debts, (d) => d.minPayment);
    // Prioridad avalancha: mayor tasa primero
    const byRate = debts.slice().filter((d) => d.remaining > 0).sort((a, b) => b.apr - a.apr);
    // Prioridad bola de nieve: menor saldo primero
    const bySize = debts.slice().filter((d) => d.remaining > 0).sort((a, b) => a.remaining - b.remaining);

    const debtToIncome = refIncome > 0 ? totalMinPayments / refIncome : 0; // carga mensual
    const debtToIncomeTotal = refIncome > 0 ? totalDebt / refIncome : 0;

    // ---- Próximos pagos (deudas con saldo) ----
    const upcoming = debts
      .filter((d) => d.remaining > 0)
      .map((d) => {
        const due = nextDueDate(d.dueDay, ref);
        const dias = F.diasEntre(ref, due);
        const amount = d.minPayment > 0 ? d.minPayment : Math.min(d.remaining, d.remaining);
        return {
          debtId: d.id, name: d.name, creditor: d.creditor,
          due, dias, amount: Math.min(amount, d.remaining), apr: d.apr,
        };
      })
      .sort((a, b) => a.due - b.due);

    // Pagos en próximos 30 días
    const next30 = upcoming.filter((u) => u.dias >= 0 && u.dias <= 30);
    const oblig30 = sum(next30, (u) => u.amount);

    // ---- Próxima nómina (quincenal o mensual) ----
    const nextPayday = nextPaydayDate(s.settings.paydays, ref);
    const daysToPayday = nextPayday ? F.diasEntre(ref, nextPayday) : null;

    // ---- ¿Puedo gastar? ----
    // Reservamos las obligaciones que caen antes de tu próximo pago de nómina
    // (si está configurado); si no, usamos la ventana de 30 días.
    const windowEnd = nextPayday || null;
    const obligWindow = windowEnd
      ? sum(upcoming.filter((u) => u.due <= windowEnd && u.dias >= 0), (u) => u.amount)
      : oblig30;
    const buffer = Math.max(refExpense * (s.settings.bufferPct || 0), 0);
    const reserve = obligWindow + buffer;
    const safeToSpend = balance - reserve;
    const canSpend = safeToSpend > 0;

    // Tasa de ahorro del mes
    const savingsRate = monthIncome > 0 ? monthNet / monthIncome : 0;

    // ---- Ahorro / fondo de emergencia ----
    const savings = Math.max(0, +s.settings.savings || 0);
    const emergencyTarget = refExpense * 3; // meta mínima: 3 meses de gastos
    const emergencyTargetFull = refExpense * 6; // ideal: 6 meses
    const emergencyMonths = refExpense > 0 ? savings / refExpense : (savings > 0 ? 99 : 0);

    // ---- Plan de ahorro mensual ----
    const goalPct = s.settings.savingsGoalPct || 0.1;
    const baseIncome = monthIncome > 0 ? monthIncome : refIncome;
    const monthlyTarget = baseIncome * goalPct; // cuánto deberías ahorrar este mes
    const savedThisMonth = monthNet; // ingresos - gastos del mes = lo que te queda para ahorrar
    const savingsProgress = monthlyTarget > 0 ? savedThisMonth / monthlyTarget : 0;
    const savingsGap = Math.max(0, monthlyTarget - savedThisMonth); // lo que falta para la meta

    // Historial mes a mes (últimos 6 meses con actividad)
    const monthlyHistory = [];
    for (let k = 5; k >= 0; k--) {
      const r0 = new Date(ref.getFullYear(), ref.getMonth() - k, 1);
      const inc = sum(tx.filter((t) => t.type === "income" && inMonth(t.date, r0)), (t) => t.amount);
      const exp = sum(tx.filter((t) => t.type === "expense" && inMonth(t.date, r0)), (t) => t.amount);
      if (inc === 0 && exp === 0) continue;
      const net = inc - exp;
      const target = inc * goalPct;
      monthlyHistory.push({
        label: F.MESES[r0.getMonth()].slice(0, 3),
        income: inc, expense: exp, net, target,
        met: inc > 0 && net >= target,
      });
    }

    // Gasto por categoría (mes actual)
    const byCategory = {};
    monthTx.filter((t) => t.type === "expense").forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });
    const categories = Object.entries(byCategory)
      .map(([name, amount]) => ({
        name, amount,
        pct: monthExpense > 0 ? amount / monthExpense : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const result = {
      ref,
      hasData: tx.length > 0 || debts.length > 0,
      balance, totalIncome, totalExpense,
      monthIncome, monthExpense, monthNet, savingsRate,
      refIncome, refExpense,
      totalDebt, totalMinPayments, debtToIncome, debtToIncomeTotal,
      byRate, bySize,
      upcoming, next30, oblig30,
      nextPayday, daysToPayday, obligWindow,
      buffer, reserve, safeToSpend, canSpend,
      accountBalances,
      savings, emergencyTarget, emergencyTargetFull, emergencyMonths,
      goalPct, monthlyTarget, savedThisMonth, savingsProgress, savingsGap, monthlyHistory,
      categories,
    };

    result.alerts = buildAlerts(result, s);
    result.plan = buildPlan(result, s);
    result.health = healthScore(result);
    return result;
  }

  function avgMonthlyExpense(tx, ref) {
    const months = {};
    tx.filter((t) => t.type === "expense").forEach((t) => {
      const d = F.toDate(t.date);
      const key = d.getFullYear() + "-" + d.getMonth();
      months[key] = (months[key] || 0) + t.amount;
    });
    const vals = Object.values(months);
    return vals.length ? sum(vals) / vals.length : 0;
  }

  // ---------- Alertas ----------
  function buildAlerts(r, s) {
    const A = [];

    if (!r.hasData) {
      A.push({
        level: "info",
        icon: "👋",
        title: "Empecemos por tus deudas",
        text: "Registra primero tus deudas y luego tus ingresos y gastos para que pueda analizarte.",
      });
      return A;
    }

    // Pagos muy próximos
    r.next30.filter((u) => u.dias <= 3).forEach((u) => {
      A.push({
        level: u.dias <= 1 ? "danger" : "warn",
        icon: "📅",
        title: `Pago ${F.relativo(u.dias)}: ${u.name}`,
        text: `${F.money(u.amount)} vence el ${F.fechaLarga(u.due)}.`,
      });
    });

    // ¿Fondos suficientes para lo que viene?
    if (r.oblig30 > 0 && r.balance < r.oblig30) {
      A.push({
        level: "danger",
        icon: "⚠️",
        title: "Fondos insuficientes para tus pagos",
        text: `En 30 días debes pagar ${F.money(r.oblig30)} pero tu saldo disponible es ${F.money(r.balance)}. Faltan ${F.money(r.oblig30 - r.balance)}.`,
      });
    }

    // Déficit del mes
    if (r.monthIncome > 0 && r.monthNet < 0) {
      A.push({
        level: "warn",
        icon: "📉",
        title: "Estás gastando más de lo que ganas",
        text: `Este mes llevas un déficit de ${F.money(-r.monthNet)}. Revisa tus gastos grandes.`,
      });
    }

    // Carga de deuda alta
    if (r.debtToIncome > 0.36) {
      A.push({
        level: r.debtToIncome > 0.5 ? "danger" : "warn",
        icon: "🏦",
        title: "Carga de deuda alta",
        text: `Tus cuotas mínimas son el ${F.pct(r.debtToIncome)} de tu ingreso. Lo sano es menos del 36%.`,
      });
    }

    // Categoría dominante
    const top = r.categories[0];
    if (top && top.pct > 0.4 && r.monthExpense > 0) {
      A.push({
        level: "info",
        icon: "🔍",
        title: `"${top.name}" concentra tu gasto`,
        text: `Es el ${F.pct(top.pct)} de tus gastos del mes (${F.money(top.amount)}). ¿Se puede optimizar?`,
      });
    }

    // Todo bien
    if (A.length === 0) {
      A.push({
        level: "good",
        icon: "✅",
        title: "Vas bien",
        text: r.canSpend
          ? `Puedes gastar con tranquilidad hasta ${F.money(r.safeToSpend)} sin afectar tus pagos.`
          : "Sin alertas urgentes. Mantén el control de tus gastos.",
      });
    }
    return A;
  }

  // ---------- Plan de acción ----------
  function buildPlan(r, s) {
    const P = [];

    if (!r.hasData) {
      P.push({ n: 1, icon: "🏦", title: "Registra tus deudas", text: "Anota cada deuda con su saldo, tasa (%) y día de pago. Es el primer paso para entender tu situación." });
      P.push({ n: 2, icon: "💵", title: "Registra tus ingresos", text: "Agrega tu salario u otros ingresos del mes." });
      P.push({ n: 3, icon: "🧾", title: "Anota tus gastos", text: "Registra los gastos para ver a dónde se va tu dinero." });
      return P;
    }

    let n = 1;

    const worst = r.byRate[0];

    // 1. Fondo de emergencia según tu ahorro actual
    if (r.refExpense > 0) {
      if (r.savings < r.refExpense) {
        P.push({
          n: n++, icon: "🛟",
          title: "Arma un fondo de emergencia inicial",
          text: `Tienes ${F.money(r.savings)} ahorrado (${r.emergencyMonths.toFixed(1)} meses de gastos). Primer objetivo: 1 mes = ${F.money(r.refExpense)}. Es tu red de seguridad antes de invertir o gastar de más.`,
        });
      } else if (r.savings < r.emergencyTarget) {
        P.push({
          n: n++, icon: "🛟",
          title: "Sigue creciendo tu fondo de emergencia",
          text: `Vas bien: ${F.money(r.savings)} (${r.emergencyMonths.toFixed(1)} meses). Apunta a 3 meses = ${F.money(r.emergencyTarget)}.`,
        });
      }
    }

    // 2. Lo más rentable: usar excedente del ahorro para matar deuda cara
    if (worst && worst.apr >= 20 && r.savings > r.refExpense) {
      const surplus = r.savings - r.refExpense; // deja 1 mes de colchón
      const useForDebt = Math.min(surplus, worst.remaining);
      if (useForDebt > 0) {
        P.push({
          n: n++, icon: "🧮",
          title: `Lo mejor para tu bolsillo: baja "${worst.name}" con parte del ahorro`,
          text: `Esa deuda cuesta ${F.pct(worst.apr / 100)} al año, más de lo que rinde el ahorro. Dejando 1 mes de colchón (${F.money(r.refExpense)}), abonar ${F.money(useForDebt)} te ahorra ~${F.money(useForDebt * worst.apr / 100)}/año en intereses.`,
        });
      }
    }

    // 3. Priorizar deuda de mayor tasa (avalancha)
    if (r.byRate.length > 0) {
      P.push({
        n: n++, icon: "🔥",
        title: `Ataca primero: ${worst.name}`,
        text: `Es tu deuda más cara (${F.pct(worst.apr / 100)} anual, saldo ${F.money(worst.remaining)}). Paga el mínimo en las demás y todo el excedente aquí. Ahorras más en intereses.`,
      });
    }

    // 3b. Fondo sólido y sin deuda cara → invertir
    if (r.savings >= r.emergencyTarget && (!worst || worst.apr < 15) && r.refExpense > 0) {
      P.push({
        n: n++, icon: "📈",
        title: "Tu excedente ya puede crecer: considera invertir",
        text: `Tienes ${r.emergencyMonths.toFixed(1)} meses de colchón y sin deuda cara. Lo que ahorres de más puede ir a inversión (CDT, fondos, etc.) para que no pierda valor con la inflación.`,
      });
    }

    // 3. Programar pagos próximos
    if (r.next30.length > 0) {
      const list = r.next30.slice(0, 3).map((u) => `${u.name} (${F.fecha(u.due)}, ${F.money(u.amount)})`).join("; ");
      P.push({
        n: n++, icon: "📅",
        title: "Aparta el dinero de tus próximos pagos",
        text: `En los próximos 30 días: ${list}. Separa ${F.money(r.oblig30)} para no atrasarte.`,
      });
    }

    // 4. Optimizar categoría dominante
    const top = r.categories[0];
    if (top && top.pct > 0.3) {
      P.push({
        n: n++, icon: "✂️",
        title: `Revisa tu gasto en "${top.name}"`,
        text: `Es tu categoría más alta (${F.money(top.amount)} este mes). Bajarla 15% liberaría ~${F.money(top.amount * 0.15)}/mes.`,
      });
    }

    // 5. Meta de ahorro de ESTE mes (con cifras reales)
    if (r.monthlyTarget > 0) {
      const pctLabel = F.pct(r.goalPct);
      if (r.savedThisMonth >= r.monthlyTarget) {
        P.push({
          n: n++, icon: "🎉",
          title: "¡Vas cumpliendo tu meta de ahorro!",
          text: `Tu meta es ${F.money(r.monthlyTarget)}/mes (${pctLabel} de tu ingreso) y este mes llevas ${F.money(r.savedThisMonth)} de excedente. Aparta ese dinero a tu ahorro antes de gastarlo.`,
        });
      } else {
        const topCat = r.categories[0];
        const tip = topCat && topCat.amount > r.savingsGap
          ? ` Si recortas ${F.money(r.savingsGap)} de "${topCat.name}" (hoy ${F.money(topCat.amount)}), llegas.`
          : "";
        P.push({
          n: n++, icon: "🎯",
          title: `Este mes deberías ahorrar ${F.money(r.monthlyTarget)}`,
          text: `Es el ${pctLabel} de tu ingreso. Vas ${F.money(Math.max(0, r.savedThisMonth))}; te faltan ${F.money(r.savingsGap)}.${tip} Apártalo apenas te paguen, antes de gastar.`,
        });
      }
    }

    // 6. Si ya está saludable
    if (P.length === 0) {
      P.push({
        n: 1, icon: "🚀",
        title: "Vas muy bien, acelera",
        text: "Sin deudas urgentes ni déficit. Considera invertir tu excedente o aumentar tu fondo de emergencia a 3–6 meses de gastos.",
      });
    }
    return P;
  }

  // ---------- Salud financiera (0-100) ----------
  function healthScore(r) {
    if (!r.hasData) return { score: null, label: "Sin datos", color: "muted" };
    let score = 50;
    // ahorro
    if (r.savingsRate > 0.2) score += 20;
    else if (r.savingsRate > 0.1) score += 12;
    else if (r.savingsRate > 0) score += 5;
    else score -= 15;
    // deuda
    if (r.debtToIncome === 0) score += 15;
    else if (r.debtToIncome < 0.2) score += 10;
    else if (r.debtToIncome < 0.36) score += 3;
    else if (r.debtToIncome < 0.5) score -= 10;
    else score -= 20;
    // colchón / fondo de emergencia (ahorro)
    if (r.emergencyMonths >= 6) score += 18;
    else if (r.emergencyMonths >= 3) score += 12;
    else if (r.emergencyMonths >= 1) score += 5;
    else if (r.savings > 0 || r.balance >= r.buffer) score += 1;
    else score -= 10;
    // fondos para pagos
    if (r.oblig30 > 0 && r.balance < r.oblig30) score -= 15;

    score = Math.max(0, Math.min(100, Math.round(score)));
    let label = "Crítica", color = "danger";
    if (score >= 75) { label = "Excelente"; color = "good"; }
    else if (score >= 55) { label = "Buena"; color = "good"; }
    else if (score >= 40) { label = "Regular"; color = "warn"; }
    else if (score >= 25) { label = "Frágil"; color = "warn"; }
    return { score, label, color };
  }

  // ---------- Simulación de pago de deudas (avalancha) ----------
  // Devuelve meses hasta salir de deudas e intereses totales, dado un extra mensual.
  function simulatePayoff(debts, extraMonthly, strategy) {
    let items = debts
      .filter((d) => d.remaining > 0)
      .map((d) => ({ ...d, bal: d.remaining }));
    if (items.length === 0) return { months: 0, totalInterest: 0, totalPaid: 0, feasible: true };

    function order() {
      if (strategy === "snowball") return items.filter((i) => i.bal > 0).sort((a, b) => a.bal - b.bal);
      return items.filter((i) => i.bal > 0).sort((a, b) => b.apr - a.apr);
    }

    let months = 0, totalInterest = 0, totalPaid = 0;
    const extra = Math.max(0, +extraMonthly || 0);
    const maxMonths = 600;

    while (items.some((i) => i.bal > 0) && months < maxMonths) {
      months++;
      // interés del mes
      items.forEach((i) => {
        if (i.bal > 0) {
          const monthlyRate = i.apr / 100 / 12;
          const interest = i.bal * monthlyRate;
          i.bal += interest;
          totalInterest += interest;
        }
      });
      // pagos mínimos
      let pool = extra;
      items.forEach((i) => {
        if (i.bal > 0) {
          const pay = Math.min(i.minPayment, i.bal);
          i.bal -= pay;
          totalPaid += pay;
        }
      });
      // excedente a la prioridad
      const ord = order();
      for (const i of ord) {
        if (pool <= 0) break;
        const pay = Math.min(pool, i.bal);
        i.bal -= pay;
        pool -= pay;
        totalPaid += pay;
      }
      // Si nadie pudo pagar nada (mínimos no cubren interés y sin extra) → inviable
      const paidSomething = ord.length === 0 || extra > 0 || items.some((i) => i.minPayment > 0);
      if (!paidSomething) break;
    }

    return {
      months,
      years: Math.floor(months / 12),
      remMonths: months % 12,
      totalInterest: Math.round(totalInterest),
      totalPaid: Math.round(totalPaid),
      feasible: months < maxMonths,
    };
  }

  window.Advisor = { analyze, simulatePayoff, nextDueDate, nextPaydayDate };
})();
