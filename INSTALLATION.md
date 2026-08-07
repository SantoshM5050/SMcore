# Installation & Setup Guide

## System Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14.0 or higher
- **Git**

---

## Step-by-Step Installation

### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/discord-role-request-platform.git
cd discord-role-request-platform
```

### Step 2: Install Workspace Dependencies
```bash
npm install
```

### Step 3: Configure Discord Bot Application
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and enter a name (e.g., `Role Request Manager`).
3. Navigate to **Bot** tab:
   - Click **Reset Token** and copy your token.
   - Enable **Privileged Gateway Intents**:
     - `Server Members Intent`
     - `Message Content Intent`
4. Navigate to **OAuth2** tab:
   - Copy **Client ID** and **Client Secret**.
   - Add Redirect URI: `http://localhost:3000/api/auth/callback` (or your production URL).
5. Invite Bot to your Server using URL Generator:
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Manage Roles`, `Send Messages`, `Embed Links`, `Read Message History`, `View Channels`.

### Step 4: Environment Variables Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/discord_role_management?schema=public"
DISCORD_BOT_TOKEN="your_actual_bot_token"
DISCORD_CLIENT_ID="your_client_id"
DISCORD_CLIENT_SECRET="your_client_secret"
NEXTAUTH_SECRET="min-32-characters-random-secret-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Step 5: Initialize Database Schema
```bash
# Push schema to PostgreSQL
npm run db:push

# Generate Prisma Client
npm run db:generate

# Seed sample gaming server data
npm run db:seed
```

### Step 6: Start Development Environment
```bash
# Terminal 1: Run Next.js Web Dashboard
npm run dev:web

# Terminal 2: Run Discord Bot Service
npm run dev:bot
```

Open `http://localhost:3000` in your web browser to log in with Discord.
