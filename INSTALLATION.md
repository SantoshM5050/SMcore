# Nexus Discord Bot – Installation Guide

Follow this step-by-step guide to install and run **Nexus Discord Bot** locally on Windows, macOS, or Linux.

## Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14 or higher (or via Docker)
- **Redis**: v6 or higher (or via Docker)

---

## Step 1: Clone Repository & Install Dependencies

```bash
git clone https://github.com/SantoshM5050/nexus-discord-bot.git
cd nexus-discord-bot
npm install
```

---

## Step 2: Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your `.env` parameters:
- `DATABASE_URL`: `postgresql://postgres:postgres@localhost:5432/nexus?schema=public`
- `DISCORD_CLIENT_ID`: Your application ID from Discord Developer Portal
- `DISCORD_CLIENT_SECRET`: Your client secret
- `DISCORD_BOT_TOKEN`: Your bot token

---

## Step 3: Database Synchronization

Generate Prisma client and push schema to PostgreSQL:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

---

## Step 4: Launch Local Servers

In terminal 1 (Dashboard):
```bash
npm run dev:web
```

In terminal 2 (Bot Client):
```bash
npm run dev:bot
```

Open `http://localhost:3000` to access **Nexus Dashboard**.
