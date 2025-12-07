// ===================================================================
// PROJECT CHIMERA - MAXIMUM SUPER AI BRAIN v5.0
// ===================================================================

'use strict';

// --- [SECTION 1: CORE CONFIGURATION & GLOBAL STATE MANAGER] ---
// ===================================================================

class StateManager {
    constructor() {
        this.state = {
            conversation: [],
            currentPersona: 'nova',
            isTyping: false,
            userPreferences: this.loadUserPreferences(),
            sessionMetadata: {
                sessionId: this.generateSessionId(),
                startTime: new Date().toISOString(),
                totalTokensUsed: 0,
                totalApiCalls: 0,
            }
        };
        this.subscribers = [];
    }

    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9);
    }

    loadUserPreferences() {
        try {
            const prefs = localStorage.getItem('chimera_user_prefs');
            return prefs ? JSON.parse(prefs) : { theme: 'dark', language: 'id' };
        } catch (e) {
            console.error("Failed to load user preferences:", e);
            return { theme: 'dark', language: 'id' };
        }
    }

    saveUserPreferences() {
        try {
            localStorage.setItem('chimera_user_prefs', JSON.stringify(this.state.userPreferences));
        } catch (e) {
            console.error("Failed to save user preferences:", e);
        }
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.subscribers.forEach(callback => callback(this.state));
    }

    getState() {
        return this.state;
    }
}

const stateManager = new StateManager();

// --- [SECTION 2: API CONFIGURATION & COMMUNICATION LAYER] ---
// ===================================================================

class ApiClient {
    constructor(config) {
        this.apiKey = config.KEY;
        this.baseUrl = config.BASE_URL || 'https://api.groq.com/openai/v1/chat/completions';
        this.model = config.MODEL || 'llama-3.1-405b-instruct';
        this.maxRetries = config.MAX_RETRIES || 3;
        this.retryDelay = config.RETRY_DELAY || 1000;
    }

    getBackoffDelay(retryCount) {
        return this.retryDelay * Math.pow(2, retryCount);
    }

    async makeRequest(payload, retryCount = 0) {
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    ...payload,
                    stream: true,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const currentState = stateManager.getState();
            stateManager.setState({
                sessionMetadata: {
                    ...currentState.sessionMetadata,
                    totalApiCalls: currentState.sessionMetadata.totalApiCalls + 1,
                }
            });

            return response;

        } catch (error) {
            console.error(`API request failed (attempt ${retryCount + 1}):`, error);
            if (retryCount < this.maxRetries) {
                const delay = this.getBackoffDelay(retryCount);
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.makeRequest(payload, retryCount + 1);
            } else {
                throw new Error(`API request failed after ${this.maxRetries} retries: ${error.message}`);
            }
        }
    }
}

const apiClient = new ApiClient({
    KEY: "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",
    MODEL: 'mixtral-8x7b-32768'
});

// --- [SECTION 3: ADVANCED MEMORY & CONVERSATION MANAGER] ---
// ===================================================================

class MemoryManager {
    constructor(maxTokens = 30000) {
        this.maxTokens = maxTokens;
        this.systemPrompt = this.initializeSystemPrompt();
    }

    initializeSystemPrompt() {
        return {
            role: "system",
            content: `Kamu adalah Chimera, sebuah asisten AI hiper-canggih yang dibangun dengan arsitektur Mixture-of-Experts. Nama kamu "Chimera".
            - Kamu harus selalu menjawab menggunakan bahasa Indonesia yang informal, cerdas, dan mudah dimengerti.
            - Kamu mengerti singkatan-singkatan bahasa Indonesia umum.
            - Gunakan Markdown untuk memformat teks (*miring*, **tebal**, bullet points).
            - Kemampuan utamamu adalah penalaran logika yang mendalam, analisis kompleks, dan kreativitas.
            - Saat menjawab, jelaskan alasan di balik jawabanmu secara ringkas. Berikan jawaban yang terstruktur dan analitis.
            - Jika ditanya sesuatu di luar pengetahuanmu, akui dengan jujur.`
        };
    }

    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }

    manageHistory(history) {
        let currentTokens = 0;
        const managedHistory = [];

        managedHistory.push(this.systemPrompt);
        currentTokens += this.estimateTokens(this.systemPrompt.content);

        for (let i = history.length - 1; i >= 0; i--) {
            const messageTokens = this.estimateTokens(history[i].content);
            if (currentTokens + messageTokens > this.maxTokens) {
                console.warn("Context window limit reached.");
                break;
            }
            managedHistory.unshift(history[i]);
            currentTokens += messageTokens;
        }

        return managedHistory;
    }

    addMessage(role, content) {
        const currentState = stateManager.getState();
        const newHistory = [...currentState.conversation, { role, content }];
        const managedHistory = this.manageHistory(newHistory);
        stateManager.setState({ conversation: managedHistory });
    }
}

