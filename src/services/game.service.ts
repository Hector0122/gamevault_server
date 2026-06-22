import { PrismaClient, type GameStatus, type Priority } from '@prisma/client';
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

export async function getUserGames(
  userId: string,
  options?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: GameStatus;
    platform?: string;
    genre?: string;
    sort?: 'recent' | 'title' | 'hours' | 'rating';
  },
) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;
  const skip = (page - 1) * limit;

  const where: any = { userId };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.search) {
    where.game = {
      title: { contains: options.search, mode: 'insensitive' },
    };
  }

  if (options?.platform) {
    where.game = {
      ...(where.game ?? {}),
      platforms: { has: options.platform },
    };
  }

  if (options?.genre) {
    where.game = {
      ...(where.game ?? {}),
      genres: { has: options.genre },
    };
  }

  let orderBy: any = { updatedAt: 'desc' };
  switch (options?.sort) {
    case 'title':
      orderBy = { game: { title: 'asc' } };
      break;
    case 'hours':
      orderBy = { hoursPlayed: 'desc' };
      break;
    case 'rating':
      orderBy = { rating: 'desc' };
      break;
    default:
      orderBy = { updatedAt: 'desc' };
  }

  const [games, total] = await Promise.all([
    prisma.userGame.findMany({
      where,
      include: { game: true },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.userGame.count({ where }),
  ]);

  return { games, total, page, limit };
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

export async function updateGamePriority(userId: string, gameId: string, priority: Priority | null) {
  return prisma.userGame.updateMany({
    where: { userId, gameId },
    data: { priority },
  });
}

export async function getDashboard(userId: string) {
  const [total, byStatus, backlog] = await Promise.all([
    prisma.userGame.count({ where: { userId } }),
    prisma.userGame.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    }),
    prisma.userGame.findMany({
      where: {
        userId,
        status: { in: ['WISHLIST', 'OWNED', 'PLAYING'] },
        game: { timeToBeatNormally: { not: null } },
      },
      select: { game: { select: { timeToBeatNormally: true } } },
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

  const estimatedHoursRemaining = backlog.reduce(
    (sum, ug) => sum + (ug.game.timeToBeatNormally ?? 0),
    0,
  );

  return { total, ...stats, estimatedHoursRemaining: Math.round(estimatedHoursRemaining / 60 * 10) / 10 };
}

export async function exportUserGames(
  userId: string,
  options?: {
    search?: string;
    status?: GameStatus;
    platform?: string;
    genre?: string;
    sort?: 'recent' | 'title' | 'hours' | 'rating';
  },
) {
  const where: any = { userId };

  if (options?.status) where.status = options.status;
  if (options?.search) {
    where.game = { title: { contains: options.search, mode: 'insensitive' } };
  }
  if (options?.platform) {
    where.game = { ...(where.game ?? {}), platforms: { has: options.platform } };
  }
  if (options?.genre) {
    where.game = { ...(where.game ?? {}), genres: { has: options.genre } };
  }

  let orderBy: any = { updatedAt: 'desc' };
  switch (options?.sort) {
    case 'title': orderBy = { game: { title: 'asc' } }; break;
    case 'hours': orderBy = { hoursPlayed: 'desc' }; break;
    case 'rating': orderBy = { rating: 'desc' }; break;
  }

  return prisma.userGame.findMany({
    where,
    include: { game: true },
    orderBy,
  });
}

export async function findGamesByTitles(titles: string[]) {
  if (titles.length === 0) return [];
  const lower = titles.map(t => t.toLowerCase());
  const all = await prisma.game.findMany();
  return all.filter(g => lower.includes(g.title.toLowerCase()));
}

export async function getAllUserGameTitles(userId: string): Promise<string[]> {
  const rows = await prisma.userGame.findMany({
    where: { userId },
    select: { game: { select: { title: true } } },
  });
  return rows.map(r => r.game.title);
}

export async function getCompletedGames(userId: string) {
  return prisma.userGame.findMany({
    where: { userId, status: 'COMPLETED' },
    include: { game: { select: { title: true, genres: true } } },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getWishlistGames(userId: string) {
  return prisma.userGame.findMany({
    where: { userId, status: 'WISHLIST' },
    include: { game: { select: { title: true, coverUrl: true, genres: true } } },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getUserGameExternalIds(userId: string) {
  const rows = await prisma.userGame.findMany({
    where: { userId },
    select: { game: { select: { externalId: true } } },
  });
  return rows.map((r) => r.game.externalId);
}
