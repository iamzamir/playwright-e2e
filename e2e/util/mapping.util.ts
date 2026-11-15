import CommonFunctions from "./common.util";
import ApiUtil from "./api.util";

export class MappingUtil {
    
    // CORE VALIDATION HELPERS
    static validateViewMapping(expectedViews: any[], actualViews: any[]): boolean {
        return expectedViews.every(reqView => {
            const match = actualViews.find(resView => resView.id === reqView.id);
            return (match 
                && match.sequence === reqView.sequence 
                && match.hidden === reqView.hidden);
        });
    }

    static validateProcedureMapping(expectedProcedures: any[], actualProcedures: any[]): boolean {
        return expectedProcedures.every(reqProcedure => {
            const match = actualProcedures.find(resProcedure => resProcedure.procedureName === reqProcedure.procedureName);
            return (match 
                && match.procedureName === reqProcedure.procedureName
                && match.primary === reqProcedure.primary 
                && match.secondary === reqProcedure.secondary);
        });
    }

    // ENTITY VIEW MAPPING OPERATIONS
    static async performEntityViewMappingValidations(response: any, requestBody: any, entityIndex: number = 0): Promise<boolean[]> {
        const validation1 = await CommonFunctions.compareTwoValues(response.status, "200", "All Mapped Views Mapped To Entity Assertion");
        const validation2 = await CommonFunctions.compareTwoValues(response.data.requestedMappingDetails.viewsCount, requestBody.views.length, "Views Count Assertion");
        const validation3 = await CommonFunctions.compareTwoValues(response.data.requestedMappingDetails.entities[0].entityId[entityIndex], requestBody.entities[0].entityId[entityIndex], "Entity ID Assertion");
        
        const isViewMappedCorrectly = this.validateViewMapping(requestBody.views, response.data.requestedMappingDetails.views);
        const validation4 = await CommonFunctions.compareTwoValues(isViewMappedCorrectly, true, "All Views Mapped Correctly Assertion");
        
        return [validation1, validation2, validation3, validation4];
    }

    static async searchEntityViewMapping(url: string, searchBody: any, headers: any, expectedViews: any[], entityIndex: number = 0): Promise<boolean[]> {
        const response = await ApiUtil.processAPIRequest("POST", url + '/search', searchBody, headers, "Search and Verify Views", "full");
        
        const validation1 = await CommonFunctions.compareTwoValues(response.status, "200", "Search Mapped Views Assertion");
        const validation2 = await CommonFunctions.compareTwoValues(response.data.views[0].views.length, expectedViews.length, "Views Count Assertion");
        const validation3 = await CommonFunctions.compareTwoValues(response.data.views[0].entityId, searchBody.entityId[entityIndex], "Entity ID Assertion");

        const isViewMappedCorrectly = this.validateViewMapping(expectedViews, response.data.views[0].views);
        const validation4 = await CommonFunctions.compareTwoValues(isViewMappedCorrectly, true, "All Views Mapped Correctly Assertion");

        return [validation1, validation2, validation3, validation4];
    }

    static async clearAllEntityViews(url: string, requestBody: any, headers: any, expectedDeleteCount: number): Promise<boolean[]> {
        const response = await ApiUtil.processAPIRequest("POST", url + '/clear', requestBody, headers, "Map after Removing All Views", "full");
        
        const validation1 = await CommonFunctions.compareTwoValues(response.status, "200", "All Mapped Views Cleared Assertion");
        const validation2 = await CommonFunctions.compareTwoValues(response.data, `Deleted ${expectedDeleteCount} views successfully`, "Views Cleared Message Assertion");

        return [validation1, validation2];
    }

    static async searchEmptyEntityViews(url: string, searchBody: any, headers: any): Promise<boolean[]> {
        const response = await ApiUtil.processAPIRequest("POST", url + '/search', searchBody, headers, "Search and Verify Views", "full");
        
        const validation1 = await CommonFunctions.compareTwoValues(response.status, "200", "Search Mapped Views Assertion");
        const validation2 = await CommonFunctions.compareTwoValues(response.data.views[0].views.length, 0, "Views Count Assertion");

        return [validation1, validation2];
    }
    
