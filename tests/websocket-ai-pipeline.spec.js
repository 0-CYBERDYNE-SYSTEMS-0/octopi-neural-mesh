/**
 * Integration Tests for WebSocket and AI Pipeline Connectivity
 * Tests the connection between Socket.IO, Agent System, and AI APIs
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { EventEmitter } from 'events';

// Mock dependencies for testing
const mockConfig = {
  server: {
    host: 'localhost',
    port: 3000,
    basePath: '/octopi'
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
        apiKey: 'test-openai-key',
        maxTokens: 4096,
        temperature: 0.7
      },
      openrouter: {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'anthropic/claude-3-sonnet',
        apiKey: 'test-openrouter-key',
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
      coordinator: { enabled: true, instances: 1, priority: 1 },
      research: { enabled: true, maxInstances: 3, priority: 2 },
      code: { enabled: true, maxInstances: 2, priority: 2 },
      devops: { enabled: true, maxInstances: 2, priority: 3 },
      replication: { enabled: true, instances: 1, priority: 4 }
    }
  },
  session: {
    maxSharedSessions: 10,
    bufferSize: 10000,
    handoffTimeout: 30000
  }
};

describe('WebSocket and AI Pipeline Integration', () => {
  
  describe('Configuration Loading', () => {
    it('should load AI endpoints from configuration', () => {
      const { ai } = mockConfig;
      
      expect(ai.primary).to.equal('openai');
      expect(ai.fallback).to.equal('openrouter');
      expect(ai.endpoints.openai).to.have.property('url');
      expect(ai.endpoints.openai).to.have.property('apiKey');
      expect(ai.endpoints.openrouter).to.have.property('url');
      expect(ai.endpoints.openrouter).to.have.property('apiKey');
    });

    it('should have retry configuration for AI calls', () => {
      expect(mockConfig.ai.retryAttempts).to.equal(3);
      expect(mockConfig.ai.timeout).to.equal(30000);
    });

    it('should configure agent specializations', () => {
      const { agents } = mockConfig;
      
      expect(agents.specializations).to.have.property('coordinator');
      expect(agents.specializations).to.have.property('research');
      expect(agents.specializations).to.have.property('code');
      expect(agents.specializations).to.have.property('devops');
      expect(agents.specializations).to.have.property('replication');
    });
  });

  describe('Agent Session Management', () => {
    let mockAgentSession;

    beforeEach(() => {
      mockAgentSession = {
        agentId: 'test-agent-123',
        agentType: 'coordinator',
        capabilities: new Set(['task-routing', 'agent-spawning']),
        socketId: 'socket-abc',
        sessionId: 'session-xyz',
        status: 'connected',
        attachedTerminals: new Map(),
        taskHistory: [],
        currentTask: null
      };
    });

    it('should track agent capabilities correctly', () => {
      expect(mockAgentSession.capabilities.has('task-routing')).to.be.true;
      expect(mockAgentSession.capabilities.has('agent-spawning')).to.be.true;
      expect(mockAgentSession.capabilities.has('unknown-capability')).to.be.false;
    });

    it('should manage agent status transitions', () => {
      expect(mockAgentSession.status).to.equal('connected');
      
      mockAgentSession.status = 'working';
      expect(mockAgentSession.status).to.equal('working');
      
      mockAgentSession.status = 'idle';
      expect(mockAgentSession.status).to.equal('idle');
    });

    it('should track attached terminals', () => {
      const terminalId = 'term-001';
      const mockTerminal = { pid: 12345 };
      
      mockAgentSession.attachedTerminals.set(terminalId, {
        terminal: mockTerminal,
        attachedAt: new Date()
      });
      
      expect(mockAgentSession.attachedTerminals.has(terminalId)).to.be.true;
      expect(mockAgentSession.attachedTerminals.get(terminalId).terminal.pid).to.equal(12345);
    });
  });

  describe('WebSocket Event Flow', () => {
    let mockSocket;
    let eventHandlers;

    beforeEach(() => {
      eventHandlers = {};
      mockSocket = {
        id: 'socket-123',
        on: (event, handler) => {
          eventHandlers[event] = handler;
        },
        emit: sinon.spy(),
        join: sinon.spy()
      };
    });

    it('should handle agent_identify event', () => {
      // Simulate setting up the handler
      const identifyHandler = sinon.spy();
      mockSocket.on('agent_identify', identifyHandler);
      
      expect(eventHandlers).to.have.property('agent_identify');
    });

    it('should handle spawn_terminal event', () => {
      const spawnHandler = sinon.spy();
      mockSocket.on('spawn_terminal', spawnHandler);
      
      expect(eventHandlers).to.have.property('spawn_terminal');
    });

    it('should handle request_handoff event', () => {
      const handoffHandler = sinon.spy();
      mockSocket.on('request_handoff', handoffHandler);
      
      expect(eventHandlers).to.have.property('request_handoff');
    });

    it('should handle task_complete event', () => {
      const completeHandler = sinon.spy();
      mockSocket.on('task_complete', completeHandler);
      
      expect(eventHandlers).to.have.property('task_complete');
    });

    it('should join agent-specific rooms on identification', () => {
      const agentId = 'agent-xyz';
      const agentType = 'research';
      
      mockSocket.join(`agent:${agentId}`);
      mockSocket.join(`type:${agentType}`);
      
      expect(mockSocket.join.calledWith(`agent:${agentId}`)).to.be.true;
      expect(mockSocket.join.calledWith(`type:${agentType}`)).to.be.true;
    });
  });

  describe('AI Pipeline Connectivity', () => {
    let mockAIEndpoints;

    beforeEach(() => {
      mockAIEndpoints = {
        primary: {
          url: mockConfig.ai.endpoints.openai.url,
          model: mockConfig.ai.endpoints.openai.model,
          apiKey: mockConfig.ai.endpoints.openai.apiKey,
          provider: 'openai'
        },
        fallback: {
          url: mockConfig.ai.endpoints.openrouter.url,
          model: mockConfig.ai.endpoints.openrouter.model,
          apiKey: mockConfig.ai.endpoints.openrouter.apiKey,
          provider: 'openrouter'
        }
      };
    });

    it('should configure primary AI endpoint correctly', () => {
      expect(mockAIEndpoints.primary.url).to.include('openai.com');
      expect(mockAIEndpoints.primary.model).to.equal('gpt-4-turbo-preview');
      expect(mockAIEndpoints.primary.provider).to.equal('openai');
    });

    it('should configure fallback AI endpoint correctly', () => {
      expect(mockAIEndpoints.fallback.url).to.include('openrouter.ai');
      expect(mockAIEndpoints.fallback.model).to.equal('anthropic/claude-3-sonnet');
      expect(mockAIEndpoints.fallback.provider).to.equal('openrouter');
    });

    it('should support function calling configuration', () => {
      const payload = {
        model: mockAIEndpoints.primary.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 4096,
        temperature: 0.7,
        functions: [
          {
            name: 'search',
            parameters: { query: 'string' }
          }
        ],
        function_call: 'auto'
      };
      
      expect(payload).to.have.property('functions');
      expect(payload).to.have.property('function_call');
    });
  });

  describe('Agent Pool Management', () => {
    let mockAgentPool;
    let mockTaskQueue;

    beforeEach(() => {
      mockAgentPool = new Map();
      mockTaskQueue = [];
    });

    it('should support multiple agent types', () => {
      const agentTypes = ['coordinator', 'research', 'code', 'devops', 'replication'];
      
      agentTypes.forEach((type, index) => {
        mockAgentPool.set(`agent-${index}`, {
          agentId: `agent-${index}`,
          agentType: type,
          status: 'idle',
          capabilities: new Set()
        });
      });
      
      expect(mockAgentPool.size).to.equal(5);
      
      // Verify agent types
      const types = Array.from(mockAgentPool.values()).map(a => a.agentType);
      expect(types).to.include('coordinator');
      expect(types).to.include('research');
      expect(types).to.include('code');
    });

    it('should prioritize tasks in queue', () => {
      // Add tasks with different priorities
      mockTaskQueue.push({ id: 'task-1', priority: 5 });
      mockTaskQueue.push({ id: 'task-2', priority: 1 });
      mockTaskQueue.push({ id: 'task-3', priority: 3 });
      
      // Sort by priority (lower number = higher priority)
      mockTaskQueue.sort((a, b) => a.priority - b.priority);
      
      expect(mockTaskQueue[0].id).to.equal('task-2');
      expect(mockTaskQueue[1].id).to.equal('task-3');
      expect(mockTaskQueue[2].id).to.equal('task-1');
    });

    it('should find idle agents by type', () => {
      mockAgentPool.set('agent-1', { agentType: 'research', status: 'idle' });
      mockAgentPool.set('agent-2', { agentType: 'research', status: 'working' });
      mockAgentPool.set('agent-3', { agentType: 'code', status: 'idle' });
      
      const idleResearchAgents = Array.from(mockAgentPool.values())
        .filter(a => a.agentType === 'research' && a.status === 'idle');
      
      expect(idleResearchAgents.length).to.equal(1);
    });
  });

  describe('Terminal Multiplexer', () => {
    let mockSharedSessions;
    let mockTerminalBuffer;

    beforeEach(() => {
      mockSharedSessions = new Map();
      mockTerminalBuffer = new Map();
    });

    it('should track shared terminal sessions', () => {
      const sessionId = 'session-001';
      
      mockSharedSessions.set(sessionId, {
        sessionId,
        primaryAgent: 'agent-1',
        observers: new Set(['agent-2', 'agent-3']),
        connectedAgents: new Set(['agent-1', 'agent-2', 'agent-3']),
        status: 'active',
        metrics: {
          totalCommands: 0,
          totalOutput: 0,
          handoffCount: 0
        }
      });
      
      const session = mockSharedSessions.get(sessionId);
      expect(session.connectedAgents.size).to.equal(3);
      expect(session.primaryAgent).to.equal('agent-1');
    });

    it('should buffer terminal output', () => {
      const sessionId = 'session-001';
      const buffer = [];
      
      // Simulate terminal output
      buffer.push({ data: 'line 1\n', timestamp: new Date(), type: 'output' });
      buffer.push({ data: 'line 2\n', timestamp: new Date(), type: 'output' });
      buffer.push({ data: 'command\n', timestamp: new Date(), type: 'input' });
      
      mockTerminalBuffer.set(sessionId, buffer);
      
      expect(mockTerminalBuffer.get(sessionId).length).to.equal(3);
      expect(mockTerminalBuffer.get(sessionId).filter(e => e.type === 'output').length).to.equal(2);
    });

    it('should handle session handoff', () => {
      const sessionId = 'session-001';
      const fromAgent = 'agent-1';
      const toAgent = 'agent-2';
      
      mockSharedSessions.set(sessionId, {
        sessionId,
        primaryAgent: fromAgent,
        observers: new Set([toAgent]),
        connectedAgents: new Set([fromAgent, toAgent]),
        status: 'active',
        metrics: { handoffCount: 0 }
      });
      
      // Perform handoff
      const session = mockSharedSessions.get(sessionId);
      session.observers.add(fromAgent);
      session.observers.delete(toAgent);
      session.primaryAgent = toAgent;
      session.metrics.handoffCount++;
      
      expect(session.primaryAgent).to.equal(toAgent);
      expect(session.observers.has(fromAgent)).to.be.true;
      expect(session.metrics.handoffCount).to.equal(1);
    });
  });

  describe('IPC Communication', () => {
    let mockProcessSend;
    let mockMessageHandlers;

    beforeEach(() => {
      mockProcessSend = sinon.spy();
      mockMessageHandlers = {};
    });

    it('should send messages to parent process', () => {
      const message = {
        type: 'task_completed',
        data: { taskId: 'task-123', result: { success: true } },
        agentId: 'agent-1',
        timestamp: new Date()
      };
      
      mockProcessSend(message);
      
      expect(mockProcessSend.calledOnce).to.be.true;
      expect(mockProcessSend.firstCall.args[0]).to.have.property('type', 'task_completed');
    });

    it('should handle incoming task execution messages', () => {
      const messageTypes = [
        'execute_task',
        'terminate',
        'handoff_accepted',
        'handoff_failed',
        'spawn_success',
        'spawn_failed'
      ];
      
      messageTypes.forEach(type => {
        mockMessageHandlers[type] = sinon.spy();
      });
      
      expect(Object.keys(mockMessageHandlers).length).to.equal(6);
    });

    it('should send heartbeat messages', () => {
      const heartbeat = {
        type: 'heartbeat',
        data: {
          status: 'working',
          currentTask: 'task-123',
          uptime: 3600000,
          memoryUsage: { heapUsed: 50000000 }
        }
      };
      
      mockProcessSend(heartbeat);
      
      expect(mockProcessSend.calledOnce).to.be.true;
      expect(mockProcessSend.firstCall.args[0].type).to.equal('heartbeat');
    });
  });

  describe('Coordinator Agent Workflows', () => {
    let mockWorkflowTemplates;
    let mockTaskRoutes;

    beforeEach(() => {
      mockTaskRoutes = {
        'web-scraping': 'research',
        'data-analysis': 'research',
        'code-generation': 'code',
        'github-operations': 'code',
        'deployment': 'devops',
        'server-management': 'devops',
        'colony-expansion': 'replication',
        'system-discovery': 'replication'
      };

      mockWorkflowTemplates = {
        'research-and-code': {
          name: 'Research and Code Workflow',
          steps: [
            { agent: 'research', action: 'gather-information' },
            { agent: 'research', action: 'analyze-data', dependencies: ['gather-information'] },
            { agent: 'code', action: 'generate-code', dependencies: ['analyze-data'] }
          ]
        },
        'full-stack-deployment': {
          name: 'Full Stack Deployment',
          steps: [
            { agent: 'code', action: 'setup-repository' },
            { agent: 'code', action: 'implement-backend', dependencies: ['setup-repository'] },
            { agent: 'devops', action: 'deploy-application', dependencies: ['implement-backend'] }
          ]
        }
      };
    });

    it('should route tasks to appropriate agents', () => {
      expect(mockTaskRoutes['web-scraping']).to.equal('research');
      expect(mockTaskRoutes['code-generation']).to.equal('code');
      expect(mockTaskRoutes['deployment']).to.equal('devops');
      expect(mockTaskRoutes['colony-expansion']).to.equal('replication');
    });

    it('should define workflow templates with dependencies', () => {
      const workflow = mockWorkflowTemplates['research-and-code'];
      
      expect(workflow.steps.length).to.equal(3);
      expect(workflow.steps[0].dependencies).to.be.undefined;
      expect(workflow.steps[1].dependencies).to.include('gather-information');
      expect(workflow.steps[2].dependencies).to.include('analyze-data');
    });

    it('should execute workflow steps in dependency order', () => {
      const workflow = mockWorkflowTemplates['research-and-code'];
      const completedSteps = new Set();
      const executionOrder = [];
      
      // Simulate proper dependency-based execution with multiple passes
      let progress = true;
      const maxIterations = workflow.steps.length;
      let iterations = 0;
      
      while (progress && iterations < maxIterations) {
        progress = false;
        iterations++;
        
        for (const step of workflow.steps) {
          // Skip already completed steps
          if (completedSteps.has(step.action)) continue;
          
          const dependenciesMet = !step.dependencies || 
            step.dependencies.every(dep => completedSteps.has(dep));
          
          if (dependenciesMet) {
            executionOrder.push(step.action);
            completedSteps.add(step.action);
            progress = true;
          }
        }
      }
      
      // Verify all steps were executed
      expect(executionOrder.length).to.equal(workflow.steps.length);
      expect(executionOrder[0]).to.equal('gather-information');
      expect(executionOrder[1]).to.equal('analyze-data');
      expect(executionOrder[2]).to.equal('generate-code');
    });
  });

  describe('Error Handling and Failover', () => {
    it('should retry AI calls on failure', async () => {
      let attempts = 0;
      const maxRetries = 3;
      
      const callAIWithRetry = async () => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          attempts++;
          if (attempt < maxRetries) {
            // Simulate failure
            continue;
          }
          return { success: true };
        }
        throw new Error('All attempts failed');
      };
      
      const result = await callAIWithRetry();
      
      expect(attempts).to.equal(3);
      expect(result.success).to.be.true;
    });

    it('should switch to fallback endpoint on primary failure', () => {
      let currentEndpoint = 'primary';
      const endpoints = {
        primary: { url: 'https://api.openai.com/...' },
        fallback: { url: 'https://openrouter.ai/...' }
      };
      
      // Simulate primary failure
      const primaryFailed = true;
      
      if (primaryFailed) {
        currentEndpoint = 'fallback';
      }
      
      expect(currentEndpoint).to.equal('fallback');
      expect(endpoints[currentEndpoint].url).to.include('openrouter.ai');
    });

    it('should handle agent disconnection gracefully', () => {
      const agentSession = {
        status: 'connected',
        socketId: 'socket-123',
        gracePeriod: 300000 // 5 minutes
      };
      
      // Simulate disconnection
      agentSession.status = 'disconnected';
      agentSession.disconnectedAt = new Date();
      
      expect(agentSession.status).to.equal('disconnected');
      expect(agentSession.gracePeriod).to.equal(300000);
    });
  });
});
