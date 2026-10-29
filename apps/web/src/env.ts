import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
  PUBLIC_BACKEND_URL: { public: true, static: true },
  PUBLIC_S3_ENDPOINT: { public: true, static: true },
  PUBLIC_ENABLE_LOGGING: {
    public: true,
    static: true,
    schema: (value) => value?.toLowerCase() === "true",
  },
});
