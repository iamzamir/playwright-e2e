import { ApiUtil } from './api.util';
import { CommonFunctions } from './common.util';
import { getConfig, endpoint } from '../configs/env';

export type FavouriteRequest = { name: string; viewId: string; containerId: string; isActive?: boolean; isScopeEnabled?: boolean };

// The LM base is VIEW_ENTITY_MAP without its route, e.g. cbp/<env>/ibp/links/v1 or lm/api/v1.
export function buildLinksUrl(route: string, query: Record<string, string> = {}): string {
  const linksBasePath = endpoint('VIEW_ENTITY_MAP').replace(/\/view-entity-map$/, '');
  const queryString = new URLSearchParams(query).toString();
  return `${getConfig().hosts.api}${linksBasePath}/${route}${queryString ? `?${queryString}` : ''}`;
}

// Untyped favourites are stored with entity type `*`; typed ones carry the entity type in the path.
export function favouritesRoute(entityId: string, entityType?: string): string {
  const entity = encodeURIComponent(entityId);
  return entityType ? `type/${encodeURIComponent(entityType)}/entity/${entity}/views` : `entity/${entity}/views`;
}

export class MappingUtil {
  private apiUtil: ApiUtil;
  private commonFunctions: CommonFunctions;

  constructor(apiUtil?: ApiUtil, commonFunctions?: CommonFunctions) {
    this.apiUtil = apiUtil ?? new ApiUtil();
    this.commonFunctions = commonFunctions ?? new CommonFunctions();
  }

  public validateViewMapping(expectedViews: any[], actualViews: any[]): boolean {
    return expectedViews.every((reqView: any) => {
      const match = actualViews.find((resView: any) => resView.id === reqView.id);
      return !!(match && match.sequence === reqView.sequence && match.hidden === reqView.hidden);
    });
  }

  public validateProcedureMapping(expectedProcedures: any[], actualProcedures: any[]): boolean {
    return expectedProcedures.every((reqProcedure: any) => {
      const match = actualProcedures.find((resProcedure: any) => resProcedure.procedureName === reqProcedure.procedureName);
      return !!(
        match &&
        match.procedureName === reqProcedure.procedureName &&
        match.primary === reqProcedure.primary &&
        match.secondary === reqProcedure.secondary
      );
    });
  }

  public async performEntityViewMappingValidations(response: any, requestBody: any, entityIndex: number = 0): Promise<boolean[]> {
    const validation1 = await this.commonFunctions.compareTwoValues(response.status, 200, 'All Mapped Views Mapped To Entity Assertion');
    const validation2 = await this.commonFunctions.compareTwoValues(response.data.requestedMappingDetails.viewsCount, requestBody.views.length, 'Views Count Assertion');
    const validation3 = await this.commonFunctions.compareTwoValues(response.data.requestedMappingDetails.entities[0].entityId[entityIndex], requestBody.entities[0].entityId[entityIndex], 'Entity ID Assertion');

    const isViewMappedCorrectly = this.validateViewMapping(requestBody.views, response.data.requestedMappingDetails.views);
    const validation4 = await this.commonFunctions.compareTwoValues(isViewMappedCorrectly, true, 'All Views Mapped Correctly Assertion');

    return [validation1, validation2, validation3, validation4];
  }

  public async searchEntityViewMapping(url: string, searchBody: any, headers: Record<string, string>, expectedViews: any[], entityIndex: number = 0): Promise<boolean[]> {
    const response = await this.apiUtil.processAPIRequest('POST', url + '/search', searchBody, headers, 'Search and Verify Views', 'full');

    const validation1 = await this.commonFunctions.compareTwoValues(response.status, 200, 'Search Mapped Views Assertion');
    const validation2 = await this.commonFunctions.compareTwoValues(response.data.views[0].views.length, expectedViews.length, 'Views Count Assertion');
    const validation3 = await this.commonFunctions.compareTwoValues(response.data.views[0].entityId, searchBody.entityId[entityIndex], 'Entity ID Assertion');

    const isViewMappedCorrectly = this.validateViewMapping(expectedViews, response.data.views[0].views);
    const validation4 = await this.commonFunctions.compareTwoValues(isViewMappedCorrectly, true, 'All Views Mapped Correctly Assertion');

    return [validation1, validation2, validation3, validation4];
  }

