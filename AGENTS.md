<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Reglas para TODAS las IAs del proyecto (frontend)

Este archivo lo leen Codex (Augusto), Antigravity (Bruno, vía GEMINI.md) y Claude (Lucas).
Es la **única fuente de verdad** sobre cómo se trabaja en este repo. El contexto de negocio está en
`CLAUDE.md` y en el `CLAUDE.md` del repo del backend (cuotas, caja, tótem).

## Cómo se organiza el trabajo

- Claude (con Lucas) coordina: define prioridades y escribe cada tarea como un **Issue de GitHub**
  con un brief (contexto, archivos, qué hacer, tests requeridos, qué NO tocar).
- **Hacé solo lo que pide el Issue.** Nada de refactors, renombres ni rediseños fuera de alcance.
  Si encontrás otro problema, anotalo en el PR (sección "Encontré además") en vez de arreglarlo.
- Si el brief es ambiguo o contradice el código, **preguntá en el Issue antes de inventar**.

## Flujo de Git (obligatorio)

1. Partí siempre de `develop` actualizado: `git checkout develop && git pull`.
2. Una rama por Issue: `feat/<nro>-descripcion-corta` o `fix/<nro>-descripcion-corta`.
3. Commits en español: `tipo(area): descripcion` (tipos: feat, fix, test, refactor, docs, ci, chore).
4. **Nunca** subas directo a `develop` ni a `main`, y nunca uses `--force` sobre ramas compartidas.
   Para traer `develop` a tu rama usá **siempre** `git merge origin/develop` (o `git rebase`) y resolvé los
   conflictos línea por línea. **Nunca copies archivos de una rama encima de otra** para "sincronizar":
   así se perdieron sin aviso el catálogo del buscador de rutinas y los íconos de "Consultar al profesor"
   (commit 90db143). Si el diff de tu PR borra código que no tocaste a propósito, frená y preguntá.
5. Abrí un Pull Request hacia `develop` completando la plantilla. Se mergea solo con el CI en verde
   y la aprobación de otra persona.

## Antes de abrir el PR

```powershell
npm test               # Vitest: todos deben pasar
npx tsc --noEmit       # sin errores de tipos
npm run build          # el build de producción tiene que compilar
```

El CI además corre los **tests E2E con Playwright** (navegador real contra backend + MySQL 8) y
construye la imagen Docker. En local: `scripts/e2e-local.ps1` (ver su encabezado).

## Reglas duras (no negociables)

- **Toda llamada al backend pasa por `lib/api-client.ts`**, y los datos del backend se convierten con
  `lib/api-mappers.ts`. Nada de `fetch` sueltos en las páginas.
- **`lib/store.tsx` es frágil** (2000+ líneas, se está ordenando). Cambiá solo lo que pide el Issue y
  con test. No agregues estado nuevo ahí si puede vivir en la página o en un hook propio.
- **Nunca guardes en el navegador** (`localStorage`/`sessionStorage`) contraseñas, tokens de otros
  usuarios ni datos de socios que no sean del usuario logueado. Las claves viven solo en el servidor.
- **Fechas:** el gimnasio está en Argentina. Usá `lib/date-utils.ts` (`fechaLocalHoy`, etc.), nunca
  `new Date().toISOString().slice(0, 10)` (da el día de Londres después de las 21 h).
- **Todo cambio lleva test:** lógica en `lib/*.test.ts` (Vitest); un flujo de pantalla nuevo o
  modificado, en `e2e/*.spec.ts` (Playwright). Un bug: primero el test que falla.
- **Lo propio de cada gimnasio va a configuración** (`lib/datos-legales.ts`, datos de cobro del
  backend, variables de entorno), nunca fijo en el código: el sistema se va a vender a otros gimnasios.
- **`DECISION PENDIENTE`:** esos comentarios marcan decisiones del equipo. No las resuelvas por tu cuenta.
- **No commitees** `.env*` (salvo `.env.example`), `coverage/`, `playwright-report/`, `test-results/`.

## Estructura

```
app/<ruta>/page.tsx   pantallas (finanzas, alumnos, totem, asistencias, rutinas, planes, privacidad...)
components/           componentes compartidos (app-shell, sidebar, modales, ui/)
lib/                  lógica: store, api-client, api-mappers, tipos, utilidades + sus tests
e2e/                  tests de punta a punta (Playwright); e2e/soporte.ts tiene los atajos
```

## Estilo

- Textos de la interfaz en **español rioplatense con voseo** ("Ingresá", "Guardá").
- Comentarios y commits en español. Seguí el estilo del archivo que tocás; no reformatees código ajeno.
- Botones y campos con texto o `aria-label` claros: los tests E2E los encuentran por ahí.
