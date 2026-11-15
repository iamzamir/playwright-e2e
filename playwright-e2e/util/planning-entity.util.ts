import { PlanningListingPage } from '../pageobjects/planning-listing.page';

/** Planning context types that scenario specs repeat their checks for. */
export type PlanningEntity = 'Process' | 'Subprocess' | 'Assumption';

/** Spec test data holding the context names: `PROCESS_NAME`, plus `SUBPROCESS_NAME` or `ASSUMPTION_NAME` for those entities. */
export interface PlanningEntityData {
  PROCESS_NAME?: string;
  SUBPROCESS_NAME?: string;
  ASSUMPTION_NAME?: string;
}

/**
 * Opens the process, sub-process or assumption context named in `data` with `planningListingPage.launchContext`
 * (which falls back to the power bar when the listing has no context dropdown).
 */
export async function launchEntityContext(planningListingPage: PlanningListingPage, entity: PlanningEntity, data: PlanningEntityData): Promise<void> {
  const required = (key: keyof PlanningEntityData): string => {
    const value = data[key];
    if (!value) {
      throw new Error(`launchEntityContext(${entity}): test data has no ${key}`);
    }
    return value;
  };
  const processName = required('PROCESS_NAME');
  if (entity === 'Process') {
    await planningListingPage.launchContext('Process', processName);
  } else if (entity === 'Subprocess') {
    await planningListingPage.launchContext('Subprocess', processName, required('SUBPROCESS_NAME'));
  } else {
    await planningListingPage.launchContext('Assumption', processName, '', required('ASSUMPTION_NAME'));
  }
}
