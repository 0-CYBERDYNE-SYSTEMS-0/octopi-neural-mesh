/**
 * Agent Session Management
 * Tracks individual agent sessions, their state, and terminal attachments
 */

import { v4 as uuidv4 } from 'uuid';
import { getLogger, logAgentActivity } from '../shared/logger.js';

/**
 * Agent Session Class
 * Manages the state and lifecycle of an individual agent session
 */
export class AgentSession {
  constructor({
    agentId,
    agentType,
    capabilities = [],
    socketId,
    sessionId
  }) {
    this.agentId = agentId;
    this.agentType = agentType;
    this.capabilities = new Set(capabilities);
    this.socketId = socketId;
    this.sessionId = sessionId;
    
    // Session state
    this.status = 'connected';
    this.createdAt = new Date();
    this.lastActivity = new Date();
    this.currentTask = null;
    
    // Terminal management
    this.attachedTerminals = new Map();
    this.terminalHistory = [];
    
    // Task management
    this.taskHistory = [];
    this.completedTasks = 0;
    this.failedTasks = 0;
    
    // Agent metadata
    this.metadata = {};
    
    this.logger = getLogger();
    
    this.logger.info('Agent session created', {
      agentId: this.agentId,
      agentType: this.agentType,
      sessionId: this.sessionId
    });
  }

  /**
   * Attach a terminal to this agent session
   * @param {string} terminalId - Terminal session ID
   * @param {object} terminal - PTY terminal instance
   */
  attachTerminal(terminalId, terminal) {
    this.attachedTerminals.set(terminalId, {
      terminal,
      attachedAt: new Date(),
      lastUsed: new Date()
    });
    
    this.terminalHistory.push({
      action: 'attached',
      terminalId,
      timestamp: new Date()
    });
    
    this.updateActivity();
    
    logAgentActivity(this.agentId, 'terminal_attached', { 
      terminalId,
      totalTerminals: this.attachedTerminals.size
    });
  }

  /**
   * Detach a terminal from this agent session
   * @param {string} terminalId - Terminal session ID
   */
  detachTerminal(terminalId) {
    const terminal = this.attachedTerminals.get(terminalId);
    if (terminal) {
      this.attachedTerminals.delete(terminalId);
      
      this.terminalHistory.push({
        action: 'detached',
        terminalId,
        timestamp: new Date(),
        duration: new Date() - terminal.attachedAt
      });
      
      logAgentActivity(this.agentId, 'terminal_detached', { 
        terminalId,
        duration: new Date() - terminal.attachedAt,
        remainingTerminals: this.attachedTerminals.size
      });
    }
  }

  /**
   * Set current task for this agent
   * @param {object} task - Task object
   */
  setCurrentTask(task) {
    this.currentTask = task;
    this.status = 'working';
    this.updateActivity();
    
    if (task) {
      this.taskHistory.push({
        ...task,
        startedAt: new Date(),
        status: 'in_progress'
      });
      
      logAgentActivity(this.agentId, 'task_started', {
        taskId: task.id,
        taskType: task.type,
        priority: task.priority
      });
    }
  }

  /**
   * Complete current task
   * @param {string} taskId - Task identifier
   * @param {object} result - Task result
   */
  completeTask(taskId, result) {
    if (this.currentTask && this.currentTask.id === taskId) {
      const task = this.taskHistory.find(t => t.id === taskId);
      if (task) {
        task.status = result.success ? 'completed' : 'failed';
        task.completedAt = new Date();
        task.result = result;
        task.duration = task.completedAt - task.startedAt;
        
        if (result.success) {
          this.completedTasks++;
        } else {
          this.failedTasks++;
        }
      }
      
      this.currentTask = null;
      this.status = 'idle';
      this.updateActivity();
      
      logAgentActivity(this.agentId, 'task_completed', {
        taskId,
        success: result.success,
        duration: task?.duration,
        totalCompleted: this.completedTasks,
        totalFailed: this.failedTasks
      });
    }
  }

  /**
   * Set agent as idle
   */
  setIdle() {
    this.status = 'idle';
    this.currentTask = null;
    this.updateActivity();
  }

  /**
   * Set agent as disconnected
   */
  setDisconnected() {
    this.status = 'disconnected';
    this.updateActivity();
    
    logAgentActivity(this.agentId, 'disconnected', {
      attachedTerminals: this.attachedTerminals.size,
      sessionDuration: new Date() - this.createdAt
    });
  }

