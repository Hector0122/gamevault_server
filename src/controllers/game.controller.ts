import { Request, Response, NextFunction } from 'express';
import { GameStatus } from '@prisma/client';
import * as gameService from '../services/game.service.js';

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query.q as string;
    if (!query || query.trim().length === 0) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }
    const games = await gameService.searchExternalGames(query);
    res.json(games);
  } catch (err) {
    next(err);
  }
}

export async function addGame(req: Request, res: Response, next: NextFunction) {
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

export async function listGames(_req: Request, res: Response, next: NextFunction) {
  try {
    const games = await gameService.getUserGames();
    res.json(games);
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const validStatuses: GameStatus[] = ['WISHLIST', 'OWNED', 'PLAYING', 'COMPLETED', 'DROPPED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const userGame = await gameService.updateGameStatus(id, status);
    res.json(userGame);
  } catch (err) {
    next(err);
  }
}

export async function dashboard(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await gameService.getDashboard();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}
