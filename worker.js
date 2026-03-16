const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const PROMPT_TEMPLATE = (email) =>
  `Sende sofort via Gmail eine professionelle E-Mail auf Deutsch an: ${email}
Betreff: Ihr Pilot-Zugang zu b.signal — München Nord-West
Body (max. 130 Wörter, plain text, kein Markdown):
- Bestätigung der Anfrage
- b.signal scannt Ratsinformationssysteme, Amtsblätter und Lokalmedien, um Planungssignale zu identifizieren bevor sie zur Marktnachricht werden
- Pilotbericht für München Nord-West folgt innerhalb von 24 Stunden
- Limitierung: 10 Partner pro Sektor — garantiert echten Wettbewerbsvorteil
- Ton: Peer-to-Peer zwischen Profis, sachlich, keine Ausrufezeichen
- Unterzeichnet: "Das b.signal Team"
Sende die E-Mail jetzt.`;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname !== '/api/subscribe' || request.method !== 'POST') {
      return new Response('Not Found', { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: 'Invalid JSON' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const email = body.email?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { error: 'Invalid email' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        mcp_servers: [
          {
            type: 'url',
            url: 'https://gmail.mcp.claude.com/mcp',
            name: 'gmail',
          },
        ],
        messages: [
          {
            role: 'user',
            content: PROMPT_TEMPLATE(email),
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const text = await anthropicRes.text();
      return Response.json(
        { error: 'Upstream error', status: anthropicRes.status },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const data = await anthropicRes.json();

    if (!data.content?.length) {
      return Response.json(
        { error: 'Empty response from API' },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    return Response.json(
      { ok: true },
      { status: 200, headers: CORS_HEADERS }
    );
  },
};
