import apiUtil from './api.util';
import { getConfig } from '../configs/env';

// Planning Space views and view groups (dashboards and containers) live in the LUI dashboard service.
const dashboardUrl = (route: string): string => `${(getConfig().hosts.api as string).replace(/\/+$/, '')}/lui/dashboard/${route}`;

/** Deletes a view by id; returns the full ApiUtil response (204 when deleted, 404 when already gone). */
export async function deleteViewById(viewId: string, headers: Record<string, string>, label: string = `Delete view ${viewId}`): Promise<any> {
  return apiUtil.processAPIRequest('DELETE', dashboardUrl(`v2/dashboardsByViewId/${encodeURIComponent(viewId)}`), null, headers, label, 'full');
}

/** Deletes a view group (container) by id; returns the full ApiUtil response (204 when deleted, 404 when already gone). */
export async function deleteViewGroupById(viewGroupId: string, headers: Record<string, string>, label: string = `Delete view group ${viewGroupId}`): Promise<any> {
  return apiUtil.processAPIRequest('DELETE', dashboardUrl(`v2/dashboards/containersRealm/${encodeURIComponent(viewGroupId)}`), null, headers, label, 'full');
}
