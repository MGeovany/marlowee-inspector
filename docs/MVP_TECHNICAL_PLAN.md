# Marlowee Inspector — MVP Technical Plan

Internal web app (Next.js) to query application logs from the Azure Log Analytics
workspace **`law-savvly-dev-main`**, for the container apps:

- `ca-data-api`
- `ca-dashboard`
- `ca-onboarding`
- `ca-admin`

> Scope of this MVP: **Development subscription only**, **single workspace** `law-savvly-dev-main`.
> No Azure changes are made by this repo. Auth uses **Microsoft Entra ID** (no Auth0).

Confirmed facts from the Azure Discovery Report (read-only):

| Item | Value |
|---|---|
| Tenant (Savvly) | `cac58ef5-e1ea-4641-9663-a6d848ad392f` |
| Subscription (Development) | `6684ee99-767f-433f-a086-89cf2dafbaea` |
| Workspace `law-savvly-dev-main` (customerId) | `e583009c-5c01-4d42-a46a-3c771e087f5d` |
| Workspace RG | `rg-savvly-dev` (centralus) |
| Retention | 30 days |
| Tables available | `ContainerAppConsoleLogs_CL`, `ContainerAppSystemLogs_CL` |
| Container Apps env | `aca-env-savvly-dev-main` |

> Note: `AppRequests` / `AppExceptions` / `traces` are **not** present in this workspace.
> The MVP works over `ContainerAppConsoleLogs_CL` (stdout/stderr) and `ContainerAppSystemLogs_CL`
> (platform events). Structured request/exception views are out of scope until App Insights is
> wired into the workspace.

---

## 1. Technical architecture of the MVP

```
Browser (employee)
   │  1. OIDC login (Microsoft Entra ID)
   ▼
┌───────────────────────────────────────────────────────────────┐
│ Next.js App Router (single deployable)                         │
│                                                                │
│  ── Frontend (RSC + client components, shadcn/ui) ──           │
│     · Login screen · Log viewer · Filters · Search             │
│     NEVER holds Azure credentials. Only a session cookie.      │
│                                                                │
│  ── Server (Route Handlers + Server Actions) ──                │
│     · Auth.js session + App Role authorization                 │
│     · KQL builder (allowlisted apps + escaped input)           │
│     · Masking (server-side redaction)                          │
│     · Audit log (every search)                                 │
│     · Rate limiting (per user)                                 │
└───────────────┬───────────────────────────────────────────────┘
                │ 2. Managed Identity (no secrets)
                ▼
        Azure Monitor — LogsQueryClient
                │ 3. KQL (read-only)
                ▼
   Log Analytics: law-savvly-dev-main (e583009c…)
     ContainerAppConsoleLogs_CL / ContainerAppSystemLogs_CL
```

**Key decisions**

- **One Next.js app** (App Router). Frontend and backend in the same deployable; all Azure
  access happens **only** in server code (Route Handlers / Server Actions).
- **The user never touches Azure.** Marlowee Inspector queries logs with its **own Managed Identity**.
  Authorization (who can see what) is enforced in the backend by **App Role**, not by Azure RBAC
  on the user.
- **Deploy target:** a new Container App in the existing `aca-env-savvly-dev-main` environment
  (same env as the apps it reads). Local dev runs against the workspace using your `az login`
  credential.
- **Stateless MVP:** no database required to start. Audit + rate-limit use stdout + in-memory
  (upgrade path to Redis/Postgres documented in `docs/V2_TASKS.md`).

**Request lifecycle of a search**

1. Middleware checks there is a valid session; otherwise redirect to login.
2. Route handler `/api/logs` reads the session, resolves the user's App Role.
3. Authorize: role allowed? requested app in the role's allowlist?
4. Rate-limit check (per user).
5. Build KQL from an **allowlisted** app name + enum time range + **escaped** free-text.
6. Optional **test session window**: when active, append `TimeGenerated >= since` (and `<= until` when stopped). This filters the Marlowee view only — **Azure logs are never deleted**.
7. Run query via `LogsQueryClient` (Managed Identity).
8. Apply masking to every row server-side.
9. Write an audit event (who, what app, what filters, row count, timestamp, test session id if any).
10. Return masked rows to the client.

