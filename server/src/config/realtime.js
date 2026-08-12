/**
 * Realtime bus - a small singleton that services use to emit Socket.IO events.
 * The io instance is registered here once the server boots, so services don't
 * need direct access to Express's app.get('io').
 */
let io = null;

export function registerIO(instance) {
  io = instance;
}

export function getIO() {
  return io;
}

/** Emit an event to a single user's room. */
export function emitToUser(role, id, event, payload) {
  if (!io) return;
  io.to(`${role}:${id}`).emit(event, payload);
}

/** Emit an event to a named room. */
export function emitToRoom(room, event, payload) {
  if (!io) return;
  io.to(room).emit(event, payload);
}

/** Emit to everyone connected to the default namespace. */
export function emitAll(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}
