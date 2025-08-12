import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { ModelManager } from '../api/model-manager';
import { SecurityManager } from '../security/manager';
import { ConfigManager } from '../config/manager';
import { PromptsManager } from '../prompts/prompts-manager';
import { ChatCompletionRequest, ChatMessage } from '../api/providers/base';

export interface AgentRole {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  capabilities: string[];
  preferredModel?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface Task {
  id: string;
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedAgent?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  input: any;
  output?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface AgentInstance {
  id: string;
  role: AgentRole;
  status: 'idle' | 'busy' | 'error';
  currentTask?: string;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  lastActivity?: Date;
}

export interface WorkflowStep {
  id: string;
  agentRole: string;
  action: string;
  input?: any;
  condition?: string;
  onSuccess?: string;
  onFailure?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  variables?: Record<string, any>;
}

export class AgentOrchestrator {
  private logger: Logger;
  private modelManager: ModelManager;
  private security: SecurityManager;
  private config: ConfigManager;
  private agents: Map<string, AgentInstance> = new Map();
  private tasks: Map<string, Task> = new Map();
  private workflows: Map<string, Workflow> = new Map();
  private taskQueue: string[] = [];
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  private promptsManager: PromptsManager;

  // Predefined agent roles
  private readonly agentRoles: AgentRole[] = [
    {
      id: 'orchestrator',
      name: 'Orchestrator Agent',
      description: 'Manages task distribution and workflow coordination',
      systemPrompt: `You are the Orchestrator Agent, responsible for:
- Analyzing complex tasks and breaking them into subtasks
- Assigning tasks to appropriate specialist agents
- Coordinating workflow execution
- Monitoring progress and handling failures
- Optimizing resource allocation

Always think strategically and maintain oversight of the entire system.`,
      capabilities: ['task_decomposition', 'workflow_management', 'resource_allocation'],
      preferredModel: 'gpt-4-turbo-preview',
      temperature: 0.3
    },
    {
      id: 'builder',
      name: 'Builder Agent',
      description: 'Specializes in code generation and software development',
      systemPrompt: `You are the Builder Agent, expert in:
- Writing clean, efficient, and maintainable code
- Following best practices and design patterns
- Creating comprehensive documentation
- Implementing security measures
- Optimizing performance

Always write production-ready code with proper error handling and testing.`,
      capabilities: ['code_generation', 'architecture_design', 'testing', 'documentation'],
      preferredModel: 'claude-3-sonnet-20240229',
      temperature: 0.2
    },
    {
      id: 'designer',
      name: 'Designer Agent',
      description: 'Creates user interfaces and user experiences',
      systemPrompt: `You are the Designer Agent, focused on:
- Creating beautiful, intuitive user interfaces
- Ensuring excellent user experience
- Following modern design principles
- Implementing responsive designs
- Optimizing for accessibility

Always prioritize user needs and create visually appealing, functional designs.`,
      capabilities: ['ui_design', 'ux_design', 'prototyping', 'accessibility'],
      preferredModel: 'gpt-4-turbo-preview',
      temperature: 0.7
    },
    {
      id: 'researcher',
      name: 'Research Agent',
      description: 'Gathers information and performs analysis',
      systemPrompt: `You are the Research Agent, specialized in:
- Conducting thorough research on any topic
- Analyzing data and identifying patterns
- Providing evidence-based recommendations
- Staying current with latest developments
- Synthesizing complex information

Always provide accurate, well-sourced, and actionable insights.`,
      capabilities: ['research', 'data_analysis', 'market_research', 'competitive_analysis'],
      preferredModel: 'claude-3-opus-20240229',
      temperature: 0.4
    },
    {
      id: 'optimizer',
      name: 'Optimizer Agent',
      description: 'Improves performance and efficiency',
      systemPrompt: `You are the Optimizer Agent, dedicated to:
- Analyzing system performance bottlenecks
- Optimizing code and algorithms
- Improving resource utilization
- Reducing costs and improving efficiency
- Implementing monitoring and alerting

Always focus on measurable improvements and sustainable optimizations.`,
      capabilities: ['performance_optimization', 'cost_optimization', 'monitoring', 'scaling'],
      preferredModel: 'gpt-4-1106-preview',
      temperature: 0.1
    },
    {
      id: 'security',
      name: 'Security Agent',
      description: 'Ensures security and compliance',
      systemPrompt: `You are the Security Agent, responsible for:
- Identifying security vulnerabilities
- Implementing security best practices
- Ensuring compliance with regulations
- Conducting security audits
- Managing access controls

Always prioritize security without compromising functionality.`,
      capabilities: ['security_audit', 'vulnerability_assessment', 'compliance', 'access_control'],
      preferredModel: 'claude-3-sonnet-20240229',
      temperature: 0.1
    },
    {
      id: 'deploy',
      name: 'Deployment Agent',
      description: 'Handles deployment and DevOps operations',
      systemPrompt: `You are the Deployment Agent, expert in:
- Setting up CI/CD pipelines
- Managing cloud infrastructure
- Automating deployment processes
- Monitoring production systems
- Handling rollbacks and disaster recovery

Always ensure reliable, scalable, and automated deployments.`,
      capabilities: ['ci_cd', 'infrastructure', 'automation', 'monitoring', 'disaster_recovery'],
      preferredModel: 'gpt-4-turbo-preview',
      temperature: 0.2
    },
    {
      id: 'revenue',
      name: 'Revenue Agent',
      description: 'Focuses on monetization and business growth',
      systemPrompt: `You are the Revenue Agent, focused on:
- Identifying monetization opportunities
- Developing business strategies
- Analyzing market trends
- Optimizing pricing models
- Creating revenue streams

Always think about sustainable business growth and value creation.`,
      capabilities: ['business_strategy', 'monetization', 'market_analysis', 'pricing'],
      preferredModel: 'gpt-4-turbo-preview',
      temperature: 0.5
    },
    {
      id: 'course_creator',
      name: 'Course Creator Agent',
      description: 'Specializes in educational content and course development',
      systemPrompt: `You are the Course Creator Agent, expert in:
- Instructional design and pedagogy
- Creating engaging educational content
- Developing comprehensive curricula
- Designing assessments and evaluations
- Multimedia content production
- Learning experience optimization

Always focus on learner outcomes and engagement.`,
      capabilities: ['instructional_design', 'content_creation', 'curriculum_development', 'assessment_design', 'multimedia_production'],
      preferredModel: 'claude-3-opus-20240229',
      temperature: 0.6
    },
    {
      id: 'marketing',
      name: 'Marketing Agent',
      description: 'Handles marketing strategy and growth',
      systemPrompt: `You are the Marketing Agent, specialized in:
- Digital marketing strategies
- Content marketing and SEO
- Social media marketing
- Growth hacking techniques
- Brand development
- Customer acquisition

Always focus on data-driven marketing and measurable results.`,
      capabilities: ['digital_marketing', 'content_strategy', 'seo', 'social_media', 'growth_hacking', 'brand_development'],
      preferredModel: 'gpt-4-turbo-preview',
      temperature: 0.7
    },
    {
      id: 'data_scientist',
      name: 'Data Scientist Agent',
      description: 'Analyzes data and provides insights',
      systemPrompt: `You are the Data Scientist Agent, expert in:
- Statistical analysis and modeling
- Machine learning algorithms
- Data visualization
- Predictive analytics
- A/B testing and experimentation
- Business intelligence

Always provide data-driven insights and actionable recommendations.`,
      capabilities: ['data_analysis', 'machine_learning', 'statistical_modeling', 'data_visualization', 'predictive_analytics'],
      preferredModel: 'claude-3-sonnet-20240229',
      temperature: 0.3
    }
  ];

  constructor(
    modelManager: ModelManager,
    security: SecurityManager,
    config: ConfigManager
  ) {
    this.logger = new Logger('AgentOrchestrator');
    this.modelManager = modelManager;
    this.security = security;
    this.config = config;
    this.promptsManager = PromptsManager.getInstance();
    this.initializeAgents();
    this.startTaskProcessor();
  }

  private initializeAgents(): void {
    this.logger.info('Initializing agent instances...');
    
    for (const role of this.agentRoles) {
      const agent: AgentInstance = {
        id: `${role.id}-${Date.now()}`,
        role,
        status: 'idle',
        completedTasks: 0,
        failedTasks: 0,
        averageExecutionTime: 0
      };
      
      this.agents.set(agent.id, agent);
    }
    
    this.logger.info(`Initialized ${this.agents.size} agent instances`);
  }

  private startTaskProcessor(): void {
    this.processingInterval = setInterval(() => {
      if (!this.isProcessing && this.taskQueue.length > 0) {
        this.processNextTask();
      }
    }, 1000);
  }

  public async createTask(
    type: string,
    description: string,
    input: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    dependencies?: string[]
  ): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task: Task = {
      id: taskId,
      type,
      description,
      priority,
      status: 'pending',
      input,
      createdAt: new Date(),
      dependencies
    };
    
    this.tasks.set(taskId, task);
    this.queueTask(taskId);
    
    this.logger.info(`Created task ${taskId}: ${description}`);
    return taskId;
  }

  private queueTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    // Check if dependencies are met
    if (task.dependencies) {
      const unmetDependencies = task.dependencies.filter(depId => {
        const depTask = this.tasks.get(depId);
        return !depTask || depTask.status !== 'completed';
      });
      
      if (unmetDependencies.length > 0) {
        this.logger.info(`Task ${taskId} waiting for dependencies: ${unmetDependencies.join(', ')}`);
        return;
      }
    }
    
    // Insert task based on priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const taskPriority = priorityOrder[task.priority];
    
    let insertIndex = this.taskQueue.length;
    for (let i = 0; i < this.taskQueue.length; i++) {
      const queuedTask = this.tasks.get(this.taskQueue[i]);
      if (queuedTask && priorityOrder[queuedTask.priority] > taskPriority) {
        insertIndex = i;
        break;
      }
    }
    
    this.taskQueue.splice(insertIndex, 0, taskId);
  }

