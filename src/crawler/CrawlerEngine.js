/**
 * CrawlerEngine - Core crawling logic with performance optimizations
 * Handles concurrent processing, rate limiting, and resource management
 */
export class CrawlerEngine {
  constructor(config = {}) {
    this.config = {
      maxConcurrency: config.maxConcurrency || 3,
      requestDelay: config.requestDelay || 1000,
      timeout: config.timeout || 10000,
      maxRetries: config.maxRetries || 2,
      respectRobots: config.respectRobots !== false,
      userAgent: config.userAgent || 'WebWarden Crawler 2.0',
      maxPages: config.maxPages || 100,
      maxDepth: config.maxDepth || 3,
      ...config
    };
    
    this.visited = new Set();
    this.queue = [];
    this.index = [];
    this.errors = [];
    this.robotsCache = new Map();
    this.activeRequests = 0;
    this.stopFlag = false;
    this.controller = null;
    this.stats = {
      startTime: null,
      processed: 0,
      failed: 0,
      skipped: 0
    };
    
    // Rate limiting
    this.lastRequestTime = 0;
    this.requestQueue = [];
    this.processingQueue = false;
  }

  /**
   * Start crawling from the given URL
   */
  async startCrawl(startUrl, onProgress = () => {}, onComplete = () => {}) {
    this.reset();
    this.controller = new AbortController();
    this.stats.startTime = Date.now();
    
    if (!this.isValidUrl(startUrl)) {
      throw new Error('Invalid start URL provided');
    }

    this.queue.push({ url: startUrl, depth: 0, referrer: null });
    this.onProgress = onProgress;
    this.onComplete = onComplete;

    try {
      await this.processCrawlQueue();
      this.onComplete(this.getResults());
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Crawl failed:', error);
        throw error;
      }
    }
  }

  /**
   * Stop the current crawl operation
   */
  stopCrawl() {
    this.stopFlag = true;
    this.controller?.abort();
  }

  /**
   * Process the crawl queue with concurrency control
   */
  async processCrawlQueue() {
    const workers = [];
    
    for (let i = 0; i < this.config.maxConcurrency; i++) {
      workers.push(this.crawlWorker());
    }
    
    await Promise.all(workers);
  }

  /**
   * Individual worker for processing crawl queue
   */
  async crawlWorker() {
    while (!this.stopFlag && this.queue.length > 0 && this.index.length < this.config.maxPages) {
      const item = this.queue.shift();
      if (!item || this.visited.has(item.url)) continue;

      try {
        await this.rateLimitedRequest(async () => {
          const pageData = await this.crawlPage(item.url, item.depth, item.referrer);
          if (pageData) {
            this.index.push(pageData);
            this.stats.processed++;
            
            // Extract and queue new links if within depth limit
            if (item.depth < this.config.maxDepth) {
              const newLinks = await this.extractLinks(item.url, item.depth + 1);
              this.queue.push(...newLinks);
            }
          }
        });
      } catch (error) {
        this.handleCrawlError(item.url, error);
      }
      
      this.onProgress(this.getStats());
      
      // Small delay between items for the same worker
      await this.delay(100);
    }
  }

  /**
   * Rate-limited request execution
   */
  async rateLimitedRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processRequestQueue();
    });
  }

  /**
   * Process the rate-limited request queue
   */
  async processRequestQueue() {
    if (this.processingQueue || this.requestQueue.length === 0) return;
    
    this.processingQueue = true;
    
    while (this.requestQueue.length > 0 && !this.stopFlag) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.config.requestDelay) {
        await this.delay(this.config.requestDelay - timeSinceLastRequest);
      }
      
      const { requestFn, resolve, reject } = this.requestQueue.shift();
      this.lastRequestTime = Date.now();
      
      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
    
    this.processingQueue = false;
  }

  /**
   * Crawl a single page with retry logic
   */
  async crawlPage(url, depth, referrer, retryCount = 0) {
    if (this.visited.has(url)) return null;
    
    // Check robots.txt compliance
    if (this.config.respectRobots && !(await this.isAllowedByRobots(url))) {
      this.stats.skipped++;
      return null;
    }
    
    this.visited.add(url);
    this.activeRequests++;

    try {
      const response = await this.fetchWithTimeout(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      const html = await response.text();
      const pageData = this.parsePageData(url, html, depth, referrer);
      
      return pageData;
      
    } catch (error) {
      if (retryCount < this.config.maxRetries && error.name !== 'AbortError') {
        await this.delay(1000 * (retryCount + 1)); // Exponential backoff
        return this.crawlPage(url, depth, referrer, retryCount + 1);
      }
      throw error;
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * Fetch with timeout and abort signal
   */
  async fetchWithTimeout(url) {
    const timeoutId = setTimeout(() => {
      this.controller.abort();
    }, this.config.timeout);

    try {
      const response = await fetch(url, {
        signal: this.controller.signal,
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Parse page data from HTML content
   */
  parsePageData(url, html, depth, referrer) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    // Extract metadata
    const title = this.extractTitle(doc, url);
    const description = this.extractDescription(doc);
    const keywords = this.extractKeywords(doc);
    const headings = this.extractHeadings(doc);
    const links = doc.querySelectorAll('a[href]').length;
    const images = doc.querySelectorAll('img').length;
    const wordCount = this.getWordCount(doc.body?.textContent || '');
    
    return {
      url,
      title,
      description,
      keywords,
      headings,
      linkCount: links,
      imageCount: images,
      wordCount,
      depth,
      referrer,
      crawledAt: new Date().toISOString(),
      contentLength: html.length,
      loadTime: Date.now() - this.stats.startTime
    };
  }

  /**
   * Extract and validate links from a page
   */
  async extractLinks(url, nextDepth) {
    try {
      const response = await this.fetchWithTimeout(url);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const baseUrl = new URL(url);
      
      const links = [...doc.querySelectorAll('a[href]')]
        .map(a => {
          try {
            const href = a.getAttribute('href');
            if (!href) return null;
            
            const absoluteUrl = new URL(href, url).href;
            return {
              url: absoluteUrl,
              depth: nextDepth,
              referrer: url,
              anchorText: a.textContent?.trim() || ''
            };
          } catch {
            return null;
          }
        })
        .filter(link => link && 
          this.isValidUrl(link.url) && 
          !this.visited.has(link.url) &&
          this.isSameDomain(link.url, baseUrl.href)
        )
        .slice(0, 20); // Limit links per page
      
      return links;
    } catch (error) {
      console.warn(`Failed to extract links from ${url}:`, error.message);
      return [];
    }
  }

  /**
   * Check robots.txt compliance
   */
  async isAllowedByRobots(url) {
    try {
      const urlObj = new URL(url);
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
      
      if (this.robotsCache.has(robotsUrl)) {
        return this.robotsCache.get(robotsUrl);
      }
      
      const response = await fetch(robotsUrl, {
        signal: this.controller.signal,
        headers: { 'User-Agent': this.config.userAgent }
      });
      
      if (!response.ok) {
        this.robotsCache.set(robotsUrl, true); // Allow if robots.txt not found
        return true;
      }
      
      const robotsText = await response.text();
      const isAllowed = this.parseRobotsTxt(robotsText, urlObj.pathname);
      this.robotsCache.set(robotsUrl, isAllowed);
      
      return isAllowed;
    } catch {
      return true; // Allow if robots.txt check fails
    }
  }

  /**
   * Parse robots.txt content
   */
  parseRobotsTxt(robotsText, pathname) {
    const lines = robotsText.split('\n').map(line => line.trim());
    let userAgentMatch = false;
    let allowed = true;
    
    for (const line of lines) {
      if (line.toLowerCase().startsWith('user-agent:')) {
        const agent = line.substring(11).trim();
        userAgentMatch = agent === '*' || this.config.userAgent.includes(agent);
      } else if (userAgentMatch && line.toLowerCase().startsWith('disallow:')) {
        const disallowPath = line.substring(9).trim();
        if (disallowPath && pathname.startsWith(disallowPath)) {
          allowed = false;
        }
      } else if (userAgentMatch && line.toLowerCase().startsWith('allow:')) {
        const allowPath = line.substring(6).trim();
        if (allowPath && pathname.startsWith(allowPath)) {
          allowed = true;
        }
      }
    }
    
    return allowed;
  }

  /**
   * Utility methods
   */
  extractTitle(doc, url) {
    return doc.querySelector('title')?.textContent?.trim() || 
           doc.querySelector('h1')?.textContent?.trim() || 
           url;
  }

  extractDescription(doc) {
    const metaDesc = doc.querySelector('meta[name="description"]')?.content;
    if (metaDesc) return metaDesc.trim();
    
    const firstP = doc.querySelector('p')?.textContent;
    if (firstP) return firstP.trim().substring(0, 300);
    
    const bodyText = doc.body?.textContent || '';
    return bodyText.trim().substring(0, 300).replace(/\s+/g, ' ');
  }

  extractKeywords(doc) {
    return doc.querySelector('meta[name="keywords"]')?.content?.trim() || '';
  }

  extractHeadings(doc) {
    const headings = {};
    ['h1', 'h2', 'h3'].forEach(tag => {
      const elements = [...doc.querySelectorAll(tag)];
      headings[tag] = elements.map(el => el.textContent?.trim()).filter(Boolean);
    });
    return headings;
  }

  getWordCount(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  isSameDomain(url1, url2) {
    try {
      return new URL(url1).hostname === new URL(url2).hostname;
    } catch {
      return false;
    }
  }

  handleCrawlError(url, error) {
    this.stats.failed++;
    this.errors.push({
      url,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    console.warn(`Crawl error for ${url}:`, error.message);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  reset() {
    this.visited.clear();
    this.queue = [];
    this.index = [];
    this.errors = [];
    this.stopFlag = false;
    this.activeRequests = 0;
    this.stats = {
      startTime: null,
      processed: 0,
      failed: 0,
      skipped: 0
    };
  }

  getStats() {
    const elapsed = this.stats.startTime ? Date.now() - this.stats.startTime : 0;
    return {
      crawled: this.index.length,
      queued: this.queue.length,
      errors: this.stats.failed,
      skipped: this.stats.skipped,
      elapsed: Math.floor(elapsed / 1000),
      activeRequests: this.activeRequests,
      visited: this.visited.size
    };
  }

  getResults() {
    return {
      pages: this.index,
      errors: this.errors,
      stats: this.getStats()
    };
  }
}