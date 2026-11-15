/**
 * Test case documentation generator.
 *
 * Parses every Playwright spec under `tests/` (excluding the areas listed in
 * EXCLUDED_AREAS) and produces human-readable documentation:
 *   - docs/testcases/TEST-CASES.md        master index with per-area counts
 *   - docs/testcases/<Area>.md            one Markdown file per top-level area
 *   - docs/testcases/test-cases-index.csv flat, filterable index of every test
 *
 * The specs are the single source of truth; re-run `npm run docs:testcases`
 * whenever tests are added or renamed to keep the docs in sync.
 */

const fs = require('fs');
const path = require('path');

const TESTS_ROOT = path.resolve(__dirname, '..', 'tests');
const CANONICAL_DOCS_ROOT = path.resolve(__dirname, '..', 'docs', 'testcases');

function parseArgs(args = process.argv.slice(2)) {
  let outDir = CANONICAL_DOCS_ROOT;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) {
      outDir = path.resolve(process.cwd(), args[i + 1]);
      i++;
    }
  }
  return { outDir };
}

// Areas intentionally excluded from documentation.
const EXCLUDED_AREAS = new Set(['PagesAndBlocks', 'TestSuites']);

/** Recursively collect all *.spec.ts files under a directory. */
function collectSpecFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(collectSpecFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
      files.push(full);
    }
  }
  return files;
}

