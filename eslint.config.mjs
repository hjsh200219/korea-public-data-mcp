import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    ignores: ["src/**/*.test.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["src/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "off",
    },
  },
  {
    files: ["src/**/*-api.ts", "src/law/**/*.ts"],
    ignores: ["src/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@modelcontextprotocol/sdk", "@modelcontextprotocol/sdk/*"],
              message:
                "Data Access는 MCP SDK를 import 할 수 없습니다 (docs/design-docs/layer-rules.md R4).",
            },
            {
              group: ["express", "express/*"],
              message:
                "Data Access는 Express를 import 할 수 없습니다 (docs/design-docs/layer-rules.md R4).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*-types.ts"],
    ignores: ["src/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["./*", "../*"],
              message:
                "Types 레이어는 프로젝트 내부 상대 import를 두지 않습니다 (layer-rules R3).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/openapi/**/*.ts"],
    ignores: ["src/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|\\/)dart-api\\.js$|(\\/|^)data20-api\\.js$|(\\/|^)unipass-api\\.js$|(\\/|^)exim-api\\.js$|(\\/|^)mafra-api\\.js$|(\\/|^)finlife-api\\.js$|(\\/|^)insurance-api\\.js$|(\\/|^)law-api\\.js$",
              message:
                "OpenAPI 모듈은 Data Access(*-api)를 import 할 수 없습니다 (layer-rules R6).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/tools/**/*.ts"],
    ignores: ["src/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../api-routes.js", "../../openapi.js"],
              message:
                "MCP 스킬은 HTTP Adapter(api-routes, openapi)에 의존할 수 없습니다 (layer-rules R5).",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ["dist/", "node_modules/", "*.mjs", "vitest.config.ts"],
  },
);
