// Gate for specs that change or delete shared data (tests/DataSetupBatch). Only imports the plain
// environment table, so the Playwright configs can import it at load time.
import { ENV_NAMES, ENVIRONMENTS, isEnvName } from '../configs/env/environments';

export const DESTRUCTIVE_SPEC_GLOB = '**/DataSetupBatch/**';

export function isDestructiveRunAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.ALLOW_DESTRUCTIVE || '').trim().toLowerCase() === 'true';
}

export function isDataSetupSuite(suiteName: string | undefined): boolean {
  return /^datasetup/i.test((suiteName || '').trim());
}

// Throws (never skips) so a misconfigured run fails loudly instead of reporting "skipped".
// requiredEnvKeys must be defined by the active environment's own row in configs/env/environments.ts:
// configs/env doesn't clear keys a row leaves out, so a value left over in .env or CI (say, INTEROP's
// REALM_ID_TARGET on a PSR run) must not count.
export function assertDestructiveRunAllowed(requiredEnvKeys: string[] = [], env: NodeJS.ProcessEnv = process.env): void {
  if (!isDestructiveRunAllowed(env)) {
    throw new Error('Refusing to run a destructive DataSetup spec: set ALLOW_DESTRUCTIVE=true to run it on purpose.');
  }
  if (requiredEnvKeys.length === 0) return;

  const environmentName = env.ENVIRONMENT || 'INTEROP';
  const fixed: Readonly<Record<string, string>> = isEnvName(environmentName) ? ENVIRONMENTS[environmentName].fixed : {};
  const missing = requiredEnvKeys.filter((key) => !fixed[key] || !(env[key] || '').trim());
  if (missing.length > 0) {
    const supported = ENV_NAMES.filter((name) => requiredEnvKeys.every((key) => ENVIRONMENTS[name].fixed[key]));
    throw new Error(
      `Refusing to delete: ENVIRONMENT=${environmentName} does not configure ${missing.join(', ')} in configs/env/environments.ts. ` +
      `Run this spec with ENVIRONMENT set to one of: ${supported.join(', ') || '(none)'}.`,
    );
  }
}
