import { appLog } from "./log.js";

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  appLog.error("Unhandled Rejection", reason, { promise: String(promise) });
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  appLog.error("Uncaught Exception", error);
  // Don't exit the process, just log the error
});

import "./env.js";
