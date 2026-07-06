import { Router, type Router as RouterType } from "express";
import * as controller from "../controllers/game.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router: RouterType = Router();

router.get("/search", authMiddleware, controller.search);
router.post("/games", authMiddleware, controller.addGame);
router.get("/games", authMiddleware, controller.listGames);
router.get("/games/ids", authMiddleware, controller.getUserGameIds);
router.patch("/games/:id/status", authMiddleware, controller.updateStatus);
router.patch("/games/:id/hours", authMiddleware, controller.updateHours);
router.patch("/games/:id/notes", authMiddleware, controller.updateNotes);
router.patch("/games/:id/priority", authMiddleware, controller.updatePriority);
router.delete("/games/:id", authMiddleware, controller.deleteGame);
router.get("/dashboard", authMiddleware, controller.dashboard);
router.get("/deals", authMiddleware, controller.getDeals);
router.get("/deals/wishlist", authMiddleware, controller.getWishlistDeals);
router.get("/export", authMiddleware, controller.exportGames);
router.get("/image-proxy", controller.imageProxy);

export default router;
