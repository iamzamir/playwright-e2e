import * as fs from 'fs';
import path from 'path';
import { PerformanceReportTemplate } from '../templates/performance-report.template';
import { PerfMetricsEnhanced } from './performance.test.utils';
import { PERFORMANCE_INSIGHT_THRESHOLDS } from '../configs/performance-test.config';

// Core interfaces
export interface PerfMetrics {
  launch: number;
  search: number;
  select: number;
  timestamp: string;
}

export interface StatisticalMetrics {
  mean: number;
  median: number;
  min: number;
  max: number;
  count: number;
}

export interface PerformanceStatistics {
  launch: StatisticalMetrics;
  search: StatisticalMetrics;
  select: StatisticalMetrics;
  processLaunch: StatisticalMetrics;
  viewNavigation: StatisticalMetrics;
  overall: {
    successRate: number;
    totalRuns: number;
    successfulRuns: number;
  };
}

/**
 * Enhanced Performance Metrics Utility
 * Provides statistical analysis and reporting for performance test results
 */
export class EnhancedPerformanceMetricsUtil {
  
  // ===== STATISTICAL CALCULATIONS =====
  
  /**
   * Calculate comprehensive statistics for a set of values
   */
  static calculateStatistics(values: number[]): StatisticalMetrics {
    if (values.length === 0) {
      return this.getEmptyStatistics();
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    
    return {
      mean: this.roundToTwo(values.reduce((sum, val) => sum + val, 0) / count),
      median: this.roundToTwo(this.calculateMedian(sorted)),
      min: sorted[0],
      max: sorted[count - 1],
      count
    };
  }

  private static getEmptyStatistics(): StatisticalMetrics {
    return {
      mean: 0, median: 0, min: 0, max: 0, count: 0
    };
  }

  private static calculateMedian(sorted: number[]): number {
    const count = sorted.length;
    return count % 2 === 0 
      ? (sorted[Math.floor(count / 2) - 1] + sorted[Math.floor(count / 2)]) / 2
      : sorted[Math.floor(count / 2)];
  }

  private static roundToTwo(num: number): number {
    return Math.round(num * 100) / 100;
  }

  // ===== STATISTICS GENERATION =====
  
  static generatePerformanceStatistics(metricsArr: PerfMetricsEnhanced[], successfulRuns?: number): PerformanceStatistics {
    const validMetrics = metricsArr.filter(m => m.launch > 0 && m.search > 0 && m.select > 0);
    
    return {
      launch: this.calculateStatistics(validMetrics.map(m => m.launch)),
      search: this.calculateStatistics(validMetrics.map(m => m.search)),
      select: this.calculateStatistics(validMetrics.map(m => m.select)),
      processLaunch: this.calculateStatistics(validMetrics.map(m => m.processLaunch || 0)),
      viewNavigation: this.calculateStatistics(validMetrics.map(m => m.viewNavigation || 0)),
      overall: {
        successRate: this.calculateSuccessRate(metricsArr.length, successfulRuns, validMetrics.length),
        totalRuns: metricsArr.length,
        successfulRuns: successfulRuns !== undefined ? successfulRuns : validMetrics.length
      }
    };
  }

  private static calculateSuccessRate(totalRuns: number, successfulRuns?: number, validMetrics?: number): number {
    const successful = successfulRuns !== undefined ? successfulRuns : (validMetrics || 0);
    return Math.round((successful / totalRuns) * 10000) / 100;
  }

  // ===== FILE OUTPUT UTILITIES =====
  
  static writeTextMetrics(metrics: string, filename = 'performance-metrics.txt'): void {
    const metricsPath = path.resolve(__dirname, '../../', filename);
    fs.appendFileSync(metricsPath, metrics + '\n\n', 'utf8');
    console.log(`📊 Performance metrics written to ${metricsPath}`);
  }

  // ===== HTML REPORT GENERATION =====
  
  static writeEnhancedHtmlReport(
    metricsArr: PerfMetricsEnhanced[], 
    filename = 'performance-metrics-enhanced-interop-environment.html', 
    successfulRuns?: number
  ): void {
    try {
      console.log(`📊 Generating enhanced HTML report: ${filename}`);
      const statistics = this.generatePerformanceStatistics(metricsArr, successfulRuns);
      const htmlContent = PerformanceReportTemplate.generateHtmlReport(statistics, metricsArr);
      
      // Create the reports/performance-metrics directory structure within playwright-e2e
      const playwrightE2eDir = path.resolve(__dirname, '../'); // Go up to playwright-e2e folder
      const reportsDir = path.resolve(playwrightE2eDir, 'reports');
      const performanceMetricsDir = path.resolve(reportsDir, 'performance-metrics');
      
      // Ensure directories exist
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
        console.log(`📁 Created reports directory: ${reportsDir}`);
      }
      
      if (!fs.existsSync(performanceMetricsDir)) {
        fs.mkdirSync(performanceMetricsDir, { recursive: true });
        console.log(`📁 Created performance-metrics directory: ${performanceMetricsDir}`);
      }
      
      const htmlPath = path.resolve(performanceMetricsDir, filename);
      console.log(`📁 Writing HTML report to: ${htmlPath}`);
      fs.writeFileSync(htmlPath, htmlContent, 'utf8');
      console.log(`✅ Enhanced HTML report written successfully to ${htmlPath}`);
    } catch (error) {
      console.error(`❌ Failed to write enhanced HTML report: ${error}`);
      console.error(`📁 Attempted path: ${path.resolve(__dirname, '../reports/performance-metrics/', filename)}`);
    }
  }

