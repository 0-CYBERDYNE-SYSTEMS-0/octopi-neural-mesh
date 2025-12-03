/**
 * Agent Base Class
 * Foundation for all Octopi agents with common functionality
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getAIEndpoint } from './config.js';

/**
 * Base Agent Class
 * Provides common functionality for all specialized agents
 */
export class AgentBase {
  constructor(config) {
    this.config = config;
    this.agentId = process.env.OCTOPI_AGENT_ID || uuidv4();
    this.agentType = process.env.OCTOPI_AGENT_TYPE || 'unknown';
    this.serverUrl = process.env.OCTOPI_SERVER_URL || 'http://localhost:3000/octopi';
    
    // Agent state
    this.status = 'initializing';
    this.currentTask = null;
    this.capabilities = new Set();
    this.startTime = new Date();
    
    // Communication
    this.heartbeatInterval = null;
    this.heartbeatRate = 30000; // 30 seconds
    
    // AI endpoints
    this.aiEndpoints = this.initializeAIEndpoints();
    this.currentEndpoint = this.aiEndpoints.primary;
    
    // Terminal command interface
    this.terminalCommands = new Map();
    this.setupTerminalCommands();
    
    // Setup process communication
    this.setupProcessCommunication();
    
    console.log(`🤖 Agent ${this.agentId} (${this.agentType}) initializing...`);
  }

  /**
   * Initialize AI endpoints from config
   */
  initializeAIEndpoints() {
    return {
      primary: getAIEndpoint(this.config),
      fallback: getAIEndpoint(this.config, this.config.ai.fallback)
    };
  }

  /**
   * Setup process communication with parent
   */
  setupProcessCommunication() {
    // Listen for messages from pool manager
    process.on('message', (message) => {
      this.handleParentMessage(message);
    });

    // Handle process signals
    process.on('SIGTERM', () => {
      this.handleShutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      this.handleShutdown('SIGINT');
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.log('error', 'Uncaught exception', { error: error.message, stack: error.stack });
      this.sendToParent('error', { error: error.message, stack: error.stack });
    });

    process.on('unhandledRejection', (reason) => {
      this.log('error', 'Unhandled rejection', { reason });
      this.sendToParent('error', { error: 'Unhandled rejection', reason });
    });
  }

  /**
   * Setup terminal command interface
   */
  setupTerminalCommands() {
    // Core commands available in terminal
    this.terminalCommands.set('octopi-help', {
      description: 'Show available Octopi agent commands',
      handler: () => this.showHelp()
    });

    this.terminalCommands.set('octopi-status', {
      description: 'Show agent status and metrics',
      handler: () => this.showStatus()
    });

    this.terminalCommands.set('octopi-install-guide', {
      description: 'Show installation commands for various platforms',
      handler: () => this.showInstallGuide()
    });

    this.terminalCommands.set('octopi-handoff', {
      description: 'Request handoff to another agent type',
      handler: (args) => this.requestHandoff(args)
    });

    this.terminalCommands.set('octopi-spawn', {
      description: 'Request spawning of new agent',
      handler: (args) => this.requestSpawn(args)
    });

    this.terminalCommands.set('octopi-capabilities', {
      description: 'List agent capabilities',
      handler: () => this.listCapabilities()
    });

    this.terminalCommands.set('octopi-task', {
      description: 'Execute a task',
      handler: (args) => this.executeTask(args)
    });
  }

  /**
   * Handle messages from parent process (pool manager)
   */
  async handleParentMessage(message) {
    const { type, data } = message;

    try {
      switch (type) {
        case 'execute_task':
          await this.executeTask(data);
          break;

        case 'terminate':
          await this.handleShutdown('TERMINATE');
          break;

        case 'handoff_accepted':
          this.handleHandoffAccepted(data);
          break;

        case 'handoff_failed':
          this.handleHandoffFailed(data);
          break;

        case 'spawn_success':
          this.handleSpawnSuccess(data);
          break;

        case 'spawn_failed':
          this.handleSpawnFailed(data);
          break;

        default:
          this.log('warn', 'Unknown message type', { type, data });
      }
    } catch (error) {
      this.log('error', 'Error handling parent message', {
        type,
        error: error.message
      });
    }
  }

