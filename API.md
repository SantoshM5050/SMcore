# SMCore Discord Bot – REST API Documentation

**SMCore Dashboard** exposes a secure REST API for server management, event signups, welcome greeting automation, moderation logging, Grand RP promotion tracking, and system health.

All guild endpoints require Discord OAuth2 session cookies and administrator/staff permission validation (`RbacService`).

---

## Endpoint Index

### Auth API
- `GET /api/auth/login`: Redirects user to Discord OAuth2 authorization URL.
- `GET /api/auth/callback`: Exchanges OAuth2 code for Discord user profile and sets session cookie.
- `GET /api/auth/me`: Returns active session user profile.
- `POST /api/auth/logout`: Clears session cookie.

### Guild API
- `GET /api/guilds`: Returns list of Discord guilds where user has Administrator permissions.
- `GET /api/guilds/:guildId`: Returns detailed settings, channels, and stats for a specific guild.

### Roles & Channels API
- `GET /api/guilds/:guildId/roles`: Returns live Discord roles synchronized with the database.
- `GET /api/guilds/:guildId/channels`: Returns live text channels for logging and notification binding.
- `PATCH /api/guilds/:guildId/channels`: Updates bound logging and operational channel IDs.

### Events & Signups API
- `GET /api/guilds/:guildId/events`: Returns active and historical event signups.
- `POST /api/guilds/:guildId/events`: Creates an on-demand event signup embed with main team and substitute rosters.
- `PATCH /api/guilds/:guildId/events`: Updates an existing event or closes/cancels signups.

### Welcome & Greetings API
- `GET /api/guilds/:guildId/welcome`: Returns welcome card and greeting embed configuration.
- `POST /api/guilds/:guildId/welcome`: Upserts welcome/goodbye channels, embeds, and auto-roles.

### Moderation API
- `GET /api/guilds/:guildId/moderation`: Returns guild moderation logs and active case history.
- `POST /api/guilds/:guildId/moderation`: Dispatches moderation actions (ban, kick, timeout, warn, purge).

### Grand RP Promotions API
- `GET /api/guilds/:guildId/promotions`: Returns promotion and demotion logs.
- `POST /api/guilds/:guildId/promotions`: Records promotion, demotion, or left-family logs with in-game details.

### Staff & Permissions API
- `GET /api/guilds/:guildId/staff`: Returns staff roles with assigned permission levels.
- `POST /api/guilds/:guildId/staff`: Grants staff permissions to a Discord role.
- `DELETE /api/guilds/:guildId/staff`: Revokes staff permissions from a Discord role.

### Analytics & System Health API
- `GET /api/guilds/:guildId/analytics`: Returns aggregated server actions, event statistics, and recent activity feed.
- `GET /api/health`: Returns system uptime, database latency, Redis connection, and gateway status.
- `GET /api/guilds/:guildId/export`: Downloads JSON configuration backup.
- `POST /api/guilds/:guildId/import`: Restores server configuration from JSON backup.
