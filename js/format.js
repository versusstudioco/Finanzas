/* format.js — utilidades de formato (moneda COP, fechas, números) */
(function () {
  "use strict";

  const COP = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  const COP_SIGNED = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
    signDisplay: "always",
  });

  const NUM = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

  function money(n) {
    if (n == null || isNaN(n)) return COP.format(0);
    return COP.format(Math.round(n));
  }

  function moneySigned(n) {
    if (n == null || isNaN(n)) return COP_SIGNED.format(0);
    return COP_SIGNED.format(Math.round(n));
  }

  function num(n) {
    if (n == null || isNaN(n)) return "0";
    return NUM.format(n);
  }

  function pct(n, digits) {
    if (n == null || isNaN(n)) return "0%";
    return (
      new Intl.NumberFormat("es-CO", {
        maximumFractionDigits: digits == null ? 0 : digits,
      }).format(n * 100) + "%"
    );
  }

  // Convierte texto de un input (ej "1.500.000" o "1500000") a número.
  function parseMoney(str) {
    if (typeof str === "number") return str;
    if (!str) return 0;
    const cleaned = String(str)
      .replace(/[^0-9,.-]/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".");
    const v = parseFloat(cleaned);
    return isNaN(v) ? 0 : v;
  }

  const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];

  function toDate(d) {
    if (d instanceof Date) return d;
    // formato YYYY-MM-DD (local, sin desfase de zona horaria)
    const parts = String(d).split("-");
    if (parts.length === 3) {
      return new Date(+parts[0], +parts[1] - 1, +parts[2]);
    }
    return new Date(d);
  }

  function ymd(d) {
    const dt = toDate(d);
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${dt.getFullYear()}-${m}-${day}`;
  }

  function fecha(d) {
    const dt = toDate(d);
    return `${dt.getDate()} ${MESES[dt.getMonth()].slice(0, 3)} ${dt.getFullYear()}`;
  }

  function fechaLarga(d) {
    const dt = toDate(d);
    return `${DIAS[dt.getDay()]} ${dt.getDate()} de ${MESES[dt.getMonth()]}`;
  }

  function hoy() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function diasEntre(a, b) {
    const ms = toDate(b).getTime() - toDate(a).getTime();
    return Math.round(ms / 86400000);
  }

  // "en 3 días", "hoy", "mañana", "hace 2 días"
  function relativo(dias) {
    if (dias === 0) return "hoy";
    if (dias === 1) return "mañana";
    if (dias === -1) return "ayer";
    if (dias > 1) return `en ${dias} días`;
    return `hace ${Math.abs(dias)} días`;
  }

  window.Fmt = {
    money, moneySigned, num, pct, parseMoney,
    toDate, ymd, fecha, fechaLarga, hoy, diasEntre, relativo,
    MESES, DIAS,
  };
})();
