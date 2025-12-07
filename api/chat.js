// api/chat.js — Vercel Function
export default async function handler(req, res) {
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
      return res.status(500).json({ error: `Groq error ${groqRes.status}` });
    }

    // Stream response ke client
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    groqRes.body.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
