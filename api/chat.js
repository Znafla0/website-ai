// api/chat.js

export default async function handler(req, res) {
  // Set CORS headers untuk semua response
  res.setHeader("Access-Control-Allow-Origin", "*"); // atau ganti "*" dengan domain frontend kamu
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Hanya izinkan POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse body aman
    let body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      const raw = await new Promise(resolve => {
        let data = "";
        req.on("data", chunk => (data += chunk));
        req.on("end", () => resolve(data));
      });
      body = JSON.parse(raw || "{}");
    }

    // Payload ke Groq API
    const payload = {
      model: body.model || "llama-3.1-8b-instant",
      temperature: body.temperature ?? 0.7,
      messages: body.messages || [],
      stream: body.stream ?? false
    };

    // Pastikan API key ada
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY in environment variables" });
    }

    // Panggil Groq API
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    // Kalau error dari Groq
    if (!groqRes.ok) {
      const text = await groqRes.text();
      return res.status(500).json({ error: `Groq error ${groqRes.status}: ${text}` });
    }

    // Ambil hasil JSON
    const data = await groqRes.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
