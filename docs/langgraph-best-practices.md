# LangGraph Development Principles

If you are coding with LangGraph, follow these principles and patterns.

## Critical Structure Requirements

### MANDATORY FIRST STEP
Before creating any files, **always search the codebase** for existing LangGraph-related files:
- Files with names like: `graph.py`, `main.py`, `app.py`, `agent.py`, `workflow.py`
- Files containing: `.compile()`, `StateGraph`, `create_agent`, `app =`, graph exports
- Any existing LangGraph imports or patterns

**If any LangGraph files exist**: Follow the existing structure exactly. Do not create new agent.py files.

**Only create agent.py when**: Building from completely empty directory with zero existing LangGraph files.

- When starting from scratch, ensure all of the following:
  1. `agent.py` at project root with compiled graph exported as `app` (or `graph`)
  2. `langgraph.json` configuration file in the same directory as the graph
  3. Proper state management defined with `TypedDict` or Pydantic `BaseModel`
  4. Test small components before building complex graphs

## Deployment-First Principles

**CRITICAL**: All LangGraph agents should be written for DEPLOYMENT unless otherwise specified.

### Core Requirements:
- **NEVER ADD A CHECKPOINTER** unless explicitly requested by user
- Always export compiled graph as `app`
- Use prebuilt components when possible
- Follow model preference hierarchy: Anthropic > OpenAI > Google
- Keep state minimal (MessagesState usually sufficient)

#### AVOID unless user specifically requests

```python
# Don't do this unless asked!
from langgraph.checkpoint.memory import InMemorySaver
agent = create_agent(model, tools, checkpointer=InMemorySaver())
```

#### For existing codebases
- Always search for existing graph export patterns first
- Work within the established structure rather than imposing new patterns
- Do not create `agent.py` if graphs are already exported elsewhere

### Standard Structure for New Projects:

```
./agent.py          # Main agent file, exports: app or graph
./langgraph.json    # LangGraph configuration
./.env              # Environment variables (API keys)
```

### langgraph.json Configuration:

```json
{
  "dependencies": ["langchain_anthropic", "."],
  "graphs": {
    "my_agent": "./agent.py:graph"
  },
  "env": "./.env"
}
```

### Export Pattern:

```python
from langgraph.graph import StateGraph, START, END
# ... your state and node definitions ...

# Build your graph
graph_builder = StateGraph(YourState)
# ... add nodes and edges ...

# Export as 'graph' or 'app' for LangGraph deployment
graph = graph_builder.compile()
# app = graph  # Alternative export name
```

## Prefer Prebuilt Components

**Always use prebuilt components when possible** - they are deployment-ready and well-tested.

### Use `create_agent` (only when explicitly said by the user)

`langchain.agents.create_agent` is the standard way to build agents in LangChain/LangGraph v1. It replaces the deprecated `create_react_agent`.

```python
from langchain.agents import create_agent

# Simplest approach - model string format
agent = create_agent(
    model="anthropic:claude-3-7-sonnet-latest",
    tools=[my_tool],
    system_prompt="You are a helpful assistant.",  # Note: renamed from 'prompt'
)
result = agent.invoke({"messages": [{"role": "user", "content": "Hello"}]})
```

### Multi-Agent Systems:

#### Supervisor Pattern (central coordination):

```python
from langgraph_supervisor import create_supervisor
from langchain.agents import create_agent

# Create specialized agents first
research_agent = create_agent(
    model="anthropic:claude-3-7-sonnet-latest",
    tools=[web_search],
    name="research_agent"
)

math_agent = create_agent(
    model="anthropic:claude-3-7-sonnet-latest",
    tools=[calculator],
    name="math_agent"
)

# Create supervisor to coordinate agents
workflow = create_supervisor(
    [research_agent, math_agent],
    model="anthropic:claude-3-7-sonnet-latest",
    prompt=(
        "You are a team supervisor managing a research expert and a math expert. "
        "For current events, use research_agent. "
        "For math problems, use math_agent."
    )
)
app = workflow.compile()
```

**Hierarchical Supervisors:**

```python
research_team = create_supervisor(
    [research_agent, math_agent],
    model=model,
    supervisor_name="research_supervisor"
).compile(name="research_team")

writing_team = create_supervisor(
    [writing_agent, publishing_agent],
    model=model,
    supervisor_name="writing_supervisor"
).compile(name="writing_team")

top_level_supervisor = create_supervisor(
    [research_team, writing_team],
    model=model,
    supervisor_name="top_level_supervisor"
).compile(name="top_level_supervisor")
```

Documentation: https://langchain-ai.github.io/langgraph/reference/supervisor/

