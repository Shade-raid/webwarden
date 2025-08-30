/**
 * ExportManager - Enhanced export functionality with multiple formats
 */
export class ExportManager {
  constructor() {
    this.supportedFormats = ['csv', 'json', 'xml', 'txt'];
  }

  /**
   * Export crawl results in specified format
   */
  export(data, format, filename = null) {
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultFilename = `webwarden-export-${timestamp}`;
    
    switch (format.toLowerCase()) {
      case 'csv':
        return this.exportCSV(data, filename || `${defaultFilename}.csv`);
      case 'json':
        return this.exportJSON(data, filename || `${defaultFilename}.json`);
      case 'xml':
        return this.exportXML(data, filename || `${defaultFilename}.xml`);
      case 'txt':
        return this.exportTXT(data, filename || `${defaultFilename}.txt`);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to CSV format
   */
  exportCSV(data, filename) {
    const headers = [
      'URL', 'Title', 'Description', 'Keywords', 'Word Count',
      'Link Count', 'Image Count', 'Depth', 'Referrer', 'Crawled At'
    ];
    
    const rows = data.pages.map(page => [
      this.escapeCsvField(page.url),
      this.escapeCsvField(page.title),
      this.escapeCsvField(page.description),
      this.escapeCsvField(page.keywords),
      page.wordCount || 0,
      page.linkCount || 0,
      page.imageCount || 0,
      page.depth || 0,
      this.escapeCsvField(page.referrer || ''),
      page.crawledAt
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    this.downloadFile(csvContent, filename, 'text/csv');
  }

  /**
   * Export to JSON format
   */
  exportJSON(data, filename) {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '2.0',
        totalPages: data.pages.length,
        totalErrors: data.errors.length,
        crawlStats: data.stats
      },
      pages: data.pages,
      errors: data.errors
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    this.downloadFile(jsonContent, filename, 'application/json');
  }

  /**
   * Export to XML format
   */
  exportXML(data, filename) {
    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<crawlResults>\n';
    xmlContent += `  <metadata>\n`;
    xmlContent += `    <exportedAt>${new Date().toISOString()}</exportedAt>\n`;
    xmlContent += `    <totalPages>${data.pages.length}</totalPages>\n`;
    xmlContent += `    <totalErrors>${data.errors.length}</totalErrors>\n`;
    xmlContent += `  </metadata>\n`;
    xmlContent += `  <pages>\n`;
    
    data.pages.forEach(page => {
      xmlContent += `    <page>\n`;
      xmlContent += `      <url>${this.escapeXml(page.url)}</url>\n`;
      xmlContent += `      <title>${this.escapeXml(page.title)}</title>\n`;
      xmlContent += `      <description>${this.escapeXml(page.description)}</description>\n`;
      xmlContent += `      <keywords>${this.escapeXml(page.keywords)}</keywords>\n`;
      xmlContent += `      <wordCount>${page.wordCount || 0}</wordCount>\n`;
      xmlContent += `      <linkCount>${page.linkCount || 0}</linkCount>\n`;
      xmlContent += `      <imageCount>${page.imageCount || 0}</imageCount>\n`;
      xmlContent += `      <depth>${page.depth || 0}</depth>\n`;
      xmlContent += `      <crawledAt>${page.crawledAt}</crawledAt>\n`;
      xmlContent += `    </page>\n`;
    });
    
    xmlContent += `  </pages>\n</crawlResults>`;
    this.downloadFile(xmlContent, filename, 'application/xml');
  }

  /**
   * Export to text report format
   */
  exportTXT(data, filename) {
    let report = `WebWarden Crawler Report\n`;
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Total Pages: ${data.pages.length}\n`;
    report += `Total Errors: ${data.errors.length}\n`;
    report += `Crawl Duration: ${data.stats.elapsed}s\n\n`;
    
    report += `=== CRAWLED PAGES ===\n\n`;
    data.pages.forEach((page, index) => {
      report += `${index + 1}. ${page.title}\n`;
      report += `   URL: ${page.url}\n`;
      report += `   Description: ${page.description.substring(0, 100)}${page.description.length > 100 ? '...' : ''}\n`;
      report += `   Stats: ${page.wordCount} words, ${page.linkCount} links, ${page.imageCount} images\n`;
      report += `   Depth: ${page.depth}, Crawled: ${new Date(page.crawledAt).toLocaleString()}\n\n`;
    });
    
    if (data.errors.length > 0) {
      report += `=== ERRORS ===\n\n`;
      data.errors.forEach((error, index) => {
        report += `${index + 1}. ${error.url}\n`;
        report += `   Error: ${error.error}\n`;
        report += `   Time: ${new Date(error.timestamp).toLocaleString()}\n\n`;
      });
    }
    
    this.downloadFile(report, filename, 'text/plain');
  }

  /**
   * Utility methods
   */
  escapeCsvField(field) {
    if (typeof field !== 'string') return field;
    return `"${field.replace(/"/g, '""')}"`;
  }

  escapeXml(text) {
    if (typeof text !== 'string') return text;
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}