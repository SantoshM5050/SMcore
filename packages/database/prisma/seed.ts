import dotenv from 'dotenv';
import path from 'path';

// Load root .env file from monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { PrismaClient, StaffPermissionLevel, ApplicationStatus, AuditAction } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const sampleGuildId = '100000000000000000';

  const guild = await prisma.guild.upsert({
    where: { id: sampleGuildId },
    update: {},
    create: {
      id: sampleGuildId,
      name: 'Sample Esports Gaming Guild',
      icon: 'https://cdn.discordapp.com/embed/avatars/0.png',
      ownerId: '900000000000000000',
    },
  });

  await prisma.guildSettings.upsert({
    where: { guildId: sampleGuildId },
    update: {},
    create: {
      guildId: sampleGuildId,
      cooldownMinutes: 5,
      autoDmEnabled: true,
      loggingEnabled: true,
      screenshotRequired: false,
      screenshotAllowed: true,
      onePendingOnly: true,
      defaultEmbedColor: '#5865F2',
      timezone: 'UTC',
      language: 'en',
    },
  });

  await prisma.channelConfiguration.upsert({
    where: { guildId: sampleGuildId },
    update: {},
    create: {
      guildId: sampleGuildId,
      requestChannelId: '100000000000000001',
      reviewChannelId: '100000000000000002',
      logsChannelId: '100000000000000003',
    },
  });

  // Seed sample requestable roles
  const roles = [
    { roleId: '200000000000000001', roleName: 'VALORANT Radiant', roleColor: '#FF4655', displayOrder: 1, minRankRequired: 'Radiant' },
    { roleId: '200000000000000002', roleName: 'Apex Predator', roleColor: '#E10600', displayOrder: 2, minRankRequired: 'Predator' },
    { roleId: '200000000000000003', roleName: 'CS2 Global Elite', roleColor: '#E6A23C', displayOrder: 3, minRankRequired: 'Global Elite' },
    { roleId: '200000000000000004', roleName: 'League Challenger', roleColor: '#00C8FF', displayOrder: 4, minRankRequired: 'Challenger' },
  ];

  for (const role of roles) {
    await prisma.roleConfiguration.upsert({
      where: {
        guildId_roleId: {
          guildId: sampleGuildId,
          roleId: role.roleId,
        },
      },
      update: {},
      create: {
        guildId: sampleGuildId,
        ...role,
        isRequestable: true,
        enabled: true,
      },
    });
  }

  // Seed Staff Permissions
  await prisma.staffPermission.upsert({
    where: {
      guildId_roleId_permissionLevel: {
        guildId: sampleGuildId,
        roleId: '300000000000000001',
        permissionLevel: StaffPermissionLevel.HIGH_COMMAND,
      },
    },
    update: {},
    create: {
      guildId: sampleGuildId,
      roleId: '300000000000000001',
      roleName: 'High Command Admin',
      permissionLevel: StaffPermissionLevel.HIGH_COMMAND,
    },
  });

  await prisma.staffPermission.upsert({
    where: {
      guildId_roleId_permissionLevel: {
        guildId: sampleGuildId,
        roleId: '300000000000000002',
        permissionLevel: StaffPermissionLevel.ROLE_REQUEST_MANAGER,
      },
    },
    update: {},
    create: {
      guildId: sampleGuildId,
      roleId: '300000000000000002',
      roleName: 'Role Moderator',
      permissionLevel: StaffPermissionLevel.ROLE_REQUEST_MANAGER,
    },
  });

  // Embed config
  await prisma.embedConfig.create({
    data: {
      guildId: sampleGuildId,
      title: '🎮 Request Gaming Rank Role',
      description: 'Select your target rank role below and submit your in-game details to request official role verification.',
      footerText: 'Official Gaming Server Verification Platform',
      colorHex: '#5865F2',
      buttonLabel: 'Submit Role Application',
      buttonEmoji: '🏆',
    },
  });

  // Sample Applications
  const sampleApp = await prisma.application.create({
    data: {
      guildId: sampleGuildId,
      userId: '400000000000000001',
      userTag: 'GamerPro#1337',
      userAvatar: 'https://cdn.discordapp.com/embed/avatars/1.png',
      roleId: '200000000000000001',
      roleName: 'VALORANT Radiant',
      inGameName: 'ProPlayerX',
      inGameId: 'ProPlayerX#NA1',
      currentRank: 'Radiant #45',
      screenshotUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e',
      status: ApplicationStatus.PENDING,
    },
  });

  await prisma.auditLog.create({
    data: {
      guildId: sampleGuildId,
      userId: '400000000000000001',
      userTag: 'GamerPro#1337',
      action: AuditAction.APPLICATION_SUBMITTED,
      details: {
        applicationId: sampleApp.id,
        roleName: 'VALORANT Radiant',
        inGameName: 'ProPlayerX',
      },
    },
  });

  console.log('✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
