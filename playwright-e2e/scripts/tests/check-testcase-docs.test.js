const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  checkTestcaseDocs,
  normalizeMarkdown,
  normalizeCsv,
  parseCsvLine,
  formatCsvLine,
  findDiff
} = require('../check-testcase-docs.js');
const { generateDocs } = require('../generate-testcase-docs.js');

describe('check-testcase-docs', () => {
  describe('normalizeMarkdown', () => {
    it('normalizes timestamp on **Generated:** lines', () => {
      const input = '**Specs:** 19  |  **Test cases:** 36  |  **Generated:** 2026-10-01T14:53:27.980Z';
      const output = normalizeMarkdown(input);
      assert.strictEqual(
        output,
        '**Specs:** 19  |  **Test cases:** 36  |  **Generated:** <TIMESTAMP>'
      );
    });

    it('preserves spec count and test count when timestamp differs', () => {
      const a = '**Specs:** 19  |  **Test cases:** 36  |  **Generated:** 2026-10-01T14:53:27.980Z';
      const b = '**Specs:** 19  |  **Test cases:** 36  |  **Generated:** 2026-10-08T18:00:00.000Z';
      assert.strictEqual(normalizeMarkdown(a), normalizeMarkdown(b));
    });

    it('detects count differences on **Generated:** line', () => {
      const a = '**Specs:** 19  |  **Test cases:** 36  |  **Generated:** 2026-10-01T14:53:27.980Z';
      const b = '**Specs:** 20  |  **Test cases:** 36  |  **Generated:** 2026-10-08T18:00:00.000Z';
      assert.notStrictEqual(normalizeMarkdown(a), normalizeMarkdown(b));
    });

    it('normalizes CRLF and LF identically', () => {
      const crlf = '# Title\r\n\r\nLine 1\r\nLine 2';
      const lf = '# Title\n\nLine 1\nLine 2';
      assert.strictEqual(normalizeMarkdown(crlf), normalizeMarkdown(lf));
    });

    it('preserves non-timestamp content, trailing spaces, and boundary newlines', () => {
      const content = '# Title  \n\n- item 1  \n\n';
      assert.strictEqual(normalizeMarkdown(content), content);
    });
  });

  describe('normalizeCsv', () => {
    it('normalizes CRLF and LF identically without altering columns or rows', () => {
      const crlf = 'Area,Sub Area,Suite,Test Case\r\nPO,root,Suite 1,Test 1\r\n';
      const lf = 'Area,Sub Area,Suite,Test Case\nPO,root,Suite 1,Test 1\n';
      assert.strictEqual(normalizeCsv(crlf), lf);
    });

    it('preserves all columns including candidate or date fields without masking drift', () => {
      const csv = 'Area,Sub Area,Candidate Date,Test Case\nPO,root,2026-10-01,Test 1';
      assert.strictEqual(normalizeCsv(csv), csv);
    });
  });

  describe('parseCsvLine and formatCsvLine', () => {
    it('correctly parses unquoted and quoted fields with escaped quotes', () => {
      const line = 'A,"B, with comma","C with ""quotes"""';
      const parsed = parseCsvLine(line);
      assert.deepStrictEqual(parsed, ['A', 'B, with comma', 'C with "quotes"']);
      assert.strictEqual(formatCsvLine(parsed), line);
    });
  });

  describe('findDiff', () => {
    it('returns null when strings are identical', () => {
      assert.strictEqual(findDiff('line 1\nline 2', 'line 1\nline 2'), null);
    });

    it('finds the first differing line', () => {
      const diff = findDiff('line 1\nline 2 expected\nline 3', 'line 1\nline 2 actual\nline 3');
      assert.deepStrictEqual(diff, {
        line: 2,
        expected: 'line 2 expected',
        actual: 'line 2 actual'
      });
    });
  });

  describe('checkTestcaseDocs against mock dirs (isolated)', () => {
    it('detects content drift when a test title or link differs', () => {
      const tmpTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-test-'));
      const mockDocsDir = path.join(tmpTestDir, 'docs');
      const mockOutDir = path.join(tmpTestDir, 'out');
      fs.mkdirSync(mockDocsDir, { recursive: true });
      fs.mkdirSync(mockOutDir, { recursive: true });

      // Generate complete baseline into mockDocsDir
      generateDocs({ outDir: mockDocsDir });

      // Mutate exactly one file in mockDocsDir
      fs.appendFileSync(path.join(mockDocsDir, 'Performance.md'), '\nExtra drifted line');

      const result = checkTestcaseDocs({ docsDir: mockDocsDir, tmpDir: mockOutDir });
      assert.strictEqual(result.inSync, false);
      assert.strictEqual(result.errors.length, 1);
      assert.ok(result.errors[0].startsWith('Drift in docs/testcases/Performance.md'));

      fs.rmSync(tmpTestDir, { recursive: true, force: true });
    });

    it('detects missing file in docsDir', () => {
      const tmpTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'missing-test-'));
      const mockDocsDir = path.join(tmpTestDir, 'docs');
      const mockOutDir = path.join(tmpTestDir, 'out');
      fs.mkdirSync(mockDocsDir, { recursive: true });
      fs.mkdirSync(mockOutDir, { recursive: true });

      // Generate complete baseline into mockDocsDir
      generateDocs({ outDir: mockDocsDir });

      // Remove exactly one file
      fs.unlinkSync(path.join(mockDocsDir, 'TEST-CASES.md'));

      const result = checkTestcaseDocs({ docsDir: mockDocsDir, tmpDir: mockOutDir });
      assert.strictEqual(result.inSync, false);
      assert.strictEqual(result.errors.length, 1);
      assert.strictEqual(result.errors[0], 'Missing file: docs/testcases/TEST-CASES.md');

      fs.rmSync(tmpTestDir, { recursive: true, force: true });
    });

    it('detects stale auto-generated file in docsDir', () => {
      const tmpTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-test-'));
      const mockDocsDir = path.join(tmpTestDir, 'docs');
      const mockOutDir = path.join(tmpTestDir, 'out');
      fs.mkdirSync(mockDocsDir, { recursive: true });
      fs.mkdirSync(mockOutDir, { recursive: true });

      // Generate complete baseline into mockDocsDir
      generateDocs({ outDir: mockDocsDir });

      // In docsDir, add an obsolete file with the auto-generated marker
      fs.writeFileSync(
        path.join(mockDocsDir, 'OldDeletedArea.md'),
        '> Auto-generated by `scripts/generate-testcase-docs.js`. Do not edit by hand.'
      );

      const result = checkTestcaseDocs({ docsDir: mockDocsDir, tmpDir: mockOutDir });
      assert.strictEqual(result.inSync, false);
      assert.strictEqual(result.errors.length, 1);
      assert.strictEqual(result.errors[0], 'Stale auto-generated file in docs/testcases: OldDeletedArea.md');

      fs.rmSync(tmpTestDir, { recursive: true, force: true });
    });
  });
});
