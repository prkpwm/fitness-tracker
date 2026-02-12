// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const maxparams = require('eslint-plugin-max-params-no-constructor');

module.exports = tseslint.config(
  {
    ignores: [
      'src/app/mockup-ui/**',
      '**/node_modules/**',
      'dist/**',
      'public/assets/**',
      'coverage/**',
      '**/*.mock.html',
      '.angular/**'
    ],
  },
  {
    files: ['**/*.ts'],
    plugins: { maxparams: maxparams },
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      {
        languageOptions: {
          parserOptions: {
            projectService: true,
            tsconfigRootDir: __dirname,
          },
        },
      },
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      complexity: ['error', 8],
      // "max-params": ["error", 4],
      'maxparams/max-params-no-constructor': ['error', 4],
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@angular-eslint/prefer-standalone': 'error',
      'no-nested-ternary': 'error',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          filter: '__typename',
          format: null,
        },
        {
          selector: 'variable',
          types: ['function'],
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          types: ['boolean', 'number', 'string', 'array'],
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'typeParameter',
          format: ['PascalCase'],
          leadingUnderscore: 'allow',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/no-duplicate-attributes': [
        'off',
        {
          ignore: ['class'],
        },
      ],
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
      '@angular-eslint/template/label-has-associated-control': 'off',
    },
  }
);
