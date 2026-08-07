---
name: workflow-visualizer
description: Map any system or workflow as a beautiful interactive HTML diagram
triggers:
  - visualize this workflow
  - map out this system
  - diagram my workflow
  - show how this works
context: fork
---

# Workflow Visualizer

Turn any system description into a beautiful, interactive HTML diagram. Click nodes, hover for details, and see exactly how data flows through your workflow. One self-contained HTML file, no dependencies.

## How It Works

When you say "visualize this workflow" or "map out this system", this skill parses your description, identifies every component, and builds an interactive diagram you can open in any browser.

## Step 1: Parse the System

Extract these components from the user's description:

| Component | What to Look For | Example |
|-----------|-----------------|---------|
| **Triggers** | What starts the workflow | "When a new email arrives", "Every morning at 9am" |
| **Inputs** | Data that enters the system | "Email body", "CSV file", "API response" |
| **Processing Steps** | Actions that transform data | "Extract key info", "Summarize text", "Filter results" |
| **Tools / Services** | External tools or APIs used | "Claude", "Zapier", "Google Sheets", "Slack" |
| **Decision Points** | Conditional branches | "If priority is high", "When amount > $100" |
| **Outputs** | Final results or deliverables | "Send Slack message", "Update spreadsheet", "Generate report" |
| **Loops** | Recurring or repeating steps | "Repeat for each item", "Run daily" |
| **Data Stores** | Where data lives between steps | "Database", "JSON file", "Spreadsheet" |

If the user's description is vague, ask clarifying questions before building.

## Step 2: Choose a Layout

Select the layout that best fits the workflow shape:

| Layout | Structure | Best For |
|--------|-----------|----------|
| **Left-to-Right Flow** | Horizontal chain of nodes | Linear processes, pipelines, simple workflows |
| **Top-Down Waterfall** | Vertical cascade | Sequential steps, decision trees, funnels |
| **Hub and Spoke** | Central node with radiating connections | One tool that connects to many, API integrations |
| **Swimlane** | Horizontal lanes per tool/person | Multi-team processes, handoffs between systems |
| **Circular** | Loop back to start | Recurring workflows, feedback loops, monitoring |

## Step 3: Build the Interactive HTML

Generate a single self-contained HTML file with these features:

### Node Types and Colors

| Node Type | Background | Border | Icon Style |
|-----------|-----------|--------|------------|
| **Trigger** | `#1e3a5f` | `#3B82F6` (blue) | Lightning bolt, clock, webhook |
| **Processing** | `#1a3d2e` | `#10B981` (green) | Gear, wand, filter |
| **Tool / Service** | `#3d2e1a` | `#F59E0B` (amber) | Tool logo or wrench |
| **Output** | `#3d1a1a` | `#EF4444` (red) | Check, send, export |
| **Data Store** | `#1a1a2e` | `#6366F1` (indigo) | Database, folder, file |
| **Decision** | `#2e1a3d` | `#A855F7` (purple) | Question mark, fork |

### Node Content

Each node displays:
- **Icon** (emoji or SVG) at the top
- **Label** (2-4 words, bold)
- **Subtitle** (one short line describing what happens)

### Connections and Interactivity

**Lines:** Solid with arrowheads, color matches source node border, optional data label, animated dash on highlight.

**Hover:** Node scales 1.05x, border glows, tooltip with step description.

**Click:** Highlights node and direct connections, dims unconnected nodes, click background to reset.

**Responsive:**
- Diagram scales to fit the viewport
- Works on desktop and tablet screens
- Nodes wrap or scroll on very small screens

### Style Defaults

Page bg `#0f0f0f`, container `#161616`, header text `#ffffff`, subtitle `#888888`, node text `#ffffff`, connections `#444444` (colored when highlighted). System sans-serif font, 12px border radius, 20px node padding, 160px min node width.

Include a header (workflow name + description), the diagram container, and a color-coded legend (Blue=Triggers, Green=Processing, Amber=Tools, Red=Outputs, Indigo=Data Stores, Purple=Decisions). All styles and JS inline, no external dependencies.

## Rules

1. **Every node must be a specific action, not a vague label.** "Process data" is bad. "Extract invoice total from PDF" is good
2. **Connections must show what data flows between nodes.** Not just that they connect, but WHAT passes through
3. **Decision points need labeled branches.** "Yes" and "No", or the specific conditions
4. **No floating nodes.** Every node must connect to at least one other node
5. **Dark background always.** Light mode diagrams wash out and look less professional
6. **Max 20 nodes per diagram.** If the workflow is bigger, split into sub-diagrams
7. **Self-contained HTML.** No external CSS, JS, or image dependencies. Must work offline

## Example Usage

- "Visualize this workflow: new lead from website form, added to CRM, sales gets Slack notification"
- "Map out this system: Claude writes drafts, Grammarly checks, Google Docs for review"
- "Diagram my workflow: check email, triage urgent vs non-urgent, route to Slack or Notion"

## Tips for Best Results

- Describe your workflow step by step in plain language
- Mention every tool or service involved by name
- Include any conditions or branches ("if X then Y, otherwise Z")
- The more detail you give, the more accurate the diagram will be
