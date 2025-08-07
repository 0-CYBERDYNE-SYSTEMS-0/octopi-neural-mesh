/**
 * Agent Pool Manager
 * Manages spawning, coordination, and lifecycle of specialized AI agents
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getLogger, logSystemEvent, logAgentActivity } from '../shared/logger.js';
import { getAIEndpoint, getAgentConfig } from '../shared/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Agent Pool Manager Class
 * Orchestrates the lifecycle of specialized AI agents
 */
export class AgentPoolManager {
  constructor(config, wettyServer) {
    this.config = config;
    this.wettyServer = wettyServer;
    this.logger = getLogger();
    
    // Agent management
    this.agentPool = new Map();
    this.agentTypes = new Map();
    this.taskQueue = [];
    this.agentProcesses = new Map();
    
    // Configuration
    this.maxConcurrentAgents = config.agents?.maxConcurrent || 10;
    this.heartbeatInterval = config.agents?.heartbeatInterval || 30000;
    this.taskTimeout = config.agents?.taskTimeout || 600000;
    
    // Agent definitions
    this.initializeAgentTypes();
    
    // Task distribution
    this.distributionStrategies = {
      'round-robin': this.roundRobinDistribution.bind(this),
      'load-balanced': this.loadBalancedDistribution.bind(this),
      'capability-based': this.capabilityBasedDistribution.bind(this)
    };
    
    this.currentStrategy = 'capability-based';
    
    this.startHeartbeatMonitoring();
    
    logSystemEvent('agent_pool_manager_initialized', {
      maxConcurrentAgents: this.maxConcurrentAgents,
      supportedAgentTypes: Array.from(this.agentTypes.keys())
    });
  }

  /**
   * Initialize agent type definitions
   */
  initializeAgentTypes() {
    // Coordinator Agent
    this.agentTypes.set('coordinator', {
      name: 'Coordinator Agent',
      description: 'Master orchestrator for task distribution and coordination',
      capabilities: ['task-routing', 'agent-spawning', 'workflow-coordination'],
      priority: 1,
      maxInstances: 1,
      spawnCommand: 'node',
      spawnArgs: [resolve(__dirname, '../agents/coordinator.js')],
      resources: { memory: '256MB', cpu: '0.5' },
      autoSpawn: true
    });

    // Research Agent
    this.agentTypes.set('research', {
      name: 'Research Agent', 
      description: 'Web scraping, data analysis, and information gathering',
      capabilities: ['web-scraping', 'data-analysis', 'report-generation'],
      priority: 2,
      maxInstances: 3,
      spawnCommand: 'node',
      spawnArgs: [resolve(__dirname, '../agents/research.js')],
      resources: { memory: '512MB', cpu: '1.0' },
      autoSpawn: false
    });

    // Code Agent
    this.agentTypes.set('code', {
      name: 'Code Agent',
      description: 'Development, GitHub integration, and file operations',
      capabilities: ['github-ops', 'file-management', 'code-generation', 'code-review'],
      priority: 2,
      maxInstances: 2,
      spawnCommand: 'node', 
      spawnArgs: [resolve(__dirname, '../agents/code.js')],
      resources: { memory: '512MB', cpu: '1.0' },
      autoSpawn: false
    });

    // DevOps Agent
    this.agentTypes.set('devops', {
      name: 'DevOps Agent',
      description: 'Server management, deployment, and monitoring',
      capabilities: ['server-management', 'deployment', 'monitoring', 'infrastructure'],
      priority: 3,
      maxInstances: 2,
      spawnCommand: 'node',
      spawnArgs: [resolve(__dirname, '../agents/devops.js')],
      resources: { memory: '256MB', cpu: '0.5' },
      autoSpawn: false
    });

    // Replication Agent
    this.agentTypes.set('replication', {
      name: 'Replication Agent',
      description: 'Self-spawning, colony expansion, and system discovery',
      capabilities: ['self-replication', 'colony-management', 'system-discovery'],
      priority: 4,
      maxInstances: 1,
      spawnCommand: 'node',
      spawnArgs: [resolve(__dirname, '../agents/replication.js')],
      resources: { memory: '256MB', cpu: '0.5' },
      autoSpawn: false
    });
  }

