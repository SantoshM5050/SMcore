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

    // 2. Process open events that reached their closeAt expiration time
    const expiredEvents = await prisma.eventSignup.findMany({
      where: {
        status: EventSignupStatus.OPEN,
        closeAt: {
          lte: now,
        },
      },
    });

    for (const event of expiredEvents) {
      try {
        console.log(`🔒 Auto-Closing Expired Event Signup "${event.title}" (ID: ${event.id})...`);
        await prisma.eventSignup.update({
          where: { id: event.id },
          data: { status: EventSignupStatus.CLOSED },
        });

        await EventSignupService.sendOrUpdateEventEmbed(event.id);
        console.log(`✅ Successfully auto-closed Event "${event.title}" in Discord channel ${event.channelId}.`);
      } catch (err: any) {
        console.error(`❌ Failed to auto-close expired event ${event.id}:`, err.message || err);
      }
    }

    // 3. Process recurring events (hourly interval or daily fixed time slots)
    const recurringEvents = await prisma.eventSignup.findMany({
      where: {
        isRecurring: true,
      },
    });

    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    for (const event of recurringEvents) {
      try {
        let shouldTrigger = false;

        // Check A: Interval in Hours (e.g., every 1, 2, 4, 6, 12, 24 hours)
        if (event.recurringIntervalHours && event.recurringIntervalHours > 0) {
          const lastPost = event.lastPostedAt || event.createdAt;
          const diffMs = now.getTime() - new Date(lastPost).getTime();
          const intervalMs = event.recurringIntervalHours * 60 * 60 * 1000;
          if (diffMs >= intervalMs) {
            shouldTrigger = true;
          }
        }

        // Check B: Daily Fixed Time Slots (e.g. "18:00,20:00,22:00")
        if (!shouldTrigger && event.dailyTimeSlots) {
          const slots = event.dailyTimeSlots.split(',').map((s) => s.trim());
          if (slots.includes(currentHHMM)) {
            const lastPost = event.lastPostedAt ? new Date(event.lastPostedAt).getTime() : 0;
            // Ensure not triggered twice in the same minute window
            if (now.getTime() - lastPost > 5 * 60 * 1000) {
              shouldTrigger = true;
            }
          }
        }

        if (shouldTrigger) {
          console.log(`🔄 Triggering Recurring Auto-Post for "${event.title}" (ID: ${event.id})...`);

          // Clear previous participants for fresh signup
          await prisma.eventParticipant.deleteMany({
            where: { eventSignupId: event.id },
          });

          // Calculate new closeAt if autoCloseMinutes set
          let newCloseAt: Date | null = null;
          if (event.autoCloseMinutes && event.autoCloseMinutes > 0) {
            newCloseAt = new Date(now.getTime() + event.autoCloseMinutes * 60 * 1000);
          }

          await EventSignupService.sendOrUpdateEventEmbed(event.id, { forceNewMessage: true });

          await prisma.eventSignup.update({
            where: { id: event.id },
            data: {
              status: EventSignupStatus.OPEN,
              lastPostedAt: now,
              closeAt: newCloseAt,
            },
          });
          console.log(`✅ Successfully re-posted Recurring Event "${event.title}" to Discord channel ${event.channelId}.`);
        }
      } catch (err: any) {
        console.error(`❌ Failed to process recurring event ${event.id}:`, err.message || err);
      }
    }
  }
}
