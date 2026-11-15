/**
 * Test case documentation catalog drift detector.
 *
 * Verifies that the auto-generated documentation in `docs/testcases/` matches
 * what `scripts/generate-testcase-docs.js` would produce from the current spec files.
 *
 * It normalizes out generated timestamps so that only real documentation drift
 * (added, deleted, renamed tests, modified titles/modes, or changed counts) triggers a failure.
 *
 * Exit code 0: Catalog is in sync.
 * Exit code 1: Catalog drift detected. Run `npm run docs:testcases` and commit the result.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateDocs } = require('./generate-testcase-docs.js');

const DOCS_DIR = path.resolve(__dirname, '..', 'docs', 'testcases');

/**
 * Normalizes Markdown content by replacing generated timestamps while preserving
 * spec counts, test case counts, and all other text.
 */
function normalizeMarkdown(content) {
  return content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => {
      if (/\*\*Generated:\*\*/.test(line)) {
        return line.replace(/(\*\*Generated:\*\*\s*)\S+/, '$1<TIMESTAMP>');
      }
      return line;
    })
    .join('\n');
}

/**
 * Splits a CSV line into fields, respecting RFC 4180 quotes.
 */
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Formats CSV fields back into a line, quoting fields with commas, quotes, or newlines.
 */
function formatCsvLine(fields) {
  return fields
    .map((val) => {
      const str = String(val ?? '');
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    })
    .join(',');
}

/**
 * Normalizes CSV content by ensuring standard Unix line endings.
 * The generated test-cases-index.csv does not contain volatile timestamps.
 */
function normalizeCsv(content) {
  return content.replace(/\r\n/g, '\n');
}

/**
 * Normalizes file content based on file extension.
 */
function normalizeContent(filename, content) {
  if (filename.endsWith('.md')) {
    return normalizeMarkdown(content);
  }
  if (filename.endsWith('.csv')) {
    return normalizeCsv(content);
  }
  return content.replace(/\r\n/g, '\n').trim();
}

/**
 * Finds the first line difference between two normalized strings.
 */
function findDiff(expected, actual) {
  const expLines = expected.split('\n');
  const actLines = actual.split('\n');
  const max = Math.max(expLines.length, actLines.length);
  for (let i = 0; i < max; i++) {
    if (expLines[i] !== actLines[i]) {
      return {
        line: i + 1,
        expected: expLines[i] !== undefined ? expLines[i] : '<EOF>',
        actual: actLines[i] !== undefined ? actLines[i] : '<EOF>'
      };
    }
  }
  return null;
}

/**
 * Checks test case documentation for drift against docsDir.
 *
 * @param {object} [options]
 * @param {string} [options.docsDir] Target documentation directory to verify
 * @param {string} [options.tmpDir] Custom temporary directory for generation
 * @returns {{ inSync: boolean, errors: string[], checkedFiles: string[] }}
 */
function checkTestcaseDocs(options = {}) {
  const docsDir = options.docsDir || DOCS_DIR;
  const isCustomTmp = Boolean(options.tmpDir);
  const tmpDir = options.tmpDir || fs.mkdtempSync(path.join(os.tmpdir(), 'pw-testcase-docs-check-'));

  const errors = [];
  let checkedFiles = [];

  try {
    const { generatedFiles } = generateDocs({ outDir: tmpDir });
    checkedFiles = generatedFiles;
    const generatedSet = new Set(generatedFiles);

    // 1. Check all generated files against existing documentation
    for (const filename of generatedFiles) {
      const actualPath = path.join(docsDir, filename);
      const generatedPath = path.join(tmpDir, filename);

      let actualRaw;
      try {
        actualRaw = fs.readFileSync(actualPath, 'utf8');
      } catch (err) {
        if (err && err.code === 'ENOENT') {
          errors.push(`Missing file: docs/testcases/${filename}`);
          continue;
        }
        throw err;
      }

      const generatedRaw = fs.readFileSync(generatedPath, 'utf8');

      const actualNorm = normalizeContent(filename, actualRaw);
      const generatedNorm = normalizeContent(filename, generatedRaw);

      if (actualNorm !== generatedNorm) {
        const diff = findDiff(generatedNorm, actualNorm);
        if (diff) {
          errors.push(
            `Drift in docs/testcases/${filename} (line ${diff.line}): expected "${diff.expected}" but found "${diff.actual}"`
          );
        } else {
          errors.push(`Drift in docs/testcases/${filename}`);
        }
      }
    }

    // 2. Check for stale auto-generated files in docsDir that are no longer produced
    try {
      const dirEntries = fs.readdirSync(docsDir, { withFileTypes: true });
      for (const entry of dirEntries) {
        if (!entry.isFile() || generatedSet.has(entry.name)) continue;

        try {
          const filePath = path.join(docsDir, entry.name);
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes('Auto-generated by `scripts/generate-testcase-docs.js`')) {
            errors.push(`Stale auto-generated file in docs/testcases: ${entry.name}`);
          }
        } catch {
          // Ignore unreadable or transient files
        }
      }
    } catch (err) {
      if (!err || err.code !== 'ENOENT') {
        throw err;
      }
    }

    return {
      inSync: errors.length === 0,
      errors,
      checkedFiles
    };
  } finally {
    if (!isCustomTmp && fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore temp cleanup errors
      }
    }
  }
}

function main() {
  console.log('Checking testcase documentation for catalog drift...');
  const result = checkTestcaseDocs();

  if (!result.inSync) {
    console.error('\nCatalog drift detected:');
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    console.error('\nRun `npm run docs:testcases` and commit the result.\n');
    process.exit(1);
  }

  console.log(`\nCatalog documentation is up to date (${result.checkedFiles.length} files checked).`);
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  checkTestcaseDocs,
  normalizeMarkdown,
  normalizeCsv,
  parseCsvLine,
  formatCsvLine,
  normalizeContent,
  findDiff
};
