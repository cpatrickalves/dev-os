---
title: Python Agent via AG-UI Protocol
impact: HIGH
impactDescription: AG-UI enables Python/FastAPI agents to connect to CopilotKit runtime
tags: runner, ag-ui, python, fastapi, langgraph
---

## Python Agent via AG-UI Protocol

Use the AG-UI protocol to connect Python agents (LangGraph, custom) to CopilotKit. Create a FastAPI app with `add_langgraph_fastapi_endpoint` and register it in the CopilotKit runtime as an `HttpAgent` or `LangGraphHttpAgent`.

**Python agent (FastAPI + LangGraph):**

```python
# main.py
from ag_ui_langgraph import add_langgraph_fastapi_endpoint
from copilotkit import LangGraphAGUIAgent
from fastapi import FastAPI
from langgraph.graph import END, START, MessagesState, StateGraph
from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
import uvicorn

async def chat_node(state: MessagesState):
    model = ChatOpenAI(model="gpt-4o")
    system_message = SystemMessage(content="You are a helpful assistant.")
    response = await model.ainvoke([system_message, *state["messages"]])
    return {"messages": response}

graph = StateGraph(MessagesState)
graph.add_node(chat_node)
graph.add_edge(START, "chat_node")
graph.add_edge("chat_node", END)
graph = graph.compile()

app = FastAPI()
add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="sample_agent",
        description="A helpful AI assistant",
        graph=graph,
    ),
    path="/",
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8123, reload=True)
```

**TypeScript runtime connecting to the Python agent:**

```typescript
// app/api/copilotkit/route.ts
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime"
import { HttpAgent } from "@ag-ui/client"
import { NextRequest } from "next/server"

const runtime = new CopilotRuntime({
  agents: {
    sample_agent: new HttpAgent({ url: "http://localhost:8123/" }),
  },
})

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit",
  })
  return handleRequest(req)
}
```

Key points:
- Use `LangGraphAGUIAgent` + `add_langgraph_fastapi_endpoint` for Python LangGraph agents
- Use `HttpAgent` from `@ag-ui/client` to connect from the TypeScript runtime
- Alternatively use `LangGraphHttpAgent` from `@copilotkit/runtime/langgraph` for direct LangGraph connections
- The Python agent name must match the dictionary key in the TypeScript runtime

Reference: [AG-UI Integration](https://docs.copilotkit.ai/guides/ag-ui)
