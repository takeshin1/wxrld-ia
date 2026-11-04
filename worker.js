// WXRLD.IA — Cloudflare Worker para ElevenLabs Text-to-Speech
// Configure ELEVENLABS_API_KEY como Secret no Cloudflare. Nunca coloque a chave no GitHub.
const ALLOWED_ORIGIN = "https://takeshin1.github.io";
const VOICE_ID = "4DQIi8DdLBye9y3COV8R";
const MODEL_ID = "eleven_v4";

function cors(origin) {
  const allowed = origin === ALLOWED_ORIGIN || origin === "null";
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = cors(origin);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    if (url.pathname !== "/api/speech") return new Response("Not found", { status: 404, headers });
    if (request.method !== "POST") return Response.json({ error: "Use POST." }, { status: 405, headers });
    if (origin && origin !== ALLOWED_ORIGIN) return Response.json({ error: "Origem não autorizada." }, { status: 403, headers });
    if (!env.ELEVENLABS_API_KEY) return Response.json({ error: "A chave da ElevenLabs ainda não foi configurada no servidor." }, { status: 503, headers });
    let body;
    try { body = await request.json(); } catch { return Response.json({ error: "Corpo JSON inválido." }, { status: 400, headers }); }
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text || text.length > 1800) return Response.json({ error: "Informe um texto de até 1.800 caracteres." }, { status: 400, headers });
    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        language_code: "pt",
        voice_settings: { stability: 0.42, similarity_boost: 0.78, speed: 1.0 }
      })
    });
    if (!upstream.ok) {
      const detail = await upstream.text();
      return Response.json({ error: `ElevenLabs respondeu ${upstream.status}: ${detail.slice(0, 350)}` }, { status: upstream.status, headers });
    }
    return new Response(upstream.body, { status: 200, headers: { ...headers, "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  }
};
