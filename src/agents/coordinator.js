#!/usr/bin/env node
/**
 * Coordinator Agent
 * Master orchestrator for task distribution and multi-agent coordination
 */

import { AgentBase } from '../shared/agent-base.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Coordinator Agent Class
 * Routes tasks to appropriate specialized agents and manages workflows
 */
class CoordinatorAgent extends AgentBase {
  constructor(config) {
    super(config);
    
    // Add coordinator-specific capabilities
    this.capabilities.add('task-routing');
    this.capabilities.add('agent-spawning');
    this.capabilities.add('workflow-coordination');
    this.capabilities.add('multi-step-planning');
    this.capabilities.add('resource-allocation');

    // Coordinator state
    this.activeWorkflows = new Map();
    this.taskHistory = [];
    this.agentAssignments = new Map();
    
    // Task routing rules
    this.taskRoutes = this.initializeTaskRoutes();
    
    // Workflow templates
    this.workflowTemplates = this.initializeWorkflowTemplates();
  }

  /**
   * Initialize task routing rules
   */
  initializeTaskRoutes() {
    return {
      // Research-related tasks
      'web-scraping': 'research',
      'data-analysis': 'research', 
      'information-gathering': 'research',
      'content-extraction': 'research',
      'report-generation': 'research',

      // Development-related tasks
      'code-generation': 'code',
      'github-operations': 'code',
      'file-management': 'code',
      'code-review': 'code',
      'repository-management': 'code',

      // DevOps-related tasks
      'server-management': 'devops',
      'deployment': 'devops',
      'monitoring': 'devops',
      'infrastructure': 'devops',
      'system-administration': 'devops',

      // Replication-related tasks
      'colony-expansion': 'replication',
      'system-discovery': 'replication',
      'self-replication': 'replication',
      'network-topology': 'replication'
    };
  }

  /**
   * Initialize workflow templates for complex multi-agent tasks
   */
  initializeWorkflowTemplates() {
    return {
      'research-and-code': {
        name: 'Research and Code Workflow',
        description: 'Research a topic and create code implementation',
        steps: [
          { agent: 'research', action: 'gather-information', inputs: ['topic'] },
          { agent: 'research', action: 'analyze-data', dependencies: ['gather-information'] },
          { agent: 'code', action: 'generate-code', dependencies: ['analyze-data'] },
          { agent: 'code', action: 'create-documentation', dependencies: ['generate-code'] }
        ]
      },

      'full-stack-deployment': {
        name: 'Full Stack Deployment Workflow',
        description: 'Complete application development and deployment',
        steps: [
          { agent: 'code', action: 'setup-repository' },
          { agent: 'code', action: 'implement-backend', dependencies: ['setup-repository'] },
          { agent: 'code', action: 'implement-frontend', dependencies: ['setup-repository'] },
          { agent: 'devops', action: 'setup-infrastructure', dependencies: ['implement-backend'] },
          { agent: 'devops', action: 'deploy-application', dependencies: ['implement-frontend', 'setup-infrastructure'] },
          { agent: 'devops', action: 'setup-monitoring', dependencies: ['deploy-application'] }
        ]
      },

      'colony-expansion': {
        name: 'Colony Expansion Workflow',
        description: 'Discover and colonize new systems',
        steps: [
          { agent: 'replication', action: 'discover-systems' },
          { agent: 'devops', action: 'assess-resources', dependencies: ['discover-systems'] },
          { agent: 'replication', action: 'deploy-agents', dependencies: ['assess-resources'] },
          { agent: 'replication', action: 'establish-communication', dependencies: ['deploy-agents'] }
        ]
      },

      'data-pipeline': {
        name: 'Data Pipeline Workflow',
        description: 'Extract, process, and analyze data from multiple sources',
        steps: [
          { agent: 'research', action: 'extract-data', inputs: ['sources'] },
          { agent: 'research', action: 'clean-data', dependencies: ['extract-data'] },
          { agent: 'research', action: 'analyze-data', dependencies: ['clean-data'] },
          { agent: 'code', action: 'create-dashboard', dependencies: ['analyze-data'] },
          { agent: 'devops', action: 'deploy-dashboard', dependencies: ['create-dashboard'] }
        ]
      }
    };
  }