---

## 2. Test sessions (start from zero)

Marlowee Inspector supports **test sessions** for focused QA/debug workflows. A test session is a
**client-side view filter** backed by server-side KQL — it does **not** mutate or delete data in
Log Analytics.

**User intent:** "Start from zero" means clear the current table and only show logs emitted **after**
the session start timestamp. Historical Azure data remains intact.

**Session state (browser `sessionStorage`)**

| Field | Description |
|---|---|
| `id` | Generated id, e.g. `ts_a1b2c3d4e5f6` — can be embedded in app logs as `testSessionId` |
| `name` | Human label, e.g. `Testing contribution update` |
| `startedAt` | ISO timestamp when the session began |
| `stoppedAt` | ISO timestamp when the user stops recording (optional) |
| `status` | `active` \| `stopped` |

**UI controls**

- **Start test session** — prompts for name, sets `startedAt = now()`, clears the table, enables live refresh.
- **Stop session** — freezes the upper bound (`until = now()`), pauses live tail.
- **Clear view** — empties the on-screen table; next refresh still queries `TimeGenerated >= startedAt`.
- **End session** — exits session mode and returns to normal time-range browsing.
- **Session bar** — shows name, duration (live clock while active), logs captured count, session id (copyable).
- **Optional filters** — `requestId` and `testSessionId` (message contains) narrow results within the session window.

**API**

- `GET /api/logs?since=<iso>&until=<iso>&testSessionId=…`
- `GET /api/logs/summary?since=<iso>&until=<iso>`
- KQL helper: `| where TimeGenerated >= datetime("<since>")` (+ optional `<= until`)
- SDK query duration is auto-expanded to cover the session span (up to role max range).

**Audit**

Search audit events may include `since`, `testSessionId` when a session window is applied.

---

## 3. Authentication flow with Microsoft Entra ID

Library: **Auth.js v5 (`next-auth@beta`)** with the **Microsoft Entra ID** provider.

```
1. User hits Marlowee Inspector → no session → redirect to /api/auth/signin
2. Redirect to Entra ID authorize endpoint (tenant cac58ef5…)
3. User authenticates with their @savvly.com account (MFA per tenant policy)
4. Entra returns id_token + access_token to the Marlowee Inspector callback
5. Auth.js validates the token, creates an encrypted session cookie
6. The `roles` claim (App Roles) is copied into the session via the jwt callback
7. Subsequent requests carry the httpOnly session cookie; the backend reads roles from it
```

**App Registration (to be created later — NOT in this repo):**

- Single tenant (`cac58ef5-e1ea-4641-9663-a6d848ad392f`).
- Redirect URI: `https://<marlowee-inspector-host>/api/auth/callback/microsoft-entra-id`
  (and `http://localhost:3000/api/auth/callback/microsoft-entra-id` for dev).
- **App Roles** defined on the app: `Admin`, `Developer`, `QA`, `Support`, `Viewer`.
- Assign roles via Enterprise Application → Users and groups (prefer Entra **groups**).
- The `roles` claim then arrives in the token and is read by the backend.

**Why Auth.js over raw MSAL for the MVP:** less boilerplate, encrypted cookie sessions out of the
box, first-class App Router support. MSAL Node remains a valid alternative if you later need
on-behalf-of flows; not needed here because Marlowee Inspector uses its **own** identity to read logs.

---

## 4. How roles are validated in the backend

App Roles arrive in the token `roles` claim (array of strings). Flow:

