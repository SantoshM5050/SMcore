import { TextChannel } from 'discord.js';
import { prisma, ApplicationStatus, AuditAction } from '@repo/database';
import { botClient } from '../client';
import { EmbedService } from './embedService';
import { LogService } from './logService';
import { RoleService } from './roleService';

export class ApplicationService {
  /**
   * Check if user is eligible to apply (pending check & cooldown check)
   */
  static async checkEligibility(guildId: string, userId: string): Promise<{ eligible: boolean; reason?: string }> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });

    // Check one pending only restriction
    if (settings?.onePendingOnly !== false) {
      const existingPending = await prisma.application.findFirst({
        where: {
          guildId,
          userId,
          status: ApplicationStatus.PENDING,
        },
      });

      if (existingPending) {
        return {
          eligible: false,
          reason: 'You already have an active pending role request application. Please wait for staff review before submitting another.',
        };
      }
    }

    // Check cooldown
    if (settings?.cooldownMinutes && settings.cooldownMinutes > 0) {
      const recentApplication = await prisma.application.findFirst({
        where: {
          guildId,
          userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (recentApplication) {
        const cooldownMs = settings.cooldownMinutes * 60 * 1000;
        const timePassed = Date.now() - new Date(recentApplication.createdAt).getTime();

        if (timePassed < cooldownMs) {
          const remainingMinutes = Math.ceil((cooldownMs - timePassed) / (60 * 1000));
          return {
            eligible: false,
            reason: `Cooldoned! You must wait ${remainingMinutes} more minute(s) before applying again.`,
          };
        }
      }
    }

    return { eligible: true };
  }

  /**
   * Create a new Application
   */
  static async createApplication(data: {
    guildId: string;
    userId: string;
    userTag: string;
    userAvatar?: string | null;
    roleId: string;
    inGameName: string;
    inGameId: string;
    currentRank: string;
    screenshotUrl?: string | null;
  }) {
    // Fetch role name
    const roleConfig = await prisma.roleConfiguration.findUnique({
      where: {
        guildId_roleId: {
          guildId: data.guildId,
          roleId: data.roleId,
        },
      },
    });

    const roleName = roleConfig?.roleName || 'Unknown Role';

    // Save to DB
    const application = await prisma.application.create({
      data: {
        guildId: data.guildId,
        userId: data.userId,
        userTag: data.userTag,
        userAvatar: data.userAvatar,
        roleId: data.roleId,
        roleName,
        inGameName: data.inGameName,
        inGameId: data.inGameId,
        currentRank: data.currentRank,
        screenshotUrl: data.screenshotUrl,
        status: ApplicationStatus.PENDING,
      },
    });

    // Create history entry
    await prisma.applicationHistory.create({
      data: {
        applicationId: application.id,
        actorId: data.userId,
        actorTag: data.userTag,
        previousStatus: ApplicationStatus.PENDING,
        newStatus: ApplicationStatus.PENDING,
        reason: 'Application submitted',
      },
    });

    // Send to Review Channel if configured
    const channelConfig = await prisma.channelConfiguration.findUnique({
      where: { guildId: data.guildId },
    });

    if (channelConfig?.reviewChannelId) {
      const reviewChannel = (await botClient.channels.fetch(channelConfig.reviewChannelId).catch(() => null)) as TextChannel | null;
      if (reviewChannel && reviewChannel.isTextBased()) {
        const reviewEmbed = EmbedService.buildReviewEmbed(application);
        const components = EmbedService.buildReviewButtons(application.id, ApplicationStatus.PENDING);

        // Check if explicit reviewPingRoleId is configured in GuildSettings
        const settings = await prisma.guildSettings.findUnique({
          where: { guildId: data.guildId },
        });

        let staffPingContent: string | undefined = undefined;
        const reviewPingRoleId = (settings as any)?.reviewPingRoleId;
        if (reviewPingRoleId) {
          if (reviewPingRoleId === 'everyone' || reviewPingRoleId === '@everyone') staffPingContent = '@everyone';
          else if (reviewPingRoleId === 'here' || reviewPingRoleId === '@here') staffPingContent = '@here';
          else staffPingContent = `<@&${reviewPingRoleId}>`;
        } else {
          // Fallback to pinging all configured staff permission roles
          const staffRoles = await prisma.staffPermission.findMany({
            where: { guildId: data.guildId },
          });

          if (staffRoles.length > 0) {
            staffPingContent = staffRoles.map((s) => `<@&${s.roleId}>`).join(' ');
          }
        }

        const msg = await reviewChannel
          .send({
            content: staffPingContent,
            embeds: [reviewEmbed],
            components,
          })
          .catch((err) => {
            console.error('⚠️ Failed to post application to review channel:', err);
            return null;
          });

        if (msg) {
          // Save review message ID to DB
          await prisma.application.update({
            where: { id: application.id },
            data: { reviewChannelMsgId: msg.id },
          });
        }
      }
    }

    // Audit Log
    await LogService.logEvent(data.guildId, data.userId, data.userTag, AuditAction.APPLICATION_SUBMITTED, {
      applicationId: application.id,
      roleName,
      inGameName: data.inGameName,
      inGameId: data.inGameId,
      currentRank: data.currentRank,
    });

    return application;
  }

  /**
   * Check staff permission to review
   */
  static async isStaffAuthorized(guildId: string, member: any): Promise<boolean> {
    if (!member) return false;
    
    // Administrator permission automatically grants review capability
    if (member.permissions.has('Administrator')) return true;

    // Check DB StaffPermissions
    const staffRoles = await prisma.staffPermission.findMany({
      where: { guildId },
    });

    if (staffRoles.length === 0) {
      // Default fallback: check if user has ManageRoles permission
      return member.permissions.has('ManageRoles');
    }

    const memberRoleIds = member.roles.cache.map((r: any) => r.id);
    return staffRoles.some((s) => memberRoleIds.includes(s.roleId));
  }

  /**
   * Approve Application
   */
  static async approveApplication(applicationId: string, reviewerId: string, reviewerTag: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new Error(`Application has already been resolved (${application.status})`);
    }

    // 1. Assign Discord Role
    const roleAssigned = await RoleService.assignRoleToMember(application.guildId, application.userId, application.roleId);

    // 1b. Assign Common Role if configured in Guild Settings
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: application.guildId },
    });

    if (settings?.commonRoleId) {
      await RoleService.assignRoleToMember(application.guildId, application.userId, settings.commonRoleId).catch((err) => {
        console.warn(`[Approve] Failed to assign common role ${settings.commonRoleId}:`, err);
      });
    }

    // 2. Change Member Server Nickname to "Name | ID"
    await RoleService.updateMemberNickname(
      application.guildId,
      application.userId,
      application.inGameName,
      application.inGameId
    );

    // 3. Update Application Status in DB
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.APPROVED,
        reviewerId,
        reviewerTag,
      },
    });

    // 4. Create Application History
    await prisma.applicationHistory.create({
      data: {
        applicationId,
        actorId: reviewerId,
        actorTag: reviewerTag,
        previousStatus: ApplicationStatus.PENDING,
        newStatus: ApplicationStatus.APPROVED,
        reason: 'Approved by staff member',
      },
    });

    // 5. Update Review Channel Embed
    const channelConfig = await prisma.channelConfiguration.findUnique({
      where: { guildId: application.guildId },
    });

    if (channelConfig?.reviewChannelId && application.reviewChannelMsgId) {
      const reviewChannel = (await botClient.channels.fetch(channelConfig.reviewChannelId).catch(() => null)) as TextChannel | null;
      if (reviewChannel) {
        const msg = await reviewChannel.messages.fetch(application.reviewChannelMsgId).catch(() => null);
        if (msg) {
          const updatedEmbed = EmbedService.buildReviewEmbed(updated);
          await msg.edit({ embeds: [updatedEmbed], components: [] }).catch(() => null);
        }
      }
    }

    // 6. Direct Message Applicant if enabled
    if (settings?.autoDmEnabled !== false) {
      const user = await botClient.users.fetch(application.userId).catch(() => null);
      if (user) {
        await user
          .send({
            content: `⚡ **SMCore Discord Bot – Role Application Approved!**\nYour role request for **${application.roleName}** has been approved by staff (${reviewerTag}). The role has been granted and your nickname updated to **${application.inGameName} | ${application.inGameId}**!`,
          })
          .catch(() => null);
      }
    }

    // 7. Audit Log
    await LogService.logEvent(application.guildId, reviewerId, reviewerTag, AuditAction.APPLICATION_APPROVED, {
      applicationId,
      applicantId: application.userId,
      applicantTag: application.userTag,
      roleName: application.roleName,
      roleAssigned,
    });

    return updated;
  }

  /**
   * Reject Application
   */
  static async rejectApplication(applicationId: string, reviewerId: string, reviewerTag: string, rejectionReason: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new Error(`Application has already been resolved (${application.status})`);
    }

    // 1. Update Application Status in DB
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.REJECTED,
        reviewerId,
        reviewerTag,
        rejectionReason,
      },
    });

    // 2. Create Application History
    await prisma.applicationHistory.create({
      data: {
        applicationId,
        actorId: reviewerId,
        actorTag: reviewerTag,
        previousStatus: ApplicationStatus.PENDING,
        newStatus: ApplicationStatus.REJECTED,
        reason: rejectionReason,
      },
    });

    // 3. Update Review Channel Embed
    const channelConfig = await prisma.channelConfiguration.findUnique({
      where: { guildId: application.guildId },
    });

    if (channelConfig?.reviewChannelId && application.reviewChannelMsgId) {
      const reviewChannel = (await botClient.channels.fetch(channelConfig.reviewChannelId).catch(() => null)) as TextChannel | null;
      if (reviewChannel) {
        const msg = await reviewChannel.messages.fetch(application.reviewChannelMsgId).catch(() => null);
        if (msg) {
          const updatedEmbed = EmbedService.buildReviewEmbed(updated);
          await msg.edit({ embeds: [updatedEmbed], components: [] }).catch(() => null);
        }
      }
    }

    // 4. Direct Message Applicant if enabled
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: application.guildId },
    });

    if (settings?.autoDmEnabled !== false) {
      const user = await botClient.users.fetch(application.userId).catch(() => null);
      if (user) {
        await user
          .send({
            content: `❌ **SMCore Discord Bot – Role Application Update**\nYour role request for **${application.roleName}** was reviewed by staff (${reviewerTag}) and rejected.\n\n**Reason:** ${rejectionReason}`,
          })
          .catch(() => null);
      }
    }

    // 5. Audit Log
    await LogService.logEvent(application.guildId, reviewerId, reviewerTag, AuditAction.APPLICATION_REJECTED, {
      applicationId,
      applicantId: application.userId,
      applicantTag: application.userTag,
      roleName: application.roleName,
      rejectionReason,
    });

    return updated;
  }
}
