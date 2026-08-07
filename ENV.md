# Environment Variables Reference

| Variable Name | Description | Required | Example / Default Value |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection URI | Yes | `postgresql://postgres:postgres@localhost:5432/discord_role_management?schema=public` |
| `DISCORD_BOT_TOKEN` | Discord Bot secret token from Developer Portal | Yes | `MTEyM...` |
| `DISCORD_CLIENT_ID` | Discord Application Client ID | Yes | `100000000000000000` |
| `DISCORD_CLIENT_SECRET` | Discord Application OAuth2 Client Secret | Yes | `abcdef12345...` |
| `NEXTAUTH_URL` | Base URL of the web dashboard | Yes | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret key for signing session tokens (min 32 chars) | Yes | `super-secret-random-key` |
| `NEXT_PUBLIC_APP_URL` | Public application URL accessible by web browser | Yes | `http://localhost:3000` |
| `PORT` | Web server listening port | No | `3000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | Yes | `development` |
