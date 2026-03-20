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
    tsconfigRootDir: __dirname,
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
        leadingUnderscore: 'allow',
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
  overrides: [
    {
      files: ['*.js', '*.cjs', '*.mjs'],
      parserOptions: {
        project: null,
      },
      rules: {
        // Disable type-aware rules for plain JS files
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/await-thenable': 'off',
        '@typescript-eslint/unbound-method': 'off',
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/prefer-optional-chain': 'off',
        '@typescript-eslint/naming-convention': 'off',
        '@typescript-eslint/consistent-type-definitions': 'off',
      },
    },
  ],
};
