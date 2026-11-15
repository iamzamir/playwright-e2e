#!/usr/bin/env node

/**
 * Test data `_schema` generator (T7.5)
 *
 * Adds a `_schema` block as the first key of every test data JSON that has none, typing each top-level key from its
 * value and marking it required (`GRAVITEE` gets the standard override note). The block is inserted as new lines after
 * the opening brace, so the rest of the file keeps its bytes, indentation and line endings. Each result is parsed back
 * and compared with the original before it is written. Without --write it only reports what it would change.
 *
 * Usage:
 *   node scripts/add-testdata-schema.js [--write] [dir-or-file ...]   (default: testdata; testdata/.auth is skipped)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const GRAVITEE_NOTE = 'object (required) - Gravitee gateway overrides; only keys that differ, deep-merged over the base keys when GATEWAY_TYPE=GRAVITEE';
const ELEMENT_TYPES = new Set(['string', 'number', 'boolean', 'object']);

function typeOf(value) {
  if (value === null) return 'null';
  if (!Array.isArray(value)) return typeof value;
  const kinds = new Set(value.map(v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)));
  const [kind] = kinds;
  return kinds.size === 1 && ELEMENT_TYPES.has(kind) ? `${kind}[]` : 'array';
}

function buildSchema(data) {
  const schema = {};
  for (const [key, value] of Object.entries(data)) {
    schema[key] = key === 'GRAVITEE' ? GRAVITEE_NOTE : `${typeOf(value)} (required)`;
  }
  return schema;
}

/** Returns `raw` with a `_schema` block inserted after the opening brace, using the file's own indent and line ending. */
function insertSchema(raw, data) {
  const open = raw.indexOf('{');
  const lineEnd = raw.indexOf('\n', open);
  const keyIndent = lineEnd < 0 ? null : raw.slice(lineEnd + 1).match(/^([ \t]+)"/);
  if (open < 0 || !keyIndent || raw.slice(open + 1, lineEnd).trim() !== '') {
    throw new Error('expected "{" on its own line, followed by an indented key');
  }
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const indent = keyIndent[1];
  const entries = Object.entries(buildSchema(data));
  const lines = [
    `${indent}"_schema": {`,
    ...entries.map(([key, note], i) => `${indent}${indent}${JSON.stringify(key)}: ${JSON.stringify(note)}${i < entries.length - 1 ? ',' : ''}`),
    `${indent}},`
  ];
  const block = lines.join(eol) + eol;
  return { updated: raw.slice(0, lineEnd + 1) + block + raw.slice(lineEnd + 1), block };
}

function listJsonFiles(target, out = []) {
  // Storage states under testdata/.auth are not test data, whether reached by recursion or named directly.
  if (path.normalize(target).split(path.sep).includes('.auth')) return out;
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (target.endsWith('.json')) out.push(target);
    return out;
  }
  for (const name of fs.readdirSync(target)) {
    listJsonFiles(path.join(target, name), out);
  }
  return out;
}

/** Plans (and with `write`, applies) the backfill for `targets`. Throws if any planned change fails its round-trip check. */
function backfill(targets, { write = false } = {}) {
  const result = { checked: 0, alreadyHadSchema: 0, changed: [], skipped: [] };
  for (const file of targets.flatMap(t => listJsonFiles(t))) {
    result.checked++;
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw.replace(/^﻿/, ''));
    if (Array.isArray(data) || data === null || typeof data !== 'object' || Object.keys(data).length === 0) {
      result.skipped.push({ file, reason: 'not a non-empty JSON object' });
      continue;
    }
    if ('_schema' in data) {
      result.alreadyHadSchema++;
      continue;
    }
    const { updated, block } = insertSchema(raw, data);
    const parsed = JSON.parse(updated.replace(/^﻿/, ''));
    assert.strictEqual(Object.keys(parsed)[0], '_schema', `${file}: _schema is not the first key`);
    assert.deepStrictEqual(parsed._schema, buildSchema(data), `${file}: _schema does not match the data`);
    delete parsed._schema;
    assert.deepStrictEqual(parsed, data, `${file}: data changed`);
    assert.strictEqual(updated.replace(block, ''), raw, `${file}: more than the _schema block changed`);
    if (write) fs.writeFileSync(file, updated);
    result.changed.push(file.split(path.sep).join('/'));
  }
  return result;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const targets = args.filter(a => !a.startsWith('--'));
  const result = backfill(targets.length ? targets : ['testdata'], { write });

  const byFolder = {};
  for (const file of result.changed) {
    const folder = file.split('/').slice(0, 2).join('/');
    byFolder[folder] = (byFolder[folder] || 0) + 1;
  }
  console.log(`${write ? 'Added' : 'Would add'} _schema to ${result.changed.length} of ${result.checked} files (${result.alreadyHadSchema} already had one).`);
  for (const [folder, count] of Object.entries(byFolder)) console.log(`  ${folder}: ${count}`);
  for (const { file, reason } of result.skipped) console.log(`  skipped ${file}: ${reason}`);
}

module.exports = { typeOf, buildSchema, insertSchema, backfill };
