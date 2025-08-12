import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { ConfigManager } from '../config/manager';
import { SecurityManager } from '../security/manager';

export interface DeploymentTarget {
  id: string;
  name: string;
  type: 'vercel' | 'netlify' | 'aws' | 'docker' | 'heroku' | 'railway';
  config: Record<string, any>;
  status: 'active' | 'inactive' | 'error';
  lastDeployment?: Date;
  url?: string;
}

export interface DeploymentConfig {
  projectName: string;
  buildCommand: string;
  outputDirectory: string;
  environmentVariables: Record<string, string>;
  domains?: string[];
  features?: string[];
}

export interface DeploymentResult {
  success: boolean;
  deploymentId?: string;
  url?: string;
  logs?: string[];
  error?: string;
  duration?: number;
}

export class DeploymentManager {
  private logger: Logger;
  private config: ConfigManager;
  private security: SecurityManager;
  private targets: Map<string, DeploymentTarget> = new Map();

  constructor(config: ConfigManager, security: SecurityManager) {
    this.logger = new Logger('DeploymentManager');
    this.config = config;
    this.security = security;
    this.initializeTargets();
  }

  private initializeTargets(): void {
    // Initialize default deployment targets
    const defaultTargets: DeploymentTarget[] = [
      {
        id: 'vercel',
        name: 'Vercel',
        type: 'vercel',
        config: {
          framework: 'nextjs',
          nodeVersion: '18.x',
          buildCommand: 'npm run build',
          outputDirectory: '.next'
        },
        status: 'inactive'
      },
      {
        id: 'netlify',
        name: 'Netlify',
        type: 'netlify',
        config: {
          buildCommand: 'npm run build',
          publishDirectory: 'dist',
          nodeVersion: '18'
        },
        status: 'inactive'
      },
      {
        id: 'docker',
        name: 'Docker',
        type: 'docker',
        config: {
          dockerfile: 'Dockerfile',
          context: '.',
          platform: 'linux/amd64'
        },
        status: 'inactive'
      }
    ];

    for (const target of defaultTargets) {
      this.targets.set(target.id, target);
    }

    this.logger.info(`Initialized ${this.targets.size} deployment targets`);
  }

