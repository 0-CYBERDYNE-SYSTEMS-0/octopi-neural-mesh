# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Octopi WeTTY System is a self-replicating multi-agent terminal coordination system that uses WeTTY (Web + TTY) as the coordination layer for autonomous agents. The system enables terminal-native coordination where agents can take over terminal sessions, hand off tasks to specialized agents, and coordinate across distributed systems.

## Common Development Commands

### Core Operations
- `npm run dev` - Start development server with nodemon auto-reload
- `npm start` - Start production server
- `npm run build` - Build the project using custom build script
- `npm test` - Run Mocha test suite

### Agent Operations
- `npm run agents:start` - Start the coordinator agent directly
- `npm run colony:spawn` - Spawn new colony nodes across systems

### Configuration
- Copy `config/config.example.json` to `config/config.json`
- Set required environment variables: `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `JWT_SECRET`

## Architecture Overview

### Multi-Agent Coordination System
The system operates with a hierarchical agent structure:
- **Coordinator Agent** - Master orchestrator for task routing and workflow management
- **Research Agent** - Web scraping, data analysis, information gathering
- **Code Agent** - Development, GitHub integration, file operations
- **DevOps Agent** - Server management, deployment, monitoring
- **Replication Agent** - Self-spawning, colony expansion, system discovery

### Core Components

#### Server Architecture (`src/server/`)
- **WeTTY Server** (`wetty-server.js`) - Web-based terminal access with Express and Socket.IO
- **Agent Pool Manager** (`agent-pool-manager.js`) - Manages concurrent agent instances and routing
- **Session Manager** (`session-manager.js`) - Handles terminal session persistence and handoffs
- **Terminal Multiplexer** (`terminal-multiplexer.js`) - Manages multiple terminal sessions (tmux integration)
- **Agent Session** (`agent-session.js`) - Individual agent session management

#### Agent System (`src/agents/`)
- **Coordinator** (`coordinator.js`) - Task routing, workflow execution, multi-agent planning
- **Agent Base** (`src/shared/agent-base.js`) - Common agent functionality and capabilities

#### Shared Components (`src/shared/`)
- **Configuration** (`config.js`) - Config loading with environment variable substitution
- **Logger** (`logger.js`) - Winston-based logging with audit trails

#### Client Architecture (`src/client/`)
Currently minimal - the system primarily operates server-side with terminal interfaces.

### Key Features

#### Task Routing and Workflows
- Intelligent task routing based on capability matching
- Pre-defined workflow templates for complex multi-step operations:
  - `research-and-code` - Research topic and create implementation
  - `full-stack-deployment` - Complete application development and deployment
  - `colony-expansion` - System discovery and agent deployment
  - `data-pipeline` - Multi-source data extraction and analysis

#### Agent Handoff System
Agents can seamlessly transfer control of terminal sessions:
- Context preservation during handoffs
- Task continuation across agent transitions
- Priority-based agent allocation

#### Self-Replication Capabilities
- Automatic system discovery (SSH scan, Docker discovery)
- Dynamic agent spawning based on workload
- Colony health monitoring and optimization
- Resource-based expansion triggers

## Configuration System

### Environment Variables
- `OPENAI_API_KEY` - OpenAI API access (required)
- `OPENROUTER_API_KEY` - OpenRouter fallback API (required)  
- `JWT_SECRET` - JWT token signing secret (required)
- `NODE_ENV` - Environment mode
- `HOST`, `PORT` - Server binding configuration
- `LOG_LEVEL` - Logging verbosity
- `MAX_CONCURRENT_AGENTS` - Agent pool size limit

### Configuration Structure
- **AI Endpoints** - Primary/fallback AI provider configuration
- **Agent Specializations** - Per-agent type settings and limits
- **Replication Settings** - Colony expansion rules and triggers
- **Security** - Authentication, authorization, and rate limiting
- **Session Management** - Terminal multiplexer and persistence settings
- **Monitoring** - Health checks and metrics collection

## Development Workflow

### Local Development
1. Copy configuration: `cp config/config.example.json config/config.json`
2. Set environment variables in `.env`
3. Install dependencies: `npm install` 
4. Start development server: `npm run dev`
5. Access terminal interface at `http://localhost:3000/octopi`

### Agent Development
- Extend `AgentBase` class for new agent types
- Implement required methods: `processTask()`, `initialize()`, `cleanup()`
- Add capability declarations and specialized terminal commands
- Register agent in configuration `agents.specializations`

### Testing
- Test files use `.spec.js` extension with Mocha framework
- Run tests: `npm test`
- Tests located in `tests/` directory

## Security Considerations

- JWT-based authentication for agent communication
- Role-based authorization (admin, coordinator, agent)
- Rate limiting on API endpoints
- Comprehensive audit logging of all agent actions
- Sandboxed execution environments for agent operations

## Multi-System Deployment

### Colony Expansion
The replication system can automatically discover and deploy to new systems:
- Configure target systems in `config.json` `replication.targetSystems`
- Enable replication: `replication.enabled: true`
- System automatically monitors load and spawns new colonies when thresholds are exceeded

### Session Management
- tmux-based session multiplexing
- Persistent sessions survive server restarts
- Agent handoffs preserve terminal state and history
- Configurable idle timeout and maximum sessions

## Important Implementation Details

- Uses ES modules (`type: "module"` in package.json)
- Node.js 18+ required
- Express server with Socket.IO for real-time communication
- Winston logging with file rotation
- JWT tokens for secure agent communication
- Graceful shutdown handlers for clean termination
- Environment variable substitution in configuration files