import { PerformanceStatistics, PerfMetrics } from '../util/performance.metrics.enhanced.util';
import { PerfMetricsEnhanced } from '../util/performance.test.utils';

/**
 * HTML Template Generator for Performance Reports
 * Handles all HTML/CSS generation and UI concerns
 */
export class PerformanceReportTemplate {
  
  /**
   * Generate complete HTML report
   */
  static generateHtmlReport(statistics: PerformanceStatistics, metricsArr: PerfMetricsEnhanced[]): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Performance Metrics Report</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${this.getStyles()}
</head>
<body>
  <div class="container">
    ${this.generateHeader()}
    ${this.generateSummaryCards(statistics)}
    ${this.generateEnvironmentInfo(metricsArr)}
    ${this.generateStatisticsTable(statistics)}
    ${this.generateApiMetricsSection(metricsArr)}
    ${this.generateDetailedRuns(metricsArr)}
  </div>
  ${this.getScripts()}
</body>
</html>`;
  }

  /**
   * Generate CSS styles
   */
  private static getStyles(): string {
    return `<style>
    * { box-sizing: border-box; }
    
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      margin: 0; 
      padding: 20px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      color: #1a202c; 
      line-height: 1.6;
    }
    
    .container { 
      max-width: 1200px; 
      margin: 0 auto; 
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      backdrop-filter: blur(10px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    /* Header Styles */
    .header { 
      text-align: center; 
      padding: 3rem 2rem 2rem 2rem;
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: white;
      position: relative;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><defs><radialGradient id="a" cx="50%" cy="50%"><stop offset="0%" stop-color="rgba(255,255,255,.1)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><rect width="100%" height="100%" fill="url(%23a)"/></svg>');
      opacity: 0.3;
    }
    
    .header h1 { 
      font-size: 3rem; 
      margin: 0; 
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      position: relative;
      z-index: 1;
    }
    
    .header .subtitle { 
      font-size: 1.2rem; 
      margin-top: 0.5rem; 
      opacity: 0.9;
      position: relative;
      z-index: 1;
    }
    
    /* Content Area */
    .content-area {
      padding: 2rem;
    }
    
    /* Summary Cards */
    .cards { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
      gap: 1.5rem; 
      margin-bottom: 3rem; 
    }
    
    .card { 
      background: white; 
      padding: 2rem; 
      border-radius: 16px; 
      box-shadow: 0 8px 25px rgba(0,0,0,0.08); 
      border-left: 5px solid #4299e1;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    
    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 35px rgba(0,0,0,0.15);
    }
    
    .card::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, rgba(66, 153, 225, 0.1), rgba(66, 153, 225, 0.05));
      border-radius: 0 16px 0 60px;
    }
    
    .card h3 { 
      margin: 0 0 1rem 0; 
      color: #2d3748; 
      font-size: 0.9rem; 
      text-transform: uppercase; 
      letter-spacing: 0.1em;
      font-weight: 600;
    }
    
    .card .value { 
      font-size: 2.8rem; 
      font-weight: 800; 
      color: #2b6cb0; 
      margin: 0.5rem 0; 
      line-height: 1;
    }
    
    .card .label { 
      color: #718096; 
      font-size: 1rem; 
      margin-top: 0.5rem; 
    }
    
    /* Success Rate Colors */
    .success-good { color: #38a169; }
    .success-warning { color: #d69e2e; }
    .success-bad { color: #e53e3e; }
    
    /* Section Styles */
    .section { 
      background: white; 
      border-radius: 16px; 
      overflow: hidden; 
      box-shadow: 0 8px 25px rgba(0,0,0,0.08); 
      margin-bottom: 2rem; 
    }
    
    .section h2 { 
      background: linear-gradient(135deg, #f7fafc, #edf2f7); 
      margin: 0; 
      padding: 1.5rem 2rem; 
      color: #2d3748; 
      font-size: 1.4rem;
      font-weight: 600;
      border-bottom: 1px solid #e2e8f0;
    }
    
    /* Table Styles */
    table { 
      width: 100%; 
      border-collapse: collapse; 
    }
    
    th, td { 
      padding: 1rem 1.5rem; 
      text-align: left; 
      border-bottom: 1px solid #e2e8f0; 
    }
    
    th { 
      background: #f8fafc; 
      font-weight: 600; 
      color: #4a5568; 
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    tbody tr:hover td { 
      background: #f7fafc; 
      transition: background 0.2s ease;
    }
    
    tbody tr:last-child td {
      border-bottom: none;
    }
    
    /* Run Details */
    .run-details { 
      padding: 0; 
    }
    
    .run-item { 
      border-bottom: 1px solid #e2e8f0;
    }
    
    .run-item:last-child {
      border-bottom: none;
    }
    
    .run-header { 
      padding: 1.5rem 2rem; 
      background: white; 
      font-weight: 600; 
      cursor: pointer; 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      transition: background 0.2s ease;
      border: none;
      outline: none;
    }
    
    .run-header:hover { 
      background: #f7fafc; 
    }
    
    .run-header.active {
      background: #edf2f7;
    }
    
    .run-content { 
      padding: 0 2rem 2rem 2rem; 
      display: none; 
      background: #f8fafc;
    }
    
    .run-content.show { 
      display: block; 
      animation: slideDown 0.3s ease;
    }
    
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    
    .metric-item {
      background: white;
      padding: 1rem;
      border-radius: 8px;
      border-left: 3px solid #4299e1;
    }
    
    .metric-label { 
      color: #4a5568; 
      font-size: 0.9rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    
    .metric-value { 
      font-weight: 700; 
      font-size: 1.1rem;
      color: #2d3748;
    }
    
    .toggle {
      background: #4299e1;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      transition: transform 0.3s ease, background 0.3s ease;
    }
    
    .toggle.rotated {
      transform: rotate(45deg);
      background: #2b6cb0;
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      body { padding: 1rem; }
      .container { border-radius: 12px; }
      .header { padding: 2rem 1rem 1.5rem 1rem; }
      .header h1 { font-size: 2.2rem; }
      .content-area { padding: 1.5rem; }
      .cards { grid-template-columns: 1fr; }
      th, td { padding: 0.75rem 1rem; }
      .metric-grid { grid-template-columns: 1fr; }
    }
    
    @media (max-width: 480px) {
      .header h1 { font-size: 1.8rem; }
      .card .value { font-size: 2.2rem; }
      .run-header { padding: 1rem 1.5rem; }
      .run-content { padding: 0 1.5rem 1.5rem 1.5rem; }
    }

    /* API Metrics Styles */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 1.5rem 0;
    }

    .metric-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      border-left: 4px solid #4299e1;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }

    .metric-icon {
      font-size: 2rem;
      opacity: 0.8;
    }

    .metric-details .metric-value {
      font-size: 1.8rem;
      font-weight: 700;
      color: #2d3748;
      line-height: 1;
    }

    .metric-details .metric-label {
      font-size: 0.9rem;
      color: #718096;
      margin-top: 0.25rem;
    }

    .api-categories {
      margin: 1.5rem 0;
    }

    .api-category {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 0.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .category-name {
      font-weight: 600;
      color: #2d3748;
      text-transform: capitalize;
    }

    .category-stats {
      display: flex;
      gap: 1rem;
      font-size: 0.9rem;
      color: #718096;
    }

    .api-highlights {
      margin: 1.5rem 0;
    }

    .highlights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }

    .highlight-card {
      background: #f7fafc;
      border-radius: 8px;
      padding: 1rem;
      border-left: 4px solid #cbd5e0;
    }

    .highlight-card.slow {
      border-left-color: #f56565;
      background: #fed7d7;
    }

    .highlight-card.fast {
      border-left-color: #48bb78;
      background: #c6f6d5;
    }

    .highlight-label {
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 0.5rem;
    }

    .highlight-value {
      font-size: 0.9rem;
      color: #4a5568;
      word-break: break-all;
      margin-bottom: 0.25rem;
    }

    .highlight-duration {
      font-weight: 700;
      color: #2d3748;
    }

    .no-data {
      text-align: center;
      padding: 2rem;
      color: #718096;
      font-style: italic;
    }

    /* Top 10 APIs Table Styles */
    .top-apis-section {
      margin: 2rem 0;
    }

    .top-apis-table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
    }

    .top-apis-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    .top-apis-table thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .top-apis-table th {
      padding: 1rem 0.75rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .top-apis-table td {
      padding: 0.75rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .api-row:hover {
      background: #f8fafc;
      transform: scale(1.001);
      transition: all 0.2s ease;
    }

    .api-row.critical {
      border-left: 4px solid #f56565;
      background: rgba(254, 215, 215, 0.1);
    }

    .api-row.warning {
      border-left: 4px solid #ed8936;
      background: rgba(255, 235, 156, 0.1);
    }

    .api-row.normal {
      border-left: 4px solid #4299e1;
      background: rgba(191, 219, 254, 0.05);
    }

    .rank-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      font-weight: 700;
      font-size: 0.75rem;
      color: white;
    }

    .rank-1, .rank-2, .rank-3 {
      background: linear-gradient(135deg, #f56565, #e53e3e);
      box-shadow: 0 2px 8px rgba(245, 101, 101, 0.3);
    }

    .rank-4, .rank-5, .rank-6, .rank-7 {
      background: linear-gradient(135deg, #ed8936, #dd6b20);
      box-shadow: 0 2px 8px rgba(237, 137, 54, 0.3);
    }

    .rank-8, .rank-9, .rank-10 {
      background: linear-gradient(135deg, #4299e1, #3182ce);
      box-shadow: 0 2px 8px rgba(66, 153, 225, 0.3);
    }

    .method-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .method-get {
      background: #c6f6d5;
      color: #22543d;
    }

    .method-post {
      background: #bee3f8;
      color: #1a365d;
    }

    .method-put {
      background: #fbb6ce;
      color: #702459;
    }

    .method-delete {
      background: #fed7d7;
      color: #742a2a;
    }

    .endpoint-url {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.8rem;
      color: #4a5568;
      line-height: 1.4;
      word-break: break-all;
    }

    .duration-value {
      font-weight: 700;
      color: #2d3748;
      font-size: 0.9rem;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.75rem;
    }

    .status-2xx {
      background: #c6f6d5;
      color: #22543d;
    }

    .status-3xx {
      background: #fef5e7;
      color: #744210;
    }

    .status-4xx {
      background: #fed7d7;
      color: #742a2a;
    }

    .status-5xx {
      background: #e6fffa;
      color: #234e52;
    }

    .category-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      background: #edf2f7;
      color: #4a5568;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: capitalize;
    }

    /* Responsive design for table */
    @media (max-width: 768px) {
      .top-apis-table {
        font-size: 0.8rem;
      }
      
      .top-apis-table th,
      .top-apis-table td {
        padding: 0.5rem 0.25rem;
      }
      
      .endpoint-url {
        font-size: 0.7rem;
      }
    }

    /* Enhanced Slow APIs Table Styles */
    .slow-apis-section {
      margin: 2rem 0;
    }

    .collapsible-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 12px 12px 0 0;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.3s ease;
      user-select: none;
    }

    .collapsible-header:hover {
      background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    .collapsible-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .collapse-indicator {
      font-size: 1.2rem;
      transition: transform 0.3s ease;
      font-weight: bold;
    }

    .collapse-indicator.collapsed {
      transform: rotate(-90deg);
    }

    .collapsible-content {
      background: white;
      border-radius: 0 0 12px 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
      border-top: none;
      max-height: 1000px;
      transition: max-height 0.3s ease-out;
    }

    .collapsible-content.collapsed {
      max-height: 0;
      border: none;
    }

    .slow-apis-table-container {
      background: white;
      overflow-x: auto;
    }

    .slow-apis-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      min-width: 800px;
    }

    .slow-apis-table thead {
      background: #f8fafc;
      color: #2d3748;
      border-bottom: 2px solid #e2e8f0;
    }

    .slow-apis-table th {
      padding: 1rem 0.75rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .slow-apis-table td {
      padding: 0.75rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .slow-apis-table tbody tr:hover {
      background: #f8fafc;
      transform: scale(1.001);
      transition: all 0.2s ease;
    }

    .min-duration .duration-value {
      color: #38a169;
      font-weight: 500;
    }

    .avg-duration .duration-value.highlight {
      background: linear-gradient(135deg, #fed7d7 0%, #fbb6ce 100%);
      color: #742a2a;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-weight: 700;
    }

    .max-duration .duration-value {
      color: #e53e3e;
      font-weight: 600;
    }

    .count-badge {
      background: #e2e8f0;
      color: #4a5568;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.8rem;
    }

    .size-value {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.85rem;
      color: #4a5568;
      font-weight: 500;
    }

    .status-count {
      background: #fed7d7;
      color: #742a2a;
      padding: 0.125rem 0.25rem;
      border-radius: 4px;
      font-size: 0.7rem;
      margin-left: 0.25rem;
      font-weight: 600;
    }

    .no-slow-apis {
      padding: 2rem;
      text-align: center;
      color: #68d391;
      font-size: 1.1rem;
    }

    .no-slow-apis p {
      margin: 0;
      font-weight: 500;
    }

    /* Enhanced responsive design for slow APIs table */
    @media (max-width: 1024px) {
      .slow-apis-table {
        font-size: 0.8rem;
        min-width: 700px;
      }
      
      .slow-apis-table th,
      .slow-apis-table td {
        padding: 0.5rem 0.4rem;
      }
    }

    @media (max-width: 768px) {
      .slow-apis-table {
        font-size: 0.75rem;
        min-width: 600px;
      }
      
      .slow-apis-table th,
      .slow-apis-table td {
        padding: 0.4rem 0.3rem;
      }
      
      .endpoint-url {
        font-size: 0.7rem;
      }
      
      .collapsible-header h3 {
        font-size: 1rem;
      }
    }

    /* Environment Section Styles */
    .environment-section {
      margin-top: 2rem;
    }

    .environment-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.5rem;
      margin-top: 1rem;
    }

    .env-card {
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      transition: all 0.3s ease;
    }

    .env-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.12);
    }

    .network-card {
      border-left: 4px solid #4facfe;
    }

    .location-card {
      border-left: 4px solid #43e97b;
    }

    .env-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .env-icon {
      font-size: 1.5rem;
      opacity: 0.8;
    }

    .env-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #2d3748;
    }

    .env-details {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .env-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
    }

    .env-label {
      font-weight: 500;
      color: #4a5568;
      font-size: 0.9rem;
    }

    .env-value {
      font-weight: 600;
      color: #2d3748;
      text-align: right;
      font-size: 0.9rem;
    }

    .env-value.save-data {
      color: #f56565;
    }

    .info-message {
      text-align: center;
      padding: 2rem;
      color: #718096;
      background: #f7fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    @media (max-width: 768px) {
      .environment-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      
      .env-card {
        padding: 1rem;
      }
      
      .env-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
      }
      
      .env-value {
        text-align: left;
      }
    }

    /* Run Environment Styles */
    .run-environment {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e2e8f0;
    }

    .run-environment h4 {
      margin: 0 0 0.75rem 0;
      font-size: 0.9rem;
      color: #4a5568;
    }

    .env-grid-small {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .env-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
    }

    .env-summary-label {
      color: #718096;
      font-weight: 500;
    }

    .env-summary-value {
      color: #2d3748;
      font-weight: 600;
    }

    .run-errors {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #fed7d7;
    }

    .run-errors h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
      color: #e53e3e;
    }

    .run-errors ul {
      margin: 0;
      padding-left: 1.2rem;
      font-size: 0.85rem;
      color: #c53030;
    }

    .run-errors li {
      margin-bottom: 0.25rem;
    }
  </style>`;
  }

  /**
   * Generate JavaScript functionality
   */
  private static getScripts(): string {
    return `<script>
    function toggleRun(element) {
      const content = element.nextElementSibling;
      const toggle = element.querySelector('.toggle');
      const isVisible = content.classList.contains('show');
      
      // Toggle current run (removed the code that closes other runs)
      content.classList.toggle('show', !isVisible);
      element.classList.toggle('active', !isVisible);
      toggle.classList.toggle('rotated', !isVisible);
      toggle.textContent = isVisible ? '+' : '×';
    }
    
    function toggleCollapsible(tableId) {
      const content = document.getElementById(tableId);
      const indicator = document.getElementById(tableId + '-indicator');
      const isCollapsed = content.classList.contains('collapsed');
      
      content.classList.toggle('collapsed', !isCollapsed);
      indicator.classList.toggle('collapsed', !isCollapsed);
      indicator.textContent = isCollapsed ? '▼' : '▶';
    }
    
    // Add smooth scrolling for better UX
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
          behavior: 'smooth'
        });
      });
    });
    
    // Add loading animation completion
    document.addEventListener('DOMContentLoaded', function() {
      document.body.style.opacity = '0';
      document.body.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        document.body.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        document.body.style.opacity = '1';
        document.body.style.transform = 'translateY(0)';
      }, 100);
    });
  </script>`;
  }

  /**
   * Generate header section
   */
  private static generateHeader(): string {
    return `<div class="header">
      <h1>🚀 Performance Test Report</h1>
      <p class="subtitle">Generated on ${new Date().toLocaleString()}</p>
    </div>
    <div class="content-area">`;
  }

  /**
   * Generate summary cards
   */
  private static generateSummaryCards(statistics: PerformanceStatistics): string {
    const successClass = statistics.overall.successRate >= 90 ? 'success-good' : 
                        statistics.overall.successRate >= 70 ? 'success-warning' : 'success-bad';
    
    return `<div class="cards">
      <div class="card">
        <h3>📊 Total Runs</h3>
        <div class="value">${statistics.overall.totalRuns}</div>
        <div class="label">Test executions completed</div>
      </div>
      <div class="card">
        <h3>✅ Success Rate</h3>
        <div class="value ${successClass}">${statistics.overall.successRate}%</div>
        <div class="label">${statistics.overall.successfulRuns} of ${statistics.overall.totalRuns} successful</div>
      </div>
    </div>`;
  }

  /**
   * Generate environment and network information section
   */
  private static generateEnvironmentInfo(metricsArr: PerfMetricsEnhanced[]): string {
    // Get network and region info from the first successful run
    const runWithInfo = metricsArr.find(m => m.networkMetrics && m.regionInfo) || metricsArr[0];
    
    if (!runWithInfo || (!runWithInfo.networkMetrics && !runWithInfo.regionInfo)) {
      return `<div class="section environment-section">
        <h2>🌐 Test Environment</h2>
        <div class="environment-info">
          <div class="info-message">
            <p>⚠️ Network and location information not available for this test run.</p>
          </div>
        </div>
      </div>`;
    }

    const networkInfo = runWithInfo.networkMetrics;
    const regionInfo = runWithInfo.regionInfo;

    return `<div class="section environment-section">
      <h2>🌐 Test Environment</h2>
      <div class="environment-grid">
        ${networkInfo ? `
        <div class="env-card network-card">
          <div class="env-header">
            <span class="env-icon">📶</span>
            <h3>Network Performance</h3>
          </div>
          <div class="env-details">
            <div class="env-item">
              <span class="env-label">Connection Type:</span>
              <span class="env-value">${networkInfo.effectiveType || 'Unknown'}</span>
            </div>
            <div class="env-item">
              <span class="env-label">Download Speed:</span>
              <span class="env-value">${networkInfo.downlink}Mbps</span>
            </div>
            <div class="env-item">
              <span class="env-label">Network Latency:</span>
              <span class="env-value">${networkInfo.rtt}ms</span>
            </div>
            ${networkInfo.connectionType && networkInfo.connectionType !== 'unknown' ? `
            <div class="env-item">
              <span class="env-label">Connection:</span>
              <span class="env-value">${networkInfo.connectionType}</span>
            </div>
            ` : ''}
            ${networkInfo.saveData ? `
            <div class="env-item">
              <span class="env-label">Data Saver:</span>
              <span class="env-value save-data">Enabled</span>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}
        
        ${regionInfo ? `
        <div class="env-card location-card">
          <div class="env-header">
            <span class="env-icon">🌍</span>
            <h3>Geographic Location</h3>
          </div>
          <div class="env-details">
            <div class="env-item">
              <span class="env-label">Country:</span>
              <span class="env-value">${regionInfo.country || 'Unknown'}</span>
            </div>
            <div class="env-item">
              <span class="env-label">Region:</span>
              <span class="env-value">${regionInfo.region || 'Unknown'}</span>
            </div>
            <div class="env-item">
              <span class="env-label">City:</span>
              <span class="env-value">${regionInfo.city || 'Unknown'}</span>
            </div>
            <div class="env-item">
              <span class="env-label">Timezone:</span>
              <span class="env-value">${regionInfo.timezone || 'Unknown'}</span>
            </div>
            ${regionInfo.isp && regionInfo.isp !== 'Unknown' ? `
            <div class="env-item">
              <span class="env-label">ISP:</span>
              <span class="env-value">${regionInfo.isp}</span>
            </div>
            ` : ''}
            ${regionInfo.ip && regionInfo.ip !== 'Unknown' ? `
            <div class="env-item">
              <span class="env-label">IP Address:</span>
              <span class="env-value">${regionInfo.ip}</span>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}
      </div>
    </div>`;
  }

  /**
   * Generate statistics table
   */
  private static generateStatisticsTable(statistics: PerformanceStatistics): string {
    return `<div class="section">
      <h2>📊 Statistical Analysis</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Mean</th>
            <th>Median</th>
            <th>Range (Min/Max)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Portal Login</strong></td>
            <td>${statistics.launch.mean}ms</td>
            <td>${statistics.launch.median}ms</td>
            <td>${statistics.launch.min} - ${statistics.launch.max}ms</td>
          </tr>
          <tr>
            <td><strong>Planning App Search</strong></td>
            <td>${statistics.search.mean}ms</td>
            <td>${statistics.search.median}ms</td>
            <td>${statistics.search.min} - ${statistics.search.max}ms</td>
          </tr>
          <tr>
            <td><strong>Planning App Launch</strong></td>
            <td>${statistics.select.mean}ms</td>
            <td>${statistics.select.median}ms</td>
            <td>${statistics.select.min} - ${statistics.select.max}ms</td>
          </tr>
          <tr>
            <td><strong>Process Launch</strong></td>
            <td>${statistics.processLaunch.mean}ms</td>
            <td>${statistics.processLaunch.median}ms</td>
            <td>${statistics.processLaunch.min} - ${statistics.processLaunch.max}ms</td>
          </tr>
          <tr>
            <td><strong>View Navigation</strong></td>
            <td>${statistics.viewNavigation.mean}ms</td>
            <td>${statistics.viewNavigation.median}ms</td>
            <td>${statistics.viewNavigation.min} - ${statistics.viewNavigation.max}ms</td>
          </tr>
        </tbody>
      </table>
    </div>`;
  }

  /**
   * Generate detailed runs section
   */
  private static generateDetailedRuns(metricsArr: PerfMetricsEnhanced[]): string {
    const runsHtml = metricsArr.map((metrics, index) => {
      const totalTime = metrics.launch + metrics.search + metrics.select + (metrics.processLaunch || 0) + (metrics.viewNavigation || 0);
      const runTime = new Date(metrics.timestamp);
      
      // Enhanced metrics display with network and region info
      const hasExtendedMetrics = metrics.appLoad || metrics.contextSelection || metrics.processLaunch;
      const hasNetworkInfo = metrics.networkMetrics;
      const hasRegionInfo = metrics.regionInfo;
      
      return `<div class="run-item">
        <div class="run-header" onclick="toggleRun(this)">
          <span><strong>Run ${index + 1}</strong> - ${runTime.toLocaleTimeString()} ${metrics.success ? '✅' : '❌'}</span>
          <span class="toggle">+</span>
        </div>
        <div class="run-content">
          <div class="metric-grid">
            <div class="metric-item">
              <div class="metric-label">Portal Login</div>
              <div class="metric-value">${metrics.launch}ms</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Planning App Search</div>
              <div class="metric-value">${metrics.search}ms</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Planning App Launch</div>
              <div class="metric-value">${metrics.select}ms</div>
            </div>
            ${hasExtendedMetrics ? `
            <div class="metric-item">
              <div class="metric-label">Process Launch</div>
              <div class="metric-value">${metrics.processLaunch || 0}ms</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">View Navigation</div>
              <div class="metric-value">${metrics.viewNavigation || 0}ms</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Total Journey</div>
              <div class="metric-value">${totalTime}ms</div>
            </div>
            ` : ''}
          </div>
          
          ${(hasNetworkInfo || hasRegionInfo) ? `
          <div class="run-environment">
            <h4>🌐 Environment Details</h4>
            <div class="env-grid-small">
              ${hasNetworkInfo ? `
              <div class="env-summary">
                <span class="env-summary-label">📶 Network:</span>
                <span class="env-summary-value">${metrics.networkMetrics!.effectiveType} (${metrics.networkMetrics!.downlink}Mbps, ${metrics.networkMetrics!.rtt}ms)</span>
              </div>
              ` : ''}
              ${hasRegionInfo ? `
              <div class="env-summary">
                <span class="env-summary-label">🌍 Location:</span>
                <span class="env-summary-value">${metrics.regionInfo!.city}, ${metrics.regionInfo!.country}</span>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}
          
          ${metrics.errors && metrics.errors.length > 0 ? `
          <div class="run-errors">
            <h4>❌ Errors</h4>
            <ul>
              ${metrics.errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
        </div>
      </div>`;
    }).join('');

    return `<div class="section">
      <h2>🔍 Individual Run Details</h2>
      <div class="run-details">
        ${runsHtml}
      </div>
    </div>
    </div>`; // Close content-area
  }

  /**
   * Generate API metrics section
   */
  private static generateApiMetricsSection(metricsArr: PerfMetricsEnhanced[]): string {
    // Aggregate API metrics from all runs that have apiMetrics
    const runsWithApiMetrics = metricsArr.filter(metrics => metrics.apiMetrics);
    
    if (runsWithApiMetrics.length === 0) {
      return `<div class="section">
        <h2>🌐 API Performance Overview</h2>
        <div class="no-data">
          <p>No API metrics collected during this test run.</p>
        </div>
      </div>`;
    }

    // Collect aggregated metrics from all runs
    const allApiCalls: any[] = [];
    let totalCalls = 0;
    let totalDuration = 0;
    let failedCalls = 0;

    runsWithApiMetrics.forEach(metrics => {
      if (metrics.apiMetrics) {
        totalCalls += metrics.apiMetrics.totalApiCalls;
        totalDuration += metrics.apiMetrics.totalApiDuration;
        failedCalls += metrics.apiMetrics.failedApiCalls;
        
        // Collect all individual API calls from all categories for proper aggregation
        Object.values(metrics.apiMetrics.apiCallsByCategory).forEach(categoryApis => {
          allApiCalls.push(...categoryApis);
        });
      }
    });

    // Properly aggregate metrics by endpoint across ALL runs
    const endpointMap = new Map<string, any>();
    
    allApiCalls.forEach(call => {
      const key = `${call.method} ${call.url}`;
      
      if (!endpointMap.has(key)) {
        endpointMap.set(key, {
          url: call.url,
          method: call.method,
          count: 0,
          totalDuration: 0,
          minDuration: call.duration,
          maxDuration: call.duration,
          totalSize: 0,
          statuses: {},
          category: call.category,
          allCalls: []
        });
      }
      
      const existing = endpointMap.get(key)!;
      existing.count++;
      existing.totalDuration += call.duration;
      existing.minDuration = Math.min(existing.minDuration, call.duration);
      existing.maxDuration = Math.max(existing.maxDuration, call.duration);
      existing.totalSize += call.size;
      existing.allCalls.push(call);
      
      // Count status codes properly
      if (!existing.statuses[call.status]) {
        existing.statuses[call.status] = 0;
      }
      existing.statuses[call.status]++;
    });

    // Calculate final averages and filter for slow APIs (>0.5 second)
    const slowApiMetrics: any[] = [];
    
    endpointMap.forEach(aggregated => {
      aggregated.avgDuration = Math.round(aggregated.totalDuration / aggregated.count);
      aggregated.avgSize = Math.round(aggregated.totalSize / aggregated.count);
      
      // Only include APIs with >0.5 second average response time
      if (aggregated.avgDuration > 500) {
        slowApiMetrics.push(aggregated);
      }
    });

    // Sort by average duration (descending)
    slowApiMetrics.sort((a, b) => b.avgDuration - a.avgDuration);

    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
    const successRate = totalCalls > 0 ? ((totalCalls - failedCalls) / totalCalls * 100).toFixed(1) : '100.0';
    
    // Generate category breakdown using direct API calls
    const categoryStats: Record<string, { count: number; totalDuration: number; }> = {};
    allApiCalls.forEach(api => {
      const category = api.category || 'other';
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, totalDuration: 0 };
      }
      categoryStats[category].count++;
      categoryStats[category].totalDuration += api.duration;
    });

    const categoryHtml = Object.entries(categoryStats)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([category, stats]) => {
        const avgCategoryDuration = stats.count > 0 ? stats.totalDuration / stats.count : 0;
        const percentage = totalCalls > 0 ? ((stats.count / totalCalls) * 100).toFixed(1) : '0.0';
        return `
          <div class="api-category">
            <div class="category-name">${category}</div>
            <div class="category-stats">
              <span class="count">${stats.count} calls (${percentage}%)</span>
              <span class="avg-duration">avg: ${avgCategoryDuration.toFixed(0)}ms</span>
            </div>
          </div>
        `;
      }).join('');

    // Generate slow APIs collapsible table
    const slowApisTableHtml = slowApiMetrics.length > 0 ? `
      <div class="slow-apis-section">
        <div class="collapsible-header" onclick="toggleCollapsible('slow-apis-table')">
          <h3>🐌 Slow API Performance (>0.5 second) - ${slowApiMetrics.length} APIs</h3>
          <span class="collapse-indicator" id="slow-apis-table-indicator">▼</span>
        </div>
        <div class="collapsible-content" id="slow-apis-table">
          <div class="slow-apis-table-container">
            <table class="slow-apis-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Endpoint</th>
                  <th>Min</th>
                  <th>Avg</th>
                  <th>Max</th>
                  <th>Calls</th>
                  <th>Avg Size</th>
                  <th>Status</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                ${slowApiMetrics.map((api, index) => {
                  const statusEntries = Object.entries(api.statuses || {});
                  const mostCommonStatus = statusEntries.length > 0 
                    ? statusEntries.reduce((prev: [string, number], curr: [string, number]) => curr[1] > prev[1] ? curr : prev)[0]
                    : '200'; // fallback status
                  const statusClass = Math.floor(parseInt(mostCommonStatus) / 100);
                  
                  return `
                    <tr class="api-row ${api.avgDuration > 2000 ? 'critical' : api.avgDuration > 1500 ? 'warning' : 'normal'}">
                      <td class="method">
                        <span class="method-badge method-${api.method.toLowerCase()}">${api.method}</span>
                      </td>
                      <td class="endpoint">
                        <div class="endpoint-url" title="${api.url}">
                          ${this.truncateUrl(api.url, 60)}
                        </div>
                      </td>
                      <td class="duration min-duration">
                        <span class="duration-value">${api.minDuration}ms</span>
                      </td>
                      <td class="duration avg-duration">
                        <span class="duration-value highlight">${api.avgDuration}ms</span>
                      </td>
                      <td class="duration max-duration">
                        <span class="duration-value">${api.maxDuration}ms</span>
                      </td>
                      <td class="count">
                        <span class="count-badge">${api.count}</span>
                      </td>
                      <td class="size">
                        <span class="size-value">${this.formatFileSize(api.avgSize)}</span>
                      </td>
                      <td class="status">
                        <span class="status-badge status-${statusClass}xx" title="${statusEntries.map(([status, count]) => `${status}: ${count} times`).join(', ')}">${mostCommonStatus}</span>
                        ${statusEntries.length > 1 ? `<span class="status-count">+${statusEntries.length - 1}</span>` : ''}
                      </td>
                      <td class="category">
                        <span class="category-badge">${api.category || 'other'}</span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ` : `
      <div class="slow-apis-section">
        <h3>🚀 All APIs Performing Well!</h3>
        <div class="no-slow-apis">
          <p>No APIs found with response times greater than 1 second.</p>
        </div>
      </div>
    `;

    return `<div class="section">
      <h2>🌐 API Performance Overview</h2>
      
      <!-- API Metrics Cards -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon">📊</div>
          <div class="metric-details">
            <div class="metric-value">${totalCalls}</div>
            <div class="metric-label">Total API Calls</div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon">⏱️</div>
          <div class="metric-details">
            <div class="metric-value">${avgDuration.toFixed(0)}ms</div>
            <div class="metric-label">Average Duration</div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon">🐌</div>
          <div class="metric-details">
            <div class="metric-value">${slowApiMetrics.length}</div>
            <div class="metric-label">Slow APIs (>0.5s)</div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon">✅</div>
          <div class="metric-details">
            <div class="metric-value">${successRate}%</div>
            <div class="metric-label">Success Rate</div>
          </div>
        </div>
      </div>

      <!-- API Categories -->
      <div class="api-categories">
        <h3>API Categories Breakdown</h3>
        ${categoryHtml}
      </div>

      ${slowApisTableHtml}
    </div>`;
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Truncate URL for display
   */
  private static truncateUrl(url: string, maxLength: number = 60): string {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  }
}