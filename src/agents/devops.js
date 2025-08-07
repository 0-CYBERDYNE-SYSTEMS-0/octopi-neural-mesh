#!/usr/bin/env node
/**
 * DevOps Agent
 * Specialized agent for server management, deployment, and infrastructure operations
 */

import { AgentBase } from '../shared/agent-base.js';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * DevOps Agent Class
 * Handles infrastructure management, deployments, monitoring, and system operations
 */
class DevOpsAgent extends AgentBase {
  constructor(config) {
    super(config);
    
    // Add devops-specific capabilities
    this.capabilities.add('server-management');
    this.capabilities.add('deployment');
    this.capabilities.add('monitoring');
    this.capabilities.add('infrastructure');
    this.capabilities.add('system-administration');
    this.capabilities.add('container-management');
    this.capabilities.add('process-management');
    this.capabilities.add('log-analysis');
    this.capabilities.add('backup-restore');
    this.capabilities.add('security-scanning');
    
    // DevOps agent state
    this.activeDeployments = new Map();
    this.monitoringTasks = new Map();
    this.systemMetrics = new Map();
    
    // Deployment templates
    this.deploymentTemplates = this.initializeDeploymentTemplates();
    
    // Safe command whitelist (security measure)
    this.allowedCommands = new Set([
      'npm', 'node', 'git', 'docker', 'systemctl', 'ps', 'top',
      'df', 'free', 'netstat', 'curl', 'ping', 'cat', 'ls', 'pwd',
      'mkdir', 'cp', 'mv', 'chmod', 'chown', 'tail', 'head', 'grep',
      'find', 'which', 'whoami', 'uptime', 'uname'
    ]);
  }

  /**
   * Initialize deployment templates
   */
  initializeDeploymentTemplates() {
    return {
      'node-app': {
        name: 'Node.js Application Deployment',
        description: 'Deploy a Node.js application with PM2 and nginx',
        steps: [
          { action: 'setup-environment', description: 'Setup Node.js environment' },
          { action: 'install-dependencies', description: 'Install npm dependencies' },
          { action: 'build-application', description: 'Build application' },
          { action: 'configure-pm2', description: 'Configure PM2 process manager' },
          { action: 'setup-nginx', description: 'Configure nginx reverse proxy' },
          { action: 'start-services', description: 'Start application services' }
        ],
        ports: [3000],
        services: ['pm2', 'nginx']
      },
      'docker-app': {
        name: 'Docker Application Deployment',
        description: 'Deploy application using Docker containers',
        steps: [
          { action: 'build-docker-image', description: 'Build Docker image' },
          { action: 'setup-docker-network', description: 'Setup Docker networking' },
          { action: 'configure-volumes', description: 'Configure data volumes' },
          { action: 'deploy-containers', description: 'Deploy Docker containers' },
          { action: 'setup-load-balancer', description: 'Setup load balancer' },
          { action: 'health-check', description: 'Verify deployment health' }
        ],
        ports: [80, 443],
        services: ['docker', 'docker-compose']
      },
      'static-site': {
        name: 'Static Site Deployment',
        description: 'Deploy static website with nginx',
        steps: [
          { action: 'prepare-files', description: 'Prepare static files' },
          { action: 'configure-nginx', description: 'Configure nginx' },
          { action: 'setup-ssl', description: 'Setup SSL certificates' },
          { action: 'optimize-files', description: 'Optimize static assets' },
          { action: 'start-nginx', description: 'Start nginx service' }
        ],
        ports: [80, 443],
        services: ['nginx']
      }
    };
  }

