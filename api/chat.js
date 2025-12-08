// api/chat.js — Vercel Function with detailed diagnostics
export default async function handler(req, res) {
  const ts = () => new Date().toISOString();
  const rid = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  // Basic request context
  console.log(`[${ts()}] [RID:${rid}] Incoming request`, {
    method: req.method,
    url: req.url,
    headers: {
      origin: req.headers?.origin,
      host: req.headers?.host,
      'content-type': req.headers?.['content-type'],
    },
  });

  // CORS preflight
  if (req.method === "OPTIONS") {
    console.log(`[${ts()}] [RID:${rid}] Handling CORS preflight`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    console.warn(`[${ts()}] [RID:${rid}] Method not allowed: ${req.method}`);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Allow CORS for actual request
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Check env
  const hasKey = !!process.env.GROQ_API_KEY;
  console.log(`[${ts()}] [RID:${rid}] Env GROQ_API_KEY: ${hasKey ? "PRESENT" : "MISSING"}`);

  try {
    // Robust body parsing (handles undefined/strings/streams)
    let body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    } catch (e) {
      console.warn(`[${ts()}] [RID:${rid}] Primary JSON parse failed, reading raw stream`, { error: e?.message });
      const raw = await new Promise((resolve) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => resolve(data));
      });
      body = JSON.parse(raw || "{}");
    }

    // Log incoming body (without secrets)
    console.log(`[${ts()}] [RID:${rid}] Incoming body`, {
      model: body?.model,
      temperature: body?.temperature,
      messagesCount: Array.isArray(body?.messages) ? body.messages.length : 0,
      stream: body?.stream,
    });

    // Build payload
    const payload = {
      model: body.model || "llama-3.1-8b-instant",
      temperature: body.temperature ?? 0.7,
      messages: body.messages || [],
      // turn off stream first for easier debugging
      stream: false,
    };

    console.log(`[${ts()}] [RID:${rid}] Outbound payload to Groq`, {
      model: payload.model,
      temperature: payload.temperature,
      messagesCount: payload.messages.length,
      stream: payload.stream,
    });

    if (!hasKey) {
      console.error(`[${ts()}] [RID:${rid}] Missing GROQ_API_KEY — cannot call Groq API`);
      return res.status(500).json({ error: "Server missing GROQ_API_KEY. Set environment variable in Vercel and redeploy." });
    }

    // Call Groq
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log(`[${ts()}] [RID:${rid}] Groq response status`, { status: groqRes.status });

    // Capture non-OK responses with text for clarity
    if (!groqRes.ok) {
      const errorText = await groqRes.text().catch(() => "<failed to read error text>");
      console.error(`[${ts()}] [RID:${rid}] Groq error`, { status: groqRes.status, body: errorText });
      return res.status(500).json({ error: `Groq error ${groqRes.status}: ${errorText}` });
    }

    // Parse JSON from Groq
    const data = await groqRes.json();
    console.log(`[${ts()}] [RID:${rid}] Groq success`, {
      hasChoices: Array.isArray(data?.choices),
      choicesCount: Array.isArray(data?.choices) ? data.choices.length : 0,
      model: data?.model,
    });

    // Return to client
    res.status(200).json(data);
  } catch (err) {
    console.error(`[${ts()}] [RID:${rid}] Handler exception`, { error: err?.message, stack: err?.stack });
    res.status(500).json({ error: err?.message || "Internal Server Error" });
  }
}
