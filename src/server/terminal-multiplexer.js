/**
 * Terminal Multiplexer
 * Advanced terminal session sharing and coordination for multi-agent handoffs
 */

import { spawn } from 'child_process';
import pty from 'node-pty';
import { v4 as uuidv4 } from 'uuid';
import { getLogger, logSystemEvent } from '../shared/logger.js';

/**
 * Terminal Multiplexer Class
 * Manages shared terminal sessions that can be handed off between agents
 */
export class TerminalMultiplexer {
  constructor(config) {
    this.config = config;
    this.logger = getLogger();
    
    // Terminal session tracking
    this.sharedSessions = new Map();
    this.sessionHandoffs = new Map();
    this.terminalBuffer = new Map(); // Store terminal buffers for handoffs
    
    // Configuration
    this.maxSharedSessions = config.session?.maxSharedSessions || 10;
    this.bufferSize = config.session?.bufferSize || 10000; // lines
    this.handoffTimeout = config.session?.handoffTimeout || 30000; // 30 seconds
    
    logSystemEvent('terminal_multiplexer_initialized', {
      maxSharedSessions: this.maxSharedSessions,
      bufferSize: this.bufferSize
    });
  }

  /**
   * Create a new shared terminal session
   * @param {string} sessionId - Unique session identifier
   * @param {object} options - Terminal options
   * @returns {Promise<object>} Terminal session info
   */
  async createSharedSession(sessionId, options = {}) {
    if (this.sharedSessions.has(sessionId)) {
      throw new Error(`Shared session already exists: ${sessionId}`);
    }

    const {
      command = '/bin/bash',
      args = [],
      cwd = process.cwd(),
      env = {},
      cols = 80,
      rows = 24
    } = options;

    try {
      // Create PTY terminal
      const terminal = pty.spawn(command, args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env: {
          ...process.env,
          OCTOPI_SHARED_SESSION: sessionId,
          OCTOPI_SESSION_TYPE: 'shared',
          ...env
        }
      });

      // Initialize session tracking
      const session = {
        sessionId,
        terminal,
        createdAt: new Date(),
        lastActivity: new Date(),
        connectedAgents: new Set(),
        primaryAgent: null,
        observers: new Set(),
        status: 'active',
        buffer: [],
        metrics: {
          totalCommands: 0,
          totalOutput: 0,
          handoffCount: 0
        }
      };

      // Setup terminal event handlers
      this.setupTerminalHandlers(session);
      
      // Store session
      this.sharedSessions.set(sessionId, session);
      this.terminalBuffer.set(sessionId, []);

      this.logger.info('Shared terminal session created', {
        sessionId,
        command,
        pid: terminal.pid
      });

      return {
        sessionId,
        pid: terminal.pid,
        status: 'ready'
      };

    } catch (error) {
      this.logger.error('Failed to create shared session', {
        error: error.message,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Setup terminal event handlers for a session
   * @param {object} session - Session object
   */
  setupTerminalHandlers(session) {
    const { sessionId, terminal } = session;

    // Handle terminal output
    terminal.onData((data) => {
      this.handleTerminalOutput(sessionId, data);
    });

    // Handle terminal exit
    terminal.onExit(({ exitCode, signal }) => {
      this.handleTerminalExit(sessionId, exitCode, signal);
    });

    // Handle terminal errors
    terminal.on('error', (error) => {
      this.logger.error('Terminal error', { 
        sessionId, 
        error: error.message 
      });
    });
  }

  /**
   * Handle terminal output and distribution
   * @param {string} sessionId - Session ID
   * @param {string} data - Terminal output data
   */
  handleTerminalOutput(sessionId, data) {
    const session = this.sharedSessions.get(sessionId);
    if (!session) return;

    // Update session activity
    session.lastActivity = new Date();
    session.metrics.totalOutput += data.length;

    // Add to buffer (with size limit)
    const buffer = this.terminalBuffer.get(sessionId) || [];
    buffer.push({
      data,
      timestamp: new Date(),
      type: 'output'
    });

    // Trim buffer if it exceeds size limit
    if (buffer.length > this.bufferSize) {
      buffer.splice(0, buffer.length - this.bufferSize);
    }

    this.terminalBuffer.set(sessionId, buffer);

    // Distribute output to connected agents
    this.distributeOutput(sessionId, data);
  }

  /**
   * Handle terminal exit
   * @param {string} sessionId - Session ID
   * @param {number} exitCode - Exit code
   * @param {string} signal - Exit signal
   */
  handleTerminalExit(sessionId, exitCode, signal) {
    const session = this.sharedSessions.get(sessionId);
    if (!session) return;

    session.status = 'terminated';
    session.exitCode = exitCode;
    session.exitSignal = signal;
    session.terminatedAt = new Date();

    this.logger.info('Shared terminal session terminated', {
      sessionId,
      exitCode,
      signal,
      connectedAgents: session.connectedAgents.size
    });

    // Notify all connected agents
    this.notifySessionExit(sessionId, { exitCode, signal });

    // Cleanup after delay
    setTimeout(() => {
      this.cleanupSession(sessionId);
    }, 60000); // Keep for 1 minute for final handoffs
  }

  /**
   * Distribute terminal output to connected agents
   * @param {string} sessionId - Session ID
   * @param {string} data - Output data
   */
  distributeOutput(sessionId, data) {
    const session = this.sharedSessions.get(sessionId);
    if (!session) return;

    // Send to primary agent first
    if (session.primaryAgent) {
      this.sendToAgent(session.primaryAgent, 'terminal_output', {
        sessionId,
        data,
        timestamp: new Date()
      });
    }

    // Send to observers
    for (const agentId of session.observers) {
      if (agentId !== session.primaryAgent) {
        this.sendToAgent(agentId, 'terminal_output', {
          sessionId,
          data,
          timestamp: new Date(),
          readonly: true
        });
      }
    }
  }

  /**
   * Connect agent to shared session
   * @param {string} sessionId - Session ID
   * @param {string} agentId - Agent ID
   * @param {string} role - Agent role ('primary', 'observer')
   * @returns {Promise<object>} Connection info
   */
  async connectAgent(sessionId, agentId, role = 'observer') {
    const session = this.sharedSessions.get(sessionId);
    if (!session) {
      throw new Error(`Shared session not found: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`Session is not active: ${session.status}`);
    }

    // Add agent to session
    session.connectedAgents.add(agentId);

    if (role === 'primary') {
      // Only one primary agent at a time
      if (session.primaryAgent && session.primaryAgent !== agentId) {
        // Demote current primary to observer
        session.observers.add(session.primaryAgent);
      }
      session.primaryAgent = agentId;
      session.observers.delete(agentId); // Remove from observers if was there
    } else {
      session.observers.add(agentId);
    }

    session.lastActivity = new Date();

    this.logger.info('Agent connected to shared session', {
      sessionId,
      agentId,
      role,
      totalConnected: session.connectedAgents.size
    });

    // Send current terminal buffer to the connecting agent
    const buffer = this.terminalBuffer.get(sessionId) || [];
    const recentBuffer = buffer.slice(-100); // Last 100 entries

    this.sendToAgent(agentId, 'session_connected', {
      sessionId,
      role,
      pid: session.terminal.pid,
      buffer: recentBuffer,
      readonly: role === 'observer'
    });

    return {
      sessionId,
      role,
      connected: true,
      bufferSize: recentBuffer.length
    };
  }

  /**
   * Disconnect agent from shared session
   * @param {string} sessionId - Session ID
   * @param {string} agentId - Agent ID
   */
  async disconnectAgent(sessionId, agentId) {
    const session = this.sharedSessions.get(sessionId);
    if (!session) return;

    session.connectedAgents.delete(agentId);
    session.observers.delete(agentId);

    // Handle primary agent disconnection
    if (session.primaryAgent === agentId) {
      session.primaryAgent = null;
      
      // Promote an observer to primary if available
      if (session.observers.size > 0) {
        const newPrimary = Array.from(session.observers)[0];
        session.primaryAgent = newPrimary;
        session.observers.delete(newPrimary);
        
        this.sendToAgent(newPrimary, 'promoted_to_primary', {
          sessionId,
          reason: 'primary_disconnected'
        });
      }
    }

    this.logger.info('Agent disconnected from shared session', {
      sessionId,
      agentId,
      remainingConnected: session.connectedAgents.size
    });

    // Cleanup session if no agents connected
    if (session.connectedAgents.size === 0) {
      setTimeout(() => {
        if (session.connectedAgents.size === 0) {
          this.terminateSession(sessionId);
        }
      }, 30000); // 30 second grace period
    }
  }

  /**
   * Handoff session control between agents
   * @param {string} sessionId - Session ID
   * @param {string} fromAgentId - Current primary agent
   * @param {string} toAgentId - New primary agent
   * @param {object} context - Handoff context
   * @returns {Promise<object>} Handoff result
   */
  async handoffSession(sessionId, fromAgentId, toAgentId, context = {}) {
    const session = this.sharedSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.primaryAgent !== fromAgentId) {
      throw new Error(`Agent ${fromAgentId} is not the primary agent`);
    }

    if (!session.connectedAgents.has(toAgentId)) {
      throw new Error(`Target agent ${toAgentId} is not connected to session`);
    }

    const handoffId = uuidv4();

    try {
      // Store handoff information
      this.sessionHandoffs.set(handoffId, {
        sessionId,
        fromAgentId,
        toAgentId,
        context,
        startedAt: new Date(),
        status: 'in_progress'
      });

      // Get current terminal state
      const terminalState = await this.captureTerminalState(sessionId);

      // Notify outgoing primary agent
      this.sendToAgent(fromAgentId, 'handoff_initiated', {
        sessionId,
        handoffId,
        toAgentId,
        context,
        terminalState
      });

      // Promote new primary agent
      session.primaryAgent = toAgentId;
      session.observers.delete(toAgentId);
      session.observers.add(fromAgentId);
      session.metrics.handoffCount++;

      // Notify incoming primary agent
      this.sendToAgent(toAgentId, 'handoff_received', {
        sessionId,
        handoffId,
        fromAgentId,
        context,
        terminalState,
        role: 'primary'
      });

      // Complete handoff
      const handoff = this.sessionHandoffs.get(handoffId);
      handoff.status = 'completed';
      handoff.completedAt = new Date();

      this.logger.info('Session handoff completed', {
        sessionId,
        handoffId,
        fromAgentId,
        toAgentId,
        duration: handoff.completedAt - handoff.startedAt
      });

      logSystemEvent('session_handoff_completed', {
        sessionId,
        fromAgent: fromAgentId,
        toAgent: toAgentId,
        context
      });

      return {
        handoffId,
        sessionId,
        success: true,
        newPrimary: toAgentId
      };

    } catch (error) {
      const handoff = this.sessionHandoffs.get(handoffId);
      if (handoff) {
        handoff.status = 'failed';
        handoff.error = error.message;
      }

      this.logger.error('Session handoff failed', {
        sessionId,
        handoffId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Send input to shared terminal session
   * @param {string} sessionId - Session ID
   * @param {string} input - Input data
   * @param {string} fromAgentId - Agent sending input
   */
  async sendInput(sessionId, input, fromAgentId) {
    const session = this.sharedSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Only primary agent can send input
    if (session.primaryAgent !== fromAgentId) {
      throw new Error(`Only primary agent can send input to session`);
    }

    if (session.status !== 'active') {
      throw new Error(`Session is not active: ${session.status}`);
    }

    // Send input to terminal
    session.terminal.write(input);
    session.lastActivity = new Date();
    session.metrics.totalCommands++;

    // Add to buffer
    const buffer = this.terminalBuffer.get(sessionId) || [];
    buffer.push({
      data: input,
      timestamp: new Date(),
      type: 'input',
      agentId: fromAgentId
    });

    this.terminalBuffer.set(sessionId, buffer);

    this.logger.debug('Input sent to shared session', {
      sessionId,
      fromAgentId,
      inputLength: input.length
    });
  }

  /**
   * Resize shared terminal session
   * @param {string} sessionId - Session ID
   * @param {number} cols - Terminal columns
   * @param {number} rows - Terminal rows
   */
  async resizeSession(sessionId, cols, rows) {
    const session = this.sharedSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.terminal.resize(cols, rows);
    session.lastActivity = new Date();

    this.logger.debug('Shared session resized', {
      sessionId,
      cols,
      rows
    });
  }

  /**
   * Capture current terminal state for handoffs
   * @param {string} sessionId - Session ID
   * @returns {Promise<object>} Terminal state
   */
  async captureTerminalState(sessionId) {
    const session = this.sharedSessions.get(sessionId);
    if (!session) return null;

    try {
      // Get current working directory
      const cwd = await this.getTerminalCwd(session.terminal.pid);
      
      // Get environment variables (simplified)
      const env = process.env; // Would need better implementation
      
      // Get recent command history
      const buffer = this.terminalBuffer.get(sessionId) || [];
      const recentCommands = buffer
        .filter(entry => entry.type === 'input')
        .slice(-10)
        .map(entry => entry.data);

      return {
        cwd,
        pid: session.terminal.pid,
        recentCommands,
        timestamp: new Date(),
        bufferSize: buffer.length
      };

    } catch (error) {
      this.logger.warn('Could not capture terminal state', {
        sessionId,
        error: error.message
      });
      
      return {
        pid: session.terminal.pid,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Get terminal current working directory
   * @param {number} pid - Process ID
   * @returns {Promise<string>} Current working directory
   */
  async getTerminalCwd(pid) {
    return new Promise((resolve) => {
      const child = spawn('lsof', ['-p', pid.toString(), '-d', 'cwd'], {
        stdio: ['ignore', 'pipe', 'ignore']
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', () => {
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.includes('cwd')) {
            const parts = line.split(/\s+/);
            resolve(parts[parts.length - 1]);
            return;
          }
        }
        resolve(process.cwd()); // Fallback
      });

      child.on('error', () => {
        resolve(process.cwd()); // Fallback
      });
    });
  }

  /**
   * Terminate shared session
   * @param {string} sessionId - Session ID
   */
  async terminateSession(sessionId) {
    const session = this.sharedSessions.get(sessionId);
    if (!session) return;

    this.logger.info('Terminating shared session', {
      sessionId,
      connectedAgents: session.connectedAgents.size
    });

    // Notify all connected agents
    this.notifySessionExit(sessionId, { reason: 'terminated' });

    // Kill terminal
    try {
      session.terminal.kill();
    } catch (error) {
      this.logger.warn('Error killing terminal', { error: error.message });
    }

    // Cleanup
    this.cleanupSession(sessionId);
  }

  /**
   * Notify agents of session exit
   * @param {string} sessionId - Session ID
   * @param {object} exitInfo - Exit information
   */
  notifySessionExit(sessionId, exitInfo) {
    const session = this.sharedSessions.get(sessionId);
    if (!session) return;

    for (const agentId of session.connectedAgents) {
      this.sendToAgent(agentId, 'session_terminated', {
        sessionId,
        ...exitInfo
      });
    }
  }

  /**
   * Send message to agent (placeholder - would integrate with agent communication)
   * @param {string} agentId - Agent ID
   * @param {string} type - Message type
   * @param {object} data - Message data
   */
  sendToAgent(agentId, type, data) {
    // This would integrate with the main agent communication system
    this.logger.debug('Message to agent', { agentId, type, data });
  }

  /**
   * Cleanup session resources
   * @param {string} sessionId - Session ID
   */
  cleanupSession(sessionId) {
    this.sharedSessions.delete(sessionId);
    this.terminalBuffer.delete(sessionId);

    // Cleanup related handoffs
    for (const [handoffId, handoff] of this.sessionHandoffs.entries()) {
      if (handoff.sessionId === sessionId) {
        this.sessionHandoffs.delete(handoffId);
      }
    }

    logSystemEvent('session_cleaned_up', { sessionId });
  }

  /**
   * Get multiplexer statistics
   * @returns {object} Statistics
   */
  getStatistics() {
    const sessions = Array.from(this.sharedSessions.values());
    
    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active').length,
      terminatedSessions: sessions.filter(s => s.status === 'terminated').length,
      totalConnectedAgents: sessions.reduce((sum, s) => sum + s.connectedAgents.size, 0),
      totalHandoffs: sessions.reduce((sum, s) => sum + s.metrics.handoffCount, 0),
      averageAgentsPerSession: sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + s.connectedAgents.size, 0) / sessions.length
        : 0,
      maxSharedSessions: this.maxSharedSessions,
      bufferSize: this.bufferSize
    };
  }

  /**
   * List all shared sessions
   * @returns {Array} Array of session summaries
   */
  listSessions() {
    return Array.from(this.sharedSessions.values()).map(session => ({
      sessionId: session.sessionId,
      status: session.status,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      connectedAgents: Array.from(session.connectedAgents),
      primaryAgent: session.primaryAgent,
      observers: Array.from(session.observers),
      metrics: session.metrics
    }));
  }
}