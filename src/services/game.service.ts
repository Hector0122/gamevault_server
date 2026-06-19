import { PrismaClient, GameStatus } from '@prisma/client';
import { searchGames, getGameById } from './igdb.js';

const prisma = new PrismaClient();

export async function searchExternalGames(query: string, offset = 0) {
  return searchGames(query, offset);
}

export async function addGameToCollection(externalId: number) {
  const existing = await prisma.game.findUnique({ where: { externalId } });
  if (existing) {
    return existing;
  }

  const igdbGame = await getGameById(externalId);
  if (!igdbGame) {
    throw new Error(`Game with ID ${externalId} not found on IGDB`);
  }

  const ttb = igdbGame.time_to_beat;

  return prisma.game.create({
    data: {
      externalId: igdbGame.id,
      title: igdbGame.name,
      description: igdbGame.summary ?? '',
      coverUrl: igdbGame.cover?.url
        ? `https:${igdbGame.cover.url.replace('t_thumb', 't_cover_big')}`
        : '',
      releaseDate: igdbGame.first_release_date
        ? new Date(igdbGame.first_release_date * 1000)
        : new Date(0),
      platforms: igdbGame.platforms?.map((p) => p.name) ?? [],
      genres: igdbGame.genres?.map((g) => g.name) ?? [],
      timeToBeatHastly: ttb?.hastily ? Math.round(ttb.hastily / 60) : null,
      timeToBeatNormally: ttb?.normally ? Math.round(ttb.normally / 60) : null,
      timeToBeatCompletely: ttb?.completely ? Math.round(ttb.completely / 60) : null,
    },
  });
}

export async function getUserGames() {
  return prisma.userGame.findMany({
    include: { game: true },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function updateGameStatus(gameId: string, status: GameStatus) {
  return prisma.userGame.upsert({
    where: { gameId_status: { gameId, status } },
    update: { status },
    create: {
      gameId,
      status,
      startedAt: status === 'PLAYING' ? new Date() : undefined,
      completedAt: status === 'COMPLETED' ? new Date() : undefined,
    },
  });
}

export async function updateGameHours(gameId: string, hoursPlayed: number) {
  return prisma.userGame.updateMany({
    where: { gameId },
    data: { hoursPlayed },
  });
}

export async function getDashboard() {
  const [total, byStatus] = await Promise.all([
    prisma.userGame.count(),
    prisma.userGame.groupBy({
      by: ['status'],
      _count: true,
    }),
  ]);

  const stats: Record<string, number> = {
    WISHLIST: 0,
    OWNED: 0,
    PLAYING: 0,
    COMPLETED: 0,
    DROPPED: 0,
  };

  for (const entry of byStatus) {
    stats[entry.status] = entry._count;
  }

  return { total, ...stats };
}
