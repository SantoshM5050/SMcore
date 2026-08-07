# Production Deployment Guide

This guide outlines containerized deployment using **Docker** and **Docker Compose** for production environments.

---

## 🐳 Docker Deployment

### 1. Prerequisites
- Linux Server (Ubuntu 22.04 LTS recommended)
- Docker & Docker Compose plugin installed (`docker compose version`)

### 2. Project Preparation
Clone project repository to target server:
```bash
git clone https://github.com/your-org/discord-role-request-platform.git /var/www/discord-role-platform
cd /var/www/discord-role-platform
```

### 3. Production Environment File
Create `.env` file with production credentials:
```bash
cat << 'EOF' > .env
POSTGRES_USER=prod_role_user
POSTGRES_PASSWORD=SuperSecurePassword123!
POSTGRES_DB=prod_discord_role_mgmt

DATABASE_URL="postgresql://prod_role_user:SuperSecurePassword123!@postgres:5432/prod_discord_role_mgmt?schema=public"

DISCORD_BOT_TOKEN="your_production_bot_token"
DISCORD_CLIENT_ID="your_production_client_id"
DISCORD_CLIENT_SECRET="your_production_client_secret"

NEXTAUTH_URL="https://roles.yourgamingdomain.com"
NEXTAUTH_SECRET="long-production-random-secret-key-32-chars"
NEXT_PUBLIC_APP_URL="https://roles.yourgamingdomain.com"

NODE_ENV=production
EOF
```

### 4. Build and Run Containers
```bash
docker compose up -d --build
```

Check status:
```bash
docker compose ps
```

Check container logs:
```bash
docker compose logs -f bot
docker compose logs -f web
```

---

## 🔒 Reverse Proxy & SSL Setup (Nginx + Certbot)

Sample Nginx block for SSL termination:
```nginx
server {
    server_name roles.yourgamingdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable SSL:
```bash
sudo certbot --nginx -d roles.yourgamingdomain.com
```
