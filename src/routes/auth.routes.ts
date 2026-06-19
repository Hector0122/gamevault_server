import { Router, type Router as RouterType } from 'express';
import * as controller from '../controllers/auth.controller.js';

const router: RouterType = Router();

router.post('/auth/register', controller.register);
router.post('/auth/login', controller.login);

export default router;
