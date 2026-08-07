# Developer & Maintainer Guide

## Architectural Philosophy

The **Discord Role Request Management Platform** is engineered following clean architecture and modular monorepo design principles:

- **Strict Isolation**: `apps/bot` handles Discord Gateway events and interactions; `apps/web` handles Next.js App Router dashboard and REST API routes; `packages/database` manages Prisma ORM models.
- **Dynamic Configuration**: No hardcoded IDs. All role IDs, channel IDs, embed configs, staff permission levels, and server settings are stored in PostgreSQL.
- **Zero Slash Commands for Members**: Regular members interact exclusively through Discord Buttons, Select Menus, and Modals.

---

## Codebase Organization

```
e:\BOT/
├── apps/
│   ├── bot/                         # Discord.js v14 Gateway & Component Handlers
│   │   ├── src/handlers/            # buttonHandler, selectMenuHandler, modalHandler
│   │   ├── src/services/            # applicationService, embedService, logService, roleService
│   │   └── src/index.ts             # Bot entrypoint
│   └── web/                         # Next.js 14 Web Dashboard & REST API
│       ├── src/app/api/             # Guild, Application, Role, Channel, Staff, Embed, Settings, Analytics, Health REST APIs
│       ├── src/components/          # UI components (shadcn/ui inspired primitives, Live Embed Preview)
│       └── src/lib/                 # Prisma, Auth, Discord API, RBAC, Redis, RateLimiting
├── packages/
│   └── database/                    # Prisma Schema, Migrations, and Seed Scripts
├── docker-compose.yml               # Multi-container stack (PostgreSQL + Redis + Web + Bot)
└── Documentation/
```

---

## Local Development Workflow

```bash
# 1. Install dependencies
npm install

# 2. Setup Environment Variables
cp .env.example .env

# 3. Push Database Schema & Seed Data
npm run db:push
npm run db:seed

# 4. Run Development Applications
npm run dev:web   # Launches Next.js Web Dashboard on http://localhost:3000
npm run dev:bot   # Launches Discord Bot Service
```

---

## Testing & Quality Assurance

Run the test suite:
```bash
npm test
```
