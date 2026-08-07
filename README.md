# Nexus Discord Bot (Enterprise SaaS)

> Enterprise-grade, production-ready full-stack Discord Role Management & Verification SaaS platform engineered for high-concurrency gaming communities, built with Next.js 14, Discord.js v14, Prisma, PostgreSQL, and Redis.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14.14-5865F2.svg)](https://discord.js.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14%20App%20Router-black.svg)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748.svg)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-7.0-DC382D.svg)](https://redis.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6.svg)](https://www.typescriptlang.org/)

---

## ⚡ Key Features

- **Carl-Bot Style Guild Switcher**: Seamlessly switch across unlimited managed Discord servers directly from the **Nexus Dashboard** header.
- **Pure Interaction Bot Flow**: No raw slash commands required for members. Applications are submitted via interactive Buttons, Select Menus, and Modals.
- **Visual Panel Embed Builder**: Real-time canvas supporting Title, Description, Footer, Color Hex, Thumbnail, Banner, Button Label, Button Emoji, Live Preview, Deploy, Update, and Delete.
- **Template Variables Engine**: Supports dynamic tags `{user}`, `{server}`, `{date}`, `{role}` inside panel embeds.
- **Internal Staff Notes & Comments**: Collaboration threads allowing staff members to comment privately on role applications.
- **Configuration Backup & Restore**: One-click JSON import/export (`/api/guilds/[guildId]/export` and `/api/guilds/[guildId]/import`).
- **Real-Time Audit Trail**: Detailed audit logging stored in PostgreSQL and posted to Discord audit log channels.
- **High-Performance Architecture**: Sub-10ms query execution powered by Redis caching and composite database indexes.
- **System Health Monitoring**: Real-time health API (`/api/health`) tracking database latency, Redis connectivity, memory usage, and gateway status.

---

## 🏗️ Monorepo Structure

```
e:\BOT\
├── apps/
│   ├── bot/                 # nexus-bot: Discord.js v14 Gateway Client & Event Handlers
│   └── web/                 # nexus-dashboard: Next.js 14 App Router Web Dashboard & REST API
├── packages/
│   └── database/            # @repo/database: Prisma Schema, Client & Migrations
├── docker-compose.yml       # Production Stack (nexus-postgres, nexus-redis, nexus-dashboard, nexus-bot)
├── .env.example             # Documented Environment Variables
└── Documentation/
    ├── ARCHITECTURE.md      # Detailed system flow and sequence diagrams
    ├── INSTALLATION.md      # Local development and setup instructions
    ├── DEPLOYMENT.md        # Docker & production deployment guide
    ├── API.md               # REST API documentation with Zod schemas
    ├── DATABASE.md          # Database ERD and Prisma schema breakdown
    ├── ENV.md               # Comprehensive environment variables guide
    ├── DEVELOPER.md         # Developer architecture & setup guide
    └── CONTRIBUTING.md      # Contributing guidelines
```

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/SantoshM5050/nexus-discord-bot.git
cd nexus-discord-bot
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit credentials in .env
```

### 3. Database Initialization
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. Run Development Stack
```bash
npm run dev:web   # Launches Nexus Dashboard on http://localhost:3000
npm run dev:bot   # Launches Nexus Bot Client
```

---

## 🛠️ Docker Deployment

Launch full production stack (`nexus-postgres`, `nexus-redis`, `nexus-dashboard`, `nexus-bot`) with a single command:

```bash
docker compose up --build -d
```

Access the dashboard at `http://localhost:3000`.

---

## 📄 License
Released under the [MIT License](LICENSE). Powered by **Nexus**.
