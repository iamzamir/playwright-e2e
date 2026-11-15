import { ApiUtil } from './api.util';
import { endpoint } from '../configs/env';

export async function getFirstCalendarCycle(apiUtil: ApiUtil, apiBaseUrl: string, headers: Record<string, string>, calendarName: string): Promise<string> {
  const cyclePath = endpoint('ADD_CALENDAR_CYCLE')
    .replace('{calendarName}', encodeURIComponent(calendarName));
  const response = await apiUtil.processAPIRequest(
    'GET',
    `${apiBaseUrl}${cyclePath}?pageNumber=0&pageSize=100`,
    null,
    headers,
    `Get cycles for ${calendarName}`,
    'full'
  );
  if (response.status !== 200) {
    throw new Error(`Failed to fetch cycles for ${calendarName}. Status: ${response.status}`);
  }

  const cycles = Array.isArray(response.data?.data) ? response.data.data : [];
  const cycleName = cycles
    .map((cycle: any) => cycle.name || cycle.cycleName)
    .find((name: unknown): name is string => typeof name === 'string' && name.length > 0);
  if (!cycleName) {
    throw new Error(`No cycles found for ${calendarName}`);
  }
  return cycleName;
}
