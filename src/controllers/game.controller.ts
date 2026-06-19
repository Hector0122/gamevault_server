import { type Request, type Response, type NextFunction } from 'express';
import { GameStatus } from '@prisma/client';
import * as gameService from '../services/game.service.js';
import type { AuthRequest } from '../middleware/auth.js';

export async function search(req: AuthRequest, res: Response, next: NextFunction) {
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

export async function addGame(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { externalId } = req.body;
    if (!externalId) {
      res.status(400).json({ error: 'externalId is required' });
      return;
    }
    const game = await gameService.addGameToCollection(externalId);
    res.status(201).json(game);
  } catch (err) {
    next(err);
  }
}

export async function listGames(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const games = await gameService.getUserGames(req.userId!);
    res.json(games);
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const validStatuses: GameStatus[] = ['WISHLIST', 'OWNED', 'PLAYING', 'COMPLETED', 'DROPPED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    await gameService.updateGameStatus(req.userId!, id, status);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function updateNotes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { rating, notes } = req.body;
    await gameService.updateGameNotes(req.userId!, id, { rating, notes });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function deleteGame(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    await gameService.removeGame(req.userId!, id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function updateHours(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { hoursPlayed } = req.body;

    if (typeof hoursPlayed !== 'number' || hoursPlayed < 0) {
      res.status(400).json({ error: 'hoursPlayed must be a non-negative number' });
      return;
    }

    await gameService.updateGameHours(req.userId!, id, hoursPlayed);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function dashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const stats = await gameService.getDashboard(req.userId!);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function getUserGameIds(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ids = await gameService.getUserGameExternalIds(req.userId!);
    res.json({ ids });
  } catch (err) {
    next(err);
  }
}

export async function imageProxy(req: Request, res: Response, next: NextFunction) {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      res.status(400).json({ error: 'url parameter is required' });
      return;
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      res.status(response.status).json({ error: `Failed to fetch image: ${response.statusText}` });
      return;
    }

    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const arr = new Uint8Array(buffer);

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.status(200).send(Buffer.from(arr));
  } catch (err) {
    next(err);
  }
}
