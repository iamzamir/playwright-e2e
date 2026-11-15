import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
import ProcessPage from '../../../pageobjects/process.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import scope from '../../../pageobjects/scope.page';
import ApiUtil from '../../../util/api.util';

describe('Drill Through Serial Suite', () => {
    require('./Test_015_DefaultScenarioDTCreateChildScenarioAsDefault.spec.ts');
    require('./Test_016_NonDefaultScenarioDTCreateChildScenarioAsDefault.spec.ts');
    require('./Test_017_DrillThroughNonDefaultSceanrioToCheckDefaultScenario.spec.ts');
    require('./Test_018_DrillThroughSceanrioDefaultAndCheckDefaultInTarget.spec.ts');
    require('./Test_019_DrillThroughDefaultScenarioAndcreateDefaultSceanrioInTargetView.spec.ts');
    require('./Test_020_DrillThroughNonDefaultScenarioAndcreateDefaultSceanrioInTargetView.spec.ts');
    require('./Test_021_CreateMultipleChildScenariosAfterDrillThrough.spec.ts');
    require('./Test_022_CreateMultipleChildScenariosAfterDrillThroughPopup.spec.ts');
    require('./Test_023_DrillThroughSourceWithoutMerge.spec.ts');
    require('./Test_024_DrillThroughSourceWithMerge.spec.ts');
});