import { test } from '@playwright/test';
import * as crypto from 'crypto';

const AUTOMATION_TAG = 'pwauto';

const STAMP_WIDTH = 8; // Date.now() in base36 is 8 characters until the year 2059
const SEQ_WIDTH = 2; // up to 1,296 names per millisecond per worker
let lastStamp = 0;
let seq = 0;

// A per-process numeric token ensuring distinct slot IDs across CI containers when evaluated outside test context
const PROCESS_TOKEN = crypto.randomInt(1000, 9999);

export function runId(): string {
  const ci = process.env.GITHUB_RUN_ID;
  if (ci) return `${ci}${process.env.GITHUB_RUN_ATTEMPT ? `a${process.env.GITHUB_RUN_ATTEMPT}` : ''}`;
  return process.env.PW_LOCAL_RUN_ID || 'local'; // set once in setup.js / playwright.config.ts
}

export function getShardIndex(): number {
  for (const arg of process.argv) {
    const m = /^--shard=(\d+)\/\d+$/.exec(arg);
    if (m) return parseInt(m[1], 10);
  }
  const shardArgIdx = process.argv.indexOf('--shard');
  if (shardArgIdx !== -1 && process.argv[shardArgIdx + 1]) {
    const m = /^(\d+)\/\d+$/.exec(process.argv[shardArgIdx + 1]);
    if (m) return parseInt(m[1], 10);
  }
  const envShard = process.env.SHARD_INDEX || process.env.PW_SHARD || process.env.PW_SHARD_INDEX;
  if (envShard) {
    const parsed = parseInt(envShard, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

function slot(): string {
  try {
    const info = test.info();
    return `s${info.config.shard?.current ?? getShardIndex()}w${info.workerIndex}`;
  } catch {
    const shard = getShardIndex();
    const worker = process.env.TEST_WORKER_INDEX !== undefined ? process.env.TEST_WORKER_INDEX : process.pid;
    return `s${shard}w${worker}${PROCESS_TOKEN}`;
  }
}

function nextStampAndSeq(): string {
  let now = Date.now();
  if (now === lastStamp) {
    seq++;
    if (seq >= 36 ** SEQ_WIDTH) {
      while (Date.now() === now) {
        /* wait for the next millisecond */
      }
      now = Date.now();
      seq = 0;
    }
  } else {
    seq = 0;
  }
  lastStamp = now;
  return now.toString(36).padStart(STAMP_WIDTH, '0') + seq.toString(36).padStart(SEQ_WIDTH, '0');
}

export function uniqueName(prefix: string, maxLength = 60): string {
  const suffix = `_${AUTOMATION_TAG}_${runId()}_${slot()}_${nextStampAndSeq()}`;
  const room = maxLength - suffix.length;
  if (room < 1) {
    throw new Error(`uniqueName: maxLength ${maxLength} is too short; the suffix alone is ${suffix.length} characters (${suffix}).`);
  }
  return `${prefix.slice(0, room)}${suffix}`; // only the prefix is ever shortened, so the suffix stays parseable
}

/**
 * Generates an alphanumeric-only unique name (no underscores, spaces, or symbols).
 * Use for entities (like Process Orchestration processes and subprocesses) whose backend
 * service validators strictly require `^[a-zA-Z0-9]+$` on name or `^[a-zA-Z0-9\s]+$` on displayName (IBP_40_1003).
 */
export function uniqueAlphanumericName(prefix: string, maxLength = 60): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, '');
  const raw = uniqueName(cleanPrefix, maxLength);
  return raw.replace(/[^a-zA-Z0-9]/g, '');
}

export const AUTOMATION_NAME_PATTERN = new RegExp(
  `_${AUTOMATION_TAG}_([a-z0-9]+)_s\\d+w\\d+_([a-z0-9]{${STAMP_WIDTH}})([a-z0-9]{${SEQ_WIDTH}})$`,
  'i'
);

export const ALPHANUMERIC_AUTOMATION_NAME_PATTERN = new RegExp(
  `.*${AUTOMATION_TAG}([a-z0-9]+?)s\\d+w\\d+([a-z0-9]{${STAMP_WIDTH}})([a-z0-9]{${SEQ_WIDTH}})$`,
  'i'
);

export function parseUniqueName(name: string): { runId: string; createdAt: Date } | undefined {
  const m = AUTOMATION_NAME_PATTERN.exec(name) || ALPHANUMERIC_AUTOMATION_NAME_PATTERN.exec(name);
  return m ? { runId: m[1], createdAt: new Date(parseInt(m[2], 36)) } : undefined;
}
