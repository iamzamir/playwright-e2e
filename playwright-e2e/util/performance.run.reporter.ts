import { Browser, chromium } from '@playwright/test';
import { TestConfig } from '../configs/performance-test.config';
import { PerformanceTestUtils, PerfMetricsEnhanced } from './performance.test.utils';
import { EnhancedPerformanceMetricsUtil } from './performance.metrics.enhanced.util';
import { PerformanceMetricsUtil } from './performance.metrics.util';

/**
 * Shared orchestration + reporting helpers for the enhanced performance specs
 * (Test_003 / Test_004). Extracts the previously duplicated browser launch,
 * per-run cleanup, and post-test report generation into a single place so the
 * spec files only describe their measurement journey.
 */
export class PerformanceRunReporter {
  /**
   * Launch a Chrome browser using the environment browser config, with retry.
   */
  static async launchBrowserWithRetry(testConfig: TestConfig): Promise<Browser> {
    return PerformanceTestUtils.withRetry(
      async () => {
        return await chromium.launch({
          channel: testConfig.environment.browserConfig.channel,
          headless: testConfig.environment.browserConfig.headless,
          slowMo: testConfig.environment.browserConfig.slowMo,
          timeout: testConfig.environment.timeout
        });
      },
      testConfig.environment.retryAttempts,
      'Browser Launch',
      1000
    );
  }

  /**
   * Close the browser for a run and wait the configured delay before the next run.
   */
  static async cleanupRun(
    browser: Browser | null,
    runIndex: number,
    testConfig: TestConfig
  ): Promise<void> {
    if (browser) {
      try {
        await browser.close();
        console.log(`🔒 Browser closed for run ${runIndex + 1}`);
      } catch (error) {
        console.warn(`⚠️  Failed to close browser for run ${runIndex + 1}:`, error);
      }
    }

    // Delay between runs to prevent resource conflicts
    if (runIndex < testConfig.runs - 1) {
      console.log(`⏳ Waiting ${testConfig.environment.delayBetweenRuns}ms before next run...`);
      await PerformanceTestUtils.delay(testConfig.environment.delayBetweenRuns);
    }
  }

  /**
   * Generate the test summary, statistics, console insights and write all report
   * files (enhanced HTML, statistics, optional basic HTML array and detailed
   * error report), then validate the run against the success threshold.
   */
  static finalizeAndWriteReports(
    metricsArr: PerfMetricsEnhanced[],
    successfulRuns: number,
    totalErrors: string[],
    testConfig: TestConfig,
    options: { writeBasicHtmlArray?: boolean } = {}
  ): void {
    // Generate comprehensive test summary
    PerformanceTestUtils.generateTestSummary(
      testConfig.runs,
      successfulRuns,
      totalErrors,
      { successThreshold: testConfig.successThreshold }
    );

    // Generate and log performance statistics
    const statistics = EnhancedPerformanceMetricsUtil.generatePerformanceStatistics(
      metricsArr,
      successfulRuns
    );

    PerformanceTestUtils.logPerformanceInsights(statistics);
    PerformanceTestUtils.logExtendedJourneyStats(metricsArr);

    // Debug information
    console.log(`\n🔍 DEBUG INFORMATION:`);
    console.log(`📊 Total metrics collected: ${metricsArr.length}`);
    console.log(`📊 Valid metrics: ${metricsArr.filter(m => m.launch > 0).length}`);
    console.log(`📁 Current working directory: ${process.cwd()}`);

    // Write comprehensive reports
    console.log(`\n📊 GENERATING PERFORMANCE REPORTS:`);
    console.log(`📁 Enhanced HTML: ${testConfig.outputFiles.enhancedHtml}`);
    console.log(`📁 Statistics: ${testConfig.outputFiles.statistics}`);
    console.log(`📁 Basic HTML: ${testConfig.outputFiles.basicHtml}`);
    console.log(`📁 Detailed Report: ${testConfig.outputFiles.detailedReport}`);

    EnhancedPerformanceMetricsUtil.writeEnhancedHtmlReport(
      metricsArr,
      testConfig.outputFiles.enhancedHtml,
      successfulRuns
    );

    EnhancedPerformanceMetricsUtil.writeStatisticalSummary(statistics, testConfig.outputFiles.statistics);

    if (options.writeBasicHtmlArray) {
      PerformanceMetricsUtil.writeHtmlMetricsArray(
        metricsArr.map(m => ({
          launch: m.launch,
          search: m.search,
          select: m.select,
          processSelect: m.contextSelection ?? 0,
          processLaunch: m.processLaunch ?? 0,
          viewNavigation: m.viewNavigation ?? 0,
          timestamp: m.timestamp
        })),
        testConfig.outputFiles.basicHtml,
        true
      );
    }

    // Write detailed error report if needed
    if (totalErrors.length > 0) {
      PerformanceTestUtils.writeDetailedReport(
        this.buildDetailedErrorReport(metricsArr),
        testConfig.outputFiles.detailedReport
      );
    }

    // Validate test results against success threshold
    PerformanceTestUtils.validateTestResults(
      testConfig.runs,
      successfulRuns,
      testConfig.successThreshold
    );
  }

  /**
   * Build the per-run detailed error report text, including whichever extended
   * journey fields were captured for the run.
   */
  private static buildDetailedErrorReport(metricsArr: PerfMetricsEnhanced[]): string {
    return metricsArr.map(m => {
      let report = `Run ${m.runNumber}: ${m.success ? 'SUCCESS' : 'FAILED'}\n`;
      report += `  Basic Journey: Launch: ${m.launch}ms, Search: ${m.search}ms, Select: ${m.select}ms\n`;

      const extended: string[] = [];
      if (m.appLoad !== undefined && m.appLoad > 0) extended.push(`AppLoad: ${m.appLoad}ms`);
      if (m.contextSelection !== undefined && m.contextSelection > 0) extended.push(`Context: ${m.contextSelection}ms`);
      if (m.processLaunch !== undefined && m.processLaunch > 0) extended.push(`ProcessLaunch: ${m.processLaunch}ms`);
      if (m.viewNavigation !== undefined && m.viewNavigation > 0) extended.push(`ViewNavigate: ${m.viewNavigation}ms`);

      if (extended.length > 0) {
        report += `  Extended Journey: ${extended.join(', ')}\n`;
        if (m.totalJourney !== undefined && m.totalJourney > 0) {
          report += `  Total Journey Time: ${m.totalJourney}ms\n`;
        }
      }

      report += `  Timestamp: ${m.timestamp}\n`;
      if (m.errors && m.errors.length > 0) {
        report += `  Errors: ${m.errors.join(', ')}\n`;
      }
      if (m.retryCount && m.retryCount > 0) {
        report += `  Retry Count: ${m.retryCount}\n`;
      }
      return report;
    }).join('\n');
  }
}