const memoryManager = new MemoryManager();

// --- [SECTION 4: UI ABSTRACTION & RENDERING ENGINE] ---
// ===================================================================

class UIRenderer {
    constructor() {
        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        this.elements = {
            messageContainer: document.getElementById('message-container'),
            userInput: document.getElementById('user-input'),
            sendBtn: document.getElementById('send-btn'),
            typingIndicator: document.getElementById('typing-indicator'),
        };
    }

    bindEvents() {
        this.elements.sendBtn.addEventListener('click', () => this.handleSendMessage());
        
        // --- INI ADALAH BAGIAN YANG MEMPERBAIKI BUG ENTER ---
        this.elements.userInput.addEventListener('keydown', (e) => {
            // Jika yang ditekan adalah 'Enter' dan 'Shift' TIDAK ditekan...
            if (e.key === 'Enter' && !e.shiftKey) {
                // ...maka cegah aksi default (membuat baris baru)
                e.preventDefault();
                // ...dan jalankan fungsi kirim pesan
                this.handleSendMessage();
            }
        });

        this.elements.userInput.addEventListener('input', () => this.autoResizeTextarea());
    }

    async handleSendMessage() {
        const userQuestion = this.elements.userInput.value.trim();
        if (userQuestion === "" || stateManager.getState().isTyping) return;

        memoryManager.addMessage('user', userQuestion);
        this.renderMessage('user', userQuestion);
        this.clearInput();
        this.showTypingIndicator();

        try {
            const aiResponse = await this.getAIResponse();
            this.hideTypingIndicator();
            this.renderMessage('ai', aiResponse);
            memoryManager.addMessage('assistant', aiResponse);
        } catch (error) {
            this.hideTypingIndicator();
            this.renderMessage('ai', `Maaf, terjadi kesalahan: ${error.message}`);
        }
    }

    async getAIResponse() {
        const currentState = stateManager.getState();
        const payload = {
            messages: currentState.conversation,
            temperature: 0.7,
            max_tokens: 1024,
        };

        const response = await apiClient.makeRequest(payload);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    try {
                        const json = JSON.parse(data);
                        const token = json.choices[0]?.delta?.content || '';
                        aiResponse += token;
                        this.updateStreamingMessage(aiResponse);
                    } catch (e) { /* Ignore parsing errors */ }
                }
            }
        }
        return aiResponse;
    }

    renderMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'ai-message');

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar');
        avatarDiv.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.innerHTML = this.sanitizeInput(text);

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        this.elements.messageContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    updateStreamingMessage(text) {
        let lastMessage = this.elements.messageContainer.querySelector('.ai-message:last-child .message-content');
        if (!lastMessage) {
            this.renderMessage('ai', '');
            lastMessage = this.elements.messageContainer.querySelector('.ai-message:last-child .message-content');
        }
        lastMessage.innerHTML = this.sanitizeInput(text);
        this.scrollToBottom();
    }

    sanitizeInput(dirtyString) {
        const div = document.createElement('div');
        div.textContent = dirtyString;
        return div.innerHTML;
    }

    showTypingIndicator() {
        stateManager.setState({ isTyping: true });
        this.elements.typingIndicator.classList.add('show');
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        stateManager.setState({ isTyping: false });
        this.elements.typingIndicator.classList.remove('show');
    }

    clearInput() {
        this.elements.userInput.value = '';
        this.elements.userInput.style.height = 'auto';
    }

    scrollToBottom() {
        this.elements.messageContainer.parentElement.scrollTop = this.elements.messageContainer.parentElement.scrollHeight;
    }

    autoResizeTextarea() {
        this.elements.userInput.style.height = 'auto';
        this.elements.userInput.style.height = this.elements.userInput.scrollHeight + 'px';
    }
}

// --- [SECTION 5: INITIALIZATION] ---
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    memoryManager.addMessage('system', memoryManager.systemPrompt.content);
    const uiRenderer = new UIRenderer();
    
    console.log("Project Chimera v5.0 initialized successfully.");
    console.log("State:", stateManager.getState());
});