1. **Auth.js `jwt` callback** copies `profile.roles` → `token.roles`.
2. **Auth.js `session` callback** exposes `session.user.roles`.
3. A small **authz helper** (`src/lib/authz.ts`) maps the role to its capabilities:
   - which container apps it may read,
   - whether it can see prod (none in MVP — dev only),
   - whether it can see raw vs masked logs,
   - max time range and rate limit.
4. Every Route Handler / Server Action calls `requireRole()` / `authorizeAppAccess()` **before**
   building any query. No query is built for an unauthorized request.

**MVP role matrix (single workspace = dev):**

| Role | Apps it can read | Raw (unmasked)? | Max range |
|---|---|---|---|
| Admin | all 4 (`ca-data-api`, `ca-dashboard`, `ca-onboarding`, `ca-admin`) | Yes (audited) | 7d |
| Developer | `ca-data-api`, `ca-dashboard`, `ca-onboarding` | No (masked) | 7d |
| QA | `ca-data-api`, `ca-dashboard`, `ca-onboarding` | No (masked) | 24h |
| Support | `ca-dashboard`, `ca-onboarding` (errors-focused) | No (masked) | 24h |
| Viewer | `ca-dashboard` | No (masked) | 1h |

> `ca-admin` is restricted to **Admin** only (admin-portal logs are the most sensitive).

**Defense in depth:** authorization is checked in (a) middleware (is there a session at all),
(b) the route handler (role + app allowlist), and (c) the KQL builder (the app name must be in a
hard-coded allowlist regardless of role config).

---

## 5. How the backend queries Log Analytics using Managed Identity

Libraries: **`@azure/monitor-query`** (`LogsQueryClient`) + **`@azure/identity`**.

**Credential strategy (one code path, environment-driven):**

- **Local dev:** `DefaultAzureCredential` picks up your `az login` session (you are Contributor on
  the Development subscription, so you can read the workspace today).
- **Production (Container App):** set `AZURE_MANAGED_IDENTITY_CLIENT_ID` to the user-assigned
  identity's client id → `ManagedIdentityCredential`. **No secrets** anywhere.

```ts
const credential = process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID
  ? new ManagedIdentityCredential({ clientId: process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID })
  : new DefaultAzureCredential();

const client = new LogsQueryClient(credential);
const result = await client.queryWorkspace(
  process.env.AZURE_LOG_ANALYTICS_WORKSPACE_ID!, // e583009c-… (customerId / GUID)
  kql,
  { duration: Durations.sevenDays }
);
```

**Minimum permission to grant later (NOT in this repo):** the Marlowee Inspector managed identity needs
**`Log Analytics Reader`** scoped **only** to `law-savvly-dev-main` — never subscription-wide,
never `Contributor`.

