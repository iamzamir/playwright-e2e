import { test, Page, BrowserContext, TestInfo } from '@playwright/test';
import * as allure from "allure-js-commons";
import { logger, errorLogger } from './logger';
import { TIMEOUTS } from '../constants/timeouts';
import { getConfig } from '../configs/env';

export const SHORT_WAIT = TIMEOUTS.SHORT;
export const MEDIUM_WAIT = TIMEOUTS.MEDIUM;
export const LONG_WAIT = TIMEOUTS.LONG;

// Catch variables are typed `unknown`, so narrow before reading `.message`.
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sanitizeSecrets(message: string): string {
  if (!getConfig().flags.redactBearerToken) {
    return message;
  }
  return message
    .replace(/(["']?authorization["']?\s*[:=]\s*["']?)bearer\s+[^"'\s,}]+/ig, '$1Bearer [REDACTED]')
    .replace(/(["']?(?:access_token|refresh_token|id_token)["']?\s*[:=]\s*["']?)[^"'\s,}]+/ig, '$1[REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}\b/g, '[REDACTED_JWT]');
}

function valuesAreEqual(actual: unknown, expected: unknown, ignoreCase: boolean): boolean {
  return ignoreCase && actual != null && expected != null
    ? String(actual).toLowerCase() === String(expected).toLowerCase()
    : actual === expected || (actual != null && expected != null && String(actual) === String(expected));
}

// Failed-check ledger: module-level because specs and page objects each create their own CommonFunctions.
const MAX_LEDGER_VALUE_LENGTH = 300;
const failedChecksByTest = new Map<string, FailedCheck[]>();
const testsWithActiveLedger = new Set<string>();

export interface FailedCheck {
  message: string;
  expected: string;
  actual: string;
}

export type UnassertedChecksMode = 'off' | 'warn' | 'fail';

export function getUnassertedChecksMode(): UnassertedChecksMode {
  const mode = (process.env.PW_UNASSERTED_CHECKS || '').trim().toLowerCase();
  return mode === 'off' || mode === 'fail' ? mode : 'warn';
}

function ledgerValue(value: unknown): string {
  const text = sanitizeSecrets(String(value));
  return text.length > MAX_LEDGER_VALUE_LENGTH ? `${text.slice(0, MAX_LEDGER_VALUE_LENGTH)}... (${text.length} chars)` : text;
}

function recordFailedCheck(message: string, expected: unknown, actual: unknown): void {
  let testInfo: TestInfo;
  try {
    testInfo = test.info();
  } catch {
    return; // No running test (global setup, plain scripts, worker-fixture teardown).
  }
  const check: FailedCheck = { message: sanitizeSecrets(message), expected: ledgerValue(expected), actual: ledgerValue(actual) };
  // beforeAll and afterAll run outside test fixtures, and a failing beforeAll means the fixture never runs, so name the check now.
  // It cannot be enforced from here: the hook's own expect decides whether the test fails.
  if (!testsWithActiveLedger.has(testInfo.testId)) {
    testInfo.annotations.push({ type: 'hook-failed-check', description: describeFailedChecks([check]) });
    return;
  }
  const checks = failedChecksByTest.get(testInfo.testId) ?? [];
  checks.push(check);
  failedChecksByTest.set(testInfo.testId, checks);
}

function describeFailedChecks(checks: FailedCheck[]): string {
  return checks.map((check) => `${check.message} (expected ${check.expected}, actual ${check.actual})`).join('\n');
}

/**
 * Auto fixture for both fixture files. After the test it names the failed checks on a failing test,
 * and handles a passing test with mismatches (an unasserted check) according to PW_UNASSERTED_CHECKS.
 */
export async function checkLedgerFixture({ }: object, use: () => Promise<void>, testInfo: TestInfo): Promise<void> {
  testsWithActiveLedger.add(testInfo.testId);
  await use();

  testsWithActiveLedger.delete(testInfo.testId);
  const checks = failedChecksByTest.get(testInfo.testId) ?? [];
  failedChecksByTest.delete(testInfo.testId);
  if (checks.length === 0) {
    return;
  }

  const description = describeFailedChecks(checks);
  const log = new CommonFunctions();
  if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {
    testInfo.annotations.push({ type: 'failed-checks', description });
    // INFO, not a failed step: triage reads the last failed step as the failing check, with its expected and actual values.
    await log.logMessage('INFO', `Failed checks in this test:\n${description}`);
    return;
  }

  const mode = getUnassertedChecksMode();
  if (testInfo.status !== 'passed' || mode === 'off') {
    return;
  }
  if (mode === 'fail') {
    throw new Error(checks.map((check) => `Unasserted check failed: ${check.message} (expected ${check.expected}, actual ${check.actual})`).join('\n'));
  }
  testInfo.annotations.push({ type: 'unasserted-check', description });
  await log.logMessage('WARNING', `Test passed with unasserted failed checks:\n${description}`);
}

export class CommonFunctions {
  // constructor(private page: Page, private context: BrowserContext) {}

  private sanitizeLogMessage(message: string): string {
    return sanitizeSecrets(message);
  }

  public async compareTwoValues(sActualValue: any, sExpectedValue: any, sLogMessage: string, bIgnoreCase = false): Promise<boolean> {
    let bValidation = false;
    if (valuesAreEqual(sActualValue, sExpectedValue, bIgnoreCase)) {
      await this.logMessage('PASS', `${sLogMessage} Success !! Actual and Expected Values are:: ${sActualValue}`);
      bValidation = true;
    } else {
      // Before the await: once logging yields, test.info() could already be a different test.
      recordFailedCheck(sLogMessage, sExpectedValue, sActualValue);
      await this.logMessage('FAIL', `${sLogMessage} Failed!! Expected Value:: ${sExpectedValue} || Actual Value:: ${sActualValue}`);
    }
    return bValidation;
  }

  /** The same comparison as compareTwoValues for a probe, where false is a normal answer: logs INFO and never records a failed check. */
  public async valuesMatch(actual: unknown, expected: unknown, label: string, ignoreCase = false): Promise<boolean> {
    const isMatch = valuesAreEqual(actual, expected, ignoreCase);
    await this.logMessage('INFO', `${label}: ${isMatch ? 'match' : 'no match'}. Expected:: ${expected} || Actual:: ${actual}`);
    return isMatch;
  }

  public isStatus(status: unknown, code: number): boolean {
    return status === code || status === String(code);
  }

  public isSuccessStatus(status: unknown): boolean {
    return this.isStatus(status, 200) || this.isStatus(status, 201) || this.isStatus(status, 202);
  }

  public async logMessage(sLogLevel: string, sMessage: string): Promise<void> {
    const levelMap: Record<string, string> = {
      'PASS': 'info',
      'FAIL': 'error',
      'INFO': 'info',
      'WARNING': 'warn'
    };

    const sanitizedMessage = this.sanitizeLogMessage(sMessage);
    const logLevel = levelMap[sLogLevel] || sLogLevel.toLowerCase();
    const reportLevel = sLogLevel.toUpperCase();
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    
    // Use errorLogger for failures to log to separate error file
    if (sLogLevel === 'FAIL') {
      errorLogger.log({ level: logLevel, message: sanitizedMessage });
    }
    
    // Always log to main framework log
    logger.log({ level: logLevel, message: sanitizedMessage });

    const isFailureLevel = reportLevel === 'FAIL' || reportLevel === 'ERROR';
    const emoji = sLogLevel === 'PASS' ? '✅' : isFailureLevel ? '❌' : '';
    const stepName = `${emoji} [${timestamp}] [${reportLevel}] ${sanitizedMessage}`;
    // FAIL/ERROR lines become failed Allure steps so the report pinpoints the check that went wrong,
    // even when the test carries on (or passes) after logging it.
    // Allure steps need a running test; worker-fixture teardown (e.g. createdEntities cleanup) has none, so skip them there.
    try {
      if (isFailureLevel) {
        await allure.logStep(stepName, allure.Status.FAILED);
      } else {
        await allure.step(stepName, async () => { });
      }
    } catch (error) {
      if (!/can only be called (from a test|while test is running)/.test(String((error as Error)?.message))) {
        throw error;
      }
    }
  }

}
