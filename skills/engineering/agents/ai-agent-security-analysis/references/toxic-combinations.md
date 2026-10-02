# Toxic Combinations Catalog

Risk lives in **combinations**, not isolated permissions. A read permission is fine; a
send permission is fine; together they are an exfiltration path. Build the agent's
(data access × action) matrix and check every pair against this catalog. Also check
pairs *across* agents in multi-agent systems — the combination can span two agents that
each look benign.

## How to use this catalog

For each agent, list:
- **D** = data sources it can read (CRM, email, files, DB, memory, secrets, web)
- **A** = actions it can take (send email, HTTP out, write DB, run commands, write files,
  write memory, install skills/MCPs)

Check every D×A pair below. A pair is only *exploitable* if untrusted content can reach
the LLM (user prompt, or any content the agent ingests — which is almost always yes).
A pair with no intercepting control at the action boundary is Critical or High.

## The catalog

| # | Combination | Why it's dangerous | Typical severity |
|---|-------------|--------------------|------------------|
| 1 | **Sensitive data read + email/message send** (CRM, Salesforce, Dynamics, DB + SMTP/Graph/Slack) | Direct exfiltration path: injected instruction says "summarize accounts and send to attacker@…". BCC additions and external recipients are the classic tells. | Critical |
| 2 | **Internal data read + web fetch / HTTP out** | Agent can be steered to GET/POST internal data to an attacker's domain (data in URL params, request body, or "check this link" patterns). | Critical |
| 3 | **Secrets/credentials access + any outbound channel** (.env, key vault, config + email/web/DNS) | Keys exfiltrated once = persistent compromise beyond the agent. | Critical |
| 4 | **DB access + destructive SQL privileges** (`DROP`, `DELETE`, `TRUNCATE`, DDL) | No data theft needed — injected instruction destroys production data. Coding agents with prod credentials are the common case. | Critical |
| 5 | **File read + command execution** (shell, code interpreter, CI runner) | Read secrets then exfiltrate via commands; or run arbitrary payloads fetched from ingested content. | Critical |
| 6 | **Untrusted content ingestion + memory write** | Memory poisoning: injected instruction persists across sessions ("always BCC x@y"). The attack outlives the conversation and evades prompt-level guardrails. | High |
| 7 | **Untrusted content ingestion + skill/MCP/tool installation** | Malicious skill = persistent, code-level compromise of the agent itself. | High |
| 8 | **Read-only purpose + write permission** (calendar prioritizer with calendar write; reporting agent with UPDATE) | Excess privilege: not exploitable by itself, but it's the raw material of every path above. Compare stated intent vs. granted scope. | Medium–High |
| 9 | **Web browsing + stored credentials/sessions** | Injected page content can drive authenticated actions on other sites (CSRF-with-an-LLM). | High |
| 10 | **Cross-agent relay** (agent A reads sensitive data → hands to agent B that has outbound) | The toxic pair spans two agents; per-agent review misses it. Trace data flow across the whole graph. | High |

## Detection heuristics (code review)

Grep-able signals that a pair exists:

```
Sensitive read side:
  salesforce, simple_salesforce, dynamics, hubspot, SELECT .* FROM, imap, gmail,
  graph.microsoft.com, sharepoint, onedrive, vector store / retriever over internal docs,
  os.environ / dotenv near tool code

Outbound/action side:
  smtplib, sendgrid, ses, slack_sdk chat_postMessage, requests.post/get with
  non-allowlisted URL, httpx, fetch(, subprocess, os.system, exec/eval,
  sqlalchemy execute / cursor.execute with non-parameterized or DDL-capable role,
  boto3 s3 put_object to non-fixed bucket

Persistence side:
  memory.save / add_memory / vector upsert, file writes into prompt/skill/config dirs,
  dynamic tool registration, MCP server install/config writes
```

A tool that takes a **free-form destination** (arbitrary `to=` address, arbitrary URL,
arbitrary bucket/path) is far more dangerous than one with a fixed destination. Fixed
destination or allowlisted domain drops the pair by one severity level; note it in the
finding.

## Mitigations to recommend (in order of preference)

1. **Remove the pair**: drop the unneeded side (least privilege / intent-based access),
   or split into two agents that don't share a context.
2. **Constrain the action**: allowlist destinations (recipients, domains, buckets),
   parameterize SQL with a non-DDL role, make writes append-only.
3. **Gate the action**: human approval for the dangerous side when the sensitive side was
   touched in the same session ("read CRM this session → email send requires approval").
4. **Detect the path at runtime**: flag sequences (sensitive read → external send,
   sensitive read → upload to newly-registered domain, external recipient added as BCC),
   not just single actions.
5. **Guardrails on all inputs**: last line, not first — always bypassable in principle.
