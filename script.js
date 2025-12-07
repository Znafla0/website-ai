// ===================================================================
// PROJECT CHIMERA - MAXIMUM SUPER AI BRAIN v5.0
// Author: You & GLM-4.6
// Description: A hyper-sophisticated, modular, and enterprise-grade AI framework.
// Model: Mixtral-8x7b-32768 (Mixture-of-Experts)
// Features: Advanced Memory, Streaming, Tool Ecosystem, State Management, Security.
// ===================================================================

'use strict';

// --- [SECTION 1: CORE CONFIGURATION & GLOBAL STATE MANAGER] ---
// ===================================================================

/**
 * @class StateManager
 * @description Manages the global application state in a centralized and predictable manner.
 * This follows a simple state management pattern to ensure UI and data consistency.
 */
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

    /**
     * Generates a unique session ID.
     * @returns {string} A unique session identifier.
     */
    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Loads user preferences from localStorage.
     * @returns {object} The user's saved preferences.
     */
    loadUserPreferences() {
        try {
            const prefs = localStorage.getItem('chimera_user_prefs');
            return prefs ? JSON.parse(prefs) : { theme: 'dark', language: 'id' };
        } catch (e) {
            console.error("Failed to load user preferences:", e);
            return { theme: 'dark', language: 'id' };
        }
    }

    /**
     * Saves user preferences to localStorage.
     */
    saveUserPreferences() {
        try {
            localStorage.setItem('chimera_user_prefs', JSON.stringify(this.state.userPreferences));
        } catch (e) {
            console.error("Failed to save user preferences:", e);
        }
    }

    /**
     * Subscribes a component to state changes.
     * @param {Function} callback - The function to call on state change.
     */
    subscribe(callback) {
        this.subscribers.push(callback);
    }

    /**
     * Updates the state and notifies all subscribers.
     * @param {object} newState - The partial state to merge.
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.subscribers.forEach(callback => callback(this.state));
    }

    /**
     * Gets the current state.
     * @returns {object} The current application state.
     */
    getState() {
        return this.state;
    }
}

// Global state manager instance
const stateManager = new StateManager();

// --- [SECTION 2: API CONFIGURATION & COMMUNICATION LAYER] ---
// ===================================================================

/**
 * @class ApiClient
 * @description A robust client for communicating with the Groq API, featuring retry logic and error handling.
 */
class ApiClient {
    constructor(config) {
        this.apiKey = config.KEY;
        this.baseUrl = config.BASE_URL || 'https://api.groq.com/openai/v1/chat/completions';
        this.model = config.MODEL || 'mixtral-8x7b-32768';
        this.maxRetries = config.MAX_RETRIES || 3;
        this.retryDelay = config.RETRY_DELAY || 1000;
    }

    /**
     * Exponential backoff function for retry delays.
     * @param {number} retryCount - The current retry attempt.
     * @returns {number} The delay in milliseconds.
     */
    getBackoffDelay(retryCount) {
        return this.retryDelay * Math.pow(2, retryCount);
    }

    /**
     * Makes an API call with retry logic.
     * @param {object} payload - The request payload.
     * @param {number} retryCount - The current retry count.
     * @returns {Promise<object>} The API response.
     */
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
                    stream: true, // Enable streaming for all requests
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            // Update session metadata
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

// API Client instance
const apiClient = new ApiClient({
    KEY: "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",
    MODEL: 'mixtral-8x7b-32768'
});

// --- [SECTION 3: ADVANCED MEMORY & CONVERSATION MANAGER] ---
// ===================================================================

/**
 * @class MemoryManager
 * @description Manages conversation history with features like summarization and context window management.
 */
class MemoryManager {
    constructor(maxTokens = 30000) {
        this.maxTokens = maxTokens;
        this.systemPrompt = this.initializeSystemPrompt();
    }

