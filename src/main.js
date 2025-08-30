/**
 * WebWarden Crawler 2.0 - Main Application Entry Point
 * Enhanced with performance optimizations, robust error handling, and modular architecture
 */

import { CrawlerEngine } from './crawler/CrawlerEngine.js';
import { SearchEngine } from './search/SearchEngine.js';
import { Logger } from './utils/Logger.js';
import { ConfigManager } from './utils/ConfigManager.js';
import { ExportManager } from './export/ExportManager.js';
import { UIController } from './ui/UIController.js';

/**
 * WebWarden Application Class
 */
class WebWardenApp {
  constructor() {
    this.logger = new Logger('INFO');
    this.configManager = new ConfigManager();
    this.exportManager = new ExportManager();
    this.searchEngine = new SearchEngine();
    
    // Initialize crawler with configuration
    this.crawler = new CrawlerEngine(this.configManager.getConfig());
    
    // Initialize UI controller
    this.uiController = new UIController(
      this.crawler,
      this.searchEngine,
      this.logger,
      this.exportManager
    );
    
    this.initializeApp();
  }

  /**
   * Initialize the application
   */
  initializeApp() {
    this.logger.info('WebWarden Crawler 2.0 initialized');
    this.setupGlobalErrorHandling();
    this.setupPerformanceMonitoring();
    this.addAdvancedFeatures();
  }

  /**
   * Setup global error handling
   */
  setupGlobalErrorHandling() {
    window.addEventListener('error', (event) => {
      this.logger.error('Global error caught', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.logger.error('Unhandled promise rejection', {
        reason: event.reason
      });
    });
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          this.logger.warn('High memory usage detected', {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
            limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
          });
        }
      }, 30000);
    }
  }

  /**
   * Add advanced features and keyboard shortcuts
   */
  addAdvancedFeatures() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'Enter':
            e.preventDefault();
            if (!this.crawler.stopFlag) {
              this.uiController.startCrawl();
            }
            break;
          case 'Escape':
            e.preventDefault();
            this.uiController.stopCrawl();
            break;
          case 'f':
            e.preventDefault();
            this.uiController.elements.searchBox.focus();
            break;
        }
      }
    });

    // Auto-save search queries
    let searchTimeout;
    this.uiController.elements.searchBox.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const query = this.uiController.elements.searchBox.value;
        if (query) {
          localStorage.setItem('webwarden-last-search', query);
        }
      }, 1000);
    });

    // Restore last search on load
    const lastSearch = localStorage.getItem('webwarden-last-search');
    if (lastSearch) {
      this.uiController.elements.searchBox.value = lastSearch;
    }

    // Add configuration panel toggle
    this.addConfigurationPanel();
  }

  /**
   * Add configuration panel for advanced settings
   */
  addConfigurationPanel() {
    const configButton = document.createElement('button');
    configButton.textContent = '⚙️ Settings';
    configButton.className = 'export-btn';
    configButton.style.position = 'fixed';
    configButton.style.top = '20px';
    configButton.style.right = '20px';
    configButton.style.zIndex = '1000';
    
    configButton.addEventListener('click', () => this.showConfigPanel());
    document.body.appendChild(configButton);
  }

  /**
   * Show configuration panel
   */
  showConfigPanel() {
    const config = this.configManager.getConfig();
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; border: 3px solid #8B4513; border-radius: 5px;
      padding: 2rem; max-width: 500px; width: 90%; max-height: 80vh;
      overflow-y: auto; z-index: 1001; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    panel.innerHTML = `
      <h3 style="margin-top: 0; color: #8B4513;">WebWarden Configuration</h3>
      <div style="margin-bottom: 1rem;">
        <label>Max Concurrency: <input type="number" id="configConcurrency" value="${config.maxConcurrency}" min="1" max="10"></label>
      </div>
      <div style="margin-bottom: 1rem;">
        <label>Request Delay (ms): <input type="number" id="configDelay" value="${config.requestDelay}" min="100" max="10000"></label>
      </div>
      <div style="margin-bottom: 1rem;">
        <label>Timeout (ms): <input type="number" id="configTimeout" value="${config.timeout}" min="1000" max="60000"></label>
      </div>
      <div style="margin-bottom: 1rem;">
        <label>Max Retries: <input type="number" id="configRetries" value="${config.maxRetries}" min="0" max="5"></label>
      </div>
      <div style="margin-bottom: 1rem;">
        <label><input type="checkbox" id="configRobots" ${config.respectRobots ? 'checked' : ''}> Respect robots.txt</label>
      </div>
      <div style="margin-bottom: 1rem;">
        <label>User Agent: <input type="text" id="configUserAgent" value="${config.userAgent}" style="width: 100%;"></label>
      </div>
      <div style="display: flex; gap: 1rem; justify-content: flex-end;">
        <button onclick="this.parentElement.parentElement.remove()" style="background: #999;">Cancel</button>
        <button id="saveConfig" style="background: #CD853F; color: white; border: 2px solid #8B4513;">Save</button>
      </div>
    `;
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); z-index: 1000;
    `;
    backdrop.addEventListener('click', () => {
      document.body.removeChild(backdrop);
    });
    
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    
    // Save configuration
    panel.querySelector('#saveConfig').addEventListener('click', () => {
      const newConfig = {
        maxConcurrency: parseInt(panel.querySelector('#configConcurrency').value),
        requestDelay: parseInt(panel.querySelector('#configDelay').value),
        timeout: parseInt(panel.querySelector('#configTimeout').value),
        maxRetries: parseInt(panel.querySelector('#configRetries').value),
        respectRobots: panel.querySelector('#configRobots').checked,
        userAgent: panel.querySelector('#configUserAgent').value
      };
      
      this.configManager.updateConfig(newConfig);
      this.crawler = new CrawlerEngine(this.configManager.getConfig());
      this.logger.info('Configuration updated', newConfig);
      document.body.removeChild(backdrop);
    });
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.webWardenApp = new WebWardenApp();
});

// Global functions for backward compatibility
window.startCrawl = () => window.webWardenApp?.uiController.startCrawl();
window.stopCrawl = () => window.webWardenApp?.uiController.stopCrawl();
window.searchIndex = () => window.webWardenApp?.uiController.performSearch();
window.exportToCSV = () => window.webWardenApp?.uiController.exportData('csv');
window.exportToJSON = () => window.webWardenApp?.uiController.exportData('json');
window.generateReport = () => window.webWardenApp?.uiController.exportData('txt');