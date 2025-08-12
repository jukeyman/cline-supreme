import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { AgentOrchestrator, Task } from '../agents/orchestrator';
import { ModelManager } from '../api/model-manager';
import { ConfigManager } from '../config/manager';
import { SecurityManager } from '../security/manager';
import { DeploymentManager } from '../deployment/manager';
import { systemPrompts } from '../prompts/system-prompts';
import { ChatCompletionRequest, ChatMessage } from '../api/providers/base';

export interface ControllerConfig {
  autoSave: boolean;
  maxConcurrentTasks: number;
  defaultModel: string;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface ProjectContext {
  workspaceRoot: string;
  projectType: string;
  framework?: string;
  language: string;
  dependencies: string[];
  gitRepository?: string;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  model: string;
  temperature: number;
  maxTokens: number;
  createdAt: Date;
  lastActivity: Date;
  metadata?: Record<string, any>;
}

export class Controller {
  private logger: Logger;
  private orchestrator: AgentOrchestrator;
  private modelManager: ModelManager;
  private config: ConfigManager;
  private security: SecurityManager;
  private deployment: DeploymentManager;
  private context: vscode.ExtensionContext;
  private projectContext?: ProjectContext;
  private chatSessions: Map<string, ChatSession> = new Map();
  private activeTasks: Set<string> = new Set();
  private disposables: vscode.Disposable[] = [];

  constructor(
    context: vscode.ExtensionContext,
    orchestrator: AgentOrchestrator,
    modelManager: ModelManager,
    config: ConfigManager,
    security: SecurityManager,
    deployment: DeploymentManager
  ) {
    this.logger = new Logger('Controller');
    this.context = context;
    this.orchestrator = orchestrator;
    this.modelManager = modelManager;
    this.config = config;
    this.security = security;
    this.deployment = deployment;
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.logger.info('Initializing Cline Supreme Controller...');
    
    try {
      // Analyze current workspace
      await this.analyzeWorkspace();
      
      // Register commands
      this.registerCommands();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start background tasks
      this.startBackgroundTasks();
      
      this.logger.info('Controller initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize controller', error);
      throw error;
    }
  }

  private async analyzeWorkspace(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      this.logger.info('No workspace folder found');
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    this.logger.info(`Analyzing workspace: ${workspaceRoot}`);

    try {
      // Detect project type and framework
      const projectType = await this.detectProjectType(workspaceRoot);
      const framework = await this.detectFramework(workspaceRoot);
      const language = await this.detectLanguage(workspaceRoot);
      const dependencies = await this.getDependencies(workspaceRoot);
      const gitRepository = await this.getGitRepository(workspaceRoot);

      this.projectContext = {
        workspaceRoot,
        projectType,
        framework,
        language,
        dependencies,
        gitRepository
      };

      this.logger.info('Workspace analysis completed', this.projectContext);
    } catch (error) {
      this.logger.error('Failed to analyze workspace', error);
    }
  }

  private async detectProjectType(workspaceRoot: string): Promise<string> {
    const fs = require('fs');
    const path = require('path');

    // Check for common project files
    const projectFiles = {
      'package.json': 'nodejs',
      'requirements.txt': 'python',
      'Cargo.toml': 'rust',
      'go.mod': 'go',
      'pom.xml': 'java',
      'Gemfile': 'ruby',
      'composer.json': 'php'
    };

    for (const [file, type] of Object.entries(projectFiles)) {
      if (fs.existsSync(path.join(workspaceRoot, file))) {
        return type;
      }
    }

    return 'unknown';
  }

  private async detectFramework(workspaceRoot: string): Promise<string | undefined> {
    const fs = require('fs');
    const path = require('path');

    try {
      const packageJsonPath = path.join(workspaceRoot, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

        // Detect framework based on dependencies
        if (dependencies.next) return 'nextjs';
        if (dependencies.react) return 'react';
        if (dependencies.vue) return 'vue';
        if (dependencies.angular || dependencies['@angular/core']) return 'angular';
        if (dependencies.svelte) return 'svelte';
        if (dependencies.express) return 'express';
        if (dependencies.fastify) return 'fastify';
        if (dependencies.nestjs || dependencies['@nestjs/core']) return 'nestjs';
      }
    } catch (error) {
      this.logger.warn('Failed to detect framework', error);
    }

    return undefined;
  }

