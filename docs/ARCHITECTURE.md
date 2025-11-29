# LocalFlow Architecture

Technical overview of how LocalFlow works internally.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         ELECTRON APP                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   React UI  │  │  REST API   │  │    WebSocket Server     │  │
│  │  (Vite)     │  │  :9998      │  │    :9999                │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                │
│         └────────────────┴─────────────────────┘                │
│                          │                                      │
│                          ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  WORKFLOW ENGINE                          │   │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐   │   │
│  │  │  Executor  │  │ Orchestrator│  │   Tool Registry  │   │   │
│  │  │  (engine)  │  │    (AI)     │  │                  │   │   │
│  │  └────────────┘  └─────────────┘  └──────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                      │
│         ┌────────────────┼────────────────┐                     │
│         ▼                ▼                ▼                     │
│  ┌────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Node Types │  │   Plugins   │  │  LLM Manager│              │
│  │ (11 built  │  │ (~/.local   │  │ (llama.cpp) │              │
│  │  -in)      │  │  flow/)     │  │             │              │
│  └────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   ~/.localflow/       │
              │   ├── models/         │
              │   ├── plugins/        │
              │   └── workflows/      │
              └───────────────────────┘
```

---

## Directory Structure

```
localflow/
├── electron/
│   ├── main/                    # Main process (Node.js)
│   │   ├── index.ts             # App entry point
│   │   ├── restApi.ts           # REST API server
│   │   ├── wsServer.ts          # WebSocket server
│   │   ├── chatSessions.ts      # Master AI chat
│   │   ├── commandExecutor.ts   # Chat command execution
│   │   ├── workflowStorage.ts   # Save/load workflows
│   │   ├── templates.ts         # Built-in templates
│   │   ├── executor/
│   │   │   ├── engine.ts        # Workflow execution
│   │   │   ├── orchestrator.ts  # AI orchestrator logic
│   │   │   ├── orchestratorNode.ts
│   │   │   ├── nodeTypes.ts     # Node type definitions
│   │   │   ├── tools.ts         # Tool registry
│   │   │   └── workflowTool.ts  # Workflow-to-workflow
│   │   ├── llm/
│   │   │   ├── manager.ts       # LLM loading/inference
│   │   │   └── catalog.ts       # Available models
│   │   └── plugins/
│   │       ├── loader.ts        # Plugin discovery
│   │       └── registry.ts      # Plugin tool registration
│   └── preload/                 # Preload scripts
├── src/                         # React frontend
│   ├── components/
│   │   ├── WorkflowBuilder.tsx  # Main canvas
│   │   ├── NodePanel.tsx        # Left sidebar
│   │   ├── ChatPanel.tsx        # Right sidebar
│   │   └── nodes/               # Custom node components
│   └── App.tsx
├── mcp-server/                  # Claude Desktop integration
│   ├── index.js
│   └── README.md
└── docs/                        # Documentation
```

---

## Core Components

### 1. Workflow Engine (`executor/engine.ts`)

Executes workflows by:
1. Building a dependency graph from nodes/edges
2. Executing nodes in topological order
3. Passing outputs to connected inputs
4. Reporting progress via callbacks

```typescript
executeWorkflow(workflow, mainWindow) → Promise<ExecutionResult>
```

### 2. Node Types (`executor/nodeTypes.ts`)

Each node type defines:
- `id` - Unique identifier
- `name` - Display name
- `category` - trigger, input, ai, tool, output
- `inputs` - Input port names
- `outputs` - Output port names
- `config` - Configuration schema
- `execute(inputs, config, context)` - Execution function
- `toolSchema` - Optional schema for orchestrator

### 3. Tool Registry (`executor/tools.ts`)

Central registry of all tools the AI can use:
- Built-in tools (calculator, datetime, file ops, etc.)
- Plugin tools (auto-registered on load)
- Workflow tools (run_workflow, list_workflows)

```typescript
registerTool(tool)      // Add a tool
getTool(name)           // Get by name
getAllTools()           // List all
getToolNames()          // Just names
```

### 4. AI Orchestrator (`executor/orchestrator.ts`)

The autonomous AI agent that:
1. Receives a task
2. Builds a plan
3. Calls tools one at a time
4. Maintains memory of steps
5. Returns final result

Uses format:
```
ACTION: tool_name
INPUT: {"param": "value"}
```

### 5. LLM Manager (`llm/manager.ts`)

Handles local LLM operations:
- Model loading/unloading
- Text generation
- Chat sessions
- Uses node-llama-cpp (llama.cpp bindings)

### 6. Plugin System (`plugins/`)

Auto-discovers plugins from `~/.localflow/plugins/`:
1. `loader.ts` - Scans for manifest.json files
2. `registry.ts` - Registers tools with the system
3. Tools become available to orchestrator

### 7. Master AI Chat (`chatSessions.ts`)

Conversational interface that:
- Maintains session memory
- Builds system prompt with platform knowledge
- Parses commands from AI responses
- Executes commands via `commandExecutor.ts`

---

## Data Flow

### Running a Workflow

```
User clicks Run
      │
      ▼
React UI sends IPC message
      │
      ▼
Main process receives
      │
      ▼
engine.ts executes nodes
      │
      ├─► Regular nodes: execute directly
      │
      └─► Orchestrator node:
              │
              ▼
          orchestrator.ts plans
              │
              ▼
          Calls tools from registry
              │
              ▼
          LLM generates responses
              │
              ▼
          Returns final result
      │
      ▼
Progress sent via IPC/WebSocket
      │
      ▼
UI updates in real-time
```

### API Request Flow

```
HTTP Request → restApi.ts
      │
      ├─► GET /templates → templates.ts
      │
      ├─► POST /run → engine.ts
      │
      ├─► POST /chat → chatSessions.ts
      │         │
      │         └─► commandExecutor.ts
      │
      └─► GET/POST /workflows → workflowStorage.ts
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `index.ts` | App startup, window creation |
| `engine.ts` | Workflow execution |
| `orchestrator.ts` | AI agent logic |
| `nodeTypes.ts` | All node definitions |
| `tools.ts` | Tool registry |
| `restApi.ts` | HTTP API |
| `wsServer.ts` | WebSocket streaming |
| `chatSessions.ts` | Chat with AI |
| `workflowStorage.ts` | Persistence |
| `manager.ts` | LLM inference |

---

## Configuration

### App Data Location

```
~/.localflow/
├── models/              # Downloaded .gguf files
├── plugins/             # Custom plugins
├── workflows/           # Saved workflows (JSON)
├── model-state.json     # Current model info
└── cli-state.json       # App state
```

### Ports

| Port | Service |
|------|---------|
| 5173 | Vite dev server (UI) |
| 9998 | REST API |
| 9999 | WebSocket |

---

## Extension Points

1. **Add Node Type** → `nodeTypes.ts`
2. **Add Tool** → `tools.ts`
3. **Add Plugin** → `~/.localflow/plugins/`
4. **Add Template** → `templates.ts`
5. **Add API Endpoint** → `restApi.ts`