    static async searchEntityViewMappingByAssumptionType(url: string, searchBody: any, headers: any, expectedViews: any[], assumptionType: string): Promise<boolean[]> {
        const response = await ApiUtil.processAPIRequest("POST", url + '/search', searchBody, headers, "Search and Verify Views", "full");
        
        const validation1 = await CommonFunctions.compareTwoValues(response.status, "200", "Search Mapped Views Assertion");
        
        const targetEntity = response.data.views.find((v: any) => v.entityId === assumptionType);
        const validation2 = await CommonFunctions.compareTwoValues(targetEntity.views.length, expectedViews.length, "Views Count Assertion");
        const validation3 = await CommonFunctions.compareTwoValues(targetEntity.entityId, assumptionType, "Assumption Type Assertion");

        const isViewMappedCorrectly = this.validateViewMapping(expectedViews, targetEntity.views);
        const validation4 = await CommonFunctions.compareTwoValues(isViewMappedCorrectly, true, "All Views Mapped Correctly Assertion");

        return [validation1, validation2, validation3, validation4];
    }

    static async searchEmptyEntityViewsByAssumptionType(url: string, searchBody: any, headers: any, assumptionType: string): Promise<boolean[]> {
        const response = await ApiUtil.processAPIRequest("POST", url + '/search', searchBody, headers, "Search and Verify Views", "full");
        
        const validation1 = await CommonFunctions.compareTwoValues(response.status, "200", "Search Mapped Views Assertion");
        
        const targetEntity = response.data.views.find((v: any) => v.entityId === assumptionType);
        const validation2 = await CommonFunctions.compareTwoValues(targetEntity.views.length, 0, "Views Count Assertion");

        return [validation1, validation2];
    }
    
    // PROCEDURE MAPPING OPERATIONS 
    static async performProcedureMappingValidations(response: any, requestBody: any, expectedCount: number): Promise<boolean[]> {
        const isSingleView = requestBody.views.length === 1;
        
        const validation1 = await CommonFunctions.compareTwoValues(response.status, "200", 
            isSingleView ? "All Mapped Procedures Mapped To View Assertion" : "All Mapped Procedures Mapped To Views Assertion");
        
        if (isSingleView) {
            // Single View Validations
            const validation2 = await CommonFunctions.compareTwoValues(response.data.entityViewProcedures[0].viewId, requestBody.views[0], "View ID Assertion For Single View");
            const validation3 = await CommonFunctions.compareTwoValues(response.data.entityViewProcedures[0].procedures.length, expectedCount, "Procedure Count Assertion");
            
            const isProcedureMappedCorrectly = this.validateProcedureMapping(requestBody.procedures, response.data.entityViewProcedures[0].procedures);
            const validation4 = await CommonFunctions.compareTwoValues(isProcedureMappedCorrectly, true, "All Procedures Mapped Correctly Assertion");
            
            return [validation1, validation2, validation3, validation4];
        } else {
            // Multiple Views Validations
            const validation2 = await CommonFunctions.compareTwoValues(response.data.entityViewProcedures.length, requestBody.views.length, "Multiple Views Count Assertion");
            
            const allViewsHaveCorrectProcedureCount = response.data.entityViewProcedures.every(viewMapping => viewMapping.procedures.length === expectedCount);
            const validation3 = await CommonFunctions.compareTwoValues(allViewsHaveCorrectProcedureCount, true, `All Views Have ${expectedCount} Procedures Assertion`);
            
            const areAllViewsMappedCorrectly = response.data.entityViewProcedures.every(viewMapping => {
                const viewExists = requestBody.views.includes(viewMapping.viewId);
                const proceduresCorrect = this.validateProcedureMapping(requestBody.procedures, viewMapping.procedures);
                return viewExists && proceduresCorrect;
            });
            const validation4 = await CommonFunctions.compareTwoValues(areAllViewsMappedCorrectly, true, "All Views Procedures Mapped Correctly Assertion");
            
            return [validation1, validation2, validation3, validation4];
        }
    }

