# Marlowee Inspector — V2 Tasks

Tareas extraídas del `MVP_TECHNICAL_PLAN.md` que quedan fuera del MVP actual.

**Leyenda:** `[x]` hecho · `[ ]` pendiente · `[-]` fuera de scope v2

Cada ítem incluye: **qué** hacer, **dónde** en el repo, y **criterio** para darlo por completo.

---

## 1. Persistencia: SQLite local (sin Postgres)

Solo SQLite con Drizzle ORM. Nada de Postgres, Neon, Supabase ni Azure Flexible Server.

- [x] **1.1** Instalar `drizzle-orm`, `better-sqlite3`, `drizzle-kit`
  - **Qué:** Dependencias para ORM, driver SQLite nativo y CLI de migraciones.
  - **Dónde:** `package.json` — `drizzle-orm`, `better-sqlite3`; dev: `drizzle-kit`, `@types/better-sqlite3`.
  - **Notas:** `better-sqlite3` está en `pnpm.onlyBuiltDependencies` porque compila bindings nativos.
  - **Criterio:** `pnpm install` sin errores de compilación.

- [x] **1.2** Crear `drizzle.config.ts`
  - **Qué:** Configuración de drizzle-kit apuntando al schema y al archivo `.db` local.
  - **Dónde:** `drizzle.config.ts` — dialect `sqlite`, schema `./src/lib/db/schema.ts`, url `./data/marlowee.db`.
  - **Criterio:** `pnpm db:push` y `pnpm db:studio` arrancan sin error de config.

- [x] **1.3** Crear `src/lib/db/schema.ts` con las 5 tablas
  - **Qué:** Definir el modelo relacional que reemplaza localStorage/sessionStorage para triage de logs.
  - **Dónde:** `src/lib/db/schema.ts`
  - **Tablas:**
    - [x] `**test_sessions**` — sesiones de prueba QA (`id`, `name`, `status` active|stopped, `started_at`, `stopped_at`, timestamps).
    - [x] `**issue_fingerprints**` — estado de un patrón de error (`fingerprint` PK, `status` open|investigating|resolved|suppressed|hidden, `app`, `level`, `label`, `endpoint`, `status_code`).
    - [x] `**log_annotations**` — notas en logs o issues (`target` log|issue, `target_id`, `fingerprint`, `log_id`, `text`, `author`).
    - [x] `**suppress_rules**` — reglas de supresión por patrón (`pattern`, filtros opcionales `app`/`level`/`endpoint`, `reason`, `created_by`).
    - [x] `**audit_events**` — eventos de auditoría (`type`, `actor`, `oid`, `role`, `app`, `search`, `row_count`, `test_session_id`, `details` JSON).
  - **Criterio:** Schema exporta las 5 tablas; `drizzle-kit push` las crea en SQLite.

- [x] **1.4** Agregar tabla adicional `hidden_logs`
  - **Qué:** Ocultar entradas individuales por `logId` (no por fingerprint completo).
  - **Dónde:** `hidden_logs` en `schema.ts` — PK `log_id`, FK lógica a `fingerprint`, `app`, `level`, `label`.
  - **Por qué:** Un issue puede tener muchos logs; ocultar uno no debe ocultar todo el fingerprint.
  - **Criterio:** `hideLogEntry` / `reopenLogEntry` en repository persisten filas aquí.

- [x] **1.5** Crear `src/lib/db/client.ts`
  - **Qué:** Singleton de conexión SQLite con WAL y foreign keys.
  - **Dónde:** `src/lib/db/client.ts` — `createClient()`, `getDb()`, `closeDb()`.
  - **Detalle:** Usa `better-sqlite3` + `drizzle()`; pragma `journal_mode=WAL`, `foreign_keys=ON`.
  - **Criterio:** Primera llamada a `getDb()` crea el archivo y devuelve instancia reutilizable.
  -

- [x] **1.7** Configurar ruta de DB
  - **Qué:** Resolver dónde vive el archivo `.db` según entorno del dev.
  - **Dónde:** `resolveDbPath()` en `client.ts`.
  - **Orden de resolución:** `MARLOWEE_DB_PATH` → `~/.marlowee-inspector/marlowee.db` (si existe) → `./data/marlowee.db`.
  - **Criterio:** DB se crea automáticamente; directorio padre se crea con `mkdirSync` recursivo.
