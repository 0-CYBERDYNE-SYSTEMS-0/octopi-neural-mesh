#!/usr/bin/env node
/**
 * Octopi WeTTY System - Main Entry Point
 * Self-replicating multi-agent terminal coordination system
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { loadConfig } from './shared/config.js';
import { initLogger, getLogger, logSystemEvent } from './shared/logger.js';
import { showWelcomeBanner } from './shared/branding.js';
import { WeTTYServer } from './server/wetty-server.js';
import { AgentPoolManager } from './server/agent-pool-manager.js';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


/**
 * Main Octopi System Class
 */
class OctopiSystem {
  constructor(config) {
    this.config = config;
    this.logger = getLogger();
    this.wettyServer = null;
    this.agentPoolManager = null;
    this.running = false;
  }

  /**
   * Start the Octopi system
   */
  async start() {
    try {
      showWelcomeBanner('main');
      
      this.logger.info('🚀 Starting Octopi WeTTY System', {
        version: '1.0.0',
        nodeVersion: process.version,
        platform: process.platform
      });

      // Initialize WeTTY server
      this.logger.info('🔧 Initializing WeTTY server...');
      this.wettyServer = new WeTTYServer(this.config);

      // Initialize Agent Pool Manager
      this.logger.info('🤖 Initializing Agent Pool Manager...');
      this.agentPoolManager = new AgentPoolManager(this.config, this.wettyServer);

      // Start WeTTY server
      this.logger.info('🌐 Starting WeTTY server...');
      await this.wettyServer.start();
      
      // Start Agent Pool Manager
      this.logger.info('🎯 Starting Agent Pool Manager...');
      await this.agentPoolManager.start();

      this.running = true;

      const { host, port, basePath } = this.config.server;
      
      console.log(chalk.green('\n✅ Octopi System Online!'));
      console.log(chalk.cyan(`📡 WeTTY Server: http://${host}:${port}${basePath}`));
      console.log(chalk.cyan(`🎛️  Health Check: http://${host}:${port}${basePath}/health`));
      console.log(chalk.cyan(`📊 Agent Status: http://${host}:${port}${basePath}/api/agents`));
      
      if (this.config.replication?.enabled) {
        console.log(chalk.magenta('🧬 Colony Expansion: ENABLED'));
      }

      console.log(chalk.gray('\nPress Ctrl+C to stop the system\n'));

      logSystemEvent('octopi_system_started', {
        host,
        port,
        basePath,
        agentTypes: Object.keys(this.config.agents?.specializations || {}),
        replicationEnabled: this.config.replication?.enabled || false
      });

    } catch (error) {
      this.logger.error('Failed to start Octopi system', { error: error.message });
      console.error(chalk.red('❌ Startup failed:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Stop the Octopi system
   */
  async stop() {
    if (!this.running) return;

    this.logger.info('🛑 Stopping Octopi WeTTY System...');
    console.log(chalk.yellow('\n🛑 Shutting down Octopi System...'));

    try {
      // Stop Agent Pool Manager first
      if (this.agentPoolManager) {
        this.logger.info('Stopping Agent Pool Manager...');
        await this.agentPoolManager.stop();
      }

      // Stop WeTTY server
      if (this.wettyServer) {
        this.logger.info('Stopping WeTTY server...');
        await this.wettyServer.stop();
      }

      this.running = false;

      console.log(chalk.green('✅ Octopi System stopped successfully'));
      
      logSystemEvent('octopi_system_stopped');

    } catch (error) {
      this.logger.error('Error during shutdown', { error: error.message });
      console.error(chalk.red('❌ Shutdown error:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(chalk.yellow(`\n📡 Received ${signal}, shutting down gracefully...`));
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      console.error(chalk.red('💥 Uncaught exception:'), error.message);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection', { reason, promise });
      console.error(chalk.red('💥 Unhandled rejection:'), reason);
      shutdown('UNHANDLED_REJECTION');
    });
  }
}

/**
 * CLI Configuration
 */
const argv = yargs(hideBin(process.argv))
  .scriptName('octopi')
  .version('1.0.0')
  .usage('$0 [options]', '🐙 Start the Octopi WeTTY System')
  .option('config', {
    alias: 'c',
    type: 'string',
    description: 'Path to configuration file',
    default: null
  })
  .option('host', {
    type: 'string',
    description: 'Server host address',
    default: undefined
  })
  .option('port', {
    alias: 'p',
    type: 'number',
    description: 'Server port number',
    default: undefined
  })
  .option('log-level', {
    type: 'string',
    choices: ['error', 'warn', 'info', 'debug'],
    description: 'Logging level',
    default: 'info'
  })
  .option('enable-replication', {
    type: 'boolean',
    description: 'Enable agent replication and colony expansion',
    default: false
  })
  .option('max-agents', {
    type: 'number',
    description: 'Maximum concurrent agents',
    default: 10
  })
  .example('$0', 'Start with default configuration')
  .example('$0 --config config.json --port 3001', 'Start with custom config and port')
  .example('$0 --enable-replication --max-agents 20', 'Start with replication enabled')
  .help()
  .alias('help', 'h')
  .parseSync();

/**
 * Main execution
 */
async function main() {
  try {
    // Load configuration
    const config = loadConfig(argv.config);
    
    // Override with CLI arguments
    if (argv.host) config.server.host = argv.host;
    if (argv.port) config.server.port = argv.port;
    if (argv.logLevel) config.logging.level = argv.logLevel;
    if (argv.enableReplication !== undefined) {
      config.replication = config.replication || {};
      config.replication.enabled = argv.enableReplication;
    }
    if (argv.maxAgents) {
      config.agents = config.agents || {};
      config.agents.maxConcurrent = argv.maxAgents;
    }

    // Initialize logging
    initLogger(config.logging);

    // Create and start system
    const octopi = new OctopiSystem(config);
    octopi.setupGracefulShutdown();
    await octopi.start();

  } catch (error) {
    console.error(chalk.red('💥 Fatal error:'), error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle CLI help and version
if (argv.help) {
  yargs.showHelp();
  process.exit(0);
}

// Start the system
main().catch((error) => {
  console.error(chalk.red('💥 Startup failed:'), error.message);
  process.exit(1);
});