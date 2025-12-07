// ===================================================================
// AI IDE PRO - MONUMENTAL JAVASCRIPT ENGINE (BAGIAN 1: FONDASI)
// ===================================================================

'use strict';

// --- [SECTION 1: GLOBAL CONSTANTS & CONFIGURATION] ---
// ===================================================================

const CONFIG = {
    API: {
        KEY: "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",
        BASE_URL: 'https://api.groq.com/openai/v1/chat/completions',
        MODEL: 'llama3-70b-8192', // Model yang lebih ringkas untuk editor
        DEFAULT_TEMPERATURE: 0.2,
        DEFAULT_MAX_TOKENS: 1024,
        MAX_RETRIES: 3,
        RETRY_DELAY_BASE: 1000,
    },
    UI: {
        ANIMATION_DURATION: 300,
        TRANSITION_SPEED: '0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
    },
    STORAGE: {
        PROJECTS_KEY: 'ide_pro_projects',
        SETTINGS_KEY: 'ide_pro_settings',
        ACTIVE_PROJECT_KEY: 'ide_pro_active_project',
    },
    FILE_STRUCTURE: {
        ROOT: {
            name: 'website-ai',
            type: 'folder',
            children: [
                { name: 'index.html', type: 'file' },
                { name: 'style.css', type: 'file' },
                { name: 'script.js', type: 'file' },
            ]
        }
    }
};

// --- [SECTION 2: UTILITY FUNCTIONS] ---
// ===================================================================

