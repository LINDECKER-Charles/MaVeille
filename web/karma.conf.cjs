// Karma configuration consumed by the @angular/build:karma builder.
// We re-declare the standard frameworks/plugins/reporters and add a
// json-summary coverage reporter (parsed by CI) + CI-friendly Chrome.
const { join } = require('node:path');

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage')
    ],
    client: {
      jasmine: {},
      clearContext: false
    },
    jasmineHtmlReporter: { suppressAll: true },
    reporters: ['progress', 'kjhtml'],
    coverageReporter: {
      dir: join(__dirname, 'coverage', 'veille'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'json-summary', file: 'coverage-summary.json' },
        { type: 'lcovonly', file: 'lcov.info' }
      ]
    },
    browsers: ['Chrome'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu']
      }
    },
    restartOnFileChange: true
  });
};