/** Extract the quoted/backticked title from a `describe(` / `test(` call opener. */
function extractTitle(line) {
  const match = line.match(/\(\s*(['"`])((?:\\.|(?!\1).)*)\1/);
  if (!match) return null;
  return match[2].replace(/\\(['"`])/g, '$1').replace(/\s+/g, ' ').trim();
}

/**
 * Parse a single spec file into a structured record.
 * Returns { describes: [{ title, mode }], tests: [{ title, line, mode }], type }.
 */
function parseSpec(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  const describes = [];
  const tests = [];

  const describeRe = /(?:^|\b)(?:test\.)?describe(\.serial|\.parallel|\.only|\.fixme)?\s*\(/;
  const testRe = /(?:^|[^.\w])(?:test|it)(\.only|\.skip|\.fixme)?\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();

    if (trimmed.startsWith('//')) continue;

    if (describeRe.test(line)) {
      const title = extractTitle(line);
      if (title) {
        const modeMatch = line.match(/describe(\.serial|\.parallel)/);
        describes.push({ title, mode: modeMatch ? modeMatch[1].slice(1) : 'default' });
        continue;
      }
    }

    // Avoid matching test.describe / test.beforeAll / test.step etc.
    if (testRe.test(line) && !/\.(describe|before|after|step|use|slow|setTimeout)/.test(line)) {
      const title = extractTitle(line);
      if (title) {
        const modeMatch = line.match(/(?:test|it)(\.skip|\.only|\.fixme)/);
        tests.push({
          title,
          line: i + 1,
          mode: modeMatch ? modeMatch[1].slice(1) : 'default'
        });
      }
    }
  }

  // A spec that drives the browser stays UI even when it also calls APIs for setup/teardown.
  const usesApi = /processAPIRequest|getBearerToken|buildAuthHeaders|ApiUtil/.test(content);
  const usesUi = /launchAppFromCatalog|signOutAndLoginFromCatalog|loginToPlanningSpace|navigateToPlanningListingPage|navigateToProcessListingPage|clickLeftpaneLinks|clickPowerBarLink|launchContext/.test(content);
  const type = usesApi && !usesUi ? 'API' : 'UI';

  return { describes, tests, type };
}

/** Convert an absolute spec path to a workspace-relative POSIX path (used by the CSV). */
function toRelative(filePath) {
  return path
    .relative(path.resolve(__dirname, '..', '..'), filePath)
    .split(path.sep)
    .join('/');
}

/** Convert an absolute spec path to a path relative to the docs folder (used by Markdown links). */
function toDocRelative(filePath) {
  return path
    .relative(CANONICAL_DOCS_ROOT, filePath)
    .split(path.sep)
    .join('/');
}

function escapeCsv(value) {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function escapeMd(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|');
}

function generateDocs(options = {}) {
  const outDir = options.outDir || parseArgs().outDir;
  if (!fs.existsSync(TESTS_ROOT)) {
    console.error(`Tests directory not found: ${TESTS_ROOT}`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const areas = fs
    .readdirSync(TESTS_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !EXCLUDED_AREAS.has(e.name))
    .map((e) => e.name)
    .sort();

  const generatedAt = new Date().toISOString();
  const csvRows = [['Area', 'Sub Area', 'Suite', 'Test Case', 'Type', 'Mode', 'File', 'Line']];
  const indexRows = [];
  let grandTotalTests = 0;

  for (const area of areas) {
    const areaDir = path.join(TESTS_ROOT, area);
    const specFiles = collectSpecFiles(areaDir).sort();

    let areaTestCount = 0;
    const mdSections = [];

    for (const filePath of specFiles) {
      const rel = toRelative(filePath);
      const docRel = toDocRelative(filePath);
      const relFromArea = path.relative(areaDir, filePath).split(path.sep);
      const subArea = relFromArea.length > 1 ? relFromArea[0] : '(root)';
      const parsed = parseSpec(filePath);
      const suite = parsed.describes.length ? parsed.describes.map((d) => d.title).join(' › ') : path.basename(filePath, '.spec.ts');

      mdSections.push({ subArea, suite, rel, docRel, type: parsed.type, tests: parsed.tests });
      areaTestCount += parsed.tests.length;

      for (const t of parsed.tests) {
        csvRows.push([area, subArea, suite, t.title, parsed.type, t.mode, rel, t.line]);
      }
    }

    grandTotalTests += areaTestCount;

    // Build the per-area Markdown file, grouped by sub area.
    const bySubArea = new Map();
    for (const section of mdSections) {
      if (!bySubArea.has(section.subArea)) bySubArea.set(section.subArea, []);
      bySubArea.get(section.subArea).push(section);
    }

    const md = [];
    md.push(`# ${area} — Test Cases`);
    md.push('');
    md.push(`> Auto-generated by \`scripts/generate-testcase-docs.js\`. Do not edit by hand.`);
    md.push('');
    md.push(`**Specs:** ${specFiles.length}  |  **Test cases:** ${areaTestCount}  |  **Generated:** ${generatedAt}`);
    md.push('');

    for (const subArea of [...bySubArea.keys()].sort()) {
      md.push(`## ${subArea}`);
      md.push('');
      for (const section of bySubArea.get(subArea)) {
        md.push(`### ${escapeMd(section.suite)}`);
        md.push('');
        md.push(`- **Type:** ${section.type}`);
        md.push(`- **Spec:** [${section.rel}](${section.docRel})`);
        md.push('');
        if (section.tests.length) {
          md.push('| # | Test Case | Mode |');
          md.push('|---|-----------|------|');
          section.tests.forEach((t, idx) => {
            md.push(`| ${idx + 1} | [${escapeMd(t.title)}](${section.docRel}#L${t.line}) | ${t.mode} |`);
          });
        } else {
          md.push('_No test cases detected._');
        }
        md.push('');
      }
    }

    const areaFile = path.join(outDir, `${area}.md`);
    fs.writeFileSync(areaFile, md.join('\n'), 'utf8');
    indexRows.push({ area, specs: specFiles.length, tests: areaTestCount });
    console.log(`Wrote ${path.relative(process.cwd(), areaFile)} (${areaTestCount} test cases)`);
  }

  // Master index.
  const indexMd = [];
  indexMd.push('# Test Case Documentation');
  indexMd.push('');
  indexMd.push('> Auto-generated by `scripts/generate-testcase-docs.js`. Do not edit by hand.');
  indexMd.push('> Run `npm run docs:testcases` from `playwright-e2e/` to regenerate.');
  indexMd.push('');
  indexMd.push(`**Total areas:** ${indexRows.length}  |  **Total test cases:** ${grandTotalTests}  |  **Generated:** ${generatedAt}`);
  indexMd.push('');
  indexMd.push('| Area | Specs | Test Cases |');
  indexMd.push('|------|-------|------------|');
  for (const row of indexRows) {
    indexMd.push(`| [${row.area}](${row.area}.md) | ${row.specs} | ${row.tests} |`);
  }
  indexMd.push('');
  indexMd.push('A flat, filterable index of every test case is available in [test-cases-index.csv](test-cases-index.csv).');
  indexMd.push('');
  fs.writeFileSync(path.join(outDir, 'TEST-CASES.md'), indexMd.join('\n'), 'utf8');

  // CSV index.
  const csv = csvRows.map((row) => row.map(escapeCsv).join(',')).join('\n');
  fs.writeFileSync(path.join(outDir, 'test-cases-index.csv'), csv, 'utf8');

  console.log(`\nDone. ${grandTotalTests} test cases across ${indexRows.length} areas.`);
  console.log(`Output: ${path.relative(process.cwd(), outDir)}`);

  return {
    outDir,
    generatedFiles: [...areas.map((a) => `${a}.md`), 'TEST-CASES.md', 'test-cases-index.csv'],
    grandTotalTests,
    areasCount: indexRows.length
  };
}

if (require.main === module) {
  generateDocs();
}

module.exports = {
  generateDocs,
  parseArgs,
  TESTS_ROOT,
  CANONICAL_DOCS_ROOT
};
