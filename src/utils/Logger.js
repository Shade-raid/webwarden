/**
 * Logger - Comprehensive logging and monitoring system
 */
export class Logger {
  constructor(level = 'INFO') {
    this.level = level;
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
    this.logs = [];
    this.maxLogs = 1000;
  }

  log(level, message, data = null) {
    if (this.levels[level] < this.levels[this.level]) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    this.logs.push(logEntry);
    
    // Keep only recent logs to prevent memory issues
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Console output with styling
    const style = this.getLogStyle(level);
    console.log(`%c[${level}] ${message}`, style, data || '');
  }

  debug(message, data) { this.log('DEBUG', message, data); }
  info(message, data) { this.log('INFO', message, data); }
  warn(message, data) { this.log('WARN', message, data); }
  error(message, data) { this.log('ERROR', message, data); }

  getLogStyle(level) {
    const styles = {
      DEBUG: 'color: #666; font-size: 0.9em;',
      INFO: 'color: #2196F3; font-weight: bold;',
      WARN: 'color: #FF9800; font-weight: bold;',
      ERROR: 'color: #F44336; font-weight: bold;'
    };
    return styles[level] || '';
  }

  getLogs(level = null, limit = 100) {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    
    return filteredLogs.slice(-limit);
  }

  exportLogs() {
    const logContent = this.logs
      .map(log => `[${log.timestamp}] ${log.level}: ${log.message}${log.data ? ' | ' + JSON.stringify(log.data) : ''}`)
      .join('\n');
    
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webwarden-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearLogs() {
    this.logs = [];
  }
}