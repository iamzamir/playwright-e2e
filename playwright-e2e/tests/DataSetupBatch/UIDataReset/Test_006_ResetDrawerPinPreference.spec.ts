import { test, expect } from '../../../configs/api-fixtures';
import { getConfig } from '../../../configs/env';
import { CommonFunctions } from '../../../util/common.util';
import { getScenarioScopePanelPin, setScenarioScopePanelPin } from '../../../util/user-preferences.util';
import type { UserTokenAlias } from '../../../util/user-token.util';

const testDataPath = 'testdata/' + process.env.PSENV + '/DataSetupBatch/UIDataReset/Test_006_ResetDrawerPinPreference.json';
const TestData = require('../../../' + testDataPath);

// The drawer pin is one preference per user for every process, and a pinned drawer leaks into every lane signed in as
// that user (see ViewsBatch/Test_019_PinUnpinInPs). Clearing it here means each nightly starts unpinned, whatever a
// previous run or crashed spec left behind.
test.describe.serial('Reset Scenarios/Scope drawer pin preference', () => {
  const commonFunctions = new CommonFunctions();

  for (const alias of TestData.USER_ALIASES as UserTokenAlias[]) {
    test(`Unpin the Scenarios/Scope drawer for ${alias}`, async () => {
      // The LUI preferences host is confirmed for the Azure gateway only.
      test.skip(getConfig().gatewayType.toUpperCase() === 'GRAVITEE', 'LUI preferences host is not configured for Gravitee');

      const before = await getScenarioScopePanelPin(alias);
      await commonFunctions.logMessage('INFO', `Stored drawer pin for ${alias} before reset: "${before ?? 'none'}"`);

      const status = await setScenarioScopePanelPin(alias, '');
      const isSaved = await commonFunctions.compareTwoValues([200, 201].includes(status), true, `Drawer pin reset request for ${alias} succeeded (status ${status})`);

      const after = await getScenarioScopePanelPin(alias);
      const isUnpinned = await commonFunctions.compareTwoValues(after, '', `Stored drawer pin for ${alias} is unpinned after reset`);

      expect(isSaved && isUnpinned).toBe(true);
    });
  }
});
