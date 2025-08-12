import * as vscode from 'vscode';
import { SecurityManager } from '../security/manager';
import { Logger } from '../utils/logger';
import { PromptsManager } from '../prompts/prompts-manager';
import * as path from 'path';
import * as fs from 'fs';

export interface ClineConfig {
	apiProvider: string;
	multiAgentMode: boolean;
	autoModelSelection: boolean;
	enableRevenueAgents: boolean;
	thinkingBudget?: number;
	maxTokens?: number;
	temperature?: number;
	customApiEndpoint?: string;
	deploymentTargets?: string[];
	agentRoles?: string[];
}

export interface ApiCredentials {
	// AI/ML Services
	anthropicApiKey?: string;
	openaiApiKey?: string;
	openrouterApiKey?: string;
	googleApiKey?: string;
	googleAiApiKey?: string;
	awsAccessKeyId?: string;
	awsSecretAccessKey?: string;
	awsRegion?: string;
	azureApiKey?: string;
	azureEndpoint?: string;
	gcpProjectId?: string;
	gcpServiceAccountKey?: string;
	cerebrasApiKey?: string;
	groqApiKey?: string;
	deepseekApiKey?: string;
	togetherAiApiKey?: string;
	perplexityApiKey?: string;
	pineconeApiKey?: string;
	langchainApiKey?: string;
	abacusAiApiKey1?: string;
	abacusAiApiKey2?: string;
	glamaApiKey?: string;
	joggAiKey?: string;
	firecrawlApiKey?: string;
	linkupApiKey?: string;
	disputefoxApiKey?: string;
	huggingfaceToken?: string;
	paperswithcodeToken?: string;
	kaggleUsername?: string;
	kaggleKey?: string;
	ollamaEndpoint?: string;
	lmStudioEndpoint?: string;
	customApiKey?: string;
	
	// Cloud & Hosting
	cloudflareApiToken?: string;
	cloudflareAccountId?: string;
	cloudflareZoneId?: string;
	netlifyToken?: string;
	builderIoApiKey?: string;
	vercelToken1?: string;
	vercelToken2?: string;
	herokuToken?: string;
	railwayApiKey?: string;
	
	// Development & Version Control
	githubClientId?: string;
	githubClientSecret?: string;
	githubPat?: string;
	swaggerApiKey?: string;
	postmanApiKey?: string;
	forgeApiKey?: string;
	
	// Payment Services
	authorizeNetPaymentGatewayId?: string;
	authorizeNetApiLoginId?: string;
	authorizeNetTransactionKey?: string;
	authorizeNetSignatureKey?: string;
	stripePublicKey?: string;
	stripeSecretKey?: string;
	
	// Communication Services
	twilioAccountSid?: string;
	twilioAuthToken?: string;
	twilioPhoneNumber?: string;
	twilioAccountSid2?: string;
	twilioAuthToken2?: string;
	twilioPhoneNumber2?: string;
	emailIncomingServer?: string;
	emailOutgoingServer?: string;
	emailUsername?: string;
	emailPassword?: string;
	
	// Social Media APIs
	facebookMarketingToken?: string;
	instagramAppId?: string;
	instagramAppSecret?: string;
	instagramAccessToken?: string;
	facebookAppId?: string;
	facebookAppSecret?: string;
	twitterApiKey?: string;
	twitterApiSecret?: string;
	twitterBearerToken?: string;
	twitterAccessToken?: string;
	twitterAccessTokenSecret?: string;
	youtubeApiKey?: string;
	youtubeClientId?: string;
	youtubeClientSecret?: string;
	
	// Google Services
	googleClientId1?: string;
	googleClientSecret1?: string;
	googleClientId2?: string;
	googleClientSecret2?: string;
	googleSaClientEmail?: string;
	googleSaPrivateKey?: string;
	
	// Database
	mysqlServer?: string;
	mysqlDatabase?: string;
	mysqlUsername?: string;
	mysqlPassword?: string;
	
	// Content & Media
	pexelsApiKey?: string;
	envatoToken?: string;
	
	// Integration Services
	zapierMcpSseUrl?: string;
	airtableApiKey?: string;
	weaviateUrl?: string;
	weaviateAdminKey?: string;
	
	// Government APIs
	samsGovApiKey?: string;
	dataGovApiKey?: string;
	
	// S3 Compatible Storage
	s3AccessKeyId?: string;
	s3SecretAccessKey?: string;
}

export class ConfigManager {
	private logger: Logger;
	private context: vscode.ExtensionContext;
	private securityManager: SecurityManager;
	private promptsManager: PromptsManager;
	private config: ClineConfig;
	private credentials: ApiCredentials;
	private envPath: string;

