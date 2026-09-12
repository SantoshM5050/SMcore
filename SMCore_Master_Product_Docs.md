# SMCore --- Premium Discord Moderation & Community Management Bot

## Product & Engineering Specification --- From Scratch

### 1. Product Vision

SMCore is a premium, all-in-one Discord moderation and community
management platform inspired by the breadth of products such as Carl-bot
and Dyno, but designed with a modern web dashboard, deep per-server
customization, and a premium ticketing system.

**Important product decision:** Grand RP, gaming-roleplay workflows,
role-request workflows, event rosters, signup systems, and similar
domain-specific features are out of scope.

The product is a general-purpose Discord bot for: - Moderation - Auto
moderation - Anti-abuse/security - Logging - Tickets - Reaction/button
roles - Welcome/goodbye - Custom commands - Embeds and announcements -
Automations - Server configuration - Analytics - Staff tools - Premium
customization

The architecture must support multiple Discord servers (guilds), with
every guild having isolated configuration and data.

------------------------------------------------------------------------

# 2. Product Principles

1.  **Everything configurable**
    -   Avoid hardcoded channel IDs, role IDs, guild IDs, messages,
        colors, limits, or workflows.
    -   Server administrators configure behavior from the dashboard.
2.  **Discord is the source of live server state**
    -   Roles, channels, members, permissions, threads, and guild
        settings must be resolved from Discord.
    -   PostgreSQL stores application configuration, history, cases,
        tickets, and analytics.
3.  **Dashboard-first configuration**
    -   Complex configuration should not require commands.
    -   Commands remain useful for quick staff actions.
4.  **Permission safety**
    -   Enforce Discord permissions, bot hierarchy, moderator hierarchy,
        protected roles, and guild-owner protection.
5.  **Multi-guild isolation**
    -   No configuration or private staff data may leak between guilds.
6.  **Premium UX**
    -   Fast, polished, responsive, dark-first, clear navigation, strong
        empty/error/loading states.

------------------------------------------------------------------------

# 3. Recommended Architecture

``` text
                         SMCore Platform
                              |
              +---------------+---------------+
              |                               |
        Discord Bot                       Web Dashboard
        Discord.js v14                    Next.js App Router
              |                               |
              +---------------+---------------+
                              |
                         API / Services
                              |
             +----------------+----------------+
             |                |                |
        PostgreSQL           Redis        Object Storage*
             |                |                |
       Persistent data    Rate limits     Attachments
       & configuration    queues/cache    (optional)

* Use object storage only when attachment persistence is required.
```

Recommended monorepo:

``` text
apps/
  bot/
  web/

packages/
  database/
  shared/
  config/            # optional
  ui/                # optional shared UI components

docs/
  product.md
  architecture.md
  moderation.md
  ticketing.md
  logging.md
  automod.md
  dashboard.md
  deployment.md
```

------------------------------------------------------------------------

# 4. Technology Stack

### Bot

-   Node.js
-   TypeScript
-   Discord.js v14
-   Strict TypeScript
-   Pino logging
-   Zod validation

### Dashboard

-   Next.js App Router
-   TypeScript
-   React
-   Tailwind CSS
-   shadcn/ui or equivalent accessible component system
-   TanStack Query where useful
-   Lucide icons

### Data

-   PostgreSQL
-   Prisma ORM
-   Redis for temporary/high-frequency state

### Authentication

-   Discord OAuth2
-   Secure server-side sessions
-   CSRF protection where applicable

### Infrastructure

-   Docker
-   Docker Compose for local development
-   Environment-based configuration
-   CI build/test/lint pipeline

------------------------------------------------------------------------

# 5. Core Feature Modules

## A. Moderation

Required:

-   Ban
-   Unban
-   Kick
-   Timeout
-   Remove timeout
-   Warn
-   Warning history
-   Clear/revoke warnings
-   Warning escalation
-   Purge
-   Lock
-   Unlock
-   Slowmode
-   Nickname moderation
-   Role moderation
-   Mod history
-   Case management

Every moderation action should create a case where applicable.

Case fields: - Guild - Case number - Action - Target - Moderator -
Reason - Duration - Timestamp - Metadata - Status

------------------------------------------------------------------------

# 6. Warning & Escalation System

Administrators can configure rules such as:

``` text
3 warnings -> timeout 10m
5 warnings -> kick
7 warnings -> ban
```

Do not hardcode these values.

Support: - Active warnings - Revoked warnings - Warning expiration
(optional) - Escalation rules - Staff-only warning history

------------------------------------------------------------------------

# 7. AutoMod

Build a configurable AutoMod engine supporting:

-   Spam
-   Repeated messages
-   Repeated characters
-   Excessive caps
-   Excessive emojis
-   Mass messages
-   Blocked words
-   Custom regex rules
-   Links
-   Discord invites
-   Excessive mentions
-   @everyone
-   @here