- [x] **1.8** Agregar `/data/` y `*.db` a `.gitignore`
  - **Qué:** Evitar commitear bases de datos locales con datos de triage/audit.
  - **Dónde:** `.gitignore` líneas `/data/` y `*.db`.
  - **Criterio:** `git status` no muestra `data/marlowee.db` tras uso local.
- [x] **1.9** Agregar scripts npm
  - **Qué:** Comandos estándar para schema y exploración de datos.
  - **Dónde:** `package.json` scripts:
    - `db:push` — aplicar schema al SQLite local (desarrollo).
    - `db:generate` — generar migraciones SQL (si se adoptan migraciones versionadas).
    - `db:studio` — UI Drizzle Studio sobre la DB local.
  - **Criterio:** Los tres scripts existen y ejecutan drizzle-kit.
- [x] **1.10** Ejecutar `pnpm db:push` para crear schema local
  - **Qué:** Materializar tablas en disco antes del primer `pnpm dev`.
  - **Comando:** `pnpm db:push` (parte del flujo local documentado abajo).
  - **Criterio:** Existe `data/marlowee.db` con las 6 tablas tras el push.
- [x] **1.11** Crear `src/lib/db/repository.ts`
  - **Qué:** Capa de acceso a datos — todas las mutaciones y lecturas de persistencia.
  - **Dónde:** `src/lib/db/repository.ts`
  - **Funciones principales:** `getIssueStore`, `upsertIssue`, `setIssueStatus`, `addNote`, `getActiveSession`, `createSession`, `updateSession`, `hideLogEntry`, `reopenLogEntry`, `createSuppression`, `createAuditEvent`, `queryAuditEvents`, etc.
  - **Criterio:** Ningún route handler escribe SQL directo; todo pasa por repository.
- [x] **1.12** Migrar lógica de `issues.ts` → `repository.ts`
  - **Qué:** Mover persistencia fuera de funciones puras de dominio.
  - **Dónde:** `issues.ts` conserva tipos, fingerprinting, merge de store en memoria; `repository.ts` hace I/O.
  - **Antes:** `loadIssueStore()` / `saveIssueStore()` serializaban a `localStorage`.
  - **Criterio:** `issues.ts` no importa `localStorage` ni escribe estado.
- [x] **1.13** Crear `src/lib/api.ts`
  - **Qué:** Cliente HTTP del frontend hacia los route handlers de persistencia.
  - **Dónde:** `src/lib/api.ts` — `fetchStoreInit`, `setIssueStatusApi`, `upsertIssueApi`, `addNoteApi`, `createSessionApi`, `updateSessionApi`, `hideLogEntryApi`, `reopenLogEntryApi`.
  - **Criterio:** `logs-view.tsx` importa desde aquí, no hace `fetch()` ad-hoc disperso.
- [x] **1.14** Crear endpoints REST
  - **Qué:** Route handlers Next.js App Router para CRUD; todos requieren sesión (`auth()`).
  - **Endpoints:**
    - [x] `**GET /api/store/init**` — `src/app/api/store/init/route.ts`. Devuelve issues + hidden + notes + activeSession + suppressions en una sola carga inicial.
    - [x] `**GET`, `POST /api/issues**` — listar / upsert fingerprint.
    - [x] `**GET`, `PATCH /api/issues/:fingerprint**` — leer / cambiar status (open → resolved, etc.).
    - [x] `**GET`, `POST /api/annotations**` — notas por log o issue.
    - [x] `**GET`, `POST /api/hidden**` — listar / ocultar log individual.
    - [x] `**DELETE /api/hidden/:logId**` — reabrir log oculto.
    - [x] `**GET`, `POST /api/sessions**` — listar / crear test session.
    - [x] `**PATCH /api/sessions/:id**` — renombrar o detener session (`stoppedAt`).
    - [x] `**GET`, `POST /api/suppressions**` — reglas de supresión.
    - [x] `**DELETE /api/suppressions/:id**` — eliminar regla.
    - [x] `**GET /api/audit**` — `src/app/api/audit/route.ts`. Solo rol `Admin` (`highestRole` === Admin). Query params: `type`, `actor`, `limit`.
  - **Criterio:** Cada ruta responde 401 sin sesión; audit responde 403 si no es Admin.
- [x] **1.15** Migrar `logs-view.tsx`
  - **Qué:** Cargar estado inicial y mutaciones vía API en lugar de storage del browser.
  - **Dónde:** `src/components/logs/logs-view.tsx` — `fetchStoreInit()` en mount; handlers llaman `setIssueStatusApi`, `hideLogEntryApi`, etc.
  - **Criterio:** Refrescar página conserva issues, notas, sessions y hidden logs.
