import { AttachmentBuilder, EmbedBuilder, TextChannel } from 'discord.js';
import { AuditAction, AuditEventType } from '@smcore/shared';
import { eventBus } from '../events/eventBus';
import { logger } from '../../utils/logger';
import { TicketDTO, TicketMessageEntry, TranscriptResult } from './ticketTypes';

export class TicketTranscriptService {
  /**
   * Generates a readable, bounded transcript from a ticket Discord channel
   */
  public static async generateTranscript(
    channel: TextChannel,
    ticket: TicketDTO,
    options: { maxMessages?: number; actorUserId?: string } = {}
  ): Promise<TranscriptResult> {
    const limit = Math.min(Math.max(options.maxMessages || 100, 1), 250);

    const entries: TicketMessageEntry[] = [];

    try {
      // Bounded fetch from Discord API
      const fetched = await channel.messages.fetch({ limit });
      const sorted = Array.from(fetched.values()).sort(
        (a, b) => a.createdTimestamp - b.createdTimestamp
      );

      for (const msg of sorted) {
        entries.push({
          id: msg.id,
          authorId: msg.author.id,
          authorTag: msg.author.tag,
          isBot: msg.author.bot,
          content: msg.cleanContent || (msg.attachments.size > 0 ? '[Attachments Only]' : '[Empty Message]'),
          attachments: Array.from(msg.attachments.values()).map((att) => att.url),
          timestamp: msg.createdAt.toISOString(),
        });
      }
    } catch (err) {
      logger.warn({ channelId: channel.id, err }, 'Failed to fetch messages for transcript');
    }

    // Format plain text transcript
    const header = [
      '==================================================',
      'SMCore Premium Ticketing System — Transcript',
      `Ticket: #${ticket.ticketNumber} (${ticket.channelId})`,
      `Guild ID: ${ticket.guildId}`,
      `Creator: ${ticket.creatorUserId}`,
      `Generated At: ${new Date().toISOString()}`,
      `Total Messages Fetched: ${entries.length}`,
      '==================================================\n',
    ].join('\n');

    const lines = entries.map((entry) => {
      const time = entry.timestamp.replace('T', ' ').slice(0, 19);
      const attachInfo =
        entry.attachments.length > 0 ? ` [Attachments: ${entry.attachments.join(', ')}]` : '';
      return `[${time}] ${entry.authorTag} (${entry.authorId}): ${entry.content}${attachInfo}`;
    });

    const plainText = `${header}\n${lines.join('\n')}`;

    const result: TranscriptResult = {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      guildId: ticket.guildId,
      messageCount: entries.length,
      generatedAt: new Date().toISOString(),
      content: plainText,
      entries,
    };

    // Emit audit event
    eventBus.emitAsync('ticket.event', {
      guildId: ticket.guildId,
      eventType: AuditEventType.TICKET_TRANSCRIPT_GENERATED,
      action: AuditAction.TICKET_TRANSCRIPT,
      actorUserId: options.actorUserId || 'SYSTEM',
      targetUserId: ticket.creatorUserId,
      channelId: ticket.channelId,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      reason: `Transcript generated (${entries.length} messages)`,
      metadata: {
        messageCount: entries.length,
      },
    });

    return result;
  }

  /**
   * Posts transcript file or embed to configured transcript channel
   */
  public static async deliverTranscript(
    transcriptChannel: TextChannel,
    ticket: TicketDTO,
    transcript: TranscriptResult
  ): Promise<void> {
    try {
      const buffer = Buffer.from(transcript.content, 'utf-8');
      const attachment = new AttachmentBuilder(buffer, {
        name: `transcript-ticket-${String(ticket.ticketNumber).padStart(4, '0')}.txt`,
      });

      const embed = new EmbedBuilder()
        .setTitle(`Ticket #${ticket.ticketNumber} Transcript`)
        .setColor(0x8083ff)
        .addFields(
          { name: 'Creator', value: `<@${ticket.creatorUserId}>`, inline: true },
          { name: 'Status', value: ticket.status, inline: true },
          { name: 'Messages', value: String(transcript.messageCount), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'SMCore Ticketing Engine' });

      await transcriptChannel.send({
        embeds: [embed],
        files: [attachment],
      });
    } catch (err) {
      logger.error({ channelId: transcriptChannel.id, err }, 'Failed to deliver transcript to channel');
    }
  }
}
