// --- Elemen-Elemen HTML ---
const messageContainer = document.getElementById('message-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');

// --- API Key ---
const GROQ_API_KEY = "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";

// --- Fungsi-Fungsi Helper ---

// Fungsi untuk membuat elemen pesan
function createMessageElement(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(sender === 'user' ? 'user-message' : 'ai-message');

    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.innerHTML = text;

    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);

    return messageDiv;
}

// Fungsi untuk menambahkan pesan ke container
function addMessage(sender, text) {
    const messageElement = createMessageElement(sender, text);
    messageContainer.appendChild(messageElement);
    scrollToBottom();
}

// Fungsi untuk menampilkan/menyembunyikan indikator mengetik
function showTypingIndicator() {
    typingIndicator.classList.add('show');
    scrollToBottom();
}

function hideTypingIndicator() {
    typingIndicator.classList.remove('show');
}

// Fungsi untuk auto-scroll ke bawah
function scrollToBottom() {
    messageContainer.parentElement.scrollTop = messageContainer.parentElement.scrollHeight;
}

// Fungsi untuk mengirim pertanyaan ke API Groq
async function getAIResponse(prompt) {
    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    const requestData = {
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }]
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error("Error fetching AI response:", error);
        return "Maaf, terjadi kesalahan saat menghubungi AI.";
    }
}

// --- Event Listener ---

// Fungsi utama untuk menangani pengiriman pesan
async function handleSendMessage() {
    const userQuestion = userInput.value.trim();

    if (userQuestion === "") return;

    // 1. Tambahkan pesan user
    addMessage('user', userQuestion);
    
    // 2. Kosongkan input dan reset tingginya
    userInput.value = '';
    userInput.style.height = 'auto';

    // 3. Tampilkan indikator mengetik
    showTypingIndicator();

    // 4. Dapatkan jawaban dari AI
    const aiResponse = await getAIResponse(userQuestion);

    // 5. Sembunyikan indikator dan tampilkan jawaban
    hideTypingIndicator();
    addMessage('ai', aiResponse);
}

// Event untuk tombol kirim
sendBtn.addEventListener('click', handleSendMessage);

// Event untuk menekan Enter
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // Mencegah membuat baris baru
        handleSendMessage();
    }
});

// Auto-resize textarea
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto'; // Reset tinggi
    userInput.style.height = userInput.scrollHeight + 'px'; // Set tinggi baru
});