    static async searchProcedures(url: string, searchConfig: any, headers: any, expectedProcedures: any[], expectedCount: number): Promise<boolean[]> {
        const isMultipleViews = Array.isArray(searchConfig);
        
        if (isMultipleViews) {
            // Multiple Views Search
            const allValidations: boolean[] = [];
            const searchBodies = searchConfig as any[];

            for (const config of searchBodies) {
                const response = await ApiUtil.processAPIRequest("POST", url + '/search', config.body, headers, `Search and Verify Procedures - ${config.name}`, "full");
                
                const validation1 = await CommonFunctions.compareTwoValues(response.status, "200", `Search ${config.name} Status Assertion`);
                const validation2 = await CommonFunctions.compareTwoValues(response.data.viewId, config.body.viewId, `${config.name} ID Assertion`);
                const validation3 = await CommonFunctions.compareTwoValues(response.data.procedures.length, expectedCount, `${config.name} Procedure Count Assertion`);

                const isProcedureMappedCorrectly = this.validateProcedureMapping(expectedProcedures, response.data.procedures);
                const validation4 = await CommonFunctions.compareTwoValues(isProcedureMappedCorrectly, true, `${config.name} Procedures Mapped Correctly Assertion`);

                allValidations.push(validation1, validation2, validation3, validation4);
            }

            return allValidations;
        } else {
            // Single View Search
            const searchBody = searchConfig;
            const response = await ApiUtil.processAPIRequest("POST", url + '/search', searchBody, headers, "Search and Verify Procedures", "full");
            
            const validation1 = await CommonFunctions.compareTwoValues(response.status, "200", "Search Mapped Procedures Assertion");
            const validation2 = await CommonFunctions.compareTwoValues(response.data.viewId, searchBody.viewId, "View ID Assertion");
            const validation3 = await CommonFunctions.compareTwoValues(response.data.procedures.length, expectedCount, "Search Procedure Count Assertion");
            
            const isProcedureMappedCorrectly = this.validateProcedureMapping(expectedProcedures, response.data.procedures);
            const validation4 = await CommonFunctions.compareTwoValues(isProcedureMappedCorrectly, true, "All Procedures Mapped Correctly Assertion");
            
            return [validation1, validation2, validation3, validation4];
        }
    }
    
    static async removeAllProcedures(response: any, requestBody: any): Promise<boolean[]> {
        const isSingleView = requestBody.views.length === 1;
        
        const validation1 = await CommonFunctions.compareTwoValues(response.status, "200", "Remove All Procedures Success Assertion");
        
        if (isSingleView) {
            // Single View Validations
            const validation2 = await CommonFunctions.compareTwoValues(response.data.entityViewProcedures[0].viewId, requestBody.views[0], "View ID Assertion For Single View");
            const validation3 = await CommonFunctions.compareTwoValues(response.data.entityViewProcedures[0].procedures.length, 0, "Empty Procedure Count Assertion");
            return [validation1, validation2, validation3];
        } else {
            // Multiple Views Validations
            const validation2 = await CommonFunctions.compareTwoValues(response.data.entityViewProcedures.length, requestBody.views.length, "Multiple Views Count Assertion");
            
            const allViewsHaveEmptyProcedures = response.data.entityViewProcedures.every(viewMapping => viewMapping.procedures.length === 0);
            const validation3 = await CommonFunctions.compareTwoValues(allViewsHaveEmptyProcedures, true, "All Views Have Empty Procedures Assertion");
            
            return [validation1, validation2, validation3];
        }
    }

    // REQUEST BODY MODIFICATION UTILITIES
    static createModifiedRequestBody(baseRequestBody: any, modifications: (data: any) => void): any {
        const modifiedData = JSON.parse(JSON.stringify(baseRequestBody));
        modifications(modifiedData);
        return modifiedData;
    }

    static setProcedureValue(procedures: any[], procedureName: string, property: 'primary' | 'secondary', value: boolean): void {
        const procedure = procedures.find(proc => proc.procedureName === procedureName);
        if (procedure) {
            procedure[property] = value;
        }
    }

    static setAllProceduresValue(procedures: any[], property: 'primary' | 'secondary', value: boolean): void {
        procedures.forEach(proc => proc[property] = value);
    }

    static removeProcedure(procedures: any[], procedureName: string): any[] {
        return procedures.filter(proc => proc.procedureName !== procedureName);
    }

    static addProcedure(procedures: any[], newProcedure: any): void {
        procedures.push(newProcedure);
    }

    //inp :     { a: 1, b: { c: 2, d: 3 }, e: 4 }
    //out:      [ 'a', 'b.c', 'b.d', 'e' ]
    static extractAllKeys(obj: object, prefix: string = ''): string[] {
        let keys: string[] = [];
        for (let key in obj) {
            if (!obj.hasOwnProperty(key)) continue;
            const fullKey: string = prefix ? `${prefix}.${key}` : key;
            const value = obj[key];
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                keys = keys.concat(MappingUtil.extractAllKeys(value, fullKey));
            } else {
                keys.push(fullKey);
            }
        }
        return keys;
    }
}

export default MappingUtil;