// Imports `test` from @playwright/test rather than configs/fixtures on purpose: it times navigation in a browser it launches itself (PerformanceRunReporter.launchBrowserWithRetry), so the fixture page, logging and artifacts don't apply.
import { test, Browser, Page } from '@playwright/test';
import { TestUtil } from '../../util/test.util';
import { PortalPage } from '../../pageobjects/portal.page';
import { PlanningListingPage } from '../../pageobjects/planning-listing.page';
import { PerformanceTestConfig, EnvironmentSelector, TestConfig } from '../../configs/performance-test.config';
import { PerformanceTestUtils, PerfMetricsEnhanced, NetworkMetrics, RegionInfo } from '../../util/performance.test.utils';
import { PerformanceRunReporter } from '../../util/performance.run.reporter';

test.describe('Enhanced Performance Test - Optimized Version', () => {

  const environment = EnvironmentSelector.getEnvironmentFromArgs();

  let testConfig: TestConfig = PerformanceTestConfig.getConfig(environment);

  // Log configuration at test start
  test.beforeAll(() => {
    PerformanceTestConfig.logConfigurationInfo(testConfig);
  });

  test(`Navigate to Planning Space - ${testConfig.environment.name}`, async () => {
    const metricsArr: PerfMetricsEnhanced[] = [];
    let successfulRuns = 0;
    let totalErrors: string[] = [];

    console.log(`\n🚀 Starting performance test with ${testConfig.runs} runs`);
    console.log(`📋 Configuration: ${JSON.stringify(testConfig.environment, null, 2)}`);

    for (let i = 0; i < testConfig.runs; i++) {
      console.log(`\n${'='.repeat(40)}`);
      console.log(`📊 Run ${i + 1}/${testConfig.runs}`);
      console.log(`${'='.repeat(40)}`);

      let browser: Browser | null = null;
      let page: Page | null = null;
      let runErrors: string[] = [];
      let retryCount = 0;

      try {
        // Launch browser with retry logic
        browser = await PerformanceRunReporter.launchBrowserWithRetry(testConfig);

        page = await browser.newPage();
        page.setDefaultTimeout(testConfig.environment.timeout);

        // Set up API monitoring
        const apiCalls = PerformanceTestUtils.setupApiMonitoring(page);

        const objTestUtil = new TestUtil(page);
        const objPortalPage = new PortalPage(page);
        const objPlanningListingPage = new PlanningListingPage(page);

        // Track overall journey start time
        const journeyStart = Date.now();

        const loginResult = await PerformanceTestUtils.measureWithErrorHandling(
          async () => {
            return await PerformanceTestUtils.withRetry(
              async () => await objTestUtil.launchAppFromCatalog(testConfig.environment.realmName),
              testConfig.environment.retryAttempts,
              'Portal Login'
            );
          },
          `Run ${i + 1}: Portal Login`,
          testConfig.environment.timeout
        );

        if (!loginResult.success) {
          runErrors.push(`Portal login failed: ${loginResult.error}`);
        }

        // 📁 Measure app catalog access
        const catalogResult = await PerformanceTestUtils.measureWithErrorHandling(
          async () => {
            return await PerformanceTestUtils.withRetry(
              async () => await objPortalPage.clickAppCatalog(),
              testConfig.environment.retryAttempts,
              'App Catalog Access'
            );
          },
          `Run ${i + 1}: App Catalog Access`,
          testConfig.environment.timeout
        );

        if (!catalogResult.success) {
          runErrors.push(`App catalog access failed: ${catalogResult.error}`);
        }

        // 🔍 Measure app search
        const searchResult = await PerformanceTestUtils.measureWithErrorHandling(
          async () => {
            return await PerformanceTestUtils.withRetry(
              async () => await objPortalPage.searchApp(testConfig.environment.appName),
              testConfig.environment.retryAttempts,
              'App Search'
            );
          },
          `Run ${i + 1}: Planning App Search`,
          testConfig.environment.timeout
        );

        if (!searchResult.success) {
          runErrors.push(`App search failed: ${searchResult.error}`);
        }

        // 🚀 Measure app launch
        const selectResult = await PerformanceTestUtils.measureWithErrorHandling(
          async () => {
            return await PerformanceTestUtils.withRetry(
              async () => await objPortalPage.selectApp(testConfig.environment.appName),
              testConfig.environment.retryAttempts,
              'App Launch'
            );
          },
          `Run ${i + 1}: Planning App Launch`,
          testConfig.environment.timeout
        );

        if (!selectResult.success) {
          runErrors.push(`App launch failed: ${selectResult.error}`);
        }

        // 🛣️ Extended user journey - Planning app specific functionality
        let appLoadResult: { duration: number; success: boolean; error?: string } = { duration: 0, success: true };
        let contextResult: { duration: number; success: boolean; error?: string } = { duration: 0, success: true };
        let processLaunchResult: { duration: number; success: boolean; error?: string } = { duration: 0, success: true };

        if (selectResult.success && page) {
          // 📱 Measure planning app load time
          appLoadResult = await PerformanceTestUtils.measureWithErrorHandling(
            async () => {
              return await PerformanceTestUtils.withRetry(
                async () => {
                  await objPlanningListingPage.waitForContextDropdown();
                },
                testConfig.environment.retryAttempts,
                'Planning App Load'
              );
            },
            `Run ${i + 1}: Planning App Load`,
            testConfig.environment.timeout
          );

          if (!appLoadResult.success) {
            runErrors.push(`Planning app load failed: ${appLoadResult.error}`);
          } else {
            // ⚙️ Measure context selection and process setup
            contextResult = await PerformanceTestUtils.measureWithErrorHandling(
              async () => {
                return await PerformanceTestUtils.withRetry(
                  async () => {
                    await objPlanningListingPage.selectContext(testConfig.environment.context);
                    return true;
                  },
                  testConfig.environment.retryAttempts,
                  'Context Selection'
                );
              },
              `Run ${i + 1}: Context Selection`,
              testConfig.environment.timeout
            );

            if (!contextResult.success) {
              runErrors.push(`Context selection failed: ${contextResult.error}`);
            } else {
              // 🎯 Measure final workspace launch
              processLaunchResult = await PerformanceTestUtils.measureWithErrorHandling(
                async () => {
                  return await PerformanceTestUtils.withRetry(
                    async () => {
                      await objPlanningListingPage.clickLaunch();
                      await page!.waitForTimeout(testConfig.environment.workspaceInitDelay); // Allow workspace initialization
                      return true;
                    },
                    testConfig.environment.retryAttempts,
                    'Workspace Launch'
                  );
                },
                `Run ${i + 1}: Workspace Launch`,
                testConfig.environment.timeout
              );

              if (!processLaunchResult.success) {
                runErrors.push(`Workspace launch failed: ${processLaunchResult.error}`);
              }
            }
          }
        }

        // Calculate total journey time
        const journeyEnd = Date.now();
        const totalJourneyTime = journeyEnd - journeyStart;

        // Analyze API metrics
        const apiMetrics = PerformanceTestUtils.analyzeApiMetrics(apiCalls);

        // Collect network and region information
        let networkMetrics: NetworkMetrics | null = null;
        let regionInfo: RegionInfo | null = null;
        
        if (page) {
          try {
            console.log(`\n🌐 Collecting network and region information for Run ${i + 1}...`);
            
            // Collect network metrics
            networkMetrics = await PerformanceTestUtils.collectNetworkMetrics(page);
            if (networkMetrics) {
              console.log(`   📶 Network: ${networkMetrics.effectiveType} (${networkMetrics.downlink}Mbps, ${networkMetrics.rtt}ms latency)`);
            }
            
            // Collect region information
            regionInfo = await PerformanceTestUtils.collectRegionInfo(page);
            if (regionInfo) {
              console.log(`   🌍 Location: ${regionInfo.city}, ${regionInfo.region}, ${regionInfo.country} (${regionInfo.timezone})`);
              if (regionInfo.isp) {
                console.log(`   🏢 ISP: ${regionInfo.isp}`);
              }
            }
          } catch (error) {
            console.warn(`   ⚠️  Could not collect network/region info: ${error}`);
          }
        }

        // Determine overall success
        const isSuccessful = loginResult.success && catalogResult.success &&
          searchResult.success && selectResult.success &&
          appLoadResult.success && contextResult.success && processLaunchResult.success;

        if (isSuccessful) {
          successfulRuns++;
        }

        // Create enhanced metrics record
        const metrics: PerfMetricsEnhanced = {
          launch: loginResult.duration,
          search: searchResult.duration,
          select: selectResult.duration,
          timestamp: new Date().toISOString(),
          runNumber: i + 1,
          success: isSuccessful,
          errors: runErrors.length > 0 ? runErrors : undefined,
          retryCount,
          appLoad: appLoadResult.duration,
          contextSelection: contextResult.duration,
          processLaunch: processLaunchResult.duration,
          totalJourney: totalJourneyTime,
          networkMetrics: networkMetrics || undefined,
          regionInfo: regionInfo || undefined,
          apiMetrics: apiMetrics
        };

        metricsArr.push(metrics);
        totalErrors.push(...runErrors);

        console.log(`\n📊 Run ${i + 1} completed: ${isSuccessful ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        // Log API metrics summary
        if (apiMetrics) {
          console.log(`\n🌐 API Metrics Summary for Run ${i + 1}:`);
          console.log(`   📊 Total API Calls: ${apiMetrics.totalApiCalls}`);
          console.log(`   ⏱️  Total API Duration: ${apiMetrics.totalApiDuration}ms`);
          console.log(`   📈 Average API Duration: ${apiMetrics.averageApiDuration}ms`);
          if (apiMetrics.slowestApi) {
            console.log(`   🐌 Slowest API: ${apiMetrics.slowestApi.method} ${apiMetrics.slowestApi.url} (${apiMetrics.slowestApi.duration}ms)`);
          }
          if (apiMetrics.fastestApi) {
            console.log(`   ⚡ Fastest API: ${apiMetrics.fastestApi.method} ${apiMetrics.fastestApi.url} (${apiMetrics.fastestApi.duration}ms)`);
          }
          if (apiMetrics.failedApiCalls > 0) {
            console.log(`   ❌ Failed API Calls: ${apiMetrics.failedApiCalls}`);
          }
          
          // Log API calls by category
          const categories = Object.keys(apiMetrics.apiCallsByCategory);
          if (categories.length > 0) {
            console.log(`   📂 API Calls by Category:`);
            categories.forEach(category => {
              const calls = apiMetrics.apiCallsByCategory[category];
              const avgDuration = calls.reduce((sum, call) => sum + call.duration, 0) / calls.length;
              console.log(`      ${category}: ${calls.length} calls (avg: ${Math.round(avgDuration)}ms)`);
            });
          }
        }
        
        if (runErrors.length > 0) {
          console.log(`⚠️  Errors in run ${i + 1}:`, runErrors);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Run ${i + 1} failed completely: ${errorMessage}`);

        const failedMetrics: PerfMetricsEnhanced = {
          launch: 0,
          search: 0,
          select: 0,
          timestamp: new Date().toISOString(),
          runNumber: i + 1,
          success: false,
          errors: [errorMessage],
          retryCount
        };

        metricsArr.push(failedMetrics);
        totalErrors.push(errorMessage);
      } finally {
        // Clean up browser resources and pause before the next run
        await PerformanceRunReporter.cleanupRun(browser, i, testConfig);
      }
    }

    // Generate summary, statistics and write all report files
    PerformanceRunReporter.finalizeAndWriteReports(
      metricsArr,
      successfulRuns,
      totalErrors,
      testConfig
    );
  });

});
