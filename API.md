# REST API Documentation

All API endpoints are hosted under `/api/`. Validation is enforced using **Zod** schemas.

---

## Authentication Endpoints

### `GET /api/auth/login`
- Initiates Discord OAuth2 authorization redirect.

### `GET /api/auth/callback`
- Handles OAuth code exchange, creates session in PostgreSQL, and sets HTTP-only session cookie.

### `GET /api/auth/me`
- Returns active session user profile.
- **Response**: `{ authenticated: boolean, user: UserObject }`

### `POST /api/auth/logout`
- Destroys active session cookie.

---

## Applications API

### `GET /api/guilds/:guildId/applications`
- Returns paginated list of role request applications.
- **Query Parameters**:
  - `status`: `PENDING` | `APPROVED` | `REJECTED`
  - `roleId`: string
  - `search`: string (matches IGN, Discord tag, or player ID)
  - `page`: integer (default 1)
  - `limit`: integer (default 10)

### `POST /api/guilds/:guildId/applications/:id/approve`
- Approves pending application, assigns Discord role via Bot API, updates status to `APPROVED`, sends DM.

### `POST /api/guilds/:guildId/applications/:id/reject`
- Rejects pending application.
- **Body**: `{ "reason": "Reason for rejection string" }`

---

## Role Configuration API

### `GET /api/guilds/:guildId/roles`
- Returns list of requestable Discord roles. Syncs with live Discord roles if Bot is active.

### `POST /api/guilds/:guildId/roles`
- Add or update a requestable role configuration.
- **Body**:
  ```json
  {
    "roleId": "200000000000000001",
    "roleName": "VALORANT Radiant",
    "roleColor": "#FF4655",
    "isRequestable": true,
    "enabled": true,
    "minRankRequired": "Radiant"
  }
  ```

---

## Channel Configuration API

### `GET /api/guilds/:guildId/channels`
- Returns list of Discord text channels and active configuration bindings.

### `POST /api/guilds/:guildId/channels`
- Update channel bindings.
- **Body**:
  ```json
  {
    "requestChannelId": "100000000000000001",
    "reviewChannelId": "100000000000000002",
    "logsChannelId": "100000000000000003"
  }
  ```

---

## Embed Builder API

### `GET /api/guilds/:guildId/embeds`
- Fetch active embed configuration.

### `POST /api/guilds/:guildId/embeds`
- Save panel embed configuration.

### `POST /api/guilds/:guildId/embeds/deploy`
- Triggers Discord Bot to deploy/update the panel message in the target channel.

---

## Settings & Analytics API

### `GET /api/guilds/:guildId/settings` & `PATCH /api/guilds/:guildId/settings`
- Fetch and update server rules (cooldowns, screenshot rules, DMs, logging).

### `GET /api/guilds/:guildId/analytics`
- Returns approval/rejection rates, daily submission series, top requested roles, and active staff reviewers.

### `GET /api/guilds/:guildId/logs`
- Paginated system audit logs.
