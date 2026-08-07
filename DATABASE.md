# Database Schema & Prisma Reference

The platform uses **PostgreSQL** managed through **Prisma ORM**.

---

## Entity Relationship Summary

```
Guild (1) ─── (1) GuildSettings
Guild (1) ─── (1) ChannelConfiguration
Guild (1) ─── (N) RoleConfiguration
Guild (1) ─── (N) Application ─── (N) ApplicationHistory
Guild (1) ─── (N) AuditLog
Guild (1) ─── (N) StaffPermission
Guild (1) ─── (N) EmbedConfig
User (1)  ─── (N) Session
```

---

## Table Models Breakdown

| Table | Description | Primary Key |
|---|---|---|
| `Guild` | Discord Guild metadata & owner reference | `id` (Discord Guild ID) |
| `GuildSettings` | Server rule toggles (cooldowns, DMs, screenshots, single pending) | `id` (CUID) |
| `ChannelConfiguration` | Mappings for Request, Review, and Log channels | `id` (CUID) |
| `RoleConfiguration` | Requestable rank roles, order, min rank requirement | `id` (CUID) |
| `Application` | Member application details (IGN, ID, rank, status, screenshot URL) | `id` (CUID) |
| `ApplicationHistory` | Timeline audit of status changes (Pending -> Approved/Rejected) | `id` (CUID) |
| `AuditLog` | Platform action log with JSON payload | `id` (CUID) |
| `StaffPermission` | High Command and Role Request Manager role bindings | `id` (CUID) |
| `EmbedConfig` | Custom panel embed styling and button configurations | `id` (CUID) |
| `User` | Web dashboard OAuth user accounts | `id` (CUID) |
| `Session` | Active web authentication tokens | `id` (CUID) |

---

## Useful Prisma Commands

```bash
# Generate Prisma Client after schema changes
npm run db:generate

# Push schema directly to database (development)
npm run db:push

# Run seed script
npm run db:seed
```
