import { Guild } from 'discord.js';
import { prisma } from '@repo/database';

export async function onGuildDelete(guild: Guild) {
  console.log(`📤 Bot removed/kicked from guild: ${guild.name} (${guild.id})`);

  try {
    await prisma.guild.delete({
      where: { id: guild.id },
    });
    console.log(`🗑️ Successfully deleted guild ${guild.id} from database.`);
  } catch (err: any) {
    console.warn(`⚠️ Could not delete guild ${guild.id} from database:`, err.message || err);
  }
}
