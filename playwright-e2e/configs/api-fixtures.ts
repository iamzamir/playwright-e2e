import { test as base, expect } from '@playwright/test';
import { apiCallsFixture } from '../util/api-calls.util';
import { checkLedgerFixture } from '../util/common.util';
import type { CreatedEntities } from '../util/created-entities.util';
import { createdEntitiesWorkerFixture } from '../util/entity-deleters.util';

/**
 * Playwright `test` for API specs (ProcessOrchestrationBackend, DataSetupBatch): the base test plus
 * API-call evidence on failure (api-calls.json + api-repro.sh), the failed-check ledger and the
 * worker-scoped `createdEntities` cleanup registry. No browser is started.
 */
export const test = base.extend<{ _apiCalls: void; _checkLedger: void }, { createdEntities: CreatedEntities }>({
  _apiCalls: [apiCallsFixture, { auto: true }],
  // After _apiCalls, so it tears down first: _apiCalls must see a test this fails as failed.
  _checkLedger: [checkLedgerFixture, { auto: true }],
  createdEntities: [createdEntitiesWorkerFixture, { scope: 'worker' }]
});

export { expect };
