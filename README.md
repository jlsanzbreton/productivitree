# Productivitree

Productivitree is a visual project-management app for creators and entrepreneurs.

## Core metaphor
- Roots: core values and purpose.
- Trunk: education, skills, and expertise.
- Branches: active projects.
- Leaves: project stages/tasks.

## Principles
- Functionality before noise.
- Beauty with intent, not decoration-only.
- Balanced focus (Gray Zones): motivating feedback without addictive pressure loops.
- Privacy-first local mode by default.

## Local development
1. `npm install`
2. `npm run dev`

## App de Mac (Tauri)
La misma app, empaquetada para el Mac. Añade lo que una pestaña del navegador no puede hacer:
- **Datos en un archivo local**: `~/Library/Application Support/app.productivitree.desktop/productivitree.json`
  (con una copia de la versión anterior al lado). Nada sale del Mac.
- **Enlaces de actividad** `productivitree://actividad?rama=…&tarea=…&app=…` que cualquier app
  (o un Atajo de Apple) puede abrir para anotar trabajo.
- **Riego manual con ⌃⌥R** desde cualquier app: abre «¿En qué has trabajado?».
- Cerrar la ventana no cierra la app (el atajo y los enlaces siguen funcionando); ⌘Q la cierra.

Requisitos: Rust (`rustup`) y las herramientas de Xcode, como en Memorice y Cue.
1. `npm install`
2. `npm run mac:dev` para probarla, o `npm run mac:build` para crear `Productivitree.app` y el `.dmg`
   en `src-tauri/target/release/bundle/`.

### Fuentes automáticas (Ajustes → Tus apps → Conectar una app)
- **YouTube**: pon el ID del canal (UC…). Cada 15 minutos la app lee su lista pública de vídeos y cada
  vídeo nuevo aparece como fruto recogido en la rama marcada. Sin claves.
- **Writer's Lens**: crea `.env.local` a partir de `.env.example` con la URL y la clave publicable del
  proyecto de Supabase de Writer's Lens. En Supabase → Authentication → URL Configuration añade
  `productivitree://auth` a *Redirect URLs*. Luego, en el asistente, «Conectar con GitHub». Cada 15
  minutos se mira qué secciones cambiaron (solo nombres y huella del texto, nunca el texto) y se riega
  la hoja del proyecto. La primera vez pregunta «¿Estabas con…?» y puede recordarlo.

Los enlaces `productivitree://` solo funcionan con la app construida e instalada (macOS los asocia al
abrirla una vez desde Aplicaciones). Para pasar tu árbol del navegador a la app: Ajustes → Copias de
seguridad → descarga la copia en la web y restáurala en la app.

## Quality gates
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run test:integration`
- `npm run check`
- `cd src-tauri && cargo test` (app de Mac)

## Netlify deployment
- Config is in `netlify.toml`.
- Server function for AI passion test is in `netlify/functions/passion-test.js`.
- Deployment runbook: `docs/deploy/netlify-early-access.md`.

## Security and compliance notes
- AI analysis is server-side only; client does not carry the Gemini secret.
- User must explicitly consent before passion-test answers are sent.
- Local-only mode is on by default; no analytics by default.
- Tester privacy note: `docs/compliance/tester-privacy-note.md`.
