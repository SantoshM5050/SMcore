import http from 'http';
import { Client, GuildMember, TextChannel, NewsChannel } from 'discord.js';
import { ModerationAction } from '@smcore/shared';
import { ModerationService } from '../moderation/moderationService';
import { WarningService } from '../moderation/warningService';
import { RaidModeService } from '../security/raidModeService';
import { logger } from '../../utils/logger';

export interface BotBridgeServerOptions {
  port: number;
  client: Client;
  internalSecret?: string;
}

export function startBotBridgeServer(options: BotBridgeServerOptions): http.Server {
  const { port, client, internalSecret } = options;

  const server = http.createServer(async (req, res) => {
    // Utility JSON responder
    const sendJson = (statusCode: number, payload: unknown) => {
      res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-internal-secret',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      });
      res.end(JSON.stringify(payload));
    };

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-internal-secret',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      });
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // Optional Internal Secret Validation for write endpoints
    if (req.method === 'POST' && internalSecret) {
      const authHeader = req.headers['authorization'];
      const customSecret = req.headers['x-internal-secret'];
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : customSecret;
      if (token && token !== internalSecret) {
        sendJson(401, { success: false, error: 'Unauthorized internal bridge access' });
        return;
      }
    }

    try {
      // 1. Health endpoint
      if (req.method === 'GET' && (pathname === '/health' || pathname === '/')) {
        sendJson(200, {
          status: 'ok',
          service: 'smcore-bot',
          discordBot: client.user?.tag || null,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 2. Gateway Telemetry endpoint
      if (req.method === 'GET' && pathname === '/telemetry') {
        const isReady = typeof client.isReady === 'function' ? client.isReady() : true;
        const pingMs = client.ws?.ping !== undefined && client.ws.ping >= 0 ? client.ws.ping : 0;
        const uptimeSeconds = client.uptime ? Math.floor(client.uptime / 1000) : Math.floor(process.uptime());

        sendJson(200, {
          status: 'ok',
          service: 'smcore-bot',
          bot: isReady ? 'online' : 'standby',
          pingMs,
          uptimeSeconds,
          guildCount: client.guilds?.cache?.size || 0,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 3. Guilds endpoint (all guilds bot is in with real live metadata)
      if (req.method === 'GET' && pathname === '/guilds') {
        const guilds = client.guilds?.cache
          ? Array.from(client.guilds.cache.values()).map((g) => ({
              id: g.id,
              name: g.name,
              icon: typeof g.iconURL === 'function' ? g.iconURL() : (g.icon ?? null),
              memberCount: g.memberCount,
              ownerId: g.ownerId,
            }))
          : [];
        sendJson(200, { success: true, guilds });
        return;
      }

      // 4. Guild member lookup: GET /guilds/:guildId/members/:userId
      const memberMatch = pathname.match(/^\/guilds\/(\d+)\/members\/(\d+)$/);
      if (req.method === 'GET' && memberMatch) {
        const [, guildId, userId] = memberMatch;
        const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null));
        if (!guild) {
          sendJson(404, { success: false, error: 'Guild not found or bot is not present' });
          return;
        }

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
          sendJson(404, { success: false, error: 'Member not found in guild' });
          return;
        }

        sendJson(200, {
          success: true,
          data: {
            id: member.id,
            tag: member.user.tag,
            displayName: member.displayName,
            avatar: member.user.displayAvatarURL() || null,
            roles: member.roles.cache.map((r) => ({ id: r.id, name: r.name, hexColor: r.hexColor })),
            isOwner: guild.ownerId === member.id,
          },
        });
        return;
      }

      // Read JSON body helper
      const readBody = async (): Promise<Record<string, unknown>> => {
        return new Promise((resolve) => {
          let raw = '';
          req.on('data', (chunk) => {
            raw += chunk;
          });
          req.on('end', () => {
            try {
              resolve(raw ? JSON.parse(raw) : {});
            } catch {
              resolve({});
            }
          });
        });
      };

      // 5. Moderation Action endpoint: POST /guilds/:guildId/actions
      const actionMatch = pathname.match(/^\/guilds\/(\d+)\/actions$/);
      if (req.method === 'POST' && actionMatch) {
        const [, guildId] = actionMatch;
        const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null));
        if (!guild) {
          sendJson(404, { success: false, error: 'Guild not found or bot is not present' });
          return;
        }

        const body = await readBody();
        const action = String(body.action || '').toUpperCase() as ModerationAction;
        const targetUserId = String(body.targetUserId || '').trim();
        const moderatorUserId = String(body.moderatorUserId || '').trim();
        const reason = body.reason ? String(body.reason).trim() : 'Moderation action via SMCore Dashboard';
        const durationSeconds = typeof body.durationSeconds === 'number' ? body.durationSeconds : undefined;
        const deleteMessageSeconds = typeof body.deleteMessageSeconds === 'number' ? body.deleteMessageSeconds : 0;
        const channelId = body.channelId ? String(body.channelId).trim() : undefined;
        const messageCount = typeof body.messageCount === 'number' ? body.messageCount : undefined;
        const slowmodeSeconds = typeof body.slowmodeSeconds === 'number' ? body.slowmodeSeconds : 0;

        if (!targetUserId && !['PURGE', 'LOCK', 'UNLOCK', 'SLOWMODE'].includes(action)) {
          sendJson(400, { success: false, error: 'targetUserId is required for this action' });
          return;
        }

        // Resolve moderator member, defaulting to bot self if not supplied
        let moderator: GuildMember | null = null;
        if (moderatorUserId) {
          moderator = await guild.members.fetch(moderatorUserId).catch(() => null);
        }
        if (!moderator) {
          moderator = guild.members.me || (await guild.members.fetchMe().catch(() => null));
        }

        if (!moderator) {
          sendJson(500, { success: false, error: 'Unable to resolve executing moderator or bot member' });
          return;
        }

        let result: { success: boolean; message: string; caseNumber?: number; error?: string };

        switch (action) {
          case ModerationAction.WARN: {
            const warnRes = await WarningService.addWarning(guild.id, targetUserId, moderator.id, reason);
            result = {
              success: true,
              message: `Warning #${warnRes.warningId} issued to <@${targetUserId}>`,
              caseNumber: warnRes.caseNumber,
            };
            break;
          }
          case ModerationAction.TIMEOUT: {
            result = await ModerationService.timeoutMember(guild, moderator, {
              targetUserId,
              durationSeconds: durationSeconds || 600,
              reason,
            });
            break;
          }
          case ModerationAction.UNTIMEOUT: {
            result = await ModerationService.removeTimeout(guild, moderator, {
              targetUserId,
              reason,
            });
            break;
          }
          case ModerationAction.KICK: {
            result = await ModerationService.kickMember(guild, moderator, {
              targetUserId,
              reason,
            });
            break;
          }
          case ModerationAction.BAN: {
            result = await ModerationService.banMember(guild, moderator, {
              targetUserId,
              reason,
              deleteMessageSeconds,
            });
            break;
          }
          case ModerationAction.UNBAN: {
            result = await ModerationService.unbanMember(guild, moderator, {
              targetUserId,
              reason,
            });
            break;
          }
          case ModerationAction.PURGE: {
            const ch = (channelId ? guild.channels.cache.get(channelId) : null) as
              | TextChannel
              | NewsChannel
              | null;
            if (!ch || !ch.isTextBased()) {
              sendJson(400, { success: false, error: 'Valid text channel is required for purge' });
              return;
            }
            result = await ModerationService.purgeMessages(guild, ch, moderator, {
              channelId: ch.id,
              amount: messageCount || 10,
              targetUserId: targetUserId || undefined,
            });
            break;
          }
          case ModerationAction.LOCK: {
            const ch = (channelId ? guild.channels.cache.get(channelId) : null) as
              | TextChannel
              | NewsChannel
              | null;
            if (!ch || ch.isThread?.()) {
              sendJson(400, { success: false, error: 'Valid text or news channel is required for lock' });
              return;
            }
            result = await ModerationService.lockChannel(guild, ch, moderator, {
              channelId: ch.id,
              reason,
            });
            break;
          }
          case ModerationAction.UNLOCK: {
            const ch = (channelId ? guild.channels.cache.get(channelId) : null) as
              | TextChannel
              | NewsChannel
              | null;
            if (!ch || ch.isThread?.()) {
              sendJson(400, { success: false, error: 'Valid text or news channel is required for unlock' });
              return;
            }
            result = await ModerationService.unlockChannel(guild, ch, moderator, {
              channelId: ch.id,
              reason,
            });
            break;
          }
          case ModerationAction.SLOWMODE: {
            const ch = (channelId ? guild.channels.cache.get(channelId) : null) as
              | TextChannel
              | NewsChannel
              | null;
            if (!ch || ch.isThread?.()) {
              sendJson(400, { success: false, error: 'Valid text or news channel is required for slowmode' });
              return;
            }
            result = await ModerationService.setSlowmode(guild, ch, moderator, {
              channelId: ch.id,
              seconds: slowmodeSeconds,
              reason,
            });
            break;
          }
          default: {
            sendJson(400, { success: false, error: `Unsupported moderation action: ${action}` });
            return;
          }
        }

        sendJson(result.success ? 200 : 400, result);
        return;
      }

      // 6. Raid Mode control: POST /guilds/:guildId/security/raid-mode
      const raidMatch = pathname.match(/^\/guilds\/(\d+)\/security\/raid-mode$/);
      if (req.method === 'POST' && raidMatch) {
        const [, guildId] = raidMatch;
        const body = await readBody();
        const engage = Boolean(body.engage);
        const reason = body.reason ? String(body.reason).trim() : 'Raid mode updated via Dashboard';

        if (engage) {
          RaidModeService.activateRaidMode(guildId, 1800, reason, 0, 8, 10);
        } else {
          RaidModeService.deactivateRaidMode(guildId);
        }

        sendJson(200, {
          success: true,
          raidModeEnabled: engage,
          message: engage ? 'Emergency Raid Lockdown engaged' : 'Emergency Raid Lockdown lifted',
        });
        return;
      }

      // 404 for unhandled routes
      sendJson(404, { success: false, error: 'Not Found' });
    } catch (error) {
      logger.error({ error, pathname }, 'Bot bridge internal server error');
      sendJson(500, {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });

  server.listen(port, () => {
    logger.info({ port }, 'Bot HTTP Bridge server listening for dashboard telemetry & actions');
  });

  return server;
}
