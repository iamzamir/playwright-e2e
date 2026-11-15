import CommonFunctions from "../../../util/common.util";
import ApiUtil from "../../../util/api.util";
const TestData = require(`../../../Testdata/${process.env.PSENV}/DataSetup/Scenarios/Test_003_AddChildScenariosToMaas.json`);

const scenarioNames: string[] = Array.from(new Set(TestData.scenarioSets.default));

describe("Data Setup: Add child scenarios to Maas cluster", async () => {
  let headers: Record<string, string>;
  let scenarioIdMap: Record<string, string> = {};
  let baseScenarioName = "";
  let baseScenarioId = "";
  let envSegment: string;
  let maasBaseUrl: string;
  let addedScenarios: string[] = [];
  let existingMaasScenarios: string[] = [];
  let missingInSimulation: string[] = [];
  let scenariosToAdd: string[] = [];
  let alreadyInMaas: string[] = [];

  const getMaasScenarios = async (stepName: string) => {
    const maasResp = await ApiUtil.processAPIRequest("GET", maasBaseUrl, {}, headers, stepName, "full");
    const validation = await CommonFunctions.compareTwoValues(maasResp.status, "200", `${stepName} Success`);
    expect(validation).toBeTruthy();
    return (maasResp.data?.data || []).map((s: any) => s.name);
  };

  before(async () => {
    await CommonFunctions.logMessage("INFO", "Starting Data Setup: Add child scenarios to Maas cluster");
    
    // Get authentication token
    const bearerToken = await ApiUtil.getBearerToken();
    headers = {
      "accept": "application/json",
      "Authorization": "Bearer " + bearerToken,
      "Content-Type": "application/json"
    };

    // Validate required environment variables
    const baseUrl = process.env.API_BASE_URL;
    const searchSimulation = process.env.SEARCH_SIMULATION;
    if (!baseUrl || !searchSimulation) {
      throw new Error("Required environment variables API_BASE_URL or SEARCH_SIMULATION are not set.");
    }

    // Initialize URLs and environment segment
    envSegment = TestData.API_ENV_SEGMENT || process.env.API_ENV_SEGMENT || "interop";
    maasBaseUrl = baseUrl + `cbp/${envSegment}/maas/controller/v1/calcEngines/${TestData.CALC_ENGINE_ID}/scenarios`;

    await CommonFunctions.logMessage("INFO", `Using environment segment: ${envSegment}`);
    await CommonFunctions.logMessage("INFO", `Maas Base URL: ${maasBaseUrl}`);
    await CommonFunctions.logMessage("INFO", `Process Name: ${TestData.PROCESS_NAME}`);
    await CommonFunctions.logMessage("INFO", `Calc Engine ID: ${TestData.CALC_ENGINE_ID}`);

    // Get scenarios from simulation service
    const simUrl = baseUrl + searchSimulation + "?offset=0&limit=1000";
    const simPayload = { sourceIds: [TestData.PROCESS_NAME, TestData.ASSUMPTION] };

    await CommonFunctions.logMessage("INFO", "Fetching scenarios from simulation service...");
    const simResp = await ApiUtil.processAPIRequest("POST", simUrl, simPayload, headers, "Get Scenarios from Simulation Service", "full");
    
    // Validate simulation response
    const validation1 = await CommonFunctions.compareTwoValues(simResp.status, "200", "Simulation Service Response Success");
    expect(validation1).toBeTruthy();

    const allScenarios = simResp.data?.entities || [];
    await CommonFunctions.logMessage("INFO", `Found ${allScenarios.length} scenarios in simulation service`);

    if (allScenarios.length === 0) {
      throw new Error("No scenarios found in simulation service");
    }

    // Find base scenario
    const baseScenario = allScenarios.find((s: any) => s.scenarioType === "BASE");
    if (baseScenario) {
      baseScenarioName = baseScenario.scenarioName;
      baseScenarioId = baseScenario.scenarioId;
      await CommonFunctions.logMessage("INFO", `Base scenario found: ${baseScenarioName} (ID: ${baseScenarioId})`);
    } else {
      await CommonFunctions.logMessage("WARNING", "No BASE scenario found in simulation service");
    }

    // Build scenario ID mapping
    let foundScenariosCount = 0;
    for (const name of scenarioNames) {
      const found = allScenarios.find((s: any) => s.scenarioName === name);
      if (found) {
        scenarioIdMap[name] = found.scenarioId;
        foundScenariosCount++;
        await CommonFunctions.logMessage("INFO", `Mapped scenario: ${name} -> ${found.scenarioId}`);
      } else {
        missingInSimulation.push(name);
        await CommonFunctions.logMessage("WARNING", `Scenario "${name}" not found in simulation service, will be skipped.`);
      }
    }

    await CommonFunctions.logMessage("INFO", `Successfully mapped ${foundScenariosCount}/${scenarioNames.length} scenarios`);

    // Validate that we have at least some scenarios to work with
    if (foundScenariosCount === 0) {
      throw new Error("No configured scenarios found in simulation service");
    }

    existingMaasScenarios = await getMaasScenarios("Get Existing Maas Scenarios");
    await CommonFunctions.logMessage("INFO", `Existing scenarios in Maas: [${existingMaasScenarios.join(", ")}]`);

    for (const name of Object.keys(scenarioIdMap)) {
      if (existingMaasScenarios.includes(name)) {
        alreadyInMaas.push(name);
      } else {
        scenariosToAdd.push(name);
      }
    }
  });

  it("Test Case 1: Validate Mapping And Sync Plan", async () => {
    await CommonFunctions.logMessage("INFO", `Configured scenarios (unique): ${scenarioNames.length}`);
    await CommonFunctions.logMessage("INFO", `Mapped in simulation: ${Object.keys(scenarioIdMap).length}`);
    await CommonFunctions.logMessage("INFO", `Missing in simulation: ${missingInSimulation.length}`);
    await CommonFunctions.logMessage("INFO", `Already in Maas: ${alreadyInMaas.length}`);
    await CommonFunctions.logMessage("INFO", `Missing in Maas (to add): ${scenariosToAdd.length}`);

    const hasWorkOrAlreadySynced = Object.keys(scenarioIdMap).length > 0;
    const validation = await CommonFunctions.compareTwoValues(hasWorkOrAlreadySynced, true, "At least one configured scenario is available in simulation");
    expect(validation).toBeTruthy();
  });

  it("Test Case 2: Add Missing Child Scenarios to Maas Calc Engine", async () => {
    await CommonFunctions.logMessage("INFO", "Starting to add missing child scenarios to Maas calc engine...");

    let successCount = 0;
    let skippedCount = alreadyInMaas.length + missingInSimulation.length;

    for (const name of scenariosToAdd) {
      const scenarioId = scenarioIdMap[name];

      try {
        const payload: any = {
          scenarioId,
          scenarioIds: [scenarioId],
          scenarioName: name
        };

        if (name !== baseScenarioName && baseScenarioName && baseScenarioId) {
          payload.parentScenarioName = baseScenarioName;
          payload.parentScenarioId = baseScenarioId;
          await CommonFunctions.logMessage("INFO", `Adding child scenario "${name}" with parent "${baseScenarioName}"`);
        } else {
          await CommonFunctions.logMessage("INFO", `Adding scenario "${name}" without parent`);
        }

        const addResp = await ApiUtil.processAPIRequest("POST", maasBaseUrl, payload, headers, `Add scenario "${name}" to Maas`, "full");
        const isSuccess = addResp.status === 200 || addResp.status === 201;
        const validation = await CommonFunctions.compareTwoValues(isSuccess, true, `Scenario "${name}" added to Maas successfully`);

        if (validation) {
          successCount++;
          addedScenarios.push(name);
          await CommonFunctions.logMessage("INFO", `✓ Successfully added scenario "${name}" to Maas`);
        }

        expect(validation).toBeTruthy();

      } catch (error: any) {
        await CommonFunctions.logMessage("ERROR", `Exception while adding scenario "${name}": ${error.message}`);
        throw error;
      }
    }

    await CommonFunctions.logMessage("INFO", `=== Add Scenarios Summary ===`);
    await CommonFunctions.logMessage("INFO", `Successfully added: ${successCount} scenarios`);
    await CommonFunctions.logMessage("INFO", `Skipped (already exist/not found): ${skippedCount} scenarios`);
    await CommonFunctions.logMessage("INFO", `Added scenarios: [${addedScenarios.join(', ')}]`);

    const totalProcessed = successCount + skippedCount;
    const validation = await CommonFunctions.compareTwoValues(totalProcessed > 0, true, "At least one scenario was processed successfully");
    expect(validation).toBeTruthy();
  });

  it("Test Case 3: Verify Mapped Scenarios Are Present In Maas", async () => {
    await CommonFunctions.logMessage("INFO", "Verifying that mapped scenarios are present in Maas...");
    await browser.pause(2000);

    const currentScenarios = await getMaasScenarios("Verify Scenarios In Maas");

    let verificationSuccessCount = 0;

    for (const scenarioName of Object.keys(scenarioIdMap)) {
      const isPresent = currentScenarios.includes(scenarioName);
      const validation = await CommonFunctions.compareTwoValues(isPresent, true, `Scenario "${scenarioName}" verified in Maas`);

      if (validation) {
        verificationSuccessCount++;
        await CommonFunctions.logMessage("INFO", `✓ Verified scenario "${scenarioName}" is present in Maas`);
      } else {
        await CommonFunctions.logMessage("ERROR", `✗ Scenario "${scenarioName}" not found in Maas after addition`);
      }

      expect(validation).toBeTruthy();
    }

    await CommonFunctions.logMessage("INFO", `Verification complete: ${verificationSuccessCount}/${Object.keys(scenarioIdMap).length} mapped scenarios verified`);
  });

  after(async () => {
    await CommonFunctions.logMessage("INFO", "=== Final Test Summary ===");
    await CommonFunctions.logMessage("INFO", `Total scenarios configured (unique): ${scenarioNames.length}`);
    await CommonFunctions.logMessage("INFO", `Scenarios found in simulation: ${Object.keys(scenarioIdMap).length}`);
    await CommonFunctions.logMessage("INFO", `Scenarios missing in simulation: ${missingInSimulation.length}`);
    await CommonFunctions.logMessage("INFO", `Scenarios already in Maas: ${alreadyInMaas.length}`);
    await CommonFunctions.logMessage("INFO", `Scenarios added to Maas: ${addedScenarios.length}`);
    await CommonFunctions.logMessage("INFO", `Base scenario: ${baseScenarioName || 'Not found'}`);
    await CommonFunctions.logMessage("INFO", `Environment segment: ${envSegment}`);
    await CommonFunctions.logMessage("INFO", `Calc engine ID: ${TestData.CALC_ENGINE_ID}`);
    
    if (addedScenarios.length > 0) {
      await CommonFunctions.logMessage("INFO", `Successfully added scenarios: [${addedScenarios.join(', ')}]`);
    }

    await CommonFunctions.logMessage("INFO", "Data Setup: Add child scenarios to Maas cluster - Completed");
  });

});