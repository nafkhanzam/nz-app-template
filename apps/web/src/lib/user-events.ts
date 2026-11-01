import type { UserEvent } from "../../../server/src/events";
import { trpc } from "./client.svelte";

// Subscribes to the caller's SSE event stream (trpc.onUserEvents).
// Returns an unsubscribe function.
export const onUserEvent = (listener: (event: UserEvent) => void): (() => void) => {
  const sub = trpc.onUserEvents.subscribe(undefined, {
    onData: listener,
    onError: (error) => console.error("SSE error:", error),
  });
  return () => sub.unsubscribe();
};
