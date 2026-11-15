const TestData = require("../../../Testdata/" + process.env.PSENV + "/DataSetup/Others/FetchProcessName.json");
import CommonFunctions from "../../../util/common.util";
import ApiUtil from "../../../util/api.util";

describe('Reset Process Scope', () => {

  let url: string, accessToken: string, headers: Record<string, string>;
  const baseUrl: string = "https://api-tst.jdadelivers.com/";
  let roleId: string[] = [];
  let arrProcessName: string[] = [];

  before(async () => {
    // url = "https://api-tst.jdadelivers.com/iam/realm/v1/roles/" + roleId[0] + "/policies";
    // url = "https://api-psrtest.jdadelivers.com/iam/realm/v1/roles/" + roleId[0] + "/policies";
    // url = "https://api-prodpreview.jdadelivers.com/iam/realm/v1/roles/" + roleId[0] + "/policies";
    // accessToken = await ApiUtil.getBearerToken();
    accessToken = ""
    headers = {
      "accept": "application/json",
      "Authorization": "Bearer " + accessToken
    };
  })

  it('Delete Intersections', async () => {
    let response = await ApiUtil.processAPIRequest("GET", "https://api-tst.jdadelivers.com/dp/logicalmodelservice/v1/intersections", null, headers, "Fetching Intersections", "full");
    console.log('Response:', response.data);
    let arrHierarcyName: string[] = [];
    for (let i = 0; i < response.data.entities.length; i++) {
      let hierarchyName = response.data.entities[i].id;
      console.log('Hierarchy Name:', hierarchyName);
      arrHierarcyName.push(hierarchyName);
    }
    for (let i = 0; i < arrHierarcyName.length; i++) {
      let delResponse = await ApiUtil.processAPIRequest("DELETE", `https://api-tst.jdadelivers.com/dp/logicalmodelservice/v1/intersections/${arrHierarcyName[i]}`, null, headers, "Deleting Intersection", "full");
      console.log(`Delete Response for ${arrHierarcyName[i]}:`, delResponse);
    }
  });

  it('Delete Hierarcies', async () => {
    let response = await ApiUtil.processAPIRequest("GET", "https://api-tst.jdadelivers.com/dp/logicalmodelservice/v1/hierarchies", null, headers, "Fetching Hierarcies", "full");
    console.log('Response:', response.data);
    let arrHierarcyName: string[] = [];
    for (let i = 0; i < response.data.entities.length; i++) {
      let hierarchyName = response.data.entities[i].id;
      console.log('Hierarchy Name:', hierarchyName);
      arrHierarcyName.push(hierarchyName);
    }
    for (let i = 0; i < arrHierarcyName.length; i++) {
      let delResponse = await ApiUtil.processAPIRequest("DELETE", `https://api-tst.jdadelivers.com/dp/logicalmodelservice/v1/hierarchies/${arrHierarcyName[i]}`, null, headers, "Deleting Hierarchy", "full");
      console.log(`Delete Response for ${arrHierarcyName[i]}:`, delResponse);
    }
  });

  it('Delete Levels', async () => {
    let response = await ApiUtil.processAPIRequest("GET", "https://api-tst.jdadelivers.com/dp/logicalmodelservice/v1/levels", null, headers, "Fetching Levels", "full");
    console.log('Response:', response.data);
    let arrLevelName: string[] = [];
    for (let i = 0; i < response.data.entities.length; i++) {
      let levelName = response.data.entities[i].id;
      console.log('Level Name:', levelName);
      arrLevelName.push(levelName);
    }
    for (let i = 0; i < arrLevelName.length; i++) {
      let delResponse = await ApiUtil.processAPIRequest("DELETE", `https://api-tst.jdadelivers.com/dp/logicalmodelservice/v1/levels/${arrLevelName[i]}`, null, headers, "Deleting Level", "full");
      console.log(`Delete Response for ${arrLevelName[i]}:`, delResponse);
    }
  });

  it('Delete Dimensions', async () => {
    let response = await ApiUtil.processAPIRequest("GET", "https://api-tst.jdadelivers.com/dp/logicalmodelservice/v1/dimensions", null, headers, "Fetching Dimensions", "full");
    console.log('Response:', response.data);
    let arrDimensionName: string[] = [];
    for (let i = 0; i < response.data.entities.length; i++) {
      let dimensionName = response.data.entities[i].id;
      console.log('Dimension Name:', dimensionName);
      arrDimensionName.push(dimensionName);
    }
    for (let i = 0; i < arrDimensionName.length; i++) {
      let delResponse = await ApiUtil.processAPIRequest("DELETE", `https://api-tst.jdadelivers.com/dp/logicalmodelservice/v1/dimensions/${arrDimensionName[i]}`, null, headers, "Deleting Dimension", "full");
      console.log(`Delete Response for ${arrDimensionName[i]}:`, delResponse);
    }
  });


  it('should find process names that are substrings of other process names', async () => {
    console.log('Process Name:', TestData.processes.length);
    for (let i = 0; i < TestData.processes.length; i++) {
      arrProcessName.push(TestData.processes[i].name);
    }
    console.log('Process Name:', arrProcessName);
    console.log('Process Names:', arrProcessName.toString());
    const results = findProcessNameSubstrings(TestData.processes);
    results.forEach(result => {
      console.log(`Process name "${result.base}" is a substring of:`, result.matches);
    });
  });

  it('2. Create Roles', async () => {
    for (let i = 0; i < arrProcessName.length; i++) {
      if (arrProcessName[i].includes("IntegratedBusinessPlanning")) {
        continue;
      }
      url = `${baseUrl}iam/realm/v1/roles`;
      let data = {
        "name": `${arrProcessName[i].toLowerCase()}_admin`,
        "description": `${arrProcessName[i].toLowerCase()}_admin`,
        "moduleId": 0,
        "type": "realm"
      };

      const response = await ApiUtil.processAPIRequest("POST", url, data, headers, "Creating Role", "full");
      const validation = await CommonFunctions.compareTwoValues(response.status, "201", "Role Creation Success Assertion");
      roleId = response.data.id;
      if (roleId) {
        url = `${baseUrl}iam/realm/v1/roles/${roleId}/policies`;
        let policy = {
          "expression": "{\"policyType\":\"entity\",\"namespace\":\"by.lsnop\",\"syntaxVersion\":\"1.0.0\",\"displayName\":\"" + arrProcessName[i] + "\",\"description\":\"" + arrProcessName[i] + "\",\"resource\":{\"name\":\"PROCESS." + arrProcessName[i] + "\",\"policies\":{\"entitySecurity\":{\"effect\":\"allow\",\"actions\":[\"delete\",\"edit\",\"start\",\"stop\",\"view\"]},\"attributeSecurity\":[],\"dataSecurity\":[]}}}",
          "displayName": "" + arrProcessName[i] + "",
          "description": "" + arrProcessName[i] + ""
        };
        const pResponse = await ApiUtil.processAPIRequest("POST", url, policy, headers, "Creating Policies", "full");
        const validation2 = await CommonFunctions.compareTwoValues(pResponse.status, "201", "Policy Creation Success Assertion");
      }
      // expect(validation && validation2).toBeTruthy();
    }

  });

  it('2. Create Roles - For Specific Case', async () => {
    for (let i = 0; i < arrProcessName.length; i++) {
      if (arrProcessName[i].includes("IntegratedBusinessPlanning")) {
        continue;
      }
      url = `${baseUrl}cbp/interop/ibp/process-orchestration/v1/process/${arrProcessName[i]}`;
      // let data = {
      //     "name": `${arrProcessName[i].toLowerCase()}_admin`,
      //     "description": `${arrProcessName[i].toLowerCase()}_admin`,
      //     "moduleId": 0,
      //     "type": "realm"
      // };

      const response = await ApiUtil.processAPIRequest("DELETE", url, "", headers, "DELETE PROCESS", "full");
      const validation = await CommonFunctions.compareTwoValues(response.status, "200", "Role Creation Success Assertion");
      // roleId = response.data.id;

      // url = `${baseUrl}iam/realm/v1/roles/${roleId}/policies`;
      // let policy = {
      //     "expression": "{\"policyType\":\"entity\",\"namespace\":\"by.lsnop\",\"syntaxVersion\":\"1.0.0\",\"displayName\":\"" + arrProcessName[i] + "\",\"description\":\"" + arrProcessName[i] + "\",\"resource\":{\"name\":\"PROCESS." + arrProcessName[i] + "\",\"policies\":{\"entitySecurity\":{\"effect\":\"allow\",\"actions\":[\"delete\",\"edit\",\"start\",\"stop\",\"view\"]},\"attributeSecurity\":[],\"dataSecurity\":[]}}}",
      //     "displayName": "" + arrProcessName[i] + "",
      //     "description": "" + arrProcessName[i] + ""
      // };
      // const pResponse = await ApiUtil.processAPIRequest("POST", url, policy, headers, "Creating Policies", "full");
      // const validation2 = await CommonFunctions.compareTwoValues(pResponse.status, "201", "Policy Creation Success Assertion");
      // expect(validation && validation2).toBeTruthy();
    }

  });


  // it('Add Policies to the Role', async () => {
  //     console.log('TestData:', TestData[0]);
  //     for (let i = 0; i < TestData.length; i++) {
  //         let response = await ApiUtil.processAPIRequest("POST", url, TestData[i], headers, "Creating Policies", "full");
  //         let validation: boolean = await CommonFunctions.compareTwoValues(response.status, "201", "Policiy Creation Success Assertion");
  //         expect(validation).toBeTruthy();
  //     }
  // });

  // it.only('Feature Toggle', async () => {
  //     let arrFeatureToggle: string[] = [];
  //     let arrFeatureToggleValue: string[] = [];
  //     console.log('Feature Toggle Name:', TestData.featureToggle.TenantLevel.length);
  //     for (let i = 0; i < TestData.featureToggle.TenantLevel.length; i++) {
  //         arrFeatureToggle.push(TestData.featureToggle.TenantLevel[i].name);
  //         arrFeatureToggleValue.push(TestData.featureToggle.TenantLevel[i].isEnabled);
  //     }
  //     console.log('Feature Toggle Name:', arrFeatureToggle.sort().toString());
  //     console.log('Feature Toggle Value:', arrFeatureToggleValue.sort().toString());
  // });
});

function findProcessNameSubstrings(processes: any[]): { base: string, matches: string[] }[] {
  const names = processes.map((p: any) => p.name);
  return names.map(base =>
  ({
    base,
    matches: names.filter(other => other !== base && other.includes(base))
  })
  ).filter(result => result.matches.length > 0);
}