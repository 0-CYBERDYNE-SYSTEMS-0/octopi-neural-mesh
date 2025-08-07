/**
 * Octopi Branding and ASCII Art
 * Shared branding utilities for consistent visual identity
 */

import chalk from 'chalk';

/**
 * ASCII Art Banner
 */
export const OCTOPI_BANNER = chalk.cyan(`
 ██████╗  ██████╗████████╗ ██████╗ ██████╗ ██╗    
██╔═══██╗██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗██║    
██║   ██║██║        ██║   ██║   ██║██████╔╝██║    
██║   ██║██║        ██║   ██║   ██║██╔═══╝ ██║    
╚██████╔╝╚██████╗   ██║   ╚██████╔╝██║     ██║    
 ╚═════╝  ╚═════╝   ╚═╝    ╚═════╝ ╚═╝     ╚═╝    
`);

/**
 * Compact banner for smaller displays
 */
export const OCTOPI_BANNER_COMPACT = chalk.cyan(`
🐙 OCTOPI Multi-Agent System
`);

/**
 * System taglines
 */
export const TAGLINES = {
  main: chalk.yellow('🐙 Self-Replicating Multi-Agent WeTTY System'),
  subtitle: chalk.gray('Terminal-Native AI Agent Coordination Platform'),
  cli: chalk.yellow('🤖 Conversational AI Agent Interface'),
  web: chalk.yellow('🌐 Web-Based Terminal Coordination')
};

/**
 * Display full welcome banner
 */
export function showWelcomeBanner(mode = 'main') {
  console.log(OCTOPI_BANNER);
  console.log(TAGLINES[mode] || TAGLINES.main);
  console.log(TAGLINES.subtitle);
  console.log('');
}

/**
 * Display compact banner
 */
export function showCompactBanner(mode = 'main') {
  console.log(OCTOPI_BANNER_COMPACT);
  console.log(TAGLINES[mode] || TAGLINES.main);
  console.log('');
}

/**
 * Agent type emojis and colors
 */
export const AGENT_BRANDING = {
  coordinator: { emoji: '🎯', color: 'blue', name: 'Coordinator' },
  research: { emoji: '🔍', color: 'green', name: 'Research' },
  code: { emoji: '💻', color: 'magenta', name: 'Code' },
  devops: { emoji: '⚙️', color: 'cyan', name: 'DevOps' },
  replication: { emoji: '🧬', color: 'red', name: 'Replication' }
};

/**
 * Format agent name with branding
 */
export function formatAgentName(agentType, agentId = null) {
  const branding = AGENT_BRANDING[agentType] || { emoji: '🤖', color: 'white', name: 'Unknown' };
  const name = agentId ? `${branding.name} (${agentId.slice(0, 8)})` : branding.name;
  return `${branding.emoji} ${chalk[branding.color](name)}`;
}

/**
 * Status indicators
 */
export const STATUS_INDICATORS = {
  online: chalk.green('●'),
  offline: chalk.red('●'),
  working: chalk.yellow('●'),
  idle: chalk.blue('●'),
  error: chalk.red('⚠'),
  success: chalk.green('✓'),
  info: chalk.cyan('ℹ'),
  warning: chalk.yellow('⚠')
};

/**
 * Command categories for help display
 */
export const COMMAND_CATEGORIES = {
  agent: { emoji: '🤖', color: 'blue', name: 'Agent Management' },
  task: { emoji: '📋', color: 'green', name: 'Task Management' }, 
  system: { emoji: '📊', color: 'cyan', name: 'System Information' },
  utility: { emoji: '🛠️', color: 'yellow', name: 'Utilities' }
};

/**
 * Format command help with branding
 */
export function formatCommandHelp(category, commands) {
  const cat = COMMAND_CATEGORIES[category];
  if (!cat) return '';
  
  let output = `\n${cat.emoji} ${chalk[cat.color](cat.name)}:\n`;
  commands.forEach(cmd => {
    output += `  ${chalk.white(cmd.name.padEnd(20))} - ${cmd.description}\n`;
  });
  return output;
}

/**
 * Conversation starters and prompts
 */
export const CONVERSATION_PROMPTS = [
  "What would you like me to help you with?",
  "How can I assist you with the agent system today?", 
  "Ready to coordinate some agents?",
  "What task shall we tackle together?",
  "Need help managing your multi-agent system?",
  "Let's get some agents working for you!",
  "What would you like to explore in the system?",
  "Ready to spawn some agents and get things done?"
];

/**
 * Get random conversation prompt
 */
export function getRandomPrompt() {
  return CONVERSATION_PROMPTS[Math.floor(Math.random() * CONVERSATION_PROMPTS.length)];
}

/**
 * Typing animation effect
 */
export async function typeText(text, delay = 30) {
  for (let i = 0; i < text.length; i++) {
    process.stdout.write(text[i]);
    if (text[i] !== ' ') {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  process.stdout.write('\n');
}

/**
 * Show loading spinner
 */
export function showSpinner(message = 'Working...') {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  
  const interval = setInterval(() => {
    process.stdout.write(`\r${chalk.cyan(frames[i])} ${message}`);
    i = (i + 1) % frames.length;
  }, 100);
  
  return {
    stop: () => {
      clearInterval(interval);
      process.stdout.write('\r');
    }
  };
}