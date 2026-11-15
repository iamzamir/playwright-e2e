// Imports `test` from @playwright/test rather than configs/fixtures on purpose: it times navigation in a browser it launches itself (chromium.launch), so the fixture page, logging and artifacts don't apply.
import { test, chromium, Browser, Page } from '@playwright/test';
import { TestUtil } from '../../util/test.util';
import { PortalPage } from '../../pageobjects/portal.page';
import { PlanningListingPage } from '../../pageobjects/planning-listing.page';
import { PlanningPage } from '../../pageobjects/planning.page';
import { PerformanceMetricsUtil, PerfMetrics } from '../../util/performance.metrics.util';

test.describe('Login Flow Tests', () => {

  let runs = 3;

  test('Navigate to Planning Space and capture performance metrics for ' + runs + ' runs and average', async () => {
    const metricsArr: PerfMetrics[] = [];

    for (let i = 0; i < runs; i++) {
      // Launch a new Chrome browser and page for each iteration
      const browser: Browser = await chromium.launch({ channel: 'chrome', headless: false });
      const page: Page = await browser.newPage();

      let objTestUtil = new TestUtil(page);
      let objPortalPage = new PortalPage(page);
      let objPlanningListingPage = new PlanningListingPage(page);
      let objPlanningPage = new PlanningPage(page);

      // Measure Time to login to the Portal and time taken to load the App Catalog
      const launchStart = Date.now();
      await objTestUtil.launchAppFromCatalog("cbp-interop-ps-automation-2");
      await objPortalPage.waitForAppCatalogToLoad();
      const launchEnd = Date.now();
      const launchDuration = launchEnd - launchStart;
      console.log(`Run ${i + 1}: Time to login to the Portal and time taken to load the App Catalog: ${launchDuration} ms`);

      // Measure Time from clicking App Catalog and searching Planning mfe
      const searchStart = Date.now();
      await objPortalPage.clickAppCatalog();
      await objPortalPage.searchApp("Planning");
      const searchEnd = Date.now();
      const searchDuration = searchEnd - searchStart;
      console.log(`Run ${i + 1}: Time from clicking App Catalog and searching Planning mfe: ${searchDuration} ms`);

      // Measure Time from clicking Planning mfe and wait until context dropdown visible
      const selectStart = Date.now();
      await objPortalPage.selectApp("Planning");
      await objPlanningListingPage.waitForContextDropdown();
      const selectEnd = Date.now();
      const selectDuration = selectEnd - selectStart;
      console.log(`Run ${i + 1}: Time from clicking Planning mfe and wait until context dropdown visible: ${selectDuration} ms`);

      // Measure Time to select Process in Planning Listing Page
      const processSelectStart = Date.now();
      await objPlanningListingPage.selectContext("Process");
      await objPlanningListingPage.selectProcess("PSAutomation");
      const processSelectEnd = Date.now();
      const processSelectDuration = processSelectEnd - processSelectStart;
      console.log(`Run ${i + 1}: Time to select Process in Planning Listing Page: ${processSelectDuration} ms`);

      // Measure Time to Launch Process and wait until Dashboard name is visible
      const processLaunchStart = Date.now();
      await objPlanningListingPage.clickLaunch();
      await objPlanningPage.waitForSpecificDashboardToBeDisplayed("arrange views view1");
      const processLaunchEnd = Date.now();
      const processLaunchDuration = processLaunchEnd - processLaunchStart;
      console.log(`Run ${i + 1}: Time to Launch Process and wait until Dashboard name is visible: ${processLaunchDuration} ms`);

      // Measure Time to Navigate from One View to another View
      const viewNavigationStart = Date.now();
      await objPlanningPage.selectViewInPlanning("arrange views view 2");
      await objPlanningPage.waitForSpecificDashboardToBeDisplayed("arrange views view 2");
      const viewNavigationEnd = Date.now();
      const viewNavigationDuration = viewNavigationEnd - viewNavigationStart;
      console.log(`Run ${i + 1}: Time to Navigate from One View to another View: ${viewNavigationDuration} ms`);

      // Prepare metrics
      const timestamp = new Date().toISOString();
      metricsArr.push({ launch: launchDuration, search: searchDuration, select: selectDuration, processSelect: processSelectDuration, processLaunch: processLaunchDuration, viewNavigation: viewNavigationDuration, timestamp });

      // Close browser for this iteration
      await browser.close();
    }

    // Write all runs to HTML (overwrite file)
    PerformanceMetricsUtil.writeHtmlMetricsArray(metricsArr, 'performance-metrics.html', true);

    // Write all runs to text file
    for (const m of metricsArr) {
      const metrics = [
        `Time to login to the Portal and time taken to load the App Catalog: ${m.launch} ms`,
        `Time from clicking App Catalog and searching Planning mfe: ${m.search} ms`,
        `Time from clicking Planning mfe and wait until context dropdown visible: ${m.select} ms`,
        `Time to select Process in Planning Listing Page: ${m.processSelect} ms`,
        `Time to Launch Process and wait until Dashboard name is visible: ${m.processLaunch} ms`,
        `Time to Navigate from One View to another View: ${m.viewNavigation} ms`,
        `Timestamp: ${m.timestamp}`
      ].join('\n');
      PerformanceMetricsUtil.writeTextMetrics(metrics, 'performance-metrics.txt');
    }

    // Write average metrics to HTML and text
    PerformanceMetricsUtil.writeAverageMetrics(metricsArr, 'performance-metrics.html');
  });

});
