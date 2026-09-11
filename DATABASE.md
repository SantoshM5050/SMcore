# SMCore Discord Bot – Database Architecture

Database schema documentation for **SMCore Discord Bot**. Managed via Prisma ORM 5.22 against PostgreSQL 15.

---

## Entity Relationship Summary

```mermaid
erDiagram
    Guild ||--o{ GuildSettings : has
    Guild ||--o{ ChannelConfiguration : has
    Guild ||--o{ RoleConfiguration : has
    Guild ||--o{ StaffPermission : configures
    Guild ||--o{ EventSignup : hosts
    Guild ||--o{ WelcomeConfig : configures
    Guild ||--o{ ModerationLog : tracks
    Guild ||--o{ PromotionLog : records
    Guild ||--o{ AuditLog : records
    EventSignup ||--o{ EventParticipant : contains
```

---

## Model Descriptions

- **Guild**: Stores registered Discord servers, owner IDs, and bot join timestamps.
- **GuildSettings**: Stores cooldowns, DMs, logging toggle, embed colors, timezone.
- **ChannelConfiguration**: Binds logging channels, moderation logs, voice logs, message logs, and promotion channels.
- **RoleConfiguration**: Synchronizes and caches Discord guild roles and display settings.
- **StaffPermission**: Grants administrative access tiers (e.g. `HIGH_COMMAND`) to roles for dashboard and bot management.
- **EventSignup**: Manages on-demand interactive event signups with main team and substitute rosters.
- **EventParticipant**: Tracks individual user signups for events as main team members or substitutes.
- **WelcomeConfig**: Configures welcome embeds, goodbye messages, welcome channel, and auto-roles for new members.
- **ModerationLog**: Records bans, kicks, timeouts, warnings, and purges executed via bot or dashboard.
- **PromotionLog**: Records Grand RP rank promotions, demotions, and left-family actions with in-game details.
- **AuditLog**: Comprehensive audit trail of all dashboard and system management actions.
