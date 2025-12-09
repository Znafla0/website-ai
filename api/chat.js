// api/chat.js

export default async function handler(req, res) {
  // 1) Daftar domain frontend yang diizinkan (tambahkan kalau perlu)
  const allowedOrigins = [
    "https://website-ai-nine-olive.vercel.app",
    "https://website-ai-git-main-znaflas-projects.vercel.app",
    "https://website-nqeakfr0f-znaflas-projects.vercel.app",
    "https://website-2j8829a0q-znaflas-projects.vercel.app",
    "https://website-2rqtj7dmp-znaflas-projects.vercel.app" // production yang kamu sebut
  ];

  const origin = req.headers.origin || "";

  // 2) Jika ada Origin dan tidak ada di daftar -> tolak
  if (origin && !allowedOrigins.includes(origin)) {
    // Balas singkat supaya browser tahu origin tidak diizinkan
    res.setHeader("Vary", "Origin");
    return res.status(403).json({ error: "Origin not allowed" });
  }

  // 3) Jika origin valid, set header CORS yang diperlukan
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  // Header CORS standar
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400"); // cache preflight 1 hari

  // 4) Tangani preflight (OPTIONS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 5) Hanya izinkan POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 6) Parsing body dengan aman (biar cocok di environment serverless)
    let body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      const raw = await new Promise((resolve) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => resolve(data));
      });
      body = JSON.parse(raw || "{}");
    }

    // 7) Siapkan payload untuk GROQ (sama seperti sebelumnya)
    const payload = {
      model: body.model || "llama-3.1-8b-instant",
      temperature: body.temperature ?? 0.7,
      messages: body.messages || [],
      stream: body.stream ?? false
    };

    // 8) Pastikan API key ada di env Vercel
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY in environment variables" });
    }

    // 9) Panggil GROQ API
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
    return res.status(200).json(data);

  } catch (err) {
    console.error("Handler exception:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}
