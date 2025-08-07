#!/usr/bin/env node
/**
 * Code Agent
 * Specialized agent for code generation, file operations, and development tasks
 */

import { AgentBase } from '../shared/agent-base.js';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Code Agent Class
 * Handles development tasks, code generation, file operations, and project management
 */
class CodeAgent extends AgentBase {
  constructor(config) {
    super(config);
    
    // Add code-specific capabilities
    this.capabilities.add('code-generation');
    this.capabilities.add('file-management');
    this.capabilities.add('github-operations');
    this.capabilities.add('code-review');
    this.capabilities.add('repository-management');
    this.capabilities.add('project-scaffolding');
    this.capabilities.add('dependency-management');
    this.capabilities.add('testing');
    
    // Code agent state
    this.activeProjects = new Map();
    this.codeTemplates = this.initializeCodeTemplates();
    this.supportedLanguages = new Set([
      'javascript', 'typescript', 'python', 'html', 'css', 'json',
      'markdown', 'bash', 'dockerfile', 'yaml', 'sql'
    ]);
  }

  /**
   * Initialize code templates for common patterns
   */
  initializeCodeTemplates() {
    return {
      'web-game': {
        name: 'Web Game Template',
        description: 'HTML5 Canvas game with controls and game loop',
        files: {
          'index.html': this.getWebGameHTMLTemplate(),
          'game.js': this.getWebGameJSTemplate(),
          'style.css': this.getWebGameCSSTemplate()
        }
      },
      'node-project': {
        name: 'Node.js Project Template',
        description: 'Basic Node.js project with package.json and entry point',
        files: {
          'package.json': this.getNodePackageTemplate(),
          'index.js': this.getNodeIndexTemplate(),
          'README.md': this.getReadmeTemplate()
        }
      },
      'web-app': {
        name: 'Web Application Template',
        description: 'Static web application with HTML, CSS, and JavaScript',
        files: {
          'index.html': this.getWebGameHTMLTemplate(),
          'script.js': this.getWebGameJSTemplate(),
          'style.css': this.getWebGameCSSTemplate()
        }
      }
    };
  }

