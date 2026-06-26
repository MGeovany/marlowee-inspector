# Marlowee Inspector — V2 Tasks

Tareas de la versión 2: herramienta **local interna** — SQLite, triage, sidebar views, audit. Sin deploy público ni multi-workspace.

**Leyenda:** `[x]` hecho · `[ ]` pendiente

Cada ítem incluye: **qué** hacer, **dónde** en el repo, y **criterio** para darlo por completo.

> Backlog **V3 (app pública)** al final del documento.

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
    - [x] `test_sessions` — sesiones de prueba QA (`id`, `name`, `status` active|stopped, `started_at`, `stopped_at`, timestamps).
    - [x] `issue_fingerprints` — estado de un patrón de error (`fingerprint` PK, `status` open|investigating|resolved|suppressed|hidden, `app`, `level`, `label`, `endpoint`, `status_code`).
    - [x] `log_annotations` — notas en logs o issues (`target` log|issue, `target_id`, `fingerprint`, `log_id`, `text`, `author`).
    - [x] `suppress_rules` — reglas de supresión por patrón (`pattern`, filtros opcionales `app`/`level`/`endpoint`, `reason`, `created_by`).
    - [x] `audit_events` — eventos de auditoría (`type`, `actor`, `oid`, `role`, `app`, `search`, `row_count`, `test_session_id`, `details` JSON).
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

- [x] **1.6** Configurar ruta de DB
  - **Qué:** Resolver dónde vive el archivo `.db` según entorno del dev.
  - **Dónde:** `resolveDbPath()` en `client.ts`.
  - **Orden de resolución:** `MARLOWEE_DB_PATH` → `~/.marlowee-inspector/marlowee.db` (si existe) → `./data/marlowee.db`.
  - **Criterio:** DB se crea automáticamente; directorio padre se crea con `mkdirSync` recursivo.

- [x] **1.7** Agregar `/data/` y `*.db` a `.gitignore`
  - **Qué:** Evitar commitear bases de datos locales con datos de triage/audit.
  - **Dónde:** `.gitignore` líneas `/data/` y `*.db`.
  - **Criterio:** `git status` no muestra `data/marlowee.db` tras uso local.

- [x] **1.8** Agregar scripts npm
  - **Qué:** Comandos estándar para schema y exploración de datos.
  - **Dónde:** `package.json` scripts: `db:push`, `db:generate`, `db:studio`.
  - **Criterio:** Los tres scripts existen y ejecutan drizzle-kit.

- [x] **1.9** Ejecutar `pnpm db:push` para crear schema local
  - **Qué:** Materializar tablas en disco antes del primer `pnpm dev`.
  - **Comando:** `pnpm db:push`
  - **Criterio:** Existe `data/marlowee.db` con las 6 tablas tras el push.

- [x] **1.10** Crear `src/lib/db/repository.ts`
  - **Qué:** Capa de acceso a datos — todas las mutaciones y lecturas de persistencia.
  - **Dónde:** `src/lib/db/repository.ts`
  - **Funciones principales:** `getIssueStore`, `upsertIssue`, `setIssueStatus`, `addNote`, `getActiveSession`, `createSession`, `updateSession`, `hideLogEntry`, `reopenLogEntry`, `createSuppression`, `createAuditEvent`, `queryAuditEvents`, etc.
  - **Criterio:** Ningún route handler escribe SQL directo; todo pasa por repository.

- [x] **1.11** Migrar lógica de `issues.ts` → `repository.ts`
  - **Qué:** Mover persistencia fuera de funciones puras de dominio.
  - **Dónde:** `issues.ts` conserva tipos, fingerprinting, merge de store en memoria; `repository.ts` hace I/O.
  - **Criterio:** `issues.ts` no importa `localStorage` ni escribe estado.

- [x] **1.12** Crear `src/lib/api.ts`
  - **Qué:** Cliente HTTP del frontend hacia los route handlers de persistencia.
  - **Dónde:** `fetchStoreInit`, `setIssueStatusApi`, `upsertIssueApi`, `addNoteApi`, `createSessionApi`, `updateSessionApi`, `hideLogEntryApi`, `reopenLogEntryApi`.
  - **Criterio:** `logs-view.tsx` importa desde aquí, no hace `fetch()` ad-hoc disperso.

