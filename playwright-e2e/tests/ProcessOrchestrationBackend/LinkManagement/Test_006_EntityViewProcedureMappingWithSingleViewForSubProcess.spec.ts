import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { MappingUtil } from '../../../util/mapping.util';

const Testdata = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/LinkManagement/Test_006_EntityViewProcedureMappingWithSingleViewForSubProcess.json');

test.describe('Entity View Procedure Mapping with Single View for SubProcess', () => {
  let apiUtil: ApiUtil;
  let mappingUtil: MappingUtil;
  let url: string;
  let headers: Record<string, string>;
  let modifiedRequestBody: any;

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    mappingUtil = new MappingUtil(apiUtil);

    url = process.env.API_BASE_URL as string + process.env.VIEW_ENTITY_PROCEDURE_MAP as string;
    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };
  });

  test('Test Case 1: Map 4 Procedures to SubProcess View, 1 Primary, 1 Secondary', async () => {
    const response = await apiUtil.processAPIRequest('POST', url, Testdata.requestBody, headers, 'Map Procedures to SubProcess View', 'full');
    const validations = await mappingUtil.performProcedureMappingValidations(response, Testdata.requestBody, 4);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 2: Search and Verify Mapped Procedures are Available for the SubProcess View', async () => {
    const validations = await mappingUtil.searchProcedures(url, Testdata.requestSearchBody, headers, Testdata.requestBody.procedures, 4);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 3: Map 4 Procedures to SubProcess View, 1 Primary, No Secondary', async () => {
    modifiedRequestBody = mappingUtil.createModifiedRequestBody(Testdata.requestBody, (data: any) => {
      mappingUtil.setProcedureValue(data.procedures, 'ProcedureMapping_2', 'secondary', false);
    });

    const response = await apiUtil.processAPIRequest('POST', url, modifiedRequestBody, headers, 'Map Procedures to SubProcess View - No Secondary', 'full');
    const validations = await mappingUtil.performProcedureMappingValidations(response, modifiedRequestBody, 4);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 4: Search and Verify Mapped Procedures are Available for SubProcess View (No Secondary)', async () => {
    const validations = await mappingUtil.searchProcedures(url, Testdata.requestSearchBody, headers, modifiedRequestBody.procedures, 4);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 5: Map 4 Procedures to SubProcess View, No Primary, 1 Secondary', async () => {
    modifiedRequestBody = mappingUtil.createModifiedRequestBody(Testdata.requestBody, (data: any) => {
      mappingUtil.setProcedureValue(data.procedures, 'ProcedureMapping_1', 'primary', false);
    });

    const response = await apiUtil.processAPIRequest('POST', url, modifiedRequestBody, headers, 'Map Procedures to SubProcess View - No Primary', 'full');
    const validations = await mappingUtil.performProcedureMappingValidations(response, modifiedRequestBody, 4);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 6: Search and Verify Mapped Procedures are Available for SubProcess View (No Primary)', async () => {
    const validations = await mappingUtil.searchProcedures(url, Testdata.requestSearchBody, headers, modifiedRequestBody.procedures, 4);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 7: Map 4 Procedures to SubProcess View, No Primary, No Secondary', async () => {
    modifiedRequestBody = mappingUtil.createModifiedRequestBody(Testdata.requestBody, (data: any) => {
      mappingUtil.setAllProceduresValue(data.procedures, 'primary', false);
      mappingUtil.setAllProceduresValue(data.procedures, 'secondary', false);
    });

    const response = await apiUtil.processAPIRequest('POST', url, modifiedRequestBody, headers, 'Map Procedures to SubProcess View - No Primary No Secondary', 'full');
    const validations = await mappingUtil.performProcedureMappingValidations(response, modifiedRequestBody, 4);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 8: Search and Verify Mapped Procedures are Available for SubProcess View (No Primary No Secondary)', async () => {
    const validations = await mappingUtil.searchProcedures(url, Testdata.requestSearchBody, headers, modifiedRequestBody.procedures, 4);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 9: Map 3 Procedures to SubProcess View, No Primary, No Secondary', async () => {
    modifiedRequestBody = mappingUtil.createModifiedRequestBody(Testdata.requestBody, (data: any) => {
      data.procedures = mappingUtil.removeProcedure(data.procedures, 'ProcedureMapping_4');
      mappingUtil.setAllProceduresValue(data.procedures, 'primary', false);
      mappingUtil.setAllProceduresValue(data.procedures, 'secondary', false);
    });

    const response = await apiUtil.processAPIRequest('POST', url, modifiedRequestBody, headers, 'Map 3 Procedures to SubProcess View - No Primary No Secondary', 'full');
    const validations = await mappingUtil.performProcedureMappingValidations(response, modifiedRequestBody, 3);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 10: Search and Verify 3 Mapped Procedures are Available for SubProcess View', async () => {
    const validations = await mappingUtil.searchProcedures(url, Testdata.requestSearchBody, headers, modifiedRequestBody.procedures, 3);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 11: Map 5 Procedures to SubProcess View, No Primary, No Secondary', async () => {
    modifiedRequestBody = mappingUtil.createModifiedRequestBody(Testdata.requestBody, (data: any) => {
      const newProcedure = { procedureName: 'ProcedureMapping_5', primary: false, secondary: false };
      mappingUtil.addProcedure(data.procedures, newProcedure);
      mappingUtil.setAllProceduresValue(data.procedures, 'primary', false);
      mappingUtil.setAllProceduresValue(data.procedures, 'secondary', false);
    });

    const response = await apiUtil.processAPIRequest('POST', url, modifiedRequestBody, headers, 'Map 5 Procedures to SubProcess View - No Primary No Secondary', 'full');
    const validations = await mappingUtil.performProcedureMappingValidations(response, modifiedRequestBody, 5);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 12: Search and Verify 5 Mapped Procedures are Available for SubProcess View', async () => {
    const validations = await mappingUtil.searchProcedures(url, Testdata.requestSearchBody, headers, modifiedRequestBody.procedures, 5);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 13: Remove All Procedures Mapping to SubProcess View', async () => {
    modifiedRequestBody = mappingUtil.createModifiedRequestBody(Testdata.requestBody, (data: any) => {
      data.procedures = [];
    });

    const response = await apiUtil.processAPIRequest('POST', url, modifiedRequestBody, headers, 'Remove All Procedures from SubProcess View', 'full');
    const validations = await mappingUtil.removeAllProcedures(response, modifiedRequestBody);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 14: Search SubProcess View and Verify No Mapped Procedures are Available', async () => {
    const validations = await mappingUtil.searchProcedures(url, Testdata.requestSearchBody, headers, [], 0);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });
});

