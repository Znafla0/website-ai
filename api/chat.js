export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    let body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      const raw = await new Promise(resolve => {
        let data = "";
        req.on("data", chunk => data += chunk);
        req.on("end", () => resolve(data));
      });
      body = JSON.parse(raw || "{}");
    }

    console.log("Incoming body:", body);

    const payload = {
      model: body.model || "llama-3.1-8b-instant",
      temperature: body.temperature ?? 0.7,
      messages: body.messages || [],
      stream: false
    };

    console.log("Payload to Groq:", payload);

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log("Groq response status:", groqRes.status);

    if (!groqRes.ok) {
      const text = await groqRes.text();
      console.error("Groq error:", text);
      return res.status(500).json({ error: `Groq error ${groqRes.status}: ${text}` });
    }

    const data = await groqRes.json();
    console.log("Groq success:", data);
    res.status(200).json(data);
  } catch (err) {
    console.error("Handler exception:", err);
    res.status(500).json({ error: err.message });
  }
}
