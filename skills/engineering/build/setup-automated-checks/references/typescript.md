# TypeScript: Biome, tsc, Vitest

Stack: **pnpm** (packages), **Biome** (lint and format, one tool and one config), **tsc** with strict flags (types), **Vitest** with coverage (tests). Playwright for end-to-end tests is a separate decision (see `extra-checks.md`).

Run every command from the component directory (`web/` in a monorepo, the root otherwise).

## Install

```bash
pnpm add -D @biomejs/biome typescript vitest @vitest/coverage-v8
# React projects:
pnpm add -D @testing-library/react @testing-library/jest-dom jsdom
# TS-only repos also need the hook tooling (mixed repos use pre-commit instead, see hooks-and-makefile.md):
pnpm add -D husky lint-staged
```

Pin the toolchain in `package.json` so every machine and CI resolve the same versions:

```json
{
  "packageManager": "pnpm@<exact version from `pnpm --version`>",
  "engines": { "node": ">=22" }
}
```

plus a `.node-version` file (read by `actions/setup-node` and by version managers) holding the LTS major the project targets.

## Biome

Generate the config for the installed version, then add the rules:

```bash
pnpm biome init
```

Edit the generated `biome.json` so it contains (keep whatever shape `init` produced for your version; after upgrades run `pnpm biome migrate --write`):

```json
{
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "includes": ["src/**", "e2e/**", "*.ts", "*.json"] },
  "formatter": { "enabled": true, "indentStyle": "space" },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": { "noUnusedImports": "error", "noUnusedVariables": "error" },
      "suspicious": {
        "noExplicitAny": "error",
        "noFocusedTests": "error",
        "noSkippedTests": "warn",
        "noConsole": { "level": "warn", "options": { "allow": ["warn", "error"] } }
      },
      "style": { "useImportType": "error", "noNonNullAssertion": "error" }
    }
  },
  "assist": { "actions": { "source": { "organizeImports": "on" } } }
}
```

`noFocusedTests` and `noSkippedTests` are lie detectors: a `.only` left behind silently shrinks the suite to one test, a `.skip` hides a failure. `useIgnoreFile` keeps `.gitignore` as the single list of generated paths.

Migrating from ESLint + Prettier is deterministic: `pnpm biome migrate eslint --write` and `pnpm biome migrate prettier --write` translate the old configs; remove the old packages in the same PR.

## tsc

In `tsconfig.json` (`tsconfig.app.json` in Vite templates, which split app and node configs):

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true
  }
}
```

`noUncheckedIndexedAccess` is the flag with the best bug-per-complaint ratio (`arr[0]` is `T | undefined`). `exactOptionalPropertyTypes` is stricter still; enable it in new projects, measure it in existing ones.

Type checking is its own script because Vite does not type check during `dev` or `build`: `tsc --noEmit -p tsconfig.json`, or `tsc -b --noEmit` when the project uses project references (Vite templates do).

## Vitest

`vitest.config.ts` (merge into `vite.config.ts` with `defineConfig` from `vitest/config` when the project prefers one file):

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",            // "node" for non-UI packages
    setupFiles: ["./src/test/setup.ts"],   // jest-dom matchers; delete when not React
    passWithNoTests: false,          // an empty suite is a failure, not a pass
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**"],
      exclude: ["src/**/*.d.ts", "src/api/generated/**"],
      // no thresholds: coverage is a report, not a gate
    },
  },
});
```

Vitest already refuses `.only` when `CI` is set (`allowOnly` defaults to `!process.env.CI`); Biome catches it before the commit.

## `package.json` scripts

```json
{
  "scripts": {
    "lint": "biome check .",
    "format": "biome check --write .",
    "typecheck": "tsc -b --noEmit",
    "test": "vitest run --coverage",
    "check": "pnpm lint && pnpm typecheck && pnpm test",
    "prepare": "husky"
  }
}
```

`prepare` only in TS-only repos that use Husky. The Makefile `check` target calls `pnpm check` (or the three scripts), so the Makefile stays the entry point even here.

## Canonical commands

| Purpose | Command |
|---|---|
| lint + format check | `pnpm lint` |
| fix + format (mutates) | `pnpm format` |
| types | `pnpm typecheck` |
| tests + coverage | `pnpm test` |
| lockfile in sync (CI) | `pnpm install --frozen-lockfile` |
| coverage for the CI summary | read `coverage/coverage-summary.json` (see `ci-github-actions.md`) |
