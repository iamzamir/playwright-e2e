import { FullConfig } from '@playwright/test';
import { clearApiTokenCache } from '../util/api.util';

async function globalTeardown(_config?: FullConfig): Promise<void> {
  clearApiTokenCache();
  console.log('[teardown] Cleared API token disk cache');
}

export default globalTeardown;
