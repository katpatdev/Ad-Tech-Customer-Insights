# RBAC & Multi-Tenancy

## Roles

| Role | Access |
|------|--------|
| Admin | All tenants (platform admin), flags, audit, connectors |
| Agency Manager | Full tenant analytics, AI, connectors (read), regenerate |
| Analyst | Analytics + AI chat/insights (no admin writes) |
| Guest | Read-only Executive + Campaigns |

## Tenancy

- Users belong to one `tenant_id`.
- Queries filter by tenant unless Admin explicitly manages global resources.
- Demo tenants: **Apex Agency**, **Nova Digital** — switch logins to prove isolation.

## Audit

Login, logout, CSV ingest, flag changes, and AI regenerate write to `audit_logs`.
