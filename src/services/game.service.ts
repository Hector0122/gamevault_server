import { PrismaClient, type GameStatus } from '@prisma/client';
import { searchGames, getGameById } from './igdb.js';

const prisma = new PrismaClient();

export { prisma };

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

export async function getUserGames(userId: string) {
  return prisma.userGame.findMany({
    where: { userId },
    include: { game: true },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function updateGameStatus(userId: string, gameId: string, status: GameStatus) {
  await prisma.$transaction([
    prisma.userGame.deleteMany({ where: { userId, gameId } }),
    prisma.userGame.create({
      data: {
        userId,
        gameId,
        status,
        startedAt: status === 'PLAYING' ? new Date() : undefined,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
    }),
  ]);
}

export async function updateGameHours(userId: string, gameId: string, hoursPlayed: number) {
  return prisma.userGame.updateMany({
    where: { userId, gameId },
    data: { hoursPlayed },
  });
}

export async function updateGameNotes(userId: string, gameId: string, data: { rating?: number | null; notes?: string | null }) {
  return prisma.userGame.updateMany({
    where: { userId, gameId },
    data,
  });
}

export async function removeGame(userId: string, gameId: string) {
  return prisma.userGame.deleteMany({ where: { userId, gameId } });
}

export async function getDashboard(userId: string) {
  const [total, byStatus] = await Promise.all([
    prisma.userGame.count({ where: { userId } }),
    prisma.userGame.groupBy({
      by: ['status'],
      where: { userId },
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
