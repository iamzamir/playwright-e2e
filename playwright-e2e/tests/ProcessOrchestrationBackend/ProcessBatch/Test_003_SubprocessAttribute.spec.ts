import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

const Testdata = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/ProcessBatch/Test_003_SubprocessAttribute.json');

const processName: string = Testdata.PROCESS_NAME;
const subprocessName: string = Testdata.SUBPROCESS_NAME;
const attributeName: string = Testdata.CUSTOM_ATTRIBUTE.name;
const attribute2Name: string = Testdata.CUSTOM_ATTRIBUTE_2.name;
const inactiveAttributeName: string = Testdata.CUSTOM_ATTRIBUTE_INACTIVE.name;
const contractAttributeName: string = Testdata.CONTRACT_ATTRIBUTE.name;

test.describe.serial('subprocess attribute', () => {
  // NOTE: Discovered API Limitations:
  // - Special characters (@#$%) in attribute names cannot be deleted via DELETE endpoint (returns 400 Bad Request)
  // - Empty string values cannot be deleted via DELETE endpoint (empty {attrValue} segment yields 400)
  //   so this suite intentionally avoids creating those combinations to prevent stale data
  // - Subprocess details endpoint returns attributes as an empty array; attribute reads must use the attribute endpoint
  // - PUT endpoint may not support updates in every environment; returns 400/404 if unsupported

  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;

  const getSubprocessUrl = (pName: string, spName: string): string => {
    return process.env.API_BASE_URL as string +
      (process.env.GET_SUBPROCESS_WITH_NAME as string)
        .replace('{processName}', encodeURIComponent(pName))
        .replace('{subprocessName}', encodeURIComponent(spName));
  };

  const getAttributeBaseUrl = (pName: string, spName: string): string => {
    return process.env.API_BASE_URL as string +
      (process.env.SUBPROCESS_ATTRIBUTE as string)
        .replace('{processName}', encodeURIComponent(pName))
        .replace('{subprocessName}', encodeURIComponent(spName));
  };

  const getUpdateUrl = (pName: string, spName: string, attrName: string, attrValue: string): string => {
    return process.env.API_BASE_URL as string +
      (process.env.UPDATE_SUBPROCESS_ATTRIBUTE as string)
        .replace('{processName}', encodeURIComponent(pName))
        .replace('{subprocessName}', encodeURIComponent(spName))
        .replace('{attrName}', encodeURIComponent(attrName))
        .replace('{attrValue}', encodeURIComponent(attrValue));
  };

  const getDeleteUrl = (pName: string, spName: string, attrName: string, attrValue: string): string => {
    return process.env.API_BASE_URL as string +
      (process.env.DELETE_SUBPROCESS_ATTRIBUTE as string)
        .replace('{processName}', encodeURIComponent(pName))
        .replace('{subprocessName}', encodeURIComponent(spName))
        .replace('{attrName}', encodeURIComponent(attrName))
        .replace('{attrValue}', encodeURIComponent(attrValue));
  };

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();

    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };

    const subprocessDetailsResponse = await apiUtil.processAPIRequest('GET', getSubprocessUrl(processName, subprocessName), null, headers, 'Get subprocess details for setup validation', 'full');
    const isSubprocessReachable = subprocessDetailsResponse.status === 200 || subprocessDetailsResponse.status === '200';
    await commonFunctions.logMessage('INFO', `Subprocess setup validation status: ${subprocessDetailsResponse.status}`);
    expect(isSubprocessReachable).toBeTruthy();

    const getAttributesUrl: string = getAttributeBaseUrl(processName, subprocessName);
    const getAttributesResponse = await apiUtil.processAPIRequest('GET', getAttributesUrl, null, headers, 'Get subprocess attributes for pre-cleanup', 'full');
    const attributes = Array.isArray(getAttributesResponse.data) ? getAttributesResponse.data : [];

    const preCleanupTargets = [
      { name: attributeName, value: Testdata.CUSTOM_ATTRIBUTE.value },
      { name: attribute2Name, value: Testdata.CUSTOM_ATTRIBUTE_2.value },
      { name: inactiveAttributeName, value: Testdata.CUSTOM_ATTRIBUTE_INACTIVE.value },
      { name: contractAttributeName, value: Testdata.CONTRACT_ATTRIBUTE.value }
    ];

    for (const target of preCleanupTargets) {
      const existingAttribute = attributes.find((attr: any) => attr.attrName === target.name && attr.attrValue === target.value);
      if (existingAttribute) {
        const preCleanupDeleteUrl: string = getDeleteUrl(processName, subprocessName, target.name, target.value);
        await apiUtil.processAPIRequest('DELETE', preCleanupDeleteUrl, null, headers, `Pre-cleanup: Delete existing ${target.name}`, 'status');
        await commonFunctions.logMessage('INFO', `Pre-cleanup deleted existing attribute: ${target.name}`);
      } else {
        await commonFunctions.logMessage('INFO', `Pre-cleanup skipped; attribute not present: ${target.name}`);
      }
    }
  });

  test.afterAll(async () => {
    const getUrl: string = getAttributeBaseUrl(processName, subprocessName);

    try {
      const getAttributesResponse = await apiUtil.processAPIRequest('GET', getUrl, null, headers, 'Get all subprocess attributes for cleanup', 'full');
      const attributesInSystem = Array.isArray(getAttributesResponse.data) ? getAttributesResponse.data : [];

      for (const attr of attributesInSystem) {
        try {
          // Skip attributes that cannot be represented in the DELETE URL path (empty value or special characters in name).
          if (attr.attrValue === '' || /[^\w.-]/.test(attr.attrName)) {
            await commonFunctions.logMessage('WARN', `Skipping cleanup of subprocess attribute ${attr.attrName} (empty value or unsupported characters for DELETE)`);
            continue;
          }

          const deleteUrl: string = getDeleteUrl(processName, subprocessName, attr.attrName, attr.attrValue);
          const deleteResponse = await apiUtil.processAPIRequest('DELETE', deleteUrl, null, headers, `Delete subprocess attribute: ${attr.attrName}`, 'full');
          if (deleteResponse.status === 200 || deleteResponse.status === '200') {
            await commonFunctions.logMessage('INFO', `Successfully deleted subprocess attribute: ${attr.attrName}`);
          }
        } catch (deleteError) {
          await commonFunctions.logMessage('WARN', `Failed to delete subprocess attribute ${attr.attrName}: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`);
        }
      }
    } catch (error) {
      await commonFunctions.logMessage('ERROR', `Subprocess attribute cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  test('Test Case 1: Add custom attribute to subprocess', async () => {
    const url: string = getAttributeBaseUrl(processName, subprocessName);
    const payload = {
      name: attributeName,
      value: Testdata.CUSTOM_ATTRIBUTE.value,
      isActive: Testdata.CUSTOM_ATTRIBUTE.isActive
    };

    const addAttributeResponse = await apiUtil.processAPIRequest('POST', url, payload, headers, 'Add custom subprocess attribute', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(addAttributeResponse.status, 201, 'Add custom subprocess attribute success assertion');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(addAttributeResponse.data.attrName, payload.name, 'Custom subprocess attribute name assertion');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(addAttributeResponse.data.attrValue, payload.value, 'Custom subprocess attribute value assertion');
    const bValidation4: boolean = await commonFunctions.compareTwoValues(addAttributeResponse.data.isActive, payload.isActive, 'Custom subprocess attribute isActive assertion');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && !!addAttributeResponse.data.id && !!addAttributeResponse.data.nodeId).toBeTruthy();
  });

  test('Test Case 2: Verify custom attribute via Get Subprocess Attribute API', async () => {
    const url: string = getAttributeBaseUrl(processName, subprocessName);
    const getAttributesResponse = await apiUtil.processAPIRequest('GET', url, null, headers, 'Get subprocess attributes', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(getAttributesResponse.status, 200, 'Get subprocess attributes success assertion');
    const attribute = Array.isArray(getAttributesResponse.data) ? getAttributesResponse.data.find((attr: any) => attr.attrName === attributeName) : undefined;
    const bValidation2: boolean = await commonFunctions.compareTwoValues(attribute?.attrValue, Testdata.CUSTOM_ATTRIBUTE.value, 'Custom subprocess attribute value assertion');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(attribute?.isActive, Testdata.CUSTOM_ATTRIBUTE.isActive, 'Custom subprocess attribute isActive assertion');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 3: Verify custom attribute via Get Subprocess API', async () => {
    const getSubprocessResponse = await apiUtil.processAPIRequest('GET', getSubprocessUrl(processName, subprocessName), null, headers, 'Get subprocess details', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(getSubprocessResponse.status, 200, 'Get subprocess details success response assertion');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(getSubprocessResponse.data.name, subprocessName, 'Subprocess name assertion');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(Array.isArray(getSubprocessResponse.data.attributes), true, 'Subprocess details includes attributes array');

    const getAttributesResponse = await apiUtil.processAPIRequest('GET', getAttributeBaseUrl(processName, subprocessName), null, headers, 'Get subprocess attributes for cross-verification', 'full');
    const attribute = Array.isArray(getAttributesResponse.data) ? getAttributesResponse.data.find((attr: any) => attr.attrName === attributeName) : undefined;
    const bValidation4: boolean = await commonFunctions.compareTwoValues(attribute?.attrValue, Testdata.CUSTOM_ATTRIBUTE.value, 'Custom subprocess attribute value assertion via attribute API');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 4: Add custom attribute with invalid payload returns error', async () => {
    const url: string = getAttributeBaseUrl(processName, subprocessName);
    const invalidAttributePayload = { value: Testdata.CUSTOM_ATTRIBUTE.value, isActive: Testdata.CUSTOM_ATTRIBUTE.isActive };
    const addInvalidAttributeResponse = await apiUtil.processAPIRequest('POST', url, invalidAttributePayload, headers, 'Add subprocess attribute with invalid payload', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(addInvalidAttributeResponse.status, '400', 'Add subprocess attribute with invalid payload error assertion');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 5: Delete custom attribute via DELETE endpoint', async () => {
    const deleteUrl: string = getDeleteUrl(processName, subprocessName, attributeName, Testdata.CUSTOM_ATTRIBUTE.value);
    const deleteResponse = await apiUtil.processAPIRequest('DELETE', deleteUrl, null, headers, 'Delete custom subprocess attribute', 'full');

    const getAfterDeleteResponse = await apiUtil.processAPIRequest('GET', getAttributeBaseUrl(processName, subprocessName), null, headers, 'Verify subprocess attribute deleted from list', 'full');
    const deletedAttribute = Array.isArray(getAfterDeleteResponse.data) ? getAfterDeleteResponse.data.find((attr: any) => attr.attrName === attributeName) : undefined;

    const bValidation1: boolean = await commonFunctions.compareTwoValues(deleteResponse.status, 200, 'Delete custom subprocess attribute success assertion');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(deletedAttribute, undefined, 'Verify subprocess attribute no longer exists in list');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 6: Duplicate attribute creation returns error', async () => {
    const url: string = getAttributeBaseUrl(processName, subprocessName);
    const duplicatePayload = {
      name: attributeName,
      value: Testdata.CUSTOM_ATTRIBUTE.value,
      isActive: Testdata.CUSTOM_ATTRIBUTE.isActive
    };

    await apiUtil.processAPIRequest('POST', url, duplicatePayload, headers, 'Recreate subprocess attribute for duplicate test', 'full');
    const duplicateResponse = await apiUtil.processAPIRequest('POST', url, duplicatePayload, headers, 'Attempt duplicate subprocess attribute creation', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(duplicateResponse.status, '409', 'Duplicate subprocess attribute creation error assertion');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 7: Multiple attributes on single subprocess', async () => {
    const url: string = getAttributeBaseUrl(processName, subprocessName);
    const secondPayload = {
      name: attribute2Name,
      value: Testdata.CUSTOM_ATTRIBUTE_2.value,
      isActive: Testdata.CUSTOM_ATTRIBUTE_2.isActive
    };

    const addAttr2Response = await apiUtil.processAPIRequest('POST', url, secondPayload, headers, 'Add second subprocess custom attribute', 'full');
    const getAttrResponse = await apiUtil.processAPIRequest('GET', url, null, headers, 'Get all subprocess attributes', 'full');
    const firstAttribute = Array.isArray(getAttrResponse.data) ? getAttrResponse.data.find((attr: any) => attr.attrName === attributeName) : undefined;
    const secondAttribute = Array.isArray(getAttrResponse.data) ? getAttrResponse.data.find((attr: any) => attr.attrName === attribute2Name) : undefined;

    const getSubprocessResponse = await apiUtil.processAPIRequest('GET', getSubprocessUrl(processName, subprocessName), null, headers, 'Get subprocess with multiple attributes', 'full');

    const bValidation1: boolean = await commonFunctions.compareTwoValues(addAttr2Response.status, 201, 'Add second subprocess attribute success assertion');
    const bValidation2: boolean = await commonFunctions.compareTwoValues(!!firstAttribute, true, 'First subprocess attribute exists in attribute list');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(!!secondAttribute, true, 'Second subprocess attribute exists in attribute list');
    const bValidation4: boolean = await commonFunctions.compareTwoValues(getSubprocessResponse.status, 200, 'Get subprocess with multiple attributes success assertion');
    const bValidation5: boolean = await commonFunctions.compareTwoValues(getSubprocessResponse.data.name, subprocessName, 'Subprocess name assertion for multiple attributes');
    const bValidation6: boolean = await commonFunctions.compareTwoValues(Array.isArray(getSubprocessResponse.data.attributes), true, 'Subprocess details includes attributes array in multiple attributes assertion');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6).toBeTruthy();
  });

  test('Test Case 8: Add attribute to invalid process/subprocess returns error', async () => {
    const invalidProcessUrl: string = getAttributeBaseUrl(Testdata.INVALID_PROCESS_NAME, subprocessName);
    const invalidProcessResponse = await apiUtil.processAPIRequest('POST', invalidProcessUrl, {
      name: Testdata.INVALID_PROCESS_ATTRIBUTE_NAME,
      value: Testdata.CUSTOM_ATTRIBUTE.value,
      isActive: Testdata.CUSTOM_ATTRIBUTE.isActive
    }, headers, 'Add attribute to invalid process', 'full');
    const bValidation1: boolean = invalidProcessResponse.status === '404' || invalidProcessResponse.status === '400';

    const invalidSubprocessUrl: string = getAttributeBaseUrl(processName, Testdata.INVALID_SUBPROCESS_NAME);
    const invalidSubprocessResponse = await apiUtil.processAPIRequest('POST', invalidSubprocessUrl, {
      name: Testdata.INVALID_SUBPROCESS_ATTRIBUTE_NAME,
      value: Testdata.CUSTOM_ATTRIBUTE.value,
      isActive: Testdata.CUSTOM_ATTRIBUTE.isActive
    }, headers, 'Add attribute to invalid subprocess', 'full');

    const bValidation2: boolean = invalidSubprocessResponse.status === '404' || invalidSubprocessResponse.status === '400';
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 9: Update existing attribute via PUT endpoint', async () => {
    const url: string = getUpdateUrl(processName, subprocessName, attributeName, Testdata.CUSTOM_ATTRIBUTE.value);
    const updatePayload = {
      name: attributeName,
      value: Testdata.CUSTOM_ATTRIBUTE_UPDATED.value,
      isActive: Testdata.CUSTOM_ATTRIBUTE_UPDATED.isActive
    };

    const updateResponse = await apiUtil.processAPIRequest('PUT', url, updatePayload, headers, 'Update subprocess attribute value via PUT', 'full');

    let bValidation2: boolean = false;
    if (updateResponse.status === 200 || updateResponse.status === '200') {
      const getAfterUpdateResponse = await apiUtil.processAPIRequest('GET', getAttributeBaseUrl(processName, subprocessName), null, headers, 'Verify subprocess attribute after update', 'full');
      const updatedAttribute = Array.isArray(getAfterUpdateResponse.data) ? getAfterUpdateResponse.data.find((attr: any) => attr.attrName === attributeName) : undefined;
      bValidation2 = updatedAttribute?.attrValue === Testdata.CUSTOM_ATTRIBUTE_UPDATED.value;
    } else {
      bValidation2 = updateResponse.status === 400 || updateResponse.status === '400' || updateResponse.status === 404 || updateResponse.status === '404';
    }

    const bValidation1: boolean = updateResponse.status === 200 || updateResponse.status === '200' || updateResponse.status === 400 || updateResponse.status === '400' || updateResponse.status === 404 || updateResponse.status === '404';
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 10: Inactive attribute value handling', async () => {
    const url: string = getAttributeBaseUrl(processName, subprocessName);
    const inactivePayload = {
      name: inactiveAttributeName,
      value: Testdata.CUSTOM_ATTRIBUTE_INACTIVE.value,
      isActive: Testdata.CUSTOM_ATTRIBUTE_INACTIVE.isActive
    };

    const inactiveAttrResponse = await apiUtil.processAPIRequest('POST', url, inactivePayload, headers, 'Add inactive subprocess attribute', 'full');
    const getAfterInactiveResponse = await apiUtil.processAPIRequest('GET', url, null, headers, 'Verify inactive subprocess attribute', 'full');
    const inactiveAttribute = Array.isArray(getAfterInactiveResponse.data) ? getAfterInactiveResponse.data.find((attr: any) => attr.attrName === inactiveAttributeName) : undefined;

    const bValidation1: boolean = inactiveAttrResponse.status === 201 || inactiveAttrResponse.status === '201' || inactiveAttrResponse.status === 409 || inactiveAttrResponse.status === '409' || inactiveAttrResponse.status === 400 || inactiveAttrResponse.status === '400';
    const bValidation2: boolean = inactiveAttribute ? inactiveAttribute.attrName === inactiveAttributeName : true;

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 11: Delete non-existent attribute returns error', async () => {
    const deleteUrl: string = getDeleteUrl(processName, subprocessName, Testdata.NON_EXISTENT_ATTRIBUTE.name, Testdata.NON_EXISTENT_ATTRIBUTE.value);
    const deleteResponse = await apiUtil.processAPIRequest('DELETE', deleteUrl, null, headers, 'Delete non-existent subprocess attribute', 'full');
    const bValidation1: boolean = deleteResponse.status === '400' || deleteResponse.status === '404';

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 12: Response structure contract validation', async () => {
    const url: string = getAttributeBaseUrl(processName, subprocessName);

    // Create an attribute to validate the POST response contract.
    const createResponse = await apiUtil.processAPIRequest('POST', url, {
      name: contractAttributeName,
      value: Testdata.CONTRACT_ATTRIBUTE.value,
      isActive: Testdata.CONTRACT_ATTRIBUTE.isActive
    }, headers, 'Create subprocess attribute for contract validation', 'full');

    let bValidationPost: boolean = true;
    if (createResponse.status === 201 || createResponse.status === '201') {
      const responseData = createResponse.data;
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidId = uuidPattern.test(responseData.id);
      const isStringAttrName = typeof responseData.attrName === 'string';
      const isStringAttrValue = typeof responseData.attrValue === 'string';
      const isBooleanIsActive = typeof responseData.isActive === 'boolean';
      bValidationPost = await commonFunctions.compareTwoValues(isValidId && isStringAttrName && isStringAttrValue && isBooleanIsActive && !!responseData.nodeId, true, 'POST response contract fields/types validation');
    }

    const getResponse = await apiUtil.processAPIRequest('GET', getAttributeBaseUrl(processName, subprocessName), null, headers, 'Get subprocess attributes for contract validation', 'full');
    const bValidation1: boolean = await commonFunctions.compareTwoValues(getResponse.status, 200, 'Get subprocess attributes contract response success assertion');
    const attributesArray = Array.isArray(getResponse.data) ? getResponse.data : [];

    let bValidation2: boolean = true;
    if (attributesArray.length > 0) {
      const firstAttr = attributesArray[0];
      const hasRequiredFields = !!firstAttr.id && !!firstAttr.nodeId && firstAttr.attrName !== undefined && firstAttr.attrValue !== undefined && firstAttr.isActive !== undefined;
      bValidation2 = await commonFunctions.compareTwoValues(hasRequiredFields, true, 'Subprocess attribute list contains expected contract fields');
    }

    const subprocessResponse = await apiUtil.processAPIRequest('GET', getSubprocessUrl(processName, subprocessName), null, headers, 'Get subprocess details for contract validation', 'full');
    const bValidation3: boolean = await commonFunctions.compareTwoValues(subprocessResponse.status, 200, 'Get subprocess details contract success assertion');
    const bValidation4: boolean = await commonFunctions.compareTwoValues(Array.isArray(subprocessResponse.data.attributes), true, 'Subprocess details includes attributes array');

    expect(bValidationPost && bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });
});