#### Swarm Pattern (dynamic handoffs):

```python
from langgraph_swarm import create_swarm, create_handoff_tool
from langchain.agents import create_agent

alice = create_agent(
    model="anthropic:claude-3-7-sonnet-latest",
    tools=[tools, create_handoff_tool(agent_name="Bob")],
    system_prompt="You are Alice. Hand off to Bob for technical questions.",
    name="Alice",
)

bob = create_agent(
    model="anthropic:claude-3-7-sonnet-latest",
    tools=[tools, create_handoff_tool(agent_name="Alice")],
    system_prompt="You are Bob, a technical expert.",
    name="Bob",
)

workflow = create_swarm([alice, bob], default_active_agent="Alice")
app = workflow.compile()
```

Documentation: https://langchain-ai.github.io/langgraph/reference/swarm/

### Build Custom StateGraph When:
- Prebuilt components don't fit the specific use case
- User explicitly asks for custom workflow or Agent
- Complex branching logic required
- Advanced streaming patterns needed

### Model String Format (Recommended - NEW in v1)

```python
from langchain.chat_models import init_chat_model

model = init_chat_model("anthropic:claude-sonnet-4-5-20250929")  # Latest
model = init_chat_model("openai:gpt-4o")
model = init_chat_model("google-genai:gemini-2.0-flash")
```

### Explicit Model Objects (Still Supported)

```python
from langchain_anthropic import ChatAnthropic
model = ChatAnthropic(model="claude-sonnet-4-5-20250929")

from langchain_openai import ChatOpenAI
model = ChatOpenAI(model="gpt-4o")

from langchain_google_genai import ChatGoogleGenerativeAI
model = ChatGoogleGenerativeAI(model="gemini-2.0-flash")
```

**NOTE**: Assume API keys are available in environment.
During development, ignore missing key errors.

## Message and State Handling

### CRITICAL: Extract Message Content Properly
```python
# CORRECT: Extract message content properly
result = agent.invoke({"messages": state["messages"]})
if result.get("messages"):
    final_message = result["messages"][-1]  # This is a message object
    content = final_message.content         # This is the string content

# WRONG: Treating message objects as strings
content = result["messages"][-1]  # This is an object, not a string!
if content.startswith("Error"):   # Will fail - objects don't have startswith()
```

### State Updates Must Be Dictionaries:
```python
def my_node(state: State) -> Dict[str, Any]:
    # Do work...
    return {
        "field_name": extracted_string,    # Always return dict updates
        "messages": updated_message_list   # Not the raw messages
    }
```

## Functional API (NEW in v1)

The functional API provides an imperative programming style using decorators:

```python
from langgraph.func import entrypoint, task
from langgraph.checkpoint.memory import InMemorySaver

@task
def fetch_data(query: str) -> dict:
    """Tasks run as graph nodes with automatic state management."""
    return {"data": f"Results for {query}", "count": 42}

@task
def process_data(data: dict) -> str:
    """Process fetched data."""
    return f"Processed: {data['data']} ({data['count']} items)"

@entrypoint(checkpointer=InMemorySaver())
def workflow(query: str):
    # Call tasks and get results with .result()
    data = fetch_data(query).result()
    processed = process_data(data).result()
    return {"status": "success", "result": processed}

# Execute workflow
result = workflow.invoke("machine learning papers")
```

### When to Use Functional API:

- Simple, linear workflows
- When you prefer imperative programming over graph definition
- Quick prototypes and scripts

### When to Use StateGraph:

- Complex branching logic
- When you need explicit control over graph structure
- Advanced streaming patterns

## Streaming and Interrupts

### Streaming Patterns:

- Interrupts only work with `stream_mode="updates"`, not `stream_mode="values"`
- In "updates" mode, events are structured as `{node_name: node_data, ...}`
- Check for `"__interrupt__"` key directly in the event object
- Iterate through `event.items()` to access individual node outputs

- Interrupts appear as `event["__interrupt__"]` containing a tuple of `Interrupt` objects
- Access interrupt data via `interrupt_obj.value` where `interrupt_obj = event["__interrupt__"][0]`

Documentation:
- LangGraph Streaming: https://langchain-ai.github.io/langgraph/how-tos/stream-updates/
- SDK Streaming: https://langchain-ai.github.io/langgraph/cloud/reference/sdk/python_sdk_ref/#stream
- Concurrent Interrupts: https://docs.langchain.com/langgraph-platform/interrupt-concurrent

### When to Use Interrupts:

Use `interrupt()` when you need:
- User approval for generated plans or proposed changes
- Human confirmation before executing potentially risky operations
- Additional clarification when the task is ambiguous
- User input data entry or for decision points that require human judgment
- Feedback on partially completed work before proceeding

