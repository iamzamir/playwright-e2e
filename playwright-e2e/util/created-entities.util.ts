import { test } from '@playwright/test';

export type EntityKind = 'process' | 'scenario' | 'view' | 'viewGroup' | 'scopeFilter' | 'calendar' | 'supplyChainAction' | 'actionItem' | 'procedureMapping';

export interface CreatedEntity {
  kind: EntityKind;
  id?: string;
  name: string;
  context?: Record<string, string>;
  /** Title path of the test that registered the entity. */
  createdBy: string;
  /** Spec file that registered the entity; `cleanupFile` uses it. */
  file?: string;
  /** Gravitee REALM_KEY active at registration, so worker teardown deletes in the same tenant. */
  realmKey?: string;
  /** Authorization header for user-owned entities (scenario, view, scope filter). Never written to a report. */
  authorization?: string;
}

export type RegisterOptions = { id?: string; context?: Record<string, string>; authorization?: string };

/** Resolves when the entity is gone (a 404 counts as gone); throws otherwise. */
export type Deleter = (entity: CreatedEntity) => Promise<void>;

export type Deleters = Partial<Record<EntityKind, Deleter>>;

export type CleanupLog = (message: string) => void | Promise<void>;

/** Report-safe view of an entity: no token, no context values. */
export type CleanupEntry = { kind: EntityKind; name: string; id?: string; createdBy: string; error?: string };

export type CleanupResult = { deleted: number; failed: CreatedEntity[] };

export type CleanupSummary = { deleted: CleanupEntry[]; failed: CleanupEntry[] };

/** `deleters` may be a factory so every cleanup run starts with fresh state (e.g. a per-run token cache). */
export type CreatedEntitiesOptions = { deleters?: Deleters | (() => Deleters); log?: CleanupLog };

const currentTest = (): { title: string; file?: string } => {
  try {
    const info = test.info();
    return { title: info.titlePath.slice(1).join(' > ') || info.title, file: info.file };
  } catch {
    return { title: 'outside a test' };
  }
};

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Throws unless `status` (number or the string ApiUtil returns for errors) is 2xx or one of `alsoOk`; 404 always counts as deleted. */
export const assertDeletedStatus = (status: unknown, label: string, alsoOk: number[] = []): void => {
  const code = Number(status);
  if ((code >= 200 && code < 300) || code === 404 || alsoOk.includes(code)) {
    return;
  }
  throw new Error(`${label} returned ${status}`);
};

/**
 * Records what a spec creates and deletes it through the API at teardown, newest first, so children (mappings,
 * subprocesses, child scenarios) go before what they hang off. Cleanup never throws; failures are logged and reported.
 */
export class CreatedEntities {
  private readonly items: CreatedEntity[] = [];
  private readonly deletedEntries: CleanupEntry[] = [];
  // Keyed by entity so a later successful retry clears the failure.
  private readonly failures = new Map<CreatedEntity, CleanupEntry>();
  private readonly deletersFactory: () => Deleters;
  private readonly defaultLog: CleanupLog;

  constructor(options: CreatedEntitiesOptions = {}) {
    const deleters = options.deleters ?? {};
    this.deletersFactory = typeof deleters === 'function' ? deleters : () => deleters;
    this.defaultLog = options.log ?? ((message: string) => console.log(message));
  }

  /** Call right after the create call succeeds. Prefer `id` where the create returns one. */
  register(kind: EntityKind, name: string, extra: RegisterOptions = {}): void {
    const { title, file } = currentTest();
    const realmKey = (process.env.REALM_KEY || '').trim() || undefined;
    this.items.push({ kind, name, id: extra.id, context: extra.context, authorization: extra.authorization, createdBy: title, file, realmKey });
  }

  list(): readonly CreatedEntity[] {
    return this.items;
  }

  /** What this registry has deleted so far and what still failed on its last attempt, without tokens or context. */
  summary(): CleanupSummary {
    return { deleted: [...this.deletedEntries], failed: [...this.failures.values()] };
  }

  /** Deletes every registered entity. Deleted entities leave the registry; failed ones stay so a later run can retry. */
  async cleanup(deleters?: Deleters, log: CleanupLog = this.defaultLog): Promise<CleanupResult> {
    return this.cleanupWhere(() => true, deleters, log);
  }

  /**
   * Deletes the entities registered from one spec file (default: the file of the running test or hook), for specs that
   * want their data gone before the worker moves on, e.g. `test.afterAll(({ createdEntities }) => createdEntities.cleanupFile())`.
   * Attaches `cleanup-summary.json` to the running test or hook when there is one.
   */
  async cleanupFile(file: string | undefined = currentTest().file, deleters?: Deleters, log: CleanupLog = this.defaultLog): Promise<CleanupResult> {
    if (!file) {
      await this.safeLog(log, '[createdEntities] cleanupFile called outside a test with no file; nothing deleted');
      return { deleted: 0, failed: [] };
    }
    const result = await this.cleanupWhere((entity) => entity.file === file, deleters, log);
    try {
      const body = JSON.stringify({ deleted: result.deleted, failed: result.failed.map((entity) => this.failures.get(entity) ?? CreatedEntities.toEntry(entity)) }, null, 2);
      await test.info().attach('cleanup-summary.json', { body, contentType: 'application/json' });
    } catch {
      // Not inside a test or hook: the log line is the report.
    }
    return result;
  }

  static toEntry(entity: CreatedEntity, error?: string): CleanupEntry {
    return { kind: entity.kind, name: entity.name, ...(entity.id ? { id: entity.id } : {}), createdBy: entity.createdBy, ...(error ? { error } : {}) };
  }

  private async cleanupWhere(selected: (entity: CreatedEntity) => boolean, explicitDeleters: Deleters | undefined, log: CleanupLog): Promise<CleanupResult> {
    const failed: CreatedEntity[] = [];
    let deleted = 0;
    if (!this.items.some(selected)) {
      return { deleted, failed };
    }
    let deleters: Deleters = {};
    try {
      deleters = explicitDeleters ?? this.deletersFactory();
    } catch (caught) {
      await this.safeLog(log, `[createdEntities] Could not build deleters: ${errorText(caught)}`);
    }
    for (let index = this.items.length - 1; index >= 0; index--) {
      const entity = this.items[index];
      if (!selected(entity)) {
        continue;
      }
      const label = `${entity.kind} '${entity.name}'${entity.id ? ` (id ${entity.id})` : ''}`;
      const deleter = deleters[entity.kind];
      let error: string | undefined;
      if (!deleter) {
        error = `no deleter for ${entity.kind}`;
      } else {
        try {
          await deleter(entity);
        } catch (caught) {
          error = errorText(caught);
        }
      }
      if (error) {
        failed.push(entity);
        this.failures.set(entity, CreatedEntities.toEntry(entity, error));
        await this.safeLog(log, `[createdEntities] FAILED to delete ${label}: ${error}`);
      } else {
        deleted++;
        this.items.splice(index, 1);
        this.failures.delete(entity);
        this.deletedEntries.push(CreatedEntities.toEntry(entity));
        await this.safeLog(log, `[createdEntities] Deleted ${label}`);
      }
    }
    if (deleted > 0 || failed.length > 0) {
      await this.safeLog(log, `[createdEntities] Cleanup done: ${deleted} deleted, ${failed.length} failed`);
    }
    return { deleted, failed };
  }

  private async safeLog(log: CleanupLog, message: string): Promise<void> {
    try {
      await log(message);
    } catch {
      console.log(message);
    }
  }
}
