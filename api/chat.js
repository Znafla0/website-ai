// api/chat.js — Vercel Function
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse body manual
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const payload = {
      model: body.model || "llama-3.1-8b-instant",
      temperature: body.temperature ?? 0.7,
      messages: body.messages || []
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

    const data = await groqRes.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
