# Marlowee Inspector — V2 Tasks

Status: ✅ Implementado

---

## Persistencia: SQLite local (sin Postgres)

Solo SQLite con Drizzle ORM. Nada de Postgres, Neon, Supabase ni Azure Flexible Server.

### ✅ Dependencias instaladas

```
pnpm add drizzle-orm better-sqlite3
pnpm add -D drizzle-kit @types/better-sqlite3
```

### ✅ Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `drizzle.config.ts` | Configuración de drizzle-kit |
| `src/lib/db/schema.ts` | Schema Drizzle con 5 tablas + hidden_logs |
| `src/lib/db/client.ts` | `createClient()` — SQLite local vía better-sqlite3 |
| `src/lib/db/repository.ts` | CRUD completo para todas las tablas |
| `src/lib/api.ts` | Cliente fetch para los endpoints |

### ✅ Database location

| Uso | Ruta |
|-----|------|
| Default dev | `./data/marlowee.db` |
| Con env var | `MARLOWEE_DB_PATH=/ruta/personalizada/marlowee.db` |

### ✅ Tablas creadas

- `test_sessions`
- `issue_fingerprints`
- `hidden_logs` (por logId, no por fingerprint)
- `log_annotations`
- `suppress_rules`
- `audit_events`

### ✅ Endpoints REST

| Endpoint | Métodos |
|----------|---------|
| `/api/store/init` | GET — estado completo (issues + hidden + notes + activeSession + suppressions) |
| `/api/issues` | GET, POST |
| `/api/issues/:fingerprint` | GET, PATCH |
| `/api/annotations` | GET, POST |
| `/api/hidden` | GET, POST |
| `/api/hidden/:logId` | DELETE |
| `/api/sessions` | GET, POST |
| `/api/sessions/:id` | PATCH |
| `/api/suppressions` | GET, POST |
| `/api/suppressions/:id` | DELETE |
| `/api/audit` | GET (Admin only) |

### ✅ UI migrada

- `logs-view.tsx` — carga estado via `/api/store/init`, mutations via fetch
- `issues.ts` — eliminados `loadIssueStore`/`saveIssueStore` (localStorage), solo quedan funciones puras
- `test-session.ts` — eliminados `loadTestSession`/`saveTestSession` (sessionStorage)
- `test-session-bar.tsx` — ya no guarda en sessionStorage, delega al parent
- `audit.ts` — escribe a SQLite además de stdout

### ✅ Scripts npm

```json
"db:push": "drizzle-kit push",
"db:generate": "drizzle-kit generate",
"db:studio": "drizzle-kit studio"
```

### ✅ .gitignore

`/data/` y `*.db` agregados.

### ✅ Build

`pnpm typecheck`, `pnpm build`, `pnpm test` pasan.

---

## Flujo local

```bash
git clone <repo>
cd marlowee-inspector
pnpm install
az login
pnpm db:push
pnpm dev
```

Luego abrir `http://localhost:3000`.

---

## Lo que NO se hace en v2

- ❌ Postgres / Neon / Supabase / Azure Flexible Server
- ❌ `DATABASE_URL` para producción
- ❌ Switch automático SQLite ↔ Postgres
- ❌ Redis para rate limiting distribuido
- ❌ Deploy a Azure Container App
- ❌ Multi-workspace
- ❌ App Insights structured data
- ❌ Alertas / búsquedas guardadas
- ❌ Export / archivo de logs
- ❌ Departure Mono font

---

## Copy raw / Copy for AI (pendiente)

- [ ] Crear `POST /api/logs/copy` endpoint que recibe `{ logId }`, aplica masking, registra audit `raw_copied`, devuelve texto masked
- [ ] Conectar botón "Copy raw" y "Copy for AI" en `LogDetailPanel` al nuevo endpoint

## Parsers por app (opcional)

- [ ] Implementar parsers específicos por container app si los formatos de log lo requieren