- [x] **1.16** Eliminar `loadIssueStore` / `saveIssueStore` de `issues.ts`
  - **Qué:** Remover persistencia client-side del issue store.
  - **Dónde:** `src/lib/issues.ts` — solo tipos + funciones puras (`fingerprintFor`, `mergeIssueStore`, etc.).
  - **Criterio:** `grep localStorage issues.ts` sin resultados.
- [x] **1.17** Eliminar `loadTestSession` / `saveTestSession` de `test-session.ts`
  - **Qué:** Test sessions viven en SQLite, no en sessionStorage.
  - **Dónde:** `src/lib/test-session.ts` — solo `createTestSession`, `stopTestSession`, `sessionTimeWindow`, `formatSessionDuration`.
  - **Criterio:** `grep sessionStorage test-session.ts` sin resultados.
- [x] **1.18** Actualizar `test-session-bar.tsx`
  - **Qué:** UI de session delega create/stop/rename al parent que llama la API.
  - **Dónde:** `src/components/logs/test-session-bar.tsx` — props `onStart`, `onStop`, `onRename`; sin writes locales.
  - **Criterio:** Iniciar/detener session persiste tras reload.

- [x] **1.22** Verificar build
  - **Qué:** CI local mínimo antes de merge.
  - **Comandos:** `pnpm typecheck`, `pnpm build`, `pnpm test`.
  - **Criterio:** Los tres exit code 0 (tests actuales: `src/lib/masking.test.ts`).

---

## 2. Auth y seguridad (local dev)

Cada dev necesita **login en Marlowee** (Entra ID o bypass local) + `**az login`\*\* para leer Log Analytics. El navegador nunca recibe credenciales Azure.

- [x] **2.1** Definir App Roles en código
  - **Qué:** Enum de roles y ranking para resolver el rol efectivo del token.
  - **Dónde:** `src/lib/authz.ts` — `Role`, `ROLE_RANK`, `highestRole()`.
  - **Roles:** Admin, Developer, QA, Support, Viewer (5 niveles).
  - **Criterio:** Token con `["QA", "Viewer"]` resuelve a QA (el más alto).

- [x] **2.2** Implementar matriz de permisos por rol
  - **Qué:** Capabilities por rol: apps permitidas, raw mode, rango máximo, rate limit.
  - **Dónde:** `CAPABILITIES` en `src/lib/authz.ts`.
  - **Ejemplos:** Admin ve las 4 apps + raw; Viewer solo `ca-dashboard` + max 1h; Developer sin `ca-admin`.
  - **Helpers:** `capabilitiesFor()`, `canReadApp()`, `clampRange()`.
  - **Criterio:** `/api/logs?app=ca-admin` retorna 403 para Developer.

- [x] **2.3** Configurar Auth.js + middleware
  - **Qué:** Sesión JWT con claim `roles` y `oid` expuestos al backend.
  - **Dónde:** `src/auth.ts`, `src/middleware.ts`, `src/app/api/auth/[...nextauth]/route.ts`.
  - **Dev bypass:** Si `AUTH_MICROSOFT_ENTRA_ID_ID` está vacío → provider Credentials one-click; rol vía `AUTH_DEV_ROLE` (default Admin).
  - **Prod path:** Microsoft Entra ID OIDC; roles del App Registration en claim `roles`.
  - **Criterio:** Sin sesión, rutas protegidas redirigen a `/login`.

- [x] **2.4** Rate limit in-memory por usuario
  - **Qué:** Fixed-window 60s por oid/email, límite según rol.
  - **Dónde:** `src/lib/rate-limit.ts` — `rateLimit(key, limitPerMinute)`.
  - **Integración:** Route handlers de logs leen `caps.rateLimitPerMinute`; responden 429 + `Retry-After`.
  - **Limitación:** Map en memoria — no sobrevive restart ni escala horizontal (ver §4).
  - **Criterio:** Exceder límite audita `rate_limited` y devuelve 429.
  -

---

## 3. Copy raw / Copy for AI

- [x] **3.1** Botones client-side en `LogDetailPanel`
  - **Qué:** Copiar al clipboard sin round-trip al servidor.
  - **Dónde:** `src/components/logs/log-detail-panel.tsx` — `copyText()` vía `navigator.clipboard`.
  - **Variantes:** "Copy message", "Copy KQL", "Copy raw" (`details.formattedRaw`), "Copy for AI" (`toLogAiBrief()` de `src/lib/log-ai-brief.ts`).
  - **Limitación:** No registra audit server-side; datos ya llegaron masked al cliente (excepto Admin raw mode).
  - **Criterio:** Click copia texto correcto; feedback "Copied" 2s.

