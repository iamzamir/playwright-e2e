import { test, expect } from '@playwright/test';
import { assertDestructiveRunAllowed, isDataSetupSuite, isDestructiveRunAllowed } from '../../util/destructive-guard.util';

test.describe('destructive DataSetup guard', () => {
  test('ALLOW_DESTRUCTIVE must be exactly true (case-insensitive, trimmed)', () => {
    expect(isDestructiveRunAllowed({})).toBe(false);
    expect(isDestructiveRunAllowed({ ALLOW_DESTRUCTIVE: '' })).toBe(false);
    expect(isDestructiveRunAllowed({ ALLOW_DESTRUCTIVE: 'false' })).toBe(false);
    expect(isDestructiveRunAllowed({ ALLOW_DESTRUCTIVE: '1' })).toBe(false);
    expect(isDestructiveRunAllowed({ ALLOW_DESTRUCTIVE: 'yes' })).toBe(false);
    expect(isDestructiveRunAllowed({ ALLOW_DESTRUCTIVE: 'true' })).toBe(true);
    expect(isDestructiveRunAllowed({ ALLOW_DESTRUCTIVE: ' TRUE ' })).toBe(true);
  });

  test('every DataSetup suite name is recognised', () => {
    for (const name of ['DataSetup', 'DataSetupGravitee', 'DataSetupSmoke', 'datasetup']) {
      expect(isDataSetupSuite(name), name).toBe(true);
    }
    for (const name of [undefined, '', 'PSSmokeBatch', 'ScenarioBatchA', 'POBackendSmokeBatch']) {
      expect(isDataSetupSuite(name), String(name)).toBe(false);
    }
  });

  test('assertDestructiveRunAllowed throws without the flag', () => {
    expect(() => assertDestructiveRunAllowed([], {})).toThrow(/ALLOW_DESTRUCTIVE=true/);
    expect(() => assertDestructiveRunAllowed(['REALM_ID_TARGET'], { REALM_ID_TARGET: 'realm' })).toThrow(/ALLOW_DESTRUCTIVE=true/);
  });

  test('assertDestructiveRunAllowed names every missing realm variable', () => {
    expect(() => assertDestructiveRunAllowed(['REALM_ID_SOURCE', 'REALM_ID_TARGET'], { ALLOW_DESTRUCTIVE: 'true', ENVIRONMENT: 'INTEROP', REALM_ID_SOURCE: ' ' }))
      .toThrow(/ENVIRONMENT=INTEROP does not configure REALM_ID_SOURCE, REALM_ID_TARGET/);
  });

  test('assertDestructiveRunAllowed ignores realm values the environment does not define (stale .env)', () => {
    const stale = { ALLOW_DESTRUCTIVE: 'true', REALM_ID_SOURCE: 'left-over', REALM_ID_TARGET: 'left-over', REALM_CLIENT_ID_TARGET: 'left-over' };
    for (const environment of ['PSR', 'STAGE']) {
      expect(() => assertDestructiveRunAllowed(['REALM_ID_TARGET', 'REALM_CLIENT_ID_TARGET'], { ...stale, ENVIRONMENT: environment }), environment)
        .toThrow(new RegExp(`ENVIRONMENT=${environment} does not configure REALM_ID_TARGET, REALM_CLIENT_ID_TARGET.*one of: QA, INTEROP`));
    }
    expect(() => assertDestructiveRunAllowed(['REALM_ID_TARGET'], { ...stale, ENVIRONMENT: 'NOPE' })).toThrow(/ENVIRONMENT=NOPE does not configure/);
  });

  test('assertDestructiveRunAllowed passes on an environment that defines the realm', () => {
    for (const environment of ['QA', 'INTEROP']) {
      const env = { ALLOW_DESTRUCTIVE: 'true', ENVIRONMENT: environment, REALM_ID_SOURCE: 'realm', REALM_ID_TARGET: 'realm', REALM_CLIENT_ID_TARGET: 'client' };
      expect(() => assertDestructiveRunAllowed(['REALM_ID_SOURCE', 'REALM_ID_TARGET', 'REALM_CLIENT_ID_TARGET'], env), environment).not.toThrow();
    }
    // ENVIRONMENT unset means INTEROP, as in configs/env.
    expect(() => assertDestructiveRunAllowed(['REALM_ID_TARGET'], { ALLOW_DESTRUCTIVE: 'true', REALM_ID_TARGET: 'realm' })).not.toThrow();
    expect(() => assertDestructiveRunAllowed([], { ALLOW_DESTRUCTIVE: 'true', ENVIRONMENT: 'PSR' })).not.toThrow();
  });
});
