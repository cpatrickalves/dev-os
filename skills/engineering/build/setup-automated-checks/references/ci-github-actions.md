# CI: GitHub Actions

One workflow, `.github/workflows/ci.yml`, with one job per component plus `infra`. Every job runs on every PR and every push to the default branch, with no `paths` filter: a filtered job that never runs cannot satisfy branch protection, and the jobs are cheap.

## Pin versions first

Every `uses:` carries an exact tag, resolved now instead of remembered:

```bash
for r in actions/checkout actions/setup-node pnpm/action-setup astral-sh/setup-uv; do
  printf '%s@%s\n' "$r" "$(gh api "repos/$r/releases/latest" --jq .tag_name)"
done
```

Pin the Docker images in `lint-infra` and the Postgres service the same way (`postgres:<major.minor>`, matching production). Pin to the commit SHA instead of the tag when the project wants supply-chain hardening; Dependabot's `github-actions` ecosystem keeps either style current.

## Skeleton

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

# Cancel superseded runs on PRs only. Cancelling on main could stop a deploy halfway.
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

# Without an explicit shell, `run:` uses `bash -e` without pipefail: `cmd | tee log` hides cmd's failure.
defaults:
  run:
    shell: bash

permissions:
  contents: read

jobs:
  api:
    runs-on: ubuntu-latest
    defaults:
      run:
        shell: bash            # a job-level defaults.run REPLACES the workflow's; repeat the shell
        working-directory: api
    services:                   # only when tests need the database
      postgres:
        image: postgres:<major.minor>
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: app
          POSTGRES_DB: app_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgresql+psycopg://app:app@localhost:5432/app_test
    steps:
      - uses: actions/checkout@<pinned>
      - uses: astral-sh/setup-uv@<pinned>
        with:
          enable-cache: true
      - run: uv sync --locked
      - run: uv run ruff check . && uv run ruff format --check .
      - run: uv run mypy .
      - run: uv run pytest --cov --cov-report=term-missing
      - name: Coverage summary
        if: always()
        run: uv run coverage report --format=markdown >> "$GITHUB_STEP_SUMMARY"

  web:
    runs-on: ubuntu-latest
    defaults:
      run:
        shell: bash
        working-directory: web
    steps:
      - uses: actions/checkout@<pinned>
      - uses: pnpm/action-setup@<pinned>        # reads packageManager from package.json
      - uses: actions/setup-node@<pinned>
        with:
          node-version-file: web/.node-version
          cache: pnpm
          cache-dependency-path: web/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - name: Coverage summary
        if: always()
        run: |
          node -e '
            const s = require("./coverage/coverage-summary.json").total;
            const row = k => `| ${k} | ${s[k].pct}% |`;
            console.log("| Metric | Covered |\n|---|---|\n" + ["lines","branches","functions","statements"].map(row).join("\n"));
          ' >> "$GITHUB_STEP_SUMMARY"

  infra:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<pinned>
      - run: docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:<pinned> -color
      - run: shellcheck $(git ls-files '*.sh')      # shellcheck is preinstalled on ubuntu runners
```

When the Makefile runs the tools natively, the `run:` lines collapse to `make lint`, `make typecheck`, `make test` (with `working-directory` removed): one definition of each command, and what passes locally passes in CI. When the Makefile wraps everything in Docker Compose, CI runs the native commands above and the Makefile's comments say so.

## Coverage is reported, never a gate

The summary lands in the job's page for the reviewer to read. A percentage threshold invites tests that exist only to raise the number, which is the tautological test the whole setup is trying to prevent.

## After the first green run

- Branch protection on `main` requiring the `api`, `web` and `infra` checks. The checks only appear for selection after they have run once. Private repositories need a paid GitHub plan for branch protection and rulesets; without one, the rule lives in the team's discipline and the hooks matter more.
- Validate every later edit of the workflow with `make lint-infra` (actionlint reads the `run:` blocks with shellcheck too).

## Other hosts

GitLab: the same jobs in `.gitlab-ci.yml` with `rules: [if: $CI_PIPELINE_SOURCE == "merge_request_event" || $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH]`, `services: [postgres:<version>]`, and `coverage:` regexes instead of the step summary. Say in the report which parts you could not validate without a runner.