- [ ] **3.2** Crear `POST /api/logs/copy`
  - **Qué:** Endpoint server-side que re-aplica masking, audita y devuelve texto seguro.
  - **Dónde:** Nuevo `src/app/api/logs/copy/route.ts`.
  - **Body:** `{ logId, variant: "raw" | "ai" }`.
  - **Flujo:** auth → canReadApp → fetch log o reconstruir desde payload → `maskLogEntry()` → audit type `raw_copied` → response text/plain.
  - **Criterio:** Admin/non-Admin reciben mismo masking; evento en `audit_events`.

- [ ] **3.3** Conectar botones al endpoint server-side
  - **Qué:** Reemplazar `navigator.clipboard` directo por fetch + clipboard del response.
  - **Dónde:** `log-detail-panel.tsx` — llamar API antes de copiar.
  - **Criterio:** Cada copy genera fila audit; funciona sin raw en memoria del cliente.

---

## 4. Rate limiting distribuido

- [x] **4.1** Rate limit in-memory (MVP)
  - **Qué:** Implementación actual — ver **2.4**.
  - **Adecuado para:** Single instance local o un solo replica en Container App.
  -

---

## 5. Audit durable

- [x] **5.1** Escribir audit a `audit_events` en SQLite
  - **Qué:** Persistir cada evento además de imprimirlo.
  - **Dónde:** `src/lib/audit.ts` → `createAuditEvent()` en repository.
  - **Tipos actuales:** `search`, `raw_search`, `rate_limited`, `denied`.
  - **Campos:** actor, oid, role, app, search, rowCount, testSessionId, details JSON.
  - **Criterio:** Buscar logs genera fila en `audit_events` consultable.

- [x] **5.2** Mirror a stdout JSON
  - **Qué:** `console.log(JSON.stringify({ kind: "marlowee-inspector.audit", ... }))`.
  - **Por qué:** En Container App, stdout cae en `ContainerAppConsoleLogs_CL` — backup sin depender solo de SQLite local.
  - **Criterio:** Línea JSON aparece en terminal dev al buscar logs.

- [x] **5.3** Crear `GET /api/audit`
  - **Qué:** API read-only para admins.
  - **Dónde:** `src/app/api/audit/route.ts`.
  - **Authz:** `highestRole(session.user.roles) === "Admin"` → else 403.
  - **Filtros:** `type`, `actor`, `limit` (default 100).
  - **Criterio:** Admin obtiene JSON array; Developer recibe 403.

- [ ] **5.4** UI de auditoría para Admin
  - **Qué:** Página o panel para explorar eventos sin SQL manual.
  - **Dónde sugerido:** `src/app/audit/page.tsx` o tab en logs header.
  - **Features:** Tabla paginada, filtros actor/tipo/fecha, export CSV.
  - **Consume:** `GET /api/audit` con query params.
  - **Criterio:** Admin filtra búsquedas de un usuario en UI.

---

## 6. Multi-workspace

Hoy solo `law-savvly-dev-main` (`e583009c-5c01-4d42-a46a-3c771e087f5d`). Workspace ID viene de `AZURE_LOG_ANALYTICS_WORKSPACE_ID`.

- [ ] **6.1** Workspace staging
  - **Qué:** Soporte lectura de `law-savvly-dev-ta`.
  - **Dónde:** Config multi-workspace (env o DB), `src/lib/log-analytics.ts`.
  - **Authz:** Solo roles con permiso explícito (ej. QA+ staging, Admin all).

- [ ] **6.2** Workspace producción
  - **Qué:** Soporte `workspace-rgsavvlyshareds8yX`.
  - **Authz:** Muy restrictivo — probablemente Admin/Support only; nunca Developer por defecto.

- [ ] **6.3** Selector de workspace en UI
  - **Qué:** Dropdown en header junto al app selector.
  - **Dónde:** `src/components/logs/logs-header.tsx` (hoy muestra workspace fijo).
  - **Criterio:** Cambiar workspace refetch logs con otro `workspaceId`.

- [ ] **6.4** Workspace-scoped authz
  - **Qué:** Extender `CAPABILITIES` con `workspaces: string[]` por rol.
  - **Ejemplo:** Developer → dev only; Admin → dev + staging + prod.
  - **Criterio:** Request a workspace no autorizado → 403 + audit `denied`.