### Correct Interrupt Usage (Updated for v1):

```python
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import InMemorySaver

# Interrupts REQUIRE a checkpointer
checkpointer = InMemorySaver()
graph = builder.compile(checkpointer=checkpointer)

# In a node - interrupt pauses and can receive values on resume
def approval_node(state):
    # interrupt() pauses execution and returns the resume value when resumed
    approval = interrupt(
        value={
            "question": "Do you approve this action?",
            "proposal": state["messages"][-1]["content"]
        }
    )
    # 'approval' contains the value passed via Command(resume=...)
    if approval:
        return {"messages": [{"role": "system", "content": "Approved"}]}
    return {"messages": [{"role": "system", "content": "Rejected"}]}

# Resuming from interrupt with Command
config = {"configurable": {"thread_id": "my-thread"}}

# First run - will pause at interrupt
for chunk in graph.stream({"messages": [...]}, config):
    if "__interrupt__" in chunk:
        print("Waiting for approval...")

# Resume with user input
for chunk in graph.stream(Command(resume=True), config):  # or resume=False
    print(chunk)
```

## Command Pattern (NEW in v1)

The `Command` object combines state updates and routing in a single return:

```python
from typing import Literal
from langgraph.types import Command

def my_node(state: State) -> Command[Literal["node_b", "node_c"]]:
    # Analyze state and decide next step
    if state["needs_review"]:
        goto = "review_node"
    else:
        goto = "process_node"

    # Return BOTH state update AND routing decision
    return Command(
        update={"processed": True},  # State update
        goto=goto,                    # Next node (replaces conditional edges)
    )
```

### Command for Subgraph Navigation:

```python
def subgraph_node(state: State) -> Command[Literal["parent_node"]]:
    return Command(
        update={"result": "done"},
        goto="parent_node",
        graph=Command.PARENT  # Navigate to parent graph
    )
```

### Command for Agent Handoffs:

```python
from langgraph.types import Command
from langchain_core.messages import ToolMessage

def handoff_to_agent(state, tool_call_id, agent_name):
    tool_message = ToolMessage(
        content=f"Transferred to {agent_name}",
        tool_call_id=tool_call_id,
    )
    return Command(
        goto=agent_name,
        graph=Command.PARENT,
        update={
            "messages": state["messages"] + [tool_message],
            "active_agent": agent_name,
        },
    )
```

## Memory: Short-term vs Long-term

### Short-term Memory (Checkpointer) - Thread-level Persistence

For conversation history within a single thread:

```python
from langgraph.checkpoint.memory import InMemorySaver

checkpointer = InMemorySaver()  # For development/testing
graph = builder.compile(checkpointer=checkpointer)

# Each thread_id maintains separate conversation history
graph.invoke(
    {"messages": [{"role": "user", "content": "Hi, I'm Bob"}]},
    {"configurable": {"thread_id": "session-1"}}
)
```

**Production Checkpointers:**
- `langgraph-checkpoint-postgres`: PostgresSaver (recommended for production)
- `langgraph-checkpoint-sqlite`: SqliteSaver (local development)
- `langgraph-checkpoint-cosmosdb`: CosmosDBSaver (Azure)

### Long-term Memory (Store) - Cross-thread Persistence (NEW)

For data that persists across conversations and threads:

```python
from langchain.agents import create_agent
from langgraph.store.memory import InMemoryStore
from langgraph.config import get_store
from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig

store = InMemoryStore()

# Store user preferences
store.put(("users",), "user_123", {"name": "John", "language": "English"})

@tool
def get_user_info(config: RunnableConfig) -> str:
    """Look up user info from long-term memory."""
    store = get_store()
    user_id = config["configurable"].get("user_id")
    user_info = store.get(("users",), user_id)
    return str(user_info.value) if user_info else "Unknown user"

# Pass store to agent
agent = create_agent(
    model="anthropic:claude-3-7-sonnet-latest",
    tools=[get_user_info],
    store=store  # Enable long-term memory
)

# Invoke with user_id in config
agent.invoke(
    {"messages": [{"role": "user", "content": "What's my name?"}]},
    config={"configurable": {"user_id": "user_123"}}
)
```

## Common LangGraph Errors to Avoid