  /**
   * Reconnect agent with new socket
   * @param {string} newSocketId - New socket ID
   */
  reconnect(newSocketId) {
    this.socketId = newSocketId;
    this.status = 'connected';
    this.updateActivity();
    
    logAgentActivity(this.agentId, 'reconnected', {
      newSocketId,
      attachedTerminals: this.attachedTerminals.size
    });
  }

  /**
   * Check if agent has a specific capability
   * @param {string} capability - Capability to check
   * @returns {boolean}
   */
  hasCapability(capability) {
    return this.capabilities.has(capability);
  }

  /**
   * Add capability to agent
   * @param {string} capability - Capability to add
   */
  addCapability(capability) {
    this.capabilities.add(capability);
    logAgentActivity(this.agentId, 'capability_added', { capability });
  }

  /**
   * Remove capability from agent
   * @param {string} capability - Capability to remove
   */
  removeCapability(capability) {
    this.capabilities.delete(capability);
    logAgentActivity(this.agentId, 'capability_removed', { capability });
  }

  /**
   * Check if agent has any attached terminals
   * @returns {boolean}
   */
  hasAttachedTerminals() {
    return this.attachedTerminals.size > 0;
  }

  /**
   * Check if agent has specific terminal session
   * @param {string} terminalId - Terminal ID to check
   * @returns {boolean}
   */
  hasSession(terminalId) {
    return this.attachedTerminals.has(terminalId);
  }

  /**
   * Check if agent is idle and available for work
   * @returns {boolean}
   */
  isIdle() {
    return this.status === 'idle' && this.currentTask === null;
  }

  /**
   * Check if agent is currently working
   * @returns {boolean}
   */
  isWorking() {
    return this.status === 'working' && this.currentTask !== null;
  }

  /**
   * Check if agent is connected
   * @returns {boolean}
   */
  isConnected() {
    return this.status === 'connected' || this.status === 'idle' || this.status === 'working';
  }

  /**
   * Get agent performance metrics
   * @returns {object} Performance metrics
   */
  getMetrics() {
    const sessionDuration = new Date() - this.createdAt;
    const taskCompletionRate = this.completedTasks / (this.completedTasks + this.failedTasks) || 0;
    
    return {
      sessionDuration,
      totalTasks: this.taskHistory.length,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      taskCompletionRate,
      attachedTerminals: this.attachedTerminals.size,
      lastActivity: this.lastActivity,
      averageTaskDuration: this.getAverageTaskDuration()
    };
  }

  /**
   * Calculate average task duration
   * @returns {number} Average duration in milliseconds
   */
  getAverageTaskDuration() {
    const completedTasks = this.taskHistory.filter(t => t.status === 'completed' && t.duration);
    if (completedTasks.length === 0) return 0;
    
    const totalDuration = completedTasks.reduce((sum, task) => sum + task.duration, 0);
    return totalDuration / completedTasks.length;
  }

  /**
   * Get current task summary
   * @returns {object|null} Current task summary or null
   */
  getCurrentTaskSummary() {
    if (!this.currentTask) return null;
    
    const task = this.taskHistory.find(t => t.id === this.currentTask.id);
    if (!task) return null;
    
    return {
      id: task.id,
      type: task.type,
      priority: task.priority,
      startedAt: task.startedAt,
      duration: new Date() - task.startedAt,
      status: task.status
    };
  }

  /**
   * Set agent metadata
   * @param {string} key - Metadata key
   * @param {any} value - Metadata value
   */
  setMetadata(key, value) {
    this.metadata[key] = value;
    this.updateActivity();
  }

  /**
   * Get agent metadata
   * @param {string} key - Metadata key
   * @returns {any} Metadata value
   */
  getMetadata(key) {
    return this.metadata[key];
  }

  /**
   * Update last activity timestamp
   */
  updateActivity() {
    this.lastActivity = new Date();
  }

  /**
   * Get agent session summary
   * @returns {object} Session summary
   */
  toJSON() {
    return {
      agentId: this.agentId,
      agentType: this.agentType,
      capabilities: Array.from(this.capabilities),
      status: this.status,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      currentTask: this.getCurrentTaskSummary(),
      attachedTerminals: this.attachedTerminals.size,
      metrics: this.getMetrics(),
      metadata: this.metadata
    };
  }
}