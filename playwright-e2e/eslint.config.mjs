import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

const XPATH = [
  'CallExpression[callee.property.name=/^(locator|frameLocator|mfeLocator|waitForSelector|\\$|\\$\\$)$/] Literal[value=/^(\\.\\.(\\/|$)|\\(*\\/\\/)/]',
  'CallExpression[callee.property.name=/^(locator|frameLocator|mfeLocator|waitForSelector|\\$|\\$\\$)$/] TemplateElement[value.raw=/^(\\.\\.(\\/|$)|\\(*\\/\\/)/]',
  'CallExpression[callee.property.name=/^(locator|frameLocator|mfeLocator|waitForSelector|\\$|\\$\\$)$/] Literal[value=/^xpath=/]',
  'CallExpression[callee.property.name=/^(locator|frameLocator|mfeLocator|waitForSelector|\\$|\\$\\$)$/] TemplateElement[value.raw=/^xpath=/]',
  'Literal[value=/^xpath=/]',
  'TemplateElement[value.raw=/^xpath=/]',
  'Literal[value=/^\\(+\\//]',
  'TemplateElement[value.raw=/^\\(+\\//]'
].join(', ');

export default tseslint.config(
  { ignores: ['node_modules/**', 'reports/**', 'test-results/**', 'dashboard/**', 'playwright-report/**', 'scripts/**/*.js'] },
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tseslint.parser, parserOptions: { project: './tsconfig.json' } },
    linterOptions: { reportUnusedDisableDirectives: 'warn' },
    plugins: { '@typescript-eslint': tseslint.plugin, playwright },
    rules: {
      'playwright/no-wait-for-timeout': 'error',
      'playwright/missing-playwright-await': 'error',
      'playwright/no-focused-test': 'error',
      'playwright/no-skipped-test': ['warn', { allowConditional: true }],
      '@typescript-eslint/no-floating-promises': 'error',
      'no-restricted-syntax': ['error', { selector: XPATH, message: 'XPath is banned (copilot-instructions.md). Use getByRole/getByTestId/getByLabel.' }]
    }
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'warn',
        {
          object: 'Math',
          property: 'random',
          message: 'Math.random is banned in tests for entity names. Use uniqueName(prefix) from util/unique-name.util.ts.'
        }
      ]
    }
  }
);