  /**
   * Start the agent pool manager
   */
  async start() {
    this.logger.info('Starting Agent Pool Manager');
    
    // Spawn auto-start agents
    for (const [agentType, definition] of this.agentTypes.entries()) {
      if (definition.autoSpawn) {
        for (let i = 0; i < (definition.instances || 1); i++) {
          await this.spawnAgent(agentType);
        }
      }
    }

    // Start task processing
    this.startTaskProcessing();
    
    logSystemEvent('agent_pool_manager_started', {
      initialAgents: this.agentPool.size
    });
  }

  /**
   * Spawn a new agent of specified type
   * @param {string} agentType - Type of agent to spawn
   * @param {object} options - Agent spawn options
   * @returns {Promise<object>} Agent information
   */
  async spawnAgent(agentType, options = {}) {
    const definition = this.agentTypes.get(agentType);
    if (!definition) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    // Check instance limits
    const currentInstances = this.getAgentsByType(agentType).length;
    if (currentInstances >= definition.maxInstances) {
      throw new Error(`Maximum instances reached for ${agentType}: ${definition.maxInstances}`);
    }

    // Check global agent limit
    if (this.agentPool.size >= this.maxConcurrentAgents) {
      throw new Error(`Maximum concurrent agents reached: ${this.maxConcurrentAgents}`);
    }

    const agentId = uuidv4();
    const agentConfig = getAgentConfig(this.config, agentType);

    try {
      this.logger.info('Spawning agent', { agentType, agentId });

      // Prepare agent environment
      const env = {
        ...process.env,
        OCTOPI_AGENT_ID: agentId,
        OCTOPI_AGENT_TYPE: agentType,
        OCTOPI_SERVER_URL: `http://${this.config.server.host}:${this.config.server.port}${this.config.server.basePath}`,
        OCTOPI_CONFIG: JSON.stringify(this.config),
        ...options.env
      };

      // Spawn agent process
      const agentProcess = spawn(definition.spawnCommand, definition.spawnArgs, {
        env,
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        detached: false,
        cwd: options.workingDir || process.cwd()
      });

      if (!agentProcess.pid) {
        throw new Error('Failed to spawn agent process');
      }

      // Create agent record
      const agent = {
        agentId,
        agentType,
        pid: agentProcess.pid,
        process: agentProcess,
        status: 'starting',
        spawnedAt: new Date(),
        lastHeartbeat: new Date(),
        currentTask: null,
        capabilities: new Set(definition.capabilities),
        metrics: {
          tasksCompleted: 0,
          tasksFailed: 0,
          totalTaskTime: 0,
          averageTaskTime: 0
        },
        config: agentConfig,
        definition
      };

      // Store agent
      this.agentPool.set(agentId, agent);
      this.agentProcesses.set(agentProcess.pid, agentId);

      // Setup process handlers
      this.setupAgentProcessHandlers(agent);

      // Wait for agent to be ready
      await this.waitForAgentReady(agentId);

      agent.status = 'idle';
      
      this.logger.info('Agent spawned successfully', {
        agentType,
        agentId,
        pid: agentProcess.pid
      });

      logAgentActivity(agentId, 'spawned', {
        agentType,
        pid: agentProcess.pid,
        capabilities: Array.from(agent.capabilities)
      });

      return {
        agentId,
        agentType,
        pid: agentProcess.pid,
        status: agent.status,
        capabilities: Array.from(agent.capabilities)
      };

    } catch (error) {
      this.logger.error('Failed to spawn agent', {
        error: error.message,
        agentType,
        agentId
      });

      // Cleanup on failure
      if (this.agentPool.has(agentId)) {
        await this.terminateAgent(agentId);
      }

      throw error;
    }
  }

  /**
   * Setup agent process event handlers
   * @param {object} agent - Agent object
   */
  setupAgentProcessHandlers(agent) {
    const { agentId, process: agentProcess } = agent;

    // Handle process messages
    agentProcess.on('message', (message) => {
      this.handleAgentMessage(agentId, message);
    });

    // Handle process stdout
    agentProcess.stdout.on('data', (data) => {
      this.logger.debug('Agent stdout', {
        agentId,
        data: data.toString().trim()
      });
    });

    // Handle process stderr  
    agentProcess.stderr.on('data', (data) => {
      this.logger.warn('Agent stderr', {
        agentId,
        data: data.toString().trim()
      });
    });

    // Handle process exit
    agentProcess.on('exit', (code, signal) => {
      this.handleAgentExit(agentId, code, signal);
    });

    // Handle process errors
    agentProcess.on('error', (error) => {
      this.logger.error('Agent process error', {
        agentId,
        error: error.message
      });
    });
  }

