// Imports `test` from @playwright/test rather than configs/fixtures on purpose: it times navigation in a browser it launches itself (chromium.launch), so the fixture page, logging and artifacts don't apply.
import { test, chromium, Browser, Page } from '@playwright/test';
import { TestUtil } from '../../util/test.util';
import { PortalPage } from '../../pageobjects/portal.page';
import { PerformanceMetricsUtil, ParallelRunMetrics } from '../../util/performance.metrics.util';

test('Navigate to Planning Space and capture performance metrics for 5 runs in parallel and average', async () => {
  const runCount = 2;

  // Function for a single run
  const runMetric = async (runIndex: number): Promise<ParallelRunMetrics> => {
    const browser: Browser = await chromium.launch({
      channel: 'chrome',
      headless: false
    });
    const page: Page = await browser.newPage();

    let objTestUtil = new TestUtil(page);
    let objPortalPage = new PortalPage(page);

    // Measure time to login to the Portal
    const launchStart = Date.now();
    await objTestUtil.launchAppFromCatalog("cbp-interop-ps-automation-2");
    const launchEnd = Date.now();
    const launchDuration = launchEnd - launchStart;
    console.log(`Run ${runIndex + 1}: Time to login to the Portal: ${launchDuration} ms`);

    await objPortalPage.clickAppCatalog();

    // Measure time to search Planning mfe
    const searchStart = Date.now();
    await objPortalPage.searchApp("Planning");
    const searchEnd = Date.now();
    const searchDuration = searchEnd - searchStart;
    console.log(`Run ${runIndex + 1}: Time to search Planning mfe: ${searchDuration} ms`);

    // Measure time to Launch Process
    const selectStart = Date.now();
    await objPortalPage.selectApp("Planning");
    const selectEnd = Date.now();
    const selectDuration = selectEnd - selectStart;
    console.log(`Run ${runIndex + 1}: Time to Launch Process: ${selectDuration} ms`);

    // Prepare metrics
    const timestamp = new Date().toISOString();
    await browser.close();
    return {
      launch: launchDuration,
      search: searchDuration,
      select: selectDuration,
      timestamp
    };
  };

  // Run all in parallel
  const metricsArr: ParallelRunMetrics[] = await Promise.all(
    Array.from({ length: runCount }, (_, i) => runMetric(i))
  );

  // Write all runs to HTML (overwrite file)
  PerformanceMetricsUtil.writeHtmlMetricsArray(metricsArr, 'performance-metrics-parallel.html', true);

  // Write all runs to text file
  for (const m of metricsArr) {
    const metrics = [
      `Time to login to the Portal: ${m.launch} ms`,
      `Time to search Planning mfe: ${m.search} ms`,
      `Time to Launch Process: ${m.select} ms`,
      `Timestamp: ${m.timestamp}`
    ].join('\n');
    PerformanceMetricsUtil.writeTextMetrics(metrics, 'performance-metrics-parallel.txt');
  }

  // Write average metrics to HTML and text
  PerformanceMetricsUtil.writeAverageMetrics(metricsArr, 'performance-metrics-parallel.html');
});
