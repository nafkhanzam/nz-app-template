import { ZenStackMiddleware } from "@zenstackhq/server/express";
import { RPCApiHandler } from "@zenstackhq/server/api";
import { verifyAccessToken } from "./common.js";
import { createContext, getClient } from "./context.js";
import { env, prod } from "./env.js";
import { cors, express, trpcExpress } from "./lib.js";
import { appRouter } from "./router.ts";
import { schema } from "./zenstack/schema";
import console from "console";

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Don't exit the process, just log the error
});

(async () => {
  // express implementation
  const app = express();

  app.use(cors({}));
  app.use(express.json());

  app.use((req, _res, next) => {
    // request logger
    const body = (() => {
      if (req.body) {
        return req.body;
      }
      if (Object.keys(req.query).length > 0) {
        return req.query;
      }
      return "";
    })();
    console.log("⬅️ ", req.method, req.path, JSON.parse(JSON.stringify(body)));

    next();
  });

  app.use(
    "/trpc",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error }) => {
        console.error(error.code, error.name, error.message);
        console.error(error.stack);
      },
    }),
  );
  // Middleware to return 401 if token is present but invalid/expired
  // This allows client-side to trigger token refresh
  app.use("/api/model", (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const user = verifyAccessToken(authHeader);
      if (!user) {
        return res.status(401).json({ error: "Token expired or invalid" });
      }
    }
    next();
  });

  app.use(
    "/api/model",
    ZenStackMiddleware({
      apiHandler: new RPCApiHandler({
        schema,
        log(level, message, error) {
          if (level === "error") {
            console.error(error);
          }
        },
      }),
      // getSessionUser extracts the current session user from the request, its
      // implementation depends on your auth solution
      getClient,
      sendResponse: true,
    }),
  );
  app.get("/", (_req, res) => {
    res.send("hello");
  });
  app.get("/ping", (_req, res) => {
    res.send("pong");
  });
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use((req, res, next) => {
    res.status(404).send({
      error: {
        message: "Not found.",
      },
    });
  });

  // Error handler middleware - must be defined after all routes
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("Uncaught error:", err);

    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || "Internal server error";

    res.status(statusCode).json({
      error: {
        message,
        ...(!prod() && {
          stack: err.stack,
          details: err,
        }),
      },
    });
  });

  app.listen(env.PORT, () => {
    console.log(`Listening on port ${env.PORT}...`);
  });
})();
