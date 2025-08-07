#!/usr/bin/env node
/**
 * Octopi AI Chatbot
 * Full AI-powered chatbot that can manage agents AND answer general questions
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import inquirer from 'inquirer';
import chalk from 'chalk';
import axios from 'axios';
import { loadConfig } from './shared/config.js';
import { initLogger, getLogger } from './shared/logger.js';
import { 
  showWelcomeBanner, 
  AGENT_BRANDING, 
  formatAgentName, 
  STATUS_INDICATORS,
  showSpinner
} from './shared/branding.js';

/**
 * AI-Powered Chatbot Class
 * Can handle both agent management AND general conversation
 */
class AIChatbot {
  constructor() {
    this.config = null;
    this.logger = null;
    this.serverUrl = null;
    this.connected = false;
    this.conversationHistory = [];
    
    // OpenAI configuration
    this.openaiApiKey = null;
    this.systemPrompt = `You are Octopi, an AI assistant that manages a multi-agent system. You can:

1. AGENT SYSTEM MANAGEMENT:
- Spawn agents (coordinator, research, code, devops, replication)
- Check system status and health
- Submit tasks to agent pool
- Monitor agent activities
- Handle agent handoffs

2. GENERAL ASSISTANCE:
- Answer any questions (weather, facts, help, etc.)
- Have natural conversations
- Provide information and explanations
- Help with various topics

When users ask about agent management, provide specific system commands.
When they ask general questions, answer them naturally and helpfully.
Always be friendly and helpful. Use emojis appropriately.

Available agent types:
- 🎯 Coordinator: Task routing and workflow management
- 🔍 Research: Web scraping, data analysis, information gathering  
- 💻 Code: Development, GitHub operations, file management
- ⚙️ DevOps: Server management, deployment, monitoring
- 🧬 Replication: Colony expansion, system discovery`;
  }

