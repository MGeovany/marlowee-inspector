# Marlowee Inspector — V2 Tasks

Tareas extraídas del `MVP_TECHNICAL_PLAN.md` que quedan fuera del MVP actual.

**Leyenda:** `[x]` hecho · `[ ]` pendiente · `[-]` fuera de scope v2

---

## 1. Persistencia: SQLite local (sin Postgres)

Solo SQLite con Drizzle ORM. Nada de Postgres, Neon, Supabase ni Azure Flexible Server.

- [x] 1.1 Instalar `drizzle-orm`, `better-sqlite3`, `drizzle-kit`
- [x] 1.2 Crear `drizzle.config.ts`
- [x] 1.3 Crear `src/lib/db/schema.ts` con las 5 tablas:
  - [x] `test_sessions`
  - [x] `issue_fingerprints`
  - [x] `log_annotations`
  - [x] `suppress_rules`
  - [x] `audit_events`
- [x] 1.4 Agregar tabla adicional `hidden_logs` (por logId, no por fingerprint)
- [x] 1.5 Crear `src/lib/db/client.ts` — SQLite local vía better-sqlite3

- [-] 1.6 Switch automático SQLite/Postgres según `NODE_ENV` o `DATABASE_URL`

- [x] 1.7 Configurar ruta de DB (`./data/marlowee.db`, fallback `~/.marlowee-inspector/`, env `MARLOWEE_DB_PATH`)
- [x] 1.8 Agregar `/data/` y `*.db` a `.gitignore`
- [x] 1.9 Agregar scripts npm: `db:push`, `db:generate`, `db:studio`
- [x] 1.10 Ejecutar `pnpm db:push` para crear schema local
- [x] 1.11 Crear `src/lib/db/repository.ts` — CRUD con Drizzle
- [x] 1.12 Migrar lógica de `issues.ts` → `repository.ts`
- [x] 1.13 Crear `src/lib/api.ts` — cliente fetch
- [x] 1.14 Crear endpoints REST:
  - [x] `GET /api/store/init`
  - [x] `GET`, `POST /api/issues`
  - [x] `GET`, `PATCH /api/issues/:fingerprint`
  - [x] `GET`, `POST /api/annotations`
  - [x] `GET`, `POST /api/hidden`
  - [x] `DELETE /api/hidden/:logId`
  - [x] `GET`, `POST /api/sessions`
  - [x] `PATCH /api/sessions/:id`
  - [x] `GET`, `POST /api/suppressions`
  - [x] `DELETE /api/suppressions/:id`
  - [x] `GET /api/audit` (Admin only)
- [x] 1.15 Migrar `logs-view.tsx` — fetch a `/api/store/init` y mutations via API
- [x] 1.16 Eliminar `loadIssueStore` / `saveIssueStore` (localStorage) de `issues.ts`
- [x] 1.17 Eliminar `loadTestSession` / `saveTestSession` (sessionStorage) de `test-session.ts`
- [x] 1.18 Actualizar `test-session-bar.tsx` — delegar persistencia al parent/API

- [x] 1.22 Verificar build: `pnpm typecheck`, `pnpm build`, `pnpm test`

---

## 2. Auth y seguridad (local dev)

Aunque sea local-only, cada dev necesita login en Marlowee (Entra ID) + `az login` para Log Analytics.

- [x] 2.1 Definir App Roles en código: Admin, Developer, QA, Support, Viewer (`src/lib/authz.ts`)
- [x] 2.2 Implementar matriz de permisos por rol (apps permitidas, raw mode solo Admin)
- [x] 2.3 Configurar Auth.js + middleware de sesión (`src/auth.ts`, `src/middleware.ts`)
- [x] 2.4 Rate limit in-memory por usuario (`src/lib/rate-limit.ts`) — MVP
- [ ] 2.5 Crear App Registration en Entra ID (tenant `cac58ef5-…`)
- [ ] 2.6 Configurar redirect URIs (producción + localhost)
- [ ] 2.7 Asignar roles a usuarios/grupos via Enterprise Application

---

## 3. Copy raw / Copy for AI

- [x] 3.1 Botones "Copy raw" y "Copy for AI" en `LogDetailPanel` (client-side)
- [ ] 3.2 Crear `POST /api/logs/copy` — masking server-side + audit `raw_copied`
- [ ] 3.3 Conectar botones al endpoint server-side (reemplazar copia client-side)