  private async detectLanguage(workspaceRoot: string): Promise<string> {
    const fs = require('fs');
    const path = require('path');

    try {
      // Check for TypeScript config
      if (fs.existsSync(path.join(workspaceRoot, 'tsconfig.json'))) {
        return 'typescript';
      }

      // Check for common language files
      const files = fs.readdirSync(workspaceRoot);
      const extensions = files.map((file: string) => path.extname(file));

      if (extensions.includes('.ts') || extensions.includes('.tsx')) return 'typescript';
      if (extensions.includes('.js') || extensions.includes('.jsx')) return 'javascript';
      if (extensions.includes('.py')) return 'python';
      if (extensions.includes('.rs')) return 'rust';
      if (extensions.includes('.go')) return 'go';
      if (extensions.includes('.java')) return 'java';
      if (extensions.includes('.rb')) return 'ruby';
      if (extensions.includes('.php')) return 'php';
    } catch (error) {
      this.logger.warn('Failed to detect language', error);
    }

    return 'unknown';
  }

  private async getDependencies(workspaceRoot: string): Promise<string[]> {
    const fs = require('fs');
    const path = require('path');
    const dependencies: string[] = [];

    try {
      const packageJsonPath = path.join(workspaceRoot, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        dependencies.push(...Object.keys(deps));
      }
    } catch (error) {
      this.logger.warn('Failed to get dependencies', error);
    }

    return dependencies;
  }

  private async getGitRepository(workspaceRoot: string): Promise<string | undefined> {
    const fs = require('fs');
    const path = require('path');

    try {
      const gitConfigPath = path.join(workspaceRoot, '.git', 'config');
      if (fs.existsSync(gitConfigPath)) {
        const gitConfig = fs.readFileSync(gitConfigPath, 'utf8');
        const urlMatch = gitConfig.match(/url = (.+)/);
        return urlMatch ? urlMatch[1] : undefined;
      }
    } catch (error) {
      this.logger.warn('Failed to get git repository', error);
    }

    return undefined;
  }

  private registerCommands(): void {
    // Register VS Code commands
    const commands = [
      {
        command: 'cline-supreme.createTask',
        handler: this.handleCreateTask.bind(this)
      },
      {
        command: 'cline-supreme.chatWithAgent',
        handler: this.handleChatWithAgent.bind(this)
      },
      {
        command: 'cline-supreme.deployProject',
        handler: this.handleDeployProject.bind(this)
      },
      {
        command: 'cline-supreme.analyzeCode',
        handler: this.handleAnalyzeCode.bind(this)
      },
      {
        command: 'cline-supreme.optimizePerformance',
        handler: this.handleOptimizePerformance.bind(this)
      },
      {
        command: 'cline-supreme.generateTests',
        handler: this.handleGenerateTests.bind(this)
      },
      {
        command: 'cline-supreme.refactorCode',
        handler: this.handleRefactorCode.bind(this)
      },
      {
        command: 'cline-supreme.createDocumentation',
        handler: this.handleCreateDocumentation.bind(this)
      },
      {
        command: 'cline-supreme.setupCI',
        handler: this.handleSetupCI.bind(this)
      },
      {
        command: 'cline-supreme.showDashboard',
        handler: this.handleShowDashboard.bind(this)
      }
    ];

    for (const { command, handler } of commands) {
      const disposable = vscode.commands.registerCommand(command, handler);
      this.disposables.push(disposable);
    }

    this.logger.info(`Registered ${commands.length} commands`);
  }

