/**
 * Configuration management for Octopi WeTTY System
 * Handles config loading, environment variable substitution, and validation
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

/**
 * Default configuration values
 */
const defaultConfig = {
  server: {
    host: '0.0.0.0',
    port: 3000,
    basePath: '/octopi',
    title: '🐙 Octopi Multi-Agent System'
  },
  ai: {
    primary: 'openai',
    fallback: 'openrouter',
    retryAttempts: 3,
    timeout: 30000,
    endpoints: {
      openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4-turbo-preview',
        apiKey: '${OPENAI_API_KEY}',
        maxTokens: 4096,
        temperature: 0.7
      },
      openrouter: {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'anthropic/claude-3-sonnet',
        apiKey: '${OPENROUTER_API_KEY}',
        maxTokens: 4096,
        temperature: 0.7
      }
    }
  },
  agents: {
    maxConcurrent: 10,
    heartbeatInterval: 30000,
    taskTimeout: 600000,
    specializations: {
      coordinator: {
        enabled: true,
        instances: 1,
        priority: 1
      },
      research: {
        enabled: true,
        maxInstances: 3,
        priority: 2
      },
      code: {
        enabled: true,
        maxInstances: 2,
        priority: 2
      },
      devops: {
        enabled: true,
        maxInstances: 2,
        priority: 3
      },
      replication: {
        enabled: true,
        instances: 1,
        priority: 4
      }
    }
  },
  logging: {
    level: 'info',
    file: 'logs/octopi.log'
  },
  security: {
    authentication: {
      enabled: true,
      jwtSecret: '${JWT_SECRET}',
      tokenExpiry: '24h'
    }
  }
};

/**
 * Substitute environment variables in config values
 * @param {any} value - Config value to process
 * @returns {any} Processed value with env vars substituted
 */
function substituteEnvVars(value) {
  if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
    const envVar = value.slice(2, -1);
    return process.env[envVar] || value;
  }
  
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return value.map(substituteEnvVars);
    }
    
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = substituteEnvVars(val);
    }
    return result;
  }
  
  return value;
}

/**
 * Validate required configuration values
 * @param {object} config - Configuration object to validate
 * @throws {Error} If required values are missing
 */
function validateConfig(config) {
  const required = [
    'ai.endpoints.openai.apiKey',
    'security.authentication.jwtSecret'
  ];
  
  for (const path of required) {
    const value = getNestedValue(config, path);
    if (!value || (typeof value === 'string' && value.startsWith('${'))) {
      throw new Error(`Required configuration missing: ${path}`);
    }
  }
}

/**
 * Get nested object value by dot notation path
 * @param {object} obj - Object to search
 * @param {string} path - Dot notation path (e.g., 'ai.endpoints.openai.apiKey')
 * @returns {any} Value at path or undefined
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Deep merge two objects
 * @param {object} target - Target object
 * @param {object} source - Source object to merge
 * @returns {object} Merged object
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMerge(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Load configuration from file with environment variable substitution
 * @param {string} configPath - Path to config file (optional)
 * @returns {object} Processed configuration object
 */
export function loadConfig(configPath = null) {
  let fileConfig = {};
  
  // Try to load config file
  if (configPath) {
    try {
      const configText = readFileSync(resolve(configPath), 'utf8');
      fileConfig = JSON.parse(configText);
    } catch (error) {
      console.warn(`Could not load config file ${configPath}:`, error.message);
    }
  } else {
    // Try default locations
    const defaultPaths = [
      resolve(__dirname, '../../config/config.json'),
      resolve(__dirname, '../../config.json'),
      resolve(process.cwd(), 'config.json')
    ];
    
    for (const path of defaultPaths) {
      try {
        const configText = readFileSync(path, 'utf8');
        fileConfig = JSON.parse(configText);
        console.log(`Loaded config from: ${path}`);
        break;
      } catch (error) {
        // Continue to next path
      }
    }
  }
  
  // Merge with defaults
  let config = deepMerge(defaultConfig, fileConfig);
  
  // Substitute environment variables
  config = substituteEnvVars(config);
  
  // Override with environment variables
  if (process.env.NODE_ENV) config.env = process.env.NODE_ENV;
  if (process.env.HOST) config.server.host = process.env.HOST;
  if (process.env.PORT) config.server.port = parseInt(process.env.PORT);
  if (process.env.LOG_LEVEL) config.logging.level = process.env.LOG_LEVEL;
  if (process.env.MAX_CONCURRENT_AGENTS) {
    config.agents.maxConcurrent = parseInt(process.env.MAX_CONCURRENT_AGENTS);
  }
  
  // Validate configuration
  try {
    validateConfig(config);
  } catch (error) {
    if (config.env !== 'development') {
      throw error;
    }
    console.warn('Config validation warning (development mode):', error.message);
  }
  
  return config;
}

/**
 * Get AI endpoint configuration
 * @param {object} config - Main configuration object
 * @param {string} provider - Provider name ('openai', 'openrouter')
 * @returns {object} Endpoint configuration
 */
export function getAIEndpoint(config, provider = null) {
  const targetProvider = provider || config.ai.primary;
  const endpoint = config.ai.endpoints[targetProvider];
  
  if (!endpoint) {
    throw new Error(`Unknown AI provider: ${targetProvider}`);
  }
  
  return {
    ...endpoint,
    provider: targetProvider
  };
}

/**
 * Get agent specialization configuration
 * @param {object} config - Main configuration object
 * @param {string} type - Agent type
 * @returns {object} Agent configuration
 */
export function getAgentConfig(config, type) {
  return config.agents.specializations[type] || {};
}

/**
 * Check if a feature is enabled
 * @param {object} config - Main configuration object
 * @param {string} feature - Feature path (e.g., 'replication.enabled')
 * @returns {boolean} Whether feature is enabled
 */
export function isFeatureEnabled(config, feature) {
  const value = getNestedValue(config, feature);
  return Boolean(value);
}

export { defaultConfig };