import * as vscode from 'vscode';

export class Logger {
	private outputChannel: vscode.OutputChannel;
	private context: string;

	constructor(context: string) {
		this.context = context;
		this.outputChannel = vscode.window.createOutputChannel(`${context} Logs`);
	}

	private formatMessage(level: string, message: string, ...args: any[]): string {
		const timestamp = new Date().toISOString();
		const formattedArgs = args.length > 0 ? ` ${args.map(arg => 
			typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
		).join(' ')}` : '';
		return `[${timestamp}] [${level}] [${this.context}] ${message}${formattedArgs}`;
	}

	info(message: string, ...args: any[]): void {
		const formatted = this.formatMessage('INFO', message, ...args);
		this.outputChannel.appendLine(formatted);
		console.log(formatted);
	}

	warn(message: string, ...args: any[]): void {
		const formatted = this.formatMessage('WARN', message, ...args);
		this.outputChannel.appendLine(formatted);
		console.warn(formatted);
	}

	error(message: string, ...args: any[]): void {
		const formatted = this.formatMessage('ERROR', message, ...args);
		this.outputChannel.appendLine(formatted);
		console.error(formatted);
	}

	debug(message: string, ...args: any[]): void {
		const formatted = this.formatMessage('DEBUG', message, ...args);
		this.outputChannel.appendLine(formatted);
		console.debug(formatted);
	}

	show(): void {
		this.outputChannel.show();
	}

	dispose(): void {
		this.outputChannel.dispose();
	}
}