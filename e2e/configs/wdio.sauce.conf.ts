import { baseConfig } from './wdio.shared.conf';
import './setup';
import 'wdio-intercept-service';
import SauceLabs, { Job } from 'saucelabs';
//Config
console.log(process.env.SAUCE_ACCESS_KEY)

const config: any = { ...baseConfig };
const isDebugMode = !!process.env.DEBUG;
const isMeasuringPerformance = !!process.env.PERFORMANCE_MEASURE;
const additionalUrlParams = { panel: false, nav: false, enableShortcuts: false, full: true };
config.user = process.env.SAUCE_USERNAME;
config.key = process.env.SAUCE_ACCESS_KEY;
config.bail = 'SAUCE_BAIL' in process.env ? parseInt(process.env.SAUCE_BAIL!, 2) : 1;
// @ts-ignore
config.additionalUrlParams = additionalUrlParams;
config.region = process.env.SAUCE_REGION || 'us';
const BUILD_PREFIX = process.env.BUILD_PREFIX || ``;
console.log("Bu  "+BUILD_PREFIX)

const defaultBrowserSauceOptions = {
 // build: BUILD_PREFIX+`CBP-IBP-${new Date().getTime()}`,
 build: BUILD_PREFIX+'CBP-IBP_7Dec023',
  screenResolution: '1600x1200',
};

// const defaultBrowserDesktopSauceOptions = {
//     screenResolution: '1600x1200',
// };

/*baseConfig.services = [
    ...(baseConfig.services || []),
    [
        'sauce',
        {
            sauceConnect: true,
            sauceConnectOpts: {
                // ...
            }
        },
    ],
];*/

config.services = baseConfig.services;
config.beforeSuite = function (suite) {
    browser.execute(`sauce:job-name=${suite.title}`);
   
};
config.waitforTimeout = 60000;
config.maxInstances = parseInt(process.env.MAX_INSTANCES || '1', 10);

config.commandTimeout = 500;
config.idleTimeout = 500
config.services = [
    [
        'sauce',
        {
            sauceConnect: false,
            // sauceConnectOpts: {
            //  logfile: './/tunnel_name.log',
            //  logger:function(message) {
            //      console.log(message);
            //  }
            // }
        },
    ],
    ['intercept'],
];

config.capabilities = [
  {
    browserName: 'chrome',
    platformName: 'Windows 10',
    browserVersion: 'latest',
    'sauce:options': {
      ...defaultBrowserSauceOptions,
    },
    'goog:chromeOptions': {
      args: [
        '--disable-popup-blocking',
        '--disable-infobars',
        '--start-maximized',
        '--disable-notifications',
        '--disable-extensions',
      ],
      prefs: {
        'profile.default_content_setting_values.notifications': 2, // Block notifications
        'profile.default_content_setting_values.clipboard': 2,     // Block clipboard access requests
        'profile.default_content_setting_values.popups': 2,        // Block popups
      }
    }
  }
];
config.services = config.services.concat(['sauce', 'shared-store']);
config.specFileRetries = 1;

exports.config=config;
//export { config };