---
title: Use Native AG-UI Integration for Your Agent Framework
impact: HIGH
impactDescription: native AG-UI adapters eliminate manual event handling and reduce boilerplate
tags: architecture, multi-framework, AG-UI, pydantic-ai, llamaindex, microsoft
---

## Use Native AG-UI Integration for Your Agent Framework

AG-UI is now supported natively by multiple agent frameworks. Use the built-in AG-UI adapter for your framework instead of implementing manual event streaming. Each framework handles AG-UI protocol events, state snapshots, and tool calls automatically.

**Incorrect (manual AG-UI implementation for a Python agent):**

```python
from fastapi import FastAPI
from ag_ui.core import EventStream

app = FastAPI()

@app.post("/agent")
async def agent_endpoint(request):
    stream = EventStream()
    stream.emit({"type": "RUN_STARTED"})
    # ... 100+ lines of manual event handling
    stream.emit({"type": "RUN_FINISHED"})
    return stream
```

**Correct (Pydantic AI - zero-config AG-UI):**

```python
from pydantic_ai import Agent

agent = Agent("openai:gpt-4o-mini")

@agent.tool_plain
async def get_weather(location: str) -> str:
    """Get the weather for a given location."""
    return f"The weather in {location} is sunny."

app = agent.to_ag_ui()
```

**Correct (LlamaIndex with AG-UI workflow router):**

```python
from fastapi import FastAPI
from llama_index.llms.openai import OpenAI
from llama_index.protocols.ag_ui.router import get_ag_ui_workflow_router

llm = OpenAI(model="gpt-4o")

agentic_chat_router = get_ag_ui_workflow_router(
    llm=llm,
    system_prompt="You are a helpful assistant.",
    backend_tools=[my_tool],
    initial_state={"searches": []},
)

app = FastAPI()
app.include_router(agentic_chat_router)
```

**Correct (Microsoft Agent Framework with .NET):**

```csharp
using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Hosting.AGUI.AspNetCore;

var agent = new AzureOpenAIClient(new Uri(endpoint), new DefaultAzureCredential())
    .GetChatClient(deployment)
    .CreateAIAgent(name: "Assistant", instructions: "You are a helpful assistant.");

app.MapAGUI("/", agent);
```

Frontend tools registered with `useFrontendTool` and `useHumanInTheLoop` are automatically available to agents through the AG-UI protocol - no explicit configuration needed.

Reference: [AG-UI Protocol](https://docs.copilotkit.ai/ag-ui-protocol)