  private setupEventListeners(): void {
    // Listen for configuration changes
    const configListener = vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('cline-supreme')) {
        this.handleConfigurationChange();
      }
    });
    this.disposables.push(configListener);

    // Listen for file changes
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
    fileWatcher.onDidChange(this.handleFileChange.bind(this));
    fileWatcher.onDidCreate(this.handleFileCreate.bind(this));
    fileWatcher.onDidDelete(this.handleFileDelete.bind(this));
    this.disposables.push(fileWatcher);

    this.logger.info('Event listeners set up');
  }

  private startBackgroundTasks(): void {
    // Start periodic health checks
    setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every minute

    // Start task cleanup
    setInterval(() => {
      this.cleanupCompletedTasks();
    }, 300000); // Every 5 minutes

    this.logger.info('Background tasks started');
  }

  private async handleCreateTask(options?: any): Promise<void> {
    try {
      const taskType = options?.type || await this.promptForTaskType();
      const description = options?.description || await this.promptForDescription();
      const priority = options?.priority || 'medium';

      const taskId = await this.orchestrator.createTask(
        taskType,
        description,
        { projectContext: this.projectContext, ...options?.input },
        priority
      );

      this.activeTasks.add(taskId);
      
      vscode.window.showInformationMessage(
        `Task created: ${description}`,
        'View Status'
      ).then(selection => {
        if (selection === 'View Status') {
          this.showTaskStatus(taskId);
        }
      });

      this.logger.info(`Created task: ${taskId}`);
    } catch (error) {
      this.logger.error('Failed to create task', error);
      vscode.window.showErrorMessage(`Failed to create task: ${error}`);
    }
  }

  private async handleChatWithAgent(agentId?: string): Promise<void> {
    try {
      const selectedAgent = agentId || await this.promptForAgent();
      if (!selectedAgent) return;

      const sessionId = await this.createChatSession(selectedAgent);
      await this.openChatInterface(sessionId);
    } catch (error) {
      this.logger.error('Failed to start chat', error);
      vscode.window.showErrorMessage(`Failed to start chat: ${error}`);
    }
  }

  private async handleDeployProject(target?: string): Promise<void> {
    if (!this.projectContext) {
      vscode.window.showErrorMessage('No project context available');
      return;
    }

    try {
      const deployTarget = target || await this.promptForDeploymentTarget();
      if (!deployTarget) return;

      const config = await this.getDeploymentConfig();
      
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Deploying to ${deployTarget}...`,
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: 'Preparing deployment...' });
        
        let result;
        switch (deployTarget) {
          case 'vercel':
            result = await this.deployment.deployToVercel(this.projectContext!.workspaceRoot, config);
            break;
          case 'netlify':
            result = await this.deployment.deployToNetlify(this.projectContext!.workspaceRoot, config);
            break;
          case 'docker':
            result = await this.deployment.deployToDocker(this.projectContext!.workspaceRoot, config);
            break;
          default:
            throw new Error(`Unsupported deployment target: ${deployTarget}`);
        }
        
        progress.report({ increment: 100, message: 'Deployment completed' });
        
        if (result.success) {
          const message = result.url 
            ? `Deployment successful! URL: ${result.url}`
            : 'Deployment successful!';
          vscode.window.showInformationMessage(message);
        } else {
          vscode.window.showErrorMessage(`Deployment failed: ${result.error}`);
        }
      });
    } catch (error) {
      this.logger.error('Deployment failed', error);
      vscode.window.showErrorMessage(`Deployment failed: ${error}`);
    }
  }

  private async handleAnalyzeCode(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('No active editor found');
      return;
    }

    const document = activeEditor.document;
    const code = document.getText();
    const language = document.languageId;

    await this.orchestrator.createTask(
      'code_analysis',
      `Analyze ${document.fileName}`,
      {
        code,
        language,
        fileName: document.fileName,
        projectContext: this.projectContext
      },
      'high'
    );
  }

  private async handleOptimizePerformance(): Promise<void> {
    if (!this.projectContext) {
      vscode.window.showErrorMessage('No project context available');
      return;
    }

    await this.orchestrator.createTask(
      'performance_optimization',
      'Optimize project performance',
      {
        projectContext: this.projectContext,
        analysisType: 'full'
      },
      'high'
    );
  }

  private async handleGenerateTests(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('No active editor found');
      return;
    }

    const document = activeEditor.document;
    const code = document.getText();
    const language = document.languageId;

    await this.orchestrator.createTask(
      'test_generation',
      `Generate tests for ${document.fileName}`,
      {
        code,
        language,
        fileName: document.fileName,
        testFramework: this.detectTestFramework(),
        projectContext: this.projectContext
      },
      'medium'
    );
  }

  private async handleRefactorCode(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('No active editor found');
      return;
    }

    const document = activeEditor.document;
    const selection = activeEditor.selection;
    const code = selection.isEmpty ? document.getText() : document.getText(selection);
    const language = document.languageId;

    await this.orchestrator.createTask(
      'code_refactoring',
      `Refactor ${selection.isEmpty ? 'file' : 'selection'} in ${document.fileName}`,
      {
        code,
        language,
        fileName: document.fileName,
        isSelection: !selection.isEmpty,
        projectContext: this.projectContext
      },
      'medium'
    );
  }

  private async handleCreateDocumentation(): Promise<void> {
    if (!this.projectContext) {
      vscode.window.showErrorMessage('No project context available');
      return;
    }

    await this.orchestrator.createTask(
      'documentation_generation',
      'Generate project documentation',
      {
        projectContext: this.projectContext,
        includeAPI: true,
        includeReadme: true,
        includeChangelog: true
      },
      'low'
    );
  }

  private async handleSetupCI(): Promise<void> {
    if (!this.projectContext) {
      vscode.window.showErrorMessage('No project context available');
      return;
    }

    const config = await this.getDeploymentConfig();
    await this.deployment.createCICD(this.projectContext.workspaceRoot, config);
    
    vscode.window.showInformationMessage('CI/CD configuration created successfully!');
  }

  private async handleShowDashboard(): Promise<void> {
    // This would open the webview dashboard
    vscode.commands.executeCommand('cline-supreme.chatView.focus');
  }

  private async handleConfigurationChange(): Promise<void> {
    this.logger.info('Configuration changed, reloading...');
    // Reload configuration and update components
    await this.config.reloadConfiguration();
  }

  private async handleFileChange(uri: vscode.Uri): Promise<void> {
    // Handle file changes for auto-analysis or other features
    this.logger.debug(`File changed: ${uri.fsPath}`);
  }

  private async handleFileCreate(uri: vscode.Uri): Promise<void> {
    this.logger.debug(`File created: ${uri.fsPath}`);
  }

  private async handleFileDelete(uri: vscode.Uri): Promise<void> {
    this.logger.debug(`File deleted: ${uri.fsPath}`);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Check system health
      const metrics = this.orchestrator.getSystemMetrics();
      
      if (metrics.agents.error > 0) {
        this.logger.warn(`${metrics.agents.error} agents in error state`);
      }
      
      if (metrics.tasks.failed > metrics.tasks.completed * 0.1) {
        this.logger.warn('High task failure rate detected');
      }
    } catch (error) {
      this.logger.error('Health check failed', error);
    }
  }

  private cleanupCompletedTasks(): void {
    const completedTasks = this.orchestrator.getAllTasks()
      .filter(task => task.status === 'completed' || task.status === 'failed')
      .filter(task => {
        const age = Date.now() - task.createdAt.getTime();
        return age > 24 * 60 * 60 * 1000; // 24 hours
      });

    for (const task of completedTasks) {
      this.activeTasks.delete(task.id);
    }

    if (completedTasks.length > 0) {
      this.logger.info(`Cleaned up ${completedTasks.length} old tasks`);
    }
  }

  private async promptForTaskType(): Promise<string> {
    const taskTypes = [
      { label: 'Code Generation', value: 'code_generation' },
      { label: 'Code Analysis', value: 'code_analysis' },
      { label: 'Performance Optimization', value: 'performance_optimization' },
      { label: 'Test Generation', value: 'test_generation' },
      { label: 'Documentation', value: 'documentation_generation' },
      { label: 'Refactoring', value: 'code_refactoring' },
      { label: 'Security Audit', value: 'security_audit' },
      { label: 'Deployment', value: 'deployment' }
    ];

    const selected = await vscode.window.showQuickPick(taskTypes, {
      placeHolder: 'Select task type'
    });

    return selected?.value || 'code_generation';
  }

  private async promptForDescription(): Promise<string> {
    const description = await vscode.window.showInputBox({
      prompt: 'Enter task description',
      placeHolder: 'Describe what you want to accomplish...'
    });

    return description || 'Custom task';
  }

  private async promptForAgent(): Promise<string | undefined> {
    const agents = this.orchestrator.getAllAgents();
    const agentItems = agents.map(agent => ({
      label: agent.role.name,
      description: agent.role.description,
      value: agent.id
    }));

    const selected = await vscode.window.showQuickPick(agentItems, {
      placeHolder: 'Select an agent to chat with'
    });

    return selected?.value;
  }

  private async promptForDeploymentTarget(): Promise<string | undefined> {
    const targets = this.deployment.getTargets();
    const targetItems = targets.map(target => ({
      label: target.name,
      description: `Deploy to ${target.type}`,
      value: target.id
    }));

    const selected = await vscode.window.showQuickPick(targetItems, {
      placeHolder: 'Select deployment target'
    });

    return selected?.value;
  }

  private async getDeploymentConfig(): Promise<any> {
    if (!this.projectContext) {
      throw new Error('No project context available');
    }

    return {
      projectName: this.projectContext.workspaceRoot.split('/').pop() || 'project',
      buildCommand: this.detectBuildCommand(),
      outputDirectory: this.detectOutputDirectory(),
      environmentVariables: await this.getEnvironmentVariables()
    };
  }

  private detectBuildCommand(): string {
    if (this.projectContext?.framework === 'nextjs') return 'npm run build';
    if (this.projectContext?.framework === 'react') return 'npm run build';
    if (this.projectContext?.framework === 'vue') return 'npm run build';
    return 'npm run build';
  }

  private detectOutputDirectory(): string {
    if (this.projectContext?.framework === 'nextjs') return '.next';
    if (this.projectContext?.framework === 'react') return 'build';
    if (this.projectContext?.framework === 'vue') return 'dist';
    return 'dist';
  }

  private async getEnvironmentVariables(): Promise<Record<string, string>> {
    // Get environment variables from configuration
    const config = vscode.workspace.getConfiguration('cline-supreme');
    return config.get('environmentVariables') || {};
  }

  private detectTestFramework(): string {
    if (this.projectContext?.dependencies.includes('jest')) return 'jest';
    if (this.projectContext?.dependencies.includes('vitest')) return 'vitest';
    if (this.projectContext?.dependencies.includes('mocha')) return 'mocha';
    return 'jest';
  }

  private async createChatSession(agentId: string): Promise<string> {
    const sessionId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session: ChatSession = {
      id: sessionId,
      messages: [],
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 4096,
      createdAt: new Date(),
      lastActivity: new Date(),
      metadata: { agentId }
    };
    
    this.chatSessions.set(sessionId, session);
    return sessionId;
  }

  private async openChatInterface(sessionId: string): Promise<void> {
    // This would open the chat interface in the webview
    vscode.commands.executeCommand('cline-supreme.chatView.focus');
  }

  private async showTaskStatus(taskId: string): Promise<void> {
    const task = this.orchestrator.getTaskStatus(taskId);
    if (task) {
      const message = `Task: ${task.description}\nStatus: ${task.status}\nCreated: ${task.createdAt.toLocaleString()}`;
      vscode.window.showInformationMessage(message);
    }
  }

  public getProjectContext(): ProjectContext | undefined {
    return this.projectContext;
  }

  public getChatSession(sessionId: string): ChatSession | undefined {
    return this.chatSessions.get(sessionId);
  }

  public getAllChatSessions(): ChatSession[] {
    return Array.from(this.chatSessions.values());
  }

  public getActiveTasks(): Task[] {
    return this.orchestrator.getAllTasks()
      .filter(task => this.activeTasks.has(task.id));
  }

  public getSystemStatus(): any {
    return {
      orchestrator: this.orchestrator.getSystemMetrics(),
      deployment: this.deployment.getDeploymentStatus(),
      activeTasks: this.activeTasks.size,
      chatSessions: this.chatSessions.size,
      projectContext: this.projectContext
    };
  }

  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    
    this.orchestrator.dispose();
    this.chatSessions.clear();
    this.activeTasks.clear();
    
    this.logger.info('Controller disposed');
  }
}