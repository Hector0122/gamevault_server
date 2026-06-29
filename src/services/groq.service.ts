const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';

interface CompletedGame {
  title: string;
  genres: string[];
  rating: number | null;
}

function analyzeGenres(games: CompletedGame[]): { genre: string; score: number }[] {
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

export async function recommendGames(completedGames: CompletedGame[], excludeTitles: string[] = [], wishlistGenres: string[] = []): Promise<string[]> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY no configurada');
  }

  // Filter to only well-rated games (rating >= 3 or no rating)
  const goodGames = completedGames
    .filter(g => g.rating == null || g.rating >= 3)
    .sort((a, b) => {
      // Sort by rating desc, then by title
      const ra = a.rating ?? 3;
      const rb = b.rating ?? 3;
      return rb - ra;
    })
    .slice(0, 20); // Top 20 best-rated games

  if (goodGames.length === 0) {
    return [];
  }

  const topGenres = analyzeGenres(goodGames);
  const genreSummary = topGenres.map(g => `${g.genre} (${Math.round(g.score)} pts)`).join(', ');

  const gamesList = goodGames
    .map(g => {
      const parts: string[] = [g.title];
      if (g.genres.length) parts.push(`[${g.genres.join(', ')}]`);
      if (g.rating) parts.push(`★${g.rating}/5`);
      return parts.join(' ');
    })
    .join('\n');

  const excludeList = excludeTitles.length > 0
    ? `\nJUEGOS QUE YA TENGO (nunca recomendar estos ni sus versiones/ediciones):\n${excludeTitles.slice(0, 50).join(', ')}`
    : '';

  const wishlistPart = wishlistGenres.length > 0
    ? `\n\nADEMÁS, me interesan especialmente estos géneros (de mi lista de deseos): ${[...new Set(wishlistGenres)].join(', ')}`
    : '';

  const prompt = `Eres un experto en videojuegos. Analiza mis gustos basado en estos juegos que he completado y disfrutado:

${gamesList}
${excludeList}
${wishlistPart}

MIS GÉNEROS PREFERIDOS (ordenados por importancia): ${genreSummary}

Basado en esto, recomiéndame EXACTAMENTE 8 juegos que:
1. Sean del mismo estilo/género que mis favoritos pero NO sean los obvios que todo el mundo conoce
2. Tengan buena crítica (Metacritic 80+ o Very Positive en Steam)
3. Sean de 2015 en adelante (no retro)
4. Sean una mezcla: 4 muy conocidos y 4 "hidden gems" menos mainstream pero igual de buenos
5. NO sean secuelas de juegos que ya tengo
6. Incluyan variedad: no todos del mismo género
7. Sean juegos que realmente valgan la pena jugar, no relleno

Devuelve SOLO un array JSON de exactamente 8 strings. Ejemplo: ["Game 1", "Game 2", ...]`;

  const controller = new AbortController();
  const groqTimeout = setTimeout(() => controller.abort(), 15000);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.85,
      max_tokens: 1024,
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(groqTimeout));

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} ${err}`);
  }

  const data = await response.json() as { choices: { message: { content: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? '[]';

  // Extract JSON array from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.warn('No JSON array found in Groq response:', content);
    return [];
  }

  try {
    const titles: string[] = JSON.parse(jsonMatch[0]);
    return titles.slice(0, 10);
  } catch {
    console.warn('Failed to parse Groq response as JSON:', content);
    return [];
  }
}