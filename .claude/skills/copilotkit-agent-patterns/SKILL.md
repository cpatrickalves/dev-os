---
name: copilotkit-agent-patterns
description: Patterns for building AI agents that integrate with CopilotKit. Use when designing agent architecture, implementing AG-UI event streaming, managing shared state between agent and UI, adding human-in-the-loop checkpoints, or emitting generative UI from agents. Triggers on agent implementation tasks involving CopilotKit runtime, BuiltInAgent, useAgent, useHumanInTheLoop, useFrontendTool, or AG-UI protocol.
license: MIT
metadata:
  author: copilotkit
  version: "3.0.0"
---

# CopilotKit Agent Patterns

Architecture and implementation patterns for building AI agents that connect to CopilotKit. Contains 23 rules across 5 categories, prioritized by impact.

## When to Apply

Reference these guidelines when:
- Designing agent architecture for CopilotKit integration
- Implementing AG-UI protocol event streaming
- Managing state synchronization between agent and frontend
- Adding human-in-the-loop checkpoints to agent workflows
- Emitting tool calls that render generative UI in the frontend
- Migrating from deprecated hooks (useCopilotAction) to new specialized hooks
- Integrating multi-framework agents (Pydantic AI, LlamaIndex, MS Agent Framework)

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Agent Architecture | CRITICAL | `architecture-` |
| 2 | AG-UI Protocol | HIGH | `agui-` |
| 3 | State Management | HIGH | `state-` |
| 4 | Human-in-the-Loop | MEDIUM | `hitl-` |
| 5 | Generative UI Emission | MEDIUM | `genui-` |

## Quick Reference

### 1. Agent Architecture (CRITICAL)

- `architecture-built-in-agent` - Use BuiltInAgent from @copilotkitnext/agent for simple agents
- `architecture-use-agent-hook` - Use useAgent hook for React agent integration, state, and subscriptions
- `architecture-hook-migration` - Migrate from deprecated useCopilotAction to specialized hooks
- `architecture-multi-framework` - Use native AG-UI adapters for Pydantic AI, LlamaIndex, MS Agent Framework
- `architecture-model-resolution` - Use provider/model string format for model selection
- `architecture-max-steps` - Set maxSteps to prevent infinite tool call loops
- `architecture-mcp-servers` - Configure MCP endpoints for external tool access

### 2. AG-UI Protocol (HIGH)

- `agui-event-ordering` - Emit events in correct order (start -> content -> end)
- `agui-text-streaming` - Stream text incrementally, not as single blocks
- `agui-tool-call-lifecycle` - Follow the complete tool call event lifecycle
- `agui-state-snapshot` - Emit STATE_SNAPSHOT events for frontend sync
- `agui-error-events` - Always emit error events on failure

### 3. State Management (HIGH)

- `state-snapshot-frequency` - Emit state snapshots at meaningful checkpoints
- `state-minimal-payload` - Keep state snapshots minimal and serializable
- `state-conflict-resolution` - Handle bidirectional state conflicts gracefully
- `state-thread-isolation` - Isolate state per thread, not per agent

### 4. Human-in-the-Loop (MEDIUM)

- `hitl-approval-gates` - Use tool calls with useHumanInTheLoop for approval gates
- `hitl-timeout-fallback` - Always set timeouts with fallback behavior
- `hitl-context-in-prompt` - Include sufficient context for user decisions
- `hitl-resume-state` - Preserve full state when resuming after approval

### 5. Generative UI Emission (MEDIUM)

- `genui-tool-call-render` - Emit tool calls that map to useRenderToolCall or useFrontendTool
- `genui-streaming-args` - Stream tool args incrementally for real-time UI
- `genui-activity-messages` - Use text messages for non-tool status updates

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/architecture-built-in-agent.md
rules/architecture-use-agent-hook.md
rules/agui-event-ordering.md
```

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`
