import { EventEmitter, on } from "node:events";

// Push events to a single user (consumed by the onUserEvents subscription).
// In-memory, so single-instance only; clients should still poll as a fallback.
// Extend this union with app-specific events.
export type UserEvent = { type: "invalidate"; scope: string };

const bus = new EventEmitter();
bus.setMaxListeners(0);

export const publishUserEvent = (userId: string, event: UserEvent) => {
  bus.emit(userId, event);
};

export async function* subscribeUserEvents(userId: string, signal: AbortSignal | undefined) {
  for await (const [event] of on(bus, userId, { signal })) {
    yield event as UserEvent;
  }
}
