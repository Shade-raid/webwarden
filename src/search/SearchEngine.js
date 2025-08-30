/**
 * SearchEngine - Advanced search functionality with ranking and filtering
 */
export class SearchEngine {
  constructor() {
    this.index = [];
    this.searchCache = new Map();
  }

  /**
   * Update the search index with new data
   */
  updateIndex(pages) {
    this.index = pages;
    this.searchCache.clear(); // Clear cache when index updates
    this.buildSearchIndex();
  }

  /**
   * Build inverted index for faster searching
   */
  buildSearchIndex() {
    this.invertedIndex = new Map();
    
    this.index.forEach((page, pageIndex) => {
      const text = `${page.title} ${page.description} ${page.keywords}`.toLowerCase();
      const words = text.match(/\b\w+\b/g) || [];
      
      words.forEach(word => {
        if (word.length > 2) { // Ignore very short words
          if (!this.invertedIndex.has(word)) {
            this.invertedIndex.set(word, new Set());
          }
          this.invertedIndex.get(word).add(pageIndex);
        }
      });
    });
  }

  /**
   * Search the index with ranking
   */
  search(query, options = {}) {
    if (!query.trim()) return this.index;
    
    const cacheKey = `${query.toLowerCase()}_${JSON.stringify(options)}`;
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey);
    }

    const queryWords = query.toLowerCase().match(/\b\w+\b/g) || [];
    const pageScores = new Map();
    
    // Find pages containing query words
    queryWords.forEach(word => {
      if (this.invertedIndex.has(word)) {
        this.invertedIndex.get(word).forEach(pageIndex => {
          const currentScore = pageScores.get(pageIndex) || 0;
          pageScores.set(pageIndex, currentScore + 1);
        });
      }
    });

    // Score and rank results
    const results = Array.from(pageScores.entries())
      .map(([pageIndex, wordMatches]) => {
        const page = this.index[pageIndex];
        const score = this.calculateRelevanceScore(page, query, wordMatches);
        return { page, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(result => result.page);

    this.searchCache.set(cacheKey, results);
    return results;
  }

  /**
   * Calculate relevance score for search results
   */
  calculateRelevanceScore(page, query, wordMatches) {
    let score = wordMatches * 10; // Base score from word matches
    
    const queryLower = query.toLowerCase();
    
    // Title matches get higher score
    if (page.title.toLowerCase().includes(queryLower)) {
      score += 50;
    }
    
    // Exact phrase matches in title
    if (page.title.toLowerCase() === queryLower) {
      score += 100;
    }
    
    // Description matches
    if (page.description.toLowerCase().includes(queryLower)) {
      score += 20;
    }
    
    // URL matches (for branded searches)
    if (page.url.toLowerCase().includes(queryLower)) {
      score += 15;
    }
    
    // Keyword matches
    if (page.keywords.toLowerCase().includes(queryLower)) {
      score += 25;
    }
    
    // Heading matches
    Object.values(page.headings || {}).forEach(headingArray => {
      headingArray.forEach(heading => {
        if (heading.toLowerCase().includes(queryLower)) {
          score += 30;
        }
      });
    });
    
    // Boost score for pages with more content
    score += Math.min(page.wordCount / 100, 10);
    
    return score;
  }

  /**
   * Get search suggestions based on indexed content
   */
  getSuggestions(query, limit = 5) {
    if (!query.trim() || query.length < 2) return [];
    
    const queryLower = query.toLowerCase();
    const suggestions = new Set();
    
    this.index.forEach(page => {
      // Extract potential suggestions from titles and keywords
      const text = `${page.title} ${page.keywords}`.toLowerCase();
      const words = text.match(/\b\w+\b/g) || [];
      
      words.forEach(word => {
        if (word.startsWith(queryLower) && word !== queryLower) {
          suggestions.add(word);
        }
      });
    });
    
    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Filter results by various criteria
   */
  filterResults(results, filters = {}) {
    let filtered = results;
    
    if (filters.minWordCount) {
      filtered = filtered.filter(page => page.wordCount >= filters.minWordCount);
    }
    
    if (filters.maxDepth !== undefined) {
      filtered = filtered.filter(page => page.depth <= filters.maxDepth);
    }
    
    if (filters.hasImages) {
      filtered = filtered.filter(page => page.imageCount > 0);
    }
    
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filtered = filtered.filter(page => {
        const crawledDate = new Date(page.crawledAt);
        return crawledDate >= start && crawledDate <= end;
      });
    }
    
    return filtered;
  }
}