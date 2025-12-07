// Dapatkan elemen-elemen HTML yang kita butuhkan
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const responseArea = document.getElementById('response-area');

// --- GANTI INI DENGAN API KEY KAMU ---
const GROQ_API_KEY = "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"; // <--- PASTEKAN API KEY MU DI SINI

// Fungsi untuk mengirim pertanyaan ke API Groq
async function getAIResponse(prompt) {
    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

    const requestData = {
        model: "llama-3.1-8b-instant", // Model AI yang kita pakai, cepat dan gratis
        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
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

// Fungsi untuk menangani klik tombol kirim
sendBtn.addEventListener('click', async () => {
    const userQuestion = userInput.value.trim();

    if (userQuestion === "") {
        alert("Silakan masukkan pertanyaan terlebih dahulu.");
        return;
    }

    // Tampilkan pertanyaan user di area chat
    responseArea.innerHTML += `<p><strong>Kamu:</strong> ${userQuestion}</p>`;
    
    // Kosongkan input
    userInput.value = '';
    
    // Tampilkan indikator "sedang mengetik..."
    responseArea.innerHTML += `<p><strong>AI:</strong> <em>Sedang berpikir...</em></p>`;
    responseArea.scrollTop = responseArea.scrollHeight; // Auto scroll ke bawah

    // Dapatkan jawaban dari AI
    const aiResponse = await getAIResponse(userQuestion);

    // Hapus indikator "sedang mengetik..." dan tampilkan jawaban asli
    // Kita cari elemen terakhir dan ganti isinya
    const lastMessage = responseArea.lastElementChild;
    lastMessage.innerHTML = `<strong>AI:</strong> ${aiResponse}`;
    
    responseArea.scrollTop = responseArea.scrollHeight; // Auto scroll ke bawah lagi
});

// Biarkan user juga bisa tekan Enter untuk mengirim
userInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        sendBtn.click();
    }
});

