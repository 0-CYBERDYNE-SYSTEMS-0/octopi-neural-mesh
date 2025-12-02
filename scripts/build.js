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
    
    // Check if index.html exists, create placeholder if not
    const indexPath = path.join(clientDistPath, 'index.html');
    try {
      await fs.access(indexPath);
      console.log('  ✅ client/dist/index.html exists');
    } catch {
      // Create a basic HTML file
      const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🐙 Octopi Neural Mesh</title>
    <style>
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e0e0e0;
            min-height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 3rem;
            color: #00d9ff;
            margin-bottom: 1rem;
        }
        .status {
            font-size: 1.2rem;
            color: #4ade80;
            margin: 1rem 0;
        }
        .links {
            margin-top: 2rem;
        }
        .links a {
            color: #00d9ff;
            text-decoration: none;
            padding: 0.5rem 1rem;
            border: 1px solid #00d9ff;
            border-radius: 4px;
            margin: 0 0.5rem;
            transition: all 0.3s ease;
        }
        .links a:hover {
            background: #00d9ff;
            color: #1a1a2e;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🐙 Octopi Neural Mesh</h1>
        <p class="status">✅ System Online</p>
        <p>Multi-Agent Terminal Coordination System</p>
        <div class="links">
            <a href="/octopi/health">Health Check</a>
            <a href="/octopi/api/agents">Agent Status</a>
        </div>
    </div>
</body>
</html>`;
      await fs.writeFile(indexPath, indexHtml);
      console.log('  ✅ Created client/dist/index.html');
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