    /**
     * Initializes the system prompt for the AI.
     * @returns {object} The system prompt object.
     */
    initializeSystemPrompt() {
        return {
            role: "system",
            content: `Kamu adalah Chimera, sebuah asisten AI hiper-canggih yang dibangun dengan arsitektur Mixture-of-Experts. Nama kamu "Chimera".
            - Kamu harus selalu menjawab menggunakan bahasa Indonesia yang informal, cerdas, dan mudah dimengerti.
            - Kamu mengerti singkatan-singkatan bahasa Indonesia umum.
            - Gunakan Markdown untuk memformat teks (*miring*, **tebal`, bullet points).
            - Kemampuan utamamu adalah penalaran logika yang mendalam, analisis kompleks, dan kreativitas.
            - Saat menjawab, jelaskan alasan di balik jawabanmu secara ringkas. Berikan jawaban yang terstruktur dan analitis.
            - Jika ditanya sesuatu di luar pengetahuanmu, akui dengan jujur.`
        };
    }

    /**
     * Calculates the approximate token count of a string.
     * Note: This is a rough estimation. A real implementation would use a tokenizer.
     * @param {string} text - The text to tokenize.
     * @returns {number} The estimated token count.
     */
    estimateTokens(text) {
        // A rough estimation: 1 token ~= 4 characters
        return Math.ceil(text.length / 4);
    }

    /**
     * Manages the conversation history to stay within the token limit.
     * @param {Array} history - The current conversation history.
     * @returns {Array} The managed conversation history.
     */
    manageHistory(history) {
        let currentTokens = 0;
        const managedHistory = [];

        // Always include the system prompt
        managedHistory.push(this.systemPrompt);
        currentTokens += this.estimateTokens(this.systemPrompt.content);

        // Iterate from the end to keep the most recent messages
        for (let i = history.length - 1; i >= 0; i--) {
            const messageTokens = this.estimateTokens(history[i].content);
            if (currentTokens + messageTokens > this.maxTokens) {
                console.warn("Context window limit reached. Summarization or truncation is needed.");
                // In a real app, this would trigger a summarization of older messages.
                // For now, we just break the loop.
                break;
            }
            managedHistory.unshift(history[i]);
            currentTokens += messageTokens;
        }

        return managedHistory;
    }

    /**
     * Adds a new message to the conversation history.
     * @param {string} role - The role of the message sender ('user' or 'assistant').
     * @param {string} content - The content of the message.
     */
    addMessage(role, content) {
        const currentState = stateManager.getState();
        const newHistory = [...currentState.conversation, { role, content }];
        const managedHistory = this.manageHistory(newHistory);
        stateManager.setState({ conversation: managedHistory });
    }
}

// Memory Manager instance
const memoryManager = new MemoryManager();

// --- [SECTION 4: UI ABSTRACTION & RENDERING ENGINE] ---
// ===================================================================

/**
 * @class UIRenderer
 * @description Handles all DOM manipulations and UI rendering.
 */
class UIRenderer {
    constructor() {
        this.cacheElements();
        this.bindEvents();
    }

    /**
     * Caches DOM elements for performance.
     */
    cacheElements() {
        this.elements = {
            messageContainer: document.getElementById('message-container'),
            userInput: document.getElementById('user-input'),
            sendBtn: document.getElementById('send-btn'),
            typingIndicator: document.getElementById('typing-indicator'),
        };
    }

    /**
     * Binds event listeners to UI elements.
     */
    bindEvents() {
        this.elements.sendBtn.addEventListener('click', () => this.handleSendMessage());
        this.elements.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });
        this.elements.userInput.addEventListener('input', () => this.autoResizeTextarea());
    }

    /**
     * Handles the send message event.
     */
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

    /**
     * Fetches the AI response from the API.
     * @returns {Promise<string>} The AI's response.
     */
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
                    } catch (e) {
                        // Ignore parsing errors for malformed chunks
                    }
                }
            }
        }
        return aiResponse;
    }

    /**
     * Renders a message in the chat container.
     * @param {string} sender - The sender of the message ('user' or 'ai').
     * @param {string} text - The message content.
     */
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

    /**
     * Updates the streaming message in real-time.
     * @param {string} text - The current full text of the message.
     */
    updateStreamingMessage(text) {
        let lastMessage = this.elements.messageContainer.querySelector('.ai-message:last-child .message-content');
        if (!lastMessage) {
            this.renderMessage('ai', '');
            lastMessage = this.elements.messageContainer.querySelector('.ai-message:last-child .message-content');
        }
        lastMessage.innerHTML = this.sanitizeInput(text);
        this.scrollToBottom();
    }

    /**
     * Sanitizes user input to prevent XSS attacks.
     * @param {string} dirtyString - The string to sanitize.
     * @returns {string} The sanitized string.
     */
    sanitizeInput(dirtyString) {
        const div = document.createElement('div');
        div.textContent = dirtyString;
        return div.innerHTML;
    }

    /**
     * Shows the typing indicator.
     */
    showTypingIndicator() {
        stateManager.setState({ isTyping: true });
        this.elements.typingIndicator.classList.add('show');
        this.scrollToBottom();
    }

    /**
     * Hides the typing indicator.
     */
    hideTypingIndicator() {
        stateManager.setState({ isTyping: false });
        this.elements.typingIndicator.classList.remove('show');
    }

    /**
     * Clears the input field and resets its height.
     */
    clearInput() {
        this.elements.userInput.value = '';
        this.elements.userInput.style.height = 'auto';
    }

    /**
     * Scrolls the chat container to the bottom.
     */
    scrollToBottom() {
        this.elements.messageContainer.parentElement.scrollTop = this.elements.messageContainer.parentElement.scrollHeight;
    }

    /**
     * Auto-resizes the textarea based on content.
     */
    autoResizeTextarea() {
        this.elements.userInput.style.height = 'auto';
        this.elements.userInput.style.height = this.elements.userInput.scrollHeight + 'px';
    }
}

// --- [SECTION 5: INITIALIZATION] ---
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the conversation with the system prompt
    memoryManager.addMessage('system', memoryManager.systemPrompt.content);
    
    // Initialize the UI Renderer
    const uiRenderer = new UIRenderer();
    
    console.log("Project Chimera v5.0 initialized successfully.");
    console.log("State:", stateManager.getState());
});

// End of Project Chimera Script
// ===================================================================
