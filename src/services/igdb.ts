import { IGDBGame, IGDBTimeToBeat } from '../types/index.js';

const IGDB_URL = 'https://api.igdb.com/v4';
let accessToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;

  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('IGDB_CLIENT_ID and IGDB_CLIENT_SECRET must be set');
  }

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: 'POST' }
  );

  if (!res.ok) {
    throw new Error(`Failed to get IGDB token: ${res.statusText}`);
  }

  const data = await res.json();
  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60000;
  return accessToken!;
}

async function igdbFetch<T>(endpoint: string, body: string): Promise<T> {
  const token = await getAccessToken();
  const clientId = process.env.IGDB_CLIENT_ID!;

  const res = await fetch(`${IGDB_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`IGDB API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// category: 0=main_game, 4=standalone_expansion, 8=remake, 9=remaster,
// 10=expanded_game, 11=port. Excluye dlc_addon(1), expansion(2), bundle(3),
// mod(5), episode(6), season(7), fork(12), pack(13), update(14) — sin este
// filtro IGDB mezcla DLCs/expansiones/bundles como resultados propios junto
// al juego base, lo que hacía la búsqueda sentirse "rara" (duplicados y
// entradas irrelevantes por cada título).
const MAIN_GAME_CATEGORIES = '0,4,8,9,10,11';

export async function searchGames(query: string, offset = 0): Promise<IGDBGame[]> {
  const games = await igdbFetch<IGDBGame[]>('games', `
    search "${query}";
    fields name,summary,cover.url,first_release_date,platforms.name,genres.name;
    where category = (${MAIN_GAME_CATEGORIES});
    limit 20;
    offset ${offset};
  `);

  const ids = games.map((g) => g.id);
  if (ids.length === 0) return [];

  const tts = await igdbFetch<IGDBTimeToBeat[]>('game_time_to_beats', `
    fields game_id,hastily,normally,completely;
    where game_id = (${ids.join(',')});
  `);

  const ttbMap = new Map(tts.map((tt) => [tt.game_id, tt]));

  return games.map((game) => ({
    ...game,
    time_to_beat: ttbMap.get(game.id) ?? null,
  }));
}

export async function searchGameByTitle(title: string): Promise<{ coverUrl: string | null; genres: string[] } | null> {
  try {
    const searchTitle = async (q: string) => {
      const games = await igdbFetch<IGDBGame[]>('games', `
        search "${q}";
        fields name,cover.url,genres.name;
        limit 10;
      `);
      return games;
    };

    let games = await searchTitle(title);

    const exact = games.find(g => g.name.toLowerCase() === title.toLowerCase());
    const withCover = games.find(g => g.cover?.url);
    const best = (exact?.cover?.url ? exact : null) ?? withCover ?? exact ?? games[0];

    if (!best) {
      const words = title.split(/\s+/).filter(w => w.length > 2);
      if (words.length > 1) {
        games = await searchTitle(words.slice(0, 3).join(' '));
        const bestAlt = games.find(g => g.name.toLowerCase() === title.toLowerCase())
          ?? games.find(g => g.cover?.url)
          ?? games[0];
        if (bestAlt) {
          return {
            coverUrl: bestAlt.cover?.url
              ? `https:${bestAlt.cover.url.replace('t_thumb', 't_cover_big')}`
              : null,
            genres: bestAlt.genres?.map(g => g.name) ?? [],
          };
        }
      }
      return null;
    }

    return {
      coverUrl: best.cover?.url
        ? `https:${best.cover.url.replace('t_thumb', 't_cover_big')}`
        : null,
      genres: best.genres?.map(g => g.name) ?? [],
    };
  } catch {
    return null;
  }
}

export async function getGameById(id: number): Promise<IGDBGame | null> {
  const [game, ttb] = await Promise.all([
    igdbFetch<IGDBGame[]>('games', `
      where id = ${id};
      fields name,summary,cover.url,first_release_date,platforms.name,genres.name;
      limit 1;
    `),
    igdbFetch<IGDBTimeToBeat[]>('game_time_to_beats', `
      fields game_id,hastily,normally,completely;
      where game_id = ${id};
    `),
  ]);

  if (!game[0]) return null;

  return {
    ...game[0],
    time_to_beat: ttb[0] ?? null,
  };
}
