import { subscribeUserEvents } from "../events.js";
import { tuser } from "../trpc.js";

// SSE stream of events about the caller (see events.ts).
export const onUserEvents = tuser.subscription(async function* ({ ctx, signal }) {
  yield* subscribeUserEvents(ctx.user.id, signal);
});