---

## 7. App Insights / structured data

El workspace actual solo tiene `ContainerAppConsoleLogs_CL` y `ContainerAppSystemLogs_CL` — no `AppRequests` ni `AppExceptions`.

- [ ] **7.1** Conectar App Insights al workspace
  - **Qué:** Ops/Azure — diagnostic settings desde cada Container App hacia Log Analytics.
  - **Bloqueo:** Requiere cambio infra fuera de este repo.

- [ ] **7.2** Agregar tablas structured
  - **Qué:** Queries KQL sobre `AppRequests`, `AppExceptions`, `traces`.
  - **Dónde:** Nuevas funciones en `src/lib/queries.ts` + tipos en `src/lib/types.ts`.
  - **Criterio:** Vista "Failed requests" usa columna `ResultCode`, no regex sobre `Log_s`.

- [ ] **7.3** Vistas estructuradas
  - **Qué:** UI dedicada para requests/exceptions con columnas tipadas (duration, operationId, exception type).
  - **Reemplaza:** Heurísticas actuales en `src/lib/log-details.ts`.

---

## 8. Parsers por app

Cada container app loguea distinto (JSON vs plain text). Hoy el nivel se infiere con heurística `has_any` en KQL.

- [ ] **8.1** Parsers por container app
  - **Qué:** Módulo por app: `ca-data-api`, `ca-dashboard`, `ca-onboarding`, `ca-admin`.
  - **Dónde sugerido:** `src/lib/parsers/ca-data-api.ts`, etc.; registry en `src/lib/log-details.ts`.
  - **Extrae:** HTTP method/path/status, trace IDs, campos JSON anidados.
  - **Criterio:** Mismo log parseado distinto según `entry.app`.

- [ ] **8.2** Mejorar detección de nivel
  - **Qué:** Clasificación ERROR/WARN/INFO/LOG más allá de substring en `Log_s`.
  - **Dónde:** `src/lib/queries.ts` (KQL) y/o post-proceso en parser.
  - **Criterio:** Reducir falsos WARN en logs JSON con campo `level` explícito.

---

## 9. Alertas y búsquedas guardadas

- [ ] **9.1** UI reglas de alerta
  - **Qué:** Crear reglas tipo "si ERROR contiene X en app Y → alertar".
  - **Persistencia:** Nueva tabla o extender `suppress_rules` con flag `alert=true`.
  - **Ejecución:** Job periódico (cron Container App o Azure Function) que corre KQL.

- [ ] **9.2** Búsquedas guardadas por usuario
  - **Qué:** Guardar combinación app + search + level + range + errorsOnly.
  - **Dónde:** Tabla `saved_searches` (user oid, name, params JSON).
  - **UI:** Dropdown "Saved" en `log-search-bar.tsx`.

- [ ] **9.3** Notificaciones
  - **Qué:** Slack webhook o email cuando alerta dispara.
  - **Integración:** Azure Logic Apps, SendGrid, o Slack incoming webhook.
  - **Criterio:** Alerta de prueba llega al canal configurado.

---

## 14. Vistas de sidebar (navegación principal)

Hoy `LogsSidebar` (`src/components/logs/logs-sidebar.tsx`) renderiza **13 ítems** en 4 secciones, pero los botones son estáticos (`active: false` salvo "Live Logs") y **no cambian el contenido** del área principal. Solo existe la vista de Live Logs en `logs-view.tsx`. El panel derecho `RecentSignalsPanel` muestra un **preview** de triage, no vistas dedicadas.

**Objetivo:** Cada ítem del sidebar abre una **vista full-page** en el área principal (entre sidebar y panel derecho opcional), con routing, estado activo y layout compartido.

### Infraestructura de navegación

- [ ] **14.0** Wiring de navegación sidebar → vistas
  - **Qué:** Conectar clicks del sidebar a vistas reales; una sola fuente de verdad para el ítem activo.
  - **Dónde:**
    - `src/components/logs/logs-sidebar.tsx` — exportar `SidebarView` type + `NAV_SECTIONS` con `id` por ítem.
    - `src/components/logs/logs-shell.tsx` (nuevo) — layout: sidebar + `<main>` dinámico + panel derecho opcional.
    - `src/app/logs/page.tsx` — pasar props de auth al shell.
  - **Opciones de routing:**
    - Query param: `/logs?view=issues` (mínimo cambio, sin nuevas rutas).
    - O rutas App Router: `/logs/issues`, `/logs/sessions`, etc.
  - **Estado activo:** `aria-current="page"` + clase `sidebar-nav-item-active` según vista actual.
  - **Authz:** Ocultar ítems Settings (Audit, Access) si rol ≠ Admin; deshabilitar Sources no permitidas por `capabilitiesFor()`.
  - **Criterio:** Click en cualquier ítem cambia el main content; URL refleja la vista; refresh conserva vista.