- **Incorrect `interrupt()` usage**: Requires checkpointer; use `Command(resume=value)` to provide input
- Refer to documentation for best interrupt handling practices
- Wrong state update patterns: Return updates, not full state
- Missing state type annotations
- Invalid edge conditions: Ensure all paths have valid transitions
- Not handling error states properly
- Not exporting graph as 'app' or 'graph' when creating new LangGraph agents from scratch
- Forgetting `langgraph.json` configuration
- **Type assumption errors**: Assuming message objects are strings, or that state fields are certain types
- **Chain operations without type checking**: Like `state.get("field", "")[-1].method()` without verifying types
- **Missing checkpointer for interrupts**: `interrupt()` will fail without a checkpointer
- **Confusing Store vs Checkpointer**: Use checkpointer for thread history, store for cross-thread data

## Framework Integration Patterns

### Integration Debugging
When building integrations, always start with debugging:

```python
# Temporary debugging for new integrations
def my_integration_function(input_data, config):
    print(f"=== DEBUG START ===")
    print(f"Input type: {type(input_data)}")
    print(f"Input data: {input_data}")
    print(f"Config type: {type(config)}")
    print(f"Config data: {config}")
    
    # Process...
    result = process(input_data, config)
    
    print(f"Result type: {type(result)}")
    print(f"Result data: {result}")
    print(f"=== DEBUG END ===")
    
    return result
```

### Config Propagation Verification
Always verify the receiving end actually uses configuration:

```python
# WRONG: Assuming config is used
def my_node(state: State) -> Dict[str, Any]:
    response = llm.invoke(state["messages"])
    return {"messages": [response]}

# CORRECT: Actually using config
def my_node(state: State, config: RunnableConfig) -> Dict[str, Any]:
    # Extract configuration
    configurable = config.get("configurable", {})
    system_prompt = configurable.get("system_prompt", "Default prompt")
    
    # Use configuration in messages
    messages = [SystemMessage(content=system_prompt)] + state["messages"]
    response = llm.invoke(messages)
    return {"messages": [response]}
```
## Patterns to Avoid

### Don't Mix Responsibilities in Single Nodes:
```python
# AVOID: LLM call + tool execution in same node
def bad_node(state):
    ai_response = model.invoke(state["messages"])  # LLM call
    tool_result = tool_node.invoke({"messages": [ai_response]})  # Tool execution
    return {"messages": [...]}  # Mixed concerns!

# PREFER: Separate nodes for separate concerns
def llm_node(state):
    return {"messages": [model.invoke(state["messages"])]}

def tool_node(state):
    return ToolNode(tools).invoke(state)

# Connect with edges
workflow.add_edge("llm", "tools")
```

### Overly Complex Agents When Simple Ones Suffice

```python
# AVOID: Unnecessary complexity
workflow = StateGraph(ComplexState)
workflow.add_node("agent", agent_node)
workflow.add_node("tools", tool_node)
# ... 20 lines of manual setup when create_agent would work
```

### Avoid Overly Complex State:
```python
# AVOID: Too many state fields
class State(TypedDict):
    messages: List[BaseMessage]
    user_input: str
    current_step: int
    metadata: Dict[str, Any]
    history: List[Dict]
    # ... many more fields

# PREFER: Use MessagesState when sufficient
from langgraph.graph import MessagesState
```

### Wrong Export Patterns
```python
# AVOID: Wrong variable names or missing export
compiled_graph = workflow.compile()  # Wrong name
# Missing: app = compiled_graph
```

### Incorrect interrupt() usage

```python
# AVOID: Using interrupt without checkpointer
graph = builder.compile()  # No checkpointer!
# interrupt() will fail

# CORRECT: Always use checkpointer with interrupts
from langgraph.checkpoint.memory import InMemorySaver
graph = builder.compile(checkpointer=InMemorySaver())

# CORRECT: interrupt() DOES return the resume value in v1
def my_node(state):
    user_input = interrupt("Please provide input")  # Pauses here
    # When resumed with Command(resume="user's answer"), user_input = "user's answer"
    return {"user_response": user_input}
```

Reference: https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/

## LangGraph-Specific Coding Standards

### Structured LLM Calls and Validation
When working with LangGraph nodes that involve LLM calls, always use structured output with Pydantic dataclasses:

- Use `with_structured_output()` method for LLM calls that need specific response formats
- Define Pydantic BaseModel classes for all structured data (state schemas, LLM responses, tool inputs/outputs)
- Validate and parse LLM responses using Pydantic models
- For conditional nodes relying on LLM decisions, use structured output

Example: `llm.with_structured_output(MyPydanticModel).invoke(messages)` instead of raw string parsing

### General Guidelines:
- Test small components before building complex graphs
- **Avoid unnecessary complexity**: Consider if simpler approaches with prebuilt components would achieve the same goals
- Write concise and clear code without overly verbose implementations
- Only install trusted, well-maintained packages

## Documentation Guidelines

### When to Consult Documentation:

