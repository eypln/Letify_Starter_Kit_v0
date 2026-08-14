import { isDiagnosticRoute } from '@/lib/api/diagnostic-routes';

describe('diagnostic route classification', () => {
  it('identifies every protected diagnostic route family', () => {
    expect(isDiagnosticRoute('/api/debug/supa')).toBe(true);
    expect(isDiagnosticRoute('/api/test-webhook')).toBe(true);
    expect(isDiagnosticRoute('/api/add-test-credits')).toBe(true);
    expect(isDiagnosticRoute('/api/notifications/debug')).toBe(true);
    expect(isDiagnosticRoute('/api/stripe/webhook')).toBe(false);
  });
});
