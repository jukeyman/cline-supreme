// Cline Supreme - Webview Script
// Handles all UI interactions and communication with the extension

class ClineSupremeUI {
    constructor() {
        this.vscode = acquireVsCodeApi();
        this.currentTab = 'dashboard';
        this.agents = new Map();
        this.tasks = new Map();
        this.chatSessions = new Map();
        this.currentChatAgent = null;
        this.notifications = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupTabNavigation();
        this.setupAnimations();
        this.requestInitialData();
        this.startPeriodicUpdates();
        
        console.log('Cline Supreme UI initialized');
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });
        
        // New Task Button
        document.getElementById('new-task-btn').addEventListener('click', () => {
            this.showNewTaskModal();
        });
        
        // Quick Action Button
        document.getElementById('quick-action').addEventListener('click', () => {
            this.showQuickActionMenu();
        });
        
        // Notifications Button
        document.getElementById('notifications-btn').addEventListener('click', () => {
            this.showNotifications();
        });
        
        // Task Filter
        document.getElementById('task-filter').addEventListener('change', (e) => {
            this.filterTasks(e.target.value);
        });
        
        // Refresh Tasks
        document.getElementById('refresh-tasks').addEventListener('click', () => {
            this.refreshTasks();
        });
        
        // Chat Input
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-message');
        
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChatMessage();
            }
        });
        
        sendButton.addEventListener('click', () => {
            this.sendChatMessage();
        });
        
        // Modal Close
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal();
            }
        });
        
        // Listen for messages from extension
        window.addEventListener('message', (event) => {
            this.handleMessage(event.data);
        });
    }
    
    setupTabNavigation() {
        // Initialize with dashboard tab
        this.switchTab('dashboard');
    }
    
    setupAnimations() {
        // GSAP animations for smooth transitions
        gsap.set('.metric-card', { y: 20, opacity: 0 });
        gsap.to('.metric-card', {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out'
        });
        
        // Floating action button animation
        gsap.set('#quick-action', { scale: 0 });
        gsap.to('#quick-action', {
            scale: 1,
            duration: 0.5,
            delay: 1,
            ease: 'back.out(1.7)'
        });
    }
    
    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('bg-blue-600', 'text-white');
            item.classList.add('text-gray-300', 'hover:bg-gray-700');
        });
        
        const activeNav = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeNav) {
            activeNav.classList.add('bg-blue-600', 'text-white');
            activeNav.classList.remove('text-gray-300', 'hover:bg-gray-700');
        }
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });
        
        // Show selected tab
        const selectedTab = document.getElementById(`${tabName}-tab`);
        if (selectedTab) {
            selectedTab.classList.remove('hidden');
            
            // Animate tab content
            gsap.fromTo(selectedTab, 
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.3 }
            );
        }
        
        // Update page title
        this.updatePageTitle(tabName);
        
        this.currentTab = tabName;
        
        // Load tab-specific data
        this.loadTabData(tabName);
    }
    
    updatePageTitle(tabName) {
        const titles = {
            dashboard: { title: 'Dashboard', subtitle: 'Overview of your AI agents and tasks' },
            agents: { title: 'Agents', subtitle: 'Manage your AI agent workforce' },
            tasks: { title: 'Tasks', subtitle: 'Monitor and manage all tasks' },
            chat: { title: 'Chat', subtitle: 'Communicate with your AI agents' },
            deployment: { title: 'Deployment', subtitle: 'Deploy your projects to the cloud' },
            analytics: { title: 'Analytics', subtitle: 'Performance insights and metrics' },
            settings: { title: 'Settings', subtitle: 'Configure your Cline Supreme experience' }
        };
        
        const titleInfo = titles[tabName] || { title: 'Cline Supreme', subtitle: 'Multi-Agent AI Assistant' };
        
        document.getElementById('page-title').textContent = titleInfo.title;
        document.getElementById('page-subtitle').textContent = titleInfo.subtitle;
    }
    
    loadTabData(tabName) {
        switch (tabName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'agents':
                this.loadAgentsData();
                break;
            case 'tasks':
                this.loadTasksData();
                break;
            case 'chat':
                this.loadChatData();
                break;
            case 'deployment':
                this.loadDeploymentData();
                break;
            case 'analytics':
                this.loadAnalyticsData();
                break;
            case 'settings':
                this.loadSettingsData();
                break;
        }
    }
    
    requestInitialData() {
        this.sendMessage({
            type: 'getInitialData'
        });
    }
    
    startPeriodicUpdates() {
        // Update system metrics every 5 seconds
        setInterval(() => {
            this.sendMessage({ type: 'getSystemMetrics' });
        }, 5000);
        
        // Update task status every 10 seconds
        setInterval(() => {
            if (this.currentTab === 'tasks' || this.currentTab === 'dashboard') {
                this.sendMessage({ type: 'getTaskStatus' });
            }
        }, 10000);
        
        // Update agent status every 15 seconds
        setInterval(() => {
            if (this.currentTab === 'agents' || this.currentTab === 'dashboard') {
                this.sendMessage({ type: 'getAgentStatus' });
            }
        }, 15000);
    }
    
    sendMessage(message) {
        this.vscode.postMessage(message);
    }
    
    handleMessage(message) {
        switch (message.type) {
            case 'initialData':
                this.handleInitialData(message.data);
                break;
            case 'systemMetrics':
                this.updateSystemMetrics(message.data);
                break;
            case 'taskStatus':
                this.updateTaskStatus(message.data);
                break;
            case 'agentStatus':
                this.updateAgentStatus(message.data);
                break;
            case 'chatMessage':
                this.handleChatMessage(message.data);
                break;
            case 'notification':
                this.showNotification(message.data);
                break;
            case 'error':
                this.showError(message.data);
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }
    
    handleInitialData(data) {
        // Update agents
        if (data.agents) {
            data.agents.forEach(agent => {
                this.agents.set(agent.id, agent);
            });
        }
        
        // Update tasks
        if (data.tasks) {
            data.tasks.forEach(task => {
                this.tasks.set(task.id, task);
            });
        }
        
        // Update metrics
        if (data.metrics) {
            this.updateSystemMetrics(data.metrics);
        }
        
        // Refresh current tab
        this.loadTabData(this.currentTab);
    }
    
    updateSystemMetrics(metrics) {
        // Update sidebar metrics
        document.getElementById('cpu-usage').textContent = `${metrics.cpu || 0}%`;
        document.getElementById('memory-usage').textContent = metrics.memory || '0GB';
        document.getElementById('active-agents').textContent = metrics.activeAgents || 0;
        
        // Update dashboard metrics
        document.getElementById('total-tasks').textContent = metrics.totalTasks || 0;
        document.getElementById('completed-tasks').textContent = metrics.completedTasks || 0;
        document.getElementById('active-agents-count').textContent = metrics.activeAgents || 0;
        document.getElementById('deployments-count').textContent = metrics.deployments || 0;
    }
    
    updateTaskStatus(tasks) {
        tasks.forEach(task => {
            this.tasks.set(task.id, task);
        });
        
        if (this.currentTab === 'tasks') {
            this.renderTasks();
        }
        
        if (this.currentTab === 'dashboard') {
            this.renderRecentTasks();
        }
    }
    
    updateAgentStatus(agents) {
        agents.forEach(agent => {
            this.agents.set(agent.id, agent);
        });
        
        if (this.currentTab === 'agents') {
            this.renderAgents();
        }
        
        if (this.currentTab === 'dashboard') {
            this.renderAgentActivity();
        }
    }
    
    loadDashboardData() {
        this.renderRecentTasks();
        this.renderAgentActivity();
    }
    
    renderRecentTasks() {
        const container = document.getElementById('recent-tasks');
        const recentTasks = Array.from(this.tasks.values())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
        
        container.innerHTML = recentTasks.map(task => `
            <div class="task-item flex items-center justify-between p-3 rounded-lg hover:bg-gray-700 cursor-pointer" data-task-id="${task.id}">
                <div class="flex items-center">
                    <div class="status-indicator status-${task.status}"></div>
                    <div>
                        <h4 class="text-sm font-semibold">${task.description}</h4>
                        <p class="text-xs text-gray-400">${task.type} • ${this.formatDate(task.createdAt)}</p>
                    </div>
                </div>
                <div class="text-xs text-gray-400">
                    ${task.progress || 0}%
                </div>
            </div>
        `).join('');
        
        // Add click listeners
        container.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('click', () => {
                const taskId = item.dataset.taskId;
                this.showTaskDetails(taskId);
            });
        });
    }
    
    renderAgentActivity() {
        const container = document.getElementById('agent-activity');
        const activeAgents = Array.from(this.agents.values())
            .filter(agent => agent.status === 'active')
            .slice(0, 5);
        
        container.innerHTML = activeAgents.map(agent => `
            <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-700">
                <div class="flex items-center">
                    <div class="agent-avatar mr-3">${agent.role.name.charAt(0)}</div>
                    <div>
                        <h4 class="text-sm font-semibold">${agent.role.name}</h4>
                        <p class="text-xs text-gray-400">${agent.currentTask || 'Idle'}</p>
                    </div>
                </div>
                <div class="status-indicator status-${agent.status}"></div>
            </div>
        `).join('');
    }
    
    loadAgentsData() {
        this.renderAgents();
    }
    
    renderAgents() {
        const container = document.getElementById('agents-grid');
        const agents = Array.from(this.agents.values());
        
        container.innerHTML = agents.map(agent => `
            <div class="agent-card glass-effect rounded-xl p-6">
                <div class="flex items-center mb-4">
                    <div class="agent-avatar mr-3">${agent.role.name.charAt(0)}</div>
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold">${agent.role.name}</h3>
                        <p class="text-sm text-gray-400">${agent.role.description}</p>
                    </div>
                    <div class="status-indicator status-${agent.status}"></div>
                </div>
                
                <div class="space-y-2 mb-4">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-400">Tasks Completed</span>
                        <span class="text-white">${agent.tasksCompleted || 0}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-400">Success Rate</span>
                        <span class="text-green-400">${agent.successRate || 0}%</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-400">Current Task</span>
                        <span class="text-blue-400">${agent.currentTask || 'Idle'}</span>
                    </div>
                </div>
                
                <div class="flex space-x-2">
                    <button class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors" onclick="ui.chatWithAgent('${agent.id}')">
                        <i class="fas fa-comments mr-2"></i>Chat
                    </button>
                    <button class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors" onclick="ui.viewAgentDetails('${agent.id}')">
                        <i class="fas fa-info-circle mr-2"></i>Details
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    loadTasksData() {
        this.renderTasks();
    }
    
    renderTasks() {
        const container = document.getElementById('tasks-list');
        const filter = document.getElementById('task-filter').value;
        
        let tasks = Array.from(this.tasks.values());
        
        if (filter !== 'all') {
            tasks = tasks.filter(task => task.status === filter);
        }
        
        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        container.innerHTML = tasks.map(task => `
            <div class="task-item flex items-center justify-between p-4 rounded-lg border border-gray-600 hover:border-gray-500 cursor-pointer" data-task-id="${task.id}">
                <div class="flex items-center flex-1">
                    <div class="status-indicator status-${task.status} mr-4"></div>
                    <div class="flex-1">
                        <h4 class="text-sm font-semibold mb-1">${task.description}</h4>
                        <p class="text-xs text-gray-400">${task.type} • Created ${this.formatDate(task.createdAt)}</p>
                        ${task.assignedAgent ? `<p class="text-xs text-blue-400">Assigned to ${task.assignedAgent}</p>` : ''}
                    </div>
                </div>
                
                <div class="flex items-center space-x-4">
                    <div class="text-right">
                        <div class="text-sm font-semibold capitalize">${task.status}</div>
                        <div class="text-xs text-gray-400">${task.progress || 0}% complete</div>
                    </div>
                    
                    <div class="w-20">
                        <div class="bg-gray-700 rounded-full h-2">
                            <div class="progress-bar h-2 rounded-full" style="width: ${task.progress || 0}%"></div>
                        </div>
                    </div>
                    
                    <div class="flex space-x-2">
                        <button class="text-blue-400 hover:text-blue-300" onclick="ui.viewTaskDetails('${task.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${task.status === 'running' ? `
                            <button class="text-red-400 hover:text-red-300" onclick="ui.cancelTask('${task.id}')">
                                <i class="fas fa-stop"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click listeners
        container.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    const taskId = item.dataset.taskId;
                    this.showTaskDetails(taskId);
                }
            });
        });
    }
    
    loadChatData() {
        this.renderChatAgents();
    }
    
    renderChatAgents() {
        const container = document.getElementById('chat-agents');
        const agents = Array.from(this.agents.values());
        
        container.innerHTML = agents.map(agent => `
            <div class="chat-agent-item flex items-center p-3 rounded-lg hover:bg-gray-700 cursor-pointer" data-agent-id="${agent.id}">
                <div class="agent-avatar mr-3">${agent.role.name.charAt(0)}</div>
                <div class="flex-1">
                    <h4 class="text-sm font-semibold">${agent.role.name}</h4>
                    <p class="text-xs text-gray-400">${agent.status}</p>
                </div>
                <div class="status-indicator status-${agent.status}"></div>
            </div>
        `).join('');
        
        // Add click listeners
        container.querySelectorAll('.chat-agent-item').forEach(item => {
            item.addEventListener('click', () => {
                const agentId = item.dataset.agentId;
                this.selectChatAgent(agentId);
            });
        });
    }
    
    selectChatAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) return;
        
        this.currentChatAgent = agentId;
        
        // Update chat header
        document.getElementById('chat-agent-avatar').textContent = agent.role.name.charAt(0);
        document.getElementById('chat-agent-name').textContent = agent.role.name;
        document.getElementById('chat-agent-status').textContent = agent.status;
        
        // Enable chat input
        document.getElementById('chat-input').disabled = false;
        document.getElementById('send-message').disabled = false;
        
        // Clear messages and load chat history
        this.loadChatHistory(agentId);
        
        // Update selected agent in sidebar
        document.querySelectorAll('.chat-agent-item').forEach(item => {
            item.classList.remove('bg-blue-600');
        });
        document.querySelector(`[data-agent-id="${agentId}"]`).classList.add('bg-blue-600');
    }
    
    loadChatHistory(agentId) {
        const container = document.getElementById('chat-messages');
        const session = this.chatSessions.get(agentId);
        
        if (!session || !session.messages.length) {
            container.innerHTML = `
                <div class="text-center text-gray-400 mt-8">
                    <i class="fas fa-comments text-4xl mb-4"></i>
                    <p>Start a conversation with ${this.agents.get(agentId).role.name}</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = session.messages.map(message => `
            <div class="chat-message mb-4">
                <div class="flex items-start ${message.role === 'user' ? 'justify-end' : 'justify-start'}">
                    <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-white'
                    }">
                        <p class="text-sm">${message.content}</p>
                        <p class="text-xs opacity-70 mt-1">${this.formatTime(message.timestamp)}</p>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }
    
    sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message || !this.currentChatAgent) return;
        
        // Add user message to UI
        this.addChatMessage({
            role: 'user',
            content: message,
            timestamp: new Date()
        });
        
        // Clear input
        input.value = '';
        
        // Send to extension
        this.sendMessage({
            type: 'sendChatMessage',
            data: {
                agentId: this.currentChatAgent,
                message: message
            }
        });
        
        // Show typing indicator
        this.showTypingIndicator();
    }
    
    addChatMessage(message) {
        const container = document.getElementById('chat-messages');
        
        // Initialize session if needed
        if (!this.chatSessions.has(this.currentChatAgent)) {
            this.chatSessions.set(this.currentChatAgent, { messages: [] });
        }
        
        // Add to session
        this.chatSessions.get(this.currentChatAgent).messages.push(message);
        
        // Add to UI
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message mb-4';
        messageElement.innerHTML = `
            <div class="flex items-start ${message.role === 'user' ? 'justify-end' : 'justify-start'}">
                <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-white'
                }">
                    <p class="text-sm">${message.content}</p>
                    <p class="text-xs opacity-70 mt-1">${this.formatTime(message.timestamp)}</p>
                </div>
            </div>
        `;
        
        container.appendChild(messageElement);
        container.scrollTop = container.scrollHeight;
        
        // Animate message
        gsap.fromTo(messageElement, 
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.3 }
        );
    }
    
    showTypingIndicator() {
        const container = document.getElementById('chat-messages');
        const indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.className = 'chat-message mb-4';
        indicator.innerHTML = `
            <div class="flex items-start justify-start">
                <div class="bg-gray-700 px-4 py-2 rounded-lg">
                    <div class="flex space-x-1">
                        <div class="typing-indicator"></div>
                        <div class="typing-indicator"></div>
                        <div class="typing-indicator"></div>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
    }
    
    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    handleChatMessage(data) {
        this.hideTypingIndicator();
        
        this.addChatMessage({
            role: 'assistant',
            content: data.message,
            timestamp: new Date()
        });
    }
    
    loadDeploymentData() {
        this.renderDeploymentTargets();
        this.renderRecentDeployments();
    }
    
    renderDeploymentTargets() {
        const container = document.getElementById('deployment-targets');
        const targets = [
            { id: 'vercel', name: 'Vercel', icon: 'fas fa-bolt', status: 'connected' },
            { id: 'netlify', name: 'Netlify', icon: 'fas fa-globe', status: 'connected' },
            { id: 'docker', name: 'Docker', icon: 'fab fa-docker', status: 'available' }
        ];
        
        container.innerHTML = targets.map(target => `
            <div class="glass-effect rounded-lg p-4 text-center hover:bg-gray-700 cursor-pointer" onclick="ui.deployTo('${target.id}')">
                <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <i class="${target.icon} text-white text-xl"></i>
                </div>
                <h4 class="font-semibold mb-1">${target.name}</h4>
                <p class="text-xs text-gray-400 capitalize">${target.status}</p>
            </div>
        `).join('');
    }
    
    renderRecentDeployments() {
        const container = document.getElementById('recent-deployments');
        const deployments = [
            { id: '1', target: 'Vercel', status: 'success', url: 'https://myapp.vercel.app', timestamp: new Date() },
            { id: '2', target: 'Netlify', status: 'pending', url: null, timestamp: new Date(Date.now() - 300000) },
            { id: '3', target: 'Docker', status: 'success', url: 'localhost:3000', timestamp: new Date(Date.now() - 600000) }
        ];
        
        container.innerHTML = deployments.map(deployment => `
            <div class="flex items-center justify-between p-4 rounded-lg border border-gray-600">
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                        <i class="fas fa-rocket text-white"></i>
                    </div>
                    <div>
                        <h4 class="text-sm font-semibold">${deployment.target} Deployment</h4>
                        <p class="text-xs text-gray-400">${this.formatDate(deployment.timestamp)}</p>
                        ${deployment.url ? `<p class="text-xs text-blue-400">${deployment.url}</p>` : ''}
                    </div>
                </div>
                
                <div class="flex items-center space-x-3">
                    <span class="deployment-status deployment-${deployment.status}">
                        ${deployment.status}
                    </span>
                    ${deployment.url ? `
                        <button class="text-blue-400 hover:text-blue-300" onclick="window.open('${deployment.url}', '_blank')">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
    
    loadAnalyticsData() {
        // This would load and render analytics charts
        console.log('Loading analytics data...');
    }
    
    loadSettingsData() {
        this.renderGeneralSettings();
        this.renderApiSettings();
        this.renderAgentSettings();
    }
    
    renderGeneralSettings() {
        const container = document.getElementById('general-settings');
        container.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="text-sm font-semibold">Auto-save</h4>
                        <p class="text-xs text-gray-400">Automatically save your work</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" class="sr-only peer" checked>
                        <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="text-sm font-semibold">Notifications</h4>
                        <p class="text-xs text-gray-400">Receive task completion notifications</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" class="sr-only peer" checked>
                        <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                
                <div>
                    <label class="block text-sm font-semibold mb-2">Default Model</label>
                    <select class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2">
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="claude-3-opus">Claude 3 Opus</option>
                        <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-semibold mb-2">Max Concurrent Tasks</label>
                    <input type="number" value="5" min="1" max="20" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2">
                </div>
            </div>
        `;
    }
    
    renderApiSettings() {
        const container = document.getElementById('api-settings');
        container.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-2">OpenAI API Key</label>
                    <input type="password" placeholder="sk-..." class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2">
                </div>
                
                <div>
                    <label class="block text-sm font-semibold mb-2">Anthropic API Key</label>
                    <input type="password" placeholder="sk-ant-..." class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2">
                </div>
                
                <div>
                    <label class="block text-sm font-semibold mb-2">Custom API Endpoint</label>
                    <input type="url" placeholder="https://api.example.com" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2">
                </div>
                
                <button class="btn-primary px-4 py-2 rounded-lg">
                    <i class="fas fa-save mr-2"></i>
                    Save API Settings
                </button>
            </div>
        `;
    }
    
    renderAgentSettings() {
        const container = document.getElementById('agent-settings');
        container.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="text-sm font-semibold">Multi-Agent Mode</h4>
                        <p class="text-xs text-gray-400">Enable parallel agent execution</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" class="sr-only peer" checked>
                        <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="text-sm font-semibold">Auto Model Selection</h4>
                        <p class="text-xs text-gray-400">Automatically choose the best model for each task</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" class="sr-only peer">
                        <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                
                <div>
                    <label class="block text-sm font-semibold mb-2">Agent Response Temperature</label>
                    <input type="range" min="0" max="1" step="0.1" value="0.7" class="w-full">
                    <div class="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Conservative</span>
                        <span>Creative</span>
                    </div>
                </div>
                
                <button class="btn-primary px-4 py-2 rounded-lg">
                    <i class="fas fa-save mr-2"></i>
                    Save Agent Settings
                </button>
            </div>
        `;
    }
    
    // Utility methods
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    formatTime(date) {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Modal methods
    showModal(content) {
        document.getElementById('modal-content').innerHTML = content;
        document.getElementById('modal-overlay').classList.remove('hidden');
        
        // Animate modal
        gsap.fromTo('#modal-content', 
            { scale: 0.8, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.3 }
        );
    }
    
    closeModal() {
        gsap.to('#modal-content', {
            scale: 0.8,
            opacity: 0,
            duration: 0.2,
            onComplete: () => {
                document.getElementById('modal-overlay').classList.add('hidden');
            }
        });
    }
    
    showNewTaskModal() {
        const content = `
            <h3 class="text-lg font-semibold mb-4">Create New Task</h3>
            <form id="new-task-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-2">Task Type</label>
                    <select class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2" name="type">
                        <option value="code_generation">Code Generation</option>
                        <option value="code_analysis">Code Analysis</option>
                        <option value="performance_optimization">Performance Optimization</option>
                        <option value="test_generation">Test Generation</option>
                        <option value="documentation_generation">Documentation</option>
                        <option value="code_refactoring">Refactoring</option>
                        <option value="security_audit">Security Audit</option>
                        <option value="deployment">Deployment</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-semibold mb-2">Description</label>
                    <textarea class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 h-24" name="description" placeholder="Describe what you want to accomplish..."></textarea>
                </div>
                
                <div>
                    <label class="block text-sm font-semibold mb-2">Priority</label>
                    <select class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2" name="priority">
                        <option value="low">Low</option>
                        <option value="medium" selected>Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>
                </div>
                
                <div class="flex space-x-3 pt-4">
                    <button type="submit" class="flex-1 btn-primary px-4 py-2 rounded-lg">
                        Create Task
                    </button>
                    <button type="button" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg" onclick="ui.closeModal()">
                        Cancel
                    </button>
                </div>
            </form>
        `;
        
        this.showModal(content);
        
        // Handle form submission
        document.getElementById('new-task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const taskData = {
                type: formData.get('type'),
                description: formData.get('description'),
                priority: formData.get('priority')
            };
            
            this.sendMessage({
                type: 'createTask',
                data: taskData
            });
            
            this.closeModal();
        });
    }
    
    showQuickActionMenu() {
        const content = `
            <h3 class="text-lg font-semibold mb-4">Quick Actions</h3>
            <div class="grid grid-cols-2 gap-3">
                <button class="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-center transition-colors" onclick="ui.quickAction('analyze')">
                    <i class="fas fa-search text-2xl mb-2"></i>
                    <div class="text-sm font-semibold">Analyze Code</div>
                </button>
                
                <button class="p-4 bg-green-600 hover:bg-green-700 rounded-lg text-center transition-colors" onclick="ui.quickAction('optimize')">
                    <i class="fas fa-tachometer-alt text-2xl mb-2"></i>
                    <div class="text-sm font-semibold">Optimize</div>
                </button>
                
                <button class="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-center transition-colors" onclick="ui.quickAction('test')">
                    <i class="fas fa-vial text-2xl mb-2"></i>
                    <div class="text-sm font-semibold">Generate Tests</div>
                </button>
                
                <button class="p-4 bg-orange-600 hover:bg-orange-700 rounded-lg text-center transition-colors" onclick="ui.quickAction('deploy')">
                    <i class="fas fa-rocket text-2xl mb-2"></i>
                    <div class="text-sm font-semibold">Deploy</div>
                </button>
            </div>
            
            <button class="w-full mt-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg" onclick="ui.closeModal()">
                Cancel
            </button>
        `;
        
        this.showModal(content);
    }
    
    quickAction(action) {
        this.sendMessage({
            type: 'quickAction',
            data: { action }
        });
        this.closeModal();
    }
    
    showNotification(data) {
        const notification = document.createElement('div');
        notification.className = `notification glass-effect rounded-lg p-4 mb-4 ${data.type === 'error' ? 'border-red-500' : data.type === 'success' ? 'border-green-500' : 'border-blue-500'} border`;
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <i class="fas fa-${data.type === 'error' ? 'exclamation-triangle' : data.type === 'success' ? 'check-circle' : 'info-circle'} mr-3 text-${data.type === 'error' ? 'red' : data.type === 'success' ? 'green' : 'blue'}-400"></i>
                    <div>
                        <h4 class="font-semibold">${data.title}</h4>
                        <p class="text-sm text-gray-400">${data.message}</p>
                    </div>
                </div>
                <button class="text-gray-400 hover:text-white" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.getElementById('notifications').appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                gsap.to(notification, {
                    opacity: 0,
                    x: 100,
                    duration: 0.3,
                    onComplete: () => notification.remove()
                });
            }
        }, 5000);
    }
    
    showError(error) {
        this.showNotification({
            type: 'error',
            title: 'Error',
            message: error.message || 'An unexpected error occurred'
        });
    }
    
    // Public methods for global access
    chatWithAgent(agentId) {
        this.switchTab('chat');
        setTimeout(() => this.selectChatAgent(agentId), 100);
    }
    
    viewAgentDetails(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) return;
        
        const content = `
            <h3 class="text-lg font-semibold mb-4">${agent.role.name} Details</h3>
            <div class="space-y-4">
                <div>
                    <h4 class="text-sm font-semibold text-gray-300">Description</h4>
                    <p class="text-sm">${agent.role.description}</p>
                </div>
                
                <div>
                    <h4 class="text-sm font-semibold text-gray-300">Capabilities</h4>
                    <div class="flex flex-wrap gap-2 mt-2">
                        ${(agent.role.capabilities || []).map(cap => `
                            <span class="px-2 py-1 bg-blue-600 rounded text-xs">${cap}</span>
                        `).join('')}
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <h4 class="text-sm font-semibold text-gray-300">Status</h4>
                        <p class="text-sm capitalize">${agent.status}</p>
                    </div>
                    <div>
                        <h4 class="text-sm font-semibold text-gray-300">Tasks Completed</h4>
                        <p class="text-sm">${agent.tasksCompleted || 0}</p>
                    </div>
                    <div>
                        <h4 class="text-sm font-semibold text-gray-300">Success Rate</h4>
                        <p class="text-sm">${agent.successRate || 0}%</p>
                    </div>
                    <div>
                        <h4 class="text-sm font-semibold text-gray-300">Current Task</h4>
                        <p class="text-sm">${agent.currentTask || 'Idle'}</p>
                    </div>
                </div>
                
                <button class="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg" onclick="ui.closeModal()">
                    Close
                </button>
            </div>
        `;
        
        this.showModal(content);
    }
    
    showTaskDetails(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) return;
        
        const content = `
            <h3 class="text-lg font-semibold mb-4">Task Details</h3>
            <div class="space-y-4">
                <div>
                    <h4 class="text-sm font-semibold text-gray-300">Description</h4>
                    <p class="text-sm">${task.description}</p>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <h4 class="text-sm font-semibold text-gray-300">Type</h4>
                        <p class="text-sm capitalize">${task.type.replace('_', ' ')}</p>
                    </div>
                    <div>
                        <h4 class="text-sm font-semibold text-gray-300">Status</h4>
                        <p class="text-sm capitalize">${task.status}</p>
                    </div>
                    <div>
                        <h4 class="text-sm font-semibold text-gray-300">Priority</h4>
                        <p class="text-sm capitalize">${task.priority}</p>
                    </div>
                    <div>
                        <h4 class="text-sm font-semibold text-gray-300">Progress</h4>
                        <p class="text-sm">${task.progress || 0}%</p>
                    </div>
                </div>
                
                <div>
                    <h4 class="text-sm font-semibold text-gray-300">Created</h4>
                    <p class="text-sm">${this.formatDate(task.createdAt)}</p>
                </div>
                
                ${task.assignedAgent ? `
                    <div>
                        <h4 class="text-sm font-semibold text-gray-300">Assigned Agent</h4>
                        <p class="text-sm">${task.assignedAgent}</p>
                    </div>
                ` : ''}
                
                ${task.result ? `
                    <div>
                        <h4 class="text-sm font-semibold text-gray-300">Result</h4>
                        <div class="code-block text-xs">${task.result}</div>
                    </div>
                ` : ''}
                
                <div class="flex space-x-3">
                    ${task.status === 'running' ? `
                        <button class="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg" onclick="ui.cancelTask('${taskId}')">
                            Cancel Task
                        </button>
                    ` : ''}
                    <button class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg" onclick="ui.closeModal()">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        this.showModal(content);
    }
    
    cancelTask(taskId) {
        this.sendMessage({
            type: 'cancelTask',
            data: { taskId }
        });
        this.closeModal();
    }
    
    deployTo(target) {
        this.sendMessage({
            type: 'deploy',
            data: { target }
        });
    }
    
    filterTasks(filter) {
        this.renderTasks();
    }
    
    refreshTasks() {
        this.sendMessage({ type: 'getTaskStatus' });
    }
}

// Initialize the UI when the page loads
let ui;
window.addEventListener('DOMContentLoaded', () => {
    ui = new ClineSupremeUI();
    window.ui = ui; // Make it globally accessible
});

// Handle VS Code API
const vscode = acquireVsCodeApi();