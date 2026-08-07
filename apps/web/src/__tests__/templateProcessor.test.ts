import { processTemplateVariables } from '../lib/templateProcessor';

describe('templateProcessor', () => {
  it('replaces template variables accurately', () => {
    const input = 'Hello {user}, welcome to {server}! Requested role: {role}.';
    const output = processTemplateVariables(input, {
      user: 'ProGamer',
      server: 'Esports Arena',
      role: 'Apex Predator',
    });

    expect(output).toBe('Hello ProGamer, welcome to Esports Arena! Requested role: Apex Predator.');
  });

  it('handles empty input gracefully', () => {
    expect(processTemplateVariables(null, {})).toBe('');
    expect(processTemplateVariables(undefined, {})).toBe('');
  });
});
