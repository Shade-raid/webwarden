/**
 * Test suite for CrawlerEngine
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CrawlerEngine } from '../crawler/CrawlerEngine.js';

describe('CrawlerEngine', () => {
  let crawler;

  beforeEach(() => {
    crawler = new CrawlerEngine({
      maxConcurrency: 2,
      requestDelay: 100,
      timeout: 5000,
      maxRetries: 1
    });
  });

  describe('URL validation', () => {
    it('should validate HTTP URLs correctly', () => {
      expect(crawler.isValidUrl('https://example.com')).toBe(true);
      expect(crawler.isValidUrl('http://example.com')).toBe(true);
      expect(crawler.isValidUrl('ftp://example.com')).toBe(false);
      expect(crawler.isValidUrl('invalid-url')).toBe(false);
      expect(crawler.isValidUrl('')).toBe(false);
    });
  });

  describe('Domain checking', () => {
    it('should correctly identify same domain URLs', () => {
      expect(crawler.isSameDomain('https://example.com/page1', 'https://example.com/page2')).toBe(true);
      expect(crawler.isSameDomain('https://example.com', 'https://other.com')).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should use default configuration when none provided', () => {
      const defaultCrawler = new CrawlerEngine();
      expect(defaultCrawler.config.maxConcurrency).toBe(3);
      expect(defaultCrawler.config.requestDelay).toBe(1000);
    });

    it('should merge custom configuration with defaults', () => {
      const customCrawler = new CrawlerEngine({ maxConcurrency: 5 });
      expect(customCrawler.config.maxConcurrency).toBe(5);
      expect(customCrawler.config.requestDelay).toBe(1000); // Should keep default
    });
  });

  describe('Robots.txt parsing', () => {
    it('should parse robots.txt correctly', () => {
      const robotsContent = `
        User-agent: *
        Disallow: /admin
        Allow: /public
      `;
      
      expect(crawler.parseRobotsTxt(robotsContent, '/admin/page')).toBe(false);
      expect(crawler.parseRobotsTxt(robotsContent, '/public/page')).toBe(true);
      expect(crawler.parseRobotsTxt(robotsContent, '/other/page')).toBe(true);
    });
  });

  describe('Page data extraction', () => {
    it('should extract page data correctly', () => {
      const html = `
        <html>
          <head>
            <title>Test Page</title>
            <meta name="description" content="Test description">
            <meta name="keywords" content="test, page">
          </head>
          <body>
            <h1>Main Heading</h1>
            <p>Some content here</p>
            <a href="/link1">Link 1</a>
            <img src="image.jpg" alt="Test">
          </body>
        </html>
      `;
      
      const pageData = crawler.parsePageData('https://example.com', html, 0, null);
      
      expect(pageData.title).toBe('Test Page');
      expect(pageData.description).toBe('Test description');
      expect(pageData.keywords).toBe('test, page');
      expect(pageData.linkCount).toBe(1);
      expect(pageData.imageCount).toBe(1);
    });
  });
});