- [x] **1.13** Crear endpoints REST
  - **Qué:** Route handlers Next.js App Router para CRUD; todos requieren sesión (`auth()`).
  - **Endpoints:** `GET /api/store/init`, `GET/POST /api/issues`, `GET/PATCH /api/issues/:fingerprint`, `GET/POST /api/annotations`, `GET/POST /api/hidden`, `DELETE /api/hidden/:logId`, `GET/POST /api/sessions`, `PATCH /api/sessions/:id`, `GET/POST /api/suppressions`, `DELETE /api/suppressions/:id`, `GET /api/audit` (Admin only).
  - **Criterio:** Cada ruta responde 401 sin sesión; audit responde 403 si no es Admin.

- [x] **1.14** Migrar `logs-view.tsx`
  - **Qué:** Cargar estado inicial y mutaciones vía API en lugar de storage del browser.
  - **Dónde:** `fetchStoreInit()` en mount; handlers llaman APIs de `src/lib/api.ts`.
  - **Criterio:** Refrescar página conserva issues, notas, sessions y hidden logs.

- [x] **1.15** Eliminar `loadIssueStore` / `saveIssueStore` de `issues.ts`
  - **Criterio:** `grep localStorage issues.ts` sin resultados.

- [x] **1.16** Eliminar `loadTestSession` / `saveTestSession` de `test-session.ts`
  - **Criterio:** `grep sessionStorage test-session.ts` sin resultados.

- [x] **1.17** Actualizar `test-session-bar.tsx`
  - **Qué:** UI delega create/stop/rename al parent que llama la API.
  - **Criterio:** Iniciar/detener session persiste tras reload.

- [x] **1.18** Verificar build
  - **Comandos:** `pnpm typecheck`, `pnpm build`, `pnpm test`.
  - **Criterio:** Los tres exit code 0.

---

## 2. Auth y seguridad (local dev)

Cada dev necesita login en Marlowee (Entra ID o bypass local) + `az login` para Log Analytics. El navegador nunca recibe credenciales Azure.

- [x] **2.1** Definir App Roles en código
  - **Dónde:** `src/lib/authz.ts` — `Role`, `ROLE_RANK`, `highestRole()`.
  - **Roles:** Admin, Developer, QA, Support, Viewer.

- [x] **2.2** Implementar matriz de permisos por rol
  - **Dónde:** `CAPABILITIES` en `src/lib/authz.ts` — apps, raw mode, max range, rate limit/min.
  - **Criterio:** `/api/logs?app=ca-admin` retorna 403 para Developer.

- [x] **2.3** Configurar Auth.js + middleware
  - **Dónde:** `src/auth.ts`, `src/middleware.ts`.
  - **Dev bypass:** Sin `AUTH_MICROSOFT_ENTRA_ID_ID` → Credentials one-click; rol vía `AUTH_DEV_ROLE`.

- [x] **2.4** Rate limit in-memory por usuario
  - **Dónde:** `src/lib/rate-limit.ts` — fixed-window 60s; límite según rol.
  - **Nota:** Suficiente para v2 local; Redis en V3 app pública.

---

## 3. Copy raw / Copy for AI

- [x] **3.1** Botones client-side en `LogDetailPanel`
  - **Dónde:** `src/components/logs/log-detail-panel.tsx` — Copy message, KQL, raw, Copy for AI.
  - **Criterio:** Click copia al clipboard; feedback "Copied" 2s.

- [ ] **3.2** Crear `POST /api/logs/copy`
  - **Qué:** Masking server-side + audit `raw_copied`.
  - **Dónde:** `src/app/api/logs/copy/route.ts`.
  - **Body:** `{ logId, variant: "raw" | "ai" }`.

- [ ] **3.3** Conectar botones al endpoint server-side
  - **Dónde:** `log-detail-panel.tsx` — fetch antes de copiar.
  - **Criterio:** Cada copy genera fila en `audit_events`.

---

## 4. Audit durable

- [x] **4.1** Escribir audit a `audit_events` en SQLite
  - **Dónde:** `src/lib/audit.ts` → `createAuditEvent()`.
  - **Tipos:** `search`, `raw_search`, `rate_limited`, `denied`.

