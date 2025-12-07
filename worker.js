// worker.js — Cloudflare Workers
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const body = await request.json();
      const payload = {
        model: body.model || 'llama-3.1-8b-instant',
        temperature: body.temperature ?? 0.7,
        messages: body.messages || [],
        stream: true
      };

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!groqRes.ok) {
        return new Response(`Groq error ${groqRes.status}`, { status: 500 });
      }

      // Stream raw text chunks to client
      return new Response(groqRes.body, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};
