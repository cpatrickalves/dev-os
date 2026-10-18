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
        "noSkippedTests": "error",
        "noConsole": { "level": "error", "options": { "allow": ["warn", "error"] } }
      },
      "style": { "useImportType": "error", "noNonNullAssertion": "error" }
    }
  },
  "overrides": [
    {
      "includes": ["**/*.test.ts", "**/*.test.tsx", "src/test/**"],
      "linter": { "rules": { "suspicious": { "noExplicitAny": "warn" } } }
    }
  ],
  "assist": { "actions": { "source": { "organizeImports": "on" } } }
}
```

`noFocusedTests` and `noSkippedTests` are lie detectors: a `.only` left behind silently shrinks the suite to one test, a `.skip` hides a failure. `useIgnoreFile` keeps `.gitignore` as the single list of generated paths.

Biome exits 0 on warnings, so a rule that must gate is set to `"error"`; `"warn"` is advice the hook and CI let through. That is why the lie detectors and `noConsole` are errors here, and why `noExplicitAny` is a warning only in tests, where `vi.fn() as any` and loose fixtures are the norm.

`noNonNullAssertion` is an error because `!` is a one-character way around `noUncheckedIndexedAccess` (below): `xs[0]!` turns the `T | undefined` that tsc just found back into `T`. Narrow instead (`if (!x) throw …`, `?? fallback` when a fallback is correct). The stock Vite `main.tsx` trips it once; replace the assertion with a guard:

```ts
const root = document.getElementById("root");
if (!root) throw new Error("#root not found");
createRoot(root).render(<App />);
```

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
    "skipLibCheck": true
  }
}
```

`noUncheckedIndexedAccess` is the flag with the best bug-per-complaint ratio (`arr[0]` is `T | undefined`). `verbatimModuleSyntax` already implies `isolatedModules`, so the latter is not listed. `exactOptionalPropertyTypes` is left out: third-party types are not written for it, so `<Comp title={maybeTitle} />` with `title?: string` becomes an error and every spread of partial state into optional props needs `| undefined` added by hand. It is in `extra-checks.md` for projects that measure it and find the noise acceptable.

Type checking is its own script because Vite does not type check during `dev` or `build`: `tsc --noEmit -p tsconfig.json`, or `tsc -b --noEmit` when the project uses project references (Vite templates do).

## Vitest

`vitest.config.ts` (merge into `vite.config.ts` with `defineConfig` from `vitest/config` when the project prefers one file):

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",            // "node" for non-UI packages
    setupFiles: ["./src/test/setup.ts"],   // jest-dom matchers; delete when not React
    passWithNoTests: false,          // Vitest's default, stated so nobody flips it: an empty suite is a failure
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

In a new project `pnpm test` is red until the first test exists. Scaffold one smoke test with the setup (a render of the root component, or one pure function) so `make check` is green from the first commit.

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