---

## 4. Rate limiting distribuido

- [x] 4.1 Rate limit in-memory (MVP, ver 2.4)
- [ ] 4.2 Reemplazar in-memory con Redis (Azure Cache for Redis) o `@upstash/ratelimit`
- [ ] 4.3 Eliminar dependencia de única instancia para escalar horizontalmente

---

## 5. Audit durable

- [x] 5.1 Escribir audit a tabla `audit_events` en SQLite (`src/lib/audit.ts`)
- [x] 5.2 Mantener mirror a stdout JSON como respaldo
- [x] 5.3 Crear `GET /api/audit` (Admin only)
- [ ] 5.4 UI de auditoría para Admin (filtros por actor, tipo, rango de fechas)

---

## 6. Multi-workspace

- [ ] 6.1 Soportar workspace de staging (`law-savvly-dev-ta`)
- [ ] 6.2 Soportar workspace de producción (`workspace-rgsavvlyshareds8yX`)
- [ ] 6.3 Selector de workspace en UI (role-gated)
- [ ] 6.4 Workspace-scoped authz (Admin ve todos, Developer solo dev, etc.)

---

## 7. App Insights / structured data

- [ ] 7.1 Conectar App Insights al workspace
- [ ] 7.2 Agregar tablas `AppRequests`, `AppExceptions`, `traces`
- [ ] 7.3 Vistas estructuradas de requests fallidos y excepciones

---

## 8. Parsers por app

- [ ] 8.1 Parsers específicos por container app (`ca-data-api`, `ca-dashboard`, etc.)
- [ ] 8.2 Mejorar detección de nivel (ERROR/WARN/INFO/LOG) más allá de `has_any`

---

## 9. Alertas y búsquedas guardadas

- [ ] 9.1 UI para crear y persistir reglas de alerta sobre patrones de log
- [ ] 9.2 Búsquedas guardadas por usuario
- [ ] 9.3 Notificaciones (slack/email) cuando una alerta se dispara

---

## 10. Archivo / export de logs

- [ ] 10.1 Exportar resultados de búsqueda a CSV/JSON
- [ ] 10.2 Archivar logs mayores a 30 días (antes de que retention los elimine)

---

## 11. Fuente tipográfica Departure Mono

- [ ] 11.1 Self-hostear `.woff2` de Departure Mono para brand/headings/KPIs

---

## 12. Infraestructura (Azure)

- [ ] 12.1 Crear App Registration en Entra ID
- [ ] 12.2 Configurar redirect URIs (producción + localhost)
- [ ] 12.3 Definir App Roles en Entra: Admin, Developer, QA, Support, Viewer
- [ ] 12.4 Asignar roles a usuarios/grupos via Enterprise Application
- [ ] 12.5 Crear Managed Identity para el Container App de Marlowee Inspector
- [ ] 12.6 Asignar rol `Log Analytics Reader` a la MI sobre `law-savvly-dev-main`
- [ ] 12.7 Deploy del Container App en `aca-env-savvly-dev-main`
- [ ] 12.8 Verificar end-to-end: Auth + KQL + masking + audit

---

## 13. Multi-tenant

- [ ] 13.1 Soportar múltiples tenants/workspaces más allá de Savvly dev

---

## Flujo local (pasos)

- [ ] Clonar repo
- [ ] `pnpm install`
- [ ] `az login`
- [ ] `pnpm db:push`
- [ ] `pnpm dev`
- [ ] Abrir `http://localhost:3000`

```bash
git clone <repo>
cd marlowee-inspector
pnpm install
az login
pnpm db:push
pnpm dev
```

---

## Fuera de scope v2 (decisión explícita)

Items marcados con `[-]` arriba. Resumen:

- Postgres / Neon / Supabase / Azure Flexible Server
- Switch automático SQLite ↔ Postgres
- Redis para rate limiting distribuido
- Deploy a Azure Container App (sección 12 queda como backlog ops)
- Multi-workspace, multi-tenant
- App Insights structured data
- Alertas / búsquedas guardadas
- Export / archivo de logs
- Departure Mono font
- `POST /api/logs/copy` (client-side cubre el caso de uso actual)
- Parsers específicos por container app