const Utils = {
    generateId: (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sanitizeHTML: (dirtyString) => {
        const div = document.createElement('div');
        div.textContent = dirtyString;
        return div.innerHTML;
    },
    deepClone: (obj) => {
        if (obj === null || typeof obj !== "object") return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => Utils.deepClone(item));
        if (obj instanceof Object) {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = Utils.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    },
};

// --- [SECTION 3: STATE MANAGEMENT] ---
// ===================================================================

class StateManager {
    constructor() {
        this.state = this.loadInitialState();
        this.subscribers = [];
    }

    loadInitialState() {
        try {
            const savedState = localStorage.getItem(CONFIG.STORAGE.PROJECTS_KEY);
            if (savedState) {
                return JSON.parse(savedState);
            }
        } catch (e) {
            console.error("Failed to load initial state:", e);
        }
        return {
            projects: this.loadProjects(),
            activeProjectId: CONFIG.FILE_STRUCTURE.ROOT.name,
            settings: this.loadSettings(),
            ui: {
                activeView: 'chat', // chat, editor, explorer, settings
                sidebarOpen: false,
            }
        };
    }

    loadProjects() {
        try {
            const projects = localStorage.getItem(CONFIG.STORAGE.PROJECTS_KEY);
            return projects ? JSON.parse(projects) : { [CONFIG.FILE_STRUCTURE.ROOT] };
        } catch (e) {
            console.error("Failed to load projects:", e);
            return { [CONFIG.FILE_STRUCTURE.ROOT] };
        }
    }

    loadSettings() {
        try {
            const settings = localStorage.getItem(CONFIG.STORAGE.SETTINGS_KEY);
            return settings ? JSON.parse(settings) : {
                theme: 'dark',
                fontSize: 'medium',
                model: CONFIG.API.MODEL,
                temperature: CONFIG.API.DEFAULT_TEMPERATURE,
            };
        } catch (e) {
            console.error("Failed to load settings:", e);
            return {};
        }
    }

    persistState() {
        try {
            localStorage.setItem(CONFIG.STORAGE.PROJECTS_KEY, JSON.stringify(this.state));
        } catch (e) {
            console.error("Failed to persist state:", e);
        }
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    dispatch(action) {
        const newState = this.reducer(this.state, action);
        this.state = newState;
        this.subscribers.forEach(callback => callback(newState, action));
        this.persistState();
    }

    reducer(state, action) {
        switch (action.type) {
            case 'SET_ACTIVE_PROJECT':
                return { ...state, activeProjectId: action.payload };
            case 'SET_ACTIVE_VIEW':
                return { ...state, ui: { ...state.ui, activeView: action.payload } };
            case 'TOGGLE_SIDEBAR':
                return { ...state, ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen } };
            case 'UPDATE_SETTINGS':
                return { ...state, settings: { ...state.settings, ...action.payload } };
            case 'ADD_CHAT_MESSAGE':
                const project = state.projects.find(p => p.id === state.activeProjectId);
                if (project) {
                    project.chatHistory = [...(project.chatHistory || []), action.payload];
                }
                return { ...state, projects: [...state.projects] };
            case 'UPDATE_FILE_CONTENT':
                const project = state.projects.find(p => p.id === state.activeProjectId);
                if (project) {
                    const file = project.files.find(f => f.name === action.payload.fileName);
                    if (file) {
                        file.content = action.payload.content;
                    }
                }
                return { ...state, projects: [...state.projects] };
            default:
                return state;
        }
    }

    getState() {
        return this.state;
    }
}

// --- [SECTION 4: API CLIENT (Sederhana untuk Chat) ---
// ===================================================================

class ApiClient {
    constructor(config) {
        this.apiKey = config.KEY;
        this.baseUrl = config.BASE_URL || CONFIG.API.BASE_URL;
        this.model = config.MODEL || CONFIG.API.MODEL;
    }

    async chat(messages) {
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                temperature: CONFIG.API.DEFAULT_TEMPERATURE,
                max_tokens: CONFIG.API.DEFAULT_MAX_TOKENS,
                stream: false, // Sederhana dulu
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }
}

// --- [SECTION 5: UI RENDERER (Dasar) --- ---
// ===================================================================

class UIRenderer {
    constructor() {
        this.stateManager = new StateManager();
        this.apiClient = new ApiClient(CONFIG.API);
        this.cacheElements();
        this.bindEvents();
        this.initializeUI();
    }

    cacheElements() {
        this.elements = {
            // Top Bar
            projectName: document.getElementById('project-name'),
            projectStatus: document.getElementById('project-status'),
            commandPaletteBtn: document.getElementById('command-palette-btn'),
            splitViewBtn: document.getElementById('split-view-btn'),
            themeSelector: document.getElementById('theme-selector'),

            // Sidebar
            sidebar: document.getElementById('sidebar'),
            newProjectBtn: document.getElementById('new-project-btn'),
            settingsToggleBtn: document.getElementById('settings-toggle-btn'),

            // Main Content
            mainContent: document.getElementById('main-content'),
            
            // View Panels
            chatView: document.getElementById('chat-view'),
            editorView: document.getElementById('editor-view'),
            explorerView: document.getElementById('explorer-view'),
            settingsView: document.getElementById('settings-view'),
        };
    }

    bindEvents() {
        // Top Bar Events
        this.elements.commandPaletteBtn.addEventListener('click', () => this.toggleCommandPalette());
        this.elements.splitViewBtn.addEventListener('click', () => this.toggleSplitView());
        this.elements.themeSelector.addEventListener('change', (e) => this.changeTheme(e.target.value));
        
        // Sidebar Events
        this.elements.newProjectBtn.addEventListener('click', () => this.createNewProject());
        this.elements.settingsToggleBtn.addEventListener('click', () => this.toggleSidebar());
        
        // Sidebar Navigation
        const navItems = this.elements.sidebar.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.switchView(view);
            });
        });
    }

    initializeUI() {
        this.stateManager.subscribe((state) => {
            // Update project info
            const activeProject = state.projects.find(p => p.id === state.activeProjectId);
            if (activeProject) {
                this.elements.projectName.textContent = activeProject.name;
            }
            
            // Update view panels
            document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
            document.querySelector(`.view-panel[data-view="${state.ui.activeView}"]`).classList.add('active');
            
            // Update sidebar
            if (state.ui.sidebarOpen) {
                this.elements.sidebar.classList.add('open');
            } else {
                this.elements.sidebar.classList.remove('open');
            }
        });
    }

    switchView(viewName) {
        this.stateManager.dispatch({ type: 'SET_ACTIVE_VIEW', payload: viewName });
    }

    toggleSidebar() {
        this.stateManager.dispatch({ type: 'TOGGLE_SIDEBAR' });
    }

    toggleCommandPalette() {
        alert('Palet Perintah akan datang!');
    }

    toggleSplitView() {
        alert('Tampilan Terpisah akan datang!');
    }

    changeTheme(themeName) {
        document.body.className = `theme-${themeName}`;
        this.stateManager.dispatch({ type: 'UPDATE_SETTINGS', payload: { theme: themeName } });
    }

    createNewProject() {
        const projectName = prompt('Masukkan nama proyek baru:');
        if (projectName) {
            const newProject = {
                id: Utils.generateId('project'),
                name: projectName,
                files: [...CONFIG.FILE_STRUCTURE.ROOT.children],
                chatHistory: [],
            };
            this.stateManager.dispatch({ type: 'SET_ACTIVE_PROJECT', payload: newProject.id });
        }
    }

    renderChatMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(message.sender === 'user' ? 'user-message' : 'ai-message');

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar');
        avatarDiv.innerHTML = message.sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.textContent = message.content;

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        this.elements.chatView.querySelector('.message-container').appendChild(messageDiv);
    }

    async handleChatSubmit() {
        const input = this.elements.chatView.querySelector('#chat-input');
        const message = input.value.trim();
        if (message === '') return;

        this.renderChatMessage({ sender: 'user', content: message });
        input.value = '';

        try {
            const state = this.stateManager.getState();
            const project = state.projects.find(p => p.id === state.activeProjectId);
            const messages = [
                { role: "system", content: "You are an AI assistant helping with a coding project." },
                ...project.chatHistory,
                { role: "user", content: message }
            ];
            const aiResponse = await this.apiClient.chat(messages);
            this.renderChatMessage({ sender: 'ai', content: aiResponse });
            this.stateManager.dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { sender: 'user', content: message } });
        } catch (error) {
            this.renderChatMessage({ sender: 'system', content: `Error: ${error.message}` });
        }
    }
}

// --- [SECTION 6: INITIALIZATION] ---
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    const uiRenderer = new UIRenderer();
    
    // Bind chat send button
    const sendBtn = uiRenderer.elements.chatView.querySelector('#send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => uiRenderer.handleChatSubmit());
    }
    
    console.log("AI IDE Pro initialized.");
});
