// Cloudflare Worker: secure proxy between your site and the Claude API.
// Deploy: `npx wrangler deploy`, then `npx wrangler secret put ANTHROPIC_API_KEY`.
// Route it at yourdomain.com/api/chat (or put its URL in ENDPOINT in the site's script).

const SYSTEM = `You are the PX Bot, the friendly always-on chat assistant on the PX website.
PX is a creator/gaming community. Links: Discord https://discord.gg/SMKqNqSZ2n, Instagram https://www.instagram.com/piyushxlr_2, YouTube https://www.youtube.com/@piyushxlr, GitHub https://github.com/piyush02020202.
You can chat about anything: answer questions, help with ideas, homework, code, games, or just talk. Keep replies short and conversational unless asked for detail. Be kind and honest.`;

const CORS = {
  'Access-Control-Allow-Origin': '*', // restrict to your domain in production
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });
    try {
      const { messages } = await req.json();
      const clean = (Array.isArray(messages) ? messages : [])
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
      if (!clean.length || clean[0].role !== 'user') return json({ error: 'bad request' }, 400);

      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 600, system: SYSTEM, messages: clean }),
      });
      if (!r.ok) return json({ error: 'upstream ' + r.status }, 502);
      const data = await r.json();
      const reply = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
      return json({ reply: reply || 'Sorry, I had no answer for that.' });
    } catch (e) {
      return json({ error: 'server error' }, 500);
    }
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
