# Octopi Neural Mesh: WebSockets & AI Pipeline Architecture

## Overview

This document provides a deep review of how WebSockets and AI pipelines are connected in the Octopi Neural Mesh system. The architecture enables real-time, bidirectional communication between terminal sessions and AI-powered agents.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OCTOPI NEURAL MESH                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌────────────────────────┐ │
│  │   Client/Web    │────▶│   Socket.IO     │────▶│    WeTTY Server        │ │
│  │   Terminal      │◀────│   WebSocket     │◀────│  (wetty-server.js)     │ │
│  └─────────────────┘     │   Layer         │     │                        │ │
│                          └─────────────────┘     │  - Express HTTP        │ │
│                                 │                │  - Socket.IO Events    │ │
│                                 │                │  - PTY Management      │ │
│                                 │                │  - Session Tracking    │ │
│                                 │                └──────────┬─────────────┘ │
│                                 │                           │               │
│                                 ▼                           ▼               │
│                          ┌─────────────────┐     ┌────────────────────────┐ │
│                          │  Agent Session  │◀───▶│  Terminal Multiplexer  │ │
│                          │(agent-session.js)│    │(terminal-multiplexer.js)│ │
│                          │                 │     │                        │ │
│                          │ - State mgmt    │     │ - Shared sessions      │ │
│                          │ - Capabilities  │     │ - Handoff support      │ │
│                          │ - Task tracking │     │ - Buffer management    │ │
│                          └─────────────────┘     └────────────────────────┘ │
│                                 │                           │               │
│                                 ▼                           │               │
│                          ┌─────────────────────────────────────────────────┐│
│                          │            Agent Pool Manager                   ││
│                          │          (agent-pool-manager.js)                ││
│                          │                                                 ││
│                          │  - Agent lifecycle management                   ││
│                          │  - Task distribution (round-robin, load-based)  ││
│                          │  - Process spawning with IPC                    ││
│                          │  - Heartbeat monitoring                         ││
│                          └──────────────────────┬──────────────────────────┘│
│                                                 │                           │
│            ┌────────────────────────────────────┼───────────────────────────┤
│            │                                    │                           │
│            ▼                                    ▼                           │
│  ┌────────────────────┐             ┌────────────────────────────────────┐  │
│  │    Agent Base      │             │         SPECIALIZED AGENTS         │  │
│  │  (agent-base.js)   │             ├────────────────────────────────────┤  │
│  │                    │             │ ┌──────────────┐ ┌──────────────┐  │  │
│  │ - AI API calls     │             │ │ Coordinator  │ │   Research   │  │  │
│  │ - Process comms    │             │ │   Agent      │ │    Agent     │  │  │
│  │ - Heartbeat        │             │ └──────────────┘ └──────────────┘  │  │
│  │ - Task execution   │             │ ┌──────────────┐ ┌──────────────┐  │  │
│  └────────────────────┘             │ │    Code      │ │    DevOps    │  │  │
│            │                        │ │   Agent      │ │    Agent     │  │  │
│            │                        │ └──────────────┘ └──────────────┘  │  │
│            │                        │ ┌──────────────┐                   │  │
│            │                        │ │ Replication  │                   │  │
│            │                        │ │   Agent      │                   │  │
│            │                        │ └──────────────┘                   │  │
│            │                        └────────────────────────────────────┘  │
│            │                                                                │
│            ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                          AI PIPELINE                                    ││
│  │                        (config.js + agent-base.js)                      ││
│  │                                                                         ││
│  │  ┌─────────────────────┐         ┌─────────────────────┐               ││
│  │  │    Primary AI       │  ──▶    │    Fallback AI      │               ││
│  │  │    (OpenAI)         │ (fail)  │   (OpenRouter)      │               ││
│  │  │                     │         │                     │               ││
│  │  │ - GPT-4 Turbo       │         │ - Claude 3 Sonnet   │               ││
│  │  │ - 4096 max tokens   │         │ - 4096 max tokens   │               ││
│  │  │ - Temp: 0.7         │         │ - Temp: 0.7         │               ││
│  │  └─────────────────────┘         └─────────────────────┘               ││
│  │                                                                         ││
│  │  Features:                                                              ││
│  │  - Automatic failover with retry logic (3 attempts)                     ││
│  │  - Environment variable substitution for API keys                       ││
│  │  - Function calling support                                             ││
│  │  - Request timeout handling (30s default)                               ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Connection Flow

