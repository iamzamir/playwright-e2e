import { expect } from '@playwright/test';
import { ApiUtil } from './api.util';
import { getTimeout } from '../constants/timeouts';
import { getConfig, endpoint } from '../configs/env';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ActionItemNodeContext = {
  processName: string;
  processId: string;
  processDisplayName: string;
  // QA Azure IntegratedBusinessPlanning has no actionItemEntityId, so process-level items cannot be created there.
  processEntityId?: string;
  subprocessName: string;
  subprocessId: string;
  subprocessDisplayName: string;
  subprocessEntityId: string;
};

export type ActionItemTemplateBody = Record<string, any>;

// How a write may be retried after the gateway's transient 400; without this a write is sent exactly once.
export type WriteRetry = { idempotent: true } | { findCommitted: () => Promise<any | undefined> };

const GATEWAY_TRANSIENT_ERROR_CODE = 'IBP_40_1027';
const isGatewayTransient = (response: any): boolean => response?.status === '400' && response?.data?.errorCode === GATEWAY_TRANSIENT_ERROR_CODE;

const encode = (value: string): string => encodeURIComponent(value);

export function actionItemServiceUrl(route: string): string {
  const base = endpoint('ACTIONITEM2').replace(/\/actionitems$/, '');
  return `${getConfig().hosts.api}${base}/${route.replace(/^\//, '')}`;
}

export function processOrchestrationUrl(route: string): string {
  return `${getConfig().hosts.api}${endpoint('ACTIONITEM')}${route.replace(/^\//, '')}`;
}

export function processActionItemSearchUrl(processName: string): string {
  return processOrchestrationUrl(`process/${encode(processName)}/actionitem/search`);
}

export function subprocessActionItemSearchUrl(processName: string, subprocessName: string): string {
  return processOrchestrationUrl(`process/${encode(processName)}/subprocess/${encode(subprocessName)}/actionitem/search`);
}

