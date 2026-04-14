import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    server: {
      deps: {
        inline: ["youtube-transcript"],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.d.ts",
        "src/index.ts",
        "src/remote.ts",
        "src/routes/**",
        "src/openapi/**",
        "src/*-types.ts",
        "src/api-routes.ts",
        "src/openapi.ts",
        "src/server.ts",
        "src/tools/skills/index.ts",
        "src/tools/skills/prompts.ts",
        "src/law-api.ts",
        "src/law/index.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 65,
        functions: 90,
        lines: 85,
      },
    },
  },
});
