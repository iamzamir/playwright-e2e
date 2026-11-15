const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { validateSuites, toRe } = require('../validate-suites.js');

function createTempFixture() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suite-test-'));
  const pwDir = path.join(tmpDir, 'playwright-e2e');
  const testsDir = path.join(pwDir, 'tests');
  const suitesDir = path.join(testsDir, 'TestSuites');
  const visualSuitesDir = path.join(testsDir, 'VisualAutomation', 'VisualSuites');
  const visualSpecsDir = path.join(testsDir, 'VisualAutomation', 'VisualSpecs', 'Area');
  const visualBaselinesDir = path.join(pwDir, 'testdata', 'INTEROP', 'VisualBaseValidations', 'Area');
  const workflowsDir = path.join(tmpDir, '.github', 'workflows');

  fs.mkdirSync(suitesDir, { recursive: true });
  fs.mkdirSync(visualSuitesDir, { recursive: true });
  fs.mkdirSync(visualSpecsDir, { recursive: true });
  fs.mkdirSync(visualBaselinesDir, { recursive: true });
  fs.mkdirSync(workflowsDir, { recursive: true });

  // Minimal valid setup
  const specA = path.join(testsDir, 'Area', 'Test_001.spec.ts');
  fs.mkdirSync(path.dirname(specA), { recursive: true });
  fs.writeFileSync(specA, '// test A');

  // Suite JSON
  fs.writeFileSync(path.join(suitesDir, 'MyBatch.json'), JSON.stringify({
    testFiles: ['**/playwright-e2e/tests/Area/Test_001.spec.ts']
  }));

  // package.json
  fs.writeFileSync(path.join(pwDir, 'package.json'), JSON.stringify({
    name: 'test-pkg',
    scripts: {
      'test:run': 'cross-env SUITENAME=MyBatch npx playwright test'
    }
  }));

  // PS Workflow
  fs.writeFileSync(path.join(workflowsDir, 'playwright-ps-iop-ui-local-suite.yaml'), `
folder_map = {
    "areabatch": "tests/Area",
}
json_suites = [
    {"id": "mybatch", "suite": "MyBatch"},
]
"suite_name": "MyBatch"
`);

  // Visual Workflow
  fs.writeFileSync(path.join(workflowsDir, 'visual-automation-test.yaml'), `
      visual-suite:
        options:
          - MyVisual
`);

  // Visual Suite
  const visualSpec = path.join(visualSpecsDir, 'Test_Visual.spec.ts');
  fs.writeFileSync(visualSpec, "await visual.validatePage('Baseline-01');");
  fs.writeFileSync(path.join(visualBaselinesDir, 'Baseline-01.png'), 'fake-png');

  fs.writeFileSync(path.join(visualSuitesDir, 'MyVisual.json'), JSON.stringify({
    testFiles: ['**/playwright-e2e/tests/VisualAutomation/VisualSpecs/Area/Test_Visual.spec.ts']
  }));

  // _unscheduled.json
  fs.writeFileSync(path.join(suitesDir, '_unscheduled.json'), JSON.stringify({
    specs: {}
  }));

  return {
    tmpDir,
    options: {
      repoRoot: tmpDir,
      pwDir,
      testsDir,
      suitesDir,
      visualSuitesDir,
      visualBaselinesDir,
      workflowsDir,
      pkgPath: path.join(pwDir, 'package.json'),
      unscheduledPath: path.join(suitesDir, '_unscheduled.json')
    },
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true })
  };
}

