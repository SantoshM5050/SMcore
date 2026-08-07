# Nexus Discord Bot – REST API Documentation

**Nexus Dashboard** exposes a secure REST API for server management, application auditing, role synchronization, embed panel deployment, and system analytics.

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
- `GET /api/guilds/:guildId/roles`: Returns live Discord roles and DB configuration.
- `PATCH /api/guilds/:guildId/roles`: Updates requestable status, enabled status, min rank requirements.
- `GET /api/guilds/:guildId/channels`: Returns live text channels for request, review, and log binding.
- `PATCH /api/guilds/:guildId/channels`: Updates bound channel IDs.

### Applications & Review API
- `GET /api/guilds/:guildId/applications`: Paginated list of applications with status filter (`PENDING`, `APPROVED`, `REJECTED`).
- `POST /api/guilds/:guildId/applications/:id/approve`: Approves application, grants Discord role, sends DM.
- `POST /api/guilds/:guildId/applications/:id/reject`: Rejects application with reason, updates embed, sends DM.
- `GET /api/guilds/:guildId/applications/:id/comments`: Returns internal staff comment thread.
- `POST /api/guilds/:guildId/applications/:id/comments`: Adds internal staff comment.

### Embed Builder API
- `GET /api/guilds/:guildId/embeds`: Returns embed panel configurations.
- `POST /api/guilds/:guildId/embeds`: Upserts panel embed configuration.
- `POST /api/guilds/:guildId/embeds/deploy`: Deploys or updates panel embed in target Discord channel.

### System & Health API
- `GET /api/health`: Returns system uptime, database latency, Redis connection, memory usage.
- `GET /api/guilds/:guildId/export`: Downloads JSON configuration backup.
- `POST /api/guilds/:guildId/import`: Restores server configuration from JSON backup.
