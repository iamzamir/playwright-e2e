/**
 * Unified Performance Test Configuration
 *
 * Single source of truth for performance test configuration. This module merges the
 * previous environment-based config (formerly performance.config.ts) and the
 * test-type preset/threshold config (formerly test.config.ts) into one place.
 *
 * It exposes:
 *  - Environment-based configuration (interop / qa) via `PerformanceTestConfig.getConfig`
 *  - Test-type presets (smoke / performance / stress) via `PerformanceTestConfig.getTestConfig`
 *  - Centralized performance thresholds and insight thresholds
 *  - `EnvironmentSelector` for CLI / env-driven environment + execution-mode detection
 */

export interface EnvironmentConfig {
  name: string;
  portalUrl: string;
  realmName: string;
  /** Application (MFE) name to search/launch from the catalog, e.g. "Planning". */
  appName: string;
  /** Context to select within the launched app, e.g. "Process". */
  context: string;
  defaultUsername?: string;
  timeout: number;
  retryAttempts: number;
  delayBetweenRuns: number;
  /** Delay (ms) allowed for workspace/dashboard initialization after launch. */
  workspaceInitDelay: number;
  browserConfig: {
    headless: boolean;
    channel: 'chrome'; // Only Chrome support for local and Sauce Labs
    slowMo?: number;
    sauceLabs?: boolean; // Indicates if this should run on Sauce Labs
  };
}

export interface TestConfig {
  runs: number;
  successThreshold: number;
  outputFiles: {
    enhancedHtml: string;
    statistics: string;
    detailedReport: string;
    basicHtml: string;
  };
  environment: EnvironmentConfig;
  environmentOverrides?: Partial<EnvironmentConfig>;
}

/** Simplified test-type oriented configuration (smoke / performance / stress). */
export interface TestConfiguration {
  runs: number;
  retryAttempts: number;
  timeout: number;
  realmName: string;
  delayBetweenRuns: number;
}

export type TestType = 'smoke' | 'performance' | 'stress';

/** Per-step performance budgets (ms) used for pass/fail and insight reporting. */
export interface PerformanceThresholds {
  portalLogin: number;
  appSearch: number;
  appLaunch: number;
  totalJourney: number;
}

/**
 * Insight thresholds (ms) used to classify a measured duration as
 * excellent / good / needs-attention. Centralized here so reporting utilities
 * do not hardcode their own values.
 */
export const PERFORMANCE_INSIGHT_THRESHOLDS = {
  excellent: 5000,
  good: 10000,
} as const;

export class PerformanceTestConfig {
  /**
   * Available environments for performance testing
   * Only 'interop' and 'qa' environments are supported
   * Each environment supports local Chrome execution and Sauce Labs cloud execution
   */
  private static readonly environments: Record<string, EnvironmentConfig> = {
    'interop': {
      name: 'Interop Environment',
      portalUrl: process.env.LUMINATE_PORTAL_URL || 'https://portal.example.com',
      realmName: 'cbp-interop-ps-automation-2',
      appName: 'Planning',
      context: 'Process',
      defaultUsername: process.env.FUNCTIONAL_TEST_USERNAME,
      timeout: 60000,
      retryAttempts: 3,
      delayBetweenRuns: 2000,
      workspaceInitDelay: 3000,
      browserConfig: {
        headless: false, // Local development - visible browser
        channel: 'chrome'
      }
    },
    'qa': {
      name: 'QA Environment',
      portalUrl: process.env.LUMINATE_PORTAL_URL || 'https://qa-portal.example.com',
      realmName: 'cbp-e2e-qa',
      appName: 'Planning',
      context: 'Process',
      defaultUsername: process.env.FUNCTIONAL_TEST_USERNAME,
      timeout: 40000,
      retryAttempts: 2,
      delayBetweenRuns: 2000,
      workspaceInitDelay: 3000,
      browserConfig: {
        headless: true, // CI/QA environment - headless execution
        channel: 'chrome'
      }
    }
  };

  // ----------------------------------------------------------------------------
  // Environment-based configuration
  // ----------------------------------------------------------------------------