  /**
   * Process incoming task
   */
  async processTask(task) {
    this.log('info', 'Processing task', { taskId: task.id, type: task.type });

    try {
      // Determine if this is a simple task or complex workflow
      if (task.workflow) {
        return await this.executeWorkflow(task);
      } else {
        return await this.routeTask(task);
      }
    } catch (error) {
      this.log('error', 'Task processing failed', {
        taskId: task.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Route simple task to appropriate agent
   */
  async routeTask(task) {
    // Determine target agent type
    const targetAgentType = this.determineAgentType(task);
    
    if (!targetAgentType) {
      throw new Error(`No suitable agent type found for task: ${task.type}`);
    }

    this.log('info', 'Routing task', {
      taskId: task.id,
      targetAgentType,
      taskType: task.type
    });

    // Request handoff to appropriate agent
    await this.requestHandoff({
      toAgentType: targetAgentType,
      context: {
        task: task,
        routing: {
          reason: 'task-specialization',
          originalAgent: this.agentId,
          timestamp: new Date()
        }
      },
      priority: task.priority || 5
    });

    // Track assignment
    this.agentAssignments.set(task.id, {
      taskId: task.id,
      assignedTo: targetAgentType,
      assignedAt: new Date(),
      status: 'handed-off'
    });

    return {
      success: true,
      action: 'task-routed',
      targetAgent: targetAgentType,
      message: `Task routed to ${targetAgentType} agent`
    };
  }

  /**
   * Execute complex multi-agent workflow
   */
  async executeWorkflow(task) {
    const workflowTemplate = this.workflowTemplates[task.workflow];
    
    if (!workflowTemplate) {
      throw new Error(`Unknown workflow template: ${task.workflow}`);
    }

    const workflowId = uuidv4();
    
    this.log('info', 'Starting workflow execution', {
      workflowId,
      template: task.workflow,
      taskId: task.id
    });

    // Create workflow instance
    const workflow = {
      id: workflowId,
      templateName: task.workflow,
      template: workflowTemplate,
      taskId: task.id,
      status: 'running',
      startedAt: new Date(),
      steps: workflowTemplate.steps.map((step, index) => ({
        id: `${workflowId}-step-${index}`,
        ...step,
        status: 'pending',
        dependencies: step.dependencies || []
      })),
      context: task.context || {},
      results: new Map()
    };

    this.activeWorkflows.set(workflowId, workflow);

    try {
      // Execute workflow steps
      await this.executeWorkflowSteps(workflow);
      
      workflow.status = 'completed';
      workflow.completedAt = new Date();

      this.log('info', 'Workflow completed', {
        workflowId,
        duration: workflow.completedAt - workflow.startedAt,
        stepsCompleted: workflow.steps.filter(s => s.status === 'completed').length
      });

      return {
        success: true,
        workflowId,
        results: Object.fromEntries(workflow.results),
        duration: workflow.completedAt - workflow.startedAt
      };

    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error.message;
      workflow.failedAt = new Date();

      this.log('error', 'Workflow failed', {
        workflowId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Execute workflow steps in dependency order
   */
  async executeWorkflowSteps(workflow) {
    const completedSteps = new Set();
    const maxAttempts = workflow.steps.length * 2; // Prevent infinite loops
    let attempts = 0;

    while (completedSteps.size < workflow.steps.length && attempts < maxAttempts) {
      attempts++;
      let progressMade = false;

      for (const step of workflow.steps) {
        if (step.status !== 'pending') continue;

        // Check if all dependencies are completed
        const dependenciesCompleted = step.dependencies.every(dep => 
          workflow.steps.find(s => s.action === dep)?.status === 'completed'
        );

        if (dependenciesCompleted) {
          await this.executeWorkflowStep(workflow, step);
          completedSteps.add(step.id);
          progressMade = true;
        }
      }

      if (!progressMade) {
        throw new Error('Workflow execution stalled - circular dependencies or failed steps');
      }
    }
  }

  /**
   * Execute individual workflow step
   */
  async executeWorkflowStep(workflow, step) {
    this.log('info', 'Executing workflow step', {
      workflowId: workflow.id,
      stepId: step.id,
      agent: step.agent,
      action: step.action
    });

    step.status = 'running';
    step.startedAt = new Date();

    try {
      // Prepare step context
      const stepContext = {
        workflowId: workflow.id,
        stepId: step.id,
        action: step.action,
        inputs: step.inputs || [],
        workflowContext: workflow.context,
        previousResults: Object.fromEntries(workflow.results)
      };

      // Request handoff to appropriate agent for this step
      await this.requestHandoff({
        toAgentType: step.agent,
        context: {
          task: {
            id: step.id,
            type: 'workflow-step',
            workflow: workflow.templateName,
            step: stepContext
          },
          routing: {
            reason: 'workflow-execution',
            workflowId: workflow.id,
            originalAgent: this.agentId,
            timestamp: new Date()
          }
        },
        priority: 2 // High priority for workflow steps
      });

      // For now, mark as completed (in real implementation, would wait for agent response)
      step.status = 'completed';
      step.completedAt = new Date();

      // Store step result (placeholder)
      workflow.results.set(step.action, {
        stepId: step.id,
        action: step.action,
        agent: step.agent,
        completedAt: step.completedAt,
        success: true
      });

      this.log('info', 'Workflow step completed', {
        workflowId: workflow.id,
        stepId: step.id,
        duration: step.completedAt - step.startedAt
      });

    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      step.failedAt = new Date();

      workflow.results.set(step.action, {
        stepId: step.id,
        action: step.action,
        agent: step.agent,
        error: error.message,
        success: false
      });

      throw new Error(`Workflow step failed: ${step.action} - ${error.message}`);
    }
  }

  /**
   * Determine appropriate agent type for task
   */
  determineAgentType(task) {
    // Direct mapping by task type
    if (this.taskRoutes[task.type]) {
      return this.taskRoutes[task.type];
    }

    // Check task description and keywords
    const description = (task.description || '').toLowerCase();
    const keywords = (task.keywords || []).map(k => k.toLowerCase());
    
    // Research indicators
    if (this.containsKeywords(description, keywords, [
      'scrape', 'research', 'analyze', 'data', 'extract', 'gather', 'information'
    ])) {
      return 'research';
    }

    // Code indicators  
    if (this.containsKeywords(description, keywords, [
      'code', 'develop', 'implement', 'github', 'repository', 'file', 'programming'
    ])) {
      return 'code';
    }

    // DevOps indicators
    if (this.containsKeywords(description, keywords, [
      'deploy', 'server', 'infrastructure', 'monitor', 'system', 'devops'
    ])) {
      return 'devops';
    }

    // Replication indicators
    if (this.containsKeywords(description, keywords, [
      'replicate', 'spawn', 'colony', 'expand', 'discover', 'network'
    ])) {
      return 'replication';
    }

    // Default to research for ambiguous tasks
    return 'research';
  }

  /**
   * Check if description or keywords contain target words
   */
  containsKeywords(description, keywords, targets) {
    const allText = [description, ...keywords].join(' ');
    return targets.some(target => allText.includes(target));
  }

  /**
   * Handle complex planning tasks
   */
  async planComplexTask(task) {
    this.log('info', 'Planning complex task', { taskId: task.id });

    // Use AI to break down complex tasks
    const messages = [
      {
        role: 'system',
        content: `You are a task planning coordinator for a multi-agent system. You have access to these agent types:
        
        - research: Web scraping, data analysis, information gathering
        - code: Development, GitHub operations, file management  
        - devops: Server management, deployment, monitoring
        - replication: Colony expansion, system discovery

        Break down complex tasks into a sequence of steps that can be executed by appropriate agents. Consider dependencies between steps.`
      },
      {
        role: 'user',
        content: `Please break down this task into executable steps:
        
        Task: ${task.description || task.type}
        Context: ${JSON.stringify(task.context || {}, null, 2)}
        Requirements: ${JSON.stringify(task.requirements || [], null, 2)}
        
        Provide a step-by-step plan with agent assignments and dependencies.`
      }
    ];

    try {
      const response = await this.callAI(messages);
      const plan = response.choices[0].message.content;

      this.log('info', 'Task plan generated', { taskId: task.id, plan });

      // Parse plan and create workflow (simplified for demo)
      return {
        success: true,
        plan,
        recommendation: 'Execute as custom workflow',
        suggestedWorkflow: 'custom',
        steps: plan
      };

    } catch (error) {
      this.log('error', 'Task planning failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Monitor active workflows and assignments
   */
  getWorkflowStatus() {
    const activeWorkflows = Array.from(this.activeWorkflows.values()).map(wf => ({
      id: wf.id,
      template: wf.templateName,
      status: wf.status,
      startedAt: wf.startedAt,
      completedSteps: wf.steps.filter(s => s.status === 'completed').length,
      totalSteps: wf.steps.length,
      currentStep: wf.steps.find(s => s.status === 'running')?.action
    }));

    const assignments = Array.from(this.agentAssignments.values());

    return {
      activeWorkflows,
      totalWorkflows: this.activeWorkflows.size,
      totalAssignments: this.agentAssignments.size,
      recentAssignments: assignments.slice(-10)
    };
  }

  /**
   * Initialize coordinator-specific functionality
   */
  async initialize() {
    this.log('info', 'Initializing Coordinator Agent');
    
    // Setup coordinator-specific terminal commands
    this.terminalCommands.set('octopi-workflows', {
      description: 'Show active workflows and status',
      handler: () => {
        const status = this.getWorkflowStatus();
        console.log('\n🔄 Workflow Status:');
        console.log('==================');
        console.log(`Active Workflows: ${status.totalWorkflows}`);
        console.log(`Total Assignments: ${status.totalAssignments}`);
        
        if (status.activeWorkflows.length > 0) {
          console.log('\nActive Workflows:');
          status.activeWorkflows.forEach(wf => {
            console.log(`  ${wf.id}: ${wf.template} (${wf.status}) - ${wf.completedSteps}/${wf.totalSteps} steps`);
          });
        }
        console.log('');
      }
    });

    this.terminalCommands.set('octopi-route', {
      description: 'Show task routing information',
      handler: () => {
        console.log('\n🗺️  Task Routing Rules:');
        console.log('=====================');
        for (const [taskType, agentType] of Object.entries(this.taskRoutes)) {
          console.log(`  ${taskType.padEnd(25)} → ${agentType}`);
        }
        console.log('');
      }
    });

    this.terminalCommands.set('octopi-templates', {
      description: 'List available workflow templates',
      handler: () => {
        console.log('\n📋 Workflow Templates:');
        console.log('=====================');
        for (const [name, template] of Object.entries(this.workflowTemplates)) {
          console.log(`  ${name}:`);
          console.log(`    ${template.description}`);
          console.log(`    Steps: ${template.steps.length}`);
          console.log('');
        }
      }
    });

    console.log('🎯 Coordinator Agent initialized with task routing and workflow capabilities');
  }

  /**
   * Cleanup coordinator resources
   */
  async cleanup() {
    this.log('info', 'Cleaning up Coordinator Agent');
    
    // Cancel any active workflows
    for (const workflow of this.activeWorkflows.values()) {
      if (workflow.status === 'running') {
        workflow.status = 'cancelled';
        workflow.cancelledAt = new Date();
      }
    }
  }
}

// Start the agent if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = JSON.parse(process.env.OCTOPI_CONFIG || '{}');
  const agent = new CoordinatorAgent(config);
  agent.start().catch(error => {
    console.error('Failed to start Coordinator Agent:', error.message);
    process.exit(1);
  });
}

export { CoordinatorAgent };