  /**
   * Process incoming code-related tasks
   */
  async processTask(task) {
    this.log('info', 'Processing code task', { taskId: task.id, type: task.type });

    try {
      switch (task.type) {
        case 'code-generation':
          return await this.generateCode(task);
          
        case 'create-game':
          return await this.createGame(task);
          
        case 'create-project':
          return await this.createProject(task);
          
        case 'file-operation':
          return await this.performFileOperation(task);
          
        case 'code-review':
          return await this.reviewCode(task);
          
        case 'run-tests':
          return await this.runTests(task);
          
        case 'install-dependencies':
          return await this.installDependencies(task);
          
        case 'workflow-step':
          return await this.executeWorkflowStep(task);
          
        default:
          // Try to infer task type from description
          return await this.handleGenericTask(task);
      }
      
    } catch (error) {
      this.log('error', 'Code task failed', {
        taskId: task.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate code based on task requirements
   */
  async generateCode(task) {
    const { language, description, requirements = [], style = 'modern' } = task;
    
    this.log('info', 'Generating code', { language, description });

    // Use AI to generate code
    const messages = [
      {
        role: 'system',
        content: `You are an expert ${language || 'JavaScript'} developer. Generate clean, well-commented, production-ready code that follows best practices and modern conventions. Always include proper error handling and make the code maintainable.`
      },
      {
        role: 'user',
        content: `Please generate ${language || 'JavaScript'} code for: ${description}

Requirements:
${requirements.map(req => `- ${req}`).join('\n')}

Style: ${style}
Make it complete and functional, ready to run without modifications.`
      }
    ];

    try {
      const response = await this.callAI(messages);
      const generatedCode = response.choices[0].message.content;

      // Extract code from response (remove markdown formatting if present)
      const codeMatch = generatedCode.match(/```(?:\w+)?\n?(.*?)\n?```/s);
      const code = codeMatch ? codeMatch[1] : generatedCode;

      return {
        success: true,
        code,
        language: language || 'javascript',
        description,
        generatedAt: new Date(),
        metadata: {
          aiGenerated: true,
          requirements,
          style
        }
      };

    } catch (error) {
      this.log('error', 'Code generation failed', { error: error.message });
      throw new Error(`Code generation failed: ${error.message}`);
    }
  }

  /**
   * Create a complete game project
   */
  async createGame(task) {
    const { gameType = 'arcade', name = 'Game', description } = task;
    
    this.log('info', 'Creating game', { gameType, name });

    // Determine game template and generate game-specific code
    let gameCode;
    if (gameType.toLowerCase().includes('centipede') || description?.toLowerCase().includes('centipede')) {
      gameCode = await this.generateCentipedeGame(task);
    } else {
      gameCode = await this.generateGenericGame(task);
    }

    // Create project files
    const projectPath = path.join(process.cwd(), `games/${name.toLowerCase().replace(/\s+/g, '-')}`);
    
    try {
      await fs.mkdir(projectPath, { recursive: true });
      
      const files = [];
      
      // Write HTML file
      const htmlFile = path.join(projectPath, 'index.html');
      await fs.writeFile(htmlFile, gameCode.html);
      files.push('index.html');
      
      // Write JavaScript file
      const jsFile = path.join(projectPath, 'game.js');
      await fs.writeFile(jsFile, gameCode.javascript);
      files.push('game.js');
      
      // Write CSS file
      const cssFile = path.join(projectPath, 'style.css');
      await fs.writeFile(cssFile, gameCode.css);
      files.push('style.css');

      this.log('info', 'Game created successfully', { 
        projectPath, 
        files: files.length 
      });

      return {
        success: true,
        action: 'game-created',
        projectPath,
        files,
        message: `🎮 ${name} created successfully! Open ${htmlFile} in a browser to play.`,
        metadata: {
          gameType,
          language: 'html/javascript',
          playable: true
        }
      };

    } catch (error) {
      this.log('error', 'Failed to create game files', { error: error.message });
      throw new Error(`Game creation failed: ${error.message}`);
    }
  }

  /**
   * Generate a Centipede-style arcade game
   */
  async generateCentipedeGame(task) {
    this.log('info', 'Generating Centipede arcade game');

    const messages = [
      {
        role: 'system',
        content: 'You are a game developer specializing in classic arcade games. Create a complete, playable Centipede-style game with HTML5 Canvas, JavaScript, and CSS.'
      },
      {
        role: 'user',
        content: `Create a complete Centipede arcade game with these features:
- HTML5 Canvas-based gameplay
- Player spaceship that can move and shoot
- Centipede that moves down the screen in a zigzag pattern
- Mushroom obstacles that can be destroyed
- Score system
- Game over conditions
- Keyboard controls (arrow keys to move, spacebar to shoot)
- Collision detection
- Smooth animation loop

Provide separate HTML, JavaScript, and CSS code. Make it fully functional and playable immediately.`
      }
    ];

    try {
      const response = await this.callAI(messages);
      const fullResponse = response.choices[0].message.content;

      // Parse the response to extract HTML, JS, and CSS
      const htmlMatch = fullResponse.match(/```html\n(.*?)\n```/s);
      const jsMatch = fullResponse.match(/```javascript\n(.*?)\n```/s);
      const cssMatch = fullResponse.match(/```css\n(.*?)\n```/s);

      return {
        html: htmlMatch ? htmlMatch[1] : this.getWebGameHTMLTemplate(),
        javascript: jsMatch ? jsMatch[1] : this.getCentipedeGameJS(),
        css: cssMatch ? cssMatch[1] : this.getWebGameCSSTemplate()
      };

    } catch (error) {
      // Fallback to hardcoded Centipede game
      this.log('warn', 'AI generation failed, using fallback', { error: error.message });
      return {
        html: this.getWebGameHTMLTemplate(),
        javascript: this.getCentipedeGameJS(),
        css: this.getWebGameCSSTemplate()
      };
    }
  }

  /**
   * Generate a generic game based on description
   */
  async generateGenericGame(task) {
    const messages = [
      {
        role: 'system',
        content: 'You are a game developer. Create complete, playable web games using HTML5 Canvas and JavaScript.'
      },
      {
        role: 'user',
        content: `Create a complete web game: ${task.description || task.name || 'arcade game'}
        
Requirements:
- HTML5 Canvas-based
- Complete game loop with update and render functions
- User controls (keyboard/mouse)
- Game mechanics and objectives
- Score system if applicable
- Responsive design

Provide separate HTML, JavaScript, and CSS code files.`
      }
    ];

    try {
      const response = await this.callAI(messages);
      const fullResponse = response.choices[0].message.content;

      // Parse response for code blocks
      const htmlMatch = fullResponse.match(/```html\n(.*?)\n```/s);
      const jsMatch = fullResponse.match(/```javascript\n(.*?)\n```/s);
      const cssMatch = fullResponse.match(/```css\n(.*?)\n```/s);

      return {
        html: htmlMatch ? htmlMatch[1] : this.getWebGameHTMLTemplate(),
        javascript: jsMatch ? jsMatch[1] : this.getWebGameJSTemplate(),
        css: cssMatch ? cssMatch[1] : this.getWebGameCSSTemplate()
      };

    } catch (error) {
      this.log('warn', 'AI generation failed, using templates', { error: error.message });
      return {
        html: this.getWebGameHTMLTemplate(),
        javascript: this.getWebGameJSTemplate(),
        css: this.getWebGameCSSTemplate()
      };
    }
  }

  /**
   * Create a new project from template
   */
  async createProject(task) {
    const { projectType, name, template } = task;
    
    const projectTemplate = this.codeTemplates[template || 'node-project'];
    if (!projectTemplate) {
      throw new Error(`Unknown project template: ${template}`);
    }

    const projectPath = path.join(process.cwd(), `projects/${name}`);
    
    try {
      await fs.mkdir(projectPath, { recursive: true });
      
      const createdFiles = [];
      
      for (const [filename, content] of Object.entries(projectTemplate.files)) {
        const filePath = path.join(projectPath, filename);
        await fs.writeFile(filePath, content);
        createdFiles.push(filename);
      }

      return {
        success: true,
        action: 'project-created',
        projectPath,
        template: template,
        files: createdFiles,
        message: `📁 Project "${name}" created using ${projectTemplate.name} template`
      };

    } catch (error) {
      throw new Error(`Project creation failed: ${error.message}`);
    }
  }

  /**
   * Perform file operations
   */
  async performFileOperation(task) {
    const { operation, filePath, content, encoding = 'utf8' } = task;

    try {
      switch (operation) {
        case 'create':
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, content, encoding);
          return { success: true, action: 'file-created', filePath };

        case 'read':
          const data = await fs.readFile(filePath, encoding);
          return { success: true, action: 'file-read', filePath, content: data };

        case 'update':
          await fs.writeFile(filePath, content, encoding);
          return { success: true, action: 'file-updated', filePath };

        case 'delete':
          await fs.unlink(filePath);
          return { success: true, action: 'file-deleted', filePath };

        case 'exists':
          try {
            await fs.access(filePath);
            return { success: true, action: 'file-exists', filePath, exists: true };
          } catch {
            return { success: true, action: 'file-exists', filePath, exists: false };
          }

        default:
          throw new Error(`Unknown file operation: ${operation}`);
      }
    } catch (error) {
      throw new Error(`File operation failed: ${error.message}`);
    }
  }

  /**
   * Handle workflow step execution
   */
  async executeWorkflowStep(task) {
    const { step } = task;
    
    this.log('info', 'Executing workflow step', { 
      stepId: step.stepId,
      action: step.action 
    });

    switch (step.action) {
      case 'generate-code':
        return await this.generateCode({
          language: 'javascript',
          description: step.workflowContext.description || 'Generate code based on requirements',
          requirements: step.inputs || []
        });

      case 'create-documentation':
        return await this.createDocumentation(step);

      case 'setup-repository':
        return await this.setupRepository(step);

      case 'implement-backend':
        return await this.implementBackend(step);

      case 'implement-frontend':
        return await this.implementFrontend(step);

      default:
        return await this.handleGenericTask({ ...task, type: step.action });
    }
  }

  /**
   * Handle generic tasks by inferring intent
   */
  async handleGenericTask(task) {
    const description = task.description || task.type || '';
    const lowerDesc = description.toLowerCase();

    // Game creation
    if (lowerDesc.includes('game') || lowerDesc.includes('centipede')) {
      return await this.createGame({
        ...task,
        gameType: lowerDesc.includes('centipede') ? 'centipede' : 'arcade',
        name: task.name || 'Arcade Game'
      });
    }

    // Code generation
    if (lowerDesc.includes('code') || lowerDesc.includes('function') || lowerDesc.includes('implement')) {
      return await this.generateCode({
        ...task,
        language: 'javascript',
        description: description
      });
    }

    // Project creation
    if (lowerDesc.includes('project') || lowerDesc.includes('create app')) {
      return await this.createProject({
        ...task,
        projectType: 'web',
        name: task.name || 'New Project',
        template: 'web-app'
      });
    }

    // Default: Generate code
    return await this.generateCode({
      ...task,
      language: 'javascript',
      description: description || 'Create a simple application'
    });
  }

  /**
   * Hardcoded Centipede game JavaScript (fallback)
   */
  getCentipedeGameJS() {
    return `// Centipede Game
class CentipedeGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = 800;
    this.canvas.height = 600;
    
    // Game state
    this.score = 0;
    this.gameRunning = true;
    this.keys = {};
    
    // Player
    this.player = {
      x: this.canvas.width / 2,
      y: this.canvas.height - 40,
      width: 30,
      height: 20,
      speed: 5
    };
    
    // Bullets
    this.bullets = [];
    this.bulletSpeed = 8;
    
    // Centipede
    this.centipede = [];
    this.initCentipede();
    
    // Mushrooms
    this.mushrooms = [];
    this.initMushrooms();
    
    this.setupEventListeners();
    this.gameLoop();
  }
  
  initCentipede() {
    for (let i = 0; i < 12; i++) {
      this.centipede.push({
        x: i * 25,
        y: 50,
        width: 20,
        height: 20,
        direction: 1,
        speed: 2
      });
    }
  }
  
  initMushrooms() {
    for (let i = 0; i < 20; i++) {
      this.mushrooms.push({
        x: Math.random() * (this.canvas.width - 20),
        y: 100 + Math.random() * (this.canvas.height - 200),
        width: 20,
        height: 20,
        health: 4
      });
    }
  }
  
  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }
  
  update() {
    if (!this.gameRunning) return;
    
    // Update player
    if (this.keys['ArrowLeft'] && this.player.x > 0) {
      this.player.x -= this.player.speed;
    }
    if (this.keys['ArrowRight'] && this.player.x < this.canvas.width - this.player.width) {
      this.player.x += this.player.speed;
    }
    if (this.keys['ArrowUp'] && this.player.y > this.canvas.height * 0.7) {
      this.player.y -= this.player.speed;
    }
    if (this.keys['ArrowDown'] && this.player.y < this.canvas.height - this.player.height) {
      this.player.y += this.player.speed;
    }
    
    // Shoot bullets
    if (this.keys['Space']) {
      this.shoot();
    }
    
    // Update bullets
    this.bullets.forEach((bullet, bulletIndex) => {
      bullet.y -= this.bulletSpeed;
      if (bullet.y < 0) {
        this.bullets.splice(bulletIndex, 1);
      }
    });
    
    // Update centipede
    this.centipede.forEach(segment => {
      segment.x += segment.direction * segment.speed;
      
      if (segment.x <= 0 || segment.x >= this.canvas.width - segment.width) {
        segment.direction *= -1;
        segment.y += 25;
      }
    });
    
    // Check collisions
    this.checkCollisions();
    
    // Check win/lose conditions
    if (this.centipede.length === 0) {
      this.score += 1000;
      this.initCentipede();
    }
    
    if (this.centipede.some(segment => segment.y > this.canvas.height - 100)) {
      this.gameRunning = false;
    }
  }
  
  shoot() {
    if (this.bullets.length < 3) {
      this.bullets.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y,
        width: 3,
        height: 10
      });
    }
  }
  
  checkCollisions() {
    // Bullet vs Centipede
    this.bullets.forEach((bullet, bulletIndex) => {
      this.centipede.forEach((segment, segmentIndex) => {
        if (this.isColliding(bullet, segment)) {
          this.bullets.splice(bulletIndex, 1);
          this.centipede.splice(segmentIndex, 1);
          this.score += 100;
          
          // Add mushroom where segment was hit
          this.mushrooms.push({
            x: segment.x,
            y: segment.y,
            width: 20,
            height: 20,
            health: 4
          });
        }
      });
    });
    
    // Bullet vs Mushroom
    this.bullets.forEach((bullet, bulletIndex) => {
      this.mushrooms.forEach((mushroom, mushroomIndex) => {
        if (this.isColliding(bullet, mushroom)) {
          this.bullets.splice(bulletIndex, 1);
          mushroom.health--;
          if (mushroom.health <= 0) {
            this.mushrooms.splice(mushroomIndex, 1);
            this.score += 50;
          }
        }
      });
    });
    
    // Player vs Centipede
    this.centipede.forEach(segment => {
      if (this.isColliding(this.player, segment)) {
        this.gameRunning = false;
      }
    });
  }
  
  isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }
  
  render() {
    // Clear canvas
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw player
    this.ctx.fillStyle = '#0f0';
    this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
    
    // Draw bullets
    this.ctx.fillStyle = '#ff0';
    this.bullets.forEach(bullet => {
      this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    // Draw centipede
    this.ctx.fillStyle = '#f0f';
    this.centipede.forEach(segment => {
      this.ctx.fillRect(segment.x, segment.y, segment.width, segment.height);
    });
    
    // Draw mushrooms
    this.ctx.fillStyle = '#8b4513';
    this.mushrooms.forEach(mushroom => {
      this.ctx.fillRect(mushroom.x, mushroom.y, mushroom.width, mushroom.height);
    });
    
    // Draw UI
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '20px Arial';
    this.ctx.fillText('Score: ' + this.score, 10, 30);
    
    if (!this.gameRunning) {
      this.ctx.fillStyle = '#f00';
      this.ctx.font = '48px Arial';
      this.ctx.fillText('GAME OVER', this.canvas.width/2 - 120, this.canvas.height/2);
      this.ctx.font = '20px Arial';
      this.ctx.fillText('Press F5 to restart', this.canvas.width/2 - 80, this.canvas.height/2 + 40);
    }
  }
  
  gameLoop() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }
}

// Start game when page loads
window.addEventListener('load', () => {
  new CentipedeGame();
});`;
  }

  /**
   * Template methods for code generation
   */
  getWebGameHTMLTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Centipede Game</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="game-container">
        <h1>Centipede Game</h1>
        <canvas id="gameCanvas"></canvas>
        <div class="instructions">
            <p><strong>Controls:</strong></p>
            <p>Arrow Keys: Move | Space: Shoot</p>
            <p>Destroy the centipede and mushrooms to score points!</p>
        </div>
    </div>
    <script src="game.js"></script>
</body>
</html>`;
  }

  getWebGameJSTemplate() {
    return `// Basic game template
console.log('Game loaded!');`;
  }

  getWebGameCSSTemplate() {
    return `body {
    margin: 0;
    padding: 20px;
    background-color: #222;
    color: white;
    font-family: Arial, sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
}

.game-container {
    text-align: center;
}

#gameCanvas {
    border: 2px solid #fff;
    background-color: #000;
    display: block;
    margin: 20px auto;
}

.instructions {
    max-width: 600px;
    margin-top: 20px;
}

.instructions p {
    margin: 5px 0;
}

h1 {
    color: #0ff;
    text-shadow: 2px 2px 4px #000;
}`;
  }

  getNodePackageTemplate() {
    return `{
  "name": "new-project",
  "version": "1.0.0",
  "description": "A new Node.js project",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {},
  "devDependencies": {}
}`;
  }

  getNodeIndexTemplate() {
    return `console.log('Hello from Node.js!');

// Your application code here
function main() {
  console.log('Application started');
}

main();`;
  }

  getReadmeTemplate() {
    return `# New Project

This is a new project created by the Octopi Code Agent.

## Getting Started

\`\`\`bash
npm install
npm start
\`\`\`

## Description

Add your project description here.`;
  }

  /**
   * Initialize code agent
   */
  async initialize() {
    this.log('info', 'Initializing Code Agent');
    
    // Setup code-specific terminal commands
    this.terminalCommands.set('octopi-create-game', {
      description: 'Create a new game project',
      handler: (args) => {
        const gameType = args.join(' ') || 'arcade';
        return this.createGame({
          gameType,
          name: 'New Game',
          description: `Create a ${gameType} game`
        });
      }
    });

    this.terminalCommands.set('octopi-generate-code', {
      description: 'Generate code based on description',
      handler: (args) => {
        const description = args.join(' ') || 'simple function';
        return this.generateCode({
          language: 'javascript',
          description
        });
      }
    });

    this.terminalCommands.set('octopi-create-project', {
      description: 'Create a new project from template',
      handler: (args) => {
        const [template, name] = args;
        return this.createProject({
          template: template || 'node-project',
          name: name || 'new-project'
        });
      }
    });

    this.terminalCommands.set('octopi-templates', {
      description: 'List available code templates',
      handler: () => {
        console.log('\n💻 Available Templates:');
        console.log('=====================');
        for (const [name, template] of Object.entries(this.codeTemplates)) {
          console.log(`  ${name}: ${template.description}`);
        }
        console.log('');
      }
    });

    console.log('💻 Code Agent initialized with development capabilities');
  }

  /**
   * Cleanup code agent resources
   */
  async cleanup() {
    this.log('info', 'Cleaning up Code Agent');
    this.activeProjects.clear();
  }
}

// Start the agent if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = JSON.parse(process.env.OCTOPI_CONFIG || '{}');
  const agent = new CodeAgent(config);
  agent.start().catch(error => {
    console.error('Failed to start Code Agent:', error.message);
    process.exit(1);
  });
}

export { CodeAgent };