  /**
   * Handle messages from agent processes
   * @param {string} agentId - Agent ID
   * @param {object} message - Message from agent
   */
  handleAgentMessage(agentId, message) {
    const agent = this.agentPool.get(agentId);
    if (!agent) return;

    const { type, data } = message;

    switch (type) {
      case 'ready':
        agent.status = 'idle';
        agent.lastHeartbeat = new Date();
        this.logger.debug('Agent ready', { agentId });
        break;

      case 'heartbeat':
        agent.lastHeartbeat = new Date();
        if (data?.status) agent.status = data.status;
        break;

      case 'task_started':
        agent.status = 'working';
        agent.currentTask = data.taskId;
        agent.lastHeartbeat = new Date();
        logAgentActivity(agentId, 'task_started', data);
        break;

      case 'task_completed':
        this.handleTaskCompletion(agentId, data);
        break;

      case 'task_failed':
        this.handleTaskFailure(agentId, data);
        break;

      case 'handoff_request':
        this.handleHandoffRequest(agentId, data);
        break;

      case 'spawn_request':
        this.handleSpawnRequest(agentId, data);
        break;

      case 'log':
        this.logger.info('Agent log', { agentId, ...data });
        break;

      default:
        this.logger.debug('Unknown agent message', { agentId, type, data });
    }
  }

  /**
   * Handle agent task completion
   * @param {string} agentId - Agent ID
   * @param {object} data - Task completion data
   */
  handleTaskCompletion(agentId, data) {
    const agent = this.agentPool.get(agentId);
    if (!agent) return;

    const { taskId, result, duration } = data;

    // Update agent metrics
    agent.metrics.tasksCompleted++;
    agent.metrics.totalTaskTime += duration || 0;
    agent.metrics.averageTaskTime = 
      agent.metrics.totalTaskTime / agent.metrics.tasksCompleted;

    // Reset agent state
    agent.status = 'idle';
    agent.currentTask = null;
    agent.lastHeartbeat = new Date();

    logAgentActivity(agentId, 'task_completed', {
      taskId,
      success: true,
      duration,
      result: result?.status
    });

    // Check for next tasks
    this.processTaskQueue();
  }

  /**
   * Handle agent task failure
   * @param {string} agentId - Agent ID  
   * @param {object} data - Task failure data
   */
  handleTaskFailure(agentId, data) {
    const agent = this.agentPool.get(agentId);
    if (!agent) return;

    const { taskId, error, duration } = data;

    // Update agent metrics
    agent.metrics.tasksFailed++;
    if (duration) {
      agent.metrics.totalTaskTime += duration;
      agent.metrics.averageTaskTime = 
        agent.metrics.totalTaskTime / (agent.metrics.tasksCompleted + agent.metrics.tasksFailed);
    }

    // Reset agent state
    agent.status = 'idle';
    agent.currentTask = null;
    agent.lastHeartbeat = new Date();

    logAgentActivity(agentId, 'task_failed', {
      taskId,
      error,
      duration
    });

    // Re-queue task if retryable
    this.handleTaskRetry(taskId, error);
  }

  /**
   * Handle handoff request from agent
   * @param {string} agentId - Agent ID
   * @param {object} data - Handoff request data
   */
  async handleHandoffRequest(agentId, data) {
    const { toAgentType, taskContext, priority } = data;

    try {
      // Find or spawn target agent
      const targetAgent = await this.findOrSpawnAgent(toAgentType, taskContext);
      
      // Perform handoff through WeTTY server
      await this.wettyServer.performHandoff(
        agentId,
        targetAgent.agentId,
        data.sessionId,
        taskContext
      );

      // Send confirmation back to requesting agent
      this.sendMessageToAgent(agentId, 'handoff_accepted', {
        targetAgent: targetAgent.agentId,
        targetType: toAgentType
      });

    } catch (error) {
      this.logger.error('Handoff request failed', {
        agentId,
        toAgentType,
        error: error.message
      });

      this.sendMessageToAgent(agentId, 'handoff_failed', {
        error: error.message
      });
    }
  }

