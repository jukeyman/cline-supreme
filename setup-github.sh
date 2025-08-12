#!/bin/bash

# ========================================================================
# GitHub Repository Setup Script - Cline Supreme
# Rick Jefferson Solutions - Enterprise AI Solutions
# ========================================================================

set -e

# Colors for output
TEAL='\033[0;36m'
NAVY='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${TEAL}========================================================================${NC}"
echo -e "${NAVY}🚀 Cline Supreme - GitHub Repository Setup${NC}"
echo -e "${TEAL}Rick Jefferson Solutions - Enterprise AI Solutions${NC}"
echo -e "${TEAL}========================================================================${NC}"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed. Please install Git first.${NC}"
    exit 1
fi

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) is not installed. You'll need to create the repository manually.${NC}"
    echo -e "${YELLOW}   Install with: brew install gh${NC}"
    MANUAL_SETUP=true
else
    MANUAL_SETUP=false
fi

# Get repository details
echo -e "${TEAL}📝 Repository Configuration${NC}"
echo -e "${NAVY}🏢 Rick Jefferson Solutions - Automated Setup${NC}"
GITHUB_USERNAME="rickjefferson"
REPO_NAME="cline-supreme"
echo -e "${GREEN}✅ Using Rick Jefferson Solutions account: $GITHUB_USERNAME/$REPO_NAME${NC}"

read -p "Make repository private? (y/N): " PRIVATE_REPO
if [[ $PRIVATE_REPO =~ ^[Yy]$ ]]; then
    VISIBILITY="--private"
else
    VISIBILITY="--public"
fi

echo ""
echo -e "${TEAL}🔧 Setting up local repository...${NC}"

# Initialize git repository if not already initialized
if [ ! -d ".git" ]; then
    git init
    echo -e "${GREEN}✅ Git repository initialized${NC}"
else
    echo -e "${YELLOW}⚠️  Git repository already exists${NC}"
fi

# Copy README for GitHub
cp README_GITHUB.md README.md
echo -e "${GREEN}✅ GitHub README created${NC}"

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
out/
*.vsix

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/settings.json
.vscode/launch.json
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Security
*.key
*.pem
*.p12
*.pfx
config/secrets.json

# Temporary files
tmp/
temp/

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/
EOF
    echo -e "${GREEN}✅ .gitignore created${NC}"
fi

# Add all files
echo -e "${TEAL}📦 Adding files to repository...${NC}"
git add .

# Initial commit
if git diff --staged --quiet; then
    echo -e "${YELLOW}⚠️  No changes to commit${NC}"
else
    git commit -m "🚀 Initial commit - Cline Supreme by Rick Jefferson Solutions

✨ Features:
- Multi-agent AI development system
- 11 specialized AI agents
- Enterprise-grade security
- Legal compliance tools
- Advanced code generation
- Real-time collaboration

🏢 Rick Jefferson Solutions
📞 945-308-8003
📧 support@rjbizsolution.com"
    echo -e "${GREEN}✅ Initial commit created${NC}"
fi

# Create GitHub repository
if [ "$MANUAL_SETUP" = false ]; then
    echo -e "${TEAL}🌐 Creating GitHub repository...${NC}"
    
    # Use provided GitHub PAT for authentication
    if [ -n "$GITHUB_PAT" ]; then
        echo -e "${GREEN}✅ Using provided GitHub Personal Access Token${NC}"
        echo "$GITHUB_PAT" | gh auth login --with-token
    elif ! gh auth status &> /dev/null; then
        echo -e "${YELLOW}🔐 Please authenticate with GitHub CLI...${NC}"
        gh auth login
    fi
    
    # Create repository
    gh repo create "$GITHUB_USERNAME/$REPO_NAME" $VISIBILITY \
        --description "🤖 Cline Supreme - Enterprise Multi-Agent AI Development System by Rick Jefferson Solutions. 11 specialized AI agents for advanced code generation, legal compliance, and enterprise automation. 📞 945-308-8003" \
        --homepage "https://rjbizsolution.com" \
        --source=.
    
    echo -e "${GREEN}✅ GitHub repository created successfully!${NC}"
    
    # Set up remote and push
    git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git" 2>/dev/null || true
    git branch -M main
    git push -u origin main
    
    echo -e "${GREEN}✅ Code pushed to GitHub!${NC}"
    
    # Open repository in browser
    echo -e "${TEAL}🌐 Opening repository in browser...${NC}"
    gh repo view --web
    
else
    echo -e "${YELLOW}📋 Manual Setup Required:${NC}"
    echo -e "${YELLOW}1. Go to https://github.com/new${NC}"
    echo -e "${YELLOW}2. Create repository: $REPO_NAME${NC}"
    echo -e "${YELLOW}3. Run these commands:${NC}"
    echo ""
    echo -e "${NAVY}git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git${NC}"
    echo -e "${NAVY}git branch -M main${NC}"
    echo -e "${NAVY}git push -u origin main${NC}"
fi

echo ""
echo -e "${TEAL}========================================================================${NC}"
echo -e "${GREEN}🎉 Repository Setup Complete!${NC}"
echo -e "${TEAL}========================================================================${NC}"
echo ""
echo -e "${NAVY}📊 Repository Details:${NC}"
echo -e "${TEAL}   • Name: $REPO_NAME${NC}"
echo -e "${TEAL}   • Owner: $GITHUB_USERNAME${NC}"
echo -e "${TEAL}   • URL: https://github.com/$GITHUB_USERNAME/$REPO_NAME${NC}"
echo ""
echo -e "${NAVY}🚀 Next Steps:${NC}"
echo -e "${TEAL}   1. Configure repository settings (branch protection, etc.)${NC}"
echo -e "${TEAL}   2. Set up GitHub Actions secrets for CI/CD${NC}"
echo -e "${TEAL}   3. Enable GitHub Pages for documentation${NC}"
echo -e "${TEAL}   4. Configure marketplace deployment credentials${NC}"
echo ""
echo -e "${NAVY}🏢 Rick Jefferson Solutions${NC}"
echo -e "${TEAL}   📞 Support: 945-308-8003${NC}"
echo -e "${TEAL}   📧 Email: support@rjbizsolution.com${NC}"
echo -e "${TEAL}   🌐 Website: https://rjbizsolution.com${NC}"
echo ""
echo -e "${TEAL}========================================================================${NC}"