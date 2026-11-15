import axios from "axios";
import 'expect-webdriverio';
import CommonFunctions from "./common.util";

export class ApiUtil {

  private isBearerTokenResponse(url: string, logMessage: string, payload: any): boolean {
    const normalizedUrl = url.toLowerCase();
    const normalizedLogMessage = logMessage.toLowerCase();
    const isTokenEndpoint = normalizedUrl.includes('token') || normalizedUrl.includes('oauth') || normalizedLogMessage.includes('bearer token') || normalizedLogMessage.includes('access token');
    const hasAccessToken = typeof payload === 'object' && payload !== null && 'access_token' in payload;
    return isTokenEndpoint || hasAccessToken;
  }

  private async logResponsePayload(url: string, logMessage: string, payload: any): Promise<void> {
    if (this.isBearerTokenResponse(url, logMessage, payload)) {
      await CommonFunctions.logMessage('INFO', 'Response Payload: [REDACTED - bearer token response]');
      return;
    }

    await CommonFunctions.logMessage('INFO', `Response Payload: ${JSON.stringify(payload)}`);
  }

  public async processAPIRequest(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, data: any = null, headers: Record<string, string> = {}, logMessage: string, responseType: "data" | "status" | "headers" | "full" = "data"): Promise<any> {
    try {
      
      await CommonFunctions.logMessage("INFO", `Sending ${method} request to ${url}`);
      await CommonFunctions.logMessage("INFO", `Request Payload: ${JSON.stringify(data)}`);
      // await CommonFunctions.logMessage("INFO", `Request Payload: ${data}`);
      const config = {
        method,
        url,
        headers: { "Content-Type": "application/json", ...headers },
        ...(data && ["POST", "PUT", "PATCH"].includes(method) && { data }),
      };
      const response = await axios(config);
      await CommonFunctions.logMessage("INFO", `${logMessage} Success! Status: ${response.status}`);
      await CommonFunctions.logMessage("INFO", `Status Text: ${response.statusText}`);
      await CommonFunctions.logMessage("INFO", "Trace Id: " + response.headers['trace-id']);
      await this.logResponsePayload(url, logMessage, response.data);
      return responseType === "full" ? response : response[responseType];
    } catch (error: any) {
      const errorDetails = error.response
        ? `Error: ${error.response.status} ${error.response.statusText} | Response: ${JSON.stringify(error.response.data, null, 2)}`
        : `Error: ${error.message}`;

      await CommonFunctions.logMessage("FAIL", `${logMessage} Failed! ${errorDetails}`);
      // Always return a response-like object for negative cases
      return {
        status: error.response?.status?.toString() || "ERROR",
        data: error.response?.data,
        headers: error.response?.headers,
      };
    }
  }

