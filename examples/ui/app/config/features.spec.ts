import { afterEach, describe, expect, it, vi } from 'vitest';
import { APPS, getEnabledApps } from './features';

describe('getEnabledApps', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('returns all apps by default', () => {
    expect(getEnabledApps()).toEqual(APPS);
  });

  it('filters disabled apps', () => {
    vi.stubEnv('NEXT_PUBLIC_DISABLED_APPS', 'addresses');
    expect(getEnabledApps().map((a) => a.id)).toEqual(['cross-chain']);
  });
});
