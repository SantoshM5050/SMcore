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

          // 1. Fetch current event state with existing participants BEFORE touching the DB
          const currentEvent = await prisma.eventSignup.findUnique({
            where: { id: event.id },
            include: {
              participants: {
                orderBy: { joinedAt: 'asc' },
              },
            },
          });

          // 2. Close the old Discord message embed first, keeping its original parameters & participants list intact
          if (currentEvent && currentEvent.messageId) {
            await EventSignupService.closeEventMessage(currentEvent).catch((err) => {
              console.error(`Failed to close old event embed for ${event.id}:`, err);
            });
          }

          // 3. Clear previous participants for fresh signup cycle
          await prisma.eventParticipant.deleteMany({
            where: { eventSignupId: event.id },
          });

          // 4. Calculate new closeAt if autoCloseMinutes set
          let newCloseAt: Date | null = null;
          if (event.autoCloseMinutes && event.autoCloseMinutes > 0) {
            newCloseAt = new Date(now.getTime() + event.autoCloseMinutes * 60 * 1000);
          }

          // 5. Target time for the new post cycle is the current time HH:MM
          const targetHHMM = currentHHMM;
          const timeRegex = /\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/;

          // Dynamically update time in title & description if present (e.g. "19:40")
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

          // 6. Update DB for new cycle and reset messageId so sendOrUpdateEventEmbed posts a NEW message
          await prisma.eventSignup.update({
            where: { id: event.id },
            data: {
              title: newTitle,
              description: newDescription,
              eventTime: targetHHMM,
              status: EventSignupStatus.OPEN,
              lastPostedAt: now,
              closeAt: newCloseAt,
              messageId: null,
            },
          });

          // 7. Send fresh embed with status OPEN as a NEW message
          await EventSignupService.sendOrUpdateEventEmbed(event.id);

          console.log(`✅ Successfully re-posted Recurring Event "${newTitle}" to Discord channel ${event.channelId}.`);
        }
      } catch (err: any) {
        console.error(`❌ Failed to process recurring event ${event.id}:`, err.message || err);
      }
    }
  }
}
