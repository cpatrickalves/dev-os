#!/usr/bin/env python3
"""
docs_audit.py — Audit documentation completeness against the standard.

Usage:
    python docs_audit.py /path/to/project [--tier essential|standard] [--json]

Scans a project directory and reports which documentation files exist, are missing,
or appear stale. Outputs a human-readable report or JSON.
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Tier definitions: (relative_path, description)
ESSENTIAL = [
    ("README.md", "Project card: what, why, quickstart"),
    ("AGENTS.md", "AI agent context (universal)"),
    ("docs/getting-started.md", "Environment setup + first run"),
    ("docs/architecture.md", "System overview, component map (with inline Key Decisions)"),
]

STANDARD_EXTRA = [
    ("CONTRIBUTING.md", "Dev workflow, code style, PR process"),
    ("docs/guides/deployment.md", "Deploy + operate guide (logs, rollback, escalation)"),
    ("docs/guides/configuration.md", "Configuration guide"),
    ("docs/guides/troubleshooting.md", "Troubleshooting guide"),
    ("docs/reference/api.md", "API contract documentation"),
    ("docs/reference/environment-variables.md", "Environment variable reference"),
    ("docs/adr/template.md", "ADR template (MADR 4.0) for new decisions"),
]

# Alternative locations/names for common files
ALTERNATIVES = {
    "AGENTS.md": ["CLAUDE.md", ".cursor/rules/project.mdc"],
    "CONTRIBUTING.md": ["docs/contributing.md", ".github/CONTRIBUTING.md"],
    "README.md": ["readme.md", "README.rst", "README.txt"],
}

STALE_THRESHOLD_DAYS = 180  # 6 months


def get_tier_files(tier: str) -> list[tuple[str, str]]:
    """Return the list of (path, description) for a given tier."""
    files = list(ESSENTIAL)
    if tier == "standard":
        files.extend(STANDARD_EXTRA)
    return files


def detect_tier(project_path: Path) -> str:
    """Auto-detect the appropriate tier based on project signals."""
    has_contributing = (project_path / "CONTRIBUTING.md").is_file()
    has_ci = any([
        (project_path / ".github" / "workflows").is_dir(),
        (project_path / ".gitlab-ci.yml").is_file(),
        (project_path / "Jenkinsfile").is_file(),
    ])
    has_docker = any([
        (project_path / "Dockerfile").is_file(),
        (project_path / "docker-compose.yml").is_file(),
        (project_path / "docker-compose.yaml").is_file(),
    ])
    has_multiple_deps = False
    pkg_json = project_path / "package.json"
    pyproject = project_path / "pyproject.toml"
    if pkg_json.is_file() or pyproject.is_file():
        # If the project has a package manifest, it's likely team-scale
        has_multiple_deps = True

    if has_contributing or has_ci or has_docker or has_multiple_deps:
        return "standard"
    return "essential"


def check_file(project_path: Path, rel_path: str) -> dict:
    """Check a single file and return its status."""
    full_path = project_path / rel_path
    result = {
        "path": rel_path,
        "exists": False,
        "alternative": None,
        "size_bytes": 0,
        "lines": 0,
        "last_modified": None,
        "stale": False,
        "has_todos": False,
        "todo_count": 0,
        "code_fences": 0,
    }

    # Check primary location
    if full_path.is_file():
        result["exists"] = True
        stat = full_path.stat()
        result["size_bytes"] = stat.st_size
        result["last_modified"] = datetime.fromtimestamp(
            stat.st_mtime, tz=timezone.utc
        ).isoformat()

        # Check staleness
        age_days = (datetime.now(timezone.utc) - datetime.fromtimestamp(
            stat.st_mtime, tz=timezone.utc
        )).days
        result["stale"] = age_days > STALE_THRESHOLD_DAYS

        # Count lines, TODOs, and code fences
        try:
            content = full_path.read_text(encoding="utf-8", errors="replace")
            result["lines"] = len(content.splitlines())
            todos = [
                line for line in content.splitlines()
                if "TODO" in line or "FIXME" in line or "XXX" in line
            ]
            result["has_todos"] = len(todos) > 0
            result["todo_count"] = len(todos)
            # Each fenced code block has 2 backtick markers (open + close).
            # Used to flag AGENTS.md that lists conventions in prose without
            # showing the actual commands an agent should run.
            result["code_fences"] = content.count("```")
        except Exception:
            pass

        return result

    # Check alternative locations
    alts = ALTERNATIVES.get(rel_path, [])
    for alt in alts:
        alt_path = project_path / alt
        if alt_path.is_file():
            result["exists"] = True
            result["alternative"] = alt
            stat = alt_path.stat()
            result["size_bytes"] = stat.st_size
            result["last_modified"] = datetime.fromtimestamp(
                stat.st_mtime, tz=timezone.utc
            ).isoformat()
            try:
                content = alt_path.read_text(encoding="utf-8", errors="replace")
                result["lines"] = len(content.splitlines())
                result["code_fences"] = content.count("```")
            except Exception:
                pass
            return result

    return result


def find_adrs(project_path: Path) -> list[str]:
    """Find existing ADR files."""
    adr_dir = project_path / "docs" / "adr"
    if not adr_dir.is_dir():
        return []
    return sorted([
        f.name for f in adr_dir.iterdir()
        if f.is_file() and f.suffix == ".md" and f.name != "template.md"
    ])


def detect_stack(project_path: Path) -> list[str]:
    """Detect the project's tech stack from config files."""
    stack = []
    indicators = {
        "Python": ["pyproject.toml", "setup.py", "requirements.txt", "Pipfile"],
        "TypeScript": ["tsconfig.json"],
        "JavaScript": ["package.json"],
        "Rust": ["Cargo.toml"],
        "Go": ["go.mod"],
        "Java": ["pom.xml", "build.gradle", "build.gradle.kts"],
        "Docker": ["Dockerfile", "docker-compose.yml", "docker-compose.yaml"],
    }
    for tech, files in indicators.items():
        for f in files:
            if (project_path / f).is_file():
                stack.append(tech)
                break
    return stack


