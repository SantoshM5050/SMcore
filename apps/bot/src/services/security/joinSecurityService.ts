import { GuildMember, PermissionsBitField } from 'discord.js';
import {
  SecurityAction,
  SecurityEventType,
  SecurityRiskLevel,
} from '@smcore/shared';
import { SecurityConfigService } from './securityConfigService';
import { RaidDetectionService } from './raidDetectionService';
import { RaidModeService } from './raidModeService';
import { AccountRiskService } from './accountRiskService';
import { SecurityActionService } from './securityActionService';
import { SecurityEvent } from './securityTypes';
import { logger } from '../../utils/logger';

export class JoinSecurityService {
  /**
   * Orchestrates security verification, anti-raid burst detection, and account risk evaluation
   * whenever a new member joins the guild.
   */
  public static async processMemberJoin(
    member: GuildMember
  ): Promise<SecurityEvent | null> {
    // 1. Ignore bot accounts, system accounts, and owner
    if (member.user.bot || member.id === member.guild.ownerId) {
      return null;
    }

    // Ignore members with Administrator privileges
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return null;
    }

    const guild = member.guild;
    const botMember = guild.members.me;

    if (!botMember) {
      logger.warn({ guildId: guild.id }, 'Bot member not available in guild for security inspection');
      return null;
    }

    // 2. Load settings for the guild
    const settings = await SecurityConfigService.getSettings(guild.id);

    // 3. Check for Ongoing Raid Mode (always active if lockdown is in progress)
    if (RaidModeService.isRaidModeActive(guild.id)) {
      const state = RaidModeService.getRaidModeState(guild.id);
      logger.warn(
        { guildId: guild.id, memberId: member.id },
        'Member joined while active raid lockdown is in progress'
      );

      return await SecurityActionService.executeAction({
        member,
        botMember,
        action: settings.raidAction,
        riskLevel: SecurityRiskLevel.HIGH,
        eventType: SecurityEventType.RAID_DETECTED,
        reason: `Server is in active raid mode (${state?.reason || 'Join burst lockdown'})`,
        settings,
        metadata: {
          raidMode: true,
          burstCount: state?.currentJoinCount,
        },
      });
    }

    // If both join protections and raid detections are disabled, exit early
    if (!settings.accountAgeProtectionEnabled && !settings.raidDetectionEnabled) {
      return null;
    }

    // 4. Check for New Raid Burst
    if (settings.raidDetectionEnabled) {
      const raidCheck = RaidDetectionService.checkRaid(guild.id, settings);

      if (raidCheck.isRaid) {
        const reason = `Automated raid detection triggered: ${raidCheck.joinCount} joins in ${raidCheck.windowSeconds}s (threshold: ${raidCheck.threshold})`;

        RaidModeService.activateRaidMode(
          guild.id,
          settings.raidModeDurationSeconds,
          reason,
          raidCheck.joinCount,
          raidCheck.threshold,
          raidCheck.windowSeconds
        );

        return await SecurityActionService.executeAction({
          member,
          botMember,
          action: settings.raidAction,
          riskLevel: SecurityRiskLevel.HIGH,
          eventType: SecurityEventType.RAID_DETECTED,
          reason,
          settings,
          metadata: {
            joinCount: raidCheck.joinCount,
            threshold: raidCheck.threshold,
            windowSeconds: raidCheck.windowSeconds,
          },
        });
      }
    }

    // 5. Account Risk Evaluation (Account Age Protection)
    if (settings.accountAgeProtectionEnabled) {
      const risk = AccountRiskService.evaluateRisk(
        member.user.createdAt,
        settings.minimumAccountAgeHours
      );

      if (risk.riskLevel === SecurityRiskLevel.HIGH) {
        const actionToTake =
          settings.accountAgeAction !== SecurityAction.NONE
            ? settings.accountAgeAction
            : SecurityAction.QUARANTINE;

        return await SecurityActionService.executeAction({
          member,
          botMember,
          action: actionToTake,
          riskLevel: risk.riskLevel,
          eventType: SecurityEventType.ACCOUNT_TOO_YOUNG,
          reason: risk.reason || 'Account failed minimum age security policy',
          settings,
          metadata: {
            accountAgeHours: risk.accountAgeHours,
            minimumRequiredHours: settings.minimumAccountAgeHours,
          },
        });
      }
    }

    return null;
  }
}