  public async clearAllEntityViews(url: string, requestBody: any, headers: Record<string, string>, expectedDeleteCount: number): Promise<boolean[]> {
    const response = await this.apiUtil.processAPIRequest('POST', url + '/clear', requestBody, headers, 'Map after Removing All Views', 'full');

    const validation1 = await this.commonFunctions.compareTwoValues(response.status, 200, 'All Mapped Views Cleared Assertion');
    const validation2 = await this.commonFunctions.compareTwoValues(response.data, `Deleted ${expectedDeleteCount} views successfully`, 'Views Cleared Message Assertion');

    return [validation1, validation2];
  }

  public async searchEmptyEntityViews(url: string, searchBody: any, headers: Record<string, string>): Promise<boolean[]> {
    const response = await this.apiUtil.processAPIRequest('POST', url + '/search', searchBody, headers, 'Search and Verify Views', 'full');

    const validation1 = await this.commonFunctions.compareTwoValues(response.status, 200, 'Search Mapped Views Assertion');
    const validation2 = await this.commonFunctions.compareTwoValues(response.data.views[0].views.length, 0, 'Views Count Assertion');

    return [validation1, validation2];
  }

  public async searchEntityViewMappingByAssumptionType(url: string, searchBody: any, headers: Record<string, string>, expectedViews: any[], assumptionType: string): Promise<boolean[]> {
    const response = await this.apiUtil.processAPIRequest('POST', url + '/search', searchBody, headers, 'Search and Verify Views', 'full');

    const validation1 = await this.commonFunctions.compareTwoValues(response.status, 200, 'Search Mapped Views Assertion');

    const targetEntity = response.data.views.find((v: any) => v.entityId === assumptionType);
    const validation2 = await this.commonFunctions.compareTwoValues(targetEntity.views.length, expectedViews.length, 'Views Count Assertion');
    const validation3 = await this.commonFunctions.compareTwoValues(targetEntity.entityId, assumptionType, 'Assumption Type Assertion');

    const isViewMappedCorrectly = this.validateViewMapping(expectedViews, targetEntity.views);
    const validation4 = await this.commonFunctions.compareTwoValues(isViewMappedCorrectly, true, 'All Views Mapped Correctly Assertion');

    return [validation1, validation2, validation3, validation4];
  }

  public async searchEmptyEntityViewsByAssumptionType(url: string, searchBody: any, headers: Record<string, string>, assumptionType: string): Promise<boolean[]> {
    const response = await this.apiUtil.processAPIRequest('POST', url + '/search', searchBody, headers, 'Search and Verify Views', 'full');

    const validation1 = await this.commonFunctions.compareTwoValues(response.status, 200, 'Search Mapped Views Assertion');

    const targetEntity = response.data.views.find((v: any) => v.entityId === assumptionType);
    const validation2 = await this.commonFunctions.compareTwoValues(targetEntity.views.length, 0, 'Views Count Assertion');

    return [validation1, validation2];
  }

  public async performProcedureMappingValidations(response: any, requestBody: any, expectedCount: number): Promise<boolean[]> {
    const isSingleView = requestBody.views.length === 1;

    const validation1 = await this.commonFunctions.compareTwoValues(
      response.status,
      200,
      isSingleView ? 'All Mapped Procedures Mapped To View Assertion' : 'All Mapped Procedures Mapped To Views Assertion'
    );

    if (isSingleView) {
      const validation2 = await this.commonFunctions.compareTwoValues(response.data.entityViewProcedures[0].viewId, requestBody.views[0], 'View ID Assertion For Single View');
      const validation3 = await this.commonFunctions.compareTwoValues(response.data.entityViewProcedures[0].procedures.length, expectedCount, 'Procedure Count Assertion');

      const isProcedureMappedCorrectly = this.validateProcedureMapping(requestBody.procedures, response.data.entityViewProcedures[0].procedures);
      const validation4 = await this.commonFunctions.compareTwoValues(isProcedureMappedCorrectly, true, 'All Procedures Mapped Correctly Assertion');

      return [validation1, validation2, validation3, validation4];
    }

    const validation2 = await this.commonFunctions.compareTwoValues(response.data.entityViewProcedures.length, requestBody.views.length, 'Multiple Views Count Assertion');

    const allViewsHaveCorrectProcedureCount = response.data.entityViewProcedures.every((viewMapping: any) => viewMapping.procedures.length === expectedCount);
    const validation3 = await this.commonFunctions.compareTwoValues(allViewsHaveCorrectProcedureCount, true, `All Views Have ${expectedCount} Procedures Assertion`);

    const areAllViewsMappedCorrectly = response.data.entityViewProcedures.every((viewMapping: any) => {
      const viewExists = requestBody.views.includes(viewMapping.viewId);
      const proceduresCorrect = this.validateProcedureMapping(requestBody.procedures, viewMapping.procedures);
      return viewExists && proceduresCorrect;
    });
    const validation4 = await this.commonFunctions.compareTwoValues(areAllViewsMappedCorrectly, true, 'All Views Procedures Mapped Correctly Assertion');

    return [validation1, validation2, validation3, validation4];
  }

