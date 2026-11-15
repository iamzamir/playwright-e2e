import { Page, expect, Locator, BrowserContext } from '@playwright/test';
import LoginPage from '../pageobjects/login.page';
import { CommonFunctions } from './common.util';
import * as fs from 'fs';
import path from 'path';

export class PerformanceMetrics extends LoginPage {

}

export interface PerfMetrics {
  launch: number;
  search: number;
  select: number;
  processSelect: number;
  processLaunch: number;
  viewNavigation: number;
  timestamp: string;
}

export type ParallelRunMetrics = Pick<PerfMetrics, 'launch' | 'search' | 'select' | 'timestamp'>;

export class PerformanceMetricsUtil {
  static writeTextMetrics(metrics: string, filename = 'performance-metrics.txt') {
    // Create the reports/performance-metrics directory structure within playwright-e2e
    const playwrightE2eDir = path.resolve(__dirname, '../'); // Go up to playwright-e2e folder
    const reportsDir = path.resolve(playwrightE2eDir, 'reports');
    const performanceMetricsDir = path.resolve(reportsDir, 'performance-metrics');
    
    // Ensure directories exist
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    if (!fs.existsSync(performanceMetricsDir)) {
      fs.mkdirSync(performanceMetricsDir, { recursive: true });
    }
    
    const metricsPath = path.resolve(performanceMetricsDir, filename);
    fs.appendFileSync(metricsPath, metrics + '\n\n', 'utf8');
    console.log(`Performance metrics written to ${metricsPath}`);
  }

  static writeHtmlMetrics(metricsObj: PerfMetrics | ParallelRunMetrics, filename = 'performance-metrics.html') {
    this.writeHtmlMetricsArray([metricsObj], filename, false);
  }

  static writeHtmlMetricsArray(metricsArr: (PerfMetrics | ParallelRunMetrics)[], filename = 'performance-metrics.html', overwrite = true) {
    // Create the reports/performance-metrics directory structure within playwright-e2e
    const playwrightE2eDir = path.resolve(__dirname, '../'); // Go up to playwright-e2e folder
    const reportsDir = path.resolve(playwrightE2eDir, 'reports');
    const performanceMetricsDir = path.resolve(reportsDir, 'performance-metrics');
    
    // Ensure directories exist
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    if (!fs.existsSync(performanceMetricsDir)) {
      fs.mkdirSync(performanceMetricsDir, { recursive: true });
    }
    
    const htmlPath = path.resolve(performanceMetricsDir, filename);
    let htmlContent = '';
    if (!fs.existsSync(htmlPath) || overwrite) {
      htmlContent += `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Performance Metrics Report</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 2em; background: #f8fafc; color: #222; }
    h1 { color: #2a4365; }
    .metrics-container { max-width: 900px; margin: auto; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 2em; background: #fff; box-shadow: 0 2px 8px #0001; border-radius: 8px; overflow: hidden; }
    th, td { border: none; padding: 12px 16px; text-align: left; }
    th { background: #2b6cb0; color: #fff; font-weight: 600; }
    tr:nth-child(even) td { background: #f1f5f9; }
    tr:hover td { background: #bee3f8; transition: background 0.2s; }
    caption { font-size: 1.15em; margin-bottom: 0.5em; font-weight: bold; color: #2b6cb0; }
    .average-table caption { color: #38a169; }
    .average-table th { background: #38a169; }
    details { margin-bottom: 1em; border-radius: 8px; box-shadow: 0 1px 4px #0001; background: #fff; }
    summary { cursor: pointer; font-size: 1.1em; font-weight: bold; padding: 10px 16px; background: #2b6cb0; color: #fff; border-radius: 8px 8px 0 0; outline: none; }
    details[open] summary { border-bottom: 1px solid #e2e8f0; }
    @media (max-width: 700px) {
      body { margin: 0.5em; }
      .metrics-container { width: 100%; }
      table, th, td, summary { font-size: 0.95em; }
    }
  </style>
</head>
<body>
  <div class="metrics-container">
    <h1>Performance Metrics Report</h1>
`;
    } else {
      htmlContent = fs.readFileSync(htmlPath, 'utf8');
      htmlContent = htmlContent.replace('</div></body></html>', '');
    }

    // Helper to get labels based on metric shape
    const getLabels = (m: PerfMetrics | ParallelRunMetrics) => {
      if ('processSelect' in m) {
        return {
          launch: 'Time to login to the Portal and time taken to load the App Catalog',
          search: 'Time from clicking App Catalog and searching Planning mfe',
          select: 'Time from clicking Planning mfe and wait until context dropdown visible',
        };
      }
      return {
        launch: 'Time to login to the Portal',
        search: 'Time to search Planning mfe',
        select: 'Time to Launch Process',
      };
    };

    // If the last entry is an average, show it as a summary table at the top
    let metricsToShow = metricsArr;
    if (metricsArr.length > 0 && metricsArr[metricsArr.length - 1].timestamp.startsWith('AVERAGE')) {
      const avg = metricsArr[metricsArr.length - 1];
      // Extract the run count from the avg.timestamp string
      const match = avg.timestamp.match(/AVERAGE OF (\d+) RUNS/);
      const runCount = match ? match[1] : (metricsArr.length - 1);
      const labels = getLabels(avg);
      htmlContent += `
<table class="average-table">
  <caption>Average of ${runCount} Runs</caption>
  <tr><th>Metric</th><th>Average Value</th></tr>
  <tr><td>${labels.launch}</td><td>${avg.launch} ms</td></tr>
  <tr><td>${labels.search}</td><td>${avg.search} ms</td></tr>
  <tr><td>${labels.select}</td><td>${avg.select} ms</td></tr>${'processSelect' in avg ? `
  <tr><td>Time to select Process in Planning Listing Page</td><td>${avg.processSelect} ms</td></tr>
  <tr><td>Time to Launch Process and wait until Dashboard name is visible</td><td>${avg.processLaunch} ms</td></tr>
  <tr><td>Time to Navigate from One View to another View</td><td>${avg.viewNavigation} ms</td></tr>` : ''}
</table>
  `;
      metricsToShow = metricsArr.slice(0, -1);
    }

    // Show all runs as collapsible details
    metricsToShow.forEach((metricsObj, idx) => {
      const labels = getLabels(metricsObj);
      htmlContent += `
    <details>
      <summary>Run ${idx + 1} — ${metricsObj.timestamp}</summary>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>${labels.launch}</td><td>${metricsObj.launch} ms</td></tr>
        <tr><td>${labels.search}</td><td>${metricsObj.search} ms</td></tr>
        <tr><td>${labels.select}</td><td>${metricsObj.select} ms</td></tr>${'processSelect' in metricsObj ? `
        <tr><td>Time to select Process in Planning Listing Page</td><td>${metricsObj.processSelect} ms</td></tr>
        <tr><td>Time to Launch Process and wait until Dashboard name is visible</td><td>${metricsObj.processLaunch} ms</td></tr>
        <tr><td>Time to Navigate from One View to another View</td><td>${metricsObj.viewNavigation} ms</td></tr>` : ''}
        <tr><td>Timestamp</td><td>${metricsObj.timestamp}</td></tr>
      </table>
    </details>
      `;
    });

    htmlContent += '</div></body></html>';
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log(`Performance metrics HTML report written to ${htmlPath}`);
  }

