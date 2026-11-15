import { expect, Locator, Page } from '@playwright/test';
import { getTimeout, TIMEOUTS, type TimeoutKey } from '../constants/timeouts';

export async function waitForDelay(page: Page, milliseconds: number): Promise<void> {
  if (milliseconds <= 0) {
    return;
  }
  await page.waitForTimeout(milliseconds);
}

export async function waitForLocatorState(locator: Locator, state: 'attached' | 'detached' | 'visible' | 'hidden' = 'visible', timeoutKey: TimeoutKey = 'EXTREME'): Promise<void> {
  await locator.waitFor({ state, timeout: getTimeout(timeoutKey) });
}

export async function pollUntilTrue(predicate: () => Promise<boolean>, timeoutKey: TimeoutKey = 'LONG', intervalMs: number = TIMEOUTS.POLL_INTERVAL): Promise<void> {
  await expect.poll(async () => await predicate(), { timeout: getTimeout(timeoutKey), intervals: [intervalMs] }).toBe(true);
}

export async function retryOperation<T>(operation: () => Promise<T>, retries: number = 2, initialDelayMs: number = TIMEOUTS.SHORT, backoffMultiplier: number = 2): Promise<T> {
  let currentDelay = initialDelayMs;
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt > retries) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay = Math.ceil(currentDelay * backoffMultiplier);
    }
  }

  throw lastError;
}
