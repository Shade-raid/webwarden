/**
 * UIController - Enhanced UI management with real-time updates
 */
export class UIController {
  constructor(crawler, searchEngine, logger, exportManager) {
    this.crawler = crawler;
    this.searchEngine = searchEngine;
    this.logger = logger;
    this.exportManager = exportManager;
    
    this.elements = this.initializeElements();
    this.bindEvents();
    this.updateInterval = null;
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    return {
      startUrl: document.getElementById('startUrl'),
      depth: document.getElementById('depth'),
      maxPages: document.getElementById('maxPages'),
      crawlMode: document.getElementById('crawlMode'),
      startBtn: document.getElementById('startBtn'),
      stopBtn: document.getElementById('stopBtn'),
      searchBox: document.getElementById('searchBox'),
      status: document.getElementById('status'),
      results: document.getElementById('results'),
      progressFill: document.getElementById('progressFill'),
      exportButtons: document.getElementById('exportButtons'),
      crawledCount: document.getElementById('crawledCount'),
      queueCount: document.getElementById('queueCount'),
      errorsCount: document.getElementById('errorsCount'),
      elapsedTime: document.getElementById('elapsedTime')
    };
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    this.elements.startBtn.addEventListener('click', () => this.startCrawl());
    this.elements.stopBtn.addEventListener('click', () => this.stopCrawl());
    this.elements.searchBox.addEventListener('input', () => this.performSearch());
    this.elements.searchBox.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.performSearch();
    });
    
    // Export button events
    document.getElementById('exportCSV').addEventListener('click', () => this.exportData('csv'));
    document.getElementById('exportJSON').addEventListener('click', () => this.exportData('json'));
    document.getElementById('exportXML').addEventListener('click', () => this.exportData('xml'));
    document.getElementById('exportReport').addEventListener('click', () => this.exportData('txt'));
  }

  /**
   * Start crawling with enhanced validation
   */
  async startCrawl() {
    const startUrl = this.elements.startUrl.value.trim();
    const depth = parseInt(this.elements.depth.value);
    const maxPages = parseInt(this.elements.maxPages.value);
    
    // Enhanced validation
    if (!this.validateInputs(startUrl, depth, maxPages)) return;
    
    this.setUIState('crawling');
    this.logger.info('Starting crawl', { startUrl, depth, maxPages });
    
    try {
      await this.crawler.startCrawl(
        startUrl,
        (stats) => this.updateProgress(stats),
        (results) => this.onCrawlComplete(results)
      );
    } catch (error) {
      this.logger.error('Crawl failed', error);
      this.setStatus('Crawl failed: ' + error.message, 'error');
      this.setUIState('ready');
    }
  }

  /**
   * Stop the current crawl
   */
  stopCrawl() {
    this.crawler.stopCrawl();
    this.logger.info('Crawl stopped by user');
    this.setUIState('ready');
  }

  /**
   * Validate user inputs
   */
  validateInputs(startUrl, depth, maxPages) {
    if (!startUrl) {
      this.setStatus('Please enter a start URL', 'error');
      this.elements.startUrl.focus();
      return false;
    }
    
    if (!this.crawler.isValidUrl(startUrl)) {
      this.setStatus('Please enter a valid URL (e.g., https://example.com)', 'error');
      this.elements.startUrl.focus();
      return false;
    }
    
    if (isNaN(depth) || depth < 1 || depth > 10) {
      this.setStatus('Depth must be between 1 and 10', 'error');
      this.elements.depth.focus();
      return false;
    }
    
    if (isNaN(maxPages) || maxPages < 1 || maxPages > 1000) {
      this.setStatus('Max pages must be between 1 and 1000', 'error');
      this.elements.maxPages.focus();
      return false;
    }
    
    return true;
  }

  /**
   * Update UI state based on crawl status
   */
  setUIState(state) {
    switch (state) {
      case 'crawling':
        this.elements.startBtn.disabled = true;
        this.elements.stopBtn.disabled = false;
        this.elements.exportButtons.style.display = 'none';
        this.startProgressUpdates();
        break;
      case 'ready':
        this.elements.startBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        this.stopProgressUpdates();
        break;
      case 'complete':
        this.elements.startBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        this.elements.exportButtons.style.display = 'flex';
        this.stopProgressUpdates();
        break;
    }
  }

  /**
   * Update progress indicators
   */
  updateProgress(stats) {
    this.elements.crawledCount.textContent = stats.crawled;
    this.elements.queueCount.textContent = stats.queued;
    this.elements.errorsCount.textContent = stats.errors;
    this.elements.elapsedTime.textContent = `${stats.elapsed}s`;
    
    // Update progress bar
    const progress = stats.crawled / this.crawler.config.maxPages * 100;
    this.elements.progressFill.style.width = `${Math.min(progress, 100)}%`;
    
    // Update status with detailed info
    this.setStatus(
      `Crawling... ${stats.crawled} pages indexed, ${stats.queued} in queue, ${stats.activeRequests} active requests`,
      'crawling'
    );
  }

  /**
   * Handle crawl completion
   */
  onCrawlComplete(results) {
    this.searchEngine.updateIndex(results.pages);
    this.displayResults(results.pages);
    this.setUIState('complete');
    
    const message = `Crawl complete! Indexed ${results.pages.length} pages with ${results.errors.length} errors in ${results.stats.elapsed}s`;
    this.setStatus(message, 'complete');
    this.logger.info('Crawl completed', results.stats);
  }

  /**
   * Perform search with enhanced features
   */
  performSearch() {
    const query = this.elements.searchBox.value.trim();
    
    if (!query) {
      this.displayResults(this.searchEngine.index);
      return;
    }
    
    const results = this.searchEngine.search(query);
    this.displayResults(results, query);
    this.logger.debug('Search performed', { query, resultCount: results.length });
  }

  /**
   * Display search results with highlighting
   */
  displayResults(results, query = '') {
    this.elements.results.innerHTML = '';
    
    if (results.length === 0) {
      this.elements.results.innerHTML = `
        <div style="text-align: center; color: #666; padding: 2rem;">
          ${query ? `No results found for "${query}"` : 'No pages crawled yet'}
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();
    
    results.forEach(page => {
      const div = document.createElement('div');
      div.className = 'result';
      
      let highlightedTitle = this.escapeHtml(page.title);
      let highlightedDesc = this.escapeHtml(page.description);
      
      if (query) {
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        highlightedTitle = highlightedTitle.replace(regex, '<mark>$1</mark>');
        highlightedDesc = highlightedDesc.replace(regex, '<mark>$1</mark>');
      }
      
      div.innerHTML = `
        <a href="${this.escapeHtml(page.url)}" target="_blank" rel="noopener">${highlightedTitle}</a>
        <div class="url">${this.escapeHtml(page.url)}</div>
        <div class="snippet">${highlightedDesc}</div>
        <div class="meta-info">
          <span>📊 ${page.linkCount || 0} links</span>
          <span>🖼️ ${page.imageCount || 0} images</span>
          <span>📝 ${page.wordCount || 0} words</span>
          <span>🔗 Depth ${page.depth || 0}</span>
          <span>⏰ ${new Date(page.crawledAt).toLocaleString()}</span>
          ${page.referrer ? `<span>👈 From: ${this.truncateUrl(page.referrer)}</span>` : ''}
        </div>
      `;
      
      fragment.appendChild(div);
    });
    
    this.elements.results.appendChild(fragment);
  }

  /**
   * Export data in specified format
   */
  exportData(format) {
    if (this.searchEngine.index.length === 0) {
      this.setStatus('No data to export', 'error');
      return;
    }
    
    try {
      const data = this.crawler.getResults();
      this.exportManager.export(data, format);
      this.logger.info('Data exported', { format, pageCount: data.pages.length });
    } catch (error) {
      this.setStatus('Export failed: ' + error.message, 'error');
      this.logger.error('Export failed', error);
    }
  }

  /**
   * Set status message with styling
   */
  setStatus(message, type = '') {
    this.elements.status.textContent = message;
    this.elements.status.className = type ? `status-${type}` : '';
  }

  /**
   * Start real-time progress updates
   */
  startProgressUpdates() {
    this.updateInterval = setInterval(() => {
      if (!this.crawler.stopFlag) {
        this.updateProgress(this.crawler.getStats());
      }
    }, 500);
  }

  /**
   * Stop progress updates
   */
  stopProgressUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Utility methods
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  truncateUrl(url, maxLength = 50) {
    return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
  }
}