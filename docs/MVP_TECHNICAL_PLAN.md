# SavLogs — MVP Technical Plan

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
- **The user never touches Azure.** SavLogs queries logs with its **own Managed Identity**.
  Authorization (who can see what) is enforced in the backend by **App Role**, not by Azure RBAC
  on the user.
- **Deploy target:** a new Container App in the existing `aca-env-savvly-dev-main` environment
  (same env as the apps it reads). Local dev runs against the workspace using your `az login`
  credential.
- **Stateless MVP:** no database required to start. Audit + rate-limit use stdout + in-memory
  (documented upgrade path to Redis/Postgres in §14).

**Request lifecycle of a search**

1. Middleware checks there is a valid session; otherwise redirect to login.
2. Route handler `/api/logs` reads the session, resolves the user's App Role.
3. Authorize: role allowed? requested app in the role's allowlist?
4. Rate-limit check (per user).
5. Build KQL from an **allowlisted** app name + enum time range + **escaped** free-text.
6. Run query via `LogsQueryClient` (Managed Identity).
7. Apply masking to every row server-side.
8. Write an audit event (who, what app, what filters, row count, timestamp).
9. Return masked rows to the client.

---

## 3. Authentication flow with Microsoft Entra ID

Library: **Auth.js v5 (`next-auth@beta`)** with the **Microsoft Entra ID** provider.

```
1. User hits SavLogs → no session → redirect to /api/auth/signin
2. Redirect to Entra ID authorize endpoint (tenant cac58ef5…)
3. User authenticates with their @savvly.com account (MFA per tenant policy)
4. Entra returns id_token + access_token to the SavLogs callback
5. Auth.js validates the token, creates an encrypted session cookie
6. The `roles` claim (App Roles) is copied into the session via the jwt callback
7. Subsequent requests carry the httpOnly session cookie; the backend reads roles from it
```

**App Registration (to be created later — NOT in this repo):**

- Single tenant (`cac58ef5-e1ea-4641-9663-a6d848ad392f`).
- Redirect URI: `https://<savlogs-host>/api/auth/callback/microsoft-entra-id`
  (and `http://localhost:3000/api/auth/callback/microsoft-entra-id` for dev).
- **App Roles** defined on the app: `Admin`, `Developer`, `QA`, `Support`, `Viewer`.
- Assign roles via Enterprise Application → Users and groups (prefer Entra **groups**).
- The `roles` claim then arrives in the token and is read by the backend.

**Why Auth.js over raw MSAL for the MVP:** less boilerplate, encrypted cookie sessions out of the
box, first-class App Router support. MSAL Node remains a valid alternative if you later need
on-behalf-of flows; not needed here because SavLogs uses its **own** identity to read logs.

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

**Minimum permission to grant later (NOT in this repo):** the SavLogs managed identity needs
**`Log Analytics Reader`** scoped **only** to `law-savvly-dev-main` — never subscription-wide,
never `Contributor`.

