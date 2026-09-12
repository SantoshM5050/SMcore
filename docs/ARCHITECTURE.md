# SMCore — System Architecture & Design Specification

## 1. Executive Architecture Summary

SMCore is an enterprise-grade, multi-tenant Discord moderation, automation, and community operations platform. It combines a Discord.js v14 Gateway bot application with a modern Next.js App Router dashboard, powered by PostgreSQL (via Prisma ORM) and Redis.

```
                         SMCore Platform
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
          Discord Bot                     Web Dashboard
         (apps/bot)                        (apps/web)
       Discord.js v14                 Next.js App Router
                │                               │
                └───────────────┬───────────────┘
                                │
                         Shared Core
                     (@smcore/shared)
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
           PostgreSQL                         Redis
      (@smcore/database)               (Rate limits & Cache)
    Configurations & History               State & Queues
```

---

## 2. Core Architectural Principles

1. **Discord is the Source of Truth for Live State**:
   - Guild structures, active roles, channels, permissions, voice states, and member lists are resolved from Discord live.
   - PostgreSQL stores application configuration, moderation cases, warning escalations, tickets, audit logs, and analytics.

2. **Dashboard-First Configuration**:
   - All complex server features are managed from the Web Dashboard.
   - Slash commands are optimized for fast staff intervention (`/warn`, `/timeout`, `/ban`, `/kick`, `/case`).

3. **Multi-Tenant Guild Isolation**:
   - Every table in PostgreSQL references a primary `guildId`.
   - Security policies and composite unique keys strictly prevent cross-guild data leakage.

4. **Strict Hierarchy & Permission Enforcement**:
   - Guild Owner cannot be moderated.
   - SMCore Bot cannot moderate targets with roles equal to or higher than its own highest role.
   - Moderators cannot enforce actions on targets with roles equal to or higher than their own.

---

## 3. Monorepo Structure

```
SMCore/
│
├── apps/
│   ├── bot/                 # Discord.js v14 Gateway Client
│   └── web/                 # Next.js 14 App Router SaaS Dashboard
│
├── packages/
│   ├── database/            # Prisma Client, PostgreSQL schema, migrations
│   └── shared/              # Shared types, Zod schemas, constants, utilities
│
├── docs/
│   ├── ARCHITECTURE.md      # Platform Architecture & Component Map
│   └── DEVELOPMENT.md       # Local Development & Workflow Setup
│
├── stitch/                  # Approved Stitch UI Design Reference
│
├── .env                     # Local Environment Secrets (Untracked)
├── .env.example             # Documented Environment Variables Template
├── .gitignore               # Strict Git Exclusions
├── docker-compose.yml       # Local PostgreSQL 16 & Redis Services
├── package.json             # Root NPM Workspaces Configuration
├── tsconfig.json            # Base TypeScript Configuration
└── README.md                # Project Overview & Setup Instructions
```

---

## 4. Component Breakdown

### 4.1. `@smcore/database` (`packages/database`)
- **Engine**: Prisma ORM with PostgreSQL 16.
- **Initial Foundation**:
  - `Guild`: Primary multi-tenant entity representing a Discord server.
  - `GuildSettings`: Global bot prefixes, timezone, default modules toggle.
- **Subsequent Planned Domains**:
  - Moderation Cases & Warnings (`Case`, `Warning`, `EscalationRule`).
  - AutoMod & Anti-Raid (`AutoModConfig`, `SpamTracker`).
  - Ticketing System (`Ticket`, `TicketPanel`, `TicketMessage`).
  - Audit Logs & Dispatch (`LogConfiguration`, `AuditLog`).

### 4.2. `@smcore/shared` (`packages/shared`)
- Universal TypeScript interfaces, enums, constants, and Zod schemas shared across `bot` and `web`.
- No heavy Discord runtime dependencies in shared.

### 4.3. `smcore-bot` (`apps/bot`)
- **Runtime**: Node.js with TypeScript and Discord.js v14.
- **Intents Strategy**:
  - Foundation: Standard Gateway intents (`Guilds`, `GuildMessages`, `DirectMessages`).
  - Privileged Intents (`GuildMembers`, `MessageContent`, `GuildPresences`) configured explicitly and handled with fallback resilience if unverified.
- **Logging**: High-performance structured logging with Pino.

### 4.4. `smcore-web` (`apps/web`)
- **Framework**: Next.js 14 App Router, React 18, Tailwind CSS, Lucide React.
- **Design System**: Derived from Stitch approved reference (`stitch/smcore_precision_dark`).
  - Dark-first precision palette (`#121318` background, `#1e1f25` surface containers).
  - Typography: Plus Jakarta Sans (headings/metrics), Inter (body/controls), JetBrains Mono (technical identifiers).
  - Accent Tokens: Indigo primary, Emerald success, Amber warning, Rose danger.
