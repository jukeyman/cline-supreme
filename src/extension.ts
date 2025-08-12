import * as vscode from 'vscode';
import { WebviewProvider } from './webview/provider';
import { Controller } from './core/controller';
import { AgentOrchestrator } from './agents/orchestrator';
import { ModelManager } from './api/model-manager';
import { ConfigManager } from './config/manager';
import { SecurityManager } from './security/manager';
import { DeploymentManager } from './deployment/manager';
import { SystemPromptManager } from './prompts/system-prompts';
import { Logger } from './utils/logger';

let webviewProvider: WebviewProvider | undefined;
let controller: Controller | undefined;
let agentOrchestrator: AgentOrchestrator | undefined;
let modelManager: ModelManager | undefined;
let configManager: ConfigManager | undefined;
let securityManager: SecurityManager | undefined;
let deploymentManager: DeploymentManager | undefined;
let promptManager: SystemPromptManager | undefined;
let outputChannel: vscode.OutputChannel | undefined;

export async function activate(context: vscode.ExtensionContext) {
	try {
		// Create output channel for logging
		outputChannel = vscode.window.createOutputChannel('Cline Supreme');
		const logger = new Logger('ClineSupreme');
		logger.info('🚀 Activating Cline Supreme - Multi-Agent AI Assistant');
		outputChannel.appendLine('🔧 Initializing Cline Supreme extension...');

		// Initialize security manager first
		securityManager = new SecurityManager(context);

		// Initialize configuration manager
		configManager = new ConfigManager(context, securityManager);

		// Initialize model manager with multi-provider support
		modelManager = new ModelManager(configManager);

		// Initialize prompt manager
		promptManager = SystemPromptManager.getInstance();

		// Initialize agent orchestrator for multi-agent workflows
		agentOrchestrator = new AgentOrchestrator(modelManager, promptManager);

		// Initialize deployment manager
		deploymentManager = new DeploymentManager(configManager);

		// Initialize core controller
		controller = new Controller(
			context,
			agentOrchestrator,
			modelManager,
			configManager,
			securityManager,
			deploymentManager
		);

		// Initialize webview provider
		webviewProvider = new WebviewProvider(
			context.extensionUri,
			agentOrchestrator,
			modelManager,
			configManager,
			securityManager
		);

		// Controller initializes itself in constructor

		// Register webview provider
		const webviewDisposable = vscode.window.registerWebviewViewProvider(
			'clineSupreme.dashboard',
			webviewProvider,
			{
				webviewOptions: {
					retainContextWhenHidden: true
				}
			}
		);

		// Also register legacy view for backward compatibility
		const legacyWebviewDisposable = vscode.window.registerWebviewViewProvider(
			'cline.chatView',
			webviewProvider,
			{
				webviewOptions: {
					retainContextWhenHidden: true
				}
			}
		);

		// Register enhanced commands
		registerCommands(context, controller, webviewProvider);

		// Register event listeners
		registerEventListeners(context, controller);

		// Add disposables to context
		context.subscriptions.push(
			webviewDisposable,
			legacyWebviewDisposable,
			outputChannel,
			controller,
			securityManager
		);

		// Set context for conditional UI elements
		vscode.commands.executeCommand('setContext', 'cline.chatViewEnabled', true);
		vscode.commands.executeCommand('setContext', 'clineSupreme.enabled', true);
		vscode.commands.executeCommand('setContext', 'cline.multiAgentEnabled', true);

		outputChannel.appendLine('✅ Cline Supreme activated successfully!');
		logger.info('✅ Cline Supreme activated successfully');
		logger.info('🤖 Multi-Agent Mode: Enabled');
		logger.info('🧠 Enhanced Model Management: Active');
		logger.info('🔄 Advanced Orchestration: Ready');

		// Show welcome message
		showWelcomeMessage(context);

	} catch (error) {
		const errorMessage = `❌ Failed to activate Cline Supreme: ${error instanceof Error ? error.message : String(error)}`;
		if (outputChannel) {
			outputChannel.appendLine(errorMessage);
		}
		const logger = new Logger('ClineSupreme');
		logger.error('❌ Failed to activate Cline Supreme:', error);
		vscode.window.showErrorMessage(
			'Failed to activate Cline Supreme. Please check the output panel for details.',
			'Open Output'
		).then(selection => {
			if (selection === 'Open Output' && outputChannel) {
				outputChannel.show();
			}
		});
		throw error;
	}
}