**KQL safety:** the workspace GUID is fixed by env. The app name comes from a hard-coded
allowlist. Free-text search is escaped (`\` and `"`) before being placed in a `contains` clause.
Time range is an enum (`1h | 24h | 7d`) mapped to SDK `Durations`, never a raw user string.

---

## 6. Security

### Principios

- **Zero trust al frontend**: el navegador nunca recibe Azure credentials, connection strings ni tokens de base de datos. Todo acceso a datos pasa por Next.js API Routes (server-side).
- **Masking siempre server-side**: `src/lib/masking.ts` se aplica en el API route antes de responder al cliente. No existe flag `raw=true` ni bypass expuesto. El cliente siempre recibe `masked: true`.
- **Hidden/suppressed no borra logs reales**: opera sobre metadatos de triage en el cliente (MVP: `localStorage`). Los logs en Azure Log Analytics son inmutables y nunca se eliminan via Marlowee.
- **Authorization en cada request**: cada API route verifica sesión vía `auth()`, aplica `capabilitiesFor()` y `canReadApp()` antes de ejecutar cualquier query o mutación.

### Audit log de acciones

Cada acción del usuario se registra en audit stdout JSON (capturable en ContainerAppConsoleLogs_CL). Eventos a registrar:

| Acción | `type` | Contexto adicional |
|--------|--------|-------------------|
| Buscar logs | `search` | app, search, level, range, rowCount, testSessionId |
| Iniciar test session | `test_session_started` | sessionId, sessionName |
| Detener test session | `test_session_stopped` | sessionId, duration |
| Resolver issue | `issue_status_changed` | fingerprint, app, level, previousStatus, newStatus="resolved" |
| Supprimir issue | `issue_status_changed` | fingerprint, previousStatus, newStatus="suppressed" |
| Ocultar log individual | `log_hidden` | logId, fingerprint |
| Reabrir log | `log_reopened` | logId |
| Agregar nota | `note_added` | fingerprint, logId, target, charCount |
| Rate limited | `rate_limited` | app |
| Acceso denegado | `denied` | reason |

### Endpoints y su seguridad

| Endpoint | Auth requerido | Authz adicional | Rate limit | Audit |
|----------|---------------|-----------------|------------|-------|
| `GET /api/logs` | Sesión | `canReadApp(app)` | Sí (por rol) | `search` |
| `GET /api/logs/summary` | Sesión | `canReadApp(app)` | Sí | `search` |
| `GET /api/logs/metrics` | Sesión | Apps permitidas por rol | Sí | `search` |

### Rate limiting

- Por usuario (oid o email), no por IP (los devs pueden compartir IP en oficina).
- Límite configurable por rol (`rateLimitPerMinute` en `src/lib/authz.ts`).
- Respuesta `429` con header `Retry-After` si se excede.
- Todos los rate limits se auditan.
- MVP: in-memory (single instance). Producción multi-instance: move to Redis (a Redis Cache already exists in the subscription) or Azure Cache for Redis.

### Additional

- CSRF handled by Auth.js for auth routes; mutations use POST + same-site cookies.
- Strict CSP + security headers in `next.config`/middleware.
- KQL is read-only by construction (no `.create`/`.set`/external calls); app name allowlisted; input escaped to prevent KQL injection.

---

## 7. Technical risks of the MVP

1. **30-day retention.** Anything older is gone; not a Marlowee Inspector bug. Surface it in the UI; consider
   archival/export later if support needs more history.
2. **No structured requests/exceptions.** Only console/system logs exist in this workspace.
   "Failed requests" / "exceptions" views depend on parsing free-text `Log_s` and will be
   heuristic until App Insights is wired into the workspace.
3. **Heterogeneous log formats.** Each app logs differently (JSON vs plain text), so level
   detection and field extraction are best-effort. Plan per-app parsers iteratively.
4. **KQL injection / cost.** Mitigated by allowlisting the app, escaping free text, enum time
   ranges, and always applying `| take N`. Without `take`, a broad query can be slow/expensive.
5. **Masking completeness.** Regex masking can miss novel secret formats or over-mask. Treat the
   pattern set as living; never rely on masking alone for the most sensitive app (`ca-admin` is
   Admin-only by policy).
6. **In-memory rate limit & audit don't survive scale-out.** Fine for a single MVP instance; move
   to Redis/Postgres before running multiple replicas.
7. **Managed Identity not available locally.** Local dev relies on `az login`; the prod code path
   (`ManagedIdentityCredential`) can only be fully validated after deployment + role assignment.
8. **App Roles claim setup.** If App Roles aren't assigned (or the token is misconfigured), the
   `roles` claim is empty and everyone is denied. Verify the claim end-to-end early.
9. **Audit-to-same-workspace circularity.** MVP writes audit to stdout that lands in the same
   workspace Marlowee Inspector reads. Acceptable for MVP, but a tamper-resistant separate store is better.

---

## Out of scope for this MVP (explicitly)

- Staging / production workspaces (`law-savvly-dev-ta`, `workspace-rgsavvlyshareds8yX`).
- Any Azure resource creation (App Registration, Managed Identity, role assignment, deploy) —
  documented here, executed separately by an operator.
- Alerting, saved searches, dashboards, multi-tenant. Iterate after MVP.