### 1. WebSocket Connection Lifecycle

```
Client → Socket.IO Connection → WeTTY Server
                                    │
                                    ├─ 'connection' event
                                    │   └─ Generate session ID (UUID)
                                    │
                                    ├─ 'agent_identify' event
                                    │   └─ Create/Update AgentSession
                                    │   └─ Join agent-specific rooms
                                    │   └─ Emit 'identification_confirmed'
                                    │
                                    ├─ 'spawn_terminal' event
                                    │   └─ Create PTY process with node-pty
                                    │   └─ Setup terminal event handlers
                                    │   └─ Store in activeTerminals Map
                                    │
                                    ├─ 'terminal_input' event
                                    │   └─ Write to PTY terminal
                                    │
                                    ├─ 'request_handoff' event
                                    │   └─ Find/spawn target agent
                                    │   └─ Transfer session ownership
                                    │   └─ Emit 'session_transferred' / 'session_received'
                                    │
                                    └─ 'disconnect' event
                                        └─ Grace period (5 min) for reconnection
                                        └─ Cleanup terminal if not reconnected
```

### 2. AI Pipeline Flow

```
Agent Task Request
       │
       ▼
┌─────────────────┐
│   AgentBase     │
│   callAI()      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    Retry Loop (max 3)                    │
│                                                          │
│  Attempt 1: Primary Endpoint (OpenAI)                    │
│       │                                                  │
│       └─ Success? Return response                        │
│       └─ Failure? Log warning, continue                  │
│                                                          │
│  Attempt 2+: Fallback Endpoint (OpenRouter)              │
│       │                                                  │
│       └─ Success? Return response                        │
│       └─ Failure? Wait (1s × attempt), retry             │
│                                                          │
│  All attempts failed: Throw error                        │
└─────────────────────────────────────────────────────────┘
```

### 3. Agent Task Processing Flow

```
Task Submission (Agent Pool Manager)
       │
       ▼
┌─────────────────────────────────────┐
│     Task Queue (Priority sorted)    │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│    Distribution Strategy            │
│    (capability-based default)       │
│                                     │
│    Strategies:                      │
│    - round-robin                    │
│    - load-balanced                  │
│    - capability-based               │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│    Selected Agent (via IPC)         │
│                                     │
│    process.send({                   │
│      type: 'execute_task',          │
│      data: task                     │
│    })                               │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│    Agent processTask()              │
│                                     │
│    - May call AI API                │
│    - May request handoff            │
│    - May spawn new agents           │
│                                     │
│    Reports back via IPC:            │
│    - task_started                   │
│    - task_completed                 │
│    - task_failed                    │
│    - handoff_request                │
└─────────────────────────────────────┘
```

## Key Connection Points

### 1. WebSocket ↔ Agent Session

**Location**: `src/server/wetty-server.js` lines 139-178

```javascript
this.io.on('connection', (socket) => {
  const sessionId = uuidv4();
  
  socket.on('agent_identify', (data) => {
    this.handleAgentIdentification(socket, sessionId, data);
  });
  
  socket.on('spawn_terminal', (data) => {
    this.handleTerminalSpawn(socket, sessionId, data);
  });
  
  socket.on('request_handoff', (data) => {
    this.handleHandoffRequest(socket, sessionId, data);
  });
});
```

### 2. Agent Pool ↔ Agent Processes (IPC)

**Location**: `src/server/agent-pool-manager.js` lines 274-310