  public async searchProcedures(url: string, searchConfig: any, headers: Record<string, string>, expectedProcedures: any[], expectedCount: number): Promise<boolean[]> {
    const isMultipleViews = Array.isArray(searchConfig);

    if (isMultipleViews) {
      const allValidations: boolean[] = [];
      const searchBodies = searchConfig as any[];

      for (const config of searchBodies) {
        const response = await this.apiUtil.processAPIRequest('POST', url + '/search', config.body, headers, `Search and Verify Procedures - ${config.name}`, 'full');

        const validation1 = await this.commonFunctions.compareTwoValues(response.status, 200, `Search ${config.name} Status Assertion`);
        const validation2 = await this.commonFunctions.compareTwoValues(response.data.viewId, config.body.viewId, `${config.name} ID Assertion`);
        const validation3 = await this.commonFunctions.compareTwoValues(response.data.procedures.length, expectedCount, `${config.name} Procedure Count Assertion`);

        const isProcedureMappedCorrectly = this.validateProcedureMapping(expectedProcedures, response.data.procedures);
        const validation4 = await this.commonFunctions.compareTwoValues(isProcedureMappedCorrectly, true, `${config.name} Procedures Mapped Correctly Assertion`);

        allValidations.push(validation1, validation2, validation3, validation4);
      }

      return allValidations;
    }

    const searchBody = searchConfig;
    const response = await this.apiUtil.processAPIRequest('POST', url + '/search', searchBody, headers, 'Search and Verify Procedures', 'full');

    const validation1 = await this.commonFunctions.compareTwoValues(response.status, 200, 'Search Mapped Procedures Assertion');
    const validation2 = await this.commonFunctions.compareTwoValues(response.data.viewId, searchBody.viewId, 'View ID Assertion');
    const validation3 = await this.commonFunctions.compareTwoValues(response.data.procedures.length, expectedCount, 'Search Procedure Count Assertion');

    const isProcedureMappedCorrectly = this.validateProcedureMapping(expectedProcedures, response.data.procedures);
    const validation4 = await this.commonFunctions.compareTwoValues(isProcedureMappedCorrectly, true, 'All Procedures Mapped Correctly Assertion');

    return [validation1, validation2, validation3, validation4];
  }

  public async removeAllProcedures(response: any, requestBody: any): Promise<boolean[]> {
    const isSingleView = requestBody.views.length === 1;

    const validation1 = await this.commonFunctions.compareTwoValues(response.status, 200, 'Remove All Procedures Success Assertion');

    if (isSingleView) {
      const validation2 = await this.commonFunctions.compareTwoValues(response.data.entityViewProcedures[0].viewId, requestBody.views[0], 'View ID Assertion For Single View');
      const validation3 = await this.commonFunctions.compareTwoValues(response.data.entityViewProcedures[0].procedures.length, 0, 'Empty Procedure Count Assertion');
      return [validation1, validation2, validation3];
    }

    const validation2 = await this.commonFunctions.compareTwoValues(response.data.entityViewProcedures.length, requestBody.views.length, 'Multiple Views Count Assertion');

    const allViewsHaveEmptyProcedures = response.data.entityViewProcedures.every((viewMapping: any) => viewMapping.procedures.length === 0);
    const validation3 = await this.commonFunctions.compareTwoValues(allViewsHaveEmptyProcedures, true, 'All Views Have Empty Procedures Assertion');

    return [validation1, validation2, validation3];
  }

