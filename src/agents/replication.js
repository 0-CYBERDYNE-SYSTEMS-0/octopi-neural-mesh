#!/usr/bin/env node
/**
 * Replication Agent
 * Specialized agent for self-replication, colony expansion, and system discovery
 */

import { AgentBase } from '../shared/agent-base.js';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import net from 'net';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Replication Agent Class
 * Handles self-replication, colony expansion, system discovery, and network topology
 */
class ReplicationAgent extends AgentBase {
  constructor(config) {
    super(config);
    
    // Add replication-specific capabilities
    this.capabilities.add('self-replication');
    this.capabilities.add('colony-expansion');
    this.capabilities.add('system-discovery');
    this.capabilities.add('network-topology');
    this.capabilities.add('agent-deployment');
    this.capabilities.add('resource-assessment');
    this.capabilities.add('colony-management');
    this.capabilities.add('load-balancing');
    this.capabilities.add('health-monitoring');
    
    // Replication agent state
    this.discoveredSystems = new Map();
    this.activeColonies = new Map();
    this.replicationTasks = new Map();
    this.networkTopology = new Map();
    
    // Discovery and replication settings
    this.discoverySettings = this.initializeDiscoverySettings();
    this.replicationStrategies = this.initializeReplicationStrategies();
  }

  /**
   * Initialize discovery settings
   */
  initializeDiscoverySettings() {
    return {
      portScans: {
        ssh: 22,
        http: 80,
        https: 443,
        octopi: 3000,
        docker: 2376,
        kubernetes: 6443
      },
      networkRanges: [
        '127.0.0.1', // localhost
        '192.168.1.0/24', // common local network
        '10.0.0.0/16', // private network
        '172.16.0.0/16' // docker default
      ],
      timeout: 5000,
      maxConcurrentScans: 50
    };
  }

  /**
   * Initialize replication strategies
   */
  initializeReplicationStrategies() {
    return {
      'resource-based': {
        name: 'Resource-Based Expansion',
        description: 'Replicate based on available system resources',
        criteria: {
          minMemory: '512MB',
          minStorage: '1GB',
          minCPU: 1,
          maxLoad: 2.0
        }
      },
      'geographic': {
        name: 'Geographic Distribution',
        description: 'Spread colonies across different geographic locations',
        criteria: {
          maxDistance: 100, // km
          minLatency: 50 // ms
        }
      },
      'load-balanced': {
        name: 'Load-Balanced Expansion',
        description: 'Distribute load evenly across colonies',
        criteria: {
          maxAgentsPerColony: 10,
          targetUtilization: 70
        }
      },
      'redundancy': {
        name: 'Redundancy-Based Expansion',
        description: 'Ensure high availability through redundancy',
        criteria: {
          minReplicas: 3,
          maxFailureRate: 0.1
        }
      }
    };
  }

