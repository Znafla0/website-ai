export default async function handler(req, res) {
  // Tambahkan CORS header
  res.setHeader("Access-Control-Allow-Origin", "https://website-ai-nine-olive.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;

    const payload = {
      model: body.model || "llama-3.1-8b-instant",
      temperature: body.temperature ?? 0.7,
      messages: body.messages || [],
      stream: true
    };

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

    // Stream response ke client (fallback kalau pipe error)
    res.setHeader("Content-Type", "application/json");
    const data = await groqRes.json();
    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
