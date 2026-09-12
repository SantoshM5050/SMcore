import { prisma } from '@smcore/database';
import {
  TicketCategoryCreate,
  TicketCategoryCreateSchema,
  TicketCategoryUpdate,
  TicketCategoryUpdateSchema,
} from '@smcore/shared';
import { logger } from '../../utils/logger';
import { TicketCategoryDTO } from './ticketTypes';

export class TicketCategoryService {
  private static memoryCategories = new Map<string, TicketCategoryDTO[]>();

  /**
   * Lists all categories for a guild
   */
  public static async getCategories(guildId: string): Promise<TicketCategoryDTO[]> {
    try {
      const records = await prisma.ticketCategory.findMany({
        where: { guildId, enabled: true },
        orderBy: { createdAt: 'asc' },
      });
      return records;
    } catch (err) {
      logger.warn({ guildId, err }, 'Failed to query ticket categories from DB, using memory buffer');
      return this.memoryCategories.get(guildId) || [];
    }
  }

  /**
   * Retrieves a single category by ID within a guild
   */
  public static async getCategory(
    guildId: string,
    categoryId: string
  ): Promise<TicketCategoryDTO | null> {
    try {
      const record = await prisma.ticketCategory.findFirst({
        where: { id: categoryId, guildId },
      });
      return record;
    } catch (err) {
      const list = this.memoryCategories.get(guildId) || [];
      return list.find((c) => c.id === categoryId) || null;
    }
  }

  /**
   * Creates a new ticket category for a guild
   */
  public static async createCategory(
    guildId: string,
    input: TicketCategoryCreate
  ): Promise<TicketCategoryDTO> {
    const parsed = TicketCategoryCreateSchema.parse(input);

    try {
      const created = await prisma.ticketCategory.create({
        data: {
          guildId,
          name: parsed.name,
          description: parsed.description || null,
          emoji: parsed.emoji || null,
          supportRoleId: parsed.supportRoleId || null,
          categoryChannelId: parsed.categoryChannelId || null,
          enabled: parsed.enabled ?? true,
        },
      });

      // Keep in-memory buffer in sync
      const list = this.memoryCategories.get(guildId) || [];
      list.push(created);
      this.memoryCategories.set(guildId, list);

      return created;
    } catch (err) {
      logger.warn({ guildId, err }, 'Failed to create ticket category in DB, saving to memory buffer');
      const fallback: TicketCategoryDTO = {
        id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        guildId,
        name: parsed.name,
        description: parsed.description || null,
        emoji: parsed.emoji || null,
        supportRoleId: parsed.supportRoleId || null,
        categoryChannelId: parsed.categoryChannelId || null,
        enabled: parsed.enabled ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const list = this.memoryCategories.get(guildId) || [];
      list.push(fallback);
      this.memoryCategories.set(guildId, list);
      return fallback;
    }
  }

  /**
   * Updates an existing ticket category
   */
  public static async updateCategory(
    guildId: string,
    categoryId: string,
    input: TicketCategoryUpdate
  ): Promise<TicketCategoryDTO | null> {
    const parsed = TicketCategoryUpdateSchema.parse(input);

    try {
      const updated = await prisma.ticketCategory.update({
        where: { id: categoryId },
        data: parsed,
      });
      return updated;
    } catch (err) {
      const list = this.memoryCategories.get(guildId) || [];
      const idx = list.findIndex((c) => c.id === categoryId);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...parsed, updatedAt: new Date() };
      return list[idx];
    }
  }

  /**
   * Deletes a ticket category
   */
  public static async deleteCategory(
    guildId: string,
    categoryId: string
  ): Promise<boolean> {
    try {
      await prisma.ticketCategory.delete({
        where: { id: categoryId },
      });
      const list = this.memoryCategories.get(guildId) || [];
      this.memoryCategories.set(
        guildId,
        list.filter((c) => c.id !== categoryId)
      );
      return true;
    } catch (err) {
      const list = this.memoryCategories.get(guildId) || [];
      const filtered = list.filter((c) => c.id !== categoryId);
      this.memoryCategories.set(guildId, filtered);
      return true;
    }
  }

  /**
   * Clears memory store (for testing)
   */
  public static clearMemory(guildId?: string): void {
    if (guildId) {
      this.memoryCategories.delete(guildId);
    } else {
      this.memoryCategories.clear();
    }
  }
}