```javascript
setupAgentProcessHandlers(agent) {
  agentProcess.on('message', (message) => {
    this.handleAgentMessage(agentId, message);
  });
}

handleAgentMessage(agentId, message) {
  switch (type) {
    case 'ready': // Agent initialized
    case 'heartbeat': // Health check
    case 'task_started': // Task in progress
    case 'task_completed': // Task done
    case 'task_failed': // Task error
    case 'handoff_request': // Wants to transfer
    case 'spawn_request': // Wants new agent
  }
}
```

### 3. Agent ↔ AI API

**Location**: `src/shared/agent-base.js` lines 368-426

```javascript
async callAI(messages, functions = null, options = {}) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const endpoint = attempt === 1 
      ? this.aiEndpoints.primary 
      : this.aiEndpoints.fallback;
    
    const response = await axios.post(endpoint.url, payload, {
      headers: {
        'Authorization': `Bearer ${endpoint.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: this.config.ai.timeout || 30000
    });
    
    return response.data;
  }
}
```

### 4. Terminal Multiplexer ↔ Handoff System

**Location**: `src/server/terminal-multiplexer.js` lines 350-448

```javascript
async handoffSession(sessionId, fromAgentId, toAgentId, context) {
  // Capture terminal state
  const terminalState = await this.captureTerminalState(sessionId);
  
  // Notify outgoing agent
  this.sendToAgent(fromAgentId, 'handoff_initiated', {...});
  
  // Promote new agent
  session.primaryAgent = toAgentId;
  
  // Notify incoming agent
  this.sendToAgent(toAgentId, 'handoff_received', {...});
}
```

## Configuration Integration

### AI Endpoint Configuration (`config/config.example.json`)

```json
{
  "ai": {
    "primary": "openai",
    "fallback": "openrouter",
    "retryAttempts": 3,
    "timeout": 30000,
    "endpoints": {
      "openai": {
        "url": "https://api.openai.com/v1/chat/completions",
        "model": "gpt-4-turbo-preview",
        "apiKey": "${OPENAI_API_KEY}",
        "maxTokens": 4096
      },
      "openrouter": {
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "model": "anthropic/claude-3-sonnet",
        "apiKey": "${OPENROUTER_API_KEY}",
        "maxTokens": 4096
      }
    }
  }
}
```

### Environment Variable Substitution (`src/shared/config.js`)

```javascript
function substituteEnvVars(value) {
  if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
    const envVar = value.slice(2, -1);
    return process.env[envVar] || value;
  }
  // Recursively process objects and arrays
}
```

## Security Considerations

1. **JWT Authentication**: Configured in `security.authentication.jwtSecret`
2. **Rate Limiting**: Configured in `security.rateLimiting`
3. **Command Whitelist**: DevOps agent limits executable commands
4. **CORS Configuration**: Express middleware with environment-based settings
5. **CSP Headers**: Helmet middleware with strict directives

## Logging & Monitoring

All connections are logged via Winston logger:

- **System events**: `logSystemEvent()` for server-level actions
- **Agent activities**: `logAgentActivity()` for agent-specific actions
- **Audit trail**: Configurable in `logging.auditTrail`

## Testing Recommendations

1. **WebSocket Connection Tests**: Verify Socket.IO event handling
2. **AI Failover Tests**: Ensure fallback to secondary provider
3. **Handoff Tests**: Validate session transfer between agents
4. **IPC Tests**: Verify agent-pool communication
5. **Integration Tests**: End-to-end task execution

## Summary

The Octopi Neural Mesh provides a fully connected architecture where:

✅ **WebSockets** (Socket.IO) enable real-time bidirectional communication  
✅ **Terminal sessions** are managed via PTY with multiplexer support  
✅ **AI pipelines** have failover capability with multiple providers  
✅ **Agent pool** orchestrates specialized agents via IPC  
✅ **Handoff system** enables seamless agent-to-agent task transfer  
✅ **Configuration** supports environment variable substitution  
✅ **Logging** provides comprehensive audit trails

All components are interconnected and operational for multi-agent terminal coordination.