  static getConfig(environmentName: string = 'interop', overrides: Partial<TestConfig> = {}): TestConfig {
    const env = this.environments[environmentName.toLowerCase()];
    if (!env) {
      throw new Error(`Environment '${environmentName}' not found. Available: ${Object.keys(this.environments).join(', ')}`);
    }

    const defaultConfig: TestConfig = {
      runs: process.env.PERFORMANCE_RUN_ITERATIONS ? parseInt(process.env.PERFORMANCE_RUN_ITERATIONS) : 1,
      successThreshold: 80,
      outputFiles: {
        enhancedHtml: `performance-metrics-enhanced-${env.name.toLowerCase().replace(/\s+/g, '-')}.html`,
        statistics: `performance-statistics-${env.name.toLowerCase().replace(/\s+/g, '-')}.txt`,
        detailedReport: `performance-detailed-report-${env.name.toLowerCase().replace(/\s+/g, '-')}.txt`,
        basicHtml: `performance-metrics-${env.name.toLowerCase().replace(/\s+/g, '-')}.html`
      },
      environment: env
    };

    // Apply overrides
    return this.mergeConfigs(defaultConfig, overrides);
  }

  static getAllEnvironments(): string[] {
    return Object.keys(this.environments);
  }

  static getEnvironmentInfo(environmentName: string): EnvironmentConfig | null {
    return this.environments[environmentName.toLowerCase()] || null;
  }

  static validateEnvironment(environmentName: string): boolean {
    return environmentName.toLowerCase() in this.environments;
  }

  private static mergeConfigs(base: TestConfig, overrides: Partial<TestConfig>): TestConfig {
    const merged = {
      ...base,
      ...overrides,
      outputFiles: {
        ...base.outputFiles,
        ...(overrides.outputFiles || {})
      }
    };

    // Apply environment overrides if provided
    if (overrides.environmentOverrides) {
      merged.environment = {
        ...base.environment,
        ...overrides.environmentOverrides,
        browserConfig: {
          ...base.environment.browserConfig,
          ...(overrides.environmentOverrides.browserConfig || {})
        }
      };
    }

    return merged;
  }

  // Utility methods for common configuration scenarios
  static getQuickTestConfig(environmentName: string = 'interop'): TestConfig {
    return this.getConfig(environmentName, {
      runs: process.env.PERFORMANCE_RUN_ITERATIONS ? parseInt(process.env.PERFORMANCE_RUN_ITERATIONS) : 1,
      successThreshold: 50,
      environmentOverrides: {
        delayBetweenRuns: 500,
        retryAttempts: 1,
        browserConfig: {
          headless: false,
          channel: 'chrome',
          slowMo: 50
        }
      }
    });
  }

  /**
   * Get Sauce Labs specific configuration
   * Optimized for cloud execution with appropriate timeouts and settings
   */
  static getSauceLabsConfig(environmentName: string = 'qa'): TestConfig {
    return this.getConfig(environmentName, {
      runs: 5,
      successThreshold: 85,
      environmentOverrides: {
        timeout: 120000, // Extended timeout for cloud execution
        retryAttempts: 3,
        delayBetweenRuns: 3000, // More delay for cloud stability
        browserConfig: {
          headless: false, // Sauce Labs works better with non-headless
          channel: 'chrome',
          sauceLabs: true
        }
      }
    });
  }

  // Environment-specific utilities
  static logConfigurationInfo(config: TestConfig): void {
    console.log(`
=== Performance Test Configuration ===
Environment: ${config.environment.name}
Portal URL: ${config.environment.portalUrl}
Realm: ${config.environment.realmName}
Runs: ${config.runs}
Success Threshold: ${config.successThreshold}%
Timeout: ${config.environment.timeout}ms
Retry Attempts: ${config.environment.retryAttempts}
Browser: ${config.environment.browserConfig.channel} (headless: ${config.environment.browserConfig.headless})
Output Files:
  - Enhanced HTML: ${config.outputFiles.enhancedHtml}
  - Statistics: ${config.outputFiles.statistics}
  - Detailed Report: ${config.outputFiles.detailedReport}
=====================================
    `);
  }

  // ----------------------------------------------------------------------------
  // Test-type presets and thresholds
  // ----------------------------------------------------------------------------

  /**
   * Get test configuration based on test type
   */
  static getTestConfig(testType: TestType = 'performance'): TestConfiguration {
    const baseConfig = {
      retryAttempts: 3,
      timeout: 60000,
      realmName: 'SAP',
      delayBetweenRuns: 2000
    };

    switch (testType) {
      case 'smoke':
        return {
          ...baseConfig,
          runs: 3,
          timeout: 30000,
          delayBetweenRuns: 1000
        };

      case 'performance':
        return {
          ...baseConfig,
          runs: 10,
          timeout: 60000,
          delayBetweenRuns: 2000
        };

      case 'stress':
        return {
          ...baseConfig,
          runs: 50,
          timeout: 120000,
          delayBetweenRuns: 500
        };

      default:
        return {
          ...baseConfig,
          runs: 10
        };
    }
  }

