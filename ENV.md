# Nexus Discord Bot – Environment Variables Guide

Detailed specification for all environment variables used by **Nexus Discord Bot** (`nexus-bot` & `nexus-dashboard`).

| Variable | Description | Required | Default Value |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://postgres:postgres@localhost:5432/nexus?schema=public` |
| `REDIS_URL` | Redis cache connection string | Yes | `redis://localhost:6379` |
| `NODE_ENV` | Environment mode (`development` / `production`) | Yes | `development` |
| `DISCORD_CLIENT_ID` | Discord Application Client ID | Yes | None |
| `DISCORD_CLIENT_SECRET` | Discord Application Client Secret | Yes | None |
| `DISCORD_BOT_TOKEN` | Discord Bot Authentication Token | Yes | None |
| `DISCORD_REDIRECT_URI` | OAuth2 Redirect Callback URI | Yes | `http://localhost:3000/api/auth/callback` |
| `SESSION_SECRET` | Secret key for HTTP-only cookie encryption | Yes | Min 32 random characters |