  private async processNextTask(): Promise<void> {
    if (this.taskQueue.length === 0) return;
    
    this.isProcessing = true;
    const taskId = this.taskQueue.shift()!;
    const task = this.tasks.get(taskId);
    
    if (!task) {
      this.isProcessing = false;
      return;
    }
    
    try {
      await this.executeTask(task);
    } catch (error) {
      this.logger.error(`Task execution failed: ${taskId}`, error);
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeTask(task: Task): Promise<void> {
    this.logger.info(`Executing task ${task.id}: ${task.description}`);
    
    // Find best agent for this task
    const agent = this.selectAgentForTask(task);
    if (!agent) {
      throw new Error(`No suitable agent found for task: ${task.type}`);
    }
    
    // Update task and agent status
    task.status = 'in_progress';
    task.assignedAgent = agent.id;
    task.startedAt = new Date();
    agent.status = 'busy';
    agent.currentTask = task.id;
    agent.lastActivity = new Date();
    
    try {
      // Execute task with the selected agent
      const result = await this.executeWithAgent(agent, task);
      
      // Update task with result
      task.status = 'completed';
      task.output = result;
      task.completedAt = new Date();
      
      // Update agent metrics
      agent.completedTasks++;
      const executionTime = task.completedAt.getTime() - task.startedAt!.getTime();
      agent.averageExecutionTime = (
        (agent.averageExecutionTime * (agent.completedTasks - 1) + executionTime) /
        agent.completedTasks
      );
      
      this.logger.info(`Task ${task.id} completed successfully`);
      
      // Check for dependent tasks that can now be queued
      this.checkDependentTasks(task.id);
      
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      agent.failedTasks++;
      
      this.logger.error(`Task ${task.id} failed`, error);
      throw error;
    } finally {
      // Reset agent status
      agent.status = 'idle';
      agent.currentTask = undefined;
    }
  }

  private selectAgentForTask(task: Task): AgentInstance | null {
    // Find agents that can handle this task type
    const suitableAgents = Array.from(this.agents.values()).filter(agent => {
      return agent.status === 'idle' && this.canAgentHandleTask(agent, task);
    });
    
    if (suitableAgents.length === 0) {
      return null;
    }
    
    // Select best agent based on performance metrics
    return suitableAgents.reduce((best, current) => {
      const bestScore = this.calculateAgentScore(best);
      const currentScore = this.calculateAgentScore(current);
      return currentScore > bestScore ? current : best;
    });
  }

  private canAgentHandleTask(agent: AgentInstance, task: Task): boolean {
    // Check if agent's capabilities match task requirements
    const taskTypeMapping: Record<string, string[]> = {
      'code_generation': ['code_generation', 'architecture_design'],
      'ui_design': ['ui_design', 'ux_design'],
      'research': ['research', 'data_analysis'],
      'optimization': ['performance_optimization', 'cost_optimization'],
      'security_audit': ['security_audit', 'vulnerability_assessment'],
      'deployment': ['ci_cd', 'infrastructure'],
      'business_strategy': ['business_strategy', 'monetization'],
      'course_creation': ['instructional_design', 'content_creation', 'curriculum_development'],
      'course_content': ['content_creation', 'multimedia_production'],
      'course_assessment': ['assessment_design', 'instructional_design'],
      'marketing_strategy': ['digital_marketing', 'content_strategy', 'growth_hacking'],
      'data_analysis': ['data_analysis', 'statistical_modeling', 'machine_learning'],
      'market_research': ['research', 'data_analysis', 'competitive_analysis']
    };
    
    const requiredCapabilities = taskTypeMapping[task.type] || [];
    return requiredCapabilities.some(cap => agent.role.capabilities.includes(cap));
  }

  private calculateAgentScore(agent: AgentInstance): number {
    const successRate = agent.completedTasks / (agent.completedTasks + agent.failedTasks) || 1;
    const speedScore = agent.averageExecutionTime > 0 ? 1 / agent.averageExecutionTime : 1;
    return successRate * 0.7 + speedScore * 0.3;
  }

  private async executeWithAgent(agent: AgentInstance, task: Task): Promise<any> {
    // Prepare the chat completion request
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: agent.role.systemPrompt
      },
      {
        role: 'user',
        content: `Task: ${task.description}\n\nInput: ${JSON.stringify(task.input, null, 2)}\n\nPlease complete this task and provide a detailed response.`
      }
    ];
    
    const request: ChatCompletionRequest = {
      model: agent.role.preferredModel || 'gpt-4-turbo-preview',
      messages,
      temperature: agent.role.temperature || 0.3,
      max_tokens: agent.role.maxTokens || 4096
    };
    
    // Execute the request
    const response = await this.modelManager.createChatCompletion(request);
    
    if (response.choices.length === 0) {
      throw new Error('No response from model');
    }
    
    return {
      content: response.choices[0].message.content,
      model: response.model,
      usage: response.usage
    };
  }