**KQL safety:** the workspace GUID is fixed by env. The app name comes from a hard-coded
allowlist. Free-text search is escaped (`\` and `"`) before being placed in a `contains` clause.
Time range is an enum (`1h | 24h | 7d`) mapped to SDK `Durations`, never a raw user string.

---

## 9. Recommended UI (shadcn/ui, modern minimalist pixel font)

**Stack:** Tailwind CSS + **shadcn/ui** (Radix primitives), dark-first.

**Font direction — "modern minimalist pixel":**

- **Brand / headings / KPIs:** [`Departure Mono`](https://departuremono.com/) — a modern pixel
  monospace that reads as clean and terminal-like without being retro-noisy. (Self-host the `.woff2`.)
- **Log body / tables / code:** `Geist Mono` (or `JetBrains Mono`) for maximum readability of long
  log lines — pixel fonts hurt readability at small sizes, so the pixel face is reserved for chrome,
  not the log payload.
- Alternative all-pixel option if you want stronger character: `Pixelify Sans` (Google Fonts) for
  headings only.

**Layout**

```
┌───────────────────────────────────────────────────────────────┐
│  SAVLOGS                                  ▢ marlon@savvly.com ▾ │   ← topbar (pixel wordmark)
├───────────────┬───────────────────────────────────────────────┤
│  App          │  [ Search… ]  [ 1h | 24h | 7d ]  [ Errors only]│   ← filter bar
│  ◉ ca-data-api│ ───────────────────────────────────────────────│
│  ○ ca-dashboard│  10:42:01  ca-data-api  INFO  request handled │
│  ○ ca-onboard.│  10:42:00  ca-data-api  ERROR timeout calling… │   ← virtualized log table
│  ○ ca-admin   │  10:41:58  ca-data-api  WARN  retry 2/3        │
│  (role-gated) │  …                                             │
└───────────────┴───────────────────────────────────────────────┘
```

**Components (shadcn/ui):** `Sidebar`/nav, `Input` (search), `ToggleGroup` (time range),
`Switch` (errors-only), `Badge` (log level, color-coded), `Table` + TanStack Virtual (log rows),
`Sheet`/`Dialog` (row detail with full masked payload), `Sonner` (toasts), `Skeleton` (loading),
`DropdownMenu` (user menu / sign-out).

**UX rules**

- Monospace log lines, level color-coded (`ERROR` red, `WARN` amber, `INFO` muted).
- App switcher only shows apps the user's role may read.
- Empty state explains the 30-day retention limit.
- A small "masked" indicator on rows so users know redaction is applied (except Admin raw mode).

---

## 10. Security rules

### No credentials in the frontend
- All Azure/Entra secrets live in **server-only** env vars and server code.
- The browser only ever receives an **httpOnly, secure** session cookie (Auth.js).
- Workspace GUID, client secret, managed-identity id are **never** sent to the client and never
  prefixed with `NEXT_PUBLIC_`.

### Masking of sensitive data
- Server-side redaction applied to **every** returned row, in `src/lib/masking.ts`, before the
  response leaves the server.
- Patterns: emails, JWTs (`eyJ…`), `Bearer` tokens, credit-card-like numbers, SSNs,
  `password`/`secret`/`apikey`/`token` key-value pairs, long base64-ish secrets, AWS keys (`AKIA…`).
- Only **Admin** in explicit "raw mode" bypasses masking — and that action is audited with a
  distinct event type.

### Audit log of searches
- Every search emits a structured event: `actor` (UPN + oid), `role`, `app`, `timeRange`,
  `query` (escaped text), `errorsOnly`, `rawMode`, `rowCount`, `timestamp`, `requestId`.
- MVP sink: structured JSON to **stdout** (captured by Container Apps → `ContainerAppConsoleLogs_CL`
  under the `ca-savlogs` app). Upgrade path: dedicated table (Postgres/Supabase) for tamper-evident
  retention.

### Rate limiting
- Per-user fixed-window limiter (e.g. 30 searches / minute) in `src/lib/rate-limit.ts`.
- MVP: in-memory (single instance). Production multi-instance: move to Redis (a Redis Cache SP
  already exists in the subscription) or Azure Cache for Redis.
- On limit: HTTP 429 + `Retry-After`, and an audit event of type `rate_limited`.

### Additional
- CSRF handled by Auth.js for auth routes; mutations use POST + same-site cookies.
- Strict CSP + security headers in `next.config`/middleware.
- KQL is read-only by construction (no `.create`/`.set`/external calls); app name allowlisted;
  input escaped to prevent KQL injection.

---

## 11. Required environment variables

See `.env.example`. Summary:

| Variable | Scope | Example / source |
|---|---|---|
| `AUTH_SECRET` | server | `openssl rand -base64 32` |
| `AUTH_URL` | server | `http://localhost:3000` (dev) / `https://<host>` |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | server | App Registration (client) ID — created later |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | server | App Registration client secret — created later |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | server | `https://login.microsoftonline.com/cac58ef5-e1ea-4641-9663-a6d848ad392f/v2.0` |
| `AZURE_TENANT_ID` | server | `cac58ef5-e1ea-4641-9663-a6d848ad392f` |
| `AZURE_LOG_ANALYTICS_WORKSPACE_ID` | server | `e583009c-5c01-4d42-a46a-3c771e087f5d` |
| `AZURE_MANAGED_IDENTITY_CLIENT_ID` | server (prod only) | user-assigned MI client id — created later |
| `ALLOWED_CONTAINER_APPS` | server | `ca-data-api,ca-dashboard,ca-onboarding,ca-admin` |
| `RATE_LIMIT_PER_MINUTE` | server | `30` |

> No `NEXT_PUBLIC_*` secrets. Everything above is server-only.

---

## 12. Recommended libraries

| Concern | Library |
|---|---|
| Framework | `next` (App Router) + `react`, `react-dom` |
| Language | `typescript` |
| Auth (Entra ID OIDC) | `next-auth@beta` (Auth.js v5), provider `microsoft-entra-id` |
| Azure log queries | `@azure/monitor-query`, `@azure/identity` |
| UI | `tailwindcss`, `shadcn/ui` (Radix), `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge` |
| Tables / virtualization | `@tanstack/react-table`, `@tanstack/react-virtual` |
| Validation | `zod` (validate query params + env) |
| Toasts | `sonner` |
| Dates | `date-fns` |
| Lint/format | `eslint`, `prettier` |

Optional later: `ioredis` (distributed rate limit), `@upstash/ratelimit`, a Postgres client for
durable audit.

---

## 14. Technical risks of the MVP

1. **30-day retention.** Anything older is gone; not a SavLogs bug. Surface it in the UI; consider
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
   workspace SavLogs reads. Acceptable for MVP, but a tamper-resistant separate store is better.

---

## Out of scope for this MVP (explicitly)

- Staging / production workspaces (`law-savvly-dev-ta`, `workspace-rgsavvlyshareds8yX`).
- Any Azure resource creation (App Registration, Managed Identity, role assignment, deploy) —
  documented here, executed separately by an operator.
- Alerting, saved searches, dashboards, multi-tenant. Iterate after MVP.
