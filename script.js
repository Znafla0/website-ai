// --- Elemen-Elemen HTML ---
const messageContainer = document.getElementById('message-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');

// --- API Key & Konfigurasi AI ---
const GROQ_API_KEY = "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";

// --- OTAK AI v3.0 - THE CONNECTED ASSISTANT ---

// 1. Instruksi Awal (System Prompt) yang Jauh Lebih Canggih
const systemPrompt = {
    role: "system",
    content: `Kamu adalah asisten AI yang sangat cerdas, ramah, dan terhubung dengan internet. Nama kamu "Nova".
    - Kamu harus selalu menjawab menggunakan bahasa Indonesia yang informal dan mudah dimengerti.
    - Kamu mengerti singkatan-singkatan bahasa Indonesia umum.
    - Saat menjawab, gunakan **Markdown** untuk memformat teks (gunakan *miring* untuk penekanan, **tebal** untuk judul kecil, dan bullet points untuk daftar).
    - Jika pertanyaan membutuhkan informasi terkini (yang kamu tidak tahu), gunakan fungsi 'searchWeb' untuk mencarinya.
    - Berikan jawaban yang mendalam, terstruktur, dan analitis. Jelaskan alasan di balik jawabanmu jika perlu.`
};

// 2. Memori Percakapan
let conversationHistory = [systemPrompt];

// 3. Definisikan "Alat" (Tools) yang Bisa Digunakan AI
const tools = [
    {
        type: "function",
        function: {
            name: "searchWeb",
            description: "Mencari informasi terkini dari internet. Gunakan ini untuk pertanyaan tentang berita, orang, atau peristiwa terbaru.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Query pencarian yang akan digunakan, misalnya 'berita teknologi hari ini'" }
                },
                required: ["query"]
            }
        }
    }
];

// --- FUNGSI-FUNGSI HELPER (Tidak berubah) ---
function createMessageElement(sender, text) {
    // ... (kode fungsi ini sama seperti sebelumnya) ...
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

function addMessage(sender, text) {
    const messageElement = createMessageElement(sender, text);
    messageContainer.appendChild(messageElement);
    scrollToBottom();
}

function showTypingIndicator() {
    typingIndicator.classList.add('show');
    scrollToBottom();
}

function hideTypingIndicator() {
    typingIndicator.classList.remove('show');
}

function scrollToBottom() {
    messageContainer.parentElement.scrollTop = messageContainer.parentElement.scrollHeight;
}

// --- FUNGSI UTAMA YANG SUDAH SUPER CANGGIH ---

// Fungsi untuk menjalankan "alat" pencarian web (simulasi)
async function executeToolCall(toolCall) {
    if (toolCall.function.name === "searchWeb") {
        const query = JSON.parse(toolCall.function.arguments).query;
        // Di dunia nyata, di sini kita akan memanggil API pencarian yang sesungguhnya.
        // Untuk eksperimen ini, kita akan mengembalikan hasil simulasi.
        console.log(`[SIMULASI] Mencari di web dengan query: ${query}`);
        return `Hasil pencarian simulasi untuk "${query}": Informasi terkini menunjukkan bahwa topik ini sedang trending. Para ahli menyatakan bahwa ini adalah perkembangan yang sangat penting. (Catatan: Ini adalah hasil simulasi).`;
    }
    return "Error: Alat tidak dikenal.";
}

// Fungsi utama untuk berkomunikasi dengan AI
async function getAIResponse(userMessage) {
    conversationHistory.push({ role: "user", content: userMessage });

    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    const requestData = {
        model: "llama-3.1-70b-versatile", // <-- INI ADALAH OTAK BARU YANG LEBIH BESAR!
        messages: conversationHistory,
        tools: tools, // <-- Beri tahu AI bahwa ia punya alat
        tool_choice: "auto" // <-- Biarkan AI memutuskan kapan menggunakan alat
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        const message = data.choices[0].message;

        // AI memutuskan untuk menggunakan alat
        if (message.tool_calls) {
            conversationHistory.push(message); // Simpan permintaan alat ke memori
            const toolResult = await executeToolCall(message.tool_calls[0]);
            
            // Kirim hasil alat kembali ke AI untuk diproses
            conversationHistory.push({ role: "tool", content: toolResult, tool_call_id: message.tool_calls[0].id });
            
            // Lakukan panggilan API kedua untuk mendapatkan jawaban akhir
            const finalResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
                body: JSON.stringify({ model: "llama-3.1-70b-versatile", messages: conversationHistory })
            });
            
            const finalData = await finalResponse.json();
            const finalAnswer = finalData.choices[0].message.content;
            conversationHistory.push({ role: "assistant", content: finalAnswer });
            return finalAnswer;
        } 
        // AI menjawab langsung tanpa alat
        else {
            conversationHistory.push({ role: "assistant", content: message.content });
            return message.content;
        }

    } catch (error) {
        console.error("Error fetching AI response:", error);
        return "Maaf, terjadi kesalahan saat menghubungi AI.";
    }
}

// --- Event Listener (Tidak berubah) ---
async function handleSendMessage() {
    const userQuestion = userInput.value.trim();
    if (userQuestion === "") return;

    addMessage('user', userQuestion);
    userInput.value = '';
    userInput.style.height = 'auto';
    showTypingIndicator();

    const aiResponse = await getAIResponse(userQuestion);

    hideTypingIndicator();
    addMessage('ai', aiResponse);
}

sendBtn.addEventListener('click', handleSendMessage);
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSendMessage(); }
});
userInput.addEventListener('input', () => { userInput.style.height = 'auto'; userInput.style.height = userInput.scrollHeight + 'px'; });
