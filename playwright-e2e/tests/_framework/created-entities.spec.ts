import { test, expect } from '@playwright/test';
import { CreatedEntities, assertDeletedStatus, type CreatedEntity, type Deleter, type EntityKind } from '../../util/created-entities.util';

const recordingDeleter = (calls: string[], fail: (entity: CreatedEntity) => boolean = () => false): Deleter => async (entity) => {
  calls.push(`${entity.kind}:${entity.name}`);
  if (fail(entity)) {
    throw new Error(`stub failure for ${entity.name}`);
  }
};

const silent = (): void => {};

test.describe('CreatedEntities registry', () => {
  test('deletes in reverse registration order and empties the registry', async () => {
    const calls: string[] = [];
    const registry = new CreatedEntities({ log: silent });
    registry.register('process', 'P1');
    registry.register('view', 'V1', { id: 'v-1' });
    registry.register('procedureMapping', 'M1', { context: { entityId: 'e', viewId: 'v-1' } });

    const stub = recordingDeleter(calls);
    const result = await registry.cleanup({ process: stub, view: stub, procedureMapping: stub });

    expect(calls).toEqual(['procedureMapping:M1', 'view:V1', 'process:P1']);
    expect(result).toEqual({ deleted: 3, failed: [] });
    expect(registry.list()).toHaveLength(0);
  });

  test('a failing deleter does not stop the others, and failures are reported', async () => {
    const calls: string[] = [];
    const messages: string[] = [];
    const registry = new CreatedEntities({ log: (message) => { messages.push(message); } });
    registry.register('scenario', 'S1');
    registry.register('scenario', 'S2');
    registry.register('scenario', 'S3');

    const result = await registry.cleanup({ scenario: recordingDeleter(calls, (entity) => entity.name === 'S2') });

    expect(calls).toEqual(['scenario:S3', 'scenario:S2', 'scenario:S1']);
    expect(result.deleted).toBe(2);
    expect(result.failed.map((entity) => entity.name)).toEqual(['S2']);
    expect(registry.list().map((entity) => entity.name)).toEqual(['S2']);
    expect(messages.some((message) => message.includes('FAILED') && message.includes('stub failure for S2'))).toBe(true);
    expect(registry.summary().failed).toEqual([expect.objectContaining({ kind: 'scenario', name: 'S2', error: 'stub failure for S2' })]);
  });

  test('a kind without a deleter is reported as a failure, not skipped', async () => {
    const registry = new CreatedEntities({ log: silent });
    registry.register('calendar', 'Cal1');

    const result = await registry.cleanup({});

    expect(result.deleted).toBe(0);
    expect(result.failed.map((entity) => entity.name)).toEqual(['Cal1']);
    expect(registry.summary().failed[0].error).toBe('no deleter for calendar');
  });

  test('a 404 counts as deleted; other error statuses throw', async () => {
    for (const status of [200, 204, 404, '404']) {
      expect(() => assertDeletedStatus(status, 'Delete thing')).not.toThrow();
    }
    expect(() => assertDeletedStatus(409, 'Delete thing', [409])).not.toThrow();
    for (const status of ['400', 401, '500', 'ERROR', undefined]) {
      expect(() => assertDeletedStatus(status, 'Delete thing')).toThrow(/Delete thing returned/);
    }

    const registry = new CreatedEntities({ log: silent });
    registry.register('actionItem', 'AI1', { id: 'ai-1' });
    const result = await registry.cleanup({ actionItem: async () => assertDeletedStatus('404', 'Delete action item AI1') });
    expect(result).toEqual({ deleted: 1, failed: [] });
  });

  test('cleanup never throws, even when the logger or the deleter factory throws', async () => {
    const throwingLog = (): void => {
      throw new Error('log down');
    };
    const registry = new CreatedEntities({ log: throwingLog, deleters: () => { throw new Error('no token'); } });
    registry.register('process', 'P1');

    const result = await registry.cleanup();

    expect(result.deleted).toBe(0);
    expect(result.failed.map((entity) => entity.name)).toEqual(['P1']);
  });

  test('a deleter factory is called once per cleanup run', async () => {
    let builds = 0;
    const registry = new CreatedEntities({ log: silent, deleters: () => {
      builds++;
      return { view: async () => {} };
    } });
    registry.register('view', 'V1', { id: '1' });
    registry.register('view', 'V2', { id: '2' });
    await registry.cleanup();
    expect(builds).toBe(1);

    await registry.cleanup();
    expect(builds).toBe(1);
  });

  test('a successful retry clears the earlier failure from the summary', async () => {
    const registry = new CreatedEntities({ log: silent });
    registry.register('viewGroup', 'VG1', { id: 'vg-1' });
    let attempts = 0;
    const flaky: Deleter = async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error('transient');
      }
    };

    await registry.cleanup({ viewGroup: flaky });
    expect(registry.summary().failed).toHaveLength(1);

    await registry.cleanup({ viewGroup: flaky });
    expect(registry.summary()).toEqual({ deleted: [expect.objectContaining({ name: 'VG1', id: 'vg-1' })], failed: [] });
  });

  test('register records the test title and file; the summary never carries tokens or context', async () => {
    const registry = new CreatedEntities({ log: silent });
    registry.register('scopeFilter', 'F1', { id: 'f-1', authorization: 'Bearer secret-token', context: { baseUrl: 'https://example.invalid', instance: 'vf' } });

    const [entity] = registry.list();
    expect(entity.createdBy).toContain('register records the test title and file');
    expect(entity.file).toBe(test.info().file);

    await registry.cleanup({ scopeFilter: async () => {} });
    const report = JSON.stringify(registry.summary());
    expect(report).not.toContain('secret-token');
    expect(report).not.toContain('example.invalid');
  });

  test('cleanupFile deletes only the entities registered from that file', async () => {
    const calls: string[] = [];
    const stub = recordingDeleter(calls);
    const registry = new CreatedEntities({ log: silent, deleters: { process: stub, scenario: stub } });
    registry.register('process', 'Mine');
    const other = registry.list()[0];
    registry.register('scenario', 'Other');
    (registry.list()[1] as { file?: string }).file = 'other.spec.ts';

    const result = await registry.cleanupFile();

    expect(result).toEqual({ deleted: 1, failed: [] });
    expect(calls).toEqual(['process:Mine']);
    expect(registry.list().map((entity) => entity.name)).toEqual(['Other']);
    expect(other.file).toBe(test.info().file);
  });

  test('every documented entity kind can be registered', async () => {
    const kinds: EntityKind[] = ['process', 'scenario', 'view', 'viewGroup', 'scopeFilter', 'calendar', 'supplyChainAction', 'actionItem', 'procedureMapping'];
    const registry = new CreatedEntities({ log: silent });
    kinds.forEach((kind) => registry.register(kind, `${kind}-1`));
    const noop: Deleter = async () => {};
    const result = await registry.cleanup(Object.fromEntries(kinds.map((kind) => [kind, noop])));
    expect(result).toEqual({ deleted: kinds.length, failed: [] });
  });
});
