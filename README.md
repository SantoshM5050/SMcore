# SMCore

> **SMCore** is an enterprise-grade Discord moderation and community management platform designed for high-scale servers. Built with a modular npm workspaces monorepo architecture, SMCore pairs a robust Discord.js v14 bot runtime with a modern Next.js management dashboard.

---

## 🏛️ Monorepo Architecture

```
SMCore/
├── apps/
│   ├── bot/                 # Discord.js v14 Bot service
│   └── web/                 # Next.js App Router Dashboard
├── packages/
│   ├── database/            # Prisma ORM & PostgreSQL client singleton
│   └── shared/              # Cross-package TypeScript types, enums & schemas
├── docs/
│   ├── ARCHITECTURE.md      # Detailed system architecture & design decisions
│   └── DEVELOPMENT.md       # Development workflows & standards
├── stitch/                  # Approved Stitch Precision Dark UI reference
├── docker-compose.yml       # Local PostgreSQL 16 & Redis 7 services
├── .env.example             # Configuration template
└── package.json             # Root npm workspaces configuration
```

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (>= 18.0.0, tested on v24)
- **Monorepo**: npm workspaces
- **Language**: TypeScript 5.3+ (Strict Mode)
- **Database**: PostgreSQL 16 via Prisma ORM
- **Cache & Queues**: Redis 7
- **Bot Engine**: Discord.js v14, Zod, Pino logger
- **Web App**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide React
- **Design System**: *Stitch Precision Dark* (Linear / Raycast aesthetic)

---

## 🚀 Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (>= 18.0.0) & npm (>= 9.0.0)
- [PostgreSQL](https://www.postgresql.org/) (or Docker for `docker compose up -d`)
- Discord Application Token & Client ID from [Discord Developer Portal](https://discord.com/developers/applications)

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Database Setup

When PostgreSQL is running:

```bash
# Generate Prisma Client
npm run db:generate

# Push schema directly to database (development)
npm run db:push

# Or run Prisma migrations
npm run db:migrate
```

### 5. Running in Development

```bash
# Run both bot and dashboard concurrently
npm run dev

# Or run separately:
npm run dev:bot    # Discord bot runtime
npm run dev:web    # Next.js web dashboard (http://localhost:3000)
```

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts development server |
| `npm run build` | Builds all packages (`shared`, `database`) and apps (`bot`, `web`) |
| `npm run lint` | Type-checks and lints all workspaces |
| `npm test` | Runs test suites across workspaces |
| `npm run db:generate` | Generates Prisma client from schema |
| `npm run db:push` | Pushes Prisma schema to development database |
| `npm run db:migrate` | Runs Prisma database migrations |
| `npm run db:studio` | Opens Prisma Studio GUI |

---

## 🛡️ License

Private & Proprietary. All rights reserved.
