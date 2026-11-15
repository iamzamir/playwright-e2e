import CommonFunctions from "../../../util/common.util";
import ApiUtil from "../../../util/api.util";
const psEnv = process.env.PSENV ?? "INTEROP";
const TestData = require("../../../Testdata/" + psEnv + "/ProcessOrchestrationBackend/LinkManagement/Test_008_EntityViewActorsProcedures.json");

describe("Planning View Actor/Procedure Mapping", () => {
    let accessToken: string, headers: Record<string, string>;

    before(async () => {
        accessToken = await ApiUtil.getBearerToken();
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + accessToken
        };
    });

    it("Test Case 1: Map, verify, search, delete, and confirm mapping for actor: Default, procedure: Default", async () => {
        const combo = TestData.combinations[0];
        const baseUrl = process.env.API_BASE_URL + "/cbp/" + psEnv + "/ibp/links/v1/view-entity-map";
        const type = combo.entityType;
        const entity = combo.entityId;
        const endpoint = `${baseUrl}/views/${combo.viewId}/type/${type}/entity/${entity}`;

        await CommonFunctions.logMessage("INFO", `Mapping actor/procedure for view: ${TestData.VIEW_NAME}`);

        await CommonFunctions.compareTwoValues(
            (await ApiUtil.processAPIRequest("PUT", endpoint, combo.mapRequest, headers, "Map Actor/Procedure to View", "full")).status,
            200,
            "Map response status"
        );

        const searchResponse = await ApiUtil.processAPIRequest("POST", baseUrl + "/search", combo.searchRequest, headers, "Search Mapping", "full");
        await CommonFunctions.compareTwoValues(searchResponse.status, 200, "Search response status");
        let foundView = undefined;
        if (searchResponse.data && searchResponse.data.views) {
            for (const entity of searchResponse.data.views) {
                if (entity.views) {
                    for (const view of entity.views) {
                        if (view.id === TestData.VIEW_ID) {
                            foundView = view;
                            break;
                        }
                    }
                }
                if (foundView) break;
            }
        }
        await CommonFunctions.compareTwoValues(!!foundView, true, "View found after mapping");

        await CommonFunctions.compareTwoValues(
            (await ApiUtil.processAPIRequest("DELETE", process.env.API_BASE_URL + combo.deleteEndpoint, null, headers, "Delete Mapping", "full")).status,
            200,
            "Delete response status"
        );

        const searchAfterDelete = await ApiUtil.processAPIRequest("POST", baseUrl + "/search", combo.searchRequest, headers, "Search Mapping After Delete", "full");
        let deletedView = undefined;
        if (searchAfterDelete.data && searchAfterDelete.data.views) {
            for (const entity of searchAfterDelete.data.views) {
                if (entity.views) {
                    for (const view of entity.views) {
                        if (view.id === TestData.VIEW_ID) {
                            deletedView = view;
                            break;
                        }
                    }
                }
                if (deletedView) break;
            }
        }
        expect(deletedView).toBeUndefined();
    });
    
    it("Test Case 2: Map, verify, search, delete, and confirm mapping for actor: Maas, procedure: Default", async () => {
        const combo = TestData.combinations[1];
        const baseUrl = process.env.API_BASE_URL + "/cbp/" + psEnv + "/ibp/links/v1/view-entity-map";
        const type = combo.entityType;
        const entity = combo.entityId;
        const endpoint = `${baseUrl}/views/${combo.viewId}/type/${type}/entity/${entity}`;

        await CommonFunctions.logMessage("INFO", `Mapping actor/procedure for view: ${TestData.VIEW_NAME}`);

        await CommonFunctions.compareTwoValues(
            (await ApiUtil.processAPIRequest("PUT", endpoint, combo.mapRequest, headers, "Map Actor/Procedure to View", "full")).status,
            200,
            "Map response status"
        );

        const searchResponse = await ApiUtil.processAPIRequest("POST", baseUrl + "/search", combo.searchRequest, headers, "Search Mapping", "full");
        await CommonFunctions.compareTwoValues(searchResponse.status, 200, "Search response status");
        let foundView = undefined;
        if (searchResponse.data && searchResponse.data.views) {
            for (const entity of searchResponse.data.views) {
                if (entity.views) {
                    for (const view of entity.views) {
                        if (view.id === TestData.VIEW_ID) {
                            foundView = view;
                            break;
                        }
                    }
                }
                if (foundView) break;
            }
        }
        await CommonFunctions.compareTwoValues(!!foundView, true, "View found after mapping");

        await CommonFunctions.compareTwoValues(
            (await ApiUtil.processAPIRequest("DELETE", process.env.API_BASE_URL + combo.deleteEndpoint, null, headers, "Delete Mapping", "full")).status,
            200,
            "Delete response status"
        );

        const searchAfterDelete = await ApiUtil.processAPIRequest("POST", baseUrl + "/search", combo.searchRequest, headers, "Search Mapping After Delete", "full");
        await CommonFunctions.compareTwoValues(searchAfterDelete.status, 200, "Search after delete response status");
        let deletedView = undefined;
        if (searchAfterDelete.data && searchAfterDelete.data.views) {
            for (const entity of searchAfterDelete.data.views) {
                if (entity.views) {
                    for (const view of entity.views) {
                        if (view.id === TestData.VIEW_ID) {
                            deletedView = view;
                            break;
                        }
                    }
                }
                if (deletedView) break;
            }
        }
        expect(deletedView).toBeUndefined();
    });

    it("Test Case 3: Map, verify, search, delete, and confirm mapping for actor: UI Cache, procedure: Default", async () => {
        const combo = TestData.combinations[2];
        const baseUrl = process.env.API_BASE_URL + "/cbp/" + psEnv + "/ibp/links/v1/view-entity-map";
        const type = combo.entityType;
        const entity = combo.entityId;
        const endpoint = `${baseUrl}/views/${combo.viewId}/type/${type}/entity/${entity}`;

        await CommonFunctions.logMessage("INFO", `Mapping actor/procedure for view: ${TestData.VIEW_NAME}`);

        await CommonFunctions.compareTwoValues(
            (await ApiUtil.processAPIRequest("PUT", endpoint, combo.mapRequest, headers, "Map Actor/Procedure to View", "full")).status,
            200,
            "Map response status"
        );

        const searchResponse = await ApiUtil.processAPIRequest("POST", baseUrl + "/search", combo.searchRequest, headers, "Search Mapping", "full");
        await CommonFunctions.compareTwoValues(searchResponse.status, 200, "Search response status");
        let foundView = undefined;
        if (searchResponse.data && searchResponse.data.views) {
            for (const entity of searchResponse.data.views) {
                if (entity.views) {
                    for (const view of entity.views) {
                        if (view.id === TestData.VIEW_ID) {
                            foundView = view;
                            break;
                        }
                    }
                }
                if (foundView) break;
            }
        }
        await CommonFunctions.compareTwoValues(!!foundView, true, "View found after mapping");

        await CommonFunctions.compareTwoValues(
            (await ApiUtil.processAPIRequest("DELETE", process.env.API_BASE_URL + combo.deleteEndpoint, null, headers, "Delete Mapping", "full")).status,
            200,
            "Delete response status"
        );

        const searchAfterDelete = await ApiUtil.processAPIRequest("POST", baseUrl + "/search", combo.searchRequest, headers, "Search Mapping After Delete", "full");
        await CommonFunctions.compareTwoValues(searchAfterDelete.status, 200, "Search after delete response status");
        let deletedView = undefined;
        if (searchAfterDelete.data && searchAfterDelete.data.views) {
            for (const entity of searchAfterDelete.data.views) {
                if (entity.views) {
                    for (const view of entity.views) {
                        if (view.id === TestData.VIEW_ID) {
                            deletedView = view;
                            break;
                        }
                    }
                }
                if (deletedView) break;
            }
        }
        expect(deletedView).toBeUndefined();
    });

    it("Test Case 4: Map, verify, search, delete, and confirm mapping for actor: Scenario Comparison, procedure: Default", async () => {
        const combo = TestData.combinations[3];
        const baseUrl = process.env.API_BASE_URL + "/cbp/" + psEnv + "/ibp/links/v1/view-entity-map";
        const type = combo.entityType;
        const entity = combo.entityId;
        const endpoint = `${baseUrl}/views/${combo.viewId}/type/${type}/entity/${entity}`;

        await CommonFunctions.logMessage("INFO", `Mapping actor/procedure for view: ${TestData.VIEW_NAME}`);

        await CommonFunctions.compareTwoValues(
            (await ApiUtil.processAPIRequest("PUT", endpoint, combo.mapRequest, headers, "Map Actor/Procedure to View", "full")).status,
            200,
            "Map response status"
        );

        const searchResponse = await ApiUtil.processAPIRequest("POST", baseUrl + "/search", combo.searchRequest, headers, "Search Mapping", "full");
        await CommonFunctions.compareTwoValues(searchResponse.status, 200, "Search response status");
        let foundView = undefined;
        if (searchResponse.data && searchResponse.data.views) {
            for (const entity of searchResponse.data.views) {
                if (entity.views) {
                    for (const view of entity.views) {
                        if (view.id === TestData.VIEW_ID) {
                            foundView = view;
                            break;
                        }
                    }
                }
                if (foundView) break;
            }
        }
        await CommonFunctions.compareTwoValues(!!foundView, true, "View found after mapping");

        await CommonFunctions.compareTwoValues(
            (await ApiUtil.processAPIRequest("DELETE", process.env.API_BASE_URL + combo.deleteEndpoint, null, headers, "Delete Mapping", "full")).status,
            200,
            "Delete response status"
        );

        const searchAfterDelete = await ApiUtil.processAPIRequest("POST", baseUrl + "/search", combo.searchRequest, headers, "Search Mapping After Delete", "full");
        await CommonFunctions.compareTwoValues(searchAfterDelete.status, 200, "Search after delete response status");
        let deletedView = undefined;
        if (searchAfterDelete.data && searchAfterDelete.data.views) {
            for (const entity of searchAfterDelete.data.views) {
                if (entity.views) {
                    for (const view of entity.views) {
                        if (view.id === TestData.VIEW_ID) {
                            deletedView = view;
                            break;
                        }
                    }
                }
                if (deletedView) break;
            }
        }
        expect(deletedView).toBeUndefined();
    });
});