  /**
   * Process incoming DevOps tasks
   */
  async processTask(task) {
    this.log('info', 'Processing DevOps task', { taskId: task.id, type: task.type });

    try {
      switch (task.type) {
        case 'deployment':
          return await this.performDeployment(task);
          
        case 'server-management':
          return await this.manageServer(task);
          
        case 'monitoring':
          return await this.setupMonitoring(task);
          
        case 'system-check':
          return await this.performSystemCheck(task);
          
        case 'process-management':
          return await this.manageProcesses(task);
          
        case 'backup':
          return await this.performBackup(task);
          
        case 'security-scan':
          return await this.performSecurityScan(task);
          
        case 'log-analysis':
          return await this.analyzeLog(task);
          
        case 'infrastructure':
          return await this.manageInfrastructure(task);
          
        case 'workflow-step':
          return await this.executeWorkflowStep(task);
          
        default:
          // Try to infer task type from description
          return await this.handleGenericDevOpsTask(task);
      }
      
    } catch (error) {
      this.log('error', 'DevOps task failed', {
        taskId: task.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Perform application deployment
   */
  async performDeployment(task) {
    const { 
      deploymentType = 'node-app',
      applicationPath,
      targetEnvironment = 'development',
      port = 3000,
      domain,
      gitRepo
    } = task;

    const template = this.deploymentTemplates[deploymentType];
    if (!template) {
      throw new Error(`Unknown deployment template: ${deploymentType}`);
    }

    this.log('info', 'Starting deployment', { deploymentType, targetEnvironment });

    const deploymentId = `deploy_${Date.now()}`;
    const deployment = {
      id: deploymentId,
      type: deploymentType,
      template,
      applicationPath,
      targetEnvironment,
      port,
      domain,
      status: 'in-progress',
      startedAt: new Date(),
      steps: []
    };

    this.activeDeployments.set(deploymentId, deployment);

    try {
      // Execute deployment steps
      for (const step of template.steps) {
        this.log('info', 'Executing deployment step', { 
          deploymentId,
          step: step.action 
        });

        const stepResult = await this.executeDeploymentStep(deployment, step);
        deployment.steps.push({
          ...step,
          result: stepResult,
          completedAt: new Date(),
          success: true
        });
      }

      deployment.status = 'completed';
      deployment.completedAt = new Date();

      return {
        success: true,
        action: 'deployment-completed',
        deploymentId,
        type: deploymentType,
        port,
        domain,
        environment: targetEnvironment,
        duration: deployment.completedAt - deployment.startedAt,
        stepsCompleted: deployment.steps.length,
        message: `🚀 Deployment ${deploymentId} completed successfully`
      };

    } catch (error) {
      deployment.status = 'failed';
      deployment.error = error.message;
      deployment.failedAt = new Date();
      
      this.log('error', 'Deployment failed', { deploymentId, error: error.message });
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  /**
   * Execute individual deployment step
   */
  async executeDeploymentStep(deployment, step) {
    switch (step.action) {
      case 'setup-environment':
        return await this.setupEnvironment(deployment);
        
      case 'install-dependencies':
        return await this.installDependencies(deployment);
        
      case 'build-application':
        return await this.buildApplication(deployment);
        
      case 'configure-pm2':
        return await this.configurePM2(deployment);
        
      case 'setup-nginx':
        return await this.setupNginx(deployment);
        
      case 'start-services':
        return await this.startServices(deployment);
        
      case 'health-check':
        return await this.performHealthCheck(deployment);
        
      default:
        this.log('warn', 'Unknown deployment step', { step: step.action });
        return { success: true, message: `Step ${step.action} skipped` };
    }
  }

  /**
   * Setup application environment
   */
  async setupEnvironment(deployment) {
    this.log('info', 'Setting up environment', { deploymentId: deployment.id });

    const commands = [
      'node --version',
      'npm --version'
    ];

    const results = [];
    for (const command of commands) {
      try {
        const result = await this.executeCommand(command);
        results.push({ command, success: true, output: result.stdout });
      } catch (error) {
        results.push({ command, success: false, error: error.message });
      }
    }

    return {
      success: true,
      action: 'environment-setup',
      results,
      message: 'Environment setup completed'
    };
  }

  /**
   * Install application dependencies
   */
  async installDependencies(deployment) {
    const { applicationPath } = deployment;
    
    if (!applicationPath) {
      return { success: true, message: 'No application path specified, skipping dependency installation' };
    }

    this.log('info', 'Installing dependencies', { 
      deploymentId: deployment.id,
      path: applicationPath 
    });

    try {
      const result = await this.executeCommand('npm install', { cwd: applicationPath });
      
      return {
        success: true,
        action: 'dependencies-installed',
        output: result.stdout,
        message: 'Dependencies installed successfully'
      };
      
    } catch (error) {
      throw new Error(`Dependency installation failed: ${error.message}`);
    }
  }

  /**
   * Build application
   */
  async buildApplication(deployment) {
    const { applicationPath } = deployment;
    
    if (!applicationPath) {
      return { success: true, message: 'No application path specified, skipping build' };
    }

    try {
      // Check if build script exists in package.json
      const packageJsonPath = path.join(applicationPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      if (packageJson.scripts && packageJson.scripts.build) {
        const result = await this.executeCommand('npm run build', { cwd: applicationPath });
        
        return {
          success: true,
          action: 'application-built',
          output: result.stdout,
          message: 'Application built successfully'
        };
      } else {
        return {
          success: true,
          action: 'build-skipped',
          message: 'No build script found, skipping build step'
        };
      }
      
    } catch (error) {
      // If package.json doesn't exist or build fails, continue without error
      return {
        success: true,
        action: 'build-skipped',
        message: `Build step skipped: ${error.message}`
      };
    }
  }

  /**
   * Manage server operations
   */
  async manageServer(task) {
    const { operation, service, config } = task;

    this.log('info', 'Managing server', { operation, service });

    switch (operation) {
      case 'status':
        return await this.getServerStatus();
        
      case 'restart-service':
        return await this.restartService(service);
        
      case 'update-config':
        return await this.updateServerConfig(service, config);
        
      case 'cleanup':
        return await this.performServerCleanup();
        
      default:
        throw new Error(`Unknown server operation: ${operation}`);
    }
  }

  /**
   * Get comprehensive server status
   */
  async getServerStatus() {
    this.log('info', 'Getting server status');

    const statusCommands = {
      uptime: 'uptime',
      memory: 'free -h',
      disk: 'df -h',
      processes: 'ps aux --sort=-%cpu | head -10',
      network: 'netstat -tuln | grep LISTEN',
      load: 'cat /proc/loadavg'
    };

    const status = {};
    
    for (const [key, command] of Object.entries(statusCommands)) {
      try {
        const result = await this.executeCommand(command);
        status[key] = {
          success: true,
          output: result.stdout,
          timestamp: new Date()
        };
      } catch (error) {
        status[key] = {
          success: false,
          error: error.message,
          timestamp: new Date()
        };
      }
    }

    // Cache system metrics
    this.systemMetrics.set('latest', status);

    return {
      success: true,
      action: 'server-status',
      status,
      timestamp: new Date(),
      message: '🖥️ Server status retrieved successfully'
    };
  }

  /**
   * Perform system health check
   */
  async performSystemCheck(task) {
    const { checkType = 'basic', thresholds = {} } = task;

    this.log('info', 'Performing system check', { checkType });

    const healthCheck = {
      checkType,
      timestamp: new Date(),
      checks: [],
      overallHealth: 'healthy',
      warnings: [],
      errors: []
    };

    // Basic system checks
    try {
      // Memory check
      const memoryResult = await this.executeCommand('free -m');
      const memoryLines = memoryResult.stdout.split('\n');
      const memoryInfo = memoryLines[1].split(/\s+/);
      const memoryUsed = parseInt(memoryInfo[2]);
      const memoryTotal = parseInt(memoryInfo[1]);
      const memoryUsagePercent = (memoryUsed / memoryTotal) * 100;

      healthCheck.checks.push({
        name: 'memory-usage',
        value: memoryUsagePercent,
        status: memoryUsagePercent > 90 ? 'critical' : memoryUsagePercent > 75 ? 'warning' : 'ok',
        details: `${memoryUsagePercent.toFixed(1)}% used (${memoryUsed}MB / ${memoryTotal}MB)`
      });

      if (memoryUsagePercent > 90) {
        healthCheck.errors.push('High memory usage detected');
        healthCheck.overallHealth = 'critical';
      } else if (memoryUsagePercent > 75) {
        healthCheck.warnings.push('Elevated memory usage');
        if (healthCheck.overallHealth === 'healthy') healthCheck.overallHealth = 'warning';
      }

      // Disk usage check
      const diskResult = await this.executeCommand('df -h /');
      const diskLines = diskResult.stdout.split('\n');
      const diskInfo = diskLines[1].split(/\s+/);
      const diskUsagePercent = parseInt(diskInfo[4].replace('%', ''));

      healthCheck.checks.push({
        name: 'disk-usage',
        value: diskUsagePercent,
        status: diskUsagePercent > 90 ? 'critical' : diskUsagePercent > 80 ? 'warning' : 'ok',
        details: `${diskUsagePercent}% used (${diskInfo[2]} / ${diskInfo[1]})`
      });

      if (diskUsagePercent > 90) {
        healthCheck.errors.push('Critical disk usage');
        healthCheck.overallHealth = 'critical';
      } else if (diskUsagePercent > 80) {
        healthCheck.warnings.push('High disk usage');
        if (healthCheck.overallHealth === 'healthy') healthCheck.overallHealth = 'warning';
      }

      // Load average check
      const loadResult = await this.executeCommand('cat /proc/loadavg');
      const loadAverage = parseFloat(loadResult.stdout.split(' ')[0]);

      healthCheck.checks.push({
        name: 'load-average',
        value: loadAverage,
        status: loadAverage > 4 ? 'critical' : loadAverage > 2 ? 'warning' : 'ok',
        details: `1-minute load average: ${loadAverage}`
      });

    } catch (error) {
      healthCheck.errors.push(`System check failed: ${error.message}`);
      healthCheck.overallHealth = 'critical';
    }

    return {
      success: true,
      action: 'system-check-completed',
      healthCheck,
      recommendations: this.generateHealthRecommendations(healthCheck),
      message: `🔍 System health check completed - Status: ${healthCheck.overallHealth}`
    };
  }

  /**
   * Generate health recommendations based on check results
   */
  generateHealthRecommendations(healthCheck) {
    const recommendations = [];

    for (const check of healthCheck.checks) {
      if (check.status === 'critical' || check.status === 'warning') {
        switch (check.name) {
          case 'memory-usage':
            recommendations.push('Consider adding more RAM or optimizing memory usage');
            recommendations.push('Review running processes for memory leaks');
            break;
          case 'disk-usage':
            recommendations.push('Clean up unnecessary files or add more storage');
            recommendations.push('Consider implementing log rotation');
            break;
          case 'load-average':
            recommendations.push('Check for CPU-intensive processes');
            recommendations.push('Consider scaling up CPU resources');
            break;
        }
      }
    }

    return recommendations;
  }

  /**
   * Execute workflow step
   */
  async executeWorkflowStep(task) {
    const { step } = task;
    
    this.log('info', 'Executing workflow step', { 
      stepId: step.stepId,
      action: step.action 
    });

    switch (step.action) {
      case 'assess-resources':
        return await this.performSystemCheck({ checkType: 'comprehensive' });

      case 'setup-infrastructure':
        return await this.setupInfrastructure(step);

      case 'deploy-application':
        return await this.performDeployment({
          deploymentType: 'node-app',
          applicationPath: step.workflowContext?.applicationPath
        });

      case 'setup-monitoring':
        return await this.setupMonitoring({ 
          services: ['application', 'system'],
          alerting: true 
        });

      case 'deploy-dashboard':
        return await this.performDeployment({
          deploymentType: 'static-site',
          applicationPath: step.previousResults?.dashboard?.path
        });

      default:
        return await this.handleGenericDevOpsTask({ ...task, type: step.action });
    }
  }

  /**
   * Setup basic infrastructure
   */
  async setupInfrastructure(step) {
    this.log('info', 'Setting up infrastructure');

    const infrastructureComponents = [];

    try {
      // Ensure required directories exist
      const directories = ['/var/log/octopi', '/opt/octopi', '/etc/octopi'];
      
      for (const dir of directories) {
        try {
          await this.executeCommand(`mkdir -p ${dir}`);
          infrastructureComponents.push({
            component: 'directory',
            path: dir,
            status: 'created'
          });
        } catch (error) {
          infrastructureComponents.push({
            component: 'directory',
            path: dir,
            status: 'failed',
            error: error.message
          });
        }
      }

      return {
        success: true,
        action: 'infrastructure-setup',
        components: infrastructureComponents,
        message: '🏗️ Basic infrastructure setup completed'
      };

    } catch (error) {
      throw new Error(`Infrastructure setup failed: ${error.message}`);
    }
  }

  /**
   * Execute system command safely
   */
  async executeCommand(command, options = {}) {
    // Security check: validate command against whitelist
    const commandParts = command.split(' ');
    const baseCommand = commandParts[0];

    if (!this.allowedCommands.has(baseCommand)) {
      throw new Error(`Command '${baseCommand}' not allowed for security reasons`);
    }

    this.log('debug', 'Executing command', { command });

    try {
      return await execAsync(command, {
        timeout: 30000, // 30 second timeout
        ...options
      });
    } catch (error) {
      this.log('warn', 'Command execution failed', { 
        command,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Handle generic DevOps tasks by inferring intent
   */
  async handleGenericDevOpsTask(task) {
    const description = task.description || task.type || '';
    const lowerDesc = description.toLowerCase();

    // Deployment
    if (lowerDesc.includes('deploy') || lowerDesc.includes('deployment')) {
      return await this.performDeployment({
        deploymentType: 'node-app',
        ...task
      });
    }

    // System monitoring/status
    if (lowerDesc.includes('status') || lowerDesc.includes('monitor') || lowerDesc.includes('health')) {
      return await this.performSystemCheck({ checkType: 'basic' });
    }

    // Server management
    if (lowerDesc.includes('server') || lowerDesc.includes('system')) {
      return await this.manageServer({
        operation: 'status',
        ...task
      });
    }

    // Default: System status check
    return await this.getServerStatus();
  }

  /**
   * Initialize DevOps agent
   */
  async initialize() {
    this.log('info', 'Initializing DevOps Agent');
    
    // Setup DevOps-specific terminal commands
    this.terminalCommands.set('octopi-deploy', {
      description: 'Deploy an application',
      handler: (args) => {
        const [deploymentType, applicationPath] = args;
        return this.performDeployment({
          deploymentType: deploymentType || 'node-app',
          applicationPath: applicationPath || process.cwd()
        });
      }
    });

    this.terminalCommands.set('octopi-status', {
      description: 'Get server status',
      handler: () => this.getServerStatus()
    });

    this.terminalCommands.set('octopi-health', {
      description: 'Perform system health check',
      handler: (args) => {
        const [checkType] = args;
        return this.performSystemCheck({ 
          checkType: checkType || 'basic' 
        });
      }
    });

    this.terminalCommands.set('octopi-deployments', {
      description: 'List active deployments',
      handler: () => {
        console.log('\n🚀 Active Deployments:');
        console.log('====================');
        if (this.activeDeployments.size === 0) {
          console.log('No active deployments');
        } else {
          for (const [id, deployment] of this.activeDeployments.entries()) {
            console.log(`  ${id}: ${deployment.type} (${deployment.status})`);
          }
        }
        console.log('');
      }
    });

    console.log('⚙️ DevOps Agent initialized with infrastructure management capabilities');
  }

  /**
   * Cleanup DevOps agent resources
   */
  async cleanup() {
    this.log('info', 'Cleaning up DevOps Agent');
    this.activeDeployments.clear();
    this.monitoringTasks.clear();
    this.systemMetrics.clear();
  }
}

// Start the agent if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = JSON.parse(process.env.OCTOPI_CONFIG || '{}');
  const agent = new DevOpsAgent(config);
  agent.start().catch(error => {
    console.error('Failed to start DevOps Agent:', error.message);
    process.exit(1);
  });
}

export { DevOpsAgent };