describe('validate-suites', () => {
  describe('Glob Converter (toRe)', () => {
    it('matches **/playwright-e2e/tests/... style globs', () => {
      const re = toRe('**/playwright-e2e/tests/Area/Test_*.spec.ts');
      assert.strictEqual(re.test('/repo/playwright-e2e/tests/Area/Test_001.spec.ts'), true);
      assert.strictEqual(re.test('C:/repo/playwright-e2e/tests/Area/Test_001.spec.ts'), true);
      assert.strictEqual(re.test('/repo/playwright-e2e/tests/Other/Test_001.spec.ts'), false);
    });

    it('matches tests/... style globs', () => {
      const re = toRe('**/tests/Area/Test_*.spec.ts');
      assert.strictEqual(re.test('/repo/playwright-e2e/tests/Area/Test_001.spec.ts'), true);
      assert.strictEqual(re.test('/repo/playwright-e2e/tests/Other/Test_001.spec.ts'), false);
    });

    it('handles nested wildcard paths correctly', () => {
      const re = toRe('**/playwright-e2e/tests/ProcessOrchestrationBackend/Migration/**/Test_*.spec.ts');
      assert.strictEqual(re.test('/repo/playwright-e2e/tests/ProcessOrchestrationBackend/Migration/Sub/Test_01.spec.ts'), true);
      assert.strictEqual(re.test('/repo/playwright-e2e/tests/ProcessOrchestrationBackend/Migration/Test_01.spec.ts'), true);
      assert.strictEqual(re.test('/repo/playwright-e2e/tests/Other/Test_01.spec.ts'), false);
    });
  });

  describe('Validation Checks', () => {
    it('passes cleanly on valid fixture', () => {
      const fixture = createTempFixture();
      try {
        const result = validateSuites(fixture.options);
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.errors.length, 0);
      } finally {
        fixture.cleanup();
      }
    });

    it('Check 1: reports error when suite entry matches no specs', () => {
      const fixture = createTempFixture();
      try {
        // Add non-existent spec to suite
        fs.writeFileSync(path.join(fixture.options.suitesDir, 'MyBatch.json'), JSON.stringify({
          testFiles: ['**/playwright-e2e/tests/NonExistent/Test_999.spec.ts']
        }));

        const result = validateSuites(fixture.options);
        assert.strictEqual(result.valid, false);
        const err = result.errors.find(e => e.check === 'suite-manifest-match');
        assert.ok(err);
        assert.match(err.message, /matches no spec files/);
      } finally {
        fixture.cleanup();
      }
    });

    it('Check 2: reports error when package.json references missing SUITENAME', () => {
      const fixture = createTempFixture();
      try {
        fs.writeFileSync(fixture.options.pkgPath, JSON.stringify({
          scripts: {
            'test:missing': 'cross-env SUITENAME=GhostBatch npx playwright test'
          }
        }));

        const result = validateSuites(fixture.options);
        assert.strictEqual(result.valid, false);
        const err = result.errors.find(e => e.check === 'package-suitename');
        assert.ok(err);
        assert.match(err.message, /references non-existent suite "GhostBatch"/);
      } finally {
        fixture.cleanup();
      }
    });

    it('Check 3: reports error when workflow folder_map path does not exist', () => {
      const fixture = createTempFixture();
      try {
        fs.writeFileSync(path.join(fixture.options.workflowsDir, 'playwright-ps-iop-ui-local-suite.yaml'), `
folder_map = {
    "missing": "tests/MissingFolder",
}
json_suites = [
    {"id": "mybatch", "suite": "MyBatch"},
]
"suite_name": "MyBatch"
`);

        const result = validateSuites(fixture.options);
        assert.strictEqual(result.valid, false);
        const err = result.errors.find(e => e.check === 'workflow-folder-map-path');
        assert.ok(err);
        assert.match(err.message, /folder_map path "tests\/MissingFolder".*does not exist/);
      } finally {
        fixture.cleanup();
      }
    });

    it('Check 3: reports error when workflow matrix suite does not exist in TestSuites', () => {
      const fixture = createTempFixture();
      try {
        fs.writeFileSync(path.join(fixture.options.workflowsDir, 'playwright-ps-iop-ui-local-suite.yaml'), `
folder_map = {
    "areabatch": "tests/Area",
}
json_suites = [
    {"id": "missing", "suite": "MissingBatch"},
]
"suite_name": "MyBatch"
`);

        const result = validateSuites(fixture.options);
        assert.strictEqual(result.valid, false);
        const err = result.errors.find(e => e.check === 'workflow-suite-name');
        assert.ok(err);
        assert.match(err.message, /suite "MissingBatch" not found in tests\/TestSuites\//);
      } finally {
        fixture.cleanup();
      }
    });

    it('Check 3: reports error when workflow blocks are missing', () => {
      const fixture = createTempFixture();
      try {
        fs.writeFileSync(path.join(fixture.options.workflowsDir, 'playwright-ps-iop-ui-local-suite.yaml'), '# empty yaml');

        const result = validateSuites(fixture.options);
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors.some(e => e.check === 'workflow-folder-map'));
        assert.ok(result.errors.some(e => e.check === 'workflow-json-suites'));
      } finally {
        fixture.cleanup();
      }
    });

    it('Check 4: reports error when visual-suite option does not exist', () => {
      const fixture = createTempFixture();
      try {
        fs.writeFileSync(path.join(fixture.options.workflowsDir, 'visual-automation-test.yaml'), `
      visual-suite:
        options:
          - NonExistentVisual
`);

        const result = validateSuites(fixture.options);
        assert.strictEqual(result.valid, false);
        const err = result.errors.find(e => e.check === 'workflow-visual-suite-option');
        assert.ok(err);
        assert.match(err.message, /visual-suite option "NonExistentVisual".*not found/);
      } finally {
        fixture.cleanup();
      }
    });

    it('Check 5: reports error when package.json TEST_IGNORE path is missing', () => {
      const fixture = createTempFixture();
      try {
        fs.writeFileSync(fixture.options.pkgPath, JSON.stringify({
          scripts: {
            'test:ignore': 'cross-env TEST_IGNORE=tests/Nope/Ghost.spec.ts npx playwright test'
          }
        }));

        const result = validateSuites(fixture.options);
        assert.strictEqual(result.valid, false);
        const err = result.errors.find(e => e.check === 'package-test-ignore');
        assert.ok(err);
        assert.match(err.message, /TEST_IGNORE path "tests\/Nope\/Ghost\.spec\.ts" does not exist/);
      } finally {
        fixture.cleanup();
      }
    });

    it('Check 6: reports error when a new spec is completely uncovered', () => {
      const fixture = createTempFixture();
      try {
        const orphanSpec = path.join(fixture.options.testsDir, 'OrphanArea', 'Test_Orphan.spec.ts');
        fs.mkdirSync(path.dirname(orphanSpec), { recursive: true });
        fs.writeFileSync(orphanSpec, '// orphan');

        const result = validateSuites(fixture.options);
        assert.strictEqual(result.valid, false);
        const err = result.errors.find(e => e.check === 'uncovered-spec');
        assert.ok(err);
        assert.match(err.message, /Spec "OrphanArea\/Test_Orphan\.spec\.ts" is not covered/);
        assert.ok(result.unregistered.includes('OrphanArea/Test_Orphan.spec.ts'));
      } finally {
        fixture.cleanup();
      }
    });

    it('Check 6: reports warning (not error) when an unscheduled spec is in _unscheduled.json', () => {
      const fixture = createTempFixture();
      try {
        const allowListedSpec = path.join(fixture.options.testsDir, 'UnscheduledArea', 'Test_Allowed.spec.ts');
        fs.mkdirSync(path.dirname(allowListedSpec), { recursive: true });
        fs.writeFileSync(allowListedSpec, '// allowed');

        fs.writeFileSync(fixture.options.unscheduledPath, JSON.stringify({
          specs: {
            'UnscheduledArea/Test_Allowed.spec.ts': 'Manual cleanup spec'
          }
        }));

        const result = validateSuites(fixture.options);
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.errors.length, 0);
        const warn = result.warnings.find(w => w.check === 'unscheduled-spec');
        assert.ok(warn);
        assert.match(warn.message, /Unscheduled spec: UnscheduledArea\/Test_Allowed\.spec\.ts/);
      } finally {
        fixture.cleanup();
      }
    });

    it('Check 7: reports warning when visual baseline is missing', () => {
      const fixture = createTempFixture();
      try {
        // Remove baseline image
        fs.rmSync(path.join(fixture.options.visualBaselinesDir, 'Baseline-01.png'));

        const result = validateSuites(fixture.options);
        // Missing baseline is a WARN, not ERROR
        assert.strictEqual(result.valid, true);
        const warn = result.warnings.find(w => w.check === 'visual-baseline-missing');
        assert.ok(warn);
        assert.match(warn.message, /references baseline "Baseline-01"/);
      } finally {
        fixture.cleanup();
      }
    });

    it('Check 6: reports error when folder runner excludes spec via TEST_IGNORE and spec is not allow-listed', () => {
      const fixture = createTempFixture();
      try {
        // Create a spec in an area covered by a runner folder
        const ignoredSpec = path.join(fixture.options.testsDir, 'Area', 'Test_Ignored.spec.ts');
        fs.writeFileSync(ignoredSpec, '// ignored spec');

        // package.json runs tests/Area but ignores Test_Ignored.spec.ts
        fs.writeFileSync(fixture.options.pkgPath, JSON.stringify({
          scripts: {
            'test:area': 'cross-env TEST_IGNORE=tests/Area/Test_Ignored.spec.ts npx playwright test tests/Area'
          }
        }));

        // Override workflow folder_map so it does not cover Area
        fs.writeFileSync(path.join(fixture.options.workflowsDir, 'playwright-ps-iop-ui-local-suite.yaml'), `
folder_map = {
    "other": "tests/Other",
}
json_suites = [
    {"id": "mybatch", "suite": "MyBatch"},
]
"suite_name": "MyBatch"
`);

        const result = validateSuites(fixture.options);
        assert.strictEqual(result.valid, false);
        const err = result.errors.find(e => e.check === 'uncovered-spec' && e.spec === 'Area/Test_Ignored.spec.ts');
        assert.ok(err, 'Expected uncovered-spec error for ignored spec not in allow-list');
      } finally {
        fixture.cleanup();
      }
    });

    it('Check 6: reports error when allow-list entry has an empty reason', () => {
      const fixture = createTempFixture();
      try {
        const spec = path.join(fixture.options.testsDir, 'UnscheduledArea', 'Test_NoReason.spec.ts');
        fs.mkdirSync(path.dirname(spec), { recursive: true });
        fs.writeFileSync(spec, '// no reason');

        fs.writeFileSync(fixture.options.unscheduledPath, JSON.stringify({
          specs: {
            'UnscheduledArea/Test_NoReason.spec.ts': '   '
          }
        }));

        const result = validateSuites(fixture.options);
        assert.strictEqual(result.valid, false);
        const err = result.errors.find(e => e.check === 'allowlist-missing-reason');
        assert.ok(err, 'Expected allowlist-missing-reason error');
        assert.match(err.message, /must specify a non-empty string reason/);
      } finally {
        fixture.cleanup();
      }
    });

    it('Check 7: validates visual baselines for specs matched by a glob pattern in visual suite', () => {
      const fixture = createTempFixture();
      try {
        // Change visual suite to use a glob pattern
        fs.writeFileSync(path.join(fixture.options.visualSuitesDir, 'MyVisual.json'), JSON.stringify({
          testFiles: ['**/playwright-e2e/tests/VisualAutomation/VisualSpecs/Area/*.spec.ts']
        }));

        // Remove baseline image
        fs.rmSync(path.join(fixture.options.visualBaselinesDir, 'Baseline-01.png'));

        const result = validateSuites(fixture.options);
        assert.strictEqual(result.valid, true); // Visual baseline is WARN
        const warn = result.warnings.find(w => w.check === 'visual-baseline-missing');
        assert.ok(warn, 'Expected visual-baseline-missing warning for glob-matched spec');
        assert.match(warn.message, /references baseline "Baseline-01"/);
      } finally {
        fixture.cleanup();
      }
    });

    it('Check 8: reports error when a test data JSON has no _schema, and ignores testdata/.auth', () => {
      const fixture = createTempFixture();
      try {
        const dataDir = path.join(fixture.options.pwDir, 'testdata', 'INTEROP', 'Area');
        fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(path.join(dataDir, 'Test_001.json'), JSON.stringify({ REALM_NAME: 'realm' }));
        const authDir = path.join(fixture.options.pwDir, 'testdata', '.auth', 'realm');
        fs.mkdirSync(authDir, { recursive: true });
        fs.writeFileSync(path.join(authDir, 'user1.json'), JSON.stringify({ cookies: [] }));

        const result = validateSuites(fixture.options);
        const errs = result.errors.filter(e => e.check === 'testdata-schema-missing');
        assert.strictEqual(result.valid, false);
        assert.strictEqual(errs.length, 1);
        assert.strictEqual(errs[0].file, 'testdata/INTEROP/Area/Test_001.json');
      } finally {
        fixture.cleanup();
      }
    });

    it('Check 8: accepts test data with a _schema object and reports invalid JSON', () => {
      const fixture = createTempFixture();
      try {
        const dataDir = path.join(fixture.options.pwDir, 'testdata', 'INTEROP', 'Area');
        fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(path.join(dataDir, 'Test_001.json'), JSON.stringify({ _schema: { REALM_NAME: 'string (required)' }, REALM_NAME: 'realm' }));
        fs.writeFileSync(path.join(dataDir, 'Test_002.json'), '{ "REALM_NAME": ');

        const result = validateSuites(fixture.options);
        assert.strictEqual(result.errors.filter(e => e.check === 'testdata-schema-missing').length, 0);
        const invalid = result.errors.filter(e => e.check === 'testdata-invalid-json');
        assert.strictEqual(invalid.length, 1);
        assert.strictEqual(invalid[0].file, 'testdata/INTEROP/Area/Test_002.json');
      } finally {
        fixture.cleanup();
      }
    });

    it('exposes contract fields { errors, warnings, unregistered, uncovered, unscheduled }', () => {
      const fixture = createTempFixture();
      try {
        const result = validateSuites(fixture.options);
        assert.ok(Array.isArray(result.errors));
        assert.ok(Array.isArray(result.warnings));
        assert.ok(Array.isArray(result.unregistered));
        assert.ok(Array.isArray(result.uncovered));
        assert.ok(Array.isArray(result.unscheduled));
      } finally {
        fixture.cleanup();
      }
    });
  });

  describe('Real Repository Validation', () => {
    it('runs on active repository in under 5 seconds with 0 errors', () => {
      const start = Date.now();
      const result = validateSuites();
      const duration = Date.now() - start;

      assert.strictEqual(result.valid, true, `Expected valid: true, got errors: ${JSON.stringify(result.errors)}`);
      assert.strictEqual(result.errors.length, 0);
      assert.ok(result.totalSpecs >= 237, `Expected at least 237 specs, found ${result.totalSpecs}`);
      assert.ok(duration < 5000, `Expected duration < 5000ms, took ${duration}ms`);
    });
  });
});
