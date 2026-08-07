export interface TemplateContext {
  user?: string;
  server?: string;
  date?: string;
  role?: string;
}

export function processTemplateVariables(text: string | null | undefined, context: TemplateContext): string {
  if (!text) return '';

  const now = context.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return text
    .replace(/\{user\}/gi, context.user || 'Member')
    .replace(/\{server\}/gi, context.server || 'Gaming Server')
    .replace(/\{date\}/gi, now)
    .replace(/\{role\}/gi, context.role || 'Target Role');
}
