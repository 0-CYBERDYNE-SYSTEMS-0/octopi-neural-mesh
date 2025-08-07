#!/usr/bin/env node
/**
 * Research Agent
 * Specialized agent for web scraping, data analysis, and information gathering
 */

import { AgentBase } from '../shared/agent-base.js';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Research Agent Class
 * Handles research tasks, web scraping, data analysis, and report generation
 */
class ResearchAgent extends AgentBase {
  constructor(config) {
    super(config);
    
    // Add research-specific capabilities
    this.capabilities.add('web-scraping');
    this.capabilities.add('data-analysis');
    this.capabilities.add('information-gathering');
    this.capabilities.add('content-extraction');
    this.capabilities.add('report-generation');
    this.capabilities.add('fact-checking');
    this.capabilities.add('trend-analysis');
    this.capabilities.add('competitive-analysis');
    
    // Research agent state
    this.activeResearch = new Map();
    this.dataCache = new Map();
    this.reportTemplates = this.initializeReportTemplates();
    
    // HTTP client configuration
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OctopiResearch/1.0)'
      }
    });
  }

  /**
   * Initialize report templates
   */
  initializeReportTemplates() {
    return {
      'research-summary': {
        name: 'Research Summary Report',
        description: 'Comprehensive summary of research findings',
        sections: ['Executive Summary', 'Key Findings', 'Data Analysis', 'Recommendations', 'Sources']
      },
      'competitive-analysis': {
        name: 'Competitive Analysis Report',
        description: 'Analysis of competitors and market positioning',
        sections: ['Market Overview', 'Competitor Profiles', 'Feature Comparison', 'SWOT Analysis', 'Strategic Recommendations']
      },
      'trend-analysis': {
        name: 'Trend Analysis Report',
        description: 'Analysis of current trends and future projections',
        sections: ['Current State', 'Trend Identification', 'Impact Analysis', 'Future Projections', 'Action Items']
      },
      'fact-sheet': {
        name: 'Fact Sheet',
        description: 'Concise factual summary with key data points',
        sections: ['Overview', 'Key Statistics', 'Important Facts', 'Quick References']
      }
    };
  }

  /**
   * Process incoming research tasks
   */
  async processTask(task) {
    this.log('info', 'Processing research task', { taskId: task.id, type: task.type });

    try {
      switch (task.type) {
        case 'web-scraping':
          return await this.performWebScraping(task);
          
        case 'data-analysis':
          return await this.performDataAnalysis(task);
          
        case 'information-gathering':
          return await this.gatherInformation(task);
          
        case 'report-generation':
          return await this.generateReport(task);
          
        case 'competitive-analysis':
          return await this.performCompetitiveAnalysis(task);
          
        case 'trend-analysis':
          return await this.performTrendAnalysis(task);
          
        case 'fact-checking':
          return await this.performFactChecking(task);
          
        case 'workflow-step':
          return await this.executeWorkflowStep(task);
          
        default:
          // Try to infer task type from description
          return await this.handleGenericResearch(task);
      }
      
    } catch (error) {
      this.log('error', 'Research task failed', {
        taskId: task.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Perform web scraping operations
   */
  async performWebScraping(task) {
    const { urls = [], selectors = [], extractText = true } = task;
    
    this.log('info', 'Starting web scraping', { 
      urlCount: urls.length,
      selectors: selectors.length 
    });

    const scrapedData = [];

    for (const url of urls) {
      try {
        this.log('debug', 'Scraping URL', { url });
        
        const response = await this.httpClient.get(url, {
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });

        const data = {
          url,
          status: response.status,
          contentLength: response.data.length,
          scrapedAt: new Date(),
          content: null,
          extractedData: {}
        };

        if (extractText) {
          // Extract text content (simplified - would use a proper HTML parser in production)
          data.content = this.extractTextFromHTML(response.data);
        }

        // Apply selectors if provided (simplified implementation)
        for (const selector of selectors) {
          data.extractedData[selector] = this.extractBySelector(response.data, selector);
        }

        scrapedData.push(data);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        this.log('warn', 'Failed to scrape URL', { url, error: error.message });
        scrapedData.push({
          url,
          error: error.message,
          scrapedAt: new Date(),
          success: false
        });
      }
    }

    // Cache the scraped data
    const cacheKey = `scraping_${Date.now()}`;
    this.dataCache.set(cacheKey, scrapedData);

    return {
      success: true,
      action: 'web-scraping-completed',
      data: scrapedData,
      summary: {
        totalUrls: urls.length,
        successfulScrapes: scrapedData.filter(d => !d.error).length,
        failedScrapes: scrapedData.filter(d => d.error).length
      },
      cacheKey,
      message: `🔍 Scraped ${scrapedData.length} URLs successfully`
    };
  }

  /**
   * Perform data analysis on collected data
   */
  async performDataAnalysis(task) {
    const { data, analysisType = 'summary', cacheKey } = task;
    
    let analysisData = data;
    
    // Retrieve from cache if cacheKey provided
    if (cacheKey && this.dataCache.has(cacheKey)) {
      analysisData = this.dataCache.get(cacheKey);
    }

    if (!analysisData) {
      throw new Error('No data provided for analysis');
    }

    this.log('info', 'Performing data analysis', { 
      analysisType,
      dataPoints: Array.isArray(analysisData) ? analysisData.length : 'object'
    });

    // Use AI to analyze the data
    const messages = [
      {
        role: 'system',
        content: `You are a data analyst. Analyze the provided data and generate insights based on the analysis type: ${analysisType}. Be thorough and provide actionable insights.`
      },
      {
        role: 'user',
        content: `Please analyze this data:

Analysis Type: ${analysisType}

Data:
${JSON.stringify(analysisData, null, 2)}

Provide:
1. Key findings and patterns
2. Statistical insights (if applicable)
3. Trends and anomalies
4. Actionable recommendations
5. Data quality assessment`
      }
    ];

    try {
      const response = await this.callAI(messages);
      const analysis = response.choices[0].message.content;

      const analysisResult = {
        success: true,
        action: 'data-analysis-completed',
        analysisType,
        findings: analysis,
        dataSize: Array.isArray(analysisData) ? analysisData.length : 1,
        analyzedAt: new Date(),
        metadata: {
          aiGenerated: true,
          analysisType,
          dataSource: cacheKey || 'direct'
        }
      };

      // Cache the analysis results
      const analysisCacheKey = `analysis_${Date.now()}`;
      this.dataCache.set(analysisCacheKey, analysisResult);

      return {
        ...analysisResult,
        cacheKey: analysisCacheKey,
        message: `📊 Data analysis (${analysisType}) completed successfully`
      };

    } catch (error) {
      this.log('error', 'Data analysis failed', { error: error.message });
      throw new Error(`Data analysis failed: ${error.message}`);
    }
  }

  /**
   * Gather information on a specific topic
   */
  async gatherInformation(task) {
    const { topic, depth = 'comprehensive', sources = ['web'] } = task;
    
    this.log('info', 'Gathering information', { topic, depth, sources });

    // Use AI to gather information
    const messages = [
      {
        role: 'system',
        content: `You are a research specialist. Gather comprehensive information on the requested topic. Provide accurate, well-sourced, and up-to-date information.`
      },
      {
        role: 'user',
        content: `Please gather ${depth} information on: ${topic}

Research Requirements:
- Provide factual, accurate information
- Include key statistics and data points
- Identify main concepts and terminology
- Note important trends or developments
- Suggest related topics for further research
- Cite information sources where possible

Format the response as a structured research summary.`
      }
    ];

    try {
      const response = await this.callAI(messages);
      const researchSummary = response.choices[0].message.content;

      const researchId = `research_${Date.now()}`;
      this.activeResearch.set(researchId, {
        topic,
        depth,
        sources,
        summary: researchSummary,
        createdAt: new Date(),
        status: 'completed'
      });

      return {
        success: true,
        action: 'information-gathering-completed',
        topic,
        researchId,
        summary: researchSummary,
        metadata: {
          depth,
          sources,
          aiGenerated: true,
          wordCount: researchSummary.length
        },
        message: `🔬 Information gathering on "${topic}" completed`
      };

    } catch (error) {
      this.log('error', 'Information gathering failed', { error: error.message });
      throw new Error(`Information gathering failed: ${error.message}`);
    }
  }

  /**
   * Generate research reports
   */
  async generateReport(task) {
    const { 
      reportType = 'research-summary',
      title,
      data,
      template,
      includeCharts = false
    } = task;

    const reportTemplate = this.reportTemplates[reportType];
    if (!reportTemplate) {
      throw new Error(`Unknown report template: ${reportType}`);
    }

    this.log('info', 'Generating report', { reportType, title });

    // Use AI to generate the report
    const messages = [
      {
        role: 'system',
        content: `You are a professional research analyst. Generate a comprehensive ${reportTemplate.name} with the following sections: ${reportTemplate.sections.join(', ')}. Make it professional, well-structured, and actionable.`
      },
      {
        role: 'user',
        content: `Generate a ${reportTemplate.name} with the following details:

Title: ${title || 'Research Report'}
Type: ${reportType}

Data/Information:
${data ? JSON.stringify(data, null, 2) : 'Use general knowledge and best practices'}

Required Sections:
${reportTemplate.sections.map(section => `- ${section}`).join('\n')}

Format the report with:
- Clear headings and structure
- Executive summary at the top
- Key findings highlighted
- Actionable recommendations
- Professional tone and presentation
${includeCharts ? '- Suggest places where charts/graphs would be helpful' : ''}`
      }
    ];

    try {
      const response = await this.callAI(messages);
      const reportContent = response.choices[0].message.content;

      // Save report to file
      const reportsDir = path.join(process.cwd(), 'reports');
      await fs.mkdir(reportsDir, { recursive: true });
      
      const filename = `${title || 'research-report'}_${Date.now()}.md`.replace(/[^a-zA-Z0-9-_]/g, '');
      const reportPath = path.join(reportsDir, filename);
      
      await fs.writeFile(reportPath, reportContent);

      return {
        success: true,
        action: 'report-generated',
        reportType,
        title: title || 'Research Report',
        content: reportContent,
        reportPath,
        template: reportTemplate.name,
        sections: reportTemplate.sections,
        metadata: {
          aiGenerated: true,
          wordCount: reportContent.length,
          includeCharts,
          generatedAt: new Date()
        },
        message: `📋 Report generated and saved to ${reportPath}`
      };

    } catch (error) {
      this.log('error', 'Report generation failed', { error: error.message });
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  /**
   * Perform competitive analysis
   */
  async performCompetitiveAnalysis(task) {
    const { competitors = [], industry, focusAreas = [] } = task;

    this.log('info', 'Performing competitive analysis', { 
      competitors: competitors.length,
      industry 
    });

    const messages = [
      {
        role: 'system',
        content: 'You are a business analyst specializing in competitive analysis. Provide thorough, strategic insights about competitors and market positioning.'
      },
      {
        role: 'user',
        content: `Perform a competitive analysis for the ${industry} industry:

Competitors to analyze:
${competitors.map(comp => `- ${comp}`).join('\n')}

Focus Areas:
${focusAreas.length > 0 ? focusAreas.map(area => `- ${area}`).join('\n') : '- Market position\n- Product features\n- Pricing strategy\n- Customer satisfaction'}

Provide:
1. Market overview and positioning
2. Competitor profiles with strengths/weaknesses
3. Feature comparison matrix
4. Pricing analysis
5. Market gaps and opportunities
6. Strategic recommendations`
      }
    ];

    try {
      const response = await this.callAI(messages);
      const analysis = response.choices[0].message.content;

      return {
        success: true,
        action: 'competitive-analysis-completed',
        industry,
        competitors,
        focusAreas,
        analysis,
        analyzedAt: new Date(),
        metadata: {
          competitorCount: competitors.length,
          aiGenerated: true,
          analysisType: 'competitive'
        },
        message: `🏆 Competitive analysis for ${industry} completed`
      };

    } catch (error) {
      throw new Error(`Competitive analysis failed: ${error.message}`);
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
      case 'gather-information':
        const topic = step.inputs?.[0] || step.workflowContext?.topic || 'research topic';
        return await this.gatherInformation({
          topic,
          depth: 'comprehensive',
          sources: ['web', 'ai']
        });

      case 'analyze-data':
        // Use data from previous workflow steps
        const previousResults = step.previousResults || {};
        const dataToAnalyze = Object.values(previousResults).find(result => result.summary || result.data);
        
        return await this.performDataAnalysis({
          data: dataToAnalyze,
          analysisType: 'workflow-analysis'
        });

      case 'extract-data':
        const sources = step.inputs || step.workflowContext?.sources || [];
        if (sources.length > 0 && sources[0].includes('http')) {
          return await this.performWebScraping({
            urls: sources,
            extractText: true
          });
        } else {
          return await this.gatherInformation({
            topic: sources.join(', '),
            depth: 'detailed'
          });
        }

      case 'clean-data':
        return await this.performDataAnalysis({
          data: step.previousResults,
          analysisType: 'data-cleaning'
        });

      default:
        return await this.handleGenericResearch({ ...task, type: step.action });
    }
  }

  /**
   * Handle generic research tasks by inferring intent
   */
  async handleGenericResearch(task) {
    const description = task.description || task.type || '';
    const lowerDesc = description.toLowerCase();

    // Competitive analysis
    if (lowerDesc.includes('competitor') || lowerDesc.includes('competition')) {
      const industry = this.extractIndustryFromDescription(description);
      const competitors = this.extractCompetitorsFromDescription(description);
      
      return await this.performCompetitiveAnalysis({
        industry: industry || 'market',
        competitors,
        focusAreas: ['features', 'pricing', 'positioning']
      });
    }

    // Data analysis
    if (lowerDesc.includes('analyz') || lowerDesc.includes('data')) {
      return await this.performDataAnalysis({
        data: task.data || task.context,
        analysisType: 'general'
      });
    }

    // Web scraping
    if (lowerDesc.includes('scrape') || lowerDesc.includes('extract') && task.urls) {
      return await this.performWebScraping({
        urls: task.urls || [],
        extractText: true
      });
    }

    // Report generation
    if (lowerDesc.includes('report') || lowerDesc.includes('summary')) {
      return await this.generateReport({
        reportType: 'research-summary',
        title: task.title || 'Research Report',
        data: task.data || task.context
      });
    }

    // Default: Information gathering
    const topic = task.topic || description || 'general research';
    return await this.gatherInformation({
      topic,
      depth: 'comprehensive'
    });
  }

  /**
   * Helper methods for text processing
   */
  extractTextFromHTML(html) {
    // Simple text extraction (would use a proper HTML parser in production)
    return html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractBySelector(html, selector) {
    // Simplified selector extraction (would use a proper CSS selector engine)
    const pattern = new RegExp(`<[^>]*class=["']?[^"']*${selector}[^"']*["']?[^>]*>(.*?)</`, 'is');
    const match = html.match(pattern);
    return match ? match[1] : null;
  }

  extractIndustryFromDescription(description) {
    const industryKeywords = ['tech', 'finance', 'healthcare', 'retail', 'education', 'automotive'];
    for (const keyword of industryKeywords) {
      if (description.toLowerCase().includes(keyword)) {
        return keyword;
      }
    }
    return null;
  }

  extractCompetitorsFromDescription(description) {
    // Simple competitor extraction logic
    const words = description.split(' ');
    const competitors = [];
    
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i].toLowerCase() === 'vs' || words[i].toLowerCase() === 'versus') {
        competitors.push(words[i + 1]);
      }
    }
    
    return competitors;
  }

  /**
   * Initialize research agent
   */
  async initialize() {
    this.log('info', 'Initializing Research Agent');
    
    // Setup research-specific terminal commands
    this.terminalCommands.set('octopi-research', {
      description: 'Research a topic',
      handler: (args) => {
        const topic = args.join(' ') || 'general research';
        return this.gatherInformation({ topic });
      }
    });

    this.terminalCommands.set('octopi-scrape', {
      description: 'Scrape web URLs',
      handler: (args) => {
        const urls = args.filter(arg => arg.includes('http'));
        return this.performWebScraping({ urls, extractText: true });
      }
    });

    this.terminalCommands.set('octopi-analyze', {
      description: 'Analyze cached data',
      handler: (args) => {
        const [cacheKey] = args;
        return this.performDataAnalysis({ 
          cacheKey, 
          analysisType: 'summary' 
        });
      }
    });

    this.terminalCommands.set('octopi-report', {
      description: 'Generate a research report',
      handler: (args) => {
        const [reportType, title] = args;
        return this.generateReport({
          reportType: reportType || 'research-summary',
          title: title || 'Research Report'
        });
      }
    });

    this.terminalCommands.set('octopi-competitive', {
      description: 'Perform competitive analysis',
      handler: (args) => {
        const [industry, ...competitors] = args;
        return this.performCompetitiveAnalysis({
          industry: industry || 'market',
          competitors
        });
      }
    });

    console.log('🔬 Research Agent initialized with information gathering capabilities');
  }

  /**
   * Cleanup research agent resources
   */
  async cleanup() {
    this.log('info', 'Cleaning up Research Agent');
    this.activeResearch.clear();
    this.dataCache.clear();
  }
}

// Start the agent if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = JSON.parse(process.env.OCTOPI_CONFIG || '{}');
  const agent = new ResearchAgent(config);
  agent.start().catch(error => {
    console.error('Failed to start Research Agent:', error.message);
    process.exit(1);
  });
}

export { ResearchAgent };