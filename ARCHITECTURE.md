# System Architecture & Technical Specification

## Overview

The Discord Role Request Management Platform follows a modular monorepo architecture designed for high throughput, maintainability, and strict security isolation.

```
                    ┌─────────────────────────┐
                    │    Discord End Users    │
                    └────────────┬────────────┘
                                 │
                Buttons, Select Menus, Modals
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Discord Bot Service   │
                    │    (Discord.js v14)     │
                    └────────────┬────────────┘
                                 │
                        Prisma Client ORM
                                 │
                                 ▼
┌──────────────────┐   Prisma   ┌─────────────────────────┐
│  Web Dashboard   │───────────▶│   PostgreSQL Database   │
│ (Next.js 14 App) │            │     (Audit & Apps)      │
└──────────────────┘            └─────────────────────────┘
```

---

## Key Components

### 1. Interactive Discord Bot (`apps/bot`)
- Built on `discord.js` v14 with Gateway Intents (`Guilds`, `GuildMembers`, `GuildMessages`, `DirectMessages`).
- Member interaction relies **100% on interactive components**:
  - `ButtonInteraction`: Triggering apply flow, staff inline approval.
  - `StringSelectMenuInteraction`: Dynamic role selection.
  - `ModalSubmitInteraction`: Submission of in-game IGN, ID, rank, and proof screenshot, or reviewer rejection modal.
- Zero hardcoded IDs: Reads requestable roles, review channels, and settings dynamically from PostgreSQL.

### 2. Next.js Web Dashboard (`apps/web`)
- Next.js 14 (App Router) using React 18, Tailwind CSS, TanStack Query, Zod.
- Discord OAuth2 session authentication with HTTP-only cookie tokens.
- Role-Based Access Control (RBAC):
  - **Administrator**: Full guild configuration, channel bindings, staff role mapping.
  - **High Command**: Approve/reject applications, manage requestable roles.
  - **Manager**: Review and resolve pending member applications.
- Live Embed Builder: Interactive canvas updating panel preview in real-time.

### 3. Shared Database Package (`packages/database`)
- Centralized Prisma ORM schema.
- Models: `Guild`, `GuildSettings`, `ChannelConfiguration`, `RoleConfiguration`, `Application`, `ApplicationHistory`, `AuditLog`, `StaffPermission`, `EmbedConfig`, `User`, `Session`.

---

## Application Submission Sequence Flow

1. **Member Clicks Apply** on Panel Embed in `#role-request` channel.
2. Bot verifies:
   - Is single pending application limit enabled? (If pending app exists -> block submission).
   - Is cooldown active? (If cooldown active -> block submission).
3. Bot replies with `StringSelectMenu` listing active requestable roles fetched from DB.
4. Member picks a role -> Bot presents `Modal` asking for:
   - In-Game Name (IGN)
   - In-Game ID / Hash
   - Current In-Game Rank
   - Screenshot Proof URL (Optional/Mandatory per guild settings)
5. Bot receives modal submission:
   - Saves record to PostgreSQL `Application` table with status `PENDING`.
   - Posts Review Embed into configured Staff Review Channel with `Approve` and `Reject` buttons.
   - Writes event to `AuditLog`.

---

## Staff Review Sequence Flow

### Approval Flow:
1. Staff member clicks `Approve` button on Review Embed or Web Dashboard.
2. System verifies Staff permissions (`High Command` or `Role Request Manager`).
3. Bot grants the target Discord role to the member via Discord API.
4. Application status updated to `APPROVED` in PostgreSQL.
5. Review Embed in Staff Channel updated to green badge showing reviewer info.
6. Automated DM sent to applicant notifying role grant.
7. Audit log recorded.

### Rejection Flow:
1. Staff member clicks `Reject` button -> Modal prompts for Rejection Reason.
2. Staff submits reason.
3. Application status updated to `REJECTED` in PostgreSQL with reason.
4. Review Embed updated to red badge showing reviewer info and reason.
5. Automated DM sent to applicant with reason.
6. Audit log recorded.
