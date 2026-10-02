# MCP Security Checklist

MCP connects agents to tools, APIs, data, and internal/external systems — it accelerates
capability and risk equally. Review every MCP server the agent uses against this list.

## Where to look

- `.mcp.json` (project), `~/.claude.json` / `claude_desktop_config.json` (user/desktop)
- `.claude/settings.json` → `enabledMcpjsonServers`, permissions on `mcp__*` tools
- Framework configs: `mcpServers` keys, MCP SDK client code
- For each server: the command/URL it runs, its source (npm package? git repo? binary?),
  and the credentials passed to it (env vars, tokens in args)

## The checklist

| Check | What good looks like | Why |
|-------|----------------------|-----|
| **Allowlist, not denylist** | An explicit list of approved servers; anything else blocked | Many servers exist for the same tool and it's hard to tell the official one (300+ GitHub MCP servers existed; one was official). A denylist means verifying everything forever; an allowlist bounds the work. |
| **Official/verified source** | Server comes from the vendor's own org/registry | Lookalike servers are a supply-chain vector: they see every tool call and its data. |
| **Version pinned** | Exact version, not `latest`/floating | A compromised update becomes instant agent compromise. |
| **HTTPS required** | Remote servers only over HTTPS | Token and data interception otherwise. |
| **Protocol version validated** | Client checks/pins MCP protocol version | Downgrade/mismatch bugs. |
| **Code scanned** | MCP server code scanned before adoption (or from a curated internal registry) | The server runs with the agent's reach. |
| **Gateway in front** | MCP gateway mediating calls (logging, policy, allowlist enforcement) | Central interception point — otherwise every agent enforces policy on its own. |
| **Responses treated as untrusted** | MCP/tool responses pass through the same guardrails as user input | An MCP response is remote content. It can carry injected instructions exactly like a malicious email. This is the most commonly missed check. |
| **Least-privilege credentials** | Each server gets a token scoped to what the agent needs, not an admin/PAT with org-wide scope | The server's compromise = the token's scope. |
| **Registry/inventory** | Central record of which agents use which MCP servers | You can't respond to a compromised server if you don't know who uses it. |

## Config red flags (cite file:line)

- `http://` URLs for remote servers
- `npx -y <package>@latest` or unpinned versions in server commands
- Tokens/API keys inline in the config file (vs. env references) — and committed to git
- Broad permission grants like `mcp__*` or `Bash(*)` alongside MCP servers
- Servers whose package name is a near-miss of the official one
  (`@acme/github-mcp` vs `github-mcp-server`)
- No allowlist mechanism at all — any server a developer adds just works

## Verdict framing

MCP findings are usually **Medium** (governance gaps) unless they complete an attack
path — e.g., an unofficial/unpinned server whose responses feed an agent that also holds
a toxic combination → raise to **High**, because the server is an injection channel into
that path.
