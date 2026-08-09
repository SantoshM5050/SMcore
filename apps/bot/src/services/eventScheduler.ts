import { prisma, EventSignupStatus } from '@repo/database';
import { EventSignupService } from './eventSignupService';

export class EventScheduler {
  private static intervalId: NodeJS.Timeout | null = null;

  static start(intervalMs: number = 30000) {
    if (this.intervalId) return;

    console.log('⏰ Starting Event Signup Auto-Scheduler ticker...');
    this.intervalId = setInterval(() => {
      this.checkAndPostScheduledEvents().catch((err) => {
        console.error('Error in EventSignup Auto-Scheduler tick:', err);
      });
    }, intervalMs);

    // Initial tick
    this.checkAndPostScheduledEvents().catch((err) => {
      console.error('Error in initial EventSignup tick:', err);
    });
  }

  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏰ Stopped Event Signup Auto-Scheduler ticker.');
    }
  }

  private static async checkAndPostScheduledEvents() {
    const now = new Date();

    // 1. Process one-time scheduled events that reached their execution time
    const pendingEvents = await prisma.eventSignup.findMany({
      where: {
        status: EventSignupStatus.SCHEDULED,
        scheduledAt: {
          lte: now,
        },
      },
    });

    for (const event of pendingEvents) {
      try {
        console.log(`🚀 Auto-Posting Scheduled Event Signup "${event.title}" (ID: ${event.id})...`);
        await prisma.eventSignup.update({
          where: { id: event.id },
          data: { status: EventSignupStatus.OPEN },
        });

        await EventSignupService.sendOrUpdateEventEmbed(event.id);
        console.log(`✅ Successfully auto-posted Event "${event.title}" to Discord channel ${event.channelId}.`);
      } catch (err: any) {
        console.error(`❌ Failed to auto-post scheduled event ${event.id}:`, err.message || err);
      }
    }
  }
}
