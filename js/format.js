/* format.js — utilidades de formato (fechas, números, tiempo y ritmo de running) */
(function () {
  "use strict";

  const NUM = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
  const NUM1 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

  function num(n, d) {
    if (n == null || isNaN(n)) return "0";
    return (d === 1 ? NUM1 : NUM).format(n);
  }

  function pct(n, digits) {
    if (n == null || isNaN(n)) return "0%";
    return (
      new Intl.NumberFormat("es-CO", {
        maximumFractionDigits: digits == null ? 0 : digits,
      }).format(n * 100) + "%"
    );
  }

  // ---------- Tiempo (running) ----------
  // Segundos -> "mm:ss" o "h:mm:ss"
  function tiempo(seg) {
    seg = Math.max(0, Math.round(+seg || 0));
    const h = Math.floor(seg / 3600);
    const m = Math.floor((seg % 3600) / 60);
    const s = seg % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    if (h > 0) return `${h}:${mm}:${ss}`;
    return `${m}:${ss}`;
  }

  // Ritmo: segundos por km -> "m:ss /km"
  function ritmo(segPorKm) {
    if (!segPorKm || isNaN(segPorKm) || !isFinite(segPorKm)) return "—";
    const s = Math.round(segPorKm);
    const m = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, "0");
    return `${m}:${ss}/km`;
  }

  // Parsea "20:00", "4:00", "1:05:30", "90" (seg) -> segundos
  function parseTiempo(str) {
    if (typeof str === "number") return str;
    if (!str) return 0;
    const parts = String(str).trim().split(":").map((x) => parseInt(x, 10) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }

  // km/h a partir de segundos por km
  function velocidad(segPorKm) {
    if (!segPorKm) return 0;
    return 3600 / segPorKm;
  }

  const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const DIAS_LARGO = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];

  function toDate(d) {
    if (d instanceof Date) return d;
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

  function relativo(dias) {
    if (dias === 0) return "hoy";
    if (dias === 1) return "mañana";
    if (dias === -1) return "ayer";
    if (dias > 1) return `en ${dias} días`;
    return `hace ${Math.abs(dias)} días`;
  }

  // Índice de día de semana empezando en lunes (0 = lunes ... 6 = domingo)
  function diaSemanaLun(d) {
    const g = toDate(d).getDay(); // 0=dom
    return (g + 6) % 7;
  }

  window.Fmt = {
    num, pct,
    tiempo, ritmo, parseTiempo, velocidad,
    toDate, ymd, fecha, fechaLarga, hoy, diasEntre, relativo, diaSemanaLun,
    MESES, DIAS, DIAS_LARGO,
  };
})();