Always use documentation tools before implementing LangGraph code (the API evolves rapidly):
- Before creating new graph nodes or modifying existing ones
- When implementing state schemas or message passing patterns
- Before using LangGraph-specific decorators, annotations, or utilities
- When working with conditional edges, dynamic routing, or subgraphs
- Before implementing tool calling patterns within graph nodes
- When using the functional API (`@task`, `@entrypoint`)
- When implementing human-in-the-loop with interrupts
- When building applications that integrate multiple frameworks (e.g., LangGraph + Streamlit, LangGraph + Next.js/React), also consult the framework docs to ensure correct syntax and patterns

### Key Documentation Resources:

**Core Documentation:**
- LangGraph Overview: https://docs.langchain.com/oss/python/langgraph/overview
- LangChain v1 Release Notes: https://docs.langchain.com/oss/python/releases/langchain-v1
- LangGraph v1 Release Notes: https://docs.langchain.com/oss/python/releases/langgraph-v1

**How-to Guides:**
- LangGraph Streaming: https://langchain-ai.github.io/langgraph/how-tos/stream-updates/
- LangGraph Config: https://langchain-ai.github.io/langgraph/how-tos/pass-config-to-tools/
- Tool Calling: https://langchain-ai.github.io/langgraph/how-tos/tool-calling
- Human-in-the-Loop: https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/
- Functional API: https://docs.langchain.com/oss/python/langgraph/use-functional-api

**Multi-Agent Patterns:**
- Supervisor Pattern: https://langchain-ai.github.io/langgraph/reference/supervisor/
- Swarm Pattern: https://langchain-ai.github.io/langgraph/reference/swarm/
- Agentic Concepts: https://langchain-ai.github.io/langgraph/concepts/agentic_concepts/

**Persistence:**
- Checkpointer Libraries: https://docs.langchain.com/oss/python/langgraph/persistence
- Add Short-term Memory: https://docs.langchain.com/oss/python/langgraph/add-memory

### Documentation Navigation

- Determine the base URL from the current documentation page
- For `../`, go one level up in the URL hierarchy
- For `../../`, go two levels up, then append the relative path
- Example: From `https://langchain-ai.github.io/langgraph/tutorials/get-started/langgraph-platform/setup/` with link `../../langgraph-platform/local-server`
  - Go up two levels: `https://langchain-ai.github.io/langgraph/tutorials/get-started/`
  - Append path: `https://langchain-ai.github.io/langgraph/tutorials/get-started/langgraph-platform/local-server`
- If you encounter an HTTP 404 error, the constructed URL is likely incorrect—rebuild it carefully

---

## Changelog (September 2025 → January 2026)

### New Features Added

| Feature | Description |
|---------|-------------|
| **LangChain v1 `create_agent`** | New high-level API for building agents, replaces `create_react_agent` for simple use cases |
| **Model String Format** | Models can now be specified as `"provider:model"` strings (e.g., `"anthropic:claude-3-7-sonnet-latest"`) |
| **Functional API** | `@task` and `@entrypoint` decorators for imperative workflow programming |
| **Command Pattern** | `Command` object for combined state updates and routing, replaces many conditional edges |
| **Long-term Memory (Store)** | `InMemoryStore` for cross-thread data persistence, separate from checkpointer |
| **Hierarchical Supervisors** | Supervisors can now manage other supervisors for complex multi-agent systems |
| **`Command(resume=...)`** | New pattern for resuming from interrupts with user input |

### Updated Practices

| Area | Change |
|------|--------|
| **Model Names** | Updated to latest: `claude-sonnet-4-5-20250929`, `claude-3-7-sonnet-latest`, `gpt-4.1` |
| **Checkpointer Import** | `InMemorySaver` from `langgraph.checkpoint.memory` (consistent naming) |
| **`interrupt()` Behavior** | Now properly returns the resume value when used with `Command(resume=...)` |
| **Export Names** | Both `graph` and `app` are acceptable export names |
| **langgraph.json** | Updated format with description support and cleaner structure |

### Deprecated/Obsolete Practices

| Practice | Replacement |
|----------|-------------|
| `MemorySaver` name | Use `InMemorySaver` |
| Manual model instantiation required | Use model string format for simplicity |
| `interrupt()` doesn't return values | `interrupt()` DOES return the resume value in v1 |
| `langgraph.prebuilt.create_react_agent` | **Deprecated** - Use `langchain.agents.create_agent` |

### Documentation Updates

- Added links to LangGraph v1 and LangChain v1 release notes
- Updated all documentation URLs to current locations
- Added Functional API documentation reference
- Added Checkpointer Libraries and Memory documentation