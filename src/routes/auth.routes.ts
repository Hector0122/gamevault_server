import { Router, type Router as RouterType } from 'express';
import * as controller from '../controllers/auth.controller.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { authMiddleware } from '../middleware/auth.js';

const router: RouterType = Router();

router.post('/auth/register', authLimiter, controller.register);
router.post('/auth/login', authLimiter, controller.login);
router.post('/auth/refresh', authLimiter, controller.refresh);
router.post('/auth/logout', authMiddleware, controller.logout);

export default router;
