// Función serverless de Vercel: guarda y lista comentarios en Upstash Redis.
// Variables de entorno (las crea Vercel al conectar Upstash Redis desde Storage/Marketplace):
//   KV_REST_API_URL / KV_REST_API_TOKEN   (o UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)
// Opcional: COMMENTS_ADMIN_KEY -> si existe, para leer los comentarios hay que usar ?key=ESA_CLAVE

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const LIST_KEY = "comentarios";
const MAX_LENGTH = 500;

async function redis(command) {
  const response = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || `Redis ${response.status}`);
  return data.result;
}

module.exports = async (req, res) => {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: "Falta configurar la base de datos (Upstash Redis) en Vercel." });
  }

  try {
    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") body = JSON.parse(body || "{}");
      const text = String((body && body.text) || "").trim();
      if (!text) return res.status(400).json({ error: "El comentario está vacío." });
      if (text.length > MAX_LENGTH) return res.status(400).json({ error: "El comentario es demasiado largo." });

      const comment = {
        text,
        page: String((body && body.page) || "/").slice(0, 200),
        date: new Date().toISOString(),
      };
      await redis(["LPUSH", LIST_KEY, JSON.stringify(comment)]);
      return res.status(201).json({ ok: true, comment });
    }

    if (req.method === "GET") {
      const adminKey = process.env.COMMENTS_ADMIN_KEY;
      if (adminKey && req.query.key !== adminKey) {
        return res.status(401).json({ error: "No autorizado." });
      }
      const items = await redis(["LRANGE", LIST_KEY, "0", "-1"]);
      return res.status(200).json(items.map((item) => JSON.parse(item)));
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método no permitido." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudo guardar el comentario." });
  }
};
