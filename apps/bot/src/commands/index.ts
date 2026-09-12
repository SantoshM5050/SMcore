/**
 * SMCore Bot Command Foundation Interface
 * Commands will be registered here in Phase 1 (Moderation Engine)
 */

export interface BotCommand {
  name: string;
  description: string;
}

export const commands: BotCommand[] = [];