- [x] **4.2** Mirror a stdout JSON
  - **Qué:** Backup capturable en `ContainerAppConsoleLogs_CL` cuando se despliegue.

- [x] **4.3** Crear `GET /api/audit`
  - **Dónde:** `src/app/api/audit/route.ts` — Admin only; filtros `type`, `actor`, `limit`.

- [ ] **4.4** UI de auditoría para Admin
  - **Qué:** Vista sidebar **Audit Log** (§7.13) o página dedicada.
  - **Features:** Tabla paginada, filtros actor/tipo/fecha.

---

## 5. Parsers por app

Cada container app loguea distinto (JSON vs plain text). Hoy el nivel se infiere con heurística `has_any` en KQL.

- [ ] **5.1** Parsers por container app
  - **Qué:** Módulo por app: `ca-data-api`, `ca-dashboard`, `ca-onboarding`, `ca-admin`.
  - **Dónde sugerido:** `src/lib/parsers/` + registry en `src/lib/log-details.ts`.
  - **Extrae:** HTTP method/path/status, trace IDs, campos JSON anidados.

- [ ] **5.2** Mejorar detección de nivel
  - **Qué:** ERROR/WARN/INFO/LOG más allá de substring en `Log_s`.
  - **Dónde:** `src/lib/queries.ts` y/o post-proceso en parser.

---

## 6. Vistas de sidebar (navegación principal)

Hoy `LogsSidebar` renderiza 13 ítems estáticos; solo **Live Logs** tiene contenido. `RecentSignalsPanel` es preview, no vistas dedicadas.

**Objetivo:** Cada ítem abre una vista full-page con routing y estado activo.

### Infraestructura

- [ ] **6.0** Wiring sidebar → vistas
  - **Dónde:** `logs-sidebar.tsx` (`SidebarView` type), `logs-shell.tsx` (nuevo), `src/app/logs/page.tsx`.
  - **Routing:** `/logs?view=issues` o rutas `/logs/issues`, etc.
  - **Authz:** Ocultar Settings si rol ≠ Admin.
  - **Criterio:** Click cambia main content; URL refleja vista; refresh conserva vista.

### Monitor

- [ ] **6.1** Vista **Overview**
  - **Contenido:** KPI cards, sparklines por app, top error patterns, banner workspace `law-savvly-dev-main`.
  - **APIs:** `/api/logs/summary`, `/api/logs/metrics`.

- [x] **6.2** Vista **Live Logs** _(parcial — vista actual)_
  - **Contenido:** Header, TestSessionBar, SummaryCards, LogFilters, LogsTable, RecentSignalsPanel, LogDetailPanel.
  - **Pendiente:** Extraer a `live-logs-view.tsx`; routing vía 6.0.

- [ ] **6.3** Vista **Test Sessions**
  - **Contenido:** CRUD sessions, historial, resume → Live Logs.
  - **APIs:** `/api/sessions`.

- [ ] **6.4** Vista **Search**
  - **Contenido:** Búsqueda avanzada, preview KQL, resultados en tabla.
  - **APIs:** `/api/logs`.

### Triage

- [ ] **6.5** Vista **Issues** — cola open/investigating; acciones resolve/suppress.
- [ ] **6.6** Vista **Resolved** — issues cerrados; reopen.
- [ ] **6.7** Vista **Hidden / Suppressed** — tabs hidden logs + suppressed fingerprints/reglas.
- [ ] **6.8** Vista **Notes** — feed completo de `log_annotations`.

### Sources

- [ ] **6.9** Vista **Container Apps** — catálogo + permisos por rol (`authz.ts`).
- [ ] **6.10** Vista **System Logs** — `ContainerAppSystemLogs_CL`, `stream=system` fijo.

### Settings

- [ ] **6.11** Vista **Access** — permisos efectivos del usuario + matriz roles (read-only).
- [ ] **6.12** Vista **Masking Rules** — reglas de `src/lib/masking.ts` documentadas.
- [ ] **6.13** Vista **Audit Log** — UI sobre `GET /api/audit` (§4.4); Admin only.

### Resumen de vistas