  // ===== TEXT SUMMARY GENERATION =====
  
  static writeStatisticalSummary(statistics: PerformanceStatistics, filename = 'performance-statistics.txt'): void {
    try {
      console.log(`📊 Generating statistical summary: ${filename}`);
      const summary = this.generateTextSummary(statistics);
      
      // Use the same directory structure as HTML reports within playwright-e2e
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
      
      const summaryPath = path.resolve(performanceMetricsDir, filename);
      console.log(`📁 Writing statistical summary to: ${summaryPath}`);
      
      fs.writeFileSync(summaryPath, summary, 'utf8');
      console.log(`✅ Statistical summary written successfully to ${summaryPath}`);
    } catch (error) {
      console.error(`❌ Failed to write statistical summary: ${error}`);
      console.error(`📁 Attempted path: ${path.resolve(__dirname, '../reports/performance-metrics/', filename)}`);
    }
  }

  private static generateTextSummary(statistics: PerformanceStatistics): string {
    return `
🚀 PERFORMANCE TEST SUMMARY
${'='.repeat(50)}
📅 Generated: ${new Date().toISOString()}

📊 OVERALL RESULTS:
   • Total Runs: ${statistics.overall.totalRuns}
   • Successful: ${statistics.overall.successfulRuns}
   • Success Rate: ${statistics.overall.successRate}%

🔐 PORTAL LOGIN PERFORMANCE:
   • Mean: ${statistics.launch.mean}ms
   • Median: ${statistics.launch.median}ms
   • Min: ${statistics.launch.min}ms
   • Max: ${statistics.launch.max}ms

🔍 APP SEARCH PERFORMANCE:
   • Mean: ${statistics.search.mean}ms
   • Median: ${statistics.search.median}ms
   • Min: ${statistics.search.min}ms
   • Max: ${statistics.search.max}ms

🚀 APP LAUNCH PERFORMANCE:
   • Mean: ${statistics.select.mean}ms
   • Median: ${statistics.select.median}ms
   • Min: ${statistics.select.min}ms
   • Max: ${statistics.select.max}ms

${this.generatePerformanceInsights(statistics)}
`;
  }

  private static generatePerformanceInsights(statistics: PerformanceStatistics): string {
    const insights: string[] = [];
    
    // Success rate insights
    if (statistics.overall.successRate === 100) {
      insights.push('✅ Perfect success rate - all tests passed');
    } else if (statistics.overall.successRate >= 90) {
      insights.push('✅ Excellent success rate - system is performing well');
    } else if (statistics.overall.successRate >= 70) {
      insights.push('⚠️  Good success rate - some intermittent issues detected');
    } else {
      insights.push('❌ Poor success rate - significant reliability issues');
    }

    // Performance insights
    const avgTotal = statistics.launch.mean + statistics.search.mean + statistics.select.mean;
    if (avgTotal < PERFORMANCE_INSIGHT_THRESHOLDS.excellent) {
      insights.push(`🚀 Excellent performance - under ${PERFORMANCE_INSIGHT_THRESHOLDS.excellent / 1000} seconds total`);
    } else if (avgTotal < PERFORMANCE_INSIGHT_THRESHOLDS.good) {
      insights.push(`👍 Good performance - under ${PERFORMANCE_INSIGHT_THRESHOLDS.good / 1000} seconds total`);
    } else {
      insights.push(`⚠️  Performance needs attention - over ${PERFORMANCE_INSIGHT_THRESHOLDS.good / 1000} seconds total`);
    }

    return `💡 PERFORMANCE INSIGHTS:
${insights.map(insight => `   ${insight}`).join('\n')}
`;
  }
}