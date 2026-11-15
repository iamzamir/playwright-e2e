import CommonFunctions from '../util/common.util';
import './setup';
import 'expect-webdriverio';
import 'wdio-intercept-service';
const allTests = require('./../specs/TestSuites/' + process.env.SUITENAME + '.json');

const debug = process.env.DEBUG;

const baseConfig = {
  runner: 'local',

  // Uncomment below lines to run specific tests and comment line 17.
  specs: [
    '**/Test_001_ProcessApiStartStop.spec.ts'
  ],

  // specs: allTests.testFiles, // Load all test files from the specified suite, comment this line to specify individual tests

  exclude: [
    // 'path/to/excluded/files'
  ],
  maxInstances: parseInt(process.env.MAX_INSTANCES || '10', 10),
  capabilities: [
    {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: [
          // '--headless=new',   // Comment this line to run in headful mode in local for testing
          '--disable-gpu',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-infobars',
          '--start-maximized',
          '--disable-notifications',
          '--disable-extensions',
          '--disable-popup-blocking', // Add this line
        ],
        prefs: {
          'profile.default_content_setting_values.notifications': 2, // Block notifications
          'profile.default_content_setting_values.clipboard': 2,     // Block clipboard access requests
          'profile.default_content_setting_values.popups': 2,        // Block popups
        }
      },
      acceptInsecureCerts: true,
    },
  ],
  logLevel: 'error',
  outputDir: '.e2e/logs',
  bail: 0,
  // baseUrl: process.env.LUMINATE_PORTAL_URL || 'http://localhost:7777/',
  waitforTimeout: 100000,
  connectionRetryTimeout: 300000,
  connectionRetryCount: 3,
  services: [
    [
      'chromedriver',
      {
        logFileName: 'wdio-chromedriver.log', // default
        outputDir: 'driver-logs', // overwrites the config.outputDir
        args: ['--ignore-certificate-errors', '--silent', '--ignore-certificate-errors', '--disable-popup-blocking', '--allow-running-insecure-content'],
      },
    ],
    ['intercept'], // Add the intercept service here
  ],

  //browserVersion:[],
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      transpileOnly: true,
      project: 'tsconfig.json',
    },
  },
  //headless: true,
  framework: 'mocha',
  reporters: [
    [
      'allure',
      {
        outputDir: '.e2e/reports/allure-results',
        disableWebdriverStepsReporting: true,
        disableWebdriverScreenshotsReporting: false,
      },
    ],
  ],

  mochaOpts: {
    timeout: debug ? 60000 * 60 * 24 : 60000 * 10,
  },
  beforeSession: function () {
    // @ts-ignore
    // global.appNamespace = appNamespace;
  },

  before: function (capabilities: any, specs: any) {
    // Set implicit wait
    // browser.setTimeout({ implicit: 60000 });
    // Set browser zoom to 80%
    // await browser.execute(() => {
    //   document.body.style.zoom = '80%';
    // });
  },
  beforeSuite: function (suite: any) {
    CommonFunctions.logMessage("INFO", `Suite "${suite.fullTitle}" from file "${suite.file}" starts`);
  },
  beforeTest: function (test: any) {
    CommonFunctions.logMessage("INFO", `******************************** Running test: ${test.title} ********************************`);
  },
  afterTest: async function (test, context, { error, result, duration, passed, retries }) {
    const fs = require('fs');
    const path = require('path');
    if (error) {
      // Screenshot logic
      const screenshotDir = path.join(__dirname, '../screenshots');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }
      const fileBase = test.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filePath = path.join(screenshotDir, `${fileBase}.png`);
      await browser.saveScreenshot(filePath);

      // Video logic (assuming wdio-video-reporter is used)
      const videoDir = path.join(__dirname, '../../.e2e/videos');
      const videoFile = path.join(videoDir, `${fileBase}.mp4`);
      const destVideoFile = path.join(screenshotDir, `${fileBase}.mp4`);
      if (fs.existsSync(videoFile)) {
        fs.copyFileSync(videoFile, destVideoFile);
      }

      // Failed tests tracking
      let env = process.env.ENVIRONMENT === 'QA' ? 'qa' : 'iop';
      if(process.env.SUITENAME == 'po-backend-suite') {
        env = 'backend';
      }
      const failedTestsFile = path.join(__dirname, '../specs/TestSuites/failed-' + env + '-suite.json');
      let failedTestList: string[] = [];
      if (fs.existsSync(failedTestsFile)) {
        try {
          const data = fs.readFileSync(failedTestsFile, 'utf-8');
          failedTestList = JSON.parse(data).testFiles || [];
        } catch (e) {
          failedTestList = [];
        }
      }
      // Store relative path for consistency
      if (test.file) {
        const relPath = path.relative(path.join(__dirname, '..'), test.file).replace(/\\/g, '/');
        if (!failedTestList.includes(relPath)) {
          failedTestList.push(relPath);
        }
      }
      fs.writeFileSync(failedTestsFile, JSON.stringify({ testFiles: failedTestList }, null, 4));
    }
  },

  after: async function (result, capabilities, specs) {
    // Close browser after ALL tests in the spec file are completed
    // try {
    //   await CommonFunctions.logMessage("INFO", "Cleaning up browser session after all tests...");
    //   await browser.closeWindow(); // Close browser window first
    //   await browser.deleteSession(); // Delete the session completely
    //   await CommonFunctions.logMessage("INFO", "Browser cleanup completed");
    // } catch (error: any) {
    //   await CommonFunctions.logMessage("WARN", `Browser cleanup error: ${error.message}`);
    // }
    
    // Force exit after cleanup
    // setTimeout(() => {
    //   process.exit(0);
    // }, 1000);
  },

  afterSuite: function (suite: any) {
    CommonFunctions.logMessage("INFO", `Suite "${suite.fullTitle}" completed`);
  },
};

export { baseConfig };

declare global {
  namespace NodeJS {
    interface Global {
      document: Document;
      window: Window;
      navigator: Navigator;
      appNamespace: string;
    }
  }
}

const isDebugMode = process.env.DEBUG;
let config: any = baseConfig;
config.runner = 'local';
config.services?.push([
  'chromedriver',
  {
    logFileName: 'wdio-chromedriver.log',
    outputDir: '.e2e/logs/local-driver',
    args: isDebugMode ? ['--inspect'] :
      [
        '--silent',
        // '--disable-infobars',
        '--headless=new',
        // '--disable-gpu',
        // '--no-sandbox',
        // '--disable-dev-shm-usage',
        '--ignore-certificate-errors',
        '--allow-running-insecure-content',
        // `--user-data-dir=/tmp/chrome-profile-${process.pid}`
      ]
  }
]);

export { config };