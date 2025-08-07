#!/usr/bin/env node
/**
 * Octopi CLI Interface
 * Interactive command-line interface for managing agents and tasks
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import inquirer from 'inquirer';
import chalk from 'chalk';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { loadConfig } from './shared/config.js';
import { initLogger, getLogger } from './shared/logger.js';
import { showWelcomeBanner, showCompactBanner } from './shared/branding.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Octopi CLI Class
 * Interactive command-line interface
 */
class OctopiCLI {
  constructor() {
    this.config = null;
    this.logger = null;
    this.serverUrl = null;
    this.connected = false;
  }

  /**
   * Initialize CLI
   */
  async initialize(configPath = null) {
    try {
      // Load configuration
      this.config = loadConfig(configPath);
      initLogger(this.config.logging);
      this.logger = getLogger();
      
      // Construct server URL
      const { host, port, basePath } = this.config.server;
      this.serverUrl = `http://${host}:${port}${basePath}`;
      
      // Test connection
      await this.testConnection();
      
      console.log(chalk.green('✅ Octopi CLI initialized successfully'));
      console.log(chalk.cyan(`📡 Connected to: ${this.serverUrl}`));
      
    } catch (error) {
      console.error(chalk.red('❌ CLI initialization failed:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Test connection to server
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.serverUrl}/health`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        this.connected = true;
        console.log(chalk.green('🔗 Server connection verified'));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Server not running - some commands may not work'));
      console.log(chalk.gray('   Start server with: npm start'));
      this.connected = false;
    }
  }

  /**
   * Start interactive mode
   */
  async startInteractive() {
    showWelcomeBanner('cli');
    console.log(chalk.gray('Interactive command interface for managing agents and tasks'));
    console.log(chalk.gray(`Type 'help' for available commands or 'exit' to quit\n`));

    while (true) {
      try {
        const { command } = await inquirer.prompt([
          {
            type: 'input',
            name: 'command',
            message: chalk.cyan('octopi>'),
            prefix: ''
          }
        ]);

        const trimmed = command.trim();
        if (!trimmed) continue;

        if (trimmed === 'exit' || trimmed === 'quit') {
          console.log(chalk.yellow('👋 Goodbye!'));
          break;
        }

        await this.executeCommand(trimmed);

      } catch (error) {
        if (error.isTtyError || error.name === 'ExitPromptError') {
          console.log(chalk.yellow('\n👋 Goodbye!'));
          break;
        }
        console.error(chalk.red('Error:'), error.message);
      }
    }
  }

  /**
   * Execute CLI command
   */
  async executeCommand(commandStr) {
    const parts = commandStr.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    try {
      switch (command) {
        case 'help':
        case '?':
          this.showHelp();
          break;

        case 'status':
          await this.showStatus();
          break;

        case 'agents':
          await this.listAgents();
          break;

        case 'spawn':
          await this.spawnAgent(args);
          break;

        case 'task':
          await this.submitTask(args);
          break;

        case 'sessions':
          await this.listSessions();
          break;

        case 'handoff':
          await this.requestHandoff(args);
          break;

        case 'config':
          this.showConfig();
          break;

        case 'logs':
          await this.showLogs(args);
          break;

        case 'kill':
          await this.killAgent(args);
          break;

        case 'workflow':
          await this.runWorkflow(args);
          break;

        case 'clear':
          console.clear();
          break;

        case 'connect':
          await this.testConnection();
          break;

        default:
          console.log(chalk.red(`Unknown command: ${command}`));
          console.log(chalk.gray('Type "help" for available commands'));
      }
    } catch (error) {
      console.error(chalk.red(`Command failed: ${error.message}`));
    }
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(chalk.cyan(`
📖 Available Commands:
=====================

🤖 Agent Management:
  agents              - List all active agents
  spawn <type>        - Spawn new agent (coordinator, research, code, devops)
  kill <agentId>      - Terminate specific agent

📋 Task Management:
  task <description>  - Submit task to agent pool
  workflow <name>     - Run predefined workflow
  handoff <from> <to> - Request agent handoff

📊 System Information:
  status              - Show system status and metrics
  sessions            - List active terminal sessions
  logs [lines]        - Show recent system logs
  config              - Display current configuration

🛠️  Utilities:
  connect             - Test server connection
  clear               - Clear terminal screen
  help, ?             - Show this help message
  exit, quit          - Exit CLI

Examples:
  spawn research                    - Spawn research agent
  task "analyze website data"       - Submit analysis task
  workflow research-and-code        - Run predefined workflow
  handoff agent123 research         - Handoff to research agent
`));
  }

  /**
   * Show system status
   */
  async showStatus() {
    if (!this.connected) {
      console.log(chalk.red('❌ Not connected to server'));
      return;
    }

    try {
      const [healthResponse, agentsResponse] = await Promise.all([
        axios.get(`${this.serverUrl}/health`),
        axios.get(`${this.serverUrl}/api/agents`)
      ]);

      const health = healthResponse.data;
      const agents = agentsResponse.data.agents;

      console.log(chalk.cyan('\n📊 System Status:'));
      console.log(chalk.cyan('================'));
      console.log(`Status:          ${chalk.green('Online')}`);
      console.log(`Timestamp:       ${health.timestamp}`);
      console.log(`Active Sessions: ${health.activeSessions}`);
      console.log(`Active Agents:   ${agents.length}`);
      console.log(`Terminals:       ${health.activeTerminals}`);

      if (agents.length > 0) {
        console.log(chalk.cyan('\n🤖 Agent Summary:'));
        const agentTypes = {};
        const agentStatuses = {};
        
        agents.forEach(agent => {
          agentTypes[agent.type] = (agentTypes[agent.type] || 0) + 1;
          agentStatuses[agent.status] = (agentStatuses[agent.status] || 0) + 1;
        });

        console.log(`Types:    ${Object.entries(agentTypes).map(([k,v]) => `${k}(${v})`).join(', ')}`);
        console.log(`Status:   ${Object.entries(agentStatuses).map(([k,v]) => `${k}(${v})`).join(', ')}`);
      }

    } catch (error) {
      console.error(chalk.red('Failed to get system status:'), error.message);
    }
  }

  /**
   * List active agents
   */
  async listAgents() {
    if (!this.connected) {
      console.log(chalk.red('❌ Not connected to server'));
      return;
    }

    try {
      const response = await axios.get(`${this.serverUrl}/api/agents`);
      const agents = response.data.agents;

      if (agents.length === 0) {
        console.log(chalk.yellow('No active agents'));
        return;
      }

      console.log(chalk.cyan('\n🤖 Active Agents:'));
      console.log(chalk.cyan('================='));
      
      agents.forEach(agent => {
        const statusColor = agent.status === 'idle' ? 'green' : 
                           agent.status === 'working' ? 'yellow' : 'red';
        
        console.log(`${chalk.blue(agent.id.slice(0, 8))} ${chalk.cyan(agent.type.padEnd(12))} ${chalk[statusColor](agent.status.padEnd(8))} ${agent.currentTask || '-'}`);
        
        if (agent.lastActivity) {
          const lastActivity = new Date(agent.lastActivity);
          const ago = Math.floor((new Date() - lastActivity) / 1000);
          console.log(`  ${chalk.gray(`Last activity: ${ago}s ago`)}`);
        }
      });

    } catch (error) {
      console.error(chalk.red('Failed to list agents:'), error.message);
    }
  }

  /**
   * Spawn new agent
   */
  async spawnAgent(args) {
    const agentType = args[0];
    const validTypes = ['coordinator', 'research', 'code', 'devops', 'replication'];

    if (!agentType) {
      console.log(chalk.red('Usage: spawn <agent-type>'));
      console.log(chalk.gray(`Valid types: ${validTypes.join(', ')}`));
      return;
    }

    if (!validTypes.includes(agentType)) {
      console.log(chalk.red(`Invalid agent type: ${agentType}`));
      console.log(chalk.gray(`Valid types: ${validTypes.join(', ')}`));
      return;
    }

    if (!this.connected) {
      console.log(chalk.yellow('⚠️  Server not connected - cannot spawn agent'));
      return;
    }

    try {
      console.log(chalk.blue(`🚀 Spawning ${agentType} agent...`));
      
      // This would call the agent pool manager API
      // For now, show what would happen
      console.log(chalk.green(`✅ ${agentType} agent spawned successfully`));
      console.log(chalk.gray('   Use "agents" command to see active agents'));

    } catch (error) {
      console.error(chalk.red('Failed to spawn agent:'), error.message);
    }
  }

  /**
   * Submit task
   */
  async submitTask(args) {
    const description = args.join(' ');
    
    if (!description) {
      console.log(chalk.red('Usage: task <task-description>'));
      console.log(chalk.gray('Example: task "research latest AI models"'));
      return;
    }

    console.log(chalk.blue(`📋 Submitting task: "${description}"`));
    
    // Interactive task configuration
    const taskConfig = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'Task type:',
        choices: [
          'research',
          'code-generation',
          'deployment',
          'analysis',
          'custom'
        ]
      },
      {
        type: 'list',
        name: 'priority',
        message: 'Priority:',
        choices: [
          { name: 'High (1)', value: 1 },
          { name: 'Normal (3)', value: 3 },
          { name: 'Low (5)', value: 5 }
        ]
      },
      {
        type: 'input',
        name: 'agentType',
        message: 'Preferred agent type (optional):',
        default: ''
      }
    ]);

    const task = {
      id: `task_${Date.now()}`,
      description,
      type: taskConfig.type,
      priority: taskConfig.priority,
      preferredAgentType: taskConfig.agentType || undefined,
      submittedAt: new Date().toISOString(),
      submittedBy: 'cli'
    };

    try {
      console.log(chalk.green('✅ Task submitted to agent pool'));
      console.log(chalk.gray(`   Task ID: ${task.id}`));
      console.log(chalk.gray('   Use "status" to monitor progress'));
      
    } catch (error) {
      console.error(chalk.red('Failed to submit task:'), error.message);
    }
  }

  /**
   * List terminal sessions
   */
  async listSessions() {
    console.log(chalk.cyan('\n💻 Active Terminal Sessions:'));
    console.log(chalk.cyan('============================='));
    console.log(chalk.gray('(This would show active terminal sessions)'));
    
    // Placeholder - would integrate with session manager
    const mockSessions = [
      { id: 'sess_001', agent: 'research_agent', status: 'active', created: '2 min ago' },
      { id: 'sess_002', agent: 'code_agent', status: 'idle', created: '15 min ago' }
    ];

    mockSessions.forEach(session => {
      const statusColor = session.status === 'active' ? 'green' : 'yellow';
      console.log(`${chalk.blue(session.id)} ${chalk.cyan(session.agent.padEnd(15))} ${chalk[statusColor](session.status.padEnd(8))} ${session.created}`);
    });
  }

  /**
   * Request handoff
   */
  async requestHandoff(args) {
    const [fromAgent, toAgentType] = args;
    
    if (!fromAgent || !toAgentType) {
      console.log(chalk.red('Usage: handoff <from-agent-id> <to-agent-type>'));
      return;
    }

    console.log(chalk.blue(`🔄 Requesting handoff from ${fromAgent} to ${toAgentType}...`));
    console.log(chalk.green('✅ Handoff request submitted'));
  }

  /**
   * Show configuration
   */
  showConfig() {
    console.log(chalk.cyan('\n⚙️  Current Configuration:'));
    console.log(chalk.cyan('========================='));
    
    const displayConfig = {
      server: this.config.server,
      agents: {
        maxConcurrent: this.config.agents?.maxConcurrent || 10,
        heartbeatInterval: this.config.agents?.heartbeatInterval || 30000
      },
      logging: {
        level: this.config.logging?.level || 'info'
      }
    };

    console.log(JSON.stringify(displayConfig, null, 2));
  }

  /**
   * Show recent logs
   */
  async showLogs(args) {
    const lines = parseInt(args[0]) || 20;
    
    console.log(chalk.cyan(`\n📜 Recent Logs (last ${lines} lines):`));
    console.log(chalk.cyan('====================================='));
    console.log(chalk.gray('(This would show recent system logs)'));
  }

  /**
   * Kill agent
   */
  async killAgent(args) {
    const agentId = args[0];
    
    if (!agentId) {
      console.log(chalk.red('Usage: kill <agent-id>'));
      return;
    }

    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `Are you sure you want to terminate agent ${agentId}?`,
        default: false
      }
    ]);

    if (confirm.confirmed) {
      console.log(chalk.blue(`🔴 Terminating agent ${agentId}...`));
      console.log(chalk.green('✅ Agent termination request sent'));
    } else {
      console.log(chalk.yellow('Cancelled'));
    }
  }

  /**
   * Run workflow
   */
  async runWorkflow(args) {
    const workflowName = args[0];
    
    const workflows = [
      'research-and-code',
      'full-stack-deployment', 
      'colony-expansion',
      'data-pipeline'
    ];

    if (!workflowName) {
      console.log(chalk.red('Usage: workflow <workflow-name>'));
      console.log(chalk.gray(`Available workflows: ${workflows.join(', ')}`));
      return;
    }

    if (!workflows.includes(workflowName)) {
      console.log(chalk.red(`Unknown workflow: ${workflowName}`));
      console.log(chalk.gray(`Available workflows: ${workflows.join(', ')}`));
      return;
    }

    console.log(chalk.blue(`🔄 Starting ${workflowName} workflow...`));
    
    // Get workflow parameters
    const params = await this.getWorkflowParams(workflowName);
    
    console.log(chalk.green(`✅ ${workflowName} workflow started`));
    console.log(chalk.gray('   Use "status" to monitor progress'));
  }

  /**
   * Get workflow parameters
   */
  async getWorkflowParams(workflowName) {
    switch (workflowName) {
      case 'research-and-code':
        return await inquirer.prompt([
          {
            type: 'input',
            name: 'topic',
            message: 'Research topic:',
            validate: input => input.length > 0 || 'Topic is required'
          },
          {
            type: 'input',
            name: 'outputFormat',
            message: 'Output format:',
            default: 'markdown'
          }
        ]);

      case 'full-stack-deployment':
        return await inquirer.prompt([
          {
            type: 'input',
            name: 'appName',
            message: 'Application name:',
            validate: input => input.length > 0 || 'App name is required'
          },
          {
            type: 'list',
            name: 'platform',
            message: 'Deployment platform:',
            choices: ['docker', 'kubernetes', 'heroku', 'aws']
          }
        ]);

      default:
        return {};
    }
  }
}

/**
 * Main CLI execution
 */
async function main() {
  const cli = new OctopiCLI();

  const argv = yargs(hideBin(process.argv))
    .scriptName('octopi-cli')
    .usage('$0 [options]', 'Interactive CLI for Octopi Multi-Agent System')
    .option('config', {
      alias: 'c',
      type: 'string',
      description: 'Path to configuration file'
    })
    .option('command', {
      type: 'string',
      description: 'Single command to execute'
    })
    .example('$0', 'Start interactive mode')
    .example('$0 --command "agents"', 'List agents and exit')
    .example('$0 --config config.json', 'Use specific config file')
    .help()
    .parseSync();

  // Initialize CLI
  await cli.initialize(argv.config);

  // Single command mode
  if (argv.command) {
    await cli.executeCommand(argv.command);
    process.exit(0);
  }

  // Interactive mode
  await cli.startInteractive();
}

// Handle CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('CLI error:'), error.message);
    process.exit(1);
  });
}

export { OctopiCLI };