  public async getBearerToken(authUrl: string = process.env.AUTH_URL as string, clientId: string = process.env.CLIENT_ID as string, clientSecret: string = process.env.CLIENT_SECRET as string, scope: string = process.env.SCOPE as string, realmId: string = process.env.REALM_ID as string): Promise<string> {
    const url = "" + authUrl + "?realmId=" + realmId + "";
    const requestData = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: scope,
      grant_type: "client_credentials"
    });
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    // await CommonFunctions.logMessage("INFO", `Fetching Bearer Token from ${url} with data: ${requestData.toString()}`);
    const response = await this.processAPIRequest("POST", url, requestData, headers, "Fetching Bearer Token");
    return response.access_token;
  }

  /* DO NOT TOUCH 
  public async postMethod(sUrl: string, requestData: any, sHeaders: Record<string, string>, sLogMessage: string): Promise<any> {
    try {
      await CommonFunctions.logMessage("INFO", `Sending POST request to ${sUrl} with data: ${JSON.stringify(requestData)}`);

      const axiosConfig = {
        headers: {
          "Content-Type": "application/json",
          ...sHeaders,
        },
      };

      const response = await axios.post(sUrl, requestData, axiosConfig);
      await CommonFunctions.logMessage("PASS", `${sLogMessage} Success! Received Response: ${JSON.stringify(response.data)}`);

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response
        ? `Error: ${error.response.status} ${error.response.statusText} | Response: ${JSON.stringify(error.response.data)}`
        : `Error: ${error.message}`;
      await CommonFunctions.logMessage("FAIL", `${sLogMessage} Failed! ${errorMessage}`);
      throw error;
    }
  }

  public async getMethod(sUrl: string, sHeaders: Record<string, string>, sLogMessage: string, responseType: "data" | "status" | "headers" | "full" = "data"): Promise<any> {
    try {
      await CommonFunctions.logMessage("INFO", `Sending GET request to ${sUrl}`);
      const axiosConfig = {
        headers: {
          "Content-Type": "application/json",
          ...sHeaders,
        },
      };

      const response = await axios.get(sUrl, axiosConfig);
      await CommonFunctions.logMessage("PASS", `${sLogMessage} Success! Received Response: ${JSON.stringify(response.data, null, 2)}`
      );

      return responseType === "full" ? response : response[responseType];
    } catch (error: any) {
      const errorMessage = error.response
        ? `Error: ${error.response.status} ${error.response.statusText} | Response: ${JSON.stringify(error.response.data, null, 2)}`
        : `Error: ${error.message}`;
      await CommonFunctions.logMessage("FAIL", `${sLogMessage} Failed! ${errorMessage}`);
      throw error;
    }
  }

  public async putMethod(sUrl: string, requestData: any, sHeaders: Record<string, string>, sLogMessage: string): Promise<any> {
    try {
      await CommonFunctions.logMessage("INFO", `Sending PUT request to ${sUrl} with data: ${JSON.stringify(requestData)}`);

      const axiosConfig = {
        headers: {
          "Content-Type": "application/json",
          ...sHeaders,
        },
      };

      const response = await axios.put(sUrl, requestData, axiosConfig);
      await CommonFunctions.logMessage("PASS", `${sLogMessage} Success! Received Response: ${JSON.stringify(response.data)}`);

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response
        ? `Error: ${error.response.status} ${error.response.statusText} | Response: ${JSON.stringify(error.response.data)}`
        : `Error: ${error.message}`;
      await CommonFunctions.logMessage("FAIL", `${sLogMessage} Failed! ${errorMessage}`);
      throw error;
    }
  }

  public async patchMethod(sUrl: string, requestData: any, sHeaders: Record<string, string>, sLogMessage: string): Promise<any> {
    try {
      await CommonFunctions.logMessage("INFO", `Sending PATCH request to ${sUrl} with data: ${JSON.stringify(requestData)}`);

      const axiosConfig = {
        headers: {
          "Content-Type": "application/json",
          ...sHeaders,
        },
      };

      const response = await axios.patch(sUrl, requestData, axiosConfig);
      await CommonFunctions.logMessage("PASS", `${sLogMessage} Success! Received Response: ${JSON.stringify(response.data)}`);

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response
        ? `Error: ${error.response.status} ${error.response.statusText} | Response: ${JSON.stringify(error.response.data)}`
        : `Error: ${error.message}`;
      await CommonFunctions.logMessage("FAIL", `${sLogMessage} Failed! ${errorMessage}`);
      throw error;
    }
  }

  public async deleteMethod(sUrl: string, sHeaders: Record<string, string>, sLogMessage: string): Promise<any> {
    try {
      await CommonFunctions.logMessage("INFO", `Sending DELETE request to ${sUrl}`);

      const axiosConfig = {
        headers: {
          "Content-Type": "application/json",
          ...sHeaders,
        },
      };

      const response = await axios.delete(sUrl, axiosConfig);
      await CommonFunctions.logMessage("PASS", `${sLogMessage} Success! Received Response: ${JSON.stringify(response.data)}`);

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response
        ? `Error: ${error.response.status} ${error.response.statusText} | Response: ${JSON.stringify(error.response.data)}`
        : `Error: ${error.message}`;
      await CommonFunctions.logMessage("FAIL", `${sLogMessage} Failed! ${errorMessage}`);
      throw error;
    }
  }*/

}
export default new ApiUtil();
