import sql from 'mssql';
import { CommonFunctions, getErrorMessage } from './common.util';
import { getTimeout } from '../constants/timeouts';
import { getConfig } from '../configs/env';

export type ViewFilterMappingRow = {
  user_id?: string;
  filter_id?: string;
  view_id?: string;
  entity_id?: string;
  entity_type?: string;
  tenant_id?: string;
  [key: string]: unknown;
};

export type ViewFilterMappingQuery = {
  tenantId: string;
  entityId: string;
  entityType: string;
  viewId: string;
};

const REQUIRED_SQL_ENV = ['SQL_SERVER', 'SQL_DATABASE', 'SQL_USER', 'SQL_PASSWORD'] as const;

function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = (process.env[name] || '').trim().toLowerCase();
  if (!raw) {
    return defaultValue;
  }
  return raw === 'true' || raw === '1';
}

export function isSqlConfigured(): boolean {
  return REQUIRED_SQL_ENV.every((key) => Boolean((process.env[key] || '').trim()));
}

export function missingSqlEnvVars(): string[] {
  return REQUIRED_SQL_ENV.filter((key) => !(process.env[key] || '').trim());
}

function pickColumn(row: ViewFilterMappingRow, ...names: string[]): unknown {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null) {
      return row[name];
    }
    const match = Object.keys(row).find((key) => key.toLowerCase() === name.toLowerCase());
    if (match && row[match] !== undefined && row[match] !== null) {
      return row[match];
    }
  }
  return undefined;
}

export function getRowFilterId(row: ViewFilterMappingRow): string {
  return String(pickColumn(row, 'filter_id', 'filterId') ?? '');
}

export function getRowUserId(row: ViewFilterMappingRow): string {
  return String(pickColumn(row, 'user_id', 'userId') ?? '');
}

function buildSqlConfig(): sql.config {
  const portRaw = (process.env.SQL_PORT || '').trim();
  const port = portRaw ? Number(portRaw) : undefined;
  return {
    user: process.env.SQL_USER,
    password: getConfig().sql.password,
    server: getConfig().sql.server as string,
    database: process.env.SQL_DATABASE,
    ...(port && Number.isFinite(port) ? { port } : {}),
    connectionTimeout: getTimeout('LONG'),
    requestTimeout: getTimeout('XLARGE'),
    options: {
      encrypt: envFlag('SQL_ENCRYPT', true),
      trustServerCertificate: envFlag('SQL_TRUST_SERVER_CERTIFICATE', true)
    }
  };
}

export async function queryViewFilterMapping(params: ViewFilterMappingQuery): Promise<ViewFilterMappingRow[]> {
  const commonFunctions = new CommonFunctions();
  if (!isSqlConfigured()) {
    throw new Error(`SQL is not configured. Missing: ${missingSqlEnvVars().join(', ')}`);
  }

  const pool = new sql.ConnectionPool(buildSqlConfig());
  try {
    await pool.connect();
    await commonFunctions.logMessage('INFO', `Querying view_filter_mapping for entityType=${params.entityType} viewId=${params.viewId}`);
    const result = await pool.request()
      .input('tenantId', sql.NVarChar, params.tenantId)
      .input('entityId', sql.NVarChar, params.entityId)
      .input('entityType', sql.NVarChar, params.entityType)
      .input('viewId', sql.NVarChar, params.viewId)
      .query(`
        SELECT user_id, filter_id, view_id, entity_id, entity_type, tenant_id
        FROM view_filter_mapping
        WHERE tenant_id = @tenantId
          AND entity_id = @entityId
          AND entity_type = @entityType
          AND view_id = @viewId
        ORDER BY user_id
      `);
    const rows = (result.recordset || []) as ViewFilterMappingRow[];
    await commonFunctions.logMessage('INFO', `view_filter_mapping row count: ${rows.length}`);
    return rows;
  } catch (error: unknown) {
    await commonFunctions.logMessage('FAIL', `SQL query failed: ${getErrorMessage(error)}`);
    throw error;
  } finally {
    await pool.close().catch(() => undefined);
  }
}
