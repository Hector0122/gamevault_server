const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';

interface CompletedGame {
  title: string;
  genres: string[];
  rating: number | null;
}

export async function recommendGames(completedGames: CompletedGame[], excludeTitles: string[] = []): Promise<string[]> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY no configurada');
  }

  const gamesList = completedGames
    .map(g => `${g.title}${g.genres.length ? ` (${g.genres.join(', ')})` : ''}${g.rating ? ` — rating: ${g.rating}/5` : ''}`)
    .join('\n');

  const excludeList = excludeTitles.length > 0
    ? `\nNO incluyas ninguno de estos juegos que ya tengo en mi biblioteca: ${excludeTitles.join(', ')}.`
    : '';

  const prompt = `Basado en estos juegos que he completado y me gustaron:

${gamesList}
${excludeList}
Recomiéndame 8 juegos que probablemente disfrutaría. Los juegos deben ser conocidos y existir en IGDB. No repitas ninguno de los juegos que ya tengo.
Devuelve SOLO un array JSON de strings con los nombres de los juegos, nada más. Ejemplo: ["Game 1", "Game 2"]`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

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