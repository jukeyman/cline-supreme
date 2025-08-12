#!/bin/bash

# 🚀 Cline Supreme Auto-Installer
# Author: Rick Jefferson Solutions
# Version: 2.0.0

echo "🚀 Installing Cline Supreme Multi-Agent AI Assistant..."
echo "================================================="

# Check if VS Code is installed
if ! command -v code &> /dev/null; then
    echo "❌ VS Code is not installed or not in PATH"
    echo "Please install VS Code first: https://code.visualstudio.com/"
    exit 1
fi

# Check if the VSIX file exists
if [ ! -f "cline-supreme-2.0.0.vsix" ]; then
    echo "❌ Extension package not found: cline-supreme-2.0.0.vsix"
    echo "Please run 'npm run build && vsce package' first"
    exit 1
fi

echo "✅ VS Code found"
echo "✅ Extension package found"
echo ""
echo "📦 Installing Cline Supreme extension..."

# Install the extension
code --install-extension cline-supreme-2.0.0.vsix

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! Cline Supreme has been installed!"
    echo ""
    echo "🔧 Next Steps:"
    echo "1. Restart VS Code"
    echo "2. Look for the robot icon (🤖) in the Activity Bar"
    echo "3. Press Cmd+Shift+P and type 'Cline Supreme: Open Dashboard'"
    echo "4. Configure your API keys in VS Code settings"
    echo ""
    echo "📚 Read INSTALL.md for detailed setup instructions"
    echo ""
    echo "🚀 Ready to revolutionize your development workflow!"
    echo "📞 Support: support@rjbizsolution.com | 945-308-8003"
else
    echo "❌ Installation failed. Please try manual installation:"
    echo "1. Open VS Code"
    echo "2. Press Cmd+Shift+P"
    echo "3. Type 'Extensions: Install from VSIX...'"
    echo "4. Select cline-supreme-2.0.0.vsix"
fi

echo ""
echo "================================================="
echo "🎯 Cline Supreme - Multi-Agent AI Assistant"
echo "   by Rick Jefferson Solutions"
echo "================================================="