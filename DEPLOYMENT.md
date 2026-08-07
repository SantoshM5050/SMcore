# Nexus Discord Bot – Production Deployment Guide

Guide for deploying **Nexus Discord Bot** in production using Docker Compose.

## Container Architecture

| Service Name | Image / Build | Port Mapping | Container Name |
|---|---|---|---|
| PostgreSQL | `postgres:15-alpine` | `5432:5432` | `nexus-postgres` |
| Redis | `redis:7-alpine` | `6379:6379` | `nexus-redis` |
| Dashboard | `Dockerfile.web` | `3000:3000` | `nexus-dashboard` |
| Bot Client | `Dockerfile.bot` | Internal Gateway | `nexus-bot` |

---

## Production Deployment Steps

### 1. Provision Server Environment
Ensure Docker and Docker Compose are installed on your Linux VPS (Ubuntu 22.04 LTS recommended).

### 2. Clone Repository
```bash
git clone https://github.com/SantoshM5050/nexus-discord-bot.git /var/www/nexus
cd /var/www/nexus
```

### 3. Create Environment File
```bash
cp .env.example .env
# Edit production credentials
nano .env
```

### 4. Build and Start Stack
```bash
docker compose up --build -d
```

### 5. Check Container Health
```bash
docker compose ps
docker compose logs -f
```