Configurable actions: - Delete - Warn - Timeout - Kick - Ban - Alert
staff - Log

Allow: - Exempt roles - Exempt channels - Thresholds - Time windows -
Custom responses

------------------------------------------------------------------------

# 8. Anti-Abuse / Security

## Anti-Spam

Use sliding windows and Redis where appropriate.

## Anti-Link

-   Allowlist
-   Blocklist
-   Per-domain rules
-   Per-channel overrides

## Anti-Invite

Detect: - discord.gg/* - discord.com/invite/*

## Anti-Mention

Configure: - User mention limit - Role mention limit - @everyone - @here

## Anti-Raid

Detect join spikes.

Configurable: - Join threshold - Time window - Account-age threshold -
Quarantine role - Lockdown channels - Staff alert - Raid mode

Do not mass-ban users automatically unless explicitly configured.

------------------------------------------------------------------------

# 9. Complete Logging

Seven major categories:

1.  Member
2.  Moderation
3.  Voice
4.  Channel
5.  Role
6.  Message
7.  Server

### Member

-   Join
-   Leave
-   Nickname changes
-   Username/display-name changes
-   Role add/remove
-   Boost start/end
-   Avatar changes where available

### Moderation

-   Ban
-   Unban
-   Kick
-   Timeout
-   Warning
-   Purge
-   Lock/unlock
-   Slowmode
-   AutoMod actions
-   Security actions

### Voice

-   Join
-   Leave
-   Move
-   Server mute/unmute
-   Server deafen/undeafen
-   Stream/camera state where available

### Channel

-   Create
-   Delete
-   Update
-   Name
-   Topic
-   Category
-   Permission changes
-   Slowmode
-   NSFW

### Role

-   Create
-   Delete
-   Update
-   Permission changes
-   Position changes
-   Member role add/remove

### Message

-   Delete
-   Bulk delete
-   Edit

### Server

-   Name/icon
-   Verification changes
-   Important guild settings
-   Boost events

Use Discord Audit Logs to correlate the actor when necessary. Never
invent an actor when Discord cannot reliably identify one.

------------------------------------------------------------------------

# 10. Forum & Text Logging

Every log category can target:

-   Text channel
-   Forum channel

Forum thread strategies:

-   Category
-   Daily
-   Event type
-   Per moderation case

Support: - Automatic thread creation - Thread reuse - Archived thread
recovery - Deleted thread recovery - Duplicate prevention - Test log -
Configurable embeds

------------------------------------------------------------------------

# 11. Premium Ticketing System

Ticketing is a first-class feature, not a basic support command.

## Ticket Panel

Admins create panels from the dashboard.

Panel configuration: - Title - Description - Icon - Banner/image -
Button label - Button emoji - Button style - Ticket category - Support
roles - Transcript channel - Ticket naming pattern - Welcome message -
Auto-close rules - Claim system - Priority - Ticket type

Example:

``` text
🎫 Support
🛒 Purchase
🛡️ Report
🤝 Partnership
💬 General
```

Each button can create a different ticket workflow.

## Ticket Lifecycle

``` text
Panel
  -> Create Ticket
  -> Permission setup
  -> Welcome message
  -> Staff claim
  -> Conversation
  -> Close request
  -> Confirmation
  -> Transcript
  -> Archive/delete
```

## Ticket Features

-   Open
-   Close
-   Reopen
-   Claim
-   Unclaim
-   Add member
-   Remove member
-   Rename
-   Change category
-   Change priority
-   Add tags
-   Staff-only notes
-   User forms
-   Modal intake forms
-   Ticket reminders
-   Auto-close
-   Inactivity timer
-   Transcript
-   Export transcript
-   Close reason
-   Ticket logs

## Ticket Forms

Allow administrators to define custom questions:

-   Short text
-   Long text
-   Number
-   Choice/select
-   Required/optional

Example:

``` text
What is your Discord username?
What is the issue?
Order ID?
Upload/provide evidence?
```

The form configuration must be dynamic.

## Ticket Transcripts

Generate a readable transcript containing: - Ticket information -
Participants - Messages - Attachments metadata - Staff actions -
Open/close timestamps - Close reason

Provide configurable transcript destination.

Do not expose private transcripts to unauthorized dashboard users.

------------------------------------------------------------------------

# 12. Reaction / Button / Select Roles

Support modern role menus:

-   Button roles
-   Select-menu roles
-   Multiple selection
-   Single selection
-   Toggle roles
-   Role limits
-   Required role
-   Exclusive role groups

Dashboard builder: - Title - Description - Thumbnail - Image - Color -
Components - Roles - Channel - Permissions

------------------------------------------------------------------------

# 13. Welcome & Goodbye

Configurable per guild:

-   Welcome message
-   Goodbye message
-   Embed
-   Variables
-   Welcome channel
-   DM welcome
-   Auto-role
-   Member mention
-   Account information

Variables example:

``` text
{user}
{username}
{server}
{memberCount}
```

------------------------------------------------------------------------

# 14. Custom Commands

Allow administrators to create custom commands from the dashboard.

Support: - Slash commands where technically appropriate - Trigger-based
custom responses - Variables - Embed responses - Buttons/selects -
Staff-only commands - Cooldowns - Channel restrictions - Role
restrictions

Never allow arbitrary server-side code execution.

------------------------------------------------------------------------

# 15. Embed & Announcement Builder

Dashboard builder should support:

-   Title
-   Description
-   URL
-   Color
-   Author
-   Thumbnail
-   Image
-   Footer
-   Timestamp
-   Fields
-   Buttons
-   Select menus

Actions: - Preview - Save - Send - Schedule - Duplicate - Edit

------------------------------------------------------------------------

# 16. Automations

Build a generic automation framework.

Trigger examples: - Member joins - Member leaves - Role added - Role
removed - Message matches rule - Warning threshold reached - Ticket
opened - Ticket closed - Scheduled time - Raid mode activated

Actions: - Send message - Send embed - Add role - Remove role -
Timeout - Log - Open ticket - Close ticket - Alert staff

Automations must be permission-checked and safely scoped to the guild.

------------------------------------------------------------------------

# 17. Dashboard Information Architecture

Main sidebar:

``` text
Overview

MODERATION
  Overview
  Cases
  Warnings
  Bans
  Timeouts
  Members

AUTOMOD & SECURITY
  AutoMod
  Anti-Spam
  Anti-Link
  Anti-Invite
  Anti-Mention
  Anti-Raid

TICKETS
  Overview
  Panels
  Open Tickets
  Closed Tickets
  Forms
  Transcripts
  Categories

SERVER
  Welcome
  Roles
  Custom Commands
  Embeds
  Automations

LOGGING
  Log Configuration
  Log History
  Forum Logging

STAFF
  Staff Roles
  Permissions
  Audit History

ANALYTICS
  Moderation
  Tickets
  Members
  Activity

SETTINGS
  General
  Security
  Integrations
```

------------------------------------------------------------------------

# 18. Dashboard UX

Design requirements:

-   Premium dark-first interface
-   Discord-inspired but not a clone
-   Responsive
-   Fast navigation
-   Server switcher
-   Search
-   Breadcrumbs
-   Tabs
-   Cards
-   Tables
-   Charts
-   Drawers/modals
-   Toasts
-   Confirmation dialogs
-   Skeleton loading
-   Empty states
-   Error states
-   Permission-denied states

Avoid: - Excessive gradients - Excessive glassmorphism - Huge decorative
elements - Cluttered dashboards

Prioritize information density and usability.

------------------------------------------------------------------------

# 19. Database Models

Suggested Prisma models:

``` text
Guild
GuildSettings
StaffRole
User
Session

ModerationCase
Warning
WarningEscalationRule
MemberNote

AutoModRule
AntiSpamConfig
AntiLinkConfig
AntiInviteConfig
AntiMentionConfig
AntiRaidConfig
JoinSecurityConfig

LogConfiguration
LogEntry
ForumLogThread

TicketPanel
TicketPanelButton
TicketCategory
Ticket
TicketParticipant
TicketClaim
TicketForm
TicketFormField
TicketFormResponse
TicketTranscript
TicketTag

RoleMenu
RoleMenuItem

WelcomeConfig
CustomCommand
EmbedTemplate
Automation
AutomationTrigger
AutomationAction
```

Add proper indexes and unique constraints.

Every guild-scoped table must be safely isolated by `guildId`.

------------------------------------------------------------------------

# 20. API Security

Every dashboard API route must:

1.  Authenticate session
2.  Resolve guild
3.  Verify user is a guild member
4.  Verify required Discord permission / configured SMCore permission
5.  Validate request with Zod
6.  Execute operation
7.  Write audit record where appropriate

Never trust: - Client-side role state - Client-provided guild access -
Client-provided permissions

Never expose: - Bot token - Database URL - Session secret - Discord
client secret

------------------------------------------------------------------------

# 21. Bot Intents & Permissions

Request only the intents required by enabled features, while documenting
privileged intents required for the full feature set.

Document required Discord permissions for: - Moderation - Tickets -
Logging - Role menus - AutoMod - Voice logging - Channel controls

Handle missing permissions gracefully with useful dashboard diagnostics.

------------------------------------------------------------------------

# 22. Reliability

The bot must: - Recover after restart - Persist configuration in
PostgreSQL - Avoid relying on in-memory timers as the only scheduler -
Handle Discord API rate limits - Retry safe operations - Prevent
duplicate actions - Prevent duplicate logs - Continue operating if
logging destination is temporarily unavailable

Redis may be used for: - Rate limiting - Sliding windows - Temporary
locks - Queues/cache

PostgreSQL remains the persistent source of truth.

------------------------------------------------------------------------

# 23. Observability

Use structured Pino logs.

Log: - Startup - Shutdown - Discord connection - Guild join/leave -
Commands - Moderation actions - API errors - Database errors - Discord
API errors - Ticket lifecycle events - Logging failures

Do not log secrets or sensitive private content unnecessarily.

------------------------------------------------------------------------

# 24. Testing

Unit/integration tests must cover:

-   Permission checks
-   Role hierarchy
-   Owner protection
-   Warning escalation
-   AutoMod
-   Anti-Spam
-   Anti-Link
-   Anti-Invite
-   Anti-Mention
-   Anti-Raid
-   Logging
-   Forum thread resolution
-   Ticket creation
-   Ticket permissions
-   Ticket claim
-   Ticket close/reopen
-   Ticket transcript
-   Dashboard RBAC
-   API validation
-   Multi-guild isolation

------------------------------------------------------------------------

# 25. Development Phases

## Phase 1 --- Foundation

-   Clean old business modules
-   Monorepo
-   Prisma
-   PostgreSQL
-   Redis
-   Shared package
-   Discord client
-   OAuth2
-   Environment configuration

## Phase 2 --- Core Moderation

-   Ban
-   Kick
-   Timeout
-   Warn
-   Cases
-   Notes
-   Purge
-   Lock/unlock
-   Slowmode

## Phase 3 --- Security

-   AutoMod
-   Anti-Spam
-   Anti-Link
-   Anti-Invite
-   Anti-Mention
-   Anti-Raid
-   Join security

## Phase 4 --- Logging

-   Seven categories
-   Text logging
-   Forum logging
-   Thread strategies
-   Audit correlation
-   Log history

## Phase 5 --- Ticketing

-   Panels
-   Categories
-   Forms
-   Claim
-   Priority
-   Tags
-   Transcripts
-   Automation

## Phase 6 --- Community

-   Welcome/goodbye
-   Role menus
-   Custom commands
-   Embed builder
-   Announcements
-   Automations

## Phase 7 --- Dashboard

-   Premium UI
-   All configuration pages
-   RBAC
-   Analytics
-   Search/filtering
-   Responsive design

## Phase 8 --- Hardening

-   Tests
-   Security audit
-   Rate-limit audit
-   Error handling
-   Performance
-   Documentation
-   Production build

------------------------------------------------------------------------

# 26. Definition of Done

Do not call the platform complete because it compiles.

A feature is complete only when: - Database model exists - Service
exists - Discord integration works - Dashboard configuration works where
applicable - Permission checks exist - Error handling exists - Logging
exists - Tests exist - Multi-guild isolation is verified - Production
build passes

Never create fake/mock functionality and label it as complete.

------------------------------------------------------------------------

# 27. Environment Variables

Use `.env.example`.

Expected categories:

``` text
DATABASE_URL
REDIS_URL

DISCORD_BOT_TOKEN
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET

SESSION_SECRET

NEXT_PUBLIC_APP_URL
NEXTAUTH_URL (only if the chosen auth architecture requires it)
NEXTAUTH_SECRET (only if the chosen auth architecture requires it)

NODE_ENV
PORT
```

Do not commit real secrets.

------------------------------------------------------------------------

# 28. Deployment

Development: - Docker Compose - PostgreSQL - Redis - Bot - Dashboard

Production should use: - Managed PostgreSQL where appropriate - Managed
Redis where appropriate - Secure environment variables - HTTPS -
Process/container health checks - Database backups - Monitoring

Deployment is a later phase. Do not deploy during initial
implementation.

------------------------------------------------------------------------

# 29. Brand

Product name:

**SMCore**

Tagline:

**Powerful Discord Moderation. Fully Customizable.**

Positioning:

**An all-in-one Discord moderation, security, ticketing, and community
management platform.**

Do not mention Grand RP in the product, UI, documentation, database
schema, or code.

------------------------------------------------------------------------

# 30. Final Engineering Rule

Build SMCore as a reusable SaaS-grade Discord platform, not as a
one-server custom bot.

Every important feature must be: - Modular - Configurable -
Guild-scoped - Permission-aware - Persistent - Testable - Recoverable -
Dashboard-manageable

Do not rush implementation by creating placeholders. Do not hardcode
Discord IDs. Do not expose secrets. Do not couple unrelated modules
together.
