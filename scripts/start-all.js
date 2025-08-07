#!/usr/bin/env node
/**
 * Start All Script - Launch the complete Octopi system
 * Starts backend server and AI chatbot in parallel
 */

import { spawn } from 'child_process';
import chalk from 'chalk';
import { showWelcomeBanner } from '../src/shared/branding.js';

async function startAll() {
  console.clear();
  showWelcomeBanner('system');
  
  console.log(chalk.cyan('🚀 Starting Complete Octopi System...\n'));
  
  // Start backend server
  console.log(chalk.yellow('📡 Starting backend server...'));
  const server = spawn('npm', ['start'], {
    stdio: 'pipe',
    shell: true,
    detached: false
  });
  
  server.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(chalk.gray('[SERVER] ') + output);
    }
  });
  
  server.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output && !output.includes('warning')) {
      console.log(chalk.red('[SERVER ERROR] ') + output);
    }
  });
  
  // Wait a bit for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log(chalk.green('✅ Backend server started'));
  console.log(chalk.yellow('🤖 Starting AI chatbot interface...\n'));
  
  // Start AI chatbot
  const chatbot = spawn('npm', ['run', 'ai-chat'], {
    stdio: 'inherit',
    shell: true,
    detached: false
  });
  
  // Handle cleanup
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Shutting down system...'));
    server.kill('SIGTERM');
    chatbot.kill('SIGTERM');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    server.kill('SIGTERM');
    chatbot.kill('SIGTERM');
    process.exit(0);
  });
  
  // Wait for chatbot to exit
  chatbot.on('exit', (code) => {
    console.log(chalk.yellow('👋 Chatbot exited. Shutting down server...'));
    server.kill('SIGTERM');
    process.exit(code);
  });
  
  server.on('exit', (code) => {
    if (code !== 0) {
      console.log(chalk.red(`❌ Server exited with code ${code}`));
    }
    chatbot.kill('SIGTERM');
  });
}

startAll().catch(error => {
  console.error(chalk.red('Startup error:'), error.message);
  process.exit(1);
});