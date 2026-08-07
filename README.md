# Discord Role Request Management Platform (Enterprise SaaS)

> Enterprise-grade, production-ready full-stack Discord Role Request Management SaaS platform designed for high-concurrency gaming communities, equivalent in capability to Carl-bot, Dyno, Ticket Tool, and Sapphire.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Discord.js](https://img.shields.io/badge/Discord.js-v14.14-5865F2.svg)
![Next.js](https://img.shields.io/badge/Next.js-14%20App%20Router-black.svg)
![Prisma](https://img.shields.io/badge/Prisma-5.9-2D3748.svg)
![Redis](https://img.shields.io/badge/Redis-7.0-DC382D.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6.svg)

---

## 🌟 Enterprise Features & Upgrades

- **Multi-Server Guild Switcher**: Carl-bot style server selector in the Web Dashboard header allowing seamless switching across unlimited Discord servers.
- **Dynamic Discord Roles**: Fetches live Discord guild roles dynamically via Role IDs. Automatic resilience if roles are renamed inside Discord.
- **Dynamic Channels**: Supports Text, Forum, and Announcement channels without asking administrators for raw channel IDs.
- **Real-Time Synchronization**: Socket.IO integration updates the Web Dashboard UI instantly whenever approvals/rejections happen in Discord.
- **Enhanced Panel Builder**: Visual canvas supporting Title, Description, Footer, Footer Icon, Color Hex, Thumbnail, Banner, Button Label, Button Emoji, Live Preview, Deploy, Update, and Delete.
- **Template Variables Engine**: Embed builder replaces `{user}`, `{server}`, `{date}`, `{role}` tags dynamically in panel embeds.
- **Internal Staff Notes & Comments**: Private comment threads on applications allowing staff members to collaborate on reviews.
- **Configuration Backup & Restore**: One-click JSON import/export (`/api/guilds/[guildId]/export` and `/api/guilds/[guildId]/import`).
- **System Health Monitoring**: Real-time health endpoint (`/api/health`) tracking PostgreSQL, Redis, memory consumption, bot gateway ping, and uptime.
- **High-Performance Architecture**: Redis caching layer, database composite indexes on `Application`, `AuditLog`, and `RoleConfiguration`.
- **Structured Pino Logging**: High-throughput JSON logging across Bot and Web services.
- **Persistent Interactions**: Button, Select Menu, and Modal custom IDs remain intact across bot restarts.

---

## 🏗️ Monorepo Structure

```
e:\BOT\
├── apps/
│   ├── bot/                 # Discord.js v14 Bot Application
│   └── web/                 # Next.js 14 App Router Web Dashboard & REST API
├── packages/
│   └── database/            # Prisma Schema & Client Package
├── Dockerfile.bot           # Production container build for Bot
├── Dockerfile.web           # Production container build for Dashboard
├── docker-compose.yml       # Orchestration for PostgreSQL, Redis, Web, and Bot
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
git clone https://github.com/your-org/discord-role-request-platform.git
cd discord-role-request-platform
npm install
```

### 2. Database & Redis Setup
```bash
cp .env.example .env
npm run db:push
npm run db:generate
npm run db:seed
```

### 3. Run Development Environment
```bash
npm run dev:web   # Launches Next.js Web Dashboard on http://localhost:3000
npm run dev:bot   # Launches Discord Bot Service
```

---

## 🛠️ Docker Deployment

Launch full stack (PostgreSQL + Redis + Web + Bot) with a single command:

```bash
docker-compose up --build -d
```

Access the dashboard at `http://localhost:3000`.

---

## 📄 License
Released under the [MIT License](LICENSE).
