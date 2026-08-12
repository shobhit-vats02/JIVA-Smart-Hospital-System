import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { aiController } from '../controllers/ai.controller.js';

/**
 * AI engine endpoints. The engine itself has NO user-facing page — it works
 * silently. These admin-only routes expose status/health for operations and
 * allow manual cycle triggers (e.g. via the analytics view).
 */
const router = Router();
router.use(protect, restrictTo('admin'));

router.post('/cycle', aiController.triggerCycle);
router.get('/predictions', aiController.currentPredictions);
router.get('/history', aiController.predictionHistory);
router.get('/recommendations', aiController.recentRecommendations);

export default router;