def audit(project_path: Path, tier: str | None = None) -> dict:
    """Run a full documentation audit."""
    if tier is None:
        tier = detect_tier(project_path)

    required_files = get_tier_files(tier)
    results = []
    for rel_path, description in required_files:
        check = check_file(project_path, rel_path)
        check["description"] = description
        check["required_for_tier"] = tier
        results.append(check)

    adrs = find_adrs(project_path)
    stack = detect_stack(project_path)

    existing = sum(1 for r in results if r["exists"])
    missing = sum(1 for r in results if not r["exists"])
    stale = sum(1 for r in results if r["exists"] and r["stale"])
    with_todos = sum(1 for r in results if r["has_todos"])

    total = len(results)
    score = round((existing / total) * 100) if total > 0 else 0

    return {
        "project": str(project_path),
        "tier": tier,
        "stack": stack,
        "score": score,
        "summary": {
            "total_required": total,
            "existing": existing,
            "missing": missing,
            "stale": stale,
            "with_todos": with_todos,
        },
        "adrs_found": adrs,
        "files": results,
    }


def print_report(report: dict) -> None:
    """Print a human-readable audit report."""
    print(f"\n{'=' * 60}")
    print(f"  DOCUMENTATION AUDIT — {report['tier'].upper()} tier")
    print(f"  Project: {report['project']}")
    print(f"  Stack: {', '.join(report['stack']) or 'Unknown'}")
    print(f"{'=' * 60}")

    s = report["summary"]
    bar_len = 30
    filled = round(bar_len * report["score"] / 100)
    bar = "█" * filled + "░" * (bar_len - filled)
    print(f"\n  Score: [{bar}] {report['score']}%")
    print(f"  {s['existing']}/{s['total_required']} files exist"
          f" | {s['stale']} stale | {s['with_todos']} with TODOs")

    # Missing files
    missing = [f for f in report["files"] if not f["exists"]]
    if missing:
        print(f"\n  ❌ MISSING ({len(missing)})")
        for f in missing:
            print(f"     {f['path']}")
            print(f"       → {f['description']}")

    # Stale files
    stale = [f for f in report["files"] if f["exists"] and f["stale"]]
    if stale:
        print(f"\n  ⚠️  STALE ({len(stale)}) — not updated in {STALE_THRESHOLD_DAYS}+ days")
        for f in stale:
            print(f"     {f['path']} ({f['last_modified'][:10]})")

    # Files with TODOs
    todos = [f for f in report["files"] if f["has_todos"]]
    if todos:
        print(f"\n  📝 WITH TODOs ({len(todos)})")
        for f in todos:
            print(f"     {f['path']} ({f['todo_count']} TODO markers)")

    # AGENTS.md content quality: no code blocks usually means no verified commands
    agents = next((f for f in report["files"] if f["path"] == "AGENTS.md"), None)
    if agents and agents["exists"] and agents.get("code_fences", 0) == 0:
        print(f"\n  ⚠️  AGENTS.md has no code blocks — likely missing verified commands.")
        print(f"     A useful AGENTS.md lists the actual `dev`, `test`, `lint`, `build` commands.")

    # Existing files
    existing = [f for f in report["files"] if f["exists"]]
    if existing:
        print(f"\n  ✅ EXISTS ({len(existing)})")
        for f in existing:
            alt = f" (found at {f['alternative']})" if f["alternative"] else ""
            print(f"     {f['path']}{alt} — {f['lines']} lines")

    # ADRs
    if report["adrs_found"]:
        print(f"\n  📋 ADRs ({len(report['adrs_found'])})")
        for adr in report["adrs_found"]:
            print(f"     {adr}")
    else:
        print(f"\n  📋 ADRs: None found")

    print(f"\n{'=' * 60}\n")


def main():
    parser = argparse.ArgumentParser(description="Audit project documentation completeness")
    parser.add_argument("project_path", help="Path to the project root")
    parser.add_argument(
        "--tier",
        choices=["essential", "standard"],
        default=None,
        help="Documentation tier (auto-detected if not specified)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON instead of human-readable report",
    )
    args = parser.parse_args()

    project_path = Path(args.project_path).resolve()
    if not project_path.is_dir():
        print(f"Error: {project_path} is not a directory", file=sys.stderr)
        sys.exit(1)

    report = audit(project_path, args.tier)

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print_report(report)


if __name__ == "__main__":
    main()