export async function deactivate(): Promise<void> {
	console.log('🛑 Deactivating Cline Supreme...');
	
	try {
		if (controller) {
			await controller.dispose();
		}
		
		if (webviewProvider) {
			webviewProvider.dispose();
		}
		
		if (outputChannel) {
			outputChannel.appendLine('👋 Cline Supreme deactivated');
			outputChannel.dispose();
		}
		
		console.log('✅ Cline Supreme deactivated successfully');
	} catch (error) {
		console.error('❌ Error during deactivation:', error);
	}
}

/**
 * Register all extension commands
 */
function registerCommands(context: vscode.ExtensionContext, controller: Controller, webviewProvider: WebviewProvider): void {
	const commands = [
		// Legacy commands for backward compatibility
		{
			command: 'cline.plusButtonTapped',
			callback: () => {
					// Legacy command - show info message
					vscode.window.showInformationMessage('Use the new Cline Supreme dashboard for enhanced features!');
				}
		},
		{
			command: 'cline.openInNewTab',
			callback: async () => {
					// Legacy command - open dashboard
					vscode.commands.executeCommand('clineSupreme.openDashboard');
				}
		},
		// Enhanced commands
		{
			command: 'clineSupreme.openDashboard',
			callback: () => {
				vscode.commands.executeCommand('clineSupreme.dashboard.focus');
			}
		},
		{
			command: 'clineSupreme.createTask',
			callback: async () => {
					// Show task creation interface
					vscode.window.showInformationMessage('Task creation feature coming soon!');
				}
		},
		{
			command: 'clineSupreme.analyzeCode',
			callback: async () => {
					// Show code analysis interface
					vscode.window.showInformationMessage('Code analysis feature coming soon!');
				}
		},
		{
			command: 'clineSupreme.deployProject',
			callback: async () => {
					// Show deployment interface
					vscode.window.showInformationMessage('Project deployment feature coming soon!');
				}
		}
	];
	
	// Register all commands
	commands.forEach(({ command, callback }) => {
		const disposable = vscode.commands.registerCommand(command, callback);
		context.subscriptions.push(disposable);
	});
}

/**
 * Register event listeners
 */
function registerEventListeners(context: vscode.ExtensionContext, controller: Controller): void {
	// Configuration change listener
	const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('cline') || event.affectsConfiguration('clineSupreme')) {
			// Handle configuration changes
			console.log('Configuration changed:', event);
		}
	});
	
	context.subscriptions.push(configChangeDisposable);
}

/**
 * Show welcome message for new users
 */
function showWelcomeMessage(context: vscode.ExtensionContext): void {
	const hasShownWelcome = context.globalState.get('clineSupreme.hasShownWelcome', false);
	
	if (!hasShownWelcome) {
		vscode.window.showInformationMessage(
			'Welcome to Cline Supreme! Your enhanced AI-powered coding assistant is ready.',
			'Open Dashboard',
			'Don\'t Show Again'
		).then(selection => {
			switch (selection) {
				case 'Open Dashboard':
					vscode.commands.executeCommand('clineSupreme.openDashboard');
					break;
				case 'Don\'t Show Again':
					context.globalState.update('clineSupreme.hasShownWelcome', true);
					break;
			}
		});
	}
}

// Export for testing and external access
export {
	webviewProvider,
	controller,
	agentOrchestrator,
	modelManager,
	configManager,
	securityManager,
	deploymentManager,
	promptManager,
	outputChannel
};

/**
 * Get the current controller instance
 */
export function getController(): Controller | undefined {
	return controller;
}

/**
 * Get the current webview provider instance
 */
export function getWebviewProvider(): WebviewProvider | undefined {
	return webviewProvider;
}