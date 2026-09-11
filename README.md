# SMCore — Enterprise Discord Moderation & Server Management Platform

> Production-ready, multi-guild Discord moderation and server security platform built with Discord.js v14, Next.js 14 App Router, PostgreSQL, Prisma ORM, Redis, and TypeScript strict mode.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14.14-5865F2.svg)](https://discord.js.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14%20App%20Router-black.svg)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748.svg)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-7.0-DC382D.svg)](https://redis.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6.svg)](https://www.typescriptlang.org/)

---

## ⚡ Core Features

### 🛡️ 1. Complete Moderation Suite
- **Enforcement Commands**: `/ban`, `/unban`, `/kick`, `/timeout`, `/untimeout`, `/warn`, `/warnings`, `/clearwarnings`, `/purge`, `/lock`, `/unlock`, `/slowmode`, `/modhistory`, `/case`, `/raidmode`, `/note`.
- **Role Hierarchy & Self-Protection**: Enforces strict Discord role hierarchy checks. Server owners cannot be targeted, bot cannot target itself or higher roles, and staff cannot moderate members with equal or higher roles.
- **Warning Escalation Ladder**: Automated disciplinary progression when a member reaches strike thresholds (3 warnings $\to$ 1h timeout, 5 warnings $\to$ 24h timeout, 7 warnings $\to$ permanent ban).
- **Cases Ledger**: Every action generates an immutable database `ModerationCase` with auto-incrementing case numbers per guild, enforcing moderator accountability.

### 🤖 2. AutoMod & Security Engines
- **Anti-Spam Sliding Window**: Tracks message velocity in real-time, automatically timing out accounts triggering message burst or duplicate message thresholds.
- **Anti-Link & URL Filter**: Domain-level whitelisting and blacklisting, strict mode blocking all external links, and safe bypass for verified platforms (YouTube, Twitch, Discord).
- **Anti-Invite Blocker**: Scans and eliminates unauthorized `discord.gg` and discord invite links.
- **Mass Mention Protection**: Restricts max user/role mentions and prevents unauthorized `@everyone` and `@here` pings.
- **Anti-Raid Flood Engine**: Detects concurrent join spikes within configurable sliding windows, automatically locking down designated channels and triggering staff alerts.
- **Join Security & Quarantine**: Flags new accounts under minimum age requirements and blocks default avatar throwaways.

### 📡 3. 7-Category Dual Logging & Discord Forum Channels
- **7 Granular Event Categories**:
  1. `MEMBER` — Joins, leaves, role updates, nickname changes, avatar updates.
  2. `MODERATION` — Bans, kicks, timeouts, warnings, escalations, pardons.
  3. `VOICE` — Voice channel connects, disconnects, moves, deafen/mute states.
  4. `CHANNEL` — Channel creations, deletions, permission overwrites, lock states.
  5. `ROLE` — Role creation, deletion, permission modifications, role assignments.
  6. `MESSAGE` — Message edits, deletions, bulk purge operations.
  7. `SERVER` — Guild setting changes, vanity invite mutations, raid mode triggers.
- **Dual Destination Support**: Route each category to either standard **Text Channels** or native **Discord Forum Channels**.
- **Automated Forum Thread Management**: Four customizable forum thread modes:
  - `CATEGORY` — Persistent, auto-managed thread per category with automatic unarchiving.
  - `DAILY` — Daily log threads organized by date (`YYYY-MM-DD`).
  - `EVENT_TYPE` — Dedicated threads per specific event type.
  - `PER_CASE` — Standalone individual thread per disciplinary case.
- **Live Test Dispatch**: Verify bot permissions and webhook delivery directly from the dashboard via the **Test Log** feature.

### 💻 4. Dark-Mode Web Dashboard & RBAC
- **Multi-Guild Carl-Bot Style Switcher**: Seamlessly manage any Discord guild where you possess administrative permissions.
- **Role-Based Access Control (RBAC)**: Fine-grained staff role bindings allowing granular authorization (`VIEW_DASHBOARD`, `VIEW_MODERATION`, `WARN_MEMBERS`, `TIMEOUT_MEMBERS`, `KICK_MEMBERS`, `BAN_MEMBERS`, `VIEW_LOGS`, `MANAGE_LOGS`, `MANAGE_AUTOMOD`, `MANAGE_ANTIRAID`, `MANAGE_SETTINGS`).
- **Real-Time Analytics & Trend Charts**: 14-day daily moderation enforcement visualizer, KPI tracking, and CSV export.
- **Configuration Backup & Restore**: Full JSON schema export and import covering settings, staff roles, AutoMod rules, and log configurations.

---

## 🏗️ Project Architecture

```
SMcore/
├── apps/
│   ├── bot/                 # smcore-bot: Discord.js v14 Gateway Client & Slash Handlers
│   │   └── src/
│   │       ├── events/      # Discord Gateway event listeners (14 distinct event types)
│   │       ├── handlers/    # Slash command, button, and modal dispatchers
│   │       └── services/    # Moderation, AutoMod, AntiRaid, Hierarchy, RBAC, LogService
│   └── web/                 # smcore-dashboard: Next.js 14 App Router & REST API
│       ├── src/app/
│       │   ├── (dashboard)/ # Carl-bot style Dark Mode Dashboard (Dashboard, Mod Hub, Cases, Warnings, AutoMod, Channels, Logs, Staff, Settings)
│       │   └── api/         # REST API endpoints with Zod validation & RBAC guards
│       ├── src/components/  # UI design system tokens & reusable components
│       └── src/lib/         # Discord OAuth, RBAC service, and audit logger
├── packages/
│   └── database/            # @repo/database: Prisma ORM Schema & Zod Validators
│       └── prisma/schema.prisma
└── scripts/
    ├── test-moderation.js   # Automated unit test suite
    └── db-sync.js           # Automated Prisma client generation & sync
```

---

## 🚀 Getting Started

### 1. Installation
```bash
git clone https://github.com/SantoshM5050/SMcore.git
cd SMcore
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory (based on `.env.example`):
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smcore?schema=public"
REDIS_URL="redis://localhost:6379"
DISCORD_CLIENT_ID="YOUR_DISCORD_CLIENT_ID"
DISCORD_CLIENT_SECRET="YOUR_DISCORD_CLIENT_SECRET"
DISCORD_BOT_TOKEN="YOUR_DISCORD_BOT_TOKEN"
DISCORD_REDIRECT_URI="http://localhost:3000/api/auth/callback"
NEXTAUTH_URL="http://localhost:3000"
SESSION_SECRET="your-super-secret-random-key"
```

### 3. Database Initialization
```bash
npm run db:generate
npm run db:push
```

### 4. Running the Project
```bash
# Run both Web Dashboard & Discord Bot concurrently
npm run dev

# Or run individually:
npm run dev:web   # Next.js Dashboard on http://localhost:3000
npm run dev:bot   # Discord Bot Gateway Client
```

### 5. Verification & Tests
```bash
npm test          # Run moderation, escalation, anti-spam & hierarchy test suite
npm run lint      # Run strict TypeScript validation across workspaces
npm run build     # Production compilation check
```

---

## 🔒 Security & RBAC Matrix

| Permission Flag | Description |
| :--- | :--- |
| `VIEW_DASHBOARD` | Access web dashboard overview and server status |
| `VIEW_MODERATION` | Inspect case ledger, active punishments, and member history |
| `WARN_MEMBERS` | Issue warnings and revoke active warning strikes |
| `TIMEOUT_MEMBERS` | Apply and remove Discord communication timeouts |
| `KICK_MEMBERS` | Kick members from the Discord server |
| `BAN_MEMBERS` | Execute bans, unban accounts, and manage guild ban list |
| `VIEW_LOGS` | View server event logs and dashboard audit trail |
| `MANAGE_LOGS` | Configure 7-category log routing and Forum Channel destinations |
| `MANAGE_AUTOMOD` | Configure Anti-Spam, Anti-Link, Anti-Invite, and word filters |
| `MANAGE_ANTIRAID` | Configure join velocity detection, auto-lockdown, and quarantine |
| `MANAGE_SETTINGS` | Modify bot server settings, mute role, and channel states |

---

## 📜 License
MIT License. Engineered for enterprise gaming networks, community platforms, and large-scale Discord organizations.
