#!/usr/bin/env node
/**
 * Definition-of-Done checker for a Playwright spec.
 *
 * Replaces the manual checklist that was previously re-typed across several agent
 * and prompt files: testdata presence -> suite registration -> banned patterns ->
 * docs regeneration -> focused run.
 *
 * Usage:
 *   npm run finalize-spec -- tests/PlanningSpace/ScopeBatch/Test_001_Foo.spec.ts
 *   npm run finalize-spec -- <spec> --run          also execute the spec (--workers=1)
 *   npm run finalize-spec -- <spec> --no-docs      skip docs:testcases
 *   npm run finalize-spec -- <spec> --env QA       environment for the focused run
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TESTS_DIR = path.join(ROOT, 'tests');
const SUITES_DIR = path.join(TESTS_DIR, 'TestSuites');
const TESTDATA_DIR = path.join(ROOT, 'testdata');
const ENVIRONMENTS = ['INTEROP', 'QA', 'PSR'];

const errors = [];
const warnings = [];
const passes = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function pass(message) {
  passes.push(message);
}

function printUsage() {
  console.log(`
Usage: npm run finalize-spec -- <spec-path> [--run] [--no-docs] [--env <INTEROP|QA|PSR>]

Verifies a spec against the repository Definition of Done:
  1. spec file exists
  2. per-environment testdata JSON exists
  3. spec is registered in tests/TestSuites/*.json
  4. no XPath locators and no static sleeps
  5. regenerates test-case docs
  6. optionally runs the spec in isolation (--run)
`);
}

function resolveSpecPath(input) {
  const candidates = [
    path.resolve(input),
    path.resolve(ROOT, input),
    path.resolve(ROOT, 'tests', input),
  ];
  return candidates.find(candidate => fs.existsSync(candidate)) || '';
}

function checkTestData(specPath) {
  const relativeFromTests = path.relative(TESTS_DIR, specPath);
  if (relativeFromTests.startsWith('..')) {
    warn(`Spec is outside tests/ — skipping testdata check (${relativeFromTests}).`);
    return;
  }

  const specName = path.basename(specPath).replace(/\.spec\.ts$/, '');
  const areaDir = path.dirname(relativeFromTests);
  const missing = [];

  for (const env of ENVIRONMENTS) {
    const expected = path.join(TESTDATA_DIR, env, areaDir, `${specName}.json`);
    if (fs.existsSync(expected)) {
      pass(`testdata present for ${env}`);
    } else {
      missing.push(`${path.relative(ROOT, expected)}`);
    }
  }

  if (missing.length === ENVIRONMENTS.length) {
    warn(`No testdata JSON found for any environment. If this spec is data-driven, create:\n    ${missing.join('\n    ')}`);
  } else if (missing.length > 0) {
    warn(`Missing testdata for some environments:\n    ${missing.join('\n    ')}`);
  }
}

function checkSuiteRegistration(specPath) {
  if (!fs.existsSync(SUITES_DIR)) {
    fail('tests/TestSuites directory not found.');
    return;
  }

  const specFileName = path.basename(specPath);
  const matches = [];

  for (const file of fs.readdirSync(SUITES_DIR).filter(name => name.endsWith('.json'))) {
    const full = path.join(SUITES_DIR, file);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (error) {
      fail(`Suite file ${file} is not valid JSON: ${error.message}`);
      continue;
    }

    const entries = Array.isArray(parsed.testFiles) ? parsed.testFiles : [];
    if (entries.some(entry => entry.endsWith(specFileName))) {
      matches.push(file);
    }
  }

  const unscheduledPath = path.join(SUITES_DIR, '_unscheduled.json');
  if (fs.existsSync(unscheduledPath)) {
    try {
      const unscheduled = JSON.parse(fs.readFileSync(unscheduledPath, 'utf8'));
      const specs = unscheduled.specs || {};
      const relSpec = path.relative(path.join(ROOT, 'tests'), specPath).replace(/\\/g, '/');
      if (specs[relSpec]) {
        matches.push(`_unscheduled.json (${specs[relSpec]})`);
      }
    } catch (_) {}
  }

  if (matches.length === 0) {
    fail(`Spec is not registered in any tests/TestSuites/*.json. CI will not run it.`);
  } else {
    pass(`registered in suite(s): ${matches.join(', ')}`);
  }
}

function checkBannedPatterns(specPath) {
  const source = fs.readFileSync(specPath, 'utf8');
  const lines = source.split(/\r?\n/);

  const rules = [
    { name: 'XPath locator', test: line => /xpath=|\/\/\*\[|page\.locator\(\s*['"`]\s*\/\//.test(line) },
    { name: 'static sleep', test: line => /waitForTimeout\s*\(/.test(line) },
    { name: 'hardcoded timeout', test: line => /timeout:\s*\d{3,}/.test(line) },
  ];

  for (const rule of rules) {
    const hits = [];
    lines.forEach((line, index) => {
      if (rule.test(line)) {
        hits.push(`line ${index + 1}: ${line.trim()}`);
      }
    });

    if (hits.length > 0) {
      fail(`${rule.name} found (use the documented alternative):\n    ${hits.join('\n    ')}`);
    } else {
      pass(`no ${rule.name}`);
    }
  }
}

function run(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  });
  return result.status === 0;
}

function main() {
  const argv = process.argv.slice(2);
  const positional = argv.filter(arg => !arg.startsWith('-'));

  const envIndex = argv.indexOf('--env');
  const environment = envIndex !== -1 && envIndex + 1 < argv.length ? argv[envIndex + 1] : 'INTEROP';
  const specInput = positional.find(arg => arg !== environment);

  if (!specInput) {
    printUsage();
    process.exit(1);
  }

  const specPath = resolveSpecPath(specInput);
  if (!specPath) {
    console.error(`[finalize-spec] Spec not found: ${specInput}`);
    process.exit(1);
  }

  console.log(`[finalize-spec] Checking ${path.relative(ROOT, specPath)}\n`);

  checkTestData(specPath);
  checkSuiteRegistration(specPath);
  checkBannedPatterns(specPath);

  for (const item of passes) {
    console.log(`  OK    ${item}`);
  }
  for (const item of warnings) {
    console.log(`  WARN  ${item}`);
  }
  for (const item of errors) {
    console.log(`  FAIL  ${item}`);
  }

  if (!argv.includes('--no-docs')) {
    console.log('\n[finalize-spec] Regenerating test-case docs...');
    if (!run('node', ['scripts/generate-testcase-docs.js'])) {
      fail('docs:testcases failed.');
    }
  }

  if (argv.includes('--run')) {
    console.log(`\n[finalize-spec] Running spec in isolation (${environment})...`);
    const relative = path.relative(ROOT, specPath).split(path.sep).join('/');
    const ok = run('npx', ['playwright', 'test', relative, '--config=configs/playwright.config.ts', '--workers=1'], {
      ENVIRONMENT: environment,
      TZ: 'Australia/Adelaide',
      USE_SPECIFIC_TESTS: 'false',
    });
    if (!ok) {
      fail('Focused spec run failed.');
    }
  }

  console.log('');
  if (errors.length > 0) {
    console.error(`[finalize-spec] NOT DONE — ${errors.length} blocking issue(s).`);
    process.exit(1);
  }

  console.log(`[finalize-spec] Definition of Done satisfied${warnings.length ? ` (${warnings.length} warning(s))` : ''}.`);
}

main();
