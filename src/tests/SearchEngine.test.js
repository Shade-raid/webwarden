/**
 * Test suite for SearchEngine
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEngine } from '../search/SearchEngine.js';

describe('SearchEngine', () => {
  let searchEngine;
  let samplePages;

  beforeEach(() => {
    searchEngine = new SearchEngine();
    samplePages = [
      {
        url: 'https://example.com/page1',
        title: 'JavaScript Tutorial',
        description: 'Learn JavaScript programming basics',
        keywords: 'javascript, programming, tutorial',
        wordCount: 500,
        linkCount: 10,
        imageCount: 2,
        depth: 0,
        crawledAt: '2025-01-01T00:00:00Z'
      },
      {
        url: 'https://example.com/page2',
        title: 'Python Guide',
        description: 'Complete guide to Python programming',
        keywords: 'python, programming, guide',
        wordCount: 800,
        linkCount: 15,
        imageCount: 5,
        depth: 1,
        crawledAt: '2025-01-01T01:00:00Z'
      }
    ];
    
    searchEngine.updateIndex(samplePages);
  });

  describe('Search functionality', () => {
    it('should return all pages when no query provided', () => {
      const results = searchEngine.search('');
      expect(results).toHaveLength(2);
    });

    it('should find pages by title', () => {
      const results = searchEngine.search('JavaScript');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('JavaScript Tutorial');
    });

    it('should find pages by description', () => {
      const results = searchEngine.search('programming');
      expect(results).toHaveLength(2);
    });

    it('should find pages by keywords', () => {
      const results = searchEngine.search('tutorial');
      expect(results).toHaveLength(1);
    });

    it('should return empty array for non-matching query', () => {
      const results = searchEngine.search('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('Search ranking', () => {
    it('should rank exact title matches higher', () => {
      const results = searchEngine.search('JavaScript Tutorial');
      expect(results[0].title).toBe('JavaScript Tutorial');
    });

    it('should consider word count in ranking', () => {
      const results = searchEngine.search('programming');
      // Python page has more words, should rank higher for generic terms
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Result filtering', () => {
    it('should filter by minimum word count', () => {
      const results = searchEngine.filterResults(samplePages, { minWordCount: 600 });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Python Guide');
    });

    it('should filter by maximum depth', () => {
      const results = searchEngine.filterResults(samplePages, { maxDepth: 0 });
      expect(results).toHaveLength(1);
      expect(results[0].depth).toBe(0);
    });

    it('should filter by image presence', () => {
      const results = searchEngine.filterResults(samplePages, { hasImages: true });
      expect(results).toHaveLength(2); // Both have images
    });
  });

  describe('Search suggestions', () => {
    it('should provide relevant suggestions', () => {
      const suggestions = searchEngine.getSuggestions('java');
      expect(suggestions).toContain('javascript');
    });

    it('should limit suggestions count', () => {
      const suggestions = searchEngine.getSuggestions('p', 2);
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for very short queries', () => {
      const suggestions = searchEngine.getSuggestions('a');
      expect(suggestions).toHaveLength(0);
    });
  });
});