  /**
   * Handle spawn request from agent
   * @param {string} agentId - Agent ID
   * @param {object} data - Spawn request data
   */
  async handleSpawnRequest(agentId, data) {
    const { agentType, options, reason } = data;

    try {
      const newAgent = await this.spawnAgent(agentType, options);
      
      this.sendMessageToAgent(agentId, 'spawn_success', {
        newAgent: newAgent.agentId,
        agentType,
        reason
      });

      logAgentActivity(agentId, 'spawn_requested', {
        newAgent: newAgent.agentId,
        agentType,
        reason
      });

    } catch (error) {
      this.logger.error('Spawn request failed', {
        agentId,
        agentType,
        error: error.message
      });

      this.sendMessageToAgent(agentId, 'spawn_failed', {
        agentType,
        error: error.message
      });
    }
  }

  /**
   * Handle agent process exit
   * @param {string} agentId - Agent ID
   * @param {number} code - Exit code
   * @param {string} signal - Exit signal
   */
  handleAgentExit(agentId, code, signal) {
    const agent = this.agentPool.get(agentId);
    if (!agent) return;

    this.logger.info('Agent process exited', {
      agentId,
      agentType: agent.agentType,
      code,
      signal,
      pid: agent.pid
    });

    // Update agent status
    agent.status = 'terminated';
    agent.terminatedAt = new Date();
    agent.exitCode = code;
    agent.exitSignal = signal;

    // Cleanup
    this.agentProcesses.delete(agent.pid);

    logAgentActivity(agentId, 'terminated', {
      code,
      signal,
      uptime: agent.terminatedAt - agent.spawnedAt
    });

    // Handle current task if any
    if (agent.currentTask) {
      this.handleTaskRetry(agent.currentTask, 'Agent terminated');
    }

    // Auto-respawn if configured
    if (agent.definition.autoSpawn && code !== 0) {
      setTimeout(() => {
        this.spawnAgent(agent.agentType).catch(error => {
          this.logger.error('Auto-respawn failed', {
            agentType: agent.agentType,
            error: error.message
          });
        });
      }, 5000); // 5 second delay
    }

    // Remove from pool after delay for debugging
    setTimeout(() => {
      this.agentPool.delete(agentId);
    }, 300000); // Keep for 5 minutes
  }

  /**
   * Find available agent or spawn new one
   * @param {string} agentType - Agent type needed
   * @param {object} context - Task context
   * @returns {Promise<object>} Agent information
   */
  async findOrSpawnAgent(agentType, context = {}) {
    // Look for idle agent of requested type
    const idleAgents = this.getAgentsByType(agentType)
      .filter(agent => agent.status === 'idle');

    if (idleAgents.length > 0) {
      // Return least recently used idle agent
      const agent = idleAgents.sort((a, b) => a.lastHeartbeat - b.lastHeartbeat)[0];
      return agent;
    }

    // Spawn new agent if under limits
    return await this.spawnAgent(agentType);
  }

  /**
   * Wait for agent to be ready
   * @param {string} agentId - Agent ID
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<void>}
   */
  async waitForAgentReady(agentId, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        const agent = this.agentPool.get(agentId);
        
        if (!agent) {
          reject(new Error('Agent not found'));
          return;
        }

        if (agent.status === 'idle') {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error('Agent ready timeout'));
          return;
        }

