# Marlowee Inspector — V2 Tasks

Tareas extraídas del `MVP_TECHNICAL_PLAN.md` que quedan fuera del MVP actual y corresponden a una versión 2.

---

## Persistencia (reemplazar localStorage)

- [ ] Instalar `drizzle-orm`, `better-sqlite3`, `drizzle-kit`
- [ ] Crear `src/lib/db/schema.ts` con las 5 tablas (test_sessions, issue_fingerprints, log_annotations, suppress_rules, audit_events)
- [ ] Crear `src/lib/db/client.ts` con switch automático SQLite/Postgres según `NODE_ENV` o `DATABASE_URL`
- [ ] `npx drizzle-kit push` para generar SQLite local en `./data/marlowee.db`
- [ ] Migrar `issues.ts` → `repository.ts` con funciones Drizzle
- [ ] Crear endpoints REST: `GET/POST /api/issues`, `PATCH /api/issues/:fingerprint`, `GET/POST /api/annotations`, `GET/POST /api/sessions`, `GET /api/audit`
- [ ] Migrar `logs-view.tsx` de `loadIssueStore/saveIssueStore` a fetch a los nuevos endpoints
- [ ] Eliminar `loadIssueStore`/`saveIssueStore` y llaves de localStorage
- [ ] Script `src/scripts/migrate-local-to-db.ts` para migrar datos existentes
- [ ] Agregar `DATABASE_URL` env var para Postgres en producción
- [ ] Configurar Postgres en Neon / Supabase / Azure Flexible Server

## Copy raw / Copy for AI (server-side auditado)

- [ ] Crear `POST /api/logs/copy` endpoint que recibe `{ logId }`, aplica masking, registra audit `raw_copied`, devuelve texto masked
- [ ] Conectar botón "Copy raw" y "Copy for AI" en `LogDetailPanel` al nuevo endpoint

## Rate limiting distribuido

- [ ] Reemplazar in-memory rate limit (`src/lib/rate-limit.ts`) con Redis (Azure Cache for Redis ya existe en la subscripción) o `@upstash/ratelimit`
- [ ] Eliminar dependencia de única instancia para escalar horizontalmente

## Audit durable

- [ ] Migrar audit de stdout JSON a la tabla `audit_events` en Postgres (tamper-evident)
- [ ] Mantener mirror a stdout para captura en ContainerAppConsoleLogs_CL como respaldo
- [ ] UI de auditoría para Admin (`GET /api/audit` con filtros por actor, tipo, rango de fechas)

## Multi-workspace

- [ ] Soportar workspace de staging (`law-savvly-dev-ta`)
- [ ] Soportar workspace de producción (`workspace-rgsavvlyshareds8yX`)
- [ ] Selector de workspace en UI (role-gated)
- [ ] Workspace-scoped authz (Admin ve todos, Developer solo dev, etc.)

## App Insights / structured data

- [ ] Una vez que App Insights esté conectado al workspace, agregar tablas `AppRequests`, `AppExceptions`, `traces`
- [ ] Vistas estructuradas de requests fallidos y excepciones (no solo parsing heurístico de `Log_s`)

## Parsers por app

- [ ] Implementar parsers específicos por container app para campos estructurados (los formatos de log varían por app)
- [ ] Mejorar detección de nivel (ERROR/WARN/INFO/LOG) más allá del approach actual `has_any`

## Alertas y búsquedas guardadas

- [ ] UI para crear y persistir reglas de alerta sobre patrones de log
- [ ] Búsquedas guardadas por usuario
- [ ] Notificaciones (slack/email) cuando una alerta se dispara

## Archivo / export de logs

- [ ] Exportar resultados de búsqueda a CSV/JSON
- [ ] Archivar logs mayores a 30 días (antes de que retention los elimine)

## Fuente tipográfica Departure Mono

- [ ] Self-hostear `.woff2` de Departure Mono para brand/headings/KPIs

## Infraestructura (Azure)

- [ ] Crear App Registration en Entra ID (tenant `cac58ef5-…`)
- [ ] Configurar redirect URIs (producción + localhost)
- [ ] Definir App Roles: Admin, Developer, QA, Support, Viewer
- [ ] Asignar roles a usuarios/grupos via Enterprise Application
- [ ] Crear Managed Identity para el Container App de Marlowee Inspector
- [ ] Asignar rol `Log Analytics Reader` a la MI sobre `law-savvly-dev-main`
- [ ] Hacer deploy del Container App en `aca-env-savvly-dev-main`
- [ ] Verificar end-to-end: Auth + KQL + masking + audit

## Multi-tenant

- [ ] Soportar múltiples tenants/workspaces más allá de Savvly dev