  /**
   * Start the agent
   */
  async start() {
    try {
      this.log('info', 'Starting agent', { agentId: this.agentId, agentType: this.agentType });
      
      // Initialize agent-specific functionality
      await this.initialize();
      
      // Set status to ready
      this.status = 'idle';
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Notify parent that agent is ready
      this.sendToParent('ready', {
        agentId: this.agentId,
        agentType: this.agentType,
        capabilities: Array.from(this.capabilities),
        status: this.status
      });

      this.log('info', 'Agent ready', { capabilities: Array.from(this.capabilities) });

    } catch (error) {
      this.log('error', 'Agent startup failed', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * Initialize agent (override in subclasses)
   */
  async initialize() {
    // Base initialization - override in subclasses
  }

  /**
   * Start heartbeat to parent process
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendToParent('heartbeat', {
        status: this.status,
        currentTask: this.currentTask?.id,
        uptime: Date.now() - this.startTime.getTime(),
        memoryUsage: process.memoryUsage()
      });
    }, this.heartbeatRate);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send message to parent process
   */
  sendToParent(type, data = {}) {
    if (process.send) {
      try {
        process.send({ type, data, agentId: this.agentId, timestamp: new Date() });
      } catch (error) {
        console.error('Failed to send message to parent:', error.message);
      }
    }
  }

  /**
   * Execute a task (override in subclasses)
   */
  async executeTask(task) {
    const taskId = task.id || uuidv4();
    const startTime = new Date();

    try {
      this.status = 'working';
      this.currentTask = { id: taskId, ...task, startedAt: startTime };

      this.sendToParent('task_started', { taskId, task });
      this.log('info', 'Task started', { taskId, type: task.type });

      // Subclasses should override this method
      const result = await this.processTask(task);

      const endTime = new Date();
      const duration = endTime - startTime;

      this.sendToParent('task_completed', {
        taskId,
        result,
        duration,
        startTime,
        endTime
      });

      this.log('info', 'Task completed', { taskId, duration, success: result?.success });

      this.status = 'idle';
      this.currentTask = null;

      return result;

    } catch (error) {
      const endTime = new Date();
      const duration = endTime - startTime;

      this.sendToParent('task_failed', {
        taskId,
        error: error.message,
        duration,
        startTime,
        endTime
      });

      this.log('error', 'Task failed', { taskId, error: error.message });

      this.status = 'idle';
      this.currentTask = null;

      throw error;
    }
  }

  /**
   * Process task (override in subclasses)
   */
  async processTask(task) {
    throw new Error('processTask must be implemented by subclass');
  }

  /**
   * Request handoff to another agent
   */
  async requestHandoff(options) {
    const { toAgentType, context, priority = 5 } = options;

    this.log('info', 'Requesting handoff', { toAgentType, context });

    this.sendToParent('handoff_request', {
      toAgentType,
      context,
      priority,
      sessionId: process.env.OCTOPI_SESSION_ID
    });
  }

  /**
   * Handle successful handoff
   */
  handleHandoffAccepted(data) {
    this.log('info', 'Handoff accepted', data);
    console.log(`✅ Handoff successful to ${data.targetAgent} (${data.targetType})`);
  }

  /**
   * Handle failed handoff
   */
  handleHandoffFailed(data) {
    this.log('error', 'Handoff failed', data);
    console.log(`❌ Handoff failed: ${data.error}`);
  }

  /**
   * Request spawning of new agent
   */
  async requestSpawn(options) {
    const { agentType, reason, env } = options;

    this.log('info', 'Requesting agent spawn', { agentType, reason });

    this.sendToParent('spawn_request', {
      agentType,
      options: { env },
      reason
    });
  }

  /**
   * Handle successful spawn
   */
  handleSpawnSuccess(data) {
    this.log('info', 'Agent spawn successful', data);
    console.log(`✅ Agent ${data.newAgent} (${data.agentType}) spawned successfully`);
  }

  /**
   * Handle failed spawn
   */
  handleSpawnFailed(data) {
    this.log('error', 'Agent spawn failed', data);
    console.log(`❌ Agent spawn failed: ${data.error}`);
  }

  /**
   * Make AI API call with fallback
   */
  async callAI(messages, functions = null, options = {}) {
    const { retryOnFailure = true, maxRetries = 3 } = options;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Try primary endpoint first
        const endpoint = attempt === 1 ? this.aiEndpoints.primary : this.aiEndpoints.fallback;
        
        const payload = {
          model: endpoint.model,
          messages,
          max_tokens: endpoint.maxTokens || 4096,
          temperature: endpoint.temperature || 0.7,
          ...options
        };

        if (functions) {
          payload.functions = functions;
          payload.function_call = 'auto';
        }

        const response = await axios.post(endpoint.url, payload, {
          headers: {
            'Authorization': `Bearer ${endpoint.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.ai.timeout || 30000
        });

        this.log('debug', 'AI API call successful', {
          endpoint: endpoint.provider,
          model: endpoint.model,
          attempt
        });

        return response.data;

      } catch (error) {
        lastError = error;
        
        this.log('warn', 'AI API call failed', {
          attempt,
          error: error.message,
          endpoint: attempt === 1 ? 'primary' : 'fallback'
        });

        if (!retryOnFailure || attempt === maxRetries) {
          break;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw new Error(`AI API calls failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Log message
   */
  log(level, message, data = {}) {
    const logData = {
      agentId: this.agentId,
      agentType: this.agentType,
      timestamp: new Date().toISOString(),
      ...data
    };

    console.log(`[${level.toUpperCase()}] [${this.agentType}:${this.agentId}] ${message}`, 
                JSON.stringify(logData, null, 2));

    // Send log to parent for centralized logging
    this.sendToParent('log', { level, message, data: logData });
  }

  /**
   * Show help for terminal commands
   */
  showHelp() {
    console.log('\n🐙 Octopi Agent Commands:');
    console.log('=========================');
    
    for (const [command, info] of this.terminalCommands.entries()) {
      console.log(`  ${command.padEnd(20)} - ${info.description}`);
    }
    
    console.log('\nAgent-specific commands may also be available.');
    console.log('💡 Tip: For installation guides, run "octopi-install-guide"');
    console.log('Use octopi-status to see current agent information.\n');
  }

  /**
   * Show installation guide for various platforms
   */
  showInstallGuide() {
    console.log('\n🚀 Octopi Neural Mesh - Installation Guide');
    console.log('==========================================');
    console.log('');
    console.log('📱 Termux (Android):');
    console.log('  curl -fsSL https://raw.githubusercontent.com/0-CYBERDYNE-SYSTEMS-0/octopi-neural-mesh/main/scripts/install-termux.sh | bash');
    console.log('');
    console.log('🍎 macOS:');
    console.log('  curl -fsSL https://raw.githubusercontent.com/0-CYBERDYNE-SYSTEMS-0/octopi-neural-mesh/main/scripts/install-macos.sh | bash');
    console.log('');
    console.log('  AppleScript (GUI):');
    console.log('  osascript scripts/Install-Octopi.applescript');
    console.log('');
    console.log('🐧 Ubuntu/Debian:');
    console.log('  curl -fsSL https://raw.githubusercontent.com/0-CYBERDYNE-SYSTEMS-0/octopi-neural-mesh/main/scripts/install-ubuntu.sh | bash');
    console.log('');
    console.log('🐳 Docker:');
    console.log('  docker run -d -p 3000:3000 \\');
    console.log('    -e OPENAI_API_KEY=your-key \\');
    console.log('    -e JWT_SECRET=your-secret \\');
    console.log('    octopi-neural-mesh');
    console.log('');
    console.log('📖 Complete Guide:');
    console.log('  See TERMINAL_COMMANDS.md for detailed platform-specific');
    console.log('  instructions, self-replication commands, and AppleScript');
    console.log('  automation examples.');
    console.log('');
    console.log('🔄 Self-Replication Commands:');
    console.log('  octopi-discover          # Discover systems on network');
    console.log('  octopi-replicate <host>  # Replicate to specific host');
    console.log('  octopi-expand            # Expand colony automatically');
    console.log('  octopi-colonies          # List active colonies');
    console.log('');
  }

  /**
   * Show agent status
   */
  showStatus() {
    const uptime = Date.now() - this.startTime.getTime();
    const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
    const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

    console.log('\n🤖 Agent Status:');
    console.log('================');
    console.log(`Agent ID:      ${this.agentId}`);
    console.log(`Agent Type:    ${this.agentType}`);
    console.log(`Status:        ${this.status}`);
    console.log(`Uptime:        ${uptimeHours}h ${uptimeMinutes}m`);
    console.log(`Current Task:  ${this.currentTask?.id || 'None'}`);
    console.log(`Capabilities:  ${Array.from(this.capabilities).join(', ')}`);
    
    const memory = process.memoryUsage();
    console.log(`Memory Usage:  ${Math.round(memory.rss / 1024 / 1024)}MB RSS`);
    console.log(`Heap Used:     ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
    console.log('');
  }

  /**
   * List agent capabilities
   */
  listCapabilities() {
    console.log('\n🛠️  Agent Capabilities:');
    console.log('======================');
    
    if (this.capabilities.size === 0) {
      console.log('No specific capabilities defined');
    } else {
      for (const capability of this.capabilities) {
        console.log(`  ✓ ${capability}`);
      }
    }
    console.log('');
  }

  /**
   * Handle shutdown gracefully
   */
  async handleShutdown(signal) {
    this.log('info', 'Received shutdown signal', { signal });
    console.log(`\n🛑 Agent ${this.agentId} shutting down (${signal})...`);

    try {
      // Stop heartbeat
      this.stopHeartbeat();

      // Cleanup agent-specific resources
      await this.cleanup();

      // Set status
      this.status = 'terminated';

      this.log('info', 'Agent shutdown complete');
      console.log('✅ Agent shutdown complete');

    } catch (error) {
      this.log('error', 'Error during shutdown', { error: error.message });
      console.error('❌ Shutdown error:', error.message);
    }

    process.exit(0);
  }

  /**
   * Cleanup agent resources (override in subclasses)
   */
  async cleanup() {
    // Base cleanup - override in subclasses
  }
}