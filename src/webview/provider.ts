import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { AgentOrchestrator } from '../agents/orchestrator';
import { ModelManager } from '../api/model-manager';
import { ConfigManager } from '../config/manager';
import { SecurityManager } from '../security/manager';

export interface WebviewMessage {
  type: string;
  data?: any;
  id?: string;
}

export interface WebviewResponse {
  type: string;
  data?: any;
  id?: string;
  error?: string;
}

export class WebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'cline-supreme.chatView';
  private _view?: vscode.WebviewView;
  private logger: Logger;
  private orchestrator: AgentOrchestrator;
  private modelManager: ModelManager;
  private config: ConfigManager;
  private security: SecurityManager;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly _extensionUri: vscode.Uri,
    orchestrator: AgentOrchestrator,
    modelManager: ModelManager,
    config: ConfigManager,
    security: SecurityManager
  ) {
    this.logger = new Logger('WebviewProvider');
    this.orchestrator = orchestrator;
    this.modelManager = modelManager;
    this.config = config;
    this.security = security;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    this.disposables.push(
      webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
        await this.handleMessage(message);
      })
    );

    // Send initial data
    this.sendInitialData();

    this.logger.info('Webview initialized');
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      this.logger.debug(`Received message: ${message.type}`, message.data);

      switch (message.type) {
        case 'createTask':
          await this.handleCreateTask(message);
          break;
        
        case 'getTaskStatus':
          await this.handleGetTaskStatus(message);
          break;
        
        case 'getAgentStatus':
          await this.handleGetAgentStatus(message);
          break;
        
        case 'getSystemMetrics':
          await this.handleGetSystemMetrics(message);
          break;
        
        case 'executeWorkflow':
          await this.handleExecuteWorkflow(message);
          break;
        
        case 'chatCompletion':
          await this.handleChatCompletion(message);
          break;
        
        case 'getModels':
          await this.handleGetModels(message);
          break;
        
        case 'updateConfig':
          await this.handleUpdateConfig(message);
          break;
        
        case 'exportData':
          await this.handleExportData(message);
          break;
        
        default:
          this.logger.warn(`Unknown message type: ${message.type}`);
          this.sendResponse({
            type: 'error',
            id: message.id,
            error: `Unknown message type: ${message.type}`
          });
      }
    } catch (error) {
      this.logger.error('Error handling message', error);
      this.sendResponse({
        type: 'error',
        id: message.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async handleCreateTask(message: WebviewMessage): Promise<void> {
    const { type, description, input, priority, dependencies } = message.data;
    
    const taskId = await this.orchestrator.createTask(
      type,
      description,
      input,
      priority,
      dependencies
    );
    
    this.sendResponse({
      type: 'taskCreated',
      id: message.id,
      data: { taskId }
    });
  }

  private async handleGetTaskStatus(message: WebviewMessage): Promise<void> {
    const { taskId } = message.data;
    const task = this.orchestrator.getTaskStatus(taskId);
    
    this.sendResponse({
      type: 'taskStatus',
      id: message.id,
      data: { task }
    });
  }

  private async handleGetAgentStatus(message: WebviewMessage): Promise<void> {
    const { agentId } = message.data;
    const agent = this.orchestrator.getAgentStatus(agentId);
    
    this.sendResponse({
      type: 'agentStatus',
      id: message.id,
      data: { agent }
    });
  }

  private async handleGetSystemMetrics(message: WebviewMessage): Promise<void> {
    const metrics = this.orchestrator.getSystemMetrics();
    
    this.sendResponse({
      type: 'systemMetrics',
      id: message.id,
      data: { metrics }
    });
  }

  private async handleExecuteWorkflow(message: WebviewMessage): Promise<void> {
    const { workflowId, variables } = message.data;
    
    try {
      await this.orchestrator.executeWorkflow(workflowId, variables);
      
      this.sendResponse({
        type: 'workflowExecuted',
        id: message.id,
        data: { success: true }
      });
    } catch (error) {
      this.sendResponse({
        type: 'workflowExecuted',
        id: message.id,
        data: { success: false, error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private async handleChatCompletion(message: WebviewMessage): Promise<void> {
    const { request } = message.data;
    
    try {
      const response = await this.modelManager.createChatCompletion(request);
      
      this.sendResponse({
        type: 'chatCompletionResponse',
        id: message.id,
        data: { response }
      });
    } catch (error) {
      this.sendResponse({
        type: 'chatCompletionResponse',
        id: message.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async handleGetModels(message: WebviewMessage): Promise<void> {
    try {
      const models = this.modelManager.getAllModels();
      
      this.sendResponse({
        type: 'modelsResponse',
        id: message.id,
        data: { models }
      });
    } catch (error) {
      this.sendResponse({
        type: 'modelsResponse',
        id: message.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async handleUpdateConfig(message: WebviewMessage): Promise<void> {
    const { key, value } = message.data;
    
    try {
      // Update VS Code configuration
      const config = vscode.workspace.getConfiguration('cline-supreme');
      await config.update(key, value, vscode.ConfigurationTarget.Global);
      
      this.sendResponse({
        type: 'configUpdated',
        id: message.id,
        data: { success: true }
      });
    } catch (error) {
      this.sendResponse({
        type: 'configUpdated',
        id: message.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async handleExportData(message: WebviewMessage): Promise<void> {
    const { format } = message.data;
    
    try {
      const data = {
        agents: this.orchestrator.getAllAgents(),
        tasks: this.orchestrator.getAllTasks(),
        metrics: this.orchestrator.getSystemMetrics(),
        timestamp: new Date().toISOString()
      };
      
      let exportData: string;
      
      if (format === 'json') {
        exportData = JSON.stringify(data, null, 2);
      } else if (format === 'csv') {
        // Simple CSV export for tasks
        const tasks = data.tasks;
        const headers = ['ID', 'Type', 'Description', 'Status', 'Priority', 'Created', 'Completed'];
        const rows = tasks.map(task => [
          task.id,
          task.type,
          task.description,
          task.status,
          task.priority,
          task.createdAt.toISOString(),
          task.completedAt?.toISOString() || ''
        ]);
        exportData = [headers, ...rows].map(row => row.join(',')).join('\n');
      } else {
        throw new Error(`Unsupported export format: ${format}`);
      }
      
      this.sendResponse({
        type: 'dataExported',
        id: message.id,
        data: { exportData, format }
      });
    } catch (error) {
      this.sendResponse({
        type: 'dataExported',
        id: message.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private sendMessage(message: WebviewResponse): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  private sendResponse(response: WebviewResponse): void {
    this.sendMessage(response);
  }

  public updateData(): void {
    this.sendMessage({
      type: 'dataUpdate',
      data: {
        agents: this.orchestrator.getAllAgents(),
        tasks: this.orchestrator.getAllTasks(),
        metrics: this.orchestrator.getSystemMetrics()
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Get the local path to main script run in the webview
    const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');
    const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

    // Get the local path to CSS file
    const stylePathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css');
    const styleUri = webview.asWebviewUri(stylePathOnDisk);

    // Use a nonce to only allow specific scripts to be run
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https:;">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>Cline Supreme - Multi-Agent AI Assistant</title>
</head>
<body>
    <div id="root">
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Initializing Cline Supreme...</p>
        </div>
    </div>
    
    <!-- React App will be rendered here -->
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private async sendInitialData(): Promise<void> {
    try {
      const models = this.modelManager.getAllModels();
      
      this.sendMessage({
        type: 'init',
        data: {
          agents: this.orchestrator.getAllAgents(),
          tasks: this.orchestrator.getAllTasks(),
          metrics: this.orchestrator.getSystemMetrics(),
          models
        }
      });
    } catch (error) {
      this.logger.error('Error sending initial data', error);
    }
  }

  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}