  static writeAverageMetrics(metricsArr: (PerfMetrics | ParallelRunMetrics)[], filename = 'performance-metrics.html', textFilename?: string) {
    if (metricsArr.length === 0) return;
    const resolvedTextFilename = textFilename ?? (filename.endsWith('.html') ? filename.replace(/\.html$/, '.txt') : 'performance-metrics.txt');
    const isFullMetricsArray = (arr: (PerfMetrics | ParallelRunMetrics)[]): arr is PerfMetrics[] =>
      arr.length > 0 && arr.every((m) => 'processSelect' in m);

    if (isFullMetricsArray(metricsArr)) {
      const avg: PerfMetrics = {
        launch: Math.round(metricsArr.reduce((a, b) => a + b.launch, 0) / metricsArr.length),
        search: Math.round(metricsArr.reduce((a, b) => a + b.search, 0) / metricsArr.length),
        select: Math.round(metricsArr.reduce((a, b) => a + b.select, 0) / metricsArr.length),
        processSelect: Math.round(metricsArr.reduce((a, b) => a + b.processSelect, 0) / metricsArr.length),
        processLaunch: Math.round(metricsArr.reduce((a, b) => a + b.processLaunch, 0) / metricsArr.length),
        viewNavigation: Math.round(metricsArr.reduce((a, b) => a + b.viewNavigation, 0) / metricsArr.length),
        timestamp: `AVERAGE OF ${metricsArr.length} RUNS`
      };
      const allWithAvg = [...metricsArr, avg];
      this.writeHtmlMetricsArray(allWithAvg, filename, true);
      const avgText = [
        `Average Time to login to the Portal and time taken to load the App Catalog: ${avg.launch} ms`,
        `Average Time from clicking App Catalog and searching Planning mfe: ${avg.search} ms`,
        `Average Time from clicking Planning mfe and wait until context dropdown visible: ${avg.select} ms`,
        `Average Time to select Process in Planning Listing Page: ${avg.processSelect} ms`,
        `Average Time to Launch Process and wait until Dashboard name is visible: ${avg.processLaunch} ms`,
        `Average Time to Navigate from One View to another View: ${avg.viewNavigation} ms`,
        `Runs: ${metricsArr.length}`
      ].join('\n');
      this.writeTextMetrics(avgText, resolvedTextFilename);
    } else {
      const avg: ParallelRunMetrics = {
        launch: Math.round(metricsArr.reduce((a, b) => a + b.launch, 0) / metricsArr.length),
        search: Math.round(metricsArr.reduce((a, b) => a + b.search, 0) / metricsArr.length),
        select: Math.round(metricsArr.reduce((a, b) => a + b.select, 0) / metricsArr.length),
        timestamp: `AVERAGE OF ${metricsArr.length} RUNS`
      };
      const allWithAvg = [...metricsArr, avg];
      this.writeHtmlMetricsArray(allWithAvg, filename, true);
      const avgText = [
        `Average Time to login to the Portal: ${avg.launch} ms`,
        `Average Time to search Planning mfe: ${avg.search} ms`,
        `Average Time to Launch Process: ${avg.select} ms`,
        `Runs: ${metricsArr.length}`
      ].join('\n');
      this.writeTextMetrics(avgText, resolvedTextFilename);
    }
  }
}