| # | Sidebar | Vista | Estado |
|---|---------|-------|--------|
| 6.1 | Overview | Dashboard KPIs | [ ] |
| 6.2 | Live Logs | Stream + detail | [x] parcial |
| 6.3 | Test Sessions | CRUD sessions | [ ] |
| 6.4 | Search | Búsqueda + KQL | [ ] |
| 6.5 | Issues | Cola triage | [ ] |
| 6.6 | Resolved | Issues cerrados | [ ] |
| 6.7 | Hidden / Suppressed | Tabs ocultos | [ ] |
| 6.8 | Notes | Feed anotaciones | [ ] |
| 6.9 | Container Apps | Catálogo apps | [ ] |
| 6.10 | System Logs | System logs ACA | [ ] |
| 6.11 | Access | Permisos | [ ] |
| 6.12 | Masking Rules | Reglas redacción | [ ] |
| 6.13 | Audit Log | Eventos audit | [ ] |

---

# V3 — App pública

Backlog para deploy en Azure Container App, Entra en producción, multi-workspace y features operativas a escala. **No es scope v2.**

---

## V3.1 Multi-workspace

Hoy solo `law-savvly-dev-main` (`e583009c-5c01-4d42-a46a-3c771e087f5d`). Workspace ID: `AZURE_LOG_ANALYTICS_WORKSPACE_ID`.

- [ ] **V3.1.1** Workspace staging (`law-savvly-dev-ta`)
  - **Dónde:** Config multi-workspace, `src/lib/log-analytics.ts`.
  - **Authz:** QA+ staging; Admin all.

- [ ] **V3.1.2** Workspace producción (`workspace-rgsavvlyshareds8yX`)
  - **Authz:** Admin/Support only; nunca Developer por defecto.

- [ ] **V3.1.3** Selector de workspace en UI
  - **Dónde:** `logs-header.tsx` — dropdown role-gated.

- [ ] **V3.1.4** Workspace-scoped authz
  - **Qué:** Extender `CAPABILITIES` con `workspaces: string[]` por rol.
  - **Criterio:** Workspace no autorizado → 403 + audit `denied`.

---

## V3.2 App Insights / structured data

Workspace actual: solo `ContainerAppConsoleLogs_CL` y `ContainerAppSystemLogs_CL`.

- [ ] **V3.2.1** Conectar App Insights al workspace
  - **Qué:** Diagnostic settings desde Container Apps → Log Analytics (ops/Azure).

- [ ] **V3.2.2** Queries sobre tablas structured
  - **Qué:** `AppRequests`, `AppExceptions`, `traces` en `src/lib/queries.ts`.
  - **Criterio:** Failed requests usa `ResultCode`, no regex sobre `Log_s`.

- [ ] **V3.2.3** Vistas estructuradas en UI
  - **Qué:** Requests/exceptions con columnas tipadas; reemplaza heurísticas en `log-details.ts`.

---

## V3.3 Alertas y búsquedas guardadas

- [ ] **V3.3.1** UI reglas de alerta
  - **Qué:** "Si ERROR contiene X en app Y → alertar".
  - **Persistencia:** Tabla nueva o `suppress_rules` con `alert=true`.
  - **Ejecución:** Cron / Azure Function con KQL periódico.

- [ ] **V3.3.2** Búsquedas guardadas por usuario
  - **Qué:** app + search + level + range + errorsOnly.
  - **Dónde:** Tabla `saved_searches`; dropdown en `log-search-bar.tsx` y vista Search (§6.4).

- [ ] **V3.3.3** Notificaciones
  - **Qué:** Slack webhook o email al disparar alerta.
  - **Integración:** Logic Apps, SendGrid, Slack incoming webhook.

---

## V3.4 Infraestructura y escala (referencia)

Items típicos de app pública no incluidos en v2:

- Entra App Registration + redirect URIs prod + asignación de roles
- Managed Identity + `Log Analytics Reader` en `law-savvly-dev-main`
- Deploy Container App en `aca-env-savvly-dev-main`
- Rate limiting Redis (`src/lib/rate-limit.ts` → Azure Cache for Redis)
- Postgres / DB compartida si triage debe ser multi-usuario en prod
- Multi-tenant más allá de Savvly dev

Ver `docs/MVP_TECHNICAL_PLAN.md` §5–§6 para detalle ops.
