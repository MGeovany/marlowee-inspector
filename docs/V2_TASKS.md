# Marlowee Inspector — V2 Tasks

---

## Persistencia: SQLite local (sin Postgres)

Solo SQLite con Drizzle ORM. Nada de Postgres, Neon, Supabase ni Azure Flexible Server por ahora.

### 1. Dependencias

```
pnpm add drizzle-orm better-sqlite3
pnpm add -D drizzle-kit @types/better-sqlite3
```

### 2. Archivos nuevos

| Archivo | Propósito |
|---------|-----------|
| `src/lib/db/schema.ts` | Schema Drizzle con las 5 tablas |
| `src/lib/db/client.ts` | `createClient()` — solo SQLite |
| `src/lib/db/repository.ts` | Funciones CRUD que reemplazan `loadIssueStore/saveIssueStore` |

### 3. Database location

| Uso | Ruta |
|-----|------|
| Desarrollo | `./data/marlowee.db` |
| Uso real local | `~/.marlowee-inspector/marlowee.db` vía env `MARLOWEE_DB_PATH` |

Agregar `/data` a `.gitignore`.

### 4. Tablas

- `test_sessions`
- `issue_fingerprints`
- `log_annotations`
- `suppress_rules`
- `audit_events`

### 5. Endpoints REST

| Endpoint | Descripción |
|----------|-------------|
| `GET/POST /api/issues` | Listar / crear issue fingerprints |
| `PATCH /api/issues/:fingerprint` | Cambiar status |
| `GET/POST /api/annotations` | Notas |
| `GET/POST /api/sessions` | Test sessions |
| `PATCH /api/sessions/:id` | Detener / renombrar session |
| `GET /api/audit` | Solo Admin |
| `GET/POST /api/suppressions` | Reglas de supresión |

### 6. Migrar UI

- Reemplazar `loadIssueStore`/`saveIssueStore` (localStorage)
- Usar `fetch()` a los endpoints internos
- Eliminar `STORAGE_KEY` de `issues.ts`
- Eliminar `sessionStorage` de `test-session.ts`

### 7. Scripts npm

```json
"db:push": "drizzle-kit push",
"db:generate": "drizzle-kit generate",
"db:studio": "drizzle-kit studio"
```

### 8. Flujo local

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

## Auth se mantiene igual

Aunque sea local-only, cada dev necesita:

1. **Login en Marlowee** via Microsoft Entra ID (saber quién es y qué rol tiene)
2. **Permiso para Azure** via `az login` y `DefaultAzureCredential` (leer Log Analytics)

No es lo más elegante, pero es lo más simple y seguro para una herramienta local interna.

---

## Copy raw / Copy for AI

- [ ] Crear `POST /api/logs/copy` endpoint que recibe `{ logId }`, aplica masking, registra audit `raw_copied`, devuelve texto masked
- [ ] Conectar botón "Copy raw" y "Copy for AI" en `LogDetailPanel` al nuevo endpoint

## Audit durable

- [ ] Migrar audit de stdout JSON a la tabla `audit_events` (mantener mirror a stdout como respaldo)
- [ ] UI de auditoría para Admin (`GET /api/audit` con filtros por actor, tipo, rango de fechas)

## Parsers por app (opcional)

- [ ] Implementar parsers específicos por container app si los formatos de log lo requieren
