import Notification from '../models/Notification.js';
import { notificationService } from '../services/notification.service.js';
import { success } from '../utils/response.js';
import { asyncHandler } from '../utils/async.js';

/** List the current user's notifications (newest first), with unread count. */
export const list = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({
    recipientRole: req.user.role,
    recipient: req.user.id,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .exec();
  const unread = await Notification.countDocuments({
    recipientRole: req.user.role,
    recipient: req.user.id,
    read: false,
  });
  return success(res, { notifications, unread }, 'Notifications retrieved');
});

export const markRead = asyncHandler(async (req, res) => {
  const n = await notificationService.markRead(req.user.role, req.user.id, req.params.id);
  return success(res, n, 'Notification marked as read');
});

export const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user.role, req.user.id);
  return success(res, null, 'All notifications marked as read');
});
