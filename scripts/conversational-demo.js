#!/usr/bin/env node
/**
 * Conversational CLI Demo Script
 * Shows how the natural language interface works
 */

import chalk from 'chalk';
import { showWelcomeBanner, typeText, showSpinner } from '../src/shared/branding.js';

async function runConversationalDemo() {
  console.clear();
  showWelcomeBanner('cli');
  
  console.log(chalk.gray('🎬 Conversational CLI Demo - See how natural language works!\n'));
  
  // Simulate user interaction
  await simulateConversation();
  
  console.log(chalk.cyan(`
🌟 Key Features Demonstrated:
============================

✅ Natural Language Understanding
  • Recognizes intent from casual speech
  • Understands context and follow-up questions
  • Provides helpful suggestions and guidance

✅ Personalized Experience  
  • Remembers your name and preferences
  • Adapts responses to your communication style
  • Maintains conversation history and context

✅ Intelligent Agent Suggestions
  • Recommends appropriate agent types for tasks
  • Explains why certain agents are better suited
  • Guides you through complex multi-step processes

✅ Seamless System Integration
  • Real-time system status and monitoring
  • Direct agent spawning and task submission
  • Immediate feedback and progress updates

✅ Human-Friendly Interface
  • No need to memorize command syntax
  • Ask questions the way you naturally would  
  • Get help and explanations in plain English
`));

  console.log(chalk.yellow(`
🚀 Try It Yourself:
===================

1. Start the conversational CLI:
   ${chalk.green('npm run chat')}

2. Try these natural phrases:
   • "Hi, I'm working on a new project"
   • "Show me what agents are running"  
   • "I need help analyzing competitor data"
   • "Can you spawn a code agent for me?"
   • "What's the system status?"

3. The AI will understand and guide you through each step!
`));

  console.log(chalk.green(`
✨ The future of multi-agent interaction is conversational!
`));
}

async function simulateConversation() {
  console.log(chalk.cyan('👤 User: ') + 'Hi there!');
  await simulateTyping();
  console.log(chalk.green('🤖 Octopi: ') + 'Hello! Ready to work with some agents? 👋');
  
  await pause();
  
  console.log(chalk.cyan('👤 User: ') + 'I need to analyze some competitor websites');
  await simulateTyping();
  console.log(chalk.green('🤖 Octopi: ') + 'For "analyze competitor websites", I suggest using a 🔍 Research agent.');
  console.log(chalk.green('         ') + 'Should I submit this task to the agent pool?');
  
  await pause();
  
  console.log(chalk.cyan('👤 User: ') + 'Yes, go ahead');
  await simulateTyping();
  console.log(chalk.green('🤖 Octopi: ') + '✅ Task submitted successfully!');
  console.log(chalk.green('         ') + 'Task ID: task_1673821234567');
  console.log(chalk.green('         ') + 'The Research agent will handle this for you.');
  
  await pause();
  
  console.log(chalk.cyan('👤 User: ') + 'Show me all active agents');
  await simulateTyping();
  console.log(chalk.green('🤖 Octopi: ') + '🤖 Active Agents (3):');
  console.log(chalk.green('         ') + '1. ● 🎯 Coordinator (coord_001) - idle');
  console.log(chalk.green('         ') + '2. ● 🔍 Research (research_042) - working');
  console.log(chalk.green('         ') + '3. ● 💻 Code (code_128) - idle');
  
  await pause();
  
  console.log(chalk.cyan('👤 User: ') + 'What is the research agent working on?');
  await simulateTyping();
  console.log(chalk.green('🤖 Octopi: ') + 'The Research agent is currently analyzing competitor websites.');
  console.log(chalk.green('         ') + 'Task started: 2 minutes ago');
  console.log(chalk.green('         ') + 'Estimated completion: 3-5 minutes');
  
  await pause();
  
  console.log(chalk.cyan('👤 User: ') + 'Perfect! When it\'s done, can you hand it off to the code agent?');
  await simulateTyping();
  console.log(chalk.green('🤖 Octopi: ') + 'Absolutely! I\'ll set up an automatic handoff to the Code agent');
  console.log(chalk.green('         ') + 'when the research task completes. The Code agent can then');
  console.log(chalk.green('         ') + 'implement any findings or create reports based on the data.');
  
  await pause();
  
  console.log(chalk.cyan('👤 User: ') + 'Thanks, that\'s exactly what I needed!');
  await simulateTyping();
  console.log(chalk.green('🤖 Octopi: ') + 'You\'re welcome! I\'ll monitor the progress and let you know');
  console.log(chalk.green('         ') + 'when the handoff is complete. Is there anything else');
  console.log(chalk.green('         ') + 'you\'d like me to help you with today?');
  
  await pause(2000);
}

async function simulateTyping() {
  const spinner = showSpinner('Octopi is thinking...');
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
  spinner.stop();
}

async function pause(ms = 1500) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

// Run demo
runConversationalDemo().catch(error => {
  console.error(chalk.red('Demo error:'), error.message);
  process.exit(1);
});