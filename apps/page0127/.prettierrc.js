module.exports = {
  plugins: [require.resolve('@trivago/prettier-plugin-sort-imports')],
  semi: true,
  singleQuote: true,
  jsxSingleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 80,
  arrowParens: 'always',
  endOfLine: 'lf',
  bracketSpacing: true,
  useTabs: false,
  bracketSameLine: false,

  importOrder: [
    '^react$',
    '^next',
    '^@?\\w',
    '<THIRD_PARTY_MODULES>',
    '^@/shared/(.*)$',
    '^@/entities/(.*)$',
    '^@/features/(.*)$',
    '^@/widgets/(.*)$',
    '^@/app/(.*)$',
    '^[./]',
  ],

  importOrderSeparation: true,
  importOrderSortSpecifiers: true,

  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always',
      },
    },
    {
      files: '*.{css,scss}',
      options: {
        singleQuote: false,
        tabWidth: 2,
      },
    },
  ],
};
