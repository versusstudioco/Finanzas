/* store.js — capa de datos local (localStorage). Todo vive en el teléfono. */
(function () {
  "use strict";

  const KEY = "finanzas.v1";

  const DEFAULT = {
    version: 1,
    settings: {
      currency: "COP",
      payday: 0, // día del mes en que recibes ingreso principal (0 = sin definir)
      bufferPct: 0.1, // colchón de seguridad sobre gasto mensual
      savingsGoalPct: 0.1, // meta de ahorro
      onboarded: false,
    },
    // categorías por defecto
    categories: {
      income: ["Salario", "Freelance", "Ventas", "Otros ingresos"],
      expense: [
        "Arriendo", "Servicios", "Mercado", "Transporte", "Comida fuera",
        "Salud", "Educación", "Entretenimiento", "Suscripciones", "Otros",
      ],
    },
    transactions: [], // {id, type, amount, category, date, note, recurring}
    debts: [], // {id, name, creditor, total, remaining, apr, minPayment, dueDay}
  };

  let state = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        state = Object.assign({}, DEFAULT, JSON.parse(raw));
        state.settings = Object.assign({}, DEFAULT.settings, state.settings);
        state.categories = Object.assign({}, DEFAULT.categories, state.categories);
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

  // ---- Transacciones ----
  function addTransaction(t) {
    const tx = {
      id: uid(),
      type: t.type === "income" ? "income" : "expense",
      amount: Math.abs(+t.amount || 0),
      category: t.category || "Otros",
      date: t.date || window.Fmt.ymd(window.Fmt.hoy()),
      note: t.note || "",
      recurring: !!t.recurring,
    };
    get().transactions.push(tx);
    save();
    return tx;
  }

  function updateTransaction(id, patch) {
    const t = get().transactions.find((x) => x.id === id);
    if (t) {
      Object.assign(t, patch);
      if (patch.amount != null) t.amount = Math.abs(+patch.amount || 0);
      save();
    }
    return t;
  }

  function deleteTransaction(id) {
    state.transactions = get().transactions.filter((x) => x.id !== id);
    save();
  }

  // ---- Deudas ----
  function addDebt(d) {
    const debt = {
      id: uid(),
      name: d.name || "Deuda",
      creditor: d.creditor || "",
      total: Math.abs(+d.total || 0),
      remaining: d.remaining != null ? Math.abs(+d.remaining) : Math.abs(+d.total || 0),
      apr: Math.max(0, +d.apr || 0), // tasa efectiva anual en %
      minPayment: Math.abs(+d.minPayment || 0),
      dueDay: Math.min(31, Math.max(1, +d.dueDay || 1)),
    };
    get().debts.push(debt);
    save();
    return debt;
  }

  function updateDebt(id, patch) {
    const d = get().debts.find((x) => x.id === id);
    if (d) {
      Object.assign(d, patch);
      ["total", "remaining", "apr", "minPayment"].forEach((k) => {
        if (patch[k] != null) d[k] = Math.abs(+patch[k] || 0);
      });
      if (patch.dueDay != null) d.dueDay = Math.min(31, Math.max(1, +patch.dueDay));
      save();
    }
    return d;
  }

  function deleteDebt(id) {
    state.debts = get().debts.filter((x) => x.id !== id);
    save();
  }

  // Registrar un abono a una deuda: descuenta del saldo y crea un gasto.
  function payDebt(id, amount) {
    const d = get().debts.find((x) => x.id === id);
    if (!d) return;
    const amt = Math.abs(+amount || 0);
    d.remaining = Math.max(0, d.remaining - amt);
    addTransaction({
      type: "expense",
      amount: amt,
      category: "Pago deuda",
      note: `Abono: ${d.name}`,
    });
    // addTransaction ya llama save()
  }

  // ---- Settings ----
  function updateSettings(patch) {
    Object.assign(get().settings, patch);
    save();
  }

  function setOnboarded(v) {
    get().settings.onboarded = !!v;
    save();
  }

  // ---- Import / Export ----
  function exportJSON() {
    return JSON.stringify(get(), null, 2);
  }

  function importJSON(json) {
    try {
      const data = typeof json === "string" ? JSON.parse(json) : json;
      state = Object.assign({}, DEFAULT, data);
      state.settings = Object.assign({}, DEFAULT.settings, data.settings || {});
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
    addTransaction, updateTransaction, deleteTransaction,
    addDebt, updateDebt, deleteDebt, payDebt,
    updateSettings, setOnboarded,
    exportJSON, importJSON, reset,
  };
})();