        setTimeout(checkReady, 500);
      };

      checkReady();
    });
  }

  /**
   * Send message to agent process
   * @param {string} agentId - Agent ID
   * @param {string} type - Message type
   * @param {object} data - Message data
   */
  sendMessageToAgent(agentId, type, data = {}) {
    const agent = this.agentPool.get(agentId);
    if (!agent || !agent.process) return false;

    try {
      agent.process.send({ type, data, timestamp: new Date() });
      return true;
    } catch (error) {
      this.logger.error('Failed to send message to agent', {
        agentId,
        type,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Submit task to agent pool
   * @param {object} task - Task object
   * @returns {Promise<string>} Task ID
   */
  async submitTask(task) {
    const taskId = task.id || uuidv4();
    const taskWithId = { ...task, id: taskId, submittedAt: new Date() };

    this.taskQueue.push(taskWithId);
    
    this.logger.info('Task submitted to pool', {
      taskId,
      type: task.type,
      priority: task.priority
    });

    // Immediately try to process
    this.processTaskQueue();

    return taskId;
  }

  /**
   * Start task processing loop
   */
  startTaskProcessing() {
    setInterval(() => {
      this.processTaskQueue();
    }, 1000); // Process every second
  }

  /**
   * Process pending tasks in queue
   */
  processTaskQueue() {
    if (this.taskQueue.length === 0) return;

    // Sort tasks by priority (lower number = higher priority)
    this.taskQueue.sort((a, b) => (a.priority || 5) - (b.priority || 5));

    for (let i = this.taskQueue.length - 1; i >= 0; i--) {
      const task = this.taskQueue[i];
      
      if (this.assignTaskToAgent(task)) {
        this.taskQueue.splice(i, 1);
      }
    }
  }

  /**
   * Assign task to appropriate agent
   * @param {object} task - Task to assign
   * @returns {boolean} Whether task was assigned
   */
  assignTaskToAgent(task) {
    const strategy = this.distributionStrategies[this.currentStrategy];
    const agent = strategy(task);

    if (!agent) return false;

    // Assign task to agent
    agent.status = 'working';
    agent.currentTask = task.id;
    agent.lastHeartbeat = new Date();

    // Send task to agent
    this.sendMessageToAgent(agent.agentId, 'execute_task', task);

    this.logger.info('Task assigned to agent', {
      taskId: task.id,
      agentId: agent.agentId,
      agentType: agent.agentType
    });

    return true;
  }

  /**
   * Round-robin task distribution strategy
   * @param {object} task - Task to distribute
   * @returns {object|null} Selected agent
   */
  roundRobinDistribution(task) {
    const idleAgents = this.getIdleAgents();
    if (idleAgents.length === 0) return null;

    // Simple round-robin selection
    const index = this.roundRobinIndex || 0;
    const agent = idleAgents[index % idleAgents.length];
    this.roundRobinIndex = (index + 1) % idleAgents.length;

    return agent;
  }

  /**
   * Load-balanced task distribution strategy
   * @param {object} task - Task to distribute  
   * @returns {object|null} Selected agent
   */
  loadBalancedDistribution(task) {
    const idleAgents = this.getIdleAgents();
    if (idleAgents.length === 0) return null;

    // Select agent with lowest task count
    return idleAgents.sort((a, b) => 
      a.metrics.tasksCompleted - b.metrics.tasksCompleted
    )[0];
  }

  /**
   * Capability-based task distribution strategy
   * @param {object} task - Task to distribute
   * @returns {object|null} Selected agent
   */
  capabilityBasedDistribution(task) {
    const requiredCapabilities = task.requiredCapabilities || [];
    const preferredAgentType = task.preferredAgentType;

    // First try preferred agent type
    if (preferredAgentType) {
      const typeAgents = this.getAgentsByType(preferredAgentType)
        .filter(agent => agent.status === 'idle');
      if (typeAgents.length > 0) {
        return typeAgents[0];
      }
    }

    // Then try agents with required capabilities
    const capableAgents = this.getIdleAgents()
      .filter(agent => {
        return requiredCapabilities.every(cap => 
          agent.capabilities.has(cap)
        );
      });

    if (capableAgents.length > 0) {
      // Select agent with most matching capabilities
      return capableAgents.sort((a, b) => {
        const aMatches = requiredCapabilities.filter(cap => a.capabilities.has(cap)).length;
        const bMatches = requiredCapabilities.filter(cap => b.capabilities.has(cap)).length;
        return bMatches - aMatches;
      })[0];
    }

    // Fallback to any idle agent
    const idleAgents = this.getIdleAgents();
    return idleAgents.length > 0 ? idleAgents[0] : null;
  }

  /**
   * Handle task retry logic
   * @param {string} taskId - Task ID
   * @param {string} reason - Retry reason
   */
  handleTaskRetry(taskId, reason) {
    // Find task in history or queue
    const task = this.taskQueue.find(t => t.id === taskId);
    
    if (task) {
      task.retryCount = (task.retryCount || 0) + 1;
      task.lastError = reason;

      if (task.retryCount <= 3) { // Max 3 retries
        this.logger.info('Retrying task', { taskId, retryCount: task.retryCount });
        // Task stays in queue for retry
      } else {
        this.logger.error('Task failed permanently', { taskId, reason });
        // Remove from queue
        const index = this.taskQueue.indexOf(task);
        if (index >= 0) {
          this.taskQueue.splice(index, 1);
        }
      }
    }
  }

  /**
   * Terminate agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<void>}
   */
  async terminateAgent(agentId) {
    const agent = this.agentPool.get(agentId);
    if (!agent) return;

    this.logger.info('Terminating agent', { agentId, agentType: agent.agentType });

    try {
      // Send termination signal
      this.sendMessageToAgent(agentId, 'terminate');

      // Wait for graceful shutdown
      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });

      // Force kill if still running
      if (agent.process && !agent.process.killed) {
        agent.process.kill('SIGTERM');
        
        setTimeout(() => {
          if (!agent.process.killed) {
            agent.process.kill('SIGKILL');
          }
        }, 5000);
      }

    } catch (error) {
      this.logger.error('Error terminating agent', {
        agentId,
        error: error.message
      });
    }
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeatMonitoring() {
    setInterval(() => {
      this.checkAgentHeartbeats();
    }, this.heartbeatInterval);
  }

  /**
   * Check agent heartbeats and handle unresponsive agents
   */
  checkAgentHeartbeats() {
    const now = new Date();
    const timeout = this.heartbeatInterval * 3; // 3x heartbeat interval

    for (const [agentId, agent] of this.agentPool.entries()) {
      if (agent.status === 'terminated') continue;

      const timeSinceHeartbeat = now - agent.lastHeartbeat;
      
      if (timeSinceHeartbeat > timeout) {
        this.logger.warn('Agent heartbeat timeout', {
          agentId,
          agentType: agent.agentType,
          timeSinceHeartbeat
        });

        // Mark as unresponsive and potentially restart
        agent.status = 'unresponsive';
        
        logAgentActivity(agentId, 'heartbeat_timeout', {
          timeSinceHeartbeat,
          lastHeartbeat: agent.lastHeartbeat
        });

        // Terminate unresponsive agent
        this.terminateAgent(agentId);
      }
    }
  }

  /**
   * Get agents by type
   * @param {string} agentType - Agent type
   * @returns {Array} Array of agents
   */
  getAgentsByType(agentType) {
    return Array.from(this.agentPool.values())
      .filter(agent => agent.agentType === agentType && agent.status !== 'terminated');
  }

  /**
   * Get idle agents
   * @returns {Array} Array of idle agents
   */
  getIdleAgents() {
    return Array.from(this.agentPool.values())
      .filter(agent => agent.status === 'idle');
  }

  /**
   * Get pool statistics
   * @returns {object} Pool statistics
   */
  getStatistics() {
    const agents = Array.from(this.agentPool.values());
    const activeAgents = agents.filter(a => a.status !== 'terminated');
    
    const typeDistribution = {};
    const statusDistribution = {};
    
    for (const agent of activeAgents) {
      typeDistribution[agent.agentType] = (typeDistribution[agent.agentType] || 0) + 1;
      statusDistribution[agent.status] = (statusDistribution[agent.status] || 0) + 1;
    }

    return {
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      idleAgents: activeAgents.filter(a => a.status === 'idle').length,
      workingAgents: activeAgents.filter(a => a.status === 'working').length,
      unresponsiveAgents: activeAgents.filter(a => a.status === 'unresponsive').length,
      typeDistribution,
      statusDistribution,
      taskQueueLength: this.taskQueue.length,
      maxConcurrentAgents: this.maxConcurrentAgents,
      supportedAgentTypes: Array.from(this.agentTypes.keys()),
      distributionStrategy: this.currentStrategy
    };
  }

  /**
   * Stop the agent pool manager
   */
  async stop() {
    this.logger.info('Stopping Agent Pool Manager');

    // Terminate all agents gracefully
    const terminationPromises = Array.from(this.agentPool.keys())
      .map(agentId => this.terminateAgent(agentId));

    await Promise.all(terminationPromises);

    logSystemEvent('agent_pool_manager_stopped', {
      terminatedAgents: terminationPromises.length
    });
  }
}