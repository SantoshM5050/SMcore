# SMCore — Development Guide

## 1. Prerequisites

- **Node.js**: v18.0.0+ (Tested with Node v24.19.0)
- **npm**: v9.0.0+ (Tested with npm 11.17.0)
- **PostgreSQL**: PostgreSQL 16+ (or via Docker Compose)
- **Redis**: Redis 7+ (optional for basic local dev, recommended for production rate limits)
- **Discord Developer Application**: With Bot Token & OAuth2 Client Secret.

---

## 2. Environment Configuration

Copy `.env.example` to `.env` if not already present:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://smcore:smcore_dev_password@localhost:5432/smcore?schema=public`) |
| `REDIS_URL` | Redis cache connection string (`redis://localhost:6379`) |
| `NODE_ENV` | Mode (`development` / `production`) |
| `PORT` | Bot health server port (default `3001`) |
| `DISCORD_BOT_TOKEN` | Discord Bot Authentication Token |
| `DISCORD_CLIENT_ID` | Discord Application ID |
| `DISCORD_CLIENT_SECRET` | Discord Application OAuth2 Secret |
| `DISCORD_REDIRECT_URI` | Dashboard OAuth2 Callback URL |
| `NEXTAUTH_URL` | Dashboard base URL (`http://localhost:3000`) |
| `SESSION_SECRET` | Min 32-character secret for dashboard session encryption |

---

## 3. Local Development Workflows

### Starting Database & Redis (with Docker)

```bash
docker compose up -d
```

### Initializing Database Schema

```bash
npm run db:generate
npm run db:push
```

### Launching Services

```bash
# Terminal 1: Next.js Dashboard
npm run dev --workspace=apps/web

# Terminal 2: Discord Bot Client
npm run dev --workspace=apps/bot
```

---

## 4. Code Quality & Standards

- **TypeScript Strict Mode**: Enforced in all packages and applications.
- **Linting & Formatting**: Run `npm run lint` before committing changes.
- **Git Commit Standards**: Follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