  /**
   * Parse CLI arguments for test configuration override
   */
  static parseCliArgs(): Partial<TestConfiguration> {
    const args = process.argv.slice(2);
    const config: Partial<TestConfiguration> = {};

    args.forEach(arg => {
      if (arg.startsWith('--runs=')) {
        config.runs = parseInt(arg.split('=')[1]);
      } else if (arg.startsWith('--timeout=')) {
        config.timeout = parseInt(arg.split('=')[1]);
      } else if (arg.startsWith('--delay=')) {
        config.delayBetweenRuns = parseInt(arg.split('=')[1]);
      } else if (arg.startsWith('--realm=')) {
        config.realmName = arg.split('=')[1];
      }
    });

    return config;
  }

  /**
   * Merge test-type configuration with CLI overrides
   */
  static getFinalConfig(testType: TestType = 'performance'): TestConfiguration {
    const baseConfig = this.getTestConfig(testType);
    const cliOverrides = this.parseCliArgs();

    return { ...baseConfig, ...cliOverrides };
  }

  /**
   * Validate configuration parameters
   */
  static validateConfig(config: TestConfiguration): void {
    if (config.runs <= 0) {
      throw new Error('Number of runs must be greater than 0');
    }
    if (config.timeout <= 0) {
      throw new Error('Timeout must be greater than 0');
    }
    if (config.retryAttempts < 0) {
      throw new Error('Retry attempts cannot be negative');
    }
    if (config.delayBetweenRuns < 0) {
      throw new Error('Delay between runs cannot be negative');
    }
  }

  /**
   * Get success threshold (%) based on test type
   */
  static getSuccessThreshold(testType: TestType = 'performance'): number {
    switch (testType) {
      case 'smoke':
        return 95; // 95% success rate for smoke tests
      case 'performance':
        return 90; // 90% success rate for performance tests
      case 'stress':
        return 80; // 80% success rate for stress tests
      default:
        return 90;
    }
  }

  /**
   * Get per-step performance thresholds (ms) based on test type
   */
  static getPerformanceThresholds(testType: TestType = 'performance'): PerformanceThresholds {
    switch (testType) {
      case 'smoke':
        return {
          portalLogin: 3000, // 3 seconds
          appSearch: 2000,   // 2 seconds
          appLaunch: 5000,   // 5 seconds
          totalJourney: 15000 // 15 seconds
        };
      case 'performance':
        return {
          portalLogin: 5000, // 5 seconds
          appSearch: 3000,   // 3 seconds
          appLaunch: 8000,   // 8 seconds
          totalJourney: 25000 // 25 seconds
        };
      case 'stress':
        return {
          portalLogin: 10000, // 10 seconds
          appSearch: 5000,    // 5 seconds
          appLaunch: 15000,   // 15 seconds
          totalJourney: 45000 // 45 seconds
        };
      default:
        return {
          portalLogin: 5000,
          appSearch: 3000,
          appLaunch: 8000,
          totalJourney: 25000
        };
    }
  }
}

// CLI support for environment selection and execution mode detection
export class EnvironmentSelector {
  static getEnvironmentFromArgs(): string {
    const args = process.argv.slice(2);
    const envArg = args.find(arg => arg.startsWith('--env='));

    if (envArg) {
      const env = envArg.split('=')[1];
      if (PerformanceTestConfig.validateEnvironment(env)) {
        return env;
      } else {
        console.warn(`Invalid environment '${env}'. Available: ${PerformanceTestConfig.getAllEnvironments().join(', ')}`);
      }
    }

    return process.env.TEST_ENVIRONMENT || 'interop';
  }

  static getTestTypeFromArgs(): 'quick' | 'ci' | 'sauce' | 'default' {
    const args = process.argv.slice(2);

    if (args.includes('--quick')) return 'quick';
    if (args.includes('--ci')) return 'ci';
    if (args.includes('--sauce') || this.isSauceLabsEnvironment()) return 'sauce';

    return 'default';
  }

  /**
   * Detect if running in Sauce Labs environment
   */
  static isSauceLabsEnvironment(): boolean {
    return !!(process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY);
  }

  /**
   * Get execution mode information
   */
  static getExecutionMode(): 'local' | 'saucelabs' {
    return this.isSauceLabsEnvironment() ? 'saucelabs' : 'local';
  }
}
