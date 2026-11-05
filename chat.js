// Vercel serverless function: POST /api/chat
// Needs the ANTHROPIC_API_KEY environment variable set in Vercel.

const SYSTEM = `You are the PX Bot, the friendly always-on chat assistant on the PX website.
PX is a creator/gaming community. Links: Discord https://discord.gg/SMKqNqSZ2n, Instagram https://www.instagram.com/piyushxlr_2, YouTube https://www.youtube.com/@piyushxlr, GitHub https://github.com/piyush02020202.
You can chat about anything: answer questions, help with ideas, homework, code, games, or just talk. Keep replies short and conversational unless asked for detail. Be kind and honest.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const clean = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (!clean.length || clean[0].role !== 'user') return res.status(400).json({ error: 'bad request' });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 600, system: SYSTEM, messages: clean }),
    });
    if (!r.ok) return res.status(502).json({ error: 'upstream ' + r.status });
    const data = await r.json();
    const reply = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    return res.status(200).json({ reply: reply || 'Sorry, I had no answer for that.' });
  } catch (e) {
    return res.status(500).json({ error: 'server error' });
  }
};