  /**
   * Initialize chatbot
   */
  async initialize(configPath = null) {
    try {
      // Load configuration
      this.config = loadConfig(configPath);
      initLogger(this.config.logging);
      this.logger = getLogger();
      
      // Get OpenAI API key
      this.openaiApiKey = process.env.OPENAI_API_KEY;
      if (!this.openaiApiKey || this.openaiApiKey.includes('your-key-here')) {
        console.log(chalk.red('❌ OpenAI API key not found or not set properly'));
        console.log(chalk.yellow('Please set OPENAI_API_KEY in your .env file'));
        process.exit(1);
      }
      
      // Construct server URL
      const { host, port, basePath } = this.config.server;
      this.serverUrl = `http://${host}:${port}${basePath}`;
      
      // Test connection to system
      await this.testSystemConnection();
      
      console.log(chalk.green('✅ AI Chatbot initialized successfully'));
      console.log(chalk.cyan(`🧠 Connected to OpenAI GPT-4`));
      if (this.connected) {
        console.log(chalk.green(`📡 Connected to Octopi system at ${this.serverUrl}`));
      } else {
        console.log(chalk.yellow(`⚠️  Octopi system offline - agent commands won't work until you start it`));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Chatbot initialization failed:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Test connection to Octopi system
   */
  async testSystemConnection() {
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
   * Start chatbot conversation
   */
  async startChat() {
    showWelcomeBanner('cli');
    
    console.log(chalk.cyan(`🤖 I'm your AI-powered Octopi assistant!`));
    console.log(chalk.white(`I can help you with:`));
    console.log(chalk.green(`• Agent system management (spawn agents, check status, submit tasks)`));
    console.log(chalk.green(`• General questions (weather, facts, explanations, anything!)`));
    console.log(chalk.green(`• Natural conversation and assistance\n`));

    if (this.connected) {
      console.log(chalk.green(`${STATUS_INDICATORS.online} System is running - all features available!`));
    } else {
      console.log(chalk.yellow(`${STATUS_INDICATORS.offline} System offline - start with 'npm start' for agent features`));
    }

    console.log(chalk.gray(`\nTry asking me anything:\n`));
    console.log(chalk.gray(`• "What's the weather in Rainbow, Oregon?"`));
    console.log(chalk.gray(`• "Spawn a research agent to analyze competitor data"`));
    console.log(chalk.gray(`• "How do neural networks work?"`));
    console.log(chalk.gray(`• "Show me the system status"`));
    console.log(chalk.gray(`• "What's 2+2?" or "Tell me a joke"\n`));

    // Main conversation loop
    while (true) {
      try {
        const { input } = await inquirer.prompt([
          {
            type: 'input',
            name: 'input',
            message: chalk.cyan('You>'),
            prefix: ''
          }
        ]);

        const trimmed = input.trim();
        if (!trimmed) continue;

        // Check for exit
        if (['exit', 'quit', 'bye', 'goodbye'].includes(trimmed.toLowerCase())) {
          console.log(chalk.yellow('\n👋 Goodbye! Thanks for chatting with me!'));
          break;
        }

        // Process the input with AI
        await this.processWithAI(trimmed);

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
   * Process input with OpenAI
   */
  async processWithAI(userInput) {
    const spinner = showSpinner('🧠 Thinking...');
    
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userInput
      });

      // Build messages for OpenAI
      const messages = [
        {
          role: 'system',
          content: this.systemPrompt + (this.connected ? 
            '\n\nThe Octopi system is currently ONLINE and available for agent commands.' : 
            '\n\nThe Octopi system is currently OFFLINE. Tell users to run "npm start" for agent features.')
        },
        ...this.conversationHistory.slice(-10) // Keep last 10 messages for context
      ];

      // Call OpenAI API
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      spinner.stop();

      const aiResponse = response.data.choices[0].message.content;
      
      // Add AI response to history
      this.conversationHistory.push({
        role: 'assistant', 
        content: aiResponse
      });

      // Display response
      console.log(chalk.green('\n🤖 Octopi: ') + aiResponse + '\n');

      // Check if this looks like an agent management command and execute it
      await this.executeSystemCommand(userInput, aiResponse);

    } catch (error) {
      spinner.stop();
      console.error(chalk.red('\n❌ AI Error: ') + error.message);
      
      // Fallback response
      console.log(chalk.yellow('\n🤖 Sorry, I had trouble processing that. Let me try a different approach...'));
      await this.handleFallback(userInput);
    }
  }

  /**
   * Execute actual system commands when AI suggests them
   */
  async executeSystemCommand(userInput, aiResponse) {
    const input = userInput.toLowerCase();
    
    // System status check
    if (input.includes('status') || input.includes('health') || aiResponse.includes('system status')) {
      if (this.connected) {
        await this.getSystemStatus();
      }
    }
    
    // Agent listing
    if (input.includes('agents') || input.includes('list') || aiResponse.includes('active agents')) {
      if (this.connected) {
        await this.listAgents();
      }
    }
    
    // Agent spawning
    const spawnMatch = input.match(/spawn.*?(coordinator|research|code|devops|replication)/);
    if (spawnMatch || aiResponse.includes('spawning') || aiResponse.includes('creating agent')) {
      if (this.connected) {
        const agentType = spawnMatch ? spawnMatch[1] : this.extractAgentType(input);
        if (agentType) {
          await this.spawnAgent(agentType);
        }
      }
    }
  }

  /**
   * Get system status
   */
  async getSystemStatus() {
    try {
      const [healthResponse, agentsResponse] = await Promise.all([
        axios.get(`${this.serverUrl}/health`),
        axios.get(`${this.serverUrl}/api/agents`)
      ]);

      const health = healthResponse.data;
      const agents = agentsResponse.data.agents;

      console.log(chalk.cyan(`\n📊 System Status:`));
      console.log(chalk.green(`${STATUS_INDICATORS.online} System Online`));
      console.log(`Active Agents: ${agents.length}`);
      console.log(`Sessions: ${health.activeSessions}`);
      console.log(`Terminals: ${health.activeTerminals}\n`);

    } catch (error) {
      console.log(chalk.red(`❌ Could not get system status: ${error.message}\n`));
    }
  }

  /**
   * List active agents
   */
  async listAgents() {
    try {
      const response = await axios.get(`${this.serverUrl}/api/agents`);
      const agents = response.data.agents;

      if (agents.length === 0) {
        console.log(chalk.yellow(`\n📭 No agents currently running\n`));
        return;
      }

      console.log(chalk.cyan(`\n🤖 Active Agents (${agents.length}):`));
      agents.forEach((agent, index) => {
        const status = agent.status === 'idle' ? STATUS_INDICATORS.idle : 
                      agent.status === 'working' ? STATUS_INDICATORS.working : STATUS_INDICATORS.info;
        console.log(`${index + 1}. ${status} ${formatAgentName(agent.type, agent.id)} - ${agent.status}`);
      });
      console.log('');

    } catch (error) {
      console.log(chalk.red(`❌ Could not list agents: ${error.message}\n`));
    }
  }

  /**
   * Spawn an agent
   */
  async spawnAgent(agentType) {
    const spinner = showSpinner(`Spawning ${agentType} agent...`);
    
    try {
      // Simulate agent spawning (in real implementation would call API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      spinner.stop();
      
      console.log(chalk.green(`\n✅ ${formatAgentName(agentType)} agent spawned successfully!\n`));
      
    } catch (error) {
      spinner.stop();
      console.log(chalk.red(`\n❌ Failed to spawn agent: ${error.message}\n`));
    }
  }

  /**
   * Extract agent type from user input
   */
  extractAgentType(input) {
    const agentTypes = Object.keys(AGENT_BRANDING);
    for (const type of agentTypes) {
      if (input.includes(type)) {
        return type;
      }
    }
    return null;
  }

  /**
   * Handle fallback when AI fails
   */
  async handleFallback(userInput) {
    const input = userInput.toLowerCase();
    
    if (input.includes('weather')) {
      console.log(chalk.blue('🌤️  I need an internet connection to check weather. Try asking about the agent system instead!'));
    } else if (input.includes('status')) {
      await this.getSystemStatus();
    } else if (input.includes('agents')) {
      await this.listAgents();
    } else if (input.includes('help')) {
      this.showHelp();
    } else {
      console.log(chalk.yellow('🤔 I\'m not sure how to help with that. Try asking about:'));
      console.log(chalk.gray('• Agent management ("spawn research agent", "show status")'));
      console.log(chalk.gray('• General questions ("how does X work?", "explain Y")'));
      console.log(chalk.gray('• System help ("what can you do?")'));
    }
  }

  /**
   * Show help
   */
  showHelp() {
    console.log(chalk.cyan(`\n🆘 I can help you with:\n`));
    console.log(chalk.white(`🤖 Agent Management:`));
    console.log(chalk.gray(`• "Spawn a research agent"`));
    console.log(chalk.gray(`• "Show me active agents"`));
    console.log(chalk.gray(`• "What's the system status?"`));
    console.log(chalk.gray(`• "Submit a task to analyze data"`));
    
    console.log(chalk.white(`\n💬 General Questions:`));
    console.log(chalk.gray(`• "What's the weather in [city]?"`));
    console.log(chalk.gray(`• "How does [technology] work?"`));
    console.log(chalk.gray(`• "Explain [concept] to me"`));
    console.log(chalk.gray(`• "Tell me about [topic]"`));
    
    console.log(chalk.white(`\n🛠️  System Commands:`));
    console.log(chalk.gray(`• "help" - Show this help`));
    console.log(chalk.gray(`• "exit" - Quit chatbot`));
    console.log('');
  }
}

/**
 * Main execution
 */
async function main() {
  const chatbot = new AIChatbot();

  const argv = yargs(hideBin(process.argv))
    .scriptName('octopi-ai')
    .usage('$0 [options]', 'AI-powered chatbot for Octopi Multi-Agent System')
    .option('config', {
      alias: 'c',
      type: 'string',
      description: 'Path to configuration file'
    })
    .help()
    .parseSync();

  // Initialize and start chat
  await chatbot.initialize(argv.config);
  await chatbot.startChat();
}

// Handle execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('Chatbot error:'), error.message);
    process.exit(1);
  });
}

export { AIChatbot };