import Notification from '../models/Notification.js';
import { getIO } from '../config/realtime.js';

/**
 * NotificationService - creates notifications and emits them over Socket.IO.
 * Uses the shared realtime bus (registered at boot).
 */
export class NotificationService {
  async push({ role, recipient, type, title, message, data = {} }) {
    const doc = await Notification.create({
      recipientRole: role,
      recipient,
      type,
      title,
      message,
      data,
    });
    const plain = doc.toJSON();
    const io = getIO();
    if (io) {
      io.to(`${role}:${recipient}`).emit('notification:new', plain);
    }
    return plain;
  }

  /** Mark one notification read for a recipient. */
  async markRead(recipientRole, recipientId, notificationId) {
    const n = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientRole, recipient: recipientId },
      { read: true },
      { new: true }
    ).exec();
    return n;
  }

  /** Mark all notifications read for a recipient. */
  async markAllRead(recipientRole, recipientId) {
    await Notification.updateMany(
      { recipientRole, recipient: recipientId, read: false },
      { read: true }
    ).exec();
  }
}

export const notificationService = new NotificationService();
