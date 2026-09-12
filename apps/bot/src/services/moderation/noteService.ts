import { prisma } from '@smcore/database';
import { logger } from '../../utils/logger';

export class NoteService {
  /**
   * Adds a private staff note to a member
   */
  public static async addNote(
    guildId: string,
    targetUserId: string,
    authorUserId: string,
    content: string
  ) {
    try {
      const note = await prisma.memberNote.create({
        data: {
          guildId,
          targetUserId,
          authorUserId,
          content,
        },
      });

      try {
        const { eventBus } = await import('../events/eventBus');
        const { AuditAction, AuditEventType, AuditTargetType } = await import('@smcore/shared');
        eventBus.emitAsync('audit.log', {
          guildId,
          eventType: AuditEventType.NOTE_CREATED,
          action: AuditAction.NOTE,
          actorUserId: authorUserId,
          targetUserId,
          targetType: AuditTargetType.USER,
          reason: 'Staff member note added',
          metadata: { noteId: note.id },
        });
      } catch {
        // Non-blocking
      }

      return note;
    } catch (err) {
      logger.warn({ err, guildId, targetUserId }, 'Failed to save note to database');
      return {
        id: 'transient-note',
        guildId,
        targetUserId,
        authorUserId,
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Lists all notes for a specific target member in a guild
   */
  public static async listNotes(guildId: string, targetUserId: string) {
    try {
      return await prisma.memberNote.findMany({
        where: {
          guildId,
          targetUserId,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      logger.warn({ err, guildId, targetUserId }, 'Failed to fetch notes from database');
      return [];
    }
  }

  /**
   * Edits an existing note
   */
  public static async editNote(
    guildId: string,
    noteId: string,
    content: string
  ) {
    try {
      return await prisma.memberNote.update({
        where: { id: noteId, guildId },
        data: { content },
      });
    } catch (err) {
      logger.warn({ err, guildId, noteId }, 'Failed to update note in database');
      return null;
    }
  }

  /**
   * Deletes a note
   */
  public static async deleteNote(guildId: string, noteId: string): Promise<boolean> {
    try {
      await prisma.memberNote.delete({
        where: { id: noteId, guildId },
      });

      try {
        const { eventBus } = await import('../events/eventBus');
        const { AuditAction, AuditEventType } = await import('@smcore/shared');
        eventBus.emitAsync('audit.log', {
          guildId,
          eventType: AuditEventType.NOTE_REVOKED,
          action: AuditAction.NOTE,
          reason: `Note ${noteId} deleted`,
          metadata: { noteId },
        });
      } catch {
        // Non-blocking
      }

      return true;
    } catch (err) {
      logger.warn({ err, guildId, noteId }, 'Failed to delete note in database');
      return false;
    }
  }
}
