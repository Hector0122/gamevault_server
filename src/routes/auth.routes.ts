import { Router, type Router as RouterType } from 'express';
import * as controller from '../controllers/auth.controller.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router: RouterType = Router();

router.post('/auth/register', authLimiter, controller.register);
router.post('/auth/login', authLimiter, controller.login);

export default router;
