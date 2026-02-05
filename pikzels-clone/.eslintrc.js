module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  ignorePatterns: [
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/__tests__/**/*',
    'dist/',
    'node_modules/',
    'src/generated/**/*',
  ],
  rules: {
    // Naming conventions
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
      },
      {
        selector: 'typeAlias',
        format: ['PascalCase'],
      },
      {
        selector: 'class',
        format: ['PascalCase'],
      },
      {
        selector: 'function',
        format: ['camelCase', 'PascalCase'],
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
      },
    ],
    // Consistency rules
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/prefer-nullish-coalescing': 'warn', // Re-enabled with warning for v6 compatibility
    '@typescript-eslint/prefer-optional-chain': 'warn', // Consistent warning level
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', caughtErrors: 'none' },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    // PROFESSIONAL CODE QUALITY RULES
    '@typescript-eslint/no-explicit-any': 'warn',
    // v8 new strict rules - disabled for now, enable incrementally
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-unsafe-function-type': 'off',
    // ADDITIONAL PROFESSIONAL STANDARDS
    complexity: ['warn', 10], // Cyclomatic complexity
    'max-depth': ['warn', 3], // Max nesting depth
    'max-lines-per-function': ['warn', 50], // Function size limit
    'no-magic-numbers': ['warn', { ignore: [0, 1, -1, 100, 404, 401, 500] }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
  env: {
    node: true,
    es6: true,
  },
};