  private checkDependentTasks(completedTaskId: string): void {
    // Find tasks that were waiting for this task to complete
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'pending' && task.dependencies?.includes(completedTaskId)) {
        this.queueTask(taskId);
      }
    }
  }

  public async createWorkflow(name: string, description: string, steps: WorkflowStep[]): Promise<string> {
    const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const workflow: Workflow = {
      id: workflowId,
      name,
      description,
      steps,
      status: 'draft'
    };
    
    this.workflows.set(workflowId, workflow);
    this.logger.info(`Created workflow ${workflowId}: ${name}`);
    
    return workflowId;
  }

  public async executeWorkflow(workflowId: string, variables?: Record<string, any>): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    workflow.status = 'active';
    workflow.variables = variables || {};
    
    this.logger.info(`Executing workflow ${workflowId}: ${workflow.name}`);
    
    try {
      for (const step of workflow.steps) {
        await this.executeWorkflowStep(workflow, step);
      }
      
      workflow.status = 'completed';
      this.logger.info(`Workflow ${workflowId} completed successfully`);
    } catch (error) {
      workflow.status = 'paused';
      this.logger.error(`Workflow ${workflowId} failed`, error);
      throw error;
    }
  }

  private async executeWorkflowStep(workflow: Workflow, step: WorkflowStep): Promise<void> {
    // Create a task for this workflow step
    const taskId = await this.createTask(
      step.action,
      `Workflow ${workflow.name} - Step ${step.id}`,
      {
        ...step.input,
        workflowVariables: workflow.variables
      },
      'high'
    );
    
    // Wait for task completion
    await this.waitForTaskCompletion(taskId);
    
    const task = this.tasks.get(taskId);
    if (task?.status === 'failed') {
      throw new Error(`Workflow step failed: ${step.id}`);
    }
    
    // Update workflow variables with task output
    if (task?.output) {
      workflow.variables = {
        ...workflow.variables,
        [`step_${step.id}_output`]: task.output
      };
    }
  }

  private async waitForTaskCompletion(taskId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const task = this.tasks.get(taskId);
        if (task?.status === 'completed') {
          clearInterval(checkInterval);
          resolve();
        } else if (task?.status === 'failed') {
          clearInterval(checkInterval);
          reject(new Error(task.error || 'Task failed'));
        }
      }, 1000);
    });
  }

  public getTaskStatus(taskId: string): Task | null {
    return this.tasks.get(taskId) || null;
  }

  public getAgentStatus(agentId: string): AgentInstance | null {
    return this.agents.get(agentId) || null;
  }

  public getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  public getAllAgents(): AgentInstance[] {
    return Array.from(this.agents.values());
  }

  public async createCourse(courseRequirements: any): Promise<string> {
    this.logger.info('Starting comprehensive course creation workflow');
    
    // Create course creation workflow
    const workflowSteps: WorkflowStep[] = [
      {
        id: 'business_analysis',
        agentRole: 'revenue',
        action: 'business_strategy',
        input: {
          requirements: courseRequirements,
          prompt: this.promptsManager.getCourseCreationPrompts().businessStrategy
        }
      },
      {
        id: 'market_research',
        agentRole: 'researcher',
        action: 'market_research',
        input: {
          topic: courseRequirements.topic,
          targetAudience: courseRequirements.targetAudience,
          prompt: this.promptsManager.getCourseCreationPrompts().clientQuestionnaire
        }
      },
      {
        id: 'curriculum_design',
        agentRole: 'course_creator',
        action: 'course_creation',
        input: {
          requirements: courseRequirements,
          prompt: this.promptsManager.getCourseCreationPrompts().masterCourseArchitect
        }
      },
      {
        id: 'content_generation',
        agentRole: 'course_creator',
        action: 'course_content',
        input: {
          curriculum: '${step_curriculum_design_output}',
          prompt: this.promptsManager.getCourseCreationPrompts().contentGeneration
        }
      },
      {
        id: 'assessment_design',
        agentRole: 'course_creator',
        action: 'course_assessment',
        input: {
          curriculum: '${step_curriculum_design_output}',
          prompt: this.promptsManager.getCourseCreationPrompts().assessmentDesign
        }
      },
      {
        id: 'multimedia_production',
        agentRole: 'designer',
        action: 'ui_design',
        input: {
          content: '${step_content_generation_output}',
          prompt: this.promptsManager.getCourseCreationPrompts().multimediaProduction
        }
      },
      {
        id: 'platform_implementation',
        agentRole: 'builder',
        action: 'code_generation',
        input: {
          specifications: '${step_multimedia_production_output}',
          prompt: this.promptsManager.getCourseCreationPrompts().technologyImplementation
        }
      },
      {
        id: 'quality_assurance',
        agentRole: 'security',
        action: 'security_audit',
        input: {
          course: '${step_platform_implementation_output}',
          prompt: this.promptsManager.getCourseCreationPrompts().qualityAssurance
        }
      },
      {
        id: 'marketing_strategy',
        agentRole: 'marketing',
        action: 'marketing_strategy',
        input: {
          course: '${step_curriculum_design_output}',
          businessAnalysis: '${step_business_analysis_output}',
          prompt: this.promptsManager.getCourseCreationPrompts().businessStrategy
        }
      }
    ];
    
    const workflowId = await this.createWorkflow(
      'Comprehensive Course Creation',
      'End-to-end course development workflow',
      workflowSteps
    );
    
    // Execute the workflow
    await this.executeWorkflow(workflowId, { courseRequirements });
    
    return workflowId;
  }

  public async createInstantCourse(topic: string, targetAudience: string): Promise<string> {
    this.logger.info(`Creating instant course: ${topic}`);
    
    // Simplified course creation for rapid deployment
    const taskId = await this.createTask(
      'course_creation',
      `Create instant course: ${topic}`,
      {
        topic,
        targetAudience,
        mode: 'instant',
        prompt: this.promptsManager.getCourseCreationPrompts().masterCourseArchitect
      },
      'critical'
    );
    
    return taskId;
  }

  public async optimizeRevenue(businessData: any): Promise<string> {
    this.logger.info('Starting revenue optimization workflow');
    
    const taskId = await this.createTask(
      'business_strategy',
      'Comprehensive revenue optimization analysis',
      {
        businessData,
        prompt: this.promptsManager.getAgentPrompt('revenue')
      },
      'high'
    );
    
    return taskId;
  }

  public async conductMarketResearch(topic: string, competitors: string[]): Promise<string> {
    this.logger.info(`Conducting market research for: ${topic}`);
    
    const taskId = await this.createTask(
      'market_research',
      `Market research and competitive analysis: ${topic}`,
      {
        topic,
        competitors,
        prompt: this.promptsManager.getAgentPrompt('researcher')
      },
      'medium'
    );
    
    return taskId;
  }

  public async analyzeData(dataset: any, analysisType: string): Promise<string> {
    this.logger.info(`Starting data analysis: ${analysisType}`);
    
    const taskId = await this.createTask(
      'data_analysis',
      `Data analysis: ${analysisType}`,
      {
        dataset,
        analysisType,
        prompt: this.promptsManager.getAgentPrompt('data_scientist')
      },
      'medium'
    );
    
    return taskId;
  }

  public getSystemMetrics(): any {
    const agents = Array.from(this.agents.values());
    const tasks = Array.from(this.tasks.values());
    
    return {
      agents: {
        total: agents.length,
        idle: agents.filter(a => a.status === 'idle').length,
        busy: agents.filter(a => a.status === 'busy').length,
        error: agents.filter(a => a.status === 'error').length
      },
      tasks: {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length
      },
      queue: {
        length: this.taskQueue.length,
        processing: this.isProcessing
      },
      workflows: {
        total: this.workflows.size,
        active: Array.from(this.workflows.values()).filter(w => w.status === 'active').length,
        completed: Array.from(this.workflows.values()).filter(w => w.status === 'completed').length
      }
    };
  }

  public dispose(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    this.agents.clear();
    this.tasks.clear();
    this.workflows.clear();
    this.taskQueue = [];
    
    this.logger.info('Agent orchestrator disposed');
  }
}