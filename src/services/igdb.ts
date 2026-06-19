import { IGDBGame } from '../types/index.js';

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

export async function searchGames(query: string, offset = 0): Promise<IGDBGame[]> {
  return igdbFetch<IGDBGame[]>('games', `
    search "${query}";
    fields name,summary,cover.url,first_release_date,platforms.name,genres.name,time_to_beat.*;
    limit 20;
    offset ${offset};
  `);
}

export async function getGameById(id: number): Promise<IGDBGame | null> {
  const games = await igdbFetch<IGDBGame[]>('games', `
    where id = ${id};
    fields name,summary,cover.url,first_release_date,platforms.name,genres.name,time_to_beat.*;
    limit 1;
  `);
  return games[0] ?? null;
}
