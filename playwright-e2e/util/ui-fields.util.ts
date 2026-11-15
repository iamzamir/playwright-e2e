import { test } from '@playwright/test';
import { CommonFunctions } from './common.util';
import { getConfig, endpoint } from '../configs/env';

export type UiFieldGroup = { groupName: string | null; fields: Array<{ name: string }> };

const HEADER_GROUP_KEY = '_header';

export function buildUiFieldsUrl(route: string, query: Record<string, string | undefined> = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.append(key, value);
    }
  }
  const queryString = params.toString();
  return `${getConfig().hosts.api}${endpoint('UI_FIELDS_BASE')}/${route}${queryString ? `?${queryString}` : ''}`;
}

export function sortedFieldNames(fields: unknown): string[] {
  return Array.isArray(fields) ? fields.map((field: any) => field?.name).sort() : [];
}

// The header group of a details or editor page has a null groupName, so it is keyed as `_header`.
export function groupedFieldNames(groups: unknown): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (!Array.isArray(groups)) {
    return result;
  }
  for (const group of groups as UiFieldGroup[]) {
    result[group?.groupName ?? HEADER_GROUP_KEY] = sortedFieldNames(group?.fields);
  }
  return result;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function compareWithBaseline(commonFunctions: CommonFunctions, actual: unknown, expected: unknown, label: string): Promise<boolean> {
  const matches = await commonFunctions.compareTwoValues(canonicalJson(actual), canonicalJson(expected), label);
  if (!matches) {
    await test.info().attach(`${label} - baseline diff`, {
      body: JSON.stringify({ expected, actual }, null, 2),
      contentType: 'application/json'
    });
  }
  return matches;
}