export function uniqueRunId(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

export function itemsOf(response: any): any[] {
  return Array.isArray(response?.data?.data) ? response.data.data : [];
}

export class ActionItemApiHelper {
  constructor(private readonly apiUtil: ApiUtil, private readonly headers: Record<string, string>) {}

  async send(method: HttpMethod, url: string, data: any, label: string, headers: Record<string, string> = this.headers): Promise<any> {
    return this.apiUtil.processAPIRequest(method, url, data, headers, label, 'full');
  }

  // Read-only requests only (GET and search POSTs): the Azure gateway intermittently returns 400 (IBP_40_1027) right after a write.
  async sendUntilStatus(method: HttpMethod, url: string, data: any, expectedStatus: number, label: string): Promise<any> {
    let response: any;
    await expect.poll(async () => {
      response = await this.send(method, url, data, label);
      return response.status;
    }, { message: `${label} did not return ${expectedStatus}`, timeout: getTimeout('XLARGE'), intervals: [1000, 2000, 3000, 5000] }).toBe(expectedStatus);
    return response;
  }

  // Sends a write once and asserts the status; the transient gateway 400 is retried only when `retry` proves a resend is safe.
  async write(method: HttpMethod, url: string, data: any, expectedStatus: number, label: string, retry?: WriteRetry): Promise<any> {
    let response = await this.send(method, url, data, label);
    if (response.status !== expectedStatus && retry && isGatewayTransient(response)) {
      await expect.poll(async () => {
        if ('findCommitted' in retry) {
          const committed = await retry.findCommitted();
          if (committed) {
            response = { status: expectedStatus, data: committed };
            return true;
          }
        }
        response = await this.send(method, url, data, `${label} (retry)`);
        return !isGatewayTransient(response);
      }, { message: `${label} kept returning the transient gateway 400`, timeout: getTimeout('LONG'), intervals: [1000, 2000, 3000] }).toBe(true);
    }
    expect(String(response.status), `${label} returned ${response.status}: ${JSON.stringify(response.data)}`).toBe(String(expectedStatus));
    return response;
  }

  // Polls a search until the predicate holds, which absorbs read-after-write lag; returns the last response.
  async searchUntil(url: string, body: any, predicate: (items: any[]) => boolean, label: string): Promise<any> {
    let response: any;
    await expect.poll(async () => {
      response = await this.send('POST', url, body, label);
      return response.status === 200 && predicate(itemsOf(response));
    }, { message: `${label} never satisfied the expected condition`, timeout: getTimeout('XLARGE'), intervals: [1000, 2000, 3000] }).toBe(true);
    return response;
  }

  async resolveNodeContext(processName: string, subprocessName: string): Promise<ActionItemNodeContext> {
    const processResponse = await this.sendUntilStatus('GET', processOrchestrationUrl(`process/${encode(processName)}`), null, 200, `Get process ${processName}`);
    const subprocessResponse = await this.sendUntilStatus('GET', processOrchestrationUrl(`process/${encode(processName)}/subprocess/${encode(subprocessName)}`), null, 200, `Get subprocess ${subprocessName}`);
    return {
      processName,
      processId: processResponse.data.id,
      processDisplayName: processResponse.data.displayName,
      processEntityId: processResponse.data.actionItemEntityId || undefined,
      subprocessName,
      subprocessId: subprocessResponse.data.id,
      subprocessDisplayName: subprocessResponse.data.displayName,
      subprocessEntityId: subprocessResponse.data.actionItemEntityId
    };
  }

  // Looks an action item up by its unique name through the PO process search, scoped to its entity.
  async findActionItemByName(ctx: ActionItemNodeContext, entityId: string, name: string): Promise<any | undefined> {
    const response = await this.send('POST', processActionItemSearchUrl(ctx.processName), { filter: { entityId }, pageNumber: 0, pageSize: 50 }, `Find action item ${name}`);
    return itemsOf(response).find((item) => item?.name === name);
  }

  async createProcessActionItem(ctx: ActionItemNodeContext, template: ActionItemTemplateBody, name: string): Promise<any> {
    const body = { ...template, name, entityId: ctx.processEntityId, sourceId: ctx.processId, origin: ctx.processId, processName: ctx.processName };
    return this.write('POST', processOrchestrationUrl(`process/${encode(ctx.processName)}/actionitem`), body, 201, `Create process action item ${name}`,
      { findCommitted: () => this.findActionItemByName(ctx, ctx.processEntityId as string, name) });
  }

  async createSubprocessActionItem(ctx: ActionItemNodeContext, template: ActionItemTemplateBody, name: string, subprocessName: string = ctx.subprocessName, entityId: string = ctx.subprocessEntityId): Promise<any> {
    const body = { ...template, name, entityId, processName: ctx.processName, subprocessName, sourceName: subprocessName };
    return this.write('POST', processOrchestrationUrl(`process/${encode(ctx.processName)}/subprocess/${encode(subprocessName)}/actionitem`), body, 201, `Create subprocess action item ${name}`,
      { findCommitted: () => this.findActionItemByName(ctx, entityId, name) });
  }

  // Registers a stand-alone AI entity, the same way the assumptions service registers an assumption.
  async registerEntity(name: string): Promise<string> {
    const response = await this.write('POST', actionItemServiceUrl('entity'), { name, description: 'Playwright action item search fixture', isActive: true, sourceAttributes: [] }, 201, `Register AI entity ${name}`);
    return response.data.id;
  }

  async createAssumptionActionItem(ctx: ActionItemNodeContext, template: ActionItemTemplateBody, entityId: string, sourceName: string, name: string): Promise<any> {
    const body = { ...template, name, entityId, sourceId: entityId, sourceName, sourceType: 'ASSUMPTION', origin: ctx.processId };
    return this.write('POST', actionItemServiceUrl('actionitems'), body, 201, `Create assumption action item ${name}`,
      { findCommitted: () => this.findActionItemByName(ctx, entityId, name) });
  }

  async deleteActionItem(id: string | undefined): Promise<boolean> {
    if (!id) {
      return true;
    }
    const response = await this.send('DELETE', actionItemServiceUrl(`actionitems/${id}`), null, `Cleanup action item ${id}`);
    return response.status === 200 || response.status === '404';
  }

  async deleteEntity(id: string | undefined): Promise<boolean> {
    if (!id) {
      return true;
    }
    const response = await this.send('DELETE', actionItemServiceUrl(`entity/${id}`), null, `Cleanup AI entity ${id}`);
    return response.status === 200 || response.status === '404';
  }

  // Builds a display-name -> code map per filter from GET /actionitems/filters, used to check search results against code filters.
  async filterCodeMaps(contextId: string): Promise<Record<string, Record<string, string>>> {
    const response = await this.sendUntilStatus('GET', actionItemServiceUrl(`actionitems/filters?contextType=ENTITY&contextId=${encode(contextId)}`), null, 200, 'Get action item filter configuration');
    const maps: Record<string, Record<string, string>> = {};
    for (const filter of response.data?.filters ?? []) {
      maps[filter.name] = {};
      for (const value of filter.values ?? []) {
        maps[filter.name][String(value.displayName).toLowerCase()] = String(value.key);
      }
    }
    return maps;
  }
}

// Returns the items whose display values do not map to one of the requested codes for every filtered attribute.
export function itemsOutsideCodeFilter(items: any[], filter: Record<string, string>, codeMaps: Record<string, Record<string, string>>): string[] {
  const offenders: string[] = [];
  for (const item of items) {
    for (const [attribute, codes] of Object.entries(filter)) {
      const allowed = codes.split(',').map((code) => code.trim());
      const code = codeMaps[attribute]?.[String(item?.[attribute]).toLowerCase()];
      if (code === undefined || !allowed.includes(code)) {
        offenders.push(`${item?.id}:${attribute}=${item?.[attribute]}`);
      }
    }
  }
  return offenders;
}