---

### Monitor

- [ ] **14.1** Vista **Overview**
  - **Sidebar:** Monitor → Overview (`Layers`)
  - **Qué lleva la vista:** Dashboard de salud del workspace en la ventana de tiempo seleccionada.
  - **Contenido:**
    - KPI cards agregados (total logs, errors, warnings, error rate %) — reutilizar/extender `LogsSummaryCards`.
    - Sparklines por app (`/api/logs/metrics`) para las apps permitidas por rol.
    - Top 5 error patterns cross-app (mismo dato que `RecentSignalsPanel` → Error patterns, pero full width).
    - Lista compacta "Apps with errors" con link a Live Logs filtrado por app.
    - Banner workspace: `law-savvly-dev-main`, retention 30d, última sync.
  - **APIs:** `GET /api/logs/summary`, `GET /api/logs/metrics` (multi-app o iteración por `allowedApps`).
  - **Criterio:** Overview carga sin tabla de logs; cards reflejan últimos 24h (o rango global del header).

- [x] **14.2** Vista **Live Logs** _(parcial — vista actual)_
  - **Sidebar:** Monitor → Live Logs (`Radio`) — único ítem funcional hoy.
  - **Qué lleva la vista:** Stream en tiempo real de logs de consola con filtros y triage inline.
  - **Contenido actual:**
    - `LogsHeader` — refresh, live toggle, masked indicator.
    - `TestSessionBar` — session activa, filtros requestId / testSessionId.
    - `LogsSummaryCards` — métricas de la ventana filtrada.
    - `LogFilters` — app, search, level, stream (console/system), time range.
    - `LogsTable` — filas virtualizadas, click abre `LogDetailPanel`.
    - `RecentSignalsPanel` (derecha) — preview watchdog.
    - `LogDetailPanel` (drawer) — detalle, notas, hide, issue status, copy.
  - **Pendiente en esta vista:** Extraer de `logs-view.tsx` a `live-logs-view.tsx`; sidebar marca Live Logs activo vía routing (14.0).
  - **Criterio:** Comportamiento idéntico al actual tras refactor; live polling 15s cuando session activa.

- [ ] **14.3** Vista **Test Sessions**
  - **Sidebar:** Monitor → Test Sessions (`ListChecks`)
  - **Qué lleva la vista:** CRUD e historial de sesiones QA — hoy solo se gestiona la session activa en `TestSessionBar`.
  - **Contenido:**
    - Tabla/lista de todas las sessions (`GET /api/sessions`): nombre, status, started/stopped, duración.
    - Botones: **New session**, **Resume** (set active), **Stop**, **Rename**.
    - Session activa destacada; al resume, navegar a Live Logs con esa session cargada.
    - Detalle expandible: conteo de logs capturados en ventana, link "View logs in session".
    - Empty state: "No test sessions yet — start one from here or Live Logs."
  - **APIs:** `GET/POST /api/sessions`, `PATCH /api/sessions/:id`; datos ya en SQLite.
  - **Criterio:** Crear/detener/renombrar session desde esta vista; persiste tras refresh.

- [ ] **14.4** Vista **Search**
  - **Sidebar:** Monitor → Search (`Search`)
  - **Qué lleva la vista:** Búsqueda avanzada y KQL — más allá del search box inline de Live Logs.
  - **Contenido:**
    - Barra de búsqueda grande con hints (mismo estilo que `log-search-bar.tsx`).
    - Filtros: app, level, range, errors only, stream (console/system).
    - Preview KQL generado (`kqlFromFilters` / `src/lib/log-kql.ts`) — copy-paste a Log Analytics.
    - Botón **Run search** → resultados en tabla (misma `LogsTable` o variante).
    - Historial de búsquedas recientes en sesión (local state; persistir en §9.2 saved searches).
    - (Futuro) Búsquedas guardadas por usuario.
  - **APIs:** `GET /api/logs` con params actuales.
  - **Criterio:** Search independiente de Live Logs; no requiere live polling activo.

