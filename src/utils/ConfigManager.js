/**
 * ConfigManager - Configuration management with validation and persistence
 */
export class ConfigManager {
  constructor() {
    this.defaultConfig = {
      maxConcurrency: 3,
      requestDelay: 1000,
      timeout: 10000,
      maxRetries: 2,
      respectRobots: true,
      userAgent: 'WebWarden Crawler 2.0',
      maxPages: 100,
      maxDepth: 3,
      allowedDomains: [],
      blockedDomains: [],
      contentTypes: ['text/html'],
      followRedirects: true,
      maxRedirects: 5
    };
    
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from localStorage with fallback to defaults
   */
  loadConfig() {
    try {
      const saved = localStorage.getItem('webwarden-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...this.defaultConfig, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load saved config:', error);
    }
    
    return { ...this.defaultConfig };
  }

  /**
   * Save configuration to localStorage
   */
  saveConfig(newConfig = null) {
    try {
      const configToSave = newConfig || this.config;
      localStorage.setItem('webwarden-config', JSON.stringify(configToSave));
      if (newConfig) {
        this.config = { ...this.config, ...newConfig };
      }
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration with validation
   */
  updateConfig(updates) {
    const validatedUpdates = this.validateConfig(updates);
    this.config = { ...this.config, ...validatedUpdates };
    this.saveConfig();
    return this.config;
  }

  /**
   * Validate configuration values
   */
  validateConfig(config) {
    const validated = {};
    
    if (config.maxConcurrency !== undefined) {
      validated.maxConcurrency = Math.max(1, Math.min(10, parseInt(config.maxConcurrency)));
    }
    
    if (config.requestDelay !== undefined) {
      validated.requestDelay = Math.max(100, parseInt(config.requestDelay));
    }
    
    if (config.timeout !== undefined) {
      validated.timeout = Math.max(1000, Math.min(60000, parseInt(config.timeout)));
    }
    
    if (config.maxRetries !== undefined) {
      validated.maxRetries = Math.max(0, Math.min(5, parseInt(config.maxRetries)));
    }
    
    if (config.maxPages !== undefined) {
      validated.maxPages = Math.max(1, Math.min(1000, parseInt(config.maxPages)));
    }
    
    if (config.maxDepth !== undefined) {
      validated.maxDepth = Math.max(1, Math.min(10, parseInt(config.maxDepth)));
    }
    
    // Boolean configs
    ['respectRobots', 'followRedirects'].forEach(key => {
      if (config[key] !== undefined) {
        validated[key] = Boolean(config[key]);
      }
    });
    
    // String configs
    ['userAgent'].forEach(key => {
      if (config[key] !== undefined && typeof config[key] === 'string') {
        validated[key] = config[key].trim();
      }
    });
    
    return validated;
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults() {
    this.config = { ...this.defaultConfig };
    this.saveConfig();
    return this.config;
  }

  /**
   * Export configuration
   */
  exportConfig() {
    const configContent = JSON.stringify(this.config, null, 2);
    const blob = new Blob([configContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'webwarden-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import configuration from file
   */
  async importConfig(file) {
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      const validated = this.validateConfig(imported);
      this.updateConfig(validated);
      return this.config;
    } catch (error) {
      throw new Error('Invalid configuration file');
    }
  }
}