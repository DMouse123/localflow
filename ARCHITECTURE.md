# LocalFlow Architecture & Design Document

> **Version:** 1.1
> **Date:** November 29, 2025
> **Status:** Foundation Complete, Building AI Orchestrator

---

## Table of Contents

1. [Vision & Goals](#vision--goals)
2. [The Three Levels of AI](#the-three-levels-of-ai)
3. [Current Architecture](#current-architecture)
4. [Nodes vs Tools](#nodes-vs-tools)
5. [Plugin System Design](#plugin-system-design)
6. [AI Orchestrator Design](#ai-orchestrator-design)
7. [Local API Server](#local-api-server)
8. [AI Flow Designer](#ai-flow-designer)
9. [MCP Compatibility](#mcp-compatibility)
10. [Node Specification](#node-specification)
11. [Data Flow](#data-flow)
12. [Development Rules](#development-rules)
13. [Roadmap](#roadmap)

---

## Vision & Goals

### What LocalFlow Is
A **visual workflow automation tool** with **local AI capabilities** that allows users to:
- Build workflows by connecting nodes on a canvas
- Run AI models 100% locally (no cloud, no API keys)
- Create automations that process data, call APIs, read/write files
- Deploy AI agents that autonomously complete tasks using tools
- Trigger workflows from external systems via local API
- **Eventually:** Talk to the app to build workflows automatically

### The Ultimate Goal
```
User: "Build me a workflow that monitors my inbox and summarizes important emails"

LocalFlow AI: *creates the workflow, tests it, debugs issues, deploys it*

User: "Run it every morning at 8am"

LocalFlow AI: *adds schedule trigger, activates workflow*
```

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Local First** | AI runs on user's machine. Data never leaves. |
| **Visual** | Drag, drop, connect. See the flow. |
| **Extensible** | Plugins can add new nodes without modifying core |
| **Sequential Execution** | One LLM call at a time (local constraint) |
| **Open** | Open source, community-driven |
| **Accessible** | Local API allows external triggering |

### Non-Goals (for now)
- Cloud execution
- Multi-user collaboration
- Parallel LLM inference
- Mobile apps

---

## The Three Levels of AI

LocalFlow has three distinct levels of AI capability:

```
┌─────────────────────────────────────────────────────────────┐
│  LEVEL 3: AI FLOW DESIGNER (Future)                         │
│  "Build me a workflow that..."                              │
│  → AI creates, tests, debugs entire workflows               │
├─────────────────────────────────────────────────────────────┤
│  LEVEL 2: AI ORCHESTRATOR (Building Now)                    │
│  "Complete this task..."                                    │
│  → AI autonomously uses tools to accomplish goals           │
├─────────────────────────────────────────────────────────────┤
│  LEVEL 1: AI NODES (Complete ✅)                            │
│  "Process this data..."                                     │
│  → AI Chat, AI Transform - user wires them manually         │
└─────────────────────────────────────────────────────────────┘
```

| Level | Name | What It Does | Status |
|-------|------|--------------|--------|
| 1 | AI Nodes | AI processes data within user-built workflows | ✅ Done |
| 2 | AI Orchestrator | AI decides which tools to use to complete a task | 🔨 Building |
| 3 | AI Flow Designer | AI builds/tests/debugs workflows from natural language | 🔲 Future |

Each level builds on the previous. The Flow Designer will USE the Orchestrator, which USES AI Nodes.

---

## Current Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────┐
│                   ELECTRON                       │
│  ┌─────────────────┐    ┌────────────────────┐  │
│  │    RENDERER     │    │       MAIN         │  │
│  │                 │    │                    │  │
│  │  React + Vite   │◄──►│  Node.js Runtime   │  │
│  │  React Flow     │IPC │  node-llama-cpp    │  │
│  │  Zustand        │    │  File System       │  │
│  │  Tailwind       │    │  Workflow Engine   │  │
│  └─────────────────┘    └────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### File Structure

```
localflow/
├── electron/
│   ├── main/
│   │   ├── index.ts              # Main process entry
│   │   ├── executor/
│   │   │   ├── engine.ts         # Workflow execution engine
│   │   │   └── nodeTypes.ts      # Node definitions (BACKEND)
│   │   └── llm/
│   │       └── manager.ts        # LLM loading, inference
│   └── preload/
│       └── index.ts              # IPC bridge
├── src/
│   ├── App.tsx                   # Main React app
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── WorkflowCanvas.tsx
│   │   │   └── CustomNode.tsx
│   │   ├── Panel/
│   │   │   ├── PropertiesPanel.tsx  # Node configs (FRONTEND)
│   │   │   └── OutputPanel.tsx
│   │   └── Sidebar/
│   │       └── Sidebar.tsx          # Node palette (FRONTEND)
│   └── stores/
│       ├── workflowStore.ts
│       ├── executionStore.ts
│       └── llmStore.ts
├── scripts/
│   ├── claude-remote.js          # Remote control CLI
│   └── test-cli/                 # CLI testing tools
└── ~/.localflow/                 # User data directory
    ├── models/                   # Downloaded LLM models
    ├── workflows/                # Saved workflows
    └── plugins/                  # (FUTURE) Plugin directory
```

### Current Node Registration (3 Places - Known Issue)

**Problem:** Nodes are defined in 3 separate places:

1. **Backend** (`electron/main/executor/nodeTypes.ts`)
2. **Sidebar** (`src/components/Sidebar/Sidebar.tsx`)
3. **Properties** (`src/components/Panel/PropertiesPanel.tsx`)

**Impact:** Adding a new node requires editing 3 files.
**Solution:** Plugin system will provide single source of truth.

---

## Nodes vs Tools

This is a **critical distinction** in LocalFlow:

### Nodes
- Building blocks the **USER** wires together on the canvas
- Connected manually with edges
- Execute in the order determined by the workflow graph
- Example: User drags HTTP Request node, connects to AI Chat, connects to Debug

### Tools
- Capabilities the **AI AGENT** can use autonomously
- Agent decides when and how to use them
- Execute in the order the AI determines
- Example: Agent decides to call HTTP, then parse JSON, then calculate

### The Overlap

A node CAN be exposed as a tool:

```
┌─────────────────────────────────────────────────┐
│              HTTP REQUEST                        │
│                                                  │
│   As NODE: User wires it in workflow            │
│            [Trigger] → [HTTP] → [Debug]         │
│                                                  │
│   As TOOL: Agent uses it autonomously           │
│            Agent thinks: "I need web data"      │
│            Agent calls: http_request(url)       │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Opt-in Tool Exposure

Not every node should be a tool. Nodes can opt-in:

```javascript
{
  id: 'http-request',
  name: 'HTTP Request',
  // ... other node properties
  
  // Tool exposure (optional)
  canBeTool: true,
  toolDescription: "Makes HTTP requests to fetch data from URLs or APIs"
}
```

---

## Plugin System Design

### Goals
- Developers can create nodes as separate packages
- Drop plugin in folder → app loads it automatically
- No core code modification needed
- Plugins can be shared/distributed
- Plugins can expose themselves as tools for AI Orchestrator

### Plugin Directory Structure

```
~/.localflow/plugins/
├── my-custom-node/
│   ├── manifest.json        # Plugin metadata
│   ├── node.js              # Node implementation
│   └── icon.svg             # (optional) Custom icon
└── weather-api/
    ├── manifest.json
    └── node.js
```

### Plugin Manifest (`manifest.json`)

```json
{
  "id": "weather-lookup",
  "name": "Weather Lookup",
  "version": "1.0.0",
  "author": "Developer Name",
  "description": "Gets current weather for a city",
  "category": "data",
  "main": "node.js",
  "icon": "cloud-sun",
  "color": "#3b82f6",
  
  "inputs": [
    { "id": "city", "name": "City", "type": "string" }
  ],
  "outputs": [
    { "id": "weather", "name": "Weather", "type": "object" }
  ],
  
  "config": [
    {
      "key": "apiKey",
      "label": "API Key",
      "type": "text",
      "required": true
    },
    {
      "key": "units",
      "label": "Units",
      "type": "select",
      "default": "celsius",
      "options": [
        { "value": "celsius", "label": "Celsius" },
        { "value": "fahrenheit", "label": "Fahrenheit" }
      ]
    }
  ],
  
  "tool": {
    "enabled": true,
    "description": "Gets current weather for a city. Input: city name. Output: temperature and conditions."
  }
}
```

### Plugin Implementation (`node.js`)

```javascript
module.exports = async function execute(inputs, config, context) {
  const { city } = inputs;
  const { apiKey, units } = config;
  
  context.log(`Fetching weather for ${city}...`);
  
  const response = await context.http(
    `https://api.weather.com/current?city=${city}&key=${apiKey}&units=${units}`
  );
  
  return {
    weather: {
      city,
      temperature: response.temp,
      conditions: response.conditions
    }
  };
};
```

### Plugin Loading Sequence

```
App Startup
    │
    ▼
┌─────────────────────────────────┐
│ 1. Load Core Nodes              │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ 2. Scan ~/.localflow/plugins/   │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ 3. For each plugin:             │
│    - Validate manifest          │
│    - Load node.js               │
│    - Register as node           │
│    - If tool.enabled: register  │
│      as tool for orchestrator   │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ 4. Send to renderer for UI      │
└─────────────────────────────────┘
```

---

## AI Orchestrator Design

### Concept

The AI Orchestrator is a **core node type** that:
1. Receives a task/goal
2. Has access to tools (core + plugins)
3. Uses LLM to decide which tools to use
4. Executes tools in sequence (local LLM constraint)
5. Maintains memory of what it's done
6. Returns final result when goal is complete

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AI ORCHESTRATOR                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    TOOL REGISTRY                      │   │
│  │                                                       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   │
│  │  │Calculator│ │HTTP GET │ │File Read│ │ Weather │    │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │   │
│  │       ▲           ▲           ▲           ▲          │   │
│  │       │           │           │           │          │   │
│  │    [core]      [core]      [core]     [plugin]      │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  REASONING LOOP                       │   │
│  │                                                       │   │
│  │   TASK: "Find Tokyo weather and save to file"        │   │
│  │                                                       │   │
│  │   Step 1: THINK → "I need weather data"              │   │
│  │           ACT   → weather_lookup("Tokyo")            │   │
│  │           OBSERVE → { temp: 22, conditions: sunny }  │   │
│  │                                                       │   │
│  │   Step 2: THINK → "Now save to file"                 │   │
│  │           ACT   → file_write("/tmp/weather.txt", ..) │   │
│  │           OBSERVE → success                          │   │
│  │                                                       │   │
│  │   Step 3: THINK → "Task complete"                    │   │
│  │           DONE  → Return final answer                │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ▼                                   │
│                      [RESULT]                                │
└─────────────────────────────────────────────────────────────┘
```

### Memory Structure

```javascript
{
  task: "Find the weather in Tokyo and save it to a file",
  
  steps: [
    {
      thought: "I need to get weather data for Tokyo",
      action: "weather_lookup",
      input: { city: "Tokyo" },
      result: { temp: 22, conditions: "sunny" },
      timestamp: "2025-11-29T08:00:00Z"
    },
    {
      thought: "Now I need to save this to a file",
      action: "file_write", 
      input: { path: "/tmp/weather.txt", content: "Tokyo: 22°C, sunny" },
      result: { success: true },
      timestamp: "2025-11-29T08:00:01Z"
    }
  ],
  
  status: "complete",
  result: "Weather saved to /tmp/weather.txt"
}
```

### Why Core (Not Plugin)

The Orchestrator is **CORE** because:
1. Fundamental to LocalFlow's value proposition
2. Needs deep integration with LLM manager
3. Needs to discover and use plugins as tools
4. Complex state management
5. Foundation for Level 3 (Flow Designer)

---

## Local API Server

### Concept

LocalFlow will run a local HTTP server that allows external systems to:
- Trigger workflows
- Check workflow status
- Get workflow results
- Manage workflows programmatically

### Endpoints (Planned)

```
GET  /api/workflows              # List all workflows
GET  /api/workflows/:id          # Get workflow details
POST /api/workflows/:id/run      # Trigger workflow execution
GET  /api/executions/:id         # Get execution status/results

POST /api/webhooks/:hookId       # Webhook trigger endpoint
```

### Use Cases

1. **Cron Jobs** - External scheduler hits `/api/workflows/daily-report/run`
2. **Webhooks** - GitHub pushes to `/api/webhooks/github-deploy`
3. **Other Apps** - Raycast/Alfred triggers `/api/workflows/quick-note/run`
4. **Scripts** - CLI script calls API to run workflow

### Architecture

```
┌─────────────────────────────────────────────────┐
│                  LOCALFLOW                       │
│                                                  │
│   ┌──────────────────────────────────────────┐  │
│   │           EXPRESS SERVER                  │  │
│   │           localhost:3456                  │  │
│   │                                           │  │
│   │   /api/workflows/:id/run ──────────────┐ │  │
│   │                                         │ │  │
│   └─────────────────────────────────────────┼─┘  │
│                                             │    │
│   ┌─────────────────────────────────────────▼─┐  │
│   │           WORKFLOW ENGINE                 │  │
│   │                                           │  │
│   │   Execute workflow, return results       │  │
│   │                                           │  │
│   └───────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
         ▲
         │ HTTP
         │
┌────────┴─────────┐
│  External World  │
│  - Cron jobs     │
│  - Webhooks      │
│  - Other apps    │
│  - Scripts       │
└──────────────────┘
```

---

## AI Flow Designer

### Concept (Future - Level 3)

The ultimate goal: talk to LocalFlow in natural language to build workflows.

```
User: "I want a workflow that checks Hacker News every hour 
       and sends me a Slack message if there's a post about AI 
       with more than 100 points"

Flow Designer:
  1. Understands the requirement
  2. Creates workflow with nodes:
     - Schedule Trigger (every hour)
     - HTTP Request (HN API)
     - JSON Parse (extract posts)
     - Loop (iterate posts)
     - If/Else (check topic + points)
     - Slack (send message)
  3. Wires them together
  4. Tests the workflow
  5. Debugs any issues
  6. Deploys and activates
```

### How It Will Work

The Flow Designer will use:
- **AI Orchestrator** to complete the meta-task of "building a workflow"
- **Workflow Engine** as a tool to create/edit/run workflows
- **Plugin System** to know what nodes are available
- **Test Framework** to verify workflow works

### Flow Designer Tools

```javascript
// Tools the Flow Designer will have
{
  create_workflow: "Creates a new empty workflow",
  add_node: "Adds a node to the workflow",
  connect_nodes: "Creates an edge between two nodes",
  configure_node: "Sets configuration for a node",
  run_workflow: "Executes the workflow",
  get_workflow_result: "Gets output from last run",
  debug_workflow: "Analyzes errors and suggests fixes"
}
```

---

## MCP Compatibility

### What is MCP?

Model Context Protocol (MCP) is Anthropic's standard for AI ↔ Tools communication. It defines how tools describe themselves and how AI calls them.

### Why MCP-Compatible?

1. Industry standard (Claude, other AI systems)
2. Future-proof - can connect to external MCP servers
3. Well-defined tool schema
4. Enables interoperability

### Our Approach

Design tool interface to be **MCP-compatible** without requiring full MCP infrastructure:

```javascript
// MCP-compatible tool definition
{
  name: "http_get",
  description: "Fetches data from a URL",
  inputSchema: {
    type: "object",
    properties: {
      url: { 
        type: "string", 
        description: "The URL to fetch" 
      },
      headers: {
        type: "object",
        description: "Optional HTTP headers"
      }
    },
    required: ["url"]
  }
}
```

### Future: Full MCP Support

Later we can add:
- MCP Server mode (LocalFlow exposes tools to external AI)
- MCP Client mode (LocalFlow connects to external MCP servers)

---

## Node Specification

### Standard Node Interface

Every node (core or plugin) must conform to this interface:

```typescript
interface NodeDefinition {
  // === IDENTITY ===
  id: string;
  name: string;
  version: number;
  
  // === CATEGORIZATION ===
  category: 'trigger' | 'ai' | 'data' | 'output' | 'control' | 'custom';
  description: string;
  
  // === UI ===
  icon: string;
  color: string;
  
  // === PORTS ===
  inputs: Port[];
  outputs: Port[];
  
  // === CONFIGURATION ===
  config: ConfigField[];
  
  // === EXECUTION ===
  execute: ExecuteFunction;
  
  // === TOOL EXPOSURE (optional) ===
  canBeTool?: boolean;
  toolDescription?: string;
}
```

---

## Data Flow

### Workflow Execution

```
User clicks RUN
       │
       ▼
┌─────────────────────────────────┐
│ 1. Validate workflow            │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 2. Topological sort             │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 3. Execute nodes in order       │
│    - Send progress to UI        │
│    - Visual feedback on canvas  │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 4. Complete                     │
└─────────────────────────────────┘
```

---

## Development Rules

### For Core Development

1. **Don't break existing nodes** - Maintain backwards compatibility
2. **MCP-compatible tools** - Use standard schema
3. **Document IPC channels** - Every new channel needs documentation
4. **Test via CLI first** - Use test-cli before UI testing
5. **Commit working code** - Don't push broken builds

### For Plugin Development

1. **Use manifest.json** - Single source of truth
2. **Handle errors gracefully** - Never throw unhandled exceptions
3. **Document inputs/outputs** - Be explicit
4. **Keep it focused** - One node = one responsibility
5. **Opt-in to tool exposure** - Only if it makes sense

---

## Roadmap

### Phase 1: Foundation ✅
- [x] Visual canvas with React Flow
- [x] Core nodes (trigger, text, ai-chat, ai-transform, debug)
- [x] Data nodes (http, file-read, file-write, json-parse, loop)
- [x] Basic AI Agent (ReAct pattern)
- [x] LLM integration (Llama local)
- [x] Workflow save/load
- [x] Execution engine
- [x] Node status visualization

### Phase 2: AI Orchestrator 🔨 (Current)
- [ ] Tool registry system (MCP-compatible)
- [ ] Core tools (calculator, http, file, datetime)
- [ ] Memory/state management
- [ ] Reasoning loop (Think → Act → Observe)
- [ ] Orchestrator node UI
- [ ] Tool discovery from plugins

### Phase 3: Plugin System 🔲
- [ ] Plugin manifest schema
- [ ] Plugin loader
- [ ] Dynamic UI from plugins
- [ ] Sample plugin template
- [ ] Plugin as tool integration

### Phase 4: Local API Server 🔲
- [ ] Express server in Electron
- [ ] REST endpoints for workflows
- [ ] Webhook trigger support
- [ ] API authentication

### Phase 5: Advanced Triggers 🔲
- [ ] Schedule trigger (cron)
- [ ] File watch trigger
- [ ] Webhook trigger
- [ ] App event triggers

### Phase 6: AI Flow Designer 🔲
- [ ] Workflow manipulation tools
- [ ] Natural language → workflow
- [ ] Auto-test and debug
- [ ] Conversational refinement

### Phase 7: Polish & Distribution 🔲
- [ ] Installers (Mac, Windows, Linux)
- [ ] Auto-update
- [ ] Documentation site
- [ ] Plugin marketplace concept

---

## Appendix

### IPC Channels Reference

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `llm:list-models` | R→M | Get available models |
| `llm:load-model` | R→M | Load a model |
| `llm:generate` | R→M | Generate text |
| `workflow:execute` | R→M | Run workflow |
| `workflow:node-progress` | M→R | Node status |
| `app:quit` | R→M | Quit app |
| `app:restart` | R→M | Restart app |

*R = Renderer, M = Main*

### Environment

- **Node.js:** 18+
- **Electron:** 27+
- **React:** 18+
- **Platform:** macOS (primary), Windows/Linux (planned)

---

*Document version 1.1 - Updated with full vision including Three Levels of AI, Local API Server, and AI Flow Designer concepts.*