	constructor(context: vscode.ExtensionContext, securityManager: SecurityManager) {
		this.logger = new Logger('ConfigManager');
		this.context = context;
		this.securityManager = securityManager;
		this.promptsManager = PromptsManager.getInstance();
		this.config = this.getDefaultConfig();
		this.credentials = {};
		this.envPath = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', '.env');
	}

	async initialize(): Promise<void> {
		this.logger.info('🔧 Initializing Configuration Manager...');
		
		try {
			// Load configuration from VS Code settings
			await this.loadConfiguration();
			
			// Load credentials from secure storage and .env
			await this.loadCredentials();
			
			// Create .env template if it doesn't exist
			await this.createEnvTemplate();
			
			this.logger.info('✅ Configuration Manager initialized successfully');
		} catch (error) {
			this.logger.error('❌ Failed to initialize Configuration Manager:', error);
			throw error;
		}
	}

	private getDefaultConfig(): ClineConfig {
		return {
			apiProvider: 'anthropic',
			multiAgentMode: true,
			autoModelSelection: true,
			enableRevenueAgents: false,
			thinkingBudget: 20,
			maxTokens: 8192,
			temperature: 0.7,
			deploymentTargets: ['vercel', 'netlify'],
			agentRoles: ['orchestrator', 'builder', 'designer', 'researcher', 'optimizer', 'security', 'deploy']
		};
	}

	async loadConfiguration(): Promise<void> {
		const workspaceConfig = vscode.workspace.getConfiguration('cline');
		
		this.config = {
			apiProvider: workspaceConfig.get('apiProvider', this.config.apiProvider),
			multiAgentMode: workspaceConfig.get('multiAgentMode', this.config.multiAgentMode),
			autoModelSelection: workspaceConfig.get('autoModelSelection', this.config.autoModelSelection),
			enableRevenueAgents: workspaceConfig.get('enableRevenueAgents', this.config.enableRevenueAgents),
			thinkingBudget: workspaceConfig.get('thinkingBudget', this.config.thinkingBudget),
			maxTokens: workspaceConfig.get('maxTokens', this.config.maxTokens),
			temperature: workspaceConfig.get('temperature', this.config.temperature),
			customApiEndpoint: workspaceConfig.get('customApiEndpoint'),
			deploymentTargets: workspaceConfig.get('deploymentTargets', this.config.deploymentTargets),
			agentRoles: workspaceConfig.get('agentRoles', this.config.agentRoles)
		};
	}

	async loadCredentials(): Promise<void> {
		try {
			// Load individual credentials from secure storage
			const secureCredentials: Partial<ApiCredentials> = {};
			
			// Load from .env file if it exists
			const envCredentials = await this.loadEnvCredentials();
			
			// Merge credentials (secure storage takes precedence)
			this.credentials = {
				...envCredentials,
				...secureCredentials
			};
			
			this.logger.info('🔐 Credentials loaded successfully');
		} catch (error) {
			this.logger.error('❌ Failed to load credentials:', error);
		}
	}

