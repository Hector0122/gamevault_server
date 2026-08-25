const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";

interface CompletedGame {
  title: string;
  genres: string[];
  rating: number | null;
}

function analyzeGenres(
  games: CompletedGame[]
): { genre: string; score: number }[] {
  const genreScores = new Map<string, number>();
  for (const g of games) {
    const weight = g.rating ? g.rating : 3;
    for (const genre of g.genres) {
      genreScores.set(genre, (genreScores.get(genre) ?? 0) + weight);
    }
  }
  return Array.from(genreScores.entries())
    .map(([genre, score]) => ({ genre, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// Prioriza juegos calificados 4-5★ (señal de gusto fuerte); solo recurre a
// 3★ o a completados sin calificar si no hay suficientes para llenar el
// pool. Antes se mezclaba todo rating>=3 (y los sin calificar) de una vez,
// así que un puñado de 3★ podía diluir la señal de género frente a los
// favoritos reales del usuario.
function pickTopRated(
  games: CompletedGame[],
  limit: number
): CompletedGame[] {
  const byRatingDesc = [...games].sort(
    (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
  );
  const topTier = byRatingDesc.filter((g) => (g.rating ?? 0) >= 4);
  if (topTier.length >= limit) return topTier.slice(0, limit);

  const midTier = byRatingDesc.filter((g) => g.rating === 3);
  const withMidTier = [...topTier, ...midTier];
  if (withMidTier.length >= limit) return withMidTier.slice(0, limit);

  const unrated = byRatingDesc.filter((g) => g.rating == null);
  return [...withMidTier, ...unrated].slice(0, limit);
}

function formatGame(g: CompletedGame): string {
  const parts: string[] = [g.title];
  if (g.genres.length) parts.push(`[${g.genres.join(", ")}]`);
  return parts.join(" ");
}

export async function recommendGames(
  completedGames: CompletedGame[],
  excludeTitles: string[] = [],
  wishlistGenres: string[] = []
): Promise<string[]> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY no configurada");
  }

  const goodGames = pickTopRated(completedGames, 20);

  if (goodGames.length === 0) {
    return [];
  }

  const topGenres = analyzeGenres(goodGames);
  const genreSummary = topGenres
    .map((g) => `${g.genre} (${Math.round(g.score)} pts)`)
    .join(", ");

  // Separado por tier de rating en vez de una sola lista con "★N/5" al
  // final de cada línea — así el modelo pesa más los 5★ como mis
  // favoritos reales en vez de tratar toda la lista por igual.
  const fiveStar = goodGames.filter((g) => g.rating === 5);
  const fourStar = goodGames.filter((g) => g.rating === 4);
  const rest = goodGames.filter((g) => (g.rating ?? 0) < 4);

  const tiersList = [
    fiveStar.length
      ? `MIS FAVORITOS ABSOLUTOS (5★, el gusto más fuerte que tengo):\n${fiveStar.map(formatGame).join("\n")}`
      : null,
    fourStar.length
      ? `TAMBIÉN ME ENCANTARON (4★):\n${fourStar.map(formatGame).join("\n")}`
      : null,
    rest.length
      ? `ME GUSTARON, PERO MENOS (3★ o sin calificar):\n${rest.map(formatGame).join("\n")}`
      : null
  ]
    .filter(Boolean)
    .join("\n\n");

  // Cap defensivo: con bibliotecas grandes, mandar cada título eleva mucho
  // el tamaño del prompt (y Groq cuenta max_tokens completo, no el uso
  // real, contra el límite de tokens/minuto de la cuenta). 300 ya cubre
  // holgadamente una biblioteca personal típica sin arriesgar 429s.
  const cappedExcludeTitles = excludeTitles.slice(0, 300);
  const excludeList =
    cappedExcludeTitles.length > 0
      ? `\n\nJUEGOS QUE YA TENGO — tengo ${excludeTitles.length} en total, nunca recomendar ninguno de estos ni sus versiones/ediciones (dado el tamaño de mi colección, es muy probable que ya tenga los títulos más populares, así que prioriza los que NO aparezcan aquí):\n${cappedExcludeTitles.join(", ")}`
      : "";

  const wishlistPart =
    wishlistGenres.length > 0
      ? `\n\nADEMÁS, me interesan especialmente estos géneros (de mi lista de deseos): ${[...new Set(wishlistGenres)].join(", ")}`
      : "";

  const prompt = `Eres un experto en videojuegos. Analiza mis gustos basado en estos juegos que he completado y disfrutado, ordenados de más a menos favorito:

${tiersList}
${excludeList}
${wishlistPart}

MIS GÉNEROS PREFERIDOS (ordenados por importancia): ${genreSummary}

Basado en esto, recomiéndame EXACTAMENTE 12 juegos que:
1. Se parezcan más a mis 5★ que al resto — esos son mi gusto más fuerte, no los traites igual que el resto de la lista
2. Tengan buena crítica (Metacritic 80+ o Very Positive en Steam)
3. Sean de 2015 en adelante (no retro)
4. Prioricen "hidden gems" menos mainstream por sobre juegos muy famosos — dado el tamaño de mi colección lo más probable es que ya tenga los obvios; como máximo 3 de los 12 pueden ser títulos AAA muy conocidos
5. NO sean secuelas de juegos que ya tengo
6. Incluyan variedad: no todos del mismo género
7. Sean juegos que realmente valgan la pena jugar, no relleno

Devuelve SOLO un array JSON de exactamente 12 strings, ordenado del que más creas que me va a gustar al que menos. Ejemplo: ["Game 1", "Game 2", ...]`;

  const controller = new AbortController();
  const groqTimeout = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // "llama-3.3-70b-versatile" fue retirado del catálogo de Groq (la
        // API ya responde 404 "model_not_found" para ese id) — era la causa
        // de que la generación de recomendaciones fallara siempre y cayera
        // al mensaje de error genérico.
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.85,
        // OJO: Groq cuenta max_tokens completo (no el uso real) contra el
        // límite de tokens-por-minuto de la cuenta — con 2048 una sola
        // llamada se comía la mitad del TPM disponible (8000 en el tier
        // gratis) y un segundo intento rápido (ej. "Actualizar" dos veces)
        // tiraba 429. Pero bajarlo a 1024 se quedó corto alguna vez (12
        // títulos + razonamiento se pasaron del budget y el JSON quedó
        // truncado a medias). 1536 es el punto medio: uso real visto ronda
        // 400-500 tokens (~900 de sobra) sin acercarse al límite de TPM.
        max_tokens: 1536,
        // gpt-oss es un modelo "reasoning": por defecto puede gastar el
        // budget de max_tokens entero pensando y dejar `content` vacío
        // (se vio con prompts grandes: 900+ de 1024 tokens en puro
        // razonamiento, respuesta final vacía). "low" alcanza de sobra para
        // esta tarea (elegir 12 títulos) y evita quedarse sin tokens.
        reasoning_effort: "low"
      }),
      signal: controller.signal
    }
  ).finally(() => clearTimeout(groqTimeout));

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? "[]";

  // Extract JSON array from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.warn("No JSON array found in Groq response:", content);
    return [];
  }

  try {
    const titles: string[] = JSON.parse(jsonMatch[0]);
    return titles.slice(0, 12);
  } catch {
    console.warn("Failed to parse Groq response as JSON:", content);
    return [];
  }
}
