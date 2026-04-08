# Layer Dependency Rules

## Layers (top to bottom)

```
1. Entrypoint      index.ts, remote.ts, config.ts
2. Protocol         server.ts → tools/skills/ (12 skills + prompts)
3. HTTP Adapter     api-routes.ts → routes/, openapi.ts → openapi/
4. Data Access      law-api.ts, dart-api.ts, data20-api.ts,
                    unipass-api.ts, exim-api.ts, mafra-api.ts,
                    finlife-api.ts, insurance-api.ts
4b. Shared          shared.ts, http-client.ts, kst-date.ts, tools/skills/_shared.ts
5. Types            law-types.ts, dart-types.ts, data20-types.ts,
                    unipass-types.ts, exim-types.ts, mafra-types.ts,
                    finlife-types.ts, insurance-types.ts
```

## Rules

### R1: Dependencies flow downward only
A file may import from its own layer or any layer below. Never import upward.

```
Allowed:    server.ts → law-api.ts → types.ts
Forbidden:  law-api.ts → server.ts
```

### R2: Entrypoints own bootstrap
Only `index.ts` and `remote.ts` may read environment variables and initialize transports. Lower layers receive configuration as function parameters.

### R3: Types layer has zero runtime dependencies
Type files (`law-types.ts`, `dart-types.ts`, `data20-types.ts`, `unipass-types.ts`, `exim-types.ts`, `mafra-types.ts`, `finlife-types.ts`, `insurance-types.ts`) contain only TypeScript interfaces and type definitions. No functions, no imports from other project files.

### R4: Data Access is transport-agnostic
API client files (`law-api.ts`, `dart-api.ts`, `data20-api.ts`, `unipass-api.ts`, `exim-api.ts`, `mafra-api.ts`, `finlife-api.ts`, `insurance-api.ts`) must not import MCP SDK, Express, or any transport library. They receive API keys as strings and return typed objects.

### R5: Protocol and HTTP Adapter are peers
`server.ts`/`tools/*` (MCP tools) and `api-routes.ts` (REST) both depend on Data Access but must not depend on each other.

```
server.ts ──────────────────┐
tools/skills/ (12 skills) ──┼──→ law-api.ts, dart-api.ts, data20-api.ts,
                            │    unipass-api.ts, exim-api.ts, mafra-api.ts,
                            │    finlife-api.ts, insurance-api.ts → types
api-routes.ts → routes/ ────┘
```

### R6: OpenAPI spec is self-contained
`openapi.ts` generates a static spec object. It must not import from Data Access or Protocol layers.

### R7: Domain-specific files follow naming convention
Each new data domain gets: `{domain}-api.ts` (Data Access), `{domain}-types.ts` (Types). MCP 스킬은 `tools/skills/` 내 의도 기반 파일에 action으로 통합.

## Violation Checklist

When adding new code, verify:
- [ ] No upward imports
- [ ] Environment variables only in entrypoints
- [ ] New 법제처 types go in `types.ts`, other domains in `{domain}-types.ts`
- [ ] New 법제처 API functions go in `law-api.ts`, other domains in `{domain}-api.ts`
- [ ] New MCP actions go in existing `tools/skills/*.ts` or new skill file
- [ ] New REST endpoints go in `routes/{domain}-routes.ts`
- [ ] Shared utilities go in `shared.ts` or `tools/skills/_shared.ts`
