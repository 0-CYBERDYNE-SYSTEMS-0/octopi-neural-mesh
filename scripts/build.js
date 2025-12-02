#!/usr/bin/env node
/**
 * Build Script for Octopi Neural Mesh
 * Validates the codebase and prepares for production deployment
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function build() {
  console.log('🐙 Building Octopi Neural Mesh...\n');

  const checks = [];

  // Check required files exist
  const requiredFiles = [
    'src/main.js',
    'src/server/wetty-server.js',
    'src/server/agent-pool-manager.js',
    'src/server/agent-session.js',
    'src/server/terminal-multiplexer.js',
    'src/shared/agent-base.js',
    'src/shared/config.js',
    'src/shared/logger.js',
    'src/agents/coordinator.js',
    'src/agents/research.js',
    'src/agents/code.js',
    'src/agents/devops.js',
    'src/agents/replication.js',
    'config/config.example.json',
    'package.json'
  ];

  console.log('📋 Checking required files...');
  for (const file of requiredFiles) {
    try {
      await fs.access(path.join(rootDir, file));
      checks.push({ file, status: '✅' });
    } catch {
      checks.push({ file, status: '❌' });
    }
  }

  // Print results
  checks.forEach(({ file, status }) => {
    console.log(`  ${status} ${file}`);
  });

  const failedChecks = checks.filter(c => c.status === '❌');
  if (failedChecks.length > 0) {
    console.error('\n❌ Build failed: Missing required files');
    process.exit(1);
  }

  // Check package.json is valid
  console.log('\n📦 Validating package.json...');
  try {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(rootDir, 'package.json'), 'utf8')
    );
    console.log(`  ✅ Name: ${packageJson.name}`);
    console.log(`  ✅ Version: ${packageJson.version}`);
    console.log(`  ✅ Type: ${packageJson.type}`);
    console.log(`  ✅ Main: ${packageJson.main}`);
  } catch (error) {
    console.error('  ❌ Invalid package.json:', error.message);
    process.exit(1);
  }

  // Check config example is valid JSON
  console.log('\n⚙️  Validating configuration...');
  try {
    const configExample = JSON.parse(
      await fs.readFile(path.join(rootDir, 'config/config.example.json'), 'utf8')
    );
    console.log('  ✅ config.example.json is valid JSON');
    console.log(`  ✅ Server configured for ${configExample.server.host}:${configExample.server.port}`);
    console.log(`  ✅ AI primary: ${configExample.ai.primary}, fallback: ${configExample.ai.fallback}`);
    console.log(`  ✅ Max concurrent agents: ${configExample.agents.maxConcurrent}`);
  } catch (error) {
    console.error('  ❌ Invalid config.example.json:', error.message);
    process.exit(1);
  }

  // Create logs directory if it doesn't exist
  console.log('\n📁 Ensuring directories exist...');
  const directories = ['logs', 'games', 'projects', 'reports'];
  for (const dir of directories) {
    try {
      await fs.mkdir(path.join(rootDir, dir), { recursive: true });
      console.log(`  ✅ ${dir}/`);
    } catch (error) {
      console.log(`  ⚠️  ${dir}/ (${error.message})`);
    }
  }

  // Create client dist directory for static files (if needed)
  console.log('\n🌐 Checking client assets...');
  const clientDistPath = path.join(rootDir, 'client', 'dist');
  try {
    await fs.mkdir(clientDistPath, { recursive: true });
    
    // Check if index.html exists, copy from template if not
    const indexPath = path.join(clientDistPath, 'index.html');
    const templatePath = path.join(rootDir, 'templates', 'index.html');
    try {
      await fs.access(indexPath);
      console.log('  ✅ client/dist/index.html exists');
    } catch {
      // Copy from template file
      try {
        const indexHtml = await fs.readFile(templatePath, 'utf8');
        await fs.writeFile(indexPath, indexHtml);
        console.log('  ✅ Created client/dist/index.html from template');
      } catch (templateError) {
        // Fallback: create minimal HTML if template not found
        const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🐙 Octopi Neural Mesh</title>
</head>
<body>
    <h1>🐙 Octopi Neural Mesh</h1>
    <p>System Online - <a href="/octopi/health">Health Check</a></p>
</body>
</html>`;
        await fs.writeFile(indexPath, fallbackHtml);
        console.log('  ⚠️  Created client/dist/index.html (template not found, using fallback)');
      }
    }
  } catch (error) {
    console.log(`  ⚠️  Could not setup client assets: ${error.message}`);
  }

  console.log('\n✅ Build completed successfully!\n');
  console.log('📝 Next steps:');
  console.log('  1. Copy config/config.example.json to config/config.json');
  console.log('  2. Set environment variables: OPENAI_API_KEY, OPENROUTER_API_KEY, JWT_SECRET');
  console.log('  3. Run: npm start\n');
}

build().catch(error => {
  console.error('💥 Build failed:', error.message);
  process.exit(1);
});
