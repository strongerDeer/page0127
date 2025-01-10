// config/style-dictionary.config.js
module.exports = {
  source: ['src/tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'src/styles/',
      files: [
        {
          destination: 'design-tokens.css',
          format: 'css/variables',
        },
      ],
    },
    ts: {
      transformGroup: 'js',
      buildPath: 'src/constants/',
      files: [
        {
          destination: 'design-tokens.ts',
          format: 'javascript/module',
        },
      ],
    },
  },
};
