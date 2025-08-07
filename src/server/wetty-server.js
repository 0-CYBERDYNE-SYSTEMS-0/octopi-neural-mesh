/**
 * Enhanced WeTTY Server with Multi-Agent Coordination
 * Extends basic WeTTY functionality with agent handoff capabilities
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import pty from 'node-pty';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { getLogger, logSystemEvent, logAgentActivity } from '../shared/logger.js';
import { AgentSession } from './agent-session.js';
import { SessionManager } from './session-manager.js';
import { TerminalMultiplexer } from './terminal-multiplexer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Enhanced WeTTY Server with Multi-Agent Support
 */
export class WeTTYServer {
  constructor(config) {
    this.config = config;
    this.logger = getLogger();
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      path: `${config.server.basePath}/socket.io`,
      cors: { origin: "*", methods: ["GET", "POST"] }
    });
    
    // Agent and session management
    this.sessionManager = new SessionManager(config);
    this.terminalMux = new TerminalMultiplexer(config);
    this.agentSessions = new Map();
    this.activeTerminals = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    
    logSystemEvent('wetty_server_initialized', {
      basePath: config.server.basePath,
      agentSupportEnabled: true
    });
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' ? false : true,
      credentials: true
    }));

    // JSON parsing
    this.app.use(express.json());
    this.app.use(express.static(resolve(__dirname, '../../client/dist')));
  }

  /**
   * Setup HTTP routes
   */
  setupRoutes() {
    const basePath = this.config.server.basePath;

    // Main terminal interface
    this.app.get(`${basePath}/`, (req, res) => {
      res.sendFile(resolve(__dirname, '../../client/dist/index.html'));
    });

    // Agent terminal interface
    this.app.get(`${basePath}/agent/:agentId`, (req, res) => {
      const { agentId } = req.params;
      this.logger.info('Agent terminal access', { agentId });
      res.sendFile(resolve(__dirname, '../../client/dist/agent.html'));
    });

    // Health check
    this.app.get(`${basePath}/health`, (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        activeSessions: this.agentSessions.size,
        activeTerminals: this.activeTerminals.size
      });
    });

    // Agent management API
    this.app.get(`${basePath}/api/agents`, (req, res) => {
      const agents = Array.from(this.agentSessions.entries()).map(([id, session]) => ({
        id,
        type: session.agentType,
        status: session.status,
        currentTask: session.currentTask,
        lastActivity: session.lastActivity
      }));
      res.json({ agents });
    });

    // Session handoff API
    this.app.post(`${basePath}/api/handoff`, async (req, res) => {
      const { fromAgent, toAgent, sessionId, context } = req.body;
      
      try {
        await this.performHandoff(fromAgent, toAgent, sessionId, context);
        res.json({ success: true });
      } catch (error) {
        this.logger.error('Handoff failed', { error: error.message, fromAgent, toAgent });
        res.status(500).json({ error: error.message });
      }
    });
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      const sessionId = uuidv4();
      this.logger.info('New connection', { sessionId, socketId: socket.id });

      // Agent identification
      socket.on('agent_identify', (data) => {
        this.handleAgentIdentification(socket, sessionId, data);
      });

      // Terminal spawn request
      socket.on('spawn_terminal', (data) => {
        this.handleTerminalSpawn(socket, sessionId, data);
      });

      // Terminal input
      socket.on('terminal_input', (data) => {
        this.handleTerminalInput(socket, sessionId, data);
      });

      // Terminal resize
      socket.on('terminal_resize', (data) => {
        this.handleTerminalResize(socket, sessionId, data);
      });

      // Agent handoff request
      socket.on('request_handoff', (data) => {
        this.handleHandoffRequest(socket, sessionId, data);
      });

      // Task completion
      socket.on('task_complete', (data) => {
        this.handleTaskCompletion(socket, sessionId, data);
      });

      // Disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket, sessionId);
      });
    });
  }

  /**
   * Handle agent identification
   */
  async handleAgentIdentification(socket, sessionId, data) {
    const { agentId, agentType, capabilities } = data;
    
    this.logger.info('Agent identification', { 
      sessionId, agentId, agentType, capabilities 
    });

    // Create or update agent session
    const agentSession = new AgentSession({
      agentId,
      agentType,
      capabilities,
      socketId: socket.id,
      sessionId
    });

    this.agentSessions.set(agentId, agentSession);
    
    // Join agent-specific room
    socket.join(`agent:${agentId}`);
    socket.join(`type:${agentType}`);
    
    socket.emit('identification_confirmed', {
      agentId,
      sessionId,
      availableSessions: await this.getAvailableSessions(agentType)
    });

    logAgentActivity(agentId, 'identified', { agentType, capabilities });
  }

  /**
   * Handle terminal spawn
   */
  async handleTerminalSpawn(socket, sessionId, data) {
    const { agentId, command, env, workingDir } = data;
    
    this.logger.info('Terminal spawn request', { 
      sessionId, agentId, command, workingDir 
    });

    try {
      // Check for existing session to attach to
      let terminal;
      const existingSession = data.attachToSession;
      
      if (existingSession) {
        terminal = await this.terminalMux.attachToSession(existingSession);
        this.logger.info('Attached to existing terminal session', { 
          sessionId, existingSession 
        });
      } else {
        // Create new terminal
        const terminalOptions = {
          name: 'xterm-256color',
          cols: 80,
          rows: 24,
          cwd: workingDir || process.cwd(),
          env: { 
            ...process.env, 
            OCTOPI_AGENT_ID: agentId,
            OCTOPI_SESSION_ID: sessionId,
            ...env 
          }
        };

        terminal = pty.spawn(
          command || this.config.wetty.command || '/bin/bash',
          [],
          terminalOptions
        );

        // Store terminal reference
        this.activeTerminals.set(sessionId, {
          terminal,
          agentId,
          createdAt: new Date(),
          lastActivity: new Date()
        });

        this.logger.info('New terminal spawned', { 
          sessionId, agentId, pid: terminal.pid 
        });
      }

      // Setup terminal event handlers
      terminal.onData((data) => {
        socket.emit('terminal_output', { data });
        this.updateLastActivity(sessionId);
      });

      terminal.onExit(({ exitCode, signal }) => {
        this.logger.info('Terminal exited', { 
          sessionId, exitCode, signal 
        });
        socket.emit('terminal_exit', { exitCode, signal });
        this.cleanupTerminal(sessionId);
      });

      socket.emit('terminal_spawned', {
        sessionId,
        pid: terminal.pid,
        attached: Boolean(existingSession)
      });

      // Update agent session
      if (this.agentSessions.has(agentId)) {
        const agentSession = this.agentSessions.get(agentId);
        agentSession.attachTerminal(sessionId, terminal);
      }

      logAgentActivity(agentId, 'terminal_spawned', { sessionId, pid: terminal.pid });

    } catch (error) {
      this.logger.error('Terminal spawn failed', { 
        error: error.message, sessionId, agentId 
      });
      socket.emit('spawn_error', { error: error.message });
    }
  }

  /**
   * Handle terminal input
   */
  handleTerminalInput(socket, sessionId, data) {
    const terminal = this.activeTerminals.get(sessionId);
    
    if (terminal) {
      terminal.terminal.write(data.input);
      this.updateLastActivity(sessionId);
    } else {
      this.logger.warn('Terminal input for non-existent session', { sessionId });
    }
  }

  /**
   * Handle terminal resize
   */
  handleTerminalResize(socket, sessionId, data) {
    const terminal = this.activeTerminals.get(sessionId);
    
    if (terminal) {
      terminal.terminal.resize(data.cols, data.rows);
      this.logger.debug('Terminal resized', { 
        sessionId, cols: data.cols, rows: data.rows 
      });
    }
  }

  /**
   * Handle handoff request
   */
  async handleHandoffRequest(socket, sessionId, data) {
    const { toAgentType, taskContext, priority } = data;
    
    try {
      const fromAgent = this.getAgentBySession(sessionId);
      if (!fromAgent) {
        throw new Error('Source agent not found');
      }

      this.logger.info('Handoff requested', {
        fromAgent: fromAgent.agentId,
        toAgentType,
        sessionId,
        priority
      });

      // Find available agent of target type or spawn new one
      const targetAgent = await this.findOrSpawnAgent(toAgentType, taskContext);
      
      await this.performHandoff(
        fromAgent.agentId,
        targetAgent.agentId,
        sessionId,
        taskContext
      );

      socket.emit('handoff_accepted', {
        targetAgent: targetAgent.agentId,
        newSessionId: targetAgent.sessionId
      });

    } catch (error) {
      this.logger.error('Handoff request failed', { 
        error: error.message, sessionId 
      });
      socket.emit('handoff_failed', { error: error.message });
    }
  }

  /**
   * Handle task completion
   */
  handleTaskCompletion(socket, sessionId, data) {
    const { taskId, result, nextTask } = data;
    
    const agent = this.getAgentBySession(sessionId);
    if (agent) {
      agent.completeTask(taskId, result);
      
      this.logger.info('Task completed', {
        agentId: agent.agentId,
        taskId,
        sessionId
      });

      logAgentActivity(agent.agentId, 'task_completed', { 
        taskId, result: result?.status 
      });

      // Handle next task or prepare for handoff
      if (nextTask) {
        agent.setCurrentTask(nextTask);
      } else {
        agent.setIdle();
      }
    }
  }

  /**
   * Handle disconnection
   */
  handleDisconnection(socket, sessionId) {
    this.logger.info('Socket disconnected', { sessionId, socketId: socket.id });

    // Find and update agent session
    for (const [agentId, agentSession] of this.agentSessions.entries()) {
      if (agentSession.socketId === socket.id) {
        agentSession.setDisconnected();
        logAgentActivity(agentId, 'disconnected', { sessionId });
        
        // Keep session alive for potential reconnection
        setTimeout(() => {
          if (agentSession.status === 'disconnected') {
            this.agentSessions.delete(agentId);
            this.cleanupTerminal(sessionId);
          }
        }, 300000); // 5 minute grace period
        
        break;
      }
    }
  }

  /**
   * Perform agent handoff
   */
  async performHandoff(fromAgentId, toAgentId, sessionId, context) {
    const fromAgent = this.agentSessions.get(fromAgentId);
    const toAgent = this.agentSessions.get(toAgentId);

    if (!fromAgent || !toAgent) {
      throw new Error('Source or target agent not found');
    }

    this.logger.info('Performing handoff', {
      fromAgentId, toAgentId, sessionId
    });

    // Transfer session ownership
    const terminal = this.activeTerminals.get(sessionId);
    if (terminal) {
      // Update terminal ownership
      terminal.agentId = toAgentId;
      
      // Disconnect from old agent socket
      this.io.to(fromAgent.socketId).emit('session_transferred', {
        sessionId,
        toAgent: toAgentId
      });

      // Connect to new agent socket  
      this.io.to(toAgent.socketId).emit('session_received', {
        sessionId,
        fromAgent: fromAgentId,
        context,
        terminalInfo: {
          pid: terminal.terminal.pid,
          cwd: await this.getTerminalCwd(terminal.terminal)
        }
      });

      // Update agent sessions
      fromAgent.detachTerminal(sessionId);
      toAgent.attachTerminal(sessionId, terminal.terminal);
      toAgent.setCurrentTask(context?.task);
    }

    logAgentActivity(fromAgentId, 'handoff_completed', {
      toAgent: toAgentId, sessionId, context
    });
  }

  /**
   * Find available agent or spawn new one
   */
  async findOrSpawnAgent(agentType, taskContext) {
    // Look for idle agent of the requested type
    for (const [agentId, session] of this.agentSessions.entries()) {
      if (session.agentType === agentType && session.isIdle()) {
        return session;
      }
    }

    // TODO: Implement agent spawning
    // For now, return null - this would trigger agent pool manager
    throw new Error(`No available ${agentType} agent found`);
  }

  /**
   * Get available sessions for agent type
   */
  async getAvailableSessions(agentType) {
    const sessions = [];
    
    for (const [sessionId, terminal] of this.activeTerminals.entries()) {
      // Check if session can be shared with this agent type
      if (this.canShareSession(sessionId, agentType)) {
        sessions.push({
          sessionId,
          agentId: terminal.agentId,
          createdAt: terminal.createdAt,
          lastActivity: terminal.lastActivity
        });
      }
    }
    
    return sessions;
  }

  /**
   * Check if session can be shared
   */
  canShareSession(sessionId, agentType) {
    // Implement session sharing logic based on agent types
    // For now, allow sharing for research and code agents
    const shareableTypes = ['research', 'code'];
    return shareableTypes.includes(agentType);
  }

  /**
   * Get agent by session ID
   */
  getAgentBySession(sessionId) {
    for (const [agentId, session] of this.agentSessions.entries()) {
      if (session.hasSession(sessionId)) {
        return session;
      }
    }
    return null;
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity(sessionId) {
    const terminal = this.activeTerminals.get(sessionId);
    if (terminal) {
      terminal.lastActivity = new Date();
    }
  }

  /**
   * Get terminal current working directory
   */
  async getTerminalCwd(terminal) {
    try {
      // Use lsof to get cwd of the terminal process
      const { stdout } = spawn('lsof', ['-p', terminal.pid, '-d', 'cwd'], {
        stdio: ['pipe', 'pipe', 'ignore']
      });
      
      // Parse lsof output to extract cwd
      const lines = stdout.toString().split('\n');
      for (const line of lines) {
        if (line.includes('cwd')) {
          const parts = line.split(/\s+/);
          return parts[parts.length - 1];
        }
      }
    } catch (error) {
      this.logger.warn('Could not get terminal cwd', { error: error.message });
    }
    
    return process.cwd(); // Fallback
  }

  /**
   * Cleanup terminal session
   */
  cleanupTerminal(sessionId) {
    const terminal = this.activeTerminals.get(sessionId);
    if (terminal) {
      try {
        terminal.terminal.kill();
      } catch (error) {
        this.logger.warn('Error killing terminal', { error: error.message });
      }
      this.activeTerminals.delete(sessionId);
    }
  }

  /**
   * Start the server
   */
  async start() {
    const { host, port } = this.config.server;
    
    return new Promise((resolve) => {
      this.server.listen(port, host, () => {
        this.logger.info('Octopi WeTTY Server started', { 
          host, port, basePath: this.config.server.basePath 
        });
        logSystemEvent('server_started', { host, port });
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop() {
    // Cleanup all terminals
    for (const sessionId of this.activeTerminals.keys()) {
      this.cleanupTerminal(sessionId);
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        this.logger.info('Octopi WeTTY Server stopped');
        logSystemEvent('server_stopped');
        resolve();
      });
    });
  }
}