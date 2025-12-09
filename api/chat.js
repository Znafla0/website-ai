// api/chat.js

export default async function handler(req, res) {
  // 🟢 Domain yang diizinkan (FRONTEND)
  const allowedOrigins = [
    "https://website-ai-nine-olive.vercel.app",
    "https://website-ai-git-main-znaflas-projects.vercel.app",
    "https://website-nqeakfr0f-znaflas-projects.vercel.app"
  ];

  const origin = req.headers.origin;

  // 🟢 IZINKAN FRONTEND MENGAKSES API
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // Default: tolak domain asing (aman)
    res.setHeader("Access-Control-Allow-Origin", "null");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400"); // cache preflight 1 hari

  // 🟢 Jawab permintaan OPTIONS (WAJIB supaya tidak CORS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 🟢 Hanya izinkan POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 🟢 Parsing body
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

    // 🟢 Buat payload untuk GROQ
    const payload = {
      model: body.model || "llama-3.1-8b-instant",
      temperature: body.temperature ?? 0.7,
      messages: body.messages || [],
      stream: body.stream ?? false
    };

    // 🟢 Pastikan API Key ada
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY in environment variables" });
    }

    // 🟢 Panggil GROQ API
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!groqRes.ok) {
      const text = await groqRes.text();
      return res.status(500).json({ error: `Groq error ${groqRes.status}: ${text}` });
    }

    const data = await groqRes.json();
    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
