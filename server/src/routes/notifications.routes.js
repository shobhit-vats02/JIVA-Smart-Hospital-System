import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  list as listNotifications,
  markRead,
  markAllRead,
} from '../controllers/notification.controller.js';

/**
 * Role-agnostic notifications for any authenticated user.
 * Uses req.user.role + req.user.id from `protect`.
 */
const router = Router();
router.use(protect);

router.get('/', listNotifications);
router.post('/:id/read', markRead);
router.post('/read-all', markAllRead);

export default router;