  /**
   * Process incoming replication tasks
   */
  async processTask(task) {
    this.log('info', 'Processing replication task', { taskId: task.id, type: task.type });

    try {
      switch (task.type) {
        case 'system-discovery':
          return await this.discoverSystems(task);
          
        case 'colony-expansion':
          return await this.expandColony(task);
          
        case 'self-replication':
          return await this.performSelfReplication(task);
          
        case 'network-topology':
          return await this.analyzeNetworkTopology(task);
          
        case 'agent-deployment':
          return await this.deployAgents(task);
          
        case 'colony-management':
          return await this.manageColonies(task);
          
        case 'health-monitoring':
          return await this.monitorColonyHealth(task);
          
        case 'load-balancing':
          return await this.balanceLoad(task);
          
        case 'resource-assessment':
          return await this.assessResources(task);
          
        case 'workflow-step':
          return await this.executeWorkflowStep(task);
          
        default:
          // Try to infer task type from description
          return await this.handleGenericReplicationTask(task);
      }
      
    } catch (error) {
      this.log('error', 'Replication task failed', {
        taskId: task.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Discover available systems on the network
   */
  async discoverSystems(task) {
    const { 
      networkRanges = this.discoverySettings.networkRanges,
      ports = Object.values(this.discoverySettings.portScans),
      aggressive = false
    } = task;

    this.log('info', 'Starting system discovery', { 
      networkRanges: networkRanges.length,
      ports: ports.length 
    });

    const discoveryResults = {
      totalScanned: 0,
      systemsFound: 0,
      systems: [],
      scanDuration: 0,
      startTime: new Date()
    };

    try {
      // Generate IP addresses to scan
      const targetIPs = this.generateIPRange(networkRanges);
      
      this.log('debug', 'Generated IP targets', { count: targetIPs.length });

      // Perform network scanning
      const scanPromises = targetIPs.slice(0, aggressive ? 1000 : 100).map(async (ip) => {
        return await this.scanHost(ip, ports);
      });

      const scanResults = await Promise.all(scanPromises);
      
      // Process results
      for (const result of scanResults) {
        discoveryResults.totalScanned++;
        
        if (result.isAlive && result.services.length > 0) {
          discoveryResults.systemsFound++;
          
          const systemInfo = {
            ip: result.ip,
            hostname: result.hostname,
            services: result.services,
            osFingerprint: result.osFingerprint,
            discoveredAt: new Date(),
            potentialTarget: this.evaluateReplicationTarget(result)
          };
          
          discoveryResults.systems.push(systemInfo);
          this.discoveredSystems.set(result.ip, systemInfo);
        }
      }

      discoveryResults.scanDuration = new Date() - discoveryResults.startTime;

      // Analyze discovered systems for replication opportunities
      const replicationCandidates = discoveryResults.systems.filter(sys => sys.potentialTarget);

      return {
        success: true,
        action: 'system-discovery-completed',
        results: discoveryResults,
        replicationCandidates: replicationCandidates.length,
        topTargets: replicationCandidates.slice(0, 5),
        recommendations: this.generateDiscoveryRecommendations(discoveryResults),
        message: `🔍 Discovered ${discoveryResults.systemsFound} systems, ${replicationCandidates.length} suitable for replication`
      };

    } catch (error) {
      this.log('error', 'System discovery failed', { error: error.message });
      throw new Error(`System discovery failed: ${error.message}`);
    }
  }

  /**
   * Expand colony to new systems
   */
  async expandColony(task) {
    const {
      strategy = 'resource-based',
      targetSystems = [],
      maxColonies = 5,
      force = false
    } = task;

    const expansionStrategy = this.replicationStrategies[strategy];
    if (!expansionStrategy) {
      throw new Error(`Unknown expansion strategy: ${strategy}`);
    }

    this.log('info', 'Starting colony expansion', { 
      strategy,
      targetCount: targetSystems.length,
      maxColonies 
    });

    const expansion = {
      id: `expansion_${Date.now()}`,
      strategy,
      startedAt: new Date(),
      targetSystems,
      deployedColonies: [],
      failedDeployments: [],
      status: 'in-progress'
    };

    try {
      // If no target systems specified, discover them
      let targets = targetSystems;
      if (targets.length === 0) {
        this.log('info', 'No targets specified, discovering systems');
        const discoveryResult = await this.discoverSystems({
          aggressive: false
        });
        targets = discoveryResult.topTargets.map(t => t.ip);
      }

      // Apply strategy criteria to filter targets
      const eligibleTargets = await this.filterTargetsByStrategy(targets, expansionStrategy);
      
      this.log('info', 'Filtered targets by strategy', {
        originalCount: targets.length,
        eligibleCount: eligibleTargets.length
      });

      // Deploy to selected targets
      const deploymentPromises = eligibleTargets.slice(0, maxColonies).map(async (target) => {
        try {
          const deployment = await this.deployColonyToTarget(target, expansion);
          expansion.deployedColonies.push(deployment);
          return deployment;
        } catch (error) {
          expansion.failedDeployments.push({
            target,
            error: error.message,
            timestamp: new Date()
          });
          return null;
        }
      });

      await Promise.all(deploymentPromises);

      expansion.status = 'completed';
      expansion.completedAt = new Date();

      return {
        success: true,
        action: 'colony-expansion-completed',
        expansionId: expansion.id,
        strategy,
        deployedColonies: expansion.deployedColonies.length,
        failedDeployments: expansion.failedDeployments.length,
        totalTargets: eligibleTargets.length,
        duration: expansion.completedAt - expansion.startedAt,
        colonies: expansion.deployedColonies,
        message: `🧬 Colony expansion completed: ${expansion.deployedColonies.length} colonies deployed`
      };

    } catch (error) {
      expansion.status = 'failed';
      expansion.error = error.message;
      expansion.failedAt = new Date();
      
      throw new Error(`Colony expansion failed: ${error.message}`);
    }
  }

  /**
   * Perform self-replication to a specific target
   */
  async performSelfReplication(task) {
    const { targetHost, targetPort = 22, credentials, method = 'ssh' } = task;

    this.log('info', 'Starting self-replication', { 
      targetHost,
      targetPort,
      method 
    });

    const replicationId = uuidv4();
    const replication = {
      id: replicationId,
      targetHost,
      targetPort,
      method,
      startedAt: new Date(),
      status: 'in-progress',
      steps: []
    };

    this.replicationTasks.set(replicationId, replication);

    try {
      // Step 1: Verify target accessibility
      const accessCheck = await this.verifyTargetAccess(targetHost, targetPort);
      replication.steps.push({
        step: 'access-verification',
        success: accessCheck.success,
        details: accessCheck.details,
        timestamp: new Date()
      });

      if (!accessCheck.success) {
        throw new Error(`Target not accessible: ${accessCheck.error}`);
      }

      // Step 2: Assess target resources
      const resourceCheck = await this.assessTargetResources(targetHost);
      replication.steps.push({
        step: 'resource-assessment',
        success: resourceCheck.success,
        details: resourceCheck.details,
        timestamp: new Date()
      });

      // Step 3: Deploy Octopi system
      const deployment = await this.deployOctopiSystem(targetHost, credentials);
      replication.steps.push({
        step: 'system-deployment',
        success: deployment.success,
        details: deployment.details,
        timestamp: new Date()
      });

      // Step 4: Establish communication
      const communication = await this.establishCommunication(targetHost, deployment.port);
      replication.steps.push({
        step: 'communication-setup',
        success: communication.success,
        details: communication.details,
        timestamp: new Date()
      });

      replication.status = 'completed';
      replication.completedAt = new Date();

      // Register new colony
      const colonyId = uuidv4();
      this.activeColonies.set(colonyId, {
        id: colonyId,
        host: targetHost,
        port: deployment.port,
        status: 'active',
        deployedAt: new Date(),
        replicationId
      });

      return {
        success: true,
        action: 'self-replication-completed',
        replicationId,
        colonyId,
        targetHost,
        deploymentPort: deployment.port,
        stepsCompleted: replication.steps.filter(s => s.success).length,
        totalSteps: replication.steps.length,
        duration: replication.completedAt - replication.startedAt,
        message: `🧬 Self-replication to ${targetHost} completed successfully`
      };

    } catch (error) {
      replication.status = 'failed';
      replication.error = error.message;
      replication.failedAt = new Date();
      
      this.log('error', 'Self-replication failed', {
        replicationId,
        targetHost,
        error: error.message
      });
      
      throw new Error(`Self-replication failed: ${error.message}`);
    }
  }

  /**
   * Analyze network topology
   */
  async analyzeNetworkTopology(task) {
    const { deep = false, includeLatency = true } = task;

    this.log('info', 'Analyzing network topology', { deep, includeLatency });

    const topology = {
      nodes: [],
      connections: [],
      metrics: {},
      analyzedAt: new Date()
    };

    try {
      // Get local system info
      const localNode = await this.getLocalNodeInfo();
      topology.nodes.push(localNode);

      // Add discovered systems
      for (const [ip, system] of this.discoveredSystems.entries()) {
        topology.nodes.push({
          id: ip,
          ip: ip,
          hostname: system.hostname,
          services: system.services,
          type: 'discovered',
          status: 'unknown'
        });
      }

      // Add active colonies
      for (const [colonyId, colony] of this.activeColonies.entries()) {
        topology.nodes.push({
          id: colonyId,
          ip: colony.host,
          port: colony.port,
          type: 'colony',
          status: colony.status,
          deployedAt: colony.deployedAt
        });

        // Add connection to this colony
        topology.connections.push({
          source: 'local',
          target: colonyId,
          type: 'colony-connection',
          established: colony.deployedAt
        });
      }

      // Calculate network metrics
      if (includeLatency) {
        topology.metrics.latency = await this.measureNetworkLatency(topology.nodes);
      }

      topology.metrics.totalNodes = topology.nodes.length;
      topology.metrics.activeColonies = this.activeColonies.size;
      topology.metrics.networkHealth = this.calculateNetworkHealth(topology);

      // Store topology
      this.networkTopology.set('current', topology);

      return {
        success: true,
        action: 'network-topology-analyzed',
        topology,
        insights: this.generateTopologyInsights(topology),
        message: `🌐 Network topology analyzed: ${topology.nodes.length} nodes, ${topology.connections.length} connections`
      };

    } catch (error) {
      throw new Error(`Network topology analysis failed: ${error.message}`);
    }
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
      case 'discover-systems':
        return await this.discoverSystems({
          networkRanges: step.workflowContext?.networkRanges || this.discoverySettings.networkRanges,
          aggressive: false
        });

      case 'deploy-agents':
        const targetSystems = step.previousResults?.['assess-resources']?.eligibleSystems || [];
        return await this.deployAgents({
          targetSystems,
          agentTypes: ['coordinator', 'code']
        });

      case 'establish-communication':
        const deployedAgents = step.previousResults?.['deploy-agents']?.deployments || [];
        return await this.establishColonyCommunication(deployedAgents);

      default:
        return await this.handleGenericReplicationTask({ ...task, type: step.action });
    }
  }

  /**
   * Helper methods for replication operations
   */
  
  generateIPRange(networkRanges) {
    const ips = [];
    
    for (const range of networkRanges) {
      if (range.includes('/')) {
        // CIDR notation - simplified implementation
        const [baseIP, cidr] = range.split('/');
        const baseIPParts = baseIP.split('.').map(Number);
        
        // For small networks, just scan a subset
        if (parseInt(cidr) >= 24) {
          for (let i = 1; i < 255; i++) {
            const ip = `${baseIPParts[0]}.${baseIPParts[1]}.${baseIPParts[2]}.${i}`;
            ips.push(ip);
          }
        }
      } else {
        // Single IP
        ips.push(range);
      }
    }
    
    return ips.slice(0, 1000); // Limit for safety
  }

  async scanHost(ip, ports) {
    const result = {
      ip,
      isAlive: false,
      hostname: null,
      services: [],
      osFingerprint: null,
      scanTimestamp: new Date()
    };

    try {
      // Simple ping check first (simplified)
      const pingResult = await this.simplePing(ip);
      result.isAlive = pingResult;

      if (result.isAlive) {
        // Scan specified ports
        const portPromises = ports.map(port => this.scanPort(ip, port));
        const portResults = await Promise.all(portPromises);

        result.services = portResults.filter(p => p.open).map(p => ({
          port: p.port,
          service: this.identifyService(p.port),
          banner: p.banner
        }));
      }

    } catch (error) {
      this.log('debug', 'Host scan failed', { ip, error: error.message });
    }

    return result;
  }

  async simplePing(ip) {
    // Simplified ping implementation using port scan
    return await this.scanPort(ip, 80).then(result => result.open).catch(() => false);
  }

  async scanPort(ip, port) {
    return new Promise((resolve) => {
      const timeout = 3000;
      const socket = new net.Socket();

      const timer = setTimeout(() => {
        socket.destroy();
        resolve({ port, open: false });
      }, timeout);

      socket.connect(port, ip, () => {
        clearTimeout(timer);
        socket.destroy();
        resolve({ port, open: true, banner: null });
      });

      socket.on('error', () => {
        clearTimeout(timer);
        resolve({ port, open: false });
      });
    });
  }

  identifyService(port) {
    const services = {
      22: 'ssh',
      80: 'http',
      443: 'https',
      3000: 'octopi',
      2376: 'docker',
      6443: 'kubernetes'
    };
    return services[port] || 'unknown';
  }

  evaluateReplicationTarget(scanResult) {
    // Simple evaluation logic
    const hasSSH = scanResult.services.some(s => s.service === 'ssh');
    const hasHTTP = scanResult.services.some(s => s.service === 'http' || s.service === 'https');
    const hasOctopi = scanResult.services.some(s => s.service === 'octopi');

    // Target is good if it has SSH (for deployment) and doesn't already have Octopi
    return hasSSH && !hasOctopi;
  }

  async getLocalNodeInfo() {
    return {
      id: 'local',
      ip: '127.0.0.1',
      hostname: 'localhost',
      type: 'master',
      status: 'active',
      agentId: this.agentId,
      capabilities: Array.from(this.capabilities)
    };
  }

  /**
   * Handle generic replication tasks by inferring intent
   */
  async handleGenericReplicationTask(task) {
    const description = task.description || task.type || '';
    const lowerDesc = description.toLowerCase();

    // System discovery
    if (lowerDesc.includes('discover') || lowerDesc.includes('scan') || lowerDesc.includes('find')) {
      return await this.discoverSystems({ aggressive: false });
    }

    // Colony expansion
    if (lowerDesc.includes('expand') || lowerDesc.includes('replicate') || lowerDesc.includes('colony')) {
      return await this.expandColony({
        strategy: 'resource-based',
        maxColonies: 3
      });
    }

    // Network analysis
    if (lowerDesc.includes('network') || lowerDesc.includes('topology')) {
      return await this.analyzeNetworkTopology({ deep: false });
    }

    // Default: Discover systems
    return await this.discoverSystems({ aggressive: false });
  }

  /**
   * Initialize replication agent
   */
  async initialize() {
    this.log('info', 'Initializing Replication Agent');
    
    // Setup replication-specific terminal commands
    this.terminalCommands.set('octopi-discover', {
      description: 'Discover systems on the network',
      handler: (args) => {
        const aggressive = args.includes('--aggressive');
        return this.discoverSystems({ aggressive });
      }
    });

    this.terminalCommands.set('octopi-expand', {
      description: 'Expand colony to new systems',
      handler: (args) => {
        const [strategy, maxColonies] = args;
        return this.expandColony({
          strategy: strategy || 'resource-based',
          maxColonies: parseInt(maxColonies) || 3
        });
      }
    });

    this.terminalCommands.set('octopi-replicate', {
      description: 'Replicate to a specific target',
      handler: (args) => {
        const [targetHost, targetPort] = args;
        return this.performSelfReplication({
          targetHost: targetHost || 'localhost',
          targetPort: parseInt(targetPort) || 22
        });
      }
    });

    this.terminalCommands.set('octopi-topology', {
      description: 'Analyze network topology',
      handler: (args) => {
        const deep = args.includes('--deep');
        return this.analyzeNetworkTopology({ deep });
      }
    });

    this.terminalCommands.set('octopi-colonies', {
      description: 'List active colonies',
      handler: () => {
        console.log('\n🧬 Active Colonies:');
        console.log('==================');
        if (this.activeColonies.size === 0) {
          console.log('No active colonies');
        } else {
          for (const [id, colony] of this.activeColonies.entries()) {
            console.log(`  ${id}: ${colony.host}:${colony.port} (${colony.status})`);
          }
        }
        console.log('');
      }
    });

    console.log('🧬 Replication Agent initialized with colony expansion capabilities');
  }

  /**
   * Cleanup replication agent resources
   */
  async cleanup() {
    this.log('info', 'Cleaning up Replication Agent');
    this.discoveredSystems.clear();
    this.activeColonies.clear();
    this.replicationTasks.clear();
    this.networkTopology.clear();
  }
}

// Start the agent if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = JSON.parse(process.env.OCTOPI_CONFIG || '{}');
  const agent = new ReplicationAgent(config);
  agent.start().catch(error => {
    console.error('Failed to start Replication Agent:', error.message);
    process.exit(1);
  });
}

export { ReplicationAgent };