  public async deployToVercel(
    projectPath: string,
    config: DeploymentConfig
  ): Promise<DeploymentResult> {
    const startTime = Date.now();
    this.logger.info(`Starting Vercel deployment for ${config.projectName}`);

    try {
      // Create vercel.json configuration
      await this.createVercelConfig(projectPath, config);

      // Create deployment script
      const deployScript = this.generateVercelDeployScript(config);
      
      // Execute deployment
      const result = await this.executeDeployment('vercel', deployScript, projectPath);
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.updateTargetStatus('vercel', 'active', result.url);
        this.logger.info(`Vercel deployment completed in ${duration}ms`);
      }
      
      return {
        ...result,
        duration
      };
    } catch (error) {
      this.updateTargetStatus('vercel', 'error');
      this.logger.error('Vercel deployment failed', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  public async deployToNetlify(
    projectPath: string,
    config: DeploymentConfig
  ): Promise<DeploymentResult> {
    const startTime = Date.now();
    this.logger.info(`Starting Netlify deployment for ${config.projectName}`);

    try {
      // Create netlify.toml configuration
      await this.createNetlifyConfig(projectPath, config);

      // Create deployment script
      const deployScript = this.generateNetlifyDeployScript(config);
      
      // Execute deployment
      const result = await this.executeDeployment('netlify', deployScript, projectPath);
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.updateTargetStatus('netlify', 'active', result.url);
        this.logger.info(`Netlify deployment completed in ${duration}ms`);
      }
      
      return {
        ...result,
        duration
      };
    } catch (error) {
      this.updateTargetStatus('netlify', 'error');
      this.logger.error('Netlify deployment failed', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  public async deployToDocker(
    projectPath: string,
    config: DeploymentConfig
  ): Promise<DeploymentResult> {
    const startTime = Date.now();
    this.logger.info(`Starting Docker deployment for ${config.projectName}`);

    try {
      // Create Dockerfile if it doesn't exist
      await this.createDockerfile(projectPath, config);

      // Create docker-compose.yml
      await this.createDockerCompose(projectPath, config);

      // Create deployment script
      const deployScript = this.generateDockerDeployScript(config);
      
      // Execute deployment
      const result = await this.executeDeployment('docker', deployScript, projectPath);
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.updateTargetStatus('docker', 'active');
        this.logger.info(`Docker deployment completed in ${duration}ms`);
      }
      
      return {
        ...result,
        duration
      };
    } catch (error) {
      this.updateTargetStatus('docker', 'error');
      this.logger.error('Docker deployment failed', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  private async createVercelConfig(
    projectPath: string,
    config: DeploymentConfig
  ): Promise<void> {
    const vercelConfig = {
      name: config.projectName,
      version: 2,
      builds: [
        {
          src: 'package.json',
          use: '@vercel/node'
        }
      ],
      env: config.environmentVariables,
      functions: {
        'pages/api/**/*.ts': {
          runtime: 'nodejs18.x'
        }
      },
      rewrites: [
        {
          source: '/(.*)',
          destination: '/'
        }
      ]
    };

    const configPath = path.join(projectPath, 'vercel.json');
    await fs.promises.writeFile(
      configPath,
      JSON.stringify(vercelConfig, null, 2),
      'utf8'
    );

    this.logger.info('Created vercel.json configuration');
  }

  private async createNetlifyConfig(
    projectPath: string,
    config: DeploymentConfig
  ): Promise<void> {
    const netlifyConfig = `[build]
  command = "${config.buildCommand}"
  publish = "${config.outputDirectory}"

[build.environment]
${Object.entries(config.environmentVariables)
  .map(([key, value]) => `  ${key} = "${value}"`)
  .join('\n')}

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"`;

    const configPath = path.join(projectPath, 'netlify.toml');
    await fs.promises.writeFile(configPath, netlifyConfig, 'utf8');

    this.logger.info('Created netlify.toml configuration');
  }

  private async createDockerfile(
    projectPath: string,
    config: DeploymentConfig
  ): Promise<void> {
    const dockerfilePath = path.join(projectPath, 'Dockerfile');
    
    if (fs.existsSync(dockerfilePath)) {
      this.logger.info('Dockerfile already exists, skipping creation');
      return;
    }

    const dockerfile = `# Use Node.js 18 Alpine as base image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables
${Object.entries(config.environmentVariables)
  .map(([key, value]) => `ENV ${key}=${value}`)
  .join('\n')}

# Build the application
RUN ${config.buildCommand}

# Production image, copy all the files and run the application
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/${config.outputDirectory} ./${config.outputDirectory}
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["npm", "start"]`;

    await fs.promises.writeFile(dockerfilePath, dockerfile, 'utf8');
    this.logger.info('Created Dockerfile');
  }

  private async createDockerCompose(
    projectPath: string,
    config: DeploymentConfig
  ): Promise<void> {
    const dockerCompose = `version: '3.8'

services:
  ${config.projectName}:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
${Object.entries(config.environmentVariables)
  .map(([key, value]) => `      - ${key}=${value}`)
  .join('\n')}
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge`;

    const composePath = path.join(projectPath, 'docker-compose.yml');
    await fs.promises.writeFile(composePath, dockerCompose, 'utf8');
    this.logger.info('Created docker-compose.yml');
  }

  private generateVercelDeployScript(config: DeploymentConfig): string {
    return `#!/bin/bash
set -e

echo "🚀 Starting Vercel deployment..."

# Install Vercel CLI if not present
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "Deploying ${config.projectName} to Vercel..."
vercel --prod --yes

echo "✅ Vercel deployment completed!"`;
  }

  private generateNetlifyDeployScript(config: DeploymentConfig): string {
    return `#!/bin/bash
set -e

echo "🚀 Starting Netlify deployment..."

# Install Netlify CLI if not present
if ! command -v netlify &> /dev/null; then
    echo "Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# Build the project
echo "Building ${config.projectName}..."
${config.buildCommand}

# Deploy to Netlify
echo "Deploying to Netlify..."
netlify deploy --prod --dir=${config.outputDirectory}

echo "✅ Netlify deployment completed!"`;
  }

  private generateDockerDeployScript(config: DeploymentConfig): string {
    return `#!/bin/bash
set -e

echo "🚀 Starting Docker deployment..."

# Build Docker image
echo "Building Docker image for ${config.projectName}..."
docker build -t ${config.projectName}:latest .

# Stop existing container if running
echo "Stopping existing container..."
docker stop ${config.projectName} 2>/dev/null || true
docker rm ${config.projectName} 2>/dev/null || true

# Run new container
echo "Starting new container..."
docker run -d --name ${config.projectName} -p 3000:3000 ${config.projectName}:latest

echo "✅ Docker deployment completed!"
echo "Application is running at http://localhost:3000"`;
  }

  private async executeDeployment(
    targetType: string,
    script: string,
    projectPath: string
  ): Promise<DeploymentResult> {
    return new Promise((resolve) => {
      const { spawn } = require('child_process');
      
      // Write script to temporary file
      const scriptPath = path.join(projectPath, `deploy-${targetType}.sh`);
      fs.writeFileSync(scriptPath, script, { mode: 0o755 });
      
      const logs: string[] = [];
      const process = spawn('bash', [scriptPath], {
        cwd: projectPath,
        stdio: 'pipe'
      });
      
      process.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        logs.push(output);
        this.logger.info(`[${targetType}] ${output.trim()}`);
      });
      
      process.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        logs.push(output);
        this.logger.error(`[${targetType}] ${output.trim()}`);
      });
      
      process.on('close', (code: number) => {
        // Clean up script file
        fs.unlinkSync(scriptPath);
        
        if (code === 0) {
          // Extract URL from logs if available
          const urlMatch = logs.join('').match(/https?:\/\/[^\s]+/);
          const url = urlMatch ? urlMatch[0] : undefined;
          
          resolve({
            success: true,
            logs,
            url
          });
        } else {
          resolve({
            success: false,
            logs,
            error: `Deployment failed with exit code ${code}`
          });
        }
      });
    });
  }

  private updateTargetStatus(
    targetId: string,
    status: 'active' | 'inactive' | 'error',
    url?: string
  ): void {
    const target = this.targets.get(targetId);
    if (target) {
      target.status = status;
      target.lastDeployment = new Date();
      if (url) {
        target.url = url;
      }
    }
  }

  public async createCICD(
    projectPath: string,
    config: DeploymentConfig
  ): Promise<void> {
    // Create GitHub Actions workflow
    await this.createGitHubActions(projectPath, config);
    
    // Create GitLab CI configuration
    await this.createGitLabCI(projectPath, config);
    
    this.logger.info('Created CI/CD configurations');
  }

  private async createGitHubActions(
    projectPath: string,
    config: DeploymentConfig
  ): Promise<void> {
    const workflowDir = path.join(projectPath, '.github', 'workflows');
    await fs.promises.mkdir(workflowDir, { recursive: true });

    const workflow = `name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run linting
      run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: ${config.buildCommand}
      env:
${Object.entries(config.environmentVariables)
  .map(([key]) => `        ${key}: \${{ secrets.${key} }}`)
  .join('\n')}
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: \${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'
        working-directory: ./`;

    const workflowPath = path.join(workflowDir, 'deploy.yml');
    await fs.promises.writeFile(workflowPath, workflow, 'utf8');
  }

  private async createGitLabCI(
    projectPath: string,
    config: DeploymentConfig
  ): Promise<void> {
    const gitlabCI = `stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"

cache:
  paths:
    - node_modules/

test:
  stage: test
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm test
    - npm run lint
  only:
    - merge_requests
    - main

build:
  stage: build
  image: node:$NODE_VERSION
  script:
    - npm ci
    - ${config.buildCommand}
  artifacts:
    paths:
      - ${config.outputDirectory}/
    expire_in: 1 hour
  only:
    - main

deploy:
  stage: deploy
  image: node:$NODE_VERSION
  script:
    - npm install -g vercel
    - vercel --token $VERCEL_TOKEN --prod --yes
  environment:
    name: production
    url: https://${config.projectName}.vercel.app
  only:
    - main`;

    const ciPath = path.join(projectPath, '.gitlab-ci.yml');
    await fs.promises.writeFile(ciPath, gitlabCI, 'utf8');
  }

  public getTargets(): DeploymentTarget[] {
    return Array.from(this.targets.values());
  }

  public getTarget(id: string): DeploymentTarget | null {
    return this.targets.get(id) || null;
  }

  public async addTarget(target: DeploymentTarget): Promise<void> {
    this.targets.set(target.id, target);
    this.logger.info(`Added deployment target: ${target.name}`);
  }

  public async removeTarget(id: string): Promise<void> {
    if (this.targets.delete(id)) {
      this.logger.info(`Removed deployment target: ${id}`);
    }
  }

  public getDeploymentStatus(): any {
    const targets = Array.from(this.targets.values());
    
    return {
      total: targets.length,
      active: targets.filter(t => t.status === 'active').length,
      inactive: targets.filter(t => t.status === 'inactive').length,
      error: targets.filter(t => t.status === 'error').length,
      targets: targets.map(t => ({
        id: t.id,
        name: t.name,
        type: t.type,
        status: t.status,
        lastDeployment: t.lastDeployment,
        url: t.url
      }))
    };
  }
}