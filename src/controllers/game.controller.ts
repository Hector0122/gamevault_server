import { type Request, type Response, type NextFunction } from "express";
import { GameStatus, type Priority } from "@prisma/client";
import * as gameService from "../services/game.service.js";
import type { AuthRequest } from "../middleware/auth.js";
import { isAllowedImageUrl } from "../utils/url.js";

const MAX_PAGE_LIMIT = 100;

export async function search(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const query = req.query.q as string;
    const offset = parseInt(req.query.offset as string) || 0;
    if (!query || query.trim().length === 0) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }
    const games = await gameService.searchExternalGames(query, offset);
    res.json(games);
  } catch (err) {
    next(err);
  }
}

export async function addGame(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { externalId } = req.body;
    if (!externalId) {
      res.status(400).json({ error: "externalId is required" });
      return;
    }
    const game = await gameService.addGameToCollection(externalId);
    res.status(201).json(game);
  } catch (err) {
    next(err);
  }
}

export async function listGames(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(
      parseInt(req.query.limit as string) || 50,
      MAX_PAGE_LIMIT
    );
    const search = req.query.search as string | undefined;
    const status = req.query.status as GameStatus | undefined;
    const platform = req.query.platform as string | undefined;
    const genre = req.query.genre as string | undefined;
    const sort = req.query.sort as 'recent' | 'title' | 'hours' | 'rating' | undefined;

    const result = await gameService.getUserGames(req.userId!, {
      page,
      limit,
      search,
      status,
      platform,
      genre,
      sort
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const validStatuses: GameStatus[] = [
      "WISHLIST",
      "OWNED",
      "PLAYING",
      "COMPLETED",
      "DROPPED"
    ];
    if (!validStatuses.includes(status)) {
      res
        .status(400)
        .json({
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        });
      return;
    }

    await gameService.updateGameStatus(req.userId!, id, status);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function updateNotes(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const id = req.params.id as string;
    const { rating, notes } = req.body;

    if (
      rating !== undefined &&
      rating !== null &&
      (typeof rating !== "number" ||
        !Number.isInteger(rating) ||
        rating < 0 ||
        rating > 5)
    ) {
      res
        .status(400)
        .json({ error: "rating debe ser un entero entre 0 y 5, o null" });
      return;
    }

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      res.status(400).json({ error: "notes debe ser texto" });
      return;
    }

    await gameService.updateGameNotes(req.userId!, id, { rating, notes });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function deleteGame(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const id = req.params.id as string;
    await gameService.removeGame(req.userId!, id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function updateHours(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const id = req.params.id as string;
    const { hoursPlayed } = req.body;

    if (typeof hoursPlayed !== "number" || hoursPlayed < 0) {
      res
        .status(400)
        .json({ error: "hoursPlayed must be a non-negative number" });
      return;
    }

    await gameService.updateGameHours(req.userId!, id, hoursPlayed);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function updatePriority(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const id = req.params.id as string;
    const { priority } = req.body;
    const validPriorities: (Priority | null)[] = [
      "HIGH",
      "MEDIUM",
      "LOW",
      null
    ];
    if (!validPriorities.includes(priority)) {
      res
        .status(400)
        .json({
          error: "Invalid priority. Must be HIGH, MEDIUM, LOW, or null"
        });
      return;
    }
    await gameService.updateGamePriority(req.userId!, id, priority);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function dashboard(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const stats = await gameService.getDashboard(req.userId!);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function getUserGameIds(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const ids = await gameService.getUserGameExternalIds(req.userId!);
    res.json({ ids });
  } catch (err) {
    next(err);
  }
}

export async function exportGames(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const search = req.query.search as string | undefined;
    const status = req.query.status as GameStatus | undefined;
    const platform = req.query.platform as string | undefined;
    const genre = req.query.genre as string | undefined;
    const sort = req.query.sort as 'recent' | 'title' | 'hours' | 'rating' | undefined;

    const games = await gameService.exportUserGames(req.userId!, {
      search,
      status,
      platform,
      genre,
      sort
    });

    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Biblioteca");

    sheet.columns = [
      { header: "Título", key: "title", width: 40 },
      { header: "Estado", key: "status", width: 14 },
      { header: "Rating", key: "rating", width: 8 },
      { header: "Horas", key: "hours", width: 8 },
      { header: "Notas", key: "notes", width: 30 },
      { header: "Plataformas", key: "platforms", width: 30 },
      { header: "Géneros", key: "genres", width: 30 },
      { header: "Año", key: "year", width: 8 }
    ];

    const statusLabels: Record<string, string> = {
      WISHLIST: "Deseado",
      OWNED: "Comprado",
      PLAYING: "Jugando",
      COMPLETED: "Completado",
      DROPPED: "Abandonado"
    };

    for (const ug of games) {
      sheet.addRow({
        title: ug.game.title,
        status: statusLabels[ug.status] ?? ug.status,
        rating: ug.rating ?? "",
        hours: ug.hoursPlayed ?? "",
        notes: ug.notes ?? "",
        platforms: ug.game.platforms.join(", "),
        genres: ug.game.genres.join(", "),
        year: ug.game.releaseDate
          ? new Date(ug.game.releaseDate).getFullYear()
          : ""
      });
    }

    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `biblioteca_${new Date().toISOString().split("T")[0]}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
}

const RECOMMENDATION_TTL_MS = 86400000;

type RecommendationCacheData = {
  status: "pending" | "ready" | "error";
  recommendations: unknown[];
  message?: string;
};

// El pipeline completo (Groq -> IGDB en tandas con sleeps -> ITAD) puede
// tardar varios segundos y encadena tres APIs externas. Antes se corría
// entero dentro de un solo request HTTP, lo que lo hacía frágil ante
// timeouts del cliente/Railway. Ahora el endpoint responde de inmediato con
// "pending" y el trabajo pesado corre en segundo plano; el cliente hace
// polling hasta que el resultado queda "ready" (o "error").
async function generateRecommendationsInBackground(userId: string) {
  try {
    const completed = await gameService.getCompletedGames(userId);
    const completedGames = completed.map((ug) => ({
      title: ug.game.title,
      genres: ug.game.genres,
      rating: ug.rating
    }));

    const allTitles = await gameService.getAllUserGameTitles(userId);
    const recentTitles = allTitles.slice(-50); // Limit prompt size

    const wishlistGames = await gameService.getWishlistGames(userId);
    const wishlistGenres = [
      ...new Set(wishlistGames.flatMap((ug) => ug.game.genres))
    ];

    const { recommendGames } = await import("../services/groq.service.js");
    let recommendedTitles = await recommendGames(
      completedGames,
      recentTitles,
      wishlistGenres
    );

    const { isSimilarTitle } = await import("../services/deals.service.js");
    recommendedTitles = recommendedTitles.filter(
      (rec) => !allTitles.some((owned) => isSimilarTitle(rec, owned))
    );

    if (recommendedTitles.length === 0) {
      await gameService.prisma.recommendationCache.upsert({
        where: { userId },
        update: {
          data: {
            status: "ready",
            recommendations: [],
            message: "No se pudieron generar recomendaciones nuevas"
          },
          createdAt: new Date()
        },
        create: {
          userId,
          data: {
            status: "ready",
            recommendations: [],
            message: "No se pudieron generar recomendaciones nuevas"
          }
        }
      });
      return;
    }

    const { searchGameByTitle } = await import("../services/igdb.js");
    const coverResults: {
      title: string;
      igdbResult: { coverUrl: string | null; genres: string[] } | null;
    }[] = [];
    for (let i = 0; i < recommendedTitles.length; i += 3) {
      const batch = recommendedTitles.slice(i, i + 3);
      const batchResults = await Promise.all(
        batch.map(async (title) => {
          const igdbResult = await searchGameByTitle(title);
          return { title: title.toLowerCase(), igdbResult };
        })
      );
      coverResults.push(...batchResults);
      if (i + 3 < recommendedTitles.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    const igdbCoverMap = new Map(
      coverResults
        .filter((r) => r.igdbResult)
        .map((r) => [r.title, r.igdbResult!])
    );

    const { checkDeals } = await import("../services/deals.service.js");
    const deals = await checkDeals(recommendedTitles);

    const recommendations = recommendedTitles.map((title) => {
      const key = title.toLowerCase();
      const igdbInfo = igdbCoverMap.get(key);
      const deal = deals.find((d) => d.title.toLowerCase() === key);

      return {
        title,
        inLibrary: false,
        coverUrl: igdbInfo?.coverUrl ?? null,
        genres: igdbInfo?.genres ?? [],
        platforms: [],
        deal: deal?.currentPrice
          ? {
              currentPrice: deal.currentPrice,
              regularPrice: deal.regularPrice,
              discount: deal.discount,
              store: deal.store,
              url: deal.url
            }
          : null
      };
    });

    await gameService.prisma.recommendationCache.upsert({
      where: { userId },
      update: {
        data: { status: "ready", recommendations },
        createdAt: new Date()
      },
      create: { userId, data: { status: "ready", recommendations } }
    });
  } catch (err) {
    console.error("[deals] background generation failed:", err);
    await gameService.prisma.recommendationCache
      .upsert({
        where: { userId },
        update: {
          data: {
            status: "error",
            recommendations: [],
            message: "No se pudieron generar recomendaciones. Intenta de nuevo."
          },
          createdAt: new Date()
        },
        create: {
          userId,
          data: {
            status: "error",
            recommendations: [],
            message: "No se pudieron generar recomendaciones. Intenta de nuevo."
          }
        }
      })
      .catch(() => {});
  }
}

export async function getDeals(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId!;

    const cached = await gameService.prisma.recommendationCache.findUnique({
      where: { userId }
    });
    const isFresh =
      !!cached && Date.now() - cached.createdAt.getTime() < RECOMMENDATION_TTL_MS;

    if (isFresh) {
      const data = cached!.data as RecommendationCacheData;
      if (data.status === "ready" || data.status === "error") {
        res.json(data);
        return;
      }
      if (data.status === "pending") {
        res.status(202).json({ status: "pending", recommendations: [] });
        return;
      }
    }

    const completed = await gameService.getCompletedGames(userId);
    if (completed.length === 0) {
      res.json({
        status: "ready",
        recommendations: [],
        message: "Completa al menos un juego para recibir recomendaciones"
      });
      return;
    }

    // Marca el cache como "pending" antes de responder, así una segunda
    // llamada concurrente (p. ej. el usuario abre la pantalla dos veces)
    // ve el estado pendiente en vez de disparar el pipeline dos veces.
    await gameService.prisma.recommendationCache.upsert({
      where: { userId },
      update: {
        data: { status: "pending", recommendations: [] },
        createdAt: new Date()
      },
      create: { userId, data: { status: "pending", recommendations: [] } }
    });

    res.status(202).json({ status: "pending", recommendations: [] });

    void generateRecommendationsInBackground(userId);
  } catch (err) {
    next(err);
  }
}

export async function getWishlistDeals(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const wishlist = await gameService.getWishlistGames(req.userId!);
    if (wishlist.length === 0) {
      res.json({ deals: [] });
      return;
    }

    const wishlistTitles = wishlist.map((ug) => ug.game.title);
    const { checkDeals } = await import("../services/deals.service.js");
    const deals = await checkDeals(wishlistTitles);

    const enrichedDeals = deals.map((d) => {
      const ug = wishlist.find(
        (w) => w.game.title.toLowerCase() === d.title.toLowerCase()
      );
      return {
        title: d.title,
        coverUrl: ug?.game.coverUrl ?? null,
        genres: ug?.game.genres ?? [],
        currentPrice: d.currentPrice,
        regularPrice: d.regularPrice,
        discount: d.discount,
        store: d.store,
        url: d.url
      };
    });

    res.json({ deals: enrichedDeals });
  } catch (err) {
    next(err);
  }
}

export async function imageProxy(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      res.status(400).json({ error: "url parameter is required" });
      return;
    }

    // Ruta sin autenticación: sin esta validación, cualquiera podría usar el
    // servidor como proxy para hacer requests a cualquier URL (SSRF).
    if (!isAllowedImageUrl(imageUrl)) {
      res.status(400).json({ error: "url no permitida" });
      return;
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      res
        .status(response.status)
        .json({ error: `Failed to fetch image: ${response.statusText}` });
      return;
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = await response.arrayBuffer();
    const arr = new Uint8Array(buffer);

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400");
    res.status(200).send(Buffer.from(arr));
  } catch (err) {
    next(err);
  }
}
