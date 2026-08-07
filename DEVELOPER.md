# Nexus Discord Bot – Developer Guide

Developer documentation for building, extending, and maintaining **Nexus Discord Bot**.

## Architecture & Code Philosophy

- **Clean Monorepo Boundaries**: `apps/bot` (`nexus-bot`), `apps/web` (`nexus-dashboard`), and `packages/database` (`@repo/database`).
- **No Hardcoded IDs**: All role IDs, channel IDs, embed options, and permissions are dynamically configured per guild in PostgreSQL.
- **Pure Interaction Bot Flow**: No slash commands for regular members. Discord Buttons, Select Menus, and Modals drive member workflows.

---

## Local Development Workflow

```bash
# 1. Install workspace dependencies
npm install

# 2. Setup Environment Variables
cp .env.example .env

# 3. Synchronize database
npm run db:generate
npm run db:push
npm run db:seed

# 4. Start local development
npm run dev:web
npm run dev:bot
```
