# 🏃‍♀️💚 Rayada — tu coach de nutrición y running

App personal para llevar tu **nutrición** y tus **avances en running**, con un **experto en nutrición** y un **experto en running** dentro. Te dice **qué comer**, registra tus comidas, arma tus **entrenamientos** y te lleva paso a paso hacia tu reto.

**Tus metas:** definirte y bajar grasa quedando **rayada** 💪, y correr **5 km en 20 minutos** (4:00/km) — todo integrando tus días de **gimnasio** y **fútbol**.

- 📱 **PWA instalable** — se instala como app en Android e iPhone.
- 🔒 **100% privada y offline** — todos tus datos se guardan solo en tu teléfono (`localStorage`). Sin servidores, sin cuentas, sin internet.
- 🤖 **Coach incluido** — motor de nutrición + entrenamiento que funciona al instante, sin API keys.

## ✨ Qué hace

### El nutricionista 🥗
1. **Tus números** — calcula tu metabolismo (Mifflin-St Jeor), tu gasto diario y tu **objetivo de calorías** con un déficit inteligente para definir sin perder rendimiento.
2. **Macros para definición** — proteína alta (~2 g/kg) para conservar músculo, grasas suficientes para tus hormonas y carbohidratos **alrededor del entreno**.
3. **Registro de comidas** — busca en una base de alimentos (muchos colombianos) o agrega los tuyos; la app suma calorías y macros del día.
4. **Plan de comidas ejemplo** — un día tipo ajustado a la carga del entreno (descanso / suave / día duro).
5. **Ajuste por día** — sube carbohidratos los días de intervalos, tempo, tirada larga o fútbol; los baja en descanso.
6. **Hidratación** — meta de agua diaria y recordatorios.

### El entrenador 🏃‍♀️
1. **Tus ritmos** — calcula tus zonas de ritmo (fácil, umbral, VO2máx, velocidad) desde tu 5k actual, y el ritmo del reto (4:00/km).
2. **Plan semanal automático** — arma tu semana **alrededor de tus días de gym y fútbol**, respetando la recuperación (nunca dos días duros seguidos; nada de calidad justo antes o después del partido).
3. **Sesiones detalladas** — intervalos, tempo y tirada larga con calentamiento, ritmos y consejos.
4. **Periodización** — cambia el enfoque según cuánto falte para tu reto (base → VO2máx → específica → afinamiento).
5. **Test de 5k y proyección** — registra tus tests y mira tu avance real hacia el sub-20.

### El coach diario 🤖
Combina todo: te dice **qué entrenar hoy**, **qué comer hoy**, cuánta agua, y genera **alertas inteligentes** (proteína pendiente, carbos en día duro, ritmo de pérdida de peso, toca test de 5k, etc.).

## 📲 Cómo instalarla en tu teléfono

**Opción A — GitHub Pages:**
1. En el repo: **Settings → Pages**.
2. En *Build and deployment → Source*, elige **GitHub Actions**.
3. Publica la app (ver `.github/workflows/pages.yml`) y copia la URL.
4. Ábrela en tu teléfono:
   - **Android/Chrome:** menú ⋮ → *Agregar a pantalla de inicio*.
   - **iPhone/Safari:** compartir ⬆️ → *Agregar a inicio*.

**Opción B — probar en tu computador:**
```bash
python3 -m http.server 8000
# abre http://localhost:8000
```
> Ábrela con un servidor (no con `file://`) para que funcione el modo offline (service worker).

**Opción C — archivo único:** `dist/rayada-standalone.html` es toda la app en un solo archivo; ábrelo directamente en cualquier navegador.

## 🗂️ Estructura

```
index.html              # shell de la app
manifest.webmanifest    # metadatos PWA (instalable)
sw.js                   # service worker (funciona offline)
css/styles.css          # diseño mobile-first, tema oscuro
js/
  format.js             # formato de fechas, tiempo y ritmo (min/km)
  store.js              # datos locales (localStorage)
  nutrition.js          # el nutricionista: calorías, macros y alimentos
  training.js           # el entrenador: ritmos y plan semanal
  coach.js              # el coach diario que combina todo
  app.js                # interfaz, navegación, onboarding y formularios
icons/                  # iconos del PWA (generados)
scripts/make-icons.js       # regenera los iconos PNG (node, sin dependencias)
scripts/build-standalone.js # genera dist/rayada-standalone.html
```

## 🔧 Regenerar iconos / build

```bash
node scripts/make-icons.js
node scripts/build-standalone.js
```

## 💾 Copia de seguridad

Como todo vive en tu teléfono, en **⚙️ Ajustes** puedes **Exportar** una copia (`.json`) e **Importar**la en otro dispositivo, o **borrar todo**.

## 🧭 Sin dependencias

No usa frameworks ni `npm install`. Es HTML + CSS + JavaScript puro: carga rápido y funciona en cualquier navegador moderno.

---

> ⚠️ **Nota:** Rayada es una herramienta de apoyo, no reemplaza el consejo de un profesional de la salud. Ante lesiones, condiciones médicas o dudas sobre tu alimentación, consulta a un médico o nutricionista.
