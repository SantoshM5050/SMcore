import { checkRateLimit } from '../lib/rateLimit';

describe('rateLimit', () => {
  it('allows requests within limit', () => {
    const ip = 'test-ip-1';
    expect(checkRateLimit(ip, 5, 60)).toBe(true);
    expect(checkRateLimit(ip, 5, 60)).toBe(true);
  });

  it('blocks requests exceeding limit', () => {
    const ip = 'test-ip-2';
    for (let i = 0; i < 3; i++) {
      checkRateLimit(ip, 3, 60);
    }
    expect(checkRateLimit(ip, 3, 60)).toBe(false);
  });
});