---

### Triage

Datos desde SQLite vía `/api/store/init` + funciones en `src/lib/issues.ts`. Hoy parte de esto aparece como preview en `RecentSignalsPanel`.

- [ ] **14.5** Vista **Issues**
  - **Sidebar:** Triage → Issues (`FileSearch`)
  - **Qué lleva la vista:** Cola de trabajo — fingerprints con status `open` o `investigating`.
  - **Contenido:**
    - Tabla: label, app, level, count (logs matching), last seen, status badge, notas count.
    - Filtros: app, level, status (open / investigating).
    - Acciones por fila: Set investigating, Resolve, Suppress, Open sample log → `LogDetailPanel`.
    - Orden default: más reciente `updatedAt` primero (`collectManagedIssues` filtrado).
    - Summary header: "N open · M investigating".
  - **APIs:** store init + `PATCH /api/issues/:fingerprint`.
  - **Criterio:** Solo issues activos; acciones actualizan SQLite y refrescan lista.

- [ ] **14.6** Vista **Resolved**
  - **Sidebar:** Triage → Resolved (`Archive`)
  - **Qué lleva la vista:** Issues cerrados — status `resolved`.
  - **Contenido:**
    - Tabla: label, app, resolved at (`updatedAt`), count histórico, author de última nota.
    - Acción: **Reopen** → status `open`.
    - Filtro por app y rango de fecha de resolución.
    - Empty state: "No resolved issues — good signal."
  - **Datos:** `issue_fingerprints` where status = resolved; preview hoy en `RecentSignalsPanel` → Resolved issues (max 6).
  - **Criterio:** Vista full-page reemplaza preview del panel derecho para este flujo.

- [ ] **14.7** Vista **Hidden / Suppressed**
  - **Sidebar:** Triage → Hidden / Suppressed (`EyeOff`)
  - **Qué lleva la vista:** Todo lo oculto o suprimido — dos tabs.
  - **Contenido tab Hidden logs:**
    - Lista de `hidden_logs`: logId, label, app, fingerprint, hidden at.
    - Acción: **Reopen** → `DELETE /api/hidden/:logId`.
  - **Contenido tab Suppressed issues:**
    - Lista de fingerprints status `suppressed` + reglas en `suppress_rules`.
    - Acción: **Unsuppress** → PATCH status `open`; opcional eliminar regla.
  - **Nota:** Hidden es por logId; suppressed es por fingerprint/patrón — no mezclar en una sola lista.
  - **Criterio:** Tabs con contadores; reopen/unsuppress refleja en Live Logs (logs vuelven a aparecer).

- [ ] **14.8** Vista **Notes**
  - **Sidebar:** Triage → Notes (`MessageSquareText`)
  - **Qué lleva la vista:** Historial completo de anotaciones — hoy solo preview en `RecentSignalsPanel` → Notes history.
  - **Contenido:**
    - Feed cronológico de `log_annotations`: target (log|issue), texto, author, timestamp, fingerprint.
    - Filtros: target type, app (via fingerprint), búsqueda en texto.
    - Click nota → abre log/issue relacionado en `LogDetailPanel`.
    - Acción: agregar nota rápida ligada a fingerprint/issue desde esta vista.
  - **APIs:** `GET/POST /api/annotations`.
  - **Criterio:** Paginación o scroll infinito; no límite de 6–20 items como el preview.

---

### Sources

- [ ] **14.9** Vista **Container Apps**
  - **Sidebar:** Sources → Container Apps (`Server`)
  - **Qué lleva la vista:** Catálogo de apps monitoreadas y acceso por rol.
  - **Contenido:**
    - Cards por app: `ca-data-api`, `ca-dashboard`, `ca-onboarding`, `ca-admin`.
    - Por card: allowed sí/no (según rol), error count 24h, link "View logs" → Live Logs con app preseleccionada.
    - Admin ve las 4; Developer ve 3 (sin admin); etc. — alineado con `CAPABILITIES` en `authz.ts`.
    - Metadata: revision reciente, environment `aca-env-savvly-dev-main` (estático por ahora).
  - **APIs:** summary/metrics por app.
  - **Criterio:** Apps no permitidas aparecen disabled con tooltip "Not authorized".