  public createModifiedRequestBody(baseRequestBody: any, modifications: (data: any) => void): any {
    const modifiedData = JSON.parse(JSON.stringify(baseRequestBody));
    modifications(modifiedData);
    return modifiedData;
  }

  public setProcedureValue(procedures: any[], procedureName: string, property: 'primary' | 'secondary', value: boolean): void {
    const procedure = procedures.find((proc: any) => proc.procedureName === procedureName);
    if (procedure) {
      procedure[property] = value;
    }
  }

  public setAllProceduresValue(procedures: any[], property: 'primary' | 'secondary', value: boolean): void {
    procedures.forEach((proc: any) => {
      proc[property] = value;
    });
  }

  public removeProcedure(procedures: any[], procedureName: string): any[] {
    return procedures.filter((proc: any) => proc.procedureName !== procedureName);
  }

  public async mapSingleView(viewId: string, entityType: string, entityId: string, headers: Record<string, string>): Promise<any> {
    const url = buildLinksUrl(`view-entity-map/views/${encodeURIComponent(viewId)}/type/${encodeURIComponent(entityType)}/entity/${encodeURIComponent(entityId)}`);
    return this.apiUtil.processAPIRequest('PUT', url, null, headers, `Map view ${viewId} to ${entityType}/${entityId}`, 'full');
  }

  public async unmapSingleView(viewId: string, entityType: string, entityId: string, headers: Record<string, string>): Promise<any> {
    const url = buildLinksUrl(`view-entity-map/views/${encodeURIComponent(viewId)}/type/${encodeURIComponent(entityType)}/entity/${encodeURIComponent(entityId)}`);
    return this.apiUtil.processAPIRequest('DELETE', url, null, headers, `Unmap view ${viewId} from ${entityType}/${entityId}`, 'full');
  }

  public async createFavourite(body: FavouriteRequest, headers: Record<string, string>, entityId: string, entityType?: string): Promise<any> {
    return this.apiUtil.processAPIRequest('POST', buildLinksUrl(favouritesRoute(entityId, entityType)), body, headers, `Create favourite ${body.viewId} for ${entityType ?? '*'}/${entityId}`, 'full');
  }

  public async getFavourites(headers: Record<string, string>, entityId: string, entityType?: string): Promise<any> {
    return this.apiUtil.processAPIRequest('GET', buildLinksUrl(favouritesRoute(entityId, entityType)), null, headers, `Get favourites for ${entityType ?? '*'}/${entityId}`, 'full');
  }

  public async deleteFavourite(favouriteId: string, headers: Record<string, string>, entityId: string, entityType?: string): Promise<any> {
    const url = buildLinksUrl(`${favouritesRoute(entityId, entityType)}/${encodeURIComponent(favouriteId)}`);
    return this.apiUtil.processAPIRequest('DELETE', url, null, headers, `Delete favourite ${favouriteId} for ${entityType ?? '*'}/${entityId}`, 'full');
  }

  // Removes this user's favourites of the given catalogue view ids; a 404 just means it was already gone.
  public async purgeFavourites(viewIds: string[], headers: Record<string, string>, entityId: string, entityType?: string): Promise<void> {
    const response = await this.getFavourites(headers, entityId, entityType);
    const favourites = Array.isArray(response.data?.views) ? response.data.views : [];
    const favouriteIds = new Set<string>(favourites.filter((view: any) => viewIds.includes(view.viewId)).map((view: any) => view.id));
    for (const favouriteId of favouriteIds) {
      const deleteResponse = await this.deleteFavourite(favouriteId, headers, entityId, entityType);
      await this.commonFunctions.logMessage('INFO', `Purge favourite ${favouriteId} for ${entityType ?? '*'}/${entityId}: status ${deleteResponse.status}`);
    }
  }

  public addProcedure(procedures: any[], newProcedure: any): void {
    procedures.push(newProcedure);
  }

  public extractAllKeys(obj: Record<string, any>, prefix: string = ''): string[] {
    let keys: string[] = [];
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        continue;
      }
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys = keys.concat(this.extractAllKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  }
}

export default MappingUtil;
