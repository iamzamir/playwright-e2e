import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { MappingUtil } from '../../../util/mapping.util';

const Testdata = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/LinkManagement/Test_001_EntityViewMappingForProcess.json');

test.describe('Entity View Mapping for Process', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let mappingUtil: MappingUtil;
  let url: string;
  let headers: Record<string, string>;

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    mappingUtil = new MappingUtil(apiUtil, commonFunctions);

    url = process.env.API_BASE_URL as string + process.env.VIEW_ENTITY_MAP as string;
    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };
  });

  test('Test Case 1: Map Views to Process', async () => {
    const response = await apiUtil.processAPIRequest('POST', url, Testdata.requestBody, headers, 'Map Views to Process', 'full');
    const validations = await mappingUtil.performEntityViewMappingValidations(response, Testdata.requestBody);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 2: Search and Verify Mapped Views are Available for the process', async () => {
    const validations = await mappingUtil.searchEntityViewMapping(url, Testdata.requestSearchBody, headers, Testdata.requestBody.views);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 3: Remove 2 Mapped Views from Process', async () => {
    const response = await apiUtil.processAPIRequest('POST', url, Testdata.requestBody2, headers, 'Map after Removing 2 Views', 'full');
    const validations = await mappingUtil.performEntityViewMappingValidations(response, Testdata.requestBody2);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test case 4: Search and Verify Mapped Views are Available for the process after removing 2 views', async () => {
    const validations = await mappingUtil.searchEntityViewMapping(url, Testdata.requestSearchBody, headers, Testdata.requestBody2.views);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 5: Add 2 New and 2 Restored Views to Mapping', async () => {
    const response = await apiUtil.processAPIRequest('POST', url, Testdata.requestBody3, headers, 'Map after Adding 2 New and 2 Restored Views', 'full');
    const validations = await mappingUtil.performEntityViewMappingValidations(response, Testdata.requestBody3);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test case 6: Search and Verify Mapped Views after adding new views', async () => {
    const validations = await mappingUtil.searchEntityViewMapping(url, Testdata.requestSearchBody, headers, Testdata.requestBody3.views);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 7: Remove All Mapped Views from Process', async () => {
    const expectedDeleteCount = Testdata.requestBody3.views.length * Testdata.requestBody3.entities[0].entityId.length;
    const validations = await mappingUtil.clearAllEntityViews(url, Testdata.requestBody4, headers, expectedDeleteCount);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test case 8: Search and Verify all the mappings are removed from the Process', async () => {
    const validations = await mappingUtil.searchEmptyEntityViews(url, Testdata.requestSearchBody, headers);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 9: Map Views with Different Sequence Orders', async () => {
    const modifiedRequestBody = mappingUtil.createModifiedRequestBody(Testdata.requestBody, (data: any) => {
      data.views.forEach((view: any, index: number) => {
        view.sequence = index + 10;
      });
    });

    const response = await apiUtil.processAPIRequest('POST', url, modifiedRequestBody, headers, 'Map Views with Custom Sequence', 'full');
    const validations = await mappingUtil.performEntityViewMappingValidations(response, modifiedRequestBody);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 10: Map Views with Hidden Flag Variations', async () => {
    const modifiedRequestBody = mappingUtil.createModifiedRequestBody(Testdata.requestBody, (data: any) => {
      data.views.forEach((view: any, index: number) => {
        view.hidden = index % 2 === 0;
      });
    });

    const response = await apiUtil.processAPIRequest('POST', url, modifiedRequestBody, headers, 'Map Views with Hidden Variations', 'full');
    const validations = await mappingUtil.performEntityViewMappingValidations(response, modifiedRequestBody);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 11: Attempt to Map Non-Existent Views', async () => {
    const invalidRequestBody = mappingUtil.createModifiedRequestBody(Testdata.requestBody, (data: any) => {
      data.views = [
        { id: 'non-existent-view-1', sequence: 1, hidden: false },
        { id: 'non-existent-view-2', sequence: 2, hidden: false }
      ];
    });

    const response = await apiUtil.processAPIRequest('POST', url, invalidRequestBody, headers, 'Map Non-Existent Views', 'full');
    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Non-Existent Views Mapping Assertion');
    expect(validation1).toBeTruthy();
  });

  test('Test Case 12: Map Views with Empty Views Array', async () => {
    const emptyViewsRequestBody = mappingUtil.createModifiedRequestBody(Testdata.requestBody, (data: any) => {
      data.views = [];
    });
    const response = await apiUtil.processAPIRequest('POST', url, emptyViewsRequestBody, headers, 'Map with Empty Views Array', 'full');
    const validation1 = await commonFunctions.compareTwoValues(response.status, '400', 'Empty Views Error Assertion - Bad Request');
    expect(validation1).toBeTruthy();
  });

  test('Test Case 13: Map Views with Duplicate View IDs', async () => {
    const duplicateViewsRequestBody = mappingUtil.createModifiedRequestBody(Testdata.requestBody, (data: any) => {
      data.views = [
        { id: data.views[0].id, sequence: 1, hidden: false },
        { id: data.views[0].id, sequence: 2, hidden: true }
      ];
    });

    const response = await apiUtil.processAPIRequest('POST', url, duplicateViewsRequestBody, headers, 'Map Duplicate View IDs', 'full');
    const validation1 = await commonFunctions.compareTwoValues(response.status, '500', 'Duplicate Views Error Assertion');
    expect(validation1).toBeTruthy();
  });

  test('Test Case 14: Search Views with Different Filter Criteria', async () => {
    await apiUtil.processAPIRequest('POST', url, Testdata.requestBody, headers, 'Setup for Filter Search', 'full');

    const entityTypeSearchBody = mappingUtil.createModifiedRequestBody(Testdata.requestSearchBody, (data: any) => {
      data.entityType = 'subprocess';
    });

    const searchResponse = await apiUtil.processAPIRequest('POST', url + '/search', entityTypeSearchBody, headers, 'Search by Entity Type', 'full');
    const validation1 = await commonFunctions.compareTwoValues(searchResponse.status, 200, 'Entity Type Search Success');

    expect(validation1).toBeTruthy();
  });

  test('Test Case 15: Map Views with Maximum Sequence Numbers', async () => {
    const maxSequenceRequestBody = mappingUtil.createModifiedRequestBody(Testdata.requestBody, (data: any) => {
      data.views.forEach((view: any, index: number) => {
        view.sequence = 999 + index;
      });
    });

    const response = await apiUtil.processAPIRequest('POST', url, maxSequenceRequestBody, headers, 'Map Views with Max Sequence', 'full');
    const validations = await mappingUtil.performEntityViewMappingValidations(response, maxSequenceRequestBody);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 16: Map Views with Negative Sequence Numbers', async () => {
    const negativeSequenceRequestBody = mappingUtil.createModifiedRequestBody(Testdata.requestBody, (data: any) => {
      data.views.forEach((view: any, index: number) => {
        view.sequence = -(index + 1);
      });
    });

    const response = await apiUtil.processAPIRequest('POST', url, negativeSequenceRequestBody, headers, 'Map Views with Negative Sequence', 'full');
    const validations = await mappingUtil.performEntityViewMappingValidations(response, negativeSequenceRequestBody);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 17: Bulk Map Views to Multiple Processes', async () => {
    const bulkRequestBody = mappingUtil.createModifiedRequestBody(Testdata.requestBody, (data: any) => {
      data.entities[0].entityId = ['Process1', 'Process2', 'Process3', 'Process4', 'Process5'];
    });

    const response = await apiUtil.processAPIRequest('POST', url, bulkRequestBody, headers, 'Bulk Map Views to Multiple Processes', 'full');
    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Bulk Mapping Success');
    const validation2 = await commonFunctions.compareTwoValues(response.data.requestedMappingDetails.viewsCount, bulkRequestBody.views.length, 'Bulk Views Count');

    expect(validation1 && validation2).toBeTruthy();
  });

  test('Test Case 18: Performance Test - Map Large Number of Views', async () => {
    const largeViewsRequestBody = mappingUtil.createModifiedRequestBody(Testdata.requestBody, (data: any) => {
      data.views = [];
      for (let i = 1; i <= 50; i++) {
        data.views.push({
          id: `PerformanceView${i}`,
          sequence: i,
          hidden: i % 2 === 0
        });
      }
    });

    const startTime = Date.now();
    const response = await apiUtil.processAPIRequest('POST', url, largeViewsRequestBody, headers, 'Performance Test - Large Views', 'full');
    const endTime = Date.now();
    const duration = endTime - startTime;

    await commonFunctions.logMessage('INFO', `Large views mapping completed in ${duration}ms`);
    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Large Views Mapping Success');
    const validation2 = await commonFunctions.compareTwoValues(duration < 30000, true, 'Performance Test - Under 30 seconds');
    expect(validation1 && validation2).toBeTruthy();
  });

  test('Test Case 19: Verify Response Schema and Data Types', async () => {
    const response = await apiUtil.processAPIRequest('POST', url, Testdata.requestBody, headers, 'Schema Validation Test', 'full');

    expect(response.data).toBeDefined();
    expect(response.data.requestedMappingDetails).toBeDefined();
    expect(response.data.requestedMappingDetails.views).toBeDefined();
    expect(response.data.requestedMappingDetails.entities).toBeDefined();
    expect(Array.isArray(response.data.requestedMappingDetails.views)).toBeTruthy();
    expect(Array.isArray(response.data.requestedMappingDetails.entities)).toBeTruthy();
    expect(typeof response.data.requestedMappingDetails.viewsCount).toBe('number');

    response.data.requestedMappingDetails.views.forEach((view: any) => {
      expect(typeof view.id).toBe('string');
      expect(typeof view.sequence).toBe('number');
      expect(typeof view.hidden).toBe('boolean');
    });

    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Schema Validation Success');
    expect(validation1).toBeTruthy();
  });

  test('Test Case 20: Remove All Mapped Views from Process', async () => {
    const expectedDeleteCount = Testdata.requestBody.views.length * Testdata.requestBody.entities[0].entityId.length;
    const validation1 = await mappingUtil.clearAllEntityViews(url, Testdata.requestBody4, headers, expectedDeleteCount);
    const validation2 = await mappingUtil.searchEmptyEntityViews(url, Testdata.requestSearchBody, headers);
    expect(validation1.every((v: boolean) => v) && validation2.every((v: boolean) => v)).toBeTruthy();
  });
});

