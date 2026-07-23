# 💚 Finanzas — tu agente financiero personal

App de finanzas personales lista para tu teléfono. Registra **ingresos, gastos y deudas** y un **agente inteligente** te dice qué analizar, qué fechas debes pagar, cuánto tienes, **si puedes gastar o no**, te alerta y te arma un **plan de acción**.

- 📱 **PWA instalable** — se instala como app en Android e iPhone.
- 🔒 **100% privado y offline** — todos tus datos se guardan solo en tu teléfono (`localStorage`). Sin servidores, sin cuentas, sin internet.
- 🇨🇴 Formato en **pesos colombianos (COP)**.
- 🤖 **Agente incluido** — motor de análisis que funciona al instante, sin API keys.

## ✨ Qué hace el agente

1. **Entiende tus deudas primero** — te pide registrarlas con saldo, tasa (% E.A.) y día de pago.
2. **Diagnóstico** — saldo disponible, carga de deuda vs. ingreso, tasa de ahorro y una **puntuación de salud financiera** (0–100).
3. **¿Puedo gastar?** — calcula cuánto puedes gastar sin afectar tus próximos pagos ni tu colchón de emergencia.
4. **Fechas de pago** — calendario ordenado de vencimientos con cuánto y cuándo.
5. **Alertas** — pagos próximos, fondos insuficientes, déficit del mes, carga de deuda alta, categoría que concentra tu gasto.
6. **Plan de salida de deudas** — método **avalancha** (ataca primero la de mayor tasa) con simulador: mira cuánto tiempo e intereses te ahorras según el abono extra mensual.
7. **Plan de acción** — pasos concretos y priorizados con tus cifras reales.

## 📲 Cómo instalarla en tu teléfono

**Opción A — GitHub Pages (recomendada):**
1. En el repo: **Settings → Pages**.
2. En *Build and deployment → Source*, elige **GitHub Actions**.
3. El workflow incluido (`.github/workflows/pages.yml`) publica la app. Copia la URL que te da.
4. Abre esa URL en tu teléfono:
   - **Android/Chrome:** menú ⋮ → *Agregar a pantalla de inicio*.
   - **iPhone/Safari:** compartir ⬆️ → *Agregar a inicio*.

**Opción B — probar en tu computador:**
```bash
# desde la carpeta del proyecto
python3 -m http.server 8000
# abre http://localhost:8000
```
> Nota: ábrela con un servidor (no con `file://`) para que funcione el modo offline (service worker).

## 🗂️ Estructura

```
index.html              # shell de la app
manifest.webmanifest    # metadatos PWA (instalable)
sw.js                   # service worker (funciona offline)
css/styles.css          # diseño mobile-first, tema oscuro
js/
  format.js             # formato de moneda (COP) y fechas
  store.js              # datos locales (localStorage)
  advisor.js            # el "agente": motor de análisis y reglas
  app.js                # interfaz, navegación y formularios
icons/                  # iconos del PWA (generados)
scripts/make-icons.js   # regenera los iconos PNG (node, sin dependencias)
```

## 🔧 Regenerar iconos

```bash
node scripts/make-icons.js
```

## 💾 Copia de seguridad

Como todo vive en tu teléfono, en **Ajustes** puedes **Exportar** una copia (archivo `.json`) e **Importar**la en otro dispositivo. También puedes **borrar todo**.

## 🧭 Sin dependencias

No usa frameworks ni `npm install`. Es HTML + CSS + JavaScript puro, así que carga rápido y funciona en cualquier navegador moderno.
