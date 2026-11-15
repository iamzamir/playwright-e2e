#!/usr/bin/env node

/**
 * Suite Validator Script (T2.3)
 *
 * Validates test suite manifests, workflow matrix definitions, folder mappings,
 * package.json test scripts, and test coverage across the repository, and that
 * every test data JSON has a `_schema` block (T7.5).
 *
 * Usage:
 *   node scripts/validate-suites.js [--json]
 */

const fs = require('fs');
const path = require('path');

// Glob matching helper: converts glob to RegExp supporting **/ and *
const esc = s => s.replace(/[.+^${}()|[\]\\]/g, ch => '\\' + ch);
const toRe = g => new RegExp('^' + esc(g)
  .replace(/\*\*\//g, '\u0001').replace(/\*\*/g, '\u0002').replace(/\*/g, '[^/]*')
  .replace(/\u0001/g, '(?:.*/)?').replace(/\u0002/g, '.*') + '$');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (entry.name.endsWith('.spec.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

function resolveRoots(customOptions = {}) {
  const cwd = customOptions.cwd || process.cwd();
  const repoRoot = customOptions.repoRoot || (
    fs.existsSync(path.join(cwd, 'playwright-e2e')) ? cwd : path.resolve(cwd, '..')
  );
  const pwDir = customOptions.pwDir || path.join(repoRoot, 'playwright-e2e');
  const testsDir = customOptions.testsDir || path.join(pwDir, 'tests');
  const suitesDir = customOptions.suitesDir || path.join(testsDir, 'TestSuites');
  const visualSuitesDir = customOptions.visualSuitesDir || path.join(testsDir, 'VisualAutomation/VisualSuites');
  const testdataDir = customOptions.testdataDir || path.join(pwDir, 'testdata');
  const visualBaselinesDir = customOptions.visualBaselinesDir || path.join(pwDir, 'testdata/INTEROP/VisualBaseValidations');
  const workflowsDir = customOptions.workflowsDir || path.join(repoRoot, '.github/workflows');
  const pkgPath = customOptions.pkgPath || path.join(pwDir, 'package.json');
  const unscheduledPath = customOptions.unscheduledPath || path.join(suitesDir, '_unscheduled.json');

  return {
    repoRoot,
    pwDir,
    testsDir,
    suitesDir,
    visualSuitesDir,
    testdataDir,
    visualBaselinesDir,
    workflowsDir,
    pkgPath,
    unscheduledPath
  };
}

function validateSuites(options = {}) {
  const roots = resolveRoots(options);
  const errors = [];
  const warnings = [];
  const unregistered = [];

  const allSpecPaths = walk(roots.testsDir).map(p => p.replace(/\\/g, '/'));
  const allSpecsRel = allSpecPaths.map(p => path.relative(roots.testsDir, p).replace(/\\/g, '/'));

  // Collect suite manifests
  const suites = [];
  const visualSuites = [];

  function readSuitesFromDir(dir, list) {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json') || f.startsWith('_')) continue;
      const fullPath = path.join(dir, f);
      try {
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        list.push({ file: f, path: fullPath, data });
      } catch (e) {
        errors.push({
          check: 'suite-manifest-json',
          level: 'ERROR',
          message: `Suite file "${f}" contains invalid JSON: ${e.message}`
        });
      }
    }
  }

  readSuitesFromDir(roots.suitesDir, suites);
  readSuitesFromDir(roots.visualSuitesDir, visualSuites);

  // 1. Check suite entries match at least one spec
  const matchedSpecsBySuite = new Set();
  const allManifests = [...suites, ...visualSuites];

  allManifests.forEach(({ file, data }) => {
    const testFiles = data.testFiles || [];
    testFiles.forEach(pattern => {
      let normPattern = pattern.trim().replace(/\\/g, '/');
      if (normPattern.startsWith('tests/')) {
        normPattern = '**/' + normPattern;
      } else if (!normPattern.startsWith('**/')) {
        normPattern = '**/' + normPattern;
      }
      const regex = toRe(normPattern);
      const matches = allSpecPaths.filter(sp => regex.test(sp));
      if (matches.length === 0) {
        errors.push({
          check: 'suite-manifest-match',
          level: 'ERROR',
          message: `Suite "${file}" entry "${pattern}" matches no spec files.`
        });
      } else {
        matches.forEach(m => matchedSpecsBySuite.add(m));
      }
    });
  });

  // 2. Check package.json SUITENAME and TEST_IGNORE and folder runners
  const pkgRunners = [];
  if (fs.existsSync(roots.pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(roots.pkgPath, 'utf8'));
      const suitenameRe = /SUITENAME=([a-zA-Z0-9_-]+)/g;
      const testIgnoreRe = /TEST_IGNORE=([^\s]+)/g;

      for (const [cmd, script] of Object.entries(pkg.scripts || {})) {
        let m;
        // Check SUITENAME=<name>
        while ((m = suitenameRe.exec(script)) !== null) {
          const suiteName = m[1];
          const suitePath = path.join(roots.suitesDir, `${suiteName}.json`);
          if (!fs.existsSync(suitePath)) {
            errors.push({
              check: 'package-suitename',
              level: 'ERROR',
              message: `package.json script "${cmd}" references non-existent suite "${suiteName}".`
            });
          }
        }

        // Check TEST_IGNORE=<paths>
        const scriptIgnores = new Set();
        while ((m = testIgnoreRe.exec(script)) !== null) {
          const ignoreList = m[1].split(',');
          for (const rawPath of ignoreList) {
            const ignorePath = rawPath.trim().replace(/\\/g, '/');
            if (!ignorePath) continue;
            scriptIgnores.add(ignorePath);
            const fullPath = path.join(roots.pwDir, ignorePath);
            if (!fs.existsSync(fullPath)) {
              errors.push({
                check: 'package-test-ignore',
                level: 'ERROR',
                message: `package.json script "${cmd}" TEST_IGNORE path "${ignorePath}" does not exist.`
              });
            }
          }
        }

        // Collect folders targeted by npm test scripts (e.g. tests/ProcessOrchestration/ActionItemsBatch)
        const parts = script.split(/\s+/);
        const folders = [];
        for (let i = 0; i < parts.length; i++) {
          if (parts[i].startsWith('tests/') && !parts[i].endsWith('.spec.ts')) {
            folders.push(parts[i].replace(/\\/g, '/').replace(/\/$/, ''));
          }
        }
        if (folders.length > 0) {
          pkgRunners.push({
            folders,
            ignores: scriptIgnores,
            source: `package.json:${cmd}`
          });
        }
      }
    } catch (e) {
      errors.push({
        check: 'package-json',
        level: 'ERROR',
        message: `Failed to read package.json: ${e.message}`
      });
    }
  }

  // 3. Check PS Workflow matrix and folder_map
  const psWorkflowPath = path.join(roots.workflowsDir, 'playwright-ps-iop-ui-local-suite.yaml');
  const workflowRunners = [];
  if (fs.existsSync(psWorkflowPath)) {
    const psYaml = fs.readFileSync(psWorkflowPath, 'utf8');

    // Extract folder_map
    const folderMapMatch = psYaml.match(/folder_map\s*=\s*\{([^}]+)\}/);
    if (!folderMapMatch) {
      errors.push({
        check: 'workflow-folder-map',
        level: 'ERROR',
        message: 'Expected "folder_map = { ... }" block not found in playwright-ps-iop-ui-local-suite.yaml.'
      });
    } else {
      const folderLines = folderMapMatch[1].split('\n');
      folderLines.forEach(line => {
        const match = line.match(/"([^"]+)":\s*"([^"]+)"/);
        if (match) {
          const folderPath = match[2].trim().replace(/\\/g, '/').replace(/\/$/, '');
          workflowRunners.push({
            folders: [folderPath],
            ignores: new Set(),
            source: `workflow:folder_map:${match[1].trim()}`
          });
          const fullPath = path.join(roots.pwDir, folderPath);
          if (!fs.existsSync(fullPath)) {
            errors.push({
              check: 'workflow-folder-map-path',
              level: 'ERROR',
              message: `folder_map path "${folderPath}" in playwright-ps-iop-ui-local-suite.yaml does not exist.`
            });
          }
        }
      });
    }

    // Extract json_suites and suite_name
    const jsonSuitesMatch = psYaml.match(/json_suites\s*=\s*\[([^\]]+)\]/);
    if (!jsonSuitesMatch) {
      errors.push({
        check: 'workflow-json-suites',
        level: 'ERROR',
        message: 'Expected "json_suites = [ ... ]" block not found in playwright-ps-iop-ui-local-suite.yaml.'
      });
    } else {
      const suiteNames = [];
      const suiteLines = jsonSuitesMatch[1].split('\n');
      suiteLines.forEach(line => {
        const match = line.match(/"suite":\s*"([^"]+)"/);
        if (match) suiteNames.push(match[1].trim());
      });
      // Check PSSmokeBatch
      const pssmokeMatch = psYaml.match(/"suite_name":\s*"([^"]+)"/);
      if (pssmokeMatch) suiteNames.push(pssmokeMatch[1].trim());

      suiteNames.forEach(suiteName => {
        const suitePath = path.join(roots.suitesDir, `${suiteName}.json`);
        if (!fs.existsSync(suitePath)) {
          errors.push({
            check: 'workflow-suite-name',
            level: 'ERROR',
            message: `PS workflow matrix suite "${suiteName}" not found in tests/TestSuites/.`
          });
        }
      });
    }
  } else {
    errors.push({
      check: 'workflow-ps-exists',
      level: 'ERROR',
      message: `PS workflow not found at "${psWorkflowPath}".`
    });
  }

  // 4. Check visual-suite options in visual-automation-test.yaml
  const visualWorkflowPath = path.join(roots.workflowsDir, 'visual-automation-test.yaml');
  if (fs.existsSync(visualWorkflowPath)) {
    const visualYaml = fs.readFileSync(visualWorkflowPath, 'utf8');
    const visualOptionsMatch = visualYaml.match(/visual-suite:[\s\S]*?options:\s*\n((?:\s+-\s+[^\n]+\n)+)/);
    if (!visualOptionsMatch) {
      errors.push({
        check: 'workflow-visual-suite-options',
        level: 'ERROR',
        message: 'Expected "visual-suite:" input options block not found in visual-automation-test.yaml.'
      });
    } else {
      const options = visualOptionsMatch[1].split('\n')
        .map(l => l.replace(/^\s*-\s*/, '').trim())
        .filter(Boolean);

      options.forEach(option => {
        const suitePath = path.join(roots.visualSuitesDir, `${option}.json`);
        if (!fs.existsSync(suitePath)) {
          errors.push({
            check: 'workflow-visual-suite-option',
            level: 'ERROR',
            message: `visual-suite option "${option}" in visual-automation-test.yaml not found in VisualSuites/.`
          });
        }
      });
    }
  } else {
    errors.push({
      check: 'workflow-visual-exists',
      level: 'ERROR',
      message: `Visual workflow not found at "${visualWorkflowPath}".`
    });
  }

  // 5. Load allow-list (_unscheduled.json)
  let allowList = {};
  if (fs.existsSync(roots.unscheduledPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(roots.unscheduledPath, 'utf8'));
      allowList = data.specs || {};
    } catch (e) {
      errors.push({
        check: 'unscheduled-json',
        level: 'ERROR',
        message: `_unscheduled.json is invalid JSON: ${e.message}`
      });
    }
  }

  // Combine runners that execute specs
  const allRunners = [...pkgRunners, ...workflowRunners];

  function isCoveredByRunners(relSpec) {
    const testPath = ('tests/' + relSpec).replace(/\\/g, '/');
    return allRunners.some(runner => {
      const isUnderFolder = runner.folders.some(folder => testPath.startsWith(folder + '/'));
      return isUnderFolder && !runner.ignores.has(testPath);
    });
  }

  // 6. Check spec coverage
  allSpecsRel.forEach(relSpec => {
    const fullSpec = path.join(roots.testsDir, relSpec).replace(/\\/g, '/');
    const inSuite = matchedSpecsBySuite.has(fullSpec);
    const inFolder = isCoveredByRunners(relSpec);
    const inAllowList = Object.prototype.hasOwnProperty.call(allowList, relSpec);
    const allowReason = typeof allowList[relSpec] === 'string' ? allowList[relSpec].trim() : '';

    if (!inSuite && !inFolder) {
      if (inAllowList && allowReason.length > 0) {
        warnings.push({
          check: 'unscheduled-spec',
          level: 'WARN',
          spec: relSpec,
          reason: allowReason,
          message: `Unscheduled spec: ${relSpec} (${allowReason})`
        });
      } else if (inAllowList && allowReason.length === 0) {
        errors.push({
          check: 'allowlist-missing-reason',
          level: 'ERROR',
          spec: relSpec,
          message: `Allow-list entry "${relSpec}" must specify a non-empty string reason explaining why it runs outside any suite.`
        });
        unregistered.push(relSpec);
      } else {
        errors.push({
          check: 'uncovered-spec',
          level: 'ERROR',
          spec: relSpec,
          message: `Spec "${relSpec}" is not covered by any suite, npm script folder, workflow folder_map, or allow-list.`
        });
        unregistered.push(relSpec);
      }
    }
  });

  // Check for stale or empty allow-list entries
  for (const [specRel, reason] of Object.entries(allowList)) {
    const fullSpec = path.join(roots.testsDir, specRel).replace(/\\/g, '/');
    if (!fs.existsSync(fullSpec)) {
      warnings.push({
        check: 'stale-allowlist-entry',
        level: 'WARN',
        spec: specRel,
        message: `Allow-list entry "${specRel}" does not exist on disk.`
      });
    } else if (typeof reason !== 'string' || !reason.trim()) {
      errors.push({
        check: 'allowlist-missing-reason',
        level: 'ERROR',
        spec: specRel,
        message: `Allow-list entry "${specRel}" must specify a non-empty string reason.`
      });
    }
  }

  // 7. Visual baselines check
  const checkedVisualSpecs = new Set();
  visualSuites.forEach(({ file, data }) => {
    const testFiles = data.testFiles || [];
    testFiles.forEach(pattern => {
      let normPattern = pattern.trim().replace(/\\/g, '/');
      if (normPattern.startsWith('tests/')) {
        normPattern = '**/' + normPattern;
      } else if (!normPattern.startsWith('**/')) {
        normPattern = '**/' + normPattern;
      }
      const regex = toRe(normPattern);
      const matchedSpecs = allSpecPaths.filter(sp => regex.test(sp));

      matchedSpecs.forEach(specPath => {
        if (checkedVisualSpecs.has(specPath)) return;
        checkedVisualSpecs.add(specPath);

        try {
          const content = fs.readFileSync(specPath, 'utf8');
          const pageMatches = [...content.matchAll(/validatePage\s*\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
          const areaMatches = [...content.matchAll(/validateArea\s*\([^,]+,\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
          const baselineNames = [...pageMatches, ...areaMatches];

          const specRelDir = path.relative(path.join(roots.testsDir, 'VisualAutomation/VisualSpecs'), path.dirname(specPath)).replace(/\\/g, '/');

          baselineNames.forEach(name => {
            const baselineFile = path.join(roots.visualBaselinesDir, specRelDir, `${name}.png`);
            if (!fs.existsSync(baselineFile)) {
              warnings.push({
                check: 'visual-baseline-missing',
                level: 'WARN',
                spec: path.relative(roots.testsDir, specPath).replace(/\\/g, '/'),
                baseline: `${specRelDir}/${name}.png`,
                message: `Visual spec "${path.basename(specPath)}" references baseline "${name}" but "${specRelDir}/${name}.png" was not found in testdata/INTEROP/VisualBaseValidations.`
              });
            }
          });
        } catch {
          // ignore read errors here
        }
      });
    });
  });

  // 8. Test data _schema check (testdata/.auth holds storage states, not test data)
  const testdataFiles = [];
  (function collectJson(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '.auth') collectJson(fullPath);
      } else if (entry.name.endsWith('.json')) {
        testdataFiles.push(fullPath);
      }
    }
  })(roots.testdataDir);

  testdataFiles.forEach(file => {
    const rel = path.relative(roots.pwDir, file).replace(/\\/g, '/');
    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
    } catch (e) {
      errors.push({
        check: 'testdata-invalid-json',
        level: 'ERROR',
        file: rel,
        message: `Test data "${rel}" is not valid JSON: ${e.message}`
      });
      return;
    }
    const schema = data && typeof data === 'object' && !Array.isArray(data) ? data._schema : undefined;
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      errors.push({
        check: 'testdata-schema-missing',
        level: 'ERROR',
        file: rel,
        message: `Test data "${rel}" has no "_schema" object (testdata.instructions.md). Add one with: node scripts/add-testdata-schema.js --write ${rel}`
      });
    }
  });

  return {
    valid: errors.length === 0,
    totalSpecs: allSpecsRel.length,
    matchedSuitesSpecs: matchedSpecsBySuite.size,
    errors,
    warnings,
    unregistered,
    uncovered: unregistered,
    unscheduled: warnings.filter(w => w.check === 'unscheduled-spec').map(w => w.spec)
  };
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');

  const result = validateSuites();

  if (isJson) {
    console.log(JSON.stringify({
      valid: result.valid,
      totalSpecs: result.totalSpecs,
      matchedSuitesSpecs: result.matchedSuitesSpecs,
      errors: result.errors,
      warnings: result.warnings,
      unregistered: result.unregistered,
      uncovered: result.uncovered,
      unscheduled: result.unscheduled
    }, null, 2));
  } else {
    console.log('=== Suite and Manifest Validator ===\n');
    console.log(`Total spec files discovered : ${result.totalSpecs}`);
    console.log(`Specs matched by suite manifests : ${result.matchedSuitesSpecs}`);
    console.log(`Errors found                : ${result.errors.length}`);
    console.log(`Warnings / Unscheduled      : ${result.warnings.length}\n`);

    if (result.errors.length > 0) {
      console.log('--- ERRORS ---');
      result.errors.forEach(e => {
        console.log(`  [ERROR] (${e.check}) ${e.message}`);
      });
      console.log('');
    }

    if (result.warnings.length > 0) {
      console.log('--- WARNINGS / UNSCHEDULED ---');
      result.warnings.forEach(w => {
        console.log(`  [WARN]  (${w.check}) ${w.message}`);
      });
      console.log('');
    }

    if (result.valid) {
      console.log('PASS: All suite manifests, workflow matrices, and spec coverages are valid.\n');
    } else {
      console.log('FAIL: Suite validation encountered errors.\n');
    }
  }

  process.exit(result.valid ? 0 : 1);
}

module.exports = {
  validateSuites,
  toRe,
  esc,
  resolveRoots
};