	private async loadEnvCredentials(): Promise<ApiCredentials> {
		const credentials: ApiCredentials = {};
		
		if (fs.existsSync(this.envPath)) {
			try {
				const envContent = fs.readFileSync(this.envPath, 'utf8');
				const envLines = envContent.split('\n');
				
				for (const line of envLines) {
					const [key, value] = line.split('=');
					if (key && value) {
						const cleanKey = key.trim();
						const cleanValue = value.trim().replace(/["']/g, '');
						
						// Map environment variables to credentials
					const keyMapping: Record<string, keyof ApiCredentials> = {
						// AI/ML Services
						'ANTHROPIC_API_KEY': 'anthropicApiKey',
						'OPENAI_API_KEY': 'openaiApiKey',
						'OPENROUTER_API_KEY': 'openrouterApiKey',
						'GOOGLE_API_KEY': 'googleApiKey',
						'GOOGLE_AI_API_KEY': 'googleAiApiKey',
						'GROQ_API_KEY': 'groqApiKey',
						'DEEPSEEK_API_KEY': 'deepseekApiKey',
						'TOGETHER_AI_API_KEY': 'togetherAiApiKey',
						'PERPLEXITY_API_KEY': 'perplexityApiKey',
						'PINECONE_API_KEY': 'pineconeApiKey',
						'LANGCHAIN_API_KEY': 'langchainApiKey',
						'ABACUS_AI_API_KEY_1': 'abacusAiApiKey1',
						'ABACUS_AI_API_KEY_2': 'abacusAiApiKey2',
						'GLAMA_API_KEY': 'glamaApiKey',
						'JOGG_AI_KEY': 'joggAiKey',
						'FIRECRAWL_API_KEY': 'firecrawlApiKey',
						'LINKUP_API_KEY': 'linkupApiKey',
						'DISPUTEFOX_API_KEY': 'disputefoxApiKey',
						'HUGGINGFACE_TOKEN': 'huggingfaceToken',
						'PAPERSWITHCODE_TOKEN': 'paperswithcodeToken',
						'KAGGLE_USERNAME': 'kaggleUsername',
						'KAGGLE_KEY': 'kaggleKey',
						
						// Cloud & Hosting
						'AWS_ACCESS_KEY_ID': 'awsAccessKeyId',
						'AWS_SECRET_ACCESS_KEY': 'awsSecretAccessKey',
						'AWS_REGION': 'awsRegion',
						'CLOUDFLARE_API_TOKEN': 'cloudflareApiToken',
						'CLOUDFLARE_ACCOUNT_ID': 'cloudflareAccountId',
						'CLOUDFLARE_ZONE_ID': 'cloudflareZoneId',
						'NETLIFY_TOKEN': 'netlifyToken',
						'BUILDER_IO_API_KEY': 'builderIoApiKey',
						'VERCEL_TOKEN_1': 'vercelToken1',
						'VERCEL_TOKEN_2': 'vercelToken2',
						'HEROKU_TOKEN': 'herokuToken',
						'RAILWAY_API_KEY': 'railwayApiKey',
						
						// Development & Version Control
						'GITHUB_CLIENT_ID': 'githubClientId',
						'GITHUB_CLIENT_SECRET': 'githubClientSecret',
						'GITHUB_PAT': 'githubPat',
						'SWAGGER_API_KEY': 'swaggerApiKey',
						'POSTMAN_API_KEY': 'postmanApiKey',
						'FORGE_API_KEY': 'forgeApiKey',
						
						// Payment Services
						'AUTHORIZE_NET_PAYMENT_GATEWAY_ID': 'authorizeNetPaymentGatewayId',
						'AUTHORIZE_NET_API_LOGIN_ID': 'authorizeNetApiLoginId',
						'AUTHORIZE_NET_TRANSACTION_KEY': 'authorizeNetTransactionKey',
						'AUTHORIZE_NET_SIGNATURE_KEY': 'authorizeNetSignatureKey',
						'STRIPE_PUBLIC_KEY': 'stripePublicKey',
						'STRIPE_SECRET_KEY': 'stripeSecretKey',
						
						// Communication Services
						'TWILIO_ACCOUNT_SID': 'twilioAccountSid',
						'TWILIO_AUTH_TOKEN': 'twilioAuthToken',
						'TWILIO_PHONE_NUMBER': 'twilioPhoneNumber',
						'TWILIO_ACCOUNT_SID_2': 'twilioAccountSid2',
						'TWILIO_AUTH_TOKEN_2': 'twilioAuthToken2',
						'TWILIO_PHONE_NUMBER_2': 'twilioPhoneNumber2',
						'EMAIL_INCOMING_SERVER': 'emailIncomingServer',
						'EMAIL_OUTGOING_SERVER': 'emailOutgoingServer',
						'EMAIL_USERNAME': 'emailUsername',
						'EMAIL_PASSWORD': 'emailPassword',
						
						// Social Media APIs
						'FACEBOOK_MARKETING_TOKEN': 'facebookMarketingToken',
						'INSTAGRAM_APP_ID': 'instagramAppId',
						'INSTAGRAM_APP_SECRET': 'instagramAppSecret',
						'INSTAGRAM_ACCESS_TOKEN': 'instagramAccessToken',
						'FACEBOOK_APP_ID': 'facebookAppId',
						'FACEBOOK_APP_SECRET': 'facebookAppSecret',
						'TWITTER_API_KEY': 'twitterApiKey',
						'TWITTER_API_SECRET': 'twitterApiSecret',
						'TWITTER_BEARER_TOKEN': 'twitterBearerToken',
						'TWITTER_ACCESS_TOKEN': 'twitterAccessToken',
						'TWITTER_ACCESS_TOKEN_SECRET': 'twitterAccessTokenSecret',
						'YOUTUBE_API_KEY': 'youtubeApiKey',
						'YOUTUBE_CLIENT_ID': 'youtubeClientId',
						'YOUTUBE_CLIENT_SECRET': 'youtubeClientSecret',
						
						// Google Services
						'GOOGLE_CLIENT_ID_1': 'googleClientId1',
						'GOOGLE_CLIENT_SECRET_1': 'googleClientSecret1',
						'GOOGLE_CLIENT_ID_2': 'googleClientId2',
						'GOOGLE_CLIENT_SECRET_2': 'googleClientSecret2',
						'GOOGLE_SA_CLIENT_EMAIL': 'googleSaClientEmail',
						'GOOGLE_SA_PRIVATE_KEY': 'googleSaPrivateKey',
						
						// Database
						'MYSQL_SERVER': 'mysqlServer',
						'MYSQL_DATABASE': 'mysqlDatabase',
						'MYSQL_USERNAME': 'mysqlUsername',
						'MYSQL_PASSWORD': 'mysqlPassword',
						
						// Content & Media
						'PEXELS_API_KEY': 'pexelsApiKey',
						'ENVATO_TOKEN': 'envatoToken',
						
						// Integration Services
						'ZAPIER_MCP_SSE_URL': 'zapierMcpSseUrl',
						'AIRTABLE_API_KEY': 'airtableApiKey',
						'WEAVIATE_URL': 'weaviateUrl',
						'WEAVIATE_ADMIN_KEY': 'weaviateAdminKey',
						
						// Government APIs
						'SAMS_GOV_API_KEY': 'samsGovApiKey',
						'DATA_GOV_API_KEY': 'dataGovApiKey',
						
						// S3 Compatible Storage
						'S3_ACCESS_KEY_ID': 's3AccessKeyId',
						'S3_SECRET_ACCESS_KEY': 's3SecretAccessKey',
						
						// Legacy mappings
						'AZURE_API_KEY': 'azureApiKey',
						'AZURE_ENDPOINT': 'azureEndpoint',
						'GCP_PROJECT_ID': 'gcpProjectId',
						'CEREBRAS_API_KEY': 'cerebrasApiKey',
						'OLLAMA_ENDPOINT': 'ollamaEndpoint',
						'LM_STUDIO_ENDPOINT': 'lmStudioEndpoint',
						'CUSTOM_API_KEY': 'customApiKey'
					};
					
					const mappedKey = keyMapping[cleanKey];
					if (mappedKey) {
						(credentials as any)[mappedKey] = cleanValue;
					}
					}
				}
			} catch (error) {
				this.logger.warn('⚠️ Failed to parse .env file:', error);
			}
		}
		
		return credentials;
	}

	private async createEnvTemplate(): Promise<void> {
		if (!fs.existsSync(this.envPath)) {
			const template = `# Cline Supreme API Keys Configuration
# Add your API keys here. This file should be added to .gitignore for security.

# Anthropic (Claude)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# OpenAI (GPT)
OPENAI_API_KEY=your_openai_api_key_here

# OpenRouter (Multiple Models)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Google (Gemini)
GOOGLE_API_KEY=your_google_api_key_here

# AWS Bedrock
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1

# Azure OpenAI
AZURE_API_KEY=your_azure_api_key_here
AZURE_ENDPOINT=your_azure_endpoint_here

# Google Cloud Platform
GCP_PROJECT_ID=your_gcp_project_id_here

# Cerebras
CEREBRAS_API_KEY=your_cerebras_api_key_here

# Groq
GROQ_API_KEY=your_groq_api_key_here

# Local Models
OLLAMA_ENDPOINT=http://localhost:11434
LM_STUDIO_ENDPOINT=http://localhost:1234

# Custom API
CUSTOM_API_KEY=your_custom_api_key_here
`;
			
			try {
				fs.writeFileSync(this.envPath, template);
				this.logger.info('📝 Created .env template file');
				
				// Show information message to user
				vscode.window.showInformationMessage(
					'Cline Supreme: Created .env template file. Please add your API keys.',
					'Open .env File'
				).then(selection => {
					if (selection === 'Open .env File') {
						vscode.workspace.openTextDocument(this.envPath).then(doc => {
							vscode.window.showTextDocument(doc);
						});
					}
				});
			} catch (error) {
				this.logger.error('❌ Failed to create .env template:', error);
			}
		}
	}

	async reloadConfiguration(): Promise<void> {
		this.logger.info('🔄 Reloading configuration...');
		await this.loadConfiguration();
		await this.loadCredentials();
		this.logger.info('✅ Configuration reloaded successfully');
	}

	getConfig<K extends keyof ClineConfig>(key: K, defaultValue?: ClineConfig[K]): ClineConfig[K] {
		return this.config[key] ?? defaultValue;
	}

	getCredential<K extends keyof ApiCredentials>(key: K): ApiCredentials[K] {
		return this.credentials[key];
	}

	async setCredential<K extends keyof ApiCredentials>(key: K, value: ApiCredentials[K]): Promise<void> {
		this.credentials[key] = value;
		if (value) {
			await this.securityManager.storeCredential(key as string, value as string);
		}
	}

	getPromptsManager(): PromptsManager {
		return this.promptsManager;
	}

	getAgentPrompt(agentType: string): string {
		return this.promptsManager.getAgentPrompt(agentType);
	}

	getCourseCreationPrompts() {
		return this.promptsManager.getCourseCreationPrompts();
	}

	getAllCredentials(): ApiCredentials {
		return { ...this.credentials };
	}

	getFullConfig(): ClineConfig {
		return { ...this.config };
	}

	async dispose(): Promise<void> {
		this.logger.info('🔄 Disposing Configuration Manager...');
		// Clear sensitive data from memory
		this.credentials = {};
		this.logger.info('✅ Configuration Manager disposed');
	}
}