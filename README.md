# Marlowee Inspector

Internal web app to read application logs from Azure **Log Analytics** (`law-savvly-dev-main`)
for the Savvly container apps: `ca-data-api`, `ca-dashboard`, `ca-onboarding`, `ca-admin`.

- **Auth:** Microsoft Entra ID (OIDC) — no Auth0.
- **Log access:** the app's own **Managed Identity** (users never get Azure permissions).
- **Authorization:** App Roles (`Admin`, `Developer`, `QA`, `Support`, `Viewer`).
- **Scope (MVP):** Development subscription, single workspace `law-savvly-dev-main`.

> Full design: [`docs/MVP_TECHNICAL_PLAN.md`](docs/MVP_TECHNICAL_PLAN.md)

## Status

🚧 MVP scaffold. The Azure resources (App Registration, Managed Identity, `Log Analytics Reader`
role, deployment) are **documented but not yet created** — see the plan. This repo contains the
technical plan and starter source so the team can begin coding.

## Stack

Next.js (App Router) · TypeScript · Auth.js v5 (Microsoft Entra ID) · `@azure/monitor-query` +
`@azure/identity` · Tailwind + shadcn/ui.

## Getting started (local)

```bash
pnpm install
cp .env.example .env.local   # fill in the values
az login                     # local credential used to read the workspace
pnpm dev
```

Locally, log queries use your `az login` session (`DefaultAzureCredential`). In production a
user-assigned Managed Identity is used instead — set `AZURE_MANAGED_IDENTITY_CLIENT_ID`.

## Confirmed Azure facts (read-only discovery)

| Item | Value |
|---|---|
| Tenant | `cac58ef5-e1ea-4641-9663-a6d848ad392f` |
| Subscription (Development) | `6684ee99-767f-433f-a086-89cf2dafbaea` |
| Workspace `law-savvly-dev-main` | `e583009c-5c01-4d42-a46a-3c771e087f5d` (RG `rg-savvly-dev`, 30d retention) |
| Tables | `ContainerAppConsoleLogs_CL`, `ContainerAppSystemLogs_CL` |

## Security highlights

No secrets in the frontend · server-side masking of sensitive data · audit log of every search ·
per-user rate limiting · read-only allowlisted KQL. See the plan §10.

## Repository layout

```
docs/MVP_TECHNICAL_PLAN.md   full technical plan
src/auth.ts                  Auth.js v5 (Entra ID) config
src/middleware.ts            session guard
src/lib/authz.ts             App Role -> capabilities
src/lib/log-analytics.ts     LogsQueryClient + Managed Identity
src/lib/queries.ts           allowlisted KQL builder (escaped input)
src/lib/masking.ts           server-side redaction
src/lib/audit.ts             structured audit events
src/lib/rate-limit.ts        per-user limiter
src/app/api/logs/route.ts    search endpoint (authz + rate limit + mask + audit)
```
