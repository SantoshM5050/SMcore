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
        let newCloseAt: Date | null = null;
        if (event.autoCloseMinutes && event.autoCloseMinutes > 0) {
          newCloseAt = new Date(now.getTime() + event.autoCloseMinutes * 60 * 1000);
        }

        await prisma.eventSignup.update({
          where: { id: event.id },
          data: {
            status: EventSignupStatus.OPEN,
            lastPostedAt: now,
            closeAt: newCloseAt,
          },
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
        // Skip if event has a future scheduled start time and hasn't started yet
        if (event.status === EventSignupStatus.SCHEDULED && event.scheduledAt && new Date(event.scheduledAt) > now) {
          continue;
        }

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

          // Calculate target time for upcoming cycle (preserve minute offset like :40)
          const targetIntervalHours = event.recurringIntervalHours || 1;
          const timeRegex = /\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/;
          let currentHH = now.getHours();
          let currentMM = 40;

          if (event.eventTime && timeRegex.test(event.eventTime)) {
            const [h, m] = event.eventTime.split(':').map((v) => parseInt(v, 10));
            currentHH = h;
            currentMM = m;
          } else if (event.description) {
            const match = event.description.match(timeRegex);
            if (match) {
              const [h, m] = match[0].split(':').map((v) => parseInt(v, 10));
              currentHH = h;
              currentMM = m;
            }
          }

          const nextHour = (currentHH + targetIntervalHours) % 24;
          const targetHHMM = `${String(nextHour).padStart(2, '0')}:${String(currentMM).padStart(2, '0')}`;

          // Dynamically update time in title & description if present (e.g. "19:40" -> "20:40")
          let newDescription = event.description;
          if (newDescription) {
            if (newDescription.includes('{time}')) {
              newDescription = newDescription.replace(/\{time\}/g, targetHHMM);
            } else if (timeRegex.test(newDescription)) {
              newDescription = newDescription.replace(timeRegex, targetHHMM);
            }
          }

          let newTitle = event.title;
          if (newTitle) {
            if (newTitle.includes('{time}')) {
              newTitle = newTitle.replace(/\{time\}/g, targetHHMM);
            } else if (timeRegex.test(newTitle)) {
              newTitle = newTitle.replace(timeRegex, targetHHMM);
            }
          }

          // Update DB FIRST before building & sending Discord Embed
          await prisma.eventSignup.update({
            where: { id: event.id },
            data: {
              title: newTitle,
              description: newDescription,
              eventTime: targetHHMM,
              status: EventSignupStatus.OPEN,
              lastPostedAt: now,
              closeAt: newCloseAt,
            },
          });

          // Send fresh embed with status OPEN
          await EventSignupService.sendOrUpdateEventEmbed(event.id, { forceNewMessage: true });

          console.log(`✅ Successfully re-posted Recurring Event "${newTitle}" to Discord channel ${event.channelId}.`);
        }
      } catch (err: any) {
        console.error(`❌ Failed to process recurring event ${event.id}:`, err.message || err);
      }
    }
  }
}