- [ ] **14.10** Vista **System Logs**
  - **Sidebar:** Sources → System Logs (`ScrollText`)
  - **Qué lleva la vista:** Logs de plataforma ACA — tabla `ContainerAppSystemLogs_CL`, no console stdout.
  - **Contenido:**
    - Misma UX que Live Logs pero `stream=system` fijo en `LogFilters`.
    - Filtros: app, level, range, search.
    - `LogsTable` con columnas adaptadas (event type, reason, replica — según campos KQL).
    - Sin test session mode (system logs no ligados a QA flow) o session opcional deshabilitada.
  - **APIs:** `GET /api/logs?stream=system` (param ya existe en `LogFilters` / queries).
  - **Criterio:** Vista separada de Live Logs; sidebar System Logs no mezcla console + system.

---

### Settings

Role-gated: **Admin** para Audit y Masking; **Access** visible según rol (Admin ve matriz completa).

- [ ] **14.11** Vista **Access**
  - **Sidebar:** Settings → Access (`KeyRound`)
  - **Qué lleva la vista:** Permisos efectivos del usuario y matriz de roles (read-only).
  - **Contenido:**
    - Card "Your access": email, oid, rol efectivo, apps permitidas, max range, rate limit/min.
    - Tabla matriz rol → capabilities (de `CAPABILITIES` en `authz.ts`) — referencia para devs.
    - Indicador dev bypass vs Entra real (`AUTH_MICROSOFT_ENTRA_ID_ID` configurado o no).
    - Link docs: `az login` requerido para Log Analytics local.
  - **Sin mutaciones** — authz es código + Entra ops (§2.5–2.7, §12).
  - **Criterio:** Usuario ve exactamente qué apps puede leer; no expone secrets.

- [ ] **14.12** Vista **Masking Rules**
  - **Sidebar:** Settings → Masking Rules (`ShieldCheck`)
  - **Qué lleva la vista:** Reglas de redacción server-side — hoy solo en código.
  - **Contenido:**
    - Lista read-only de reglas en `src/lib/masking.ts` (nombre, descripción, regex pattern sanitizado).
    - Ejemplos before/after por regla (authorization, JWT, email, phone, etc.).
    - Nota: "Masking always server-side; no raw bypass except Admin audited raw mode."
    - (Futuro) Toggle enable/disable por regla en DB — fuera de v2 inicial.
  - **Admin only** (opcional: Developer read-only).
  - **Criterio:** Documentación viva de qué se redacta; enlaza a `masking.test.ts` cases.

- [ ] **14.13** Vista **Audit Log**
  - **Sidebar:** Settings → Audit Log (`FileText`)
  - **Qué lleva la vista:** UI para §5.4 — explorar `audit_events`.
  - **Contenido:**
    - Tabla paginada: timestamp, type, actor, role, app, search snippet, rowCount.
    - Filtros: type (`search`, `rate_limited`, `denied`, …), actor, rango fechas.
    - Expand row → `details` JSON.
    - Export CSV (opcional, ligado a §10.1).
  - **APIs:** `GET /api/audit` — ya implementado, Admin only.
  - **Authz:** 403 → redirect o empty state "Admin only".
  - **Criterio:** Admin ve búsquedas auditadas de otros usuarios; Developer no accede.

---

### Resumen de vistas

| #     | Sidebar             | Vista                     | Estado      | Panel derecho      |
| ----- | ------------------- | ------------------------- | ----------- | ------------------ |
| 14.1  | Overview            | Dashboard KPIs + patterns | [ ]         | Opcional (signals) |
| 14.2  | Live Logs           | Stream + filtros + detail | [x] parcial | RecentSignalsPanel |
| 14.3  | Test Sessions       | CRUD sessions             | [ ]         | No                 |
| 14.4  | Search              | Búsqueda avanzada + KQL   | [ ]         | No                 |
| 14.5  | Issues              | Cola open/investigating   | [ ]         | Detail on select   |
| 14.6  | Resolved            | Issues resueltos          | [ ]         | No                 |
| 14.7  | Hidden / Suppressed | Tabs hidden + suppressed  | [ ]         | No                 |
| 14.8  | Notes               | Feed de anotaciones       | [ ]         | No                 |
| 14.9  | Container Apps      | Catálogo apps + acceso    | [ ]         | No                 |
| 14.10 | System Logs         | ContainerAppSystemLogs_CL | [ ]         | Opcional           |
| 14.11 | Access              | Permisos efectivos        | [ ]         | No                 |
| 14.12 | Masking Rules       | Reglas redacción          | [ ]         | No                 |
| 14.13 | Audit Log           | Eventos audit_events      | [ ]         | No                 |
