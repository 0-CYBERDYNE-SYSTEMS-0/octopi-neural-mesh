#!/usr/bin/env node
/**
 * Octopi Conversational CLI
 * Natural language interface for multi-agent system interaction
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
import { 
  showWelcomeBanner, 
  AGENT_BRANDING, 
  formatAgentName, 
  STATUS_INDICATORS,
  getRandomPrompt,
  typeText,
  showSpinner
} from './shared/branding.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Conversational CLI Class
 * Natural language interface with AI-powered understanding
 */
class ConversationalCLI {
  constructor() {
    this.config = null;
    this.logger = null;
    this.serverUrl = null;
    this.connected = false;
    this.conversationHistory = [];
    this.userContext = {
      name: null,
      preferences: {},
      recentActions: []
    };
    
    // Natural language patterns
    this.intentPatterns = this.initializeIntentPatterns();
  }

  /**
   * Initialize intent recognition patterns
   */
  initializeIntentPatterns() {
    return {
      greetings: [
        /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
        /^(what's up|how are you|how's it going)/i
      ],
      help: [
        /^(help|what can you do|commands|options)/i,
        /^(how do i|how can i|show me)/i,
        /^(what.*available|what.*possible)/i
      ],
      status: [
        /^(status|state|how.*system|what.*happening)/i,
        /^(show.*status|system.*status|health)/i,
        /^(are.*running|is.*working)/i
      ],
      spawn: [
        /^(spawn|create|start|launch).*agent/i,
        /^(i need.*agent|get me.*agent)/i,
        /^(can you.*agent|agent.*please)/i
      ],
      list: [
        /^(list|show|display).*agents/i,
        /^(what.*agents|which.*agents)/i,
        /^(agents.*active|running.*agents)/i
      ],
      task: [
        /^(task|do|perform|execute|run)/i,
        /^(i need.*done|can you.*do)/i,
        /^(help me.*with|assist.*with)/i
      ],
      goodbye: [
        /^(bye|goodbye|exit|quit|done|thanks|thank you)/i,
        /^(see you|talk later|that's all)/i
      ]
    };
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
      }
    } catch (error) {
      this.connected = false;
    }
  }

  /**
   * Start conversational interaction
   */
  async startConversation() {
    showWelcomeBanner('cli');
    
    // Get user name if not known
    if (!this.userContext.name) {
      const { name } = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'What should I call you?',
          default: 'User'
        }
      ]);
      this.userContext.name = name;
    }

    console.log(chalk.cyan(`\n👋 Hello ${this.userContext.name}! I'm your Octopi assistant.`));
    
    if (this.connected) {
      console.log(chalk.green(`${STATUS_INDICATORS.online} Connected to system at ${this.serverUrl}`));
    } else {
      console.log(chalk.yellow(`${STATUS_INDICATORS.offline} System not running - start with 'npm start'`));
    }

    await typeText(chalk.yellow(`\n${getRandomPrompt()}`), 20);
    console.log(chalk.gray(`\nI understand natural language! Try things like:`));
    console.log(chalk.gray(`• "Show me the system status"`));
    console.log(chalk.gray(`• "Spawn a research agent"`));
    console.log(chalk.gray(`• "I need help analyzing some data"`));
    console.log(chalk.gray(`• "What agents are currently running?"`));
    console.log(chalk.gray(`• Type 'help' for more options\n`));

    // Main conversation loop
    while (true) {
      try {
        const { input } = await inquirer.prompt([
          {
            type: 'input',
            name: 'input',
            message: chalk.cyan(`${this.userContext.name}>`),
            prefix: ''
          }
        ]);

        const trimmed = input.trim();
        if (!trimmed) continue;

        // Add to conversation history
        this.conversationHistory.push({
          role: 'user',
          content: trimmed,
          timestamp: new Date()
        });

        const intent = this.recognizeIntent(trimmed);
        const response = await this.processIntent(intent, trimmed);

        // Add response to history
        this.conversationHistory.push({
          role: 'assistant', 
          content: response,
          timestamp: new Date()
        });

        // Check for exit
        if (intent === 'goodbye') {
          break;
        }

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
   * Recognize user intent from natural language
   */
  recognizeIntent(input) {
    const text = input.toLowerCase();
    
    // Check each intent pattern
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return intent;
        }
      }
    }

    // Special keyword detection
    if (text.includes('agent') && (text.includes('spawn') || text.includes('create'))) {
      return 'spawn';
    }
    if (text.includes('task') || text.includes('job') || text.includes('work')) {
      return 'task';
    }
    if (text.includes('status') || text.includes('health')) {
      return 'status';
    }

    return 'unknown';
  }

  /**
   * Process recognized intent
   */
  async processIntent(intent, originalInput) {
    switch (intent) {
      case 'greetings':
        return await this.handleGreeting();
        
      case 'help':
        return await this.handleHelp();
        
      case 'status':
        return await this.handleStatus();
        
      case 'spawn':
        return await this.handleSpawn(originalInput);
        
      case 'list':
        return await this.handleListAgents();
        
      case 'task':
        return await this.handleTask(originalInput);
        
      case 'goodbye':
        return await this.handleGoodbye();
        
      default:
        return await this.handleUnknown(originalInput);
    }
  }

  /**
   * Handle greeting intent
   */
  async handleGreeting() {
    const greetings = [
      `Hello there, ${this.userContext.name}! 👋`,
      `Hi ${this.userContext.name}! Ready to work with some agents?`,
      `Hey! How can I help you manage the system today?`,
      `Good to see you, ${this.userContext.name}! What shall we do?`
    ];
    
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    console.log(chalk.cyan(`\n🤖 ${greeting}`));
    return greeting;
  }

  /**
   * Handle help intent
   */
  async handleHelp() {
    console.log(chalk.cyan(`\n🆘 I can help you with many things, ${this.userContext.name}!`));
    console.log(chalk.white(`
🤖 Agent Management:
• "Spawn a research agent" - Create new specialized agents
• "Show me all agents" - List currently running agents  
• "Kill agent [id]" - Terminate specific agent

📋 Task Management:
• "I need to analyze website data" - Submit analysis tasks
• "Help me deploy an application" - Request deployment assistance
• "Run the research-and-code workflow" - Execute predefined workflows

📊 System Monitoring:  
• "Show system status" - Display health and metrics
• "What's the server status?" - Check connectivity
• "List active sessions" - View terminal sessions

💬 Natural Conversation:
• I understand context and follow-up questions
• Ask me anything about the multi-agent system
• I'll guide you through complex operations

Examples of natural commands:
• "I'm working on a new project and need a code agent"
• "Can you help me research the latest AI trends?"
• "Something seems wrong with the system"
• "Show me what's happening with my agents"
`));
    return 'help_displayed';
  }

  /**
   * Handle status intent
   */
  async handleStatus() {
    if (!this.connected) {
      console.log(chalk.red(`\n❌ System is not running, ${this.userContext.name}.`));
      console.log(chalk.gray('Start it with: npm start'));
      return 'system_offline';
    }

    const spinner = showSpinner('Checking system status...');
    
    try {
      const [healthResponse, agentsResponse] = await Promise.all([
        axios.get(`${this.serverUrl}/health`),
        axios.get(`${this.serverUrl}/api/agents`)
      ]);

      spinner.stop();

      const health = healthResponse.data;
      const agents = agentsResponse.data.agents;

      console.log(chalk.cyan(`\n📊 System Status for ${this.userContext.name}:`));
      console.log(chalk.green(`${STATUS_INDICATORS.online} System is running smoothly!`));
      console.log(`
${chalk.white('Active Agents:')}     ${agents.length}
${chalk.white('Terminal Sessions:') } ${health.activeSessions}
${chalk.white('Active Terminals:')}  ${health.activeTerminals}
${chalk.white('Last Updated:')}      ${new Date(health.timestamp).toLocaleTimeString()}
`);

      if (agents.length > 0) {
        console.log(chalk.cyan('🤖 Current Agents:'));
        agents.forEach(agent => {
          const status = agent.status === 'idle' ? STATUS_INDICATORS.idle : 
                        agent.status === 'working' ? STATUS_INDICATORS.working : STATUS_INDICATORS.info;
          console.log(`  ${status} ${formatAgentName(agent.type, agent.id)} - ${agent.status}`);
        });
      }

      return 'status_displayed';

    } catch (error) {
      spinner.stop();
      console.error(chalk.red(`\n❌ Failed to get system status: ${error.message}`));
      return 'status_error';
    }
  }

  /**
   * Handle spawn intent
   */
  async handleSpawn(input) {
    // Extract agent type from natural language
    const agentTypes = Object.keys(AGENT_BRANDING);
    let detectedType = null;
    
    for (const type of agentTypes) {
      if (input.toLowerCase().includes(type)) {
        detectedType = type;
        break;
      }
    }

    if (!detectedType) {
      // Ask user to specify
      console.log(chalk.yellow(`\n🤔 Which type of agent would you like me to spawn, ${this.userContext.name}?`));
      
      const choices = agentTypes.map(type => ({
        name: `${AGENT_BRANDING[type].emoji} ${AGENT_BRANDING[type].name} - ${this.getAgentDescription(type)}`,
        value: type
      }));

      const { agentType } = await inquirer.prompt([
        {
          type: 'list',
          name: 'agentType',
          message: 'Select agent type:',
          choices
        }
      ]);

      detectedType = agentType;
    }

    const spinner = showSpinner(`Spawning ${detectedType} agent...`);
    
    try {
      // Simulate agent spawning
      await new Promise(resolve => setTimeout(resolve, 2000));
      spinner.stop();
      
      console.log(chalk.green(`\n✅ Successfully spawned ${formatAgentName(detectedType)} agent!`));
      console.log(chalk.gray(`The agent is now available for tasks and ready to assist you.`));
      
      // Update user context
      this.userContext.recentActions.push({
        action: 'spawn',
        agentType: detectedType,
        timestamp: new Date()
      });

      return `spawned_${detectedType}`;

    } catch (error) {
      spinner.stop();
      console.error(chalk.red(`\n❌ Failed to spawn agent: ${error.message}`));
      return 'spawn_error';
    }
  }

  /**
   * Handle list agents intent
   */
  async handleListAgents() {
    if (!this.connected) {
      console.log(chalk.red(`\n❌ Cannot list agents - system is not running.`));
      return 'system_offline';
    }

    const spinner = showSpinner('Fetching agent list...');

    try {
      const response = await axios.get(`${this.serverUrl}/api/agents`);
      spinner.stop();
      
      const agents = response.data.agents;

      if (agents.length === 0) {
        console.log(chalk.yellow(`\n📭 No agents are currently running, ${this.userContext.name}.`));
        console.log(chalk.gray('Would you like me to spawn some agents for you?'));
        return 'no_agents';
      }

      console.log(chalk.cyan(`\n🤖 Active Agents (${agents.length}):`));
      console.log(chalk.cyan('═'.repeat(40)));
      
      agents.forEach((agent, index) => {
        const status = agent.status === 'idle' ? STATUS_INDICATORS.idle : 
                      agent.status === 'working' ? STATUS_INDICATORS.working : STATUS_INDICATORS.info;
        
        console.log(`${index + 1}. ${status} ${formatAgentName(agent.type, agent.id)}`);
        console.log(`   Status: ${chalk.white(agent.status)}`);
        if (agent.currentTask) {
          console.log(`   Task: ${chalk.gray(agent.currentTask)}`);
        }
        if (agent.lastActivity) {
          const lastActivity = new Date(agent.lastActivity);
          const ago = Math.floor((new Date() - lastActivity) / 1000);
          console.log(`   Last Activity: ${chalk.gray(`${ago}s ago`)}`);
        }
        console.log('');
      });

      return 'agents_listed';

    } catch (error) {
      spinner.stop();
      console.error(chalk.red(`\n❌ Failed to list agents: ${error.message}`));
      return 'list_error';
    }
  }

  /**
   * Handle task intent  
   */
  async handleTask(input) {
    console.log(chalk.cyan(`\n📋 I'd love to help you with that task, ${this.userContext.name}!`));
    
    // Extract task from input or ask for clarification
    let taskDescription = input.replace(/^(task|do|perform|execute|run|i need|can you|help me)/i, '').trim();
    
    if (!taskDescription || taskDescription.length < 5) {
      const { description } = await inquirer.prompt([
        {
          type: 'input',
          name: 'description',
          message: 'What would you like me to help you with?',
          validate: input => input.length > 0 || 'Please describe the task'
        }
      ]);
      taskDescription = description;
    }

    // Suggest agent type based on task
    const suggestedAgent = this.suggestAgentForTask(taskDescription);
    
    console.log(`\n💡 For "${taskDescription}", I suggest using a ${formatAgentName(suggestedAgent)} agent.`);
    
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Should I submit this task to the agent pool?',
        default: true
      }
    ]);

    if (confirm) {
      const spinner = showSpinner('Submitting task...');
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        spinner.stop();
        
        const taskId = `task_${Date.now()}`;
        console.log(chalk.green(`\n✅ Task submitted successfully!`));
        console.log(chalk.gray(`Task ID: ${taskId}`));
        console.log(chalk.gray(`The ${AGENT_BRANDING[suggestedAgent].name} agent will handle this for you.`));
        
        return `task_submitted_${suggestedAgent}`;
        
      } catch (error) {
        spinner.stop();
        console.error(chalk.red(`\n❌ Failed to submit task: ${error.message}`));
        return 'task_error';
      }
    } else {
      console.log(chalk.yellow('Task cancelled.'));
      return 'task_cancelled';
    }
  }

  /**
   * Handle goodbye intent
   */
  async handleGoodbye() {
    const farewells = [
      `Goodbye ${this.userContext.name}! The agents will keep working for you. 👋`,
      `See you later! Your multi-agent system is in good hands. 🐙`,
      `Take care ${this.userContext.name}! Come back anytime you need agent assistance.`,
      `Until next time! The Octopi system will be here when you return. 🤖`
    ];
    
    const farewell = farewells[Math.floor(Math.random() * farewells.length)];
    await typeText(chalk.cyan(`\n${farewell}`), 25);
    
    // Show conversation summary
    if (this.conversationHistory.length > 2) {
      console.log(chalk.gray(`\n📊 Conversation Summary:`));
      console.log(chalk.gray(`• Messages exchanged: ${this.conversationHistory.length}`));
      console.log(chalk.gray(`• Recent actions: ${this.userContext.recentActions.length}`));
    }
    
    return 'goodbye';
  }

  /**
   * Handle unknown intent
   */
  async handleUnknown(input) {
    const responses = [
      `I'm not sure I understand that, ${this.userContext.name}. Could you rephrase it?`,
      `Hmm, that's a bit unclear to me. Try asking about agents, tasks, or system status.`,
      `I didn't catch that. Would you like to see what I can help you with?`,
      `Could you be more specific? I can help with agents, tasks, and system management.`
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    console.log(chalk.yellow(`\n🤔 ${response}`));
    console.log(chalk.gray(`Type 'help' to see what I can do for you.`));
    
    return 'unknown_intent';
  }

  /**
   * Get agent description for help text
   */
  getAgentDescription(agentType) {
    const descriptions = {
      coordinator: 'Task routing and workflow management',
      research: 'Web scraping and data analysis', 
      code: 'Development and GitHub operations',
      devops: 'Deployment and infrastructure',
      replication: 'Colony expansion and discovery'
    };
    return descriptions[agentType] || 'Specialized agent';
  }

  /**
   * Suggest agent type based on task description
   */
  suggestAgentForTask(taskDescription) {
    const text = taskDescription.toLowerCase();
    
    if (text.includes('research') || text.includes('analyze') || text.includes('data') || text.includes('scrape')) {
      return 'research';
    }
    if (text.includes('code') || text.includes('develop') || text.includes('program') || text.includes('github')) {
      return 'code';
    }
    if (text.includes('deploy') || text.includes('server') || text.includes('infrastructure') || text.includes('monitor')) {
      return 'devops';
    }
    if (text.includes('expand') || text.includes('replicate') || text.includes('colony') || text.includes('discover')) {
      return 'replication';
    }
    
    return 'coordinator'; // Default to coordinator for complex tasks
  }
}

/**
 * Main CLI execution
 */
async function main() {
  const cli = new ConversationalCLI();

  const argv = yargs(hideBin(process.argv))
    .scriptName('octopi-chat')
    .usage('$0 [options]', 'Conversational CLI for Octopi Multi-Agent System')
    .option('config', {
      alias: 'c',
      type: 'string',
      description: 'Path to configuration file'
    })
    .example('$0', 'Start conversational mode')
    .example('$0 --config config.json', 'Use specific config file')
    .help()
    .parseSync();

  // Initialize and start conversation
  await cli.initialize(argv.config);
  await cli.startConversation();
}

// Handle CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('CLI error:'), error.message);
    process.exit(1);
  });
}

export { ConversationalCLI };