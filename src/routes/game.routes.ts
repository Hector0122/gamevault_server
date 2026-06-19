import { Router, type Router as RouterType } from 'express';
import * as controller from '../controllers/game.controller.js';

const router: RouterType = Router();

router.get('/search', controller.search);
router.post('/games', controller.addGame);
router.get('/games', controller.listGames);
router.patch('/games/:id/status', controller.updateStatus);
router.patch('/games/:id/hours', controller.updateHours);
router.delete('/games/:id', controller.deleteGame);
router.get('/dashboard', controller.dashboard);
router.get('/image-proxy', controller.imageProxy);

export default router;
