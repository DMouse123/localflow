# LocalFlow Architecture & Design Document

> **Version:** 1.0
> **Date:** November 29, 2025
> **Status:** Foundation Complete, Plugin System Planned

---

## Table of Contents

1. [Vision & Goals](#vision--goals)
2. [Current Architecture](#current-architecture)
3. [Plugin System Design](#plugin-system-design)
4. [AI Orchestrator Design](#ai-orchestrator-design)
5. [Node Specification](#node-specification)
6. [Data Flow](#data-flow)
7. [Development Rules](#development-rules)
8. [Roadmap](#roadmap)

---

## Vision & Goals

### What LocalFlow Is
A **visual workflow automation tool** with **local AI capabilities** that allows users to:
- Build workflows by connecting nodes on a canvas
- Run AI models 100% locally (no cloud, no API keys)
- Create automations that process data, call APIs, read/write files
- Deploy AI agents that autonomously complete tasks using tools

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Local First** | AI runs on user's machine. Data never leaves. |
| **Visual** | Drag, drop, connect. See the flow. |
| **Extensible** | Plugins can add new nodes without modifying core |
| **Sequential Execution** | One LLM call at a time (local constraint) |
| **Open** | Open source, community-driven |

### Non-Goals (for now)
- Cloud execution
- Multi-user collaboration
- Parallel LLM inference
- Mobile apps

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

### Current Node Registration (3 Places!)

**Problem:** Nodes are defined in 3 separate places:

1. **Backend** (`electron/main/executor/nodeTypes.ts`)
   - `NodeTypeDefinition` interface
   - `execute()` function
   - `NODE_TYPES` registry

2. **Sidebar** (`src/components/Sidebar/Sidebar.tsx`)
   - `nodeCategories` object
   - Icons, colors, labels

3. **Properties** (`src/components/Panel/PropertiesPanel.tsx`)
   - `NODE_CONFIGS` object
   - Form field definitions

**Impact:** Adding a new node requires editing 3 files.

---

## Plugin System Design

### Goals
- Developers can create nodes as separate packages
- Drop plugin in folder → app loads it automatically
- No core code modification needed
- Plugins can be shared/distributed

### Plugin Directory Structure

```
~/.localflow/plugins/
├── my-custom-node/
│   ├── manifest.json        # Plugin metadata
│   ├── node.js              # Node implementation
│   └── icon.svg             # (optional) Custom icon
├── weather-api/
│   ├── manifest.json
│   └── node.js
└── database-connector/
    ├── manifest.json
    └── node.js
```

### Plugin Manifest (`manifest.json`)

```json
{
  "id": "my-custom-node",
  "name": "My Custom Node",
  "version": "1.0.0",
  "author": "Developer Name",
  "description": "Does something useful",
  "category": "data",
  "main": "node.js",
  "icon": "icon.svg",
  "color": "#3b82f6",
  
  "inputs": [
    { "id": "input", "name": "Input", "type": "any" }
  ],
  "outputs": [
    { "id": "output", "name": "Output", "type": "any" }
  ],
  
  "config": [
    {
      "key": "apiKey",
      "label": "API Key",
      "type": "text",
      "placeholder": "Enter API key...",
      "required": true
    },
    {
      "key": "timeout",
      "label": "Timeout (ms)",
      "type": "number",
      "default": 5000
    }
  ]
}
```

### Plugin Implementation (`node.js`)

```javascript
/**
 * Node execution function
 * 
 * @param {Object} inputs - Data from connected input nodes
 * @param {Object} config - User configuration from Properties panel
 * @param {Object} context - Execution context with utilities
 * @returns {Object} - Output data for connected nodes
 */
module.exports = async function execute(inputs, config, context) {
  // context provides:
  // - context.log(message)        Log to output panel
  // - context.llm.generateSync()  Call the local LLM
  // - context.http(url, options)  Make HTTP requests
  // - context.fs.read(path)       Read files (sandboxed)
  // - context.fs.write(path,data) Write files (sandboxed)
  
  const result = await doSomething(inputs.input, config.apiKey);
  
  return {
    output: result
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
│    (from nodeTypes.ts)          │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ 2. Scan ~/.localflow/plugins/   │
│    Find all manifest.json       │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ 3. For each plugin:             │
│    - Validate manifest          │
│    - Load node.js               │
│    - Register in NODE_TYPES     │
│    - Send to renderer           │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ 4. Renderer receives plugin list│
│    - Add to Sidebar             │
│    - Add to Properties configs  │
└─────────────────────────────────┘
```

### Security Considerations

| Risk | Mitigation |
|------|------------|
| Malicious code execution | Plugins run in Node.js (same as core) - trust model same as npm packages |
| File system access | Provide sandboxed `context.fs` that limits to allowed directories |
| Network access | Allow but log all outbound requests |
| LLM abuse | Rate limiting on `context.llm` calls |

---

## AI Orchestrator Design

### Concept

The AI Orchestrator is a **special node type** that:
1. Receives a task/goal
2. Has access to tools (other nodes/plugins)
3. Uses an LLM to decide which tools to use
4. Executes tools in sequence
5. Maintains memory of what it's done
6. Returns final result when goal is complete

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AI ORCHESTRATOR                       │
│                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │    TASK     │    │   MEMORY    │    │   TOOLS     │  │
│  │   (input)   │    │   (state)   │    │ (available) │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│         │                  │                   │         │
│         ▼                  ▼                   ▼         │
│  ┌─────────────────────────────────────────────────────┐│
│  │                   REASONING LOOP                     ││
│  │                                                      ││
│  │   1. Look at task + memory                          ││
│  │   2. Decide: done? or need action?                  ││
│  │   3. If need action: pick tool + parameters         ││
│  │   4. Execute tool                                   ││
│  │   5. Store result in memory                         ││
│  │   6. Repeat until done or max steps                 ││
│  │                                                      ││
│  └─────────────────────────────────────────────────────┘│
│         │                                                │
│         ▼                                                │
│  ┌─────────────┐                                        │
│  │   RESULT    │                                        │
│  │  (output)   │                                        │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

### Tool System

Tools are nodes that the orchestrator can use. They must be:
1. **Self-describing** - Have clear name, description, inputs, outputs
2. **Stateless** - Same inputs always produce same outputs
3. **Atomic** - Do one thing well

```javascript
// Tool registration for orchestrator
const tools = {
  calculator: {
    name: "Calculator",
    description: "Performs mathematical calculations. Input: math expression. Output: result.",
    execute: (expression) => eval(expression) // simplified
  },
  http_get: {
    name: "HTTP GET",
    description: "Fetches data from a URL. Input: URL string. Output: response body.",
    execute: async (url) => fetch(url).then(r => r.text())
  },
  file_read: {
    name: "Read File",
    description: "Reads content from a file. Input: file path. Output: file contents.",
    execute: (path) => fs.readFileSync(path, 'utf-8')
  }
};
```

### Memory Structure

```javascript
{
  // The original task
  task: "Find the weather in Tokyo and save it to a file",
  
  // What the agent has done
  steps: [
    {
      thought: "I need to get weather data for Tokyo",
      action: "http_get",
      input: "https://api.weather.com/tokyo",
      result: "{ temp: 22, condition: 'sunny' }",
      timestamp: "2025-11-29T08:00:00Z"
    },
    {
      thought: "Now I need to save this to a file",
      action: "file_write",
      input: { path: "/tmp/tokyo-weather.txt", content: "22°C, sunny" },
      result: "success",
      timestamp: "2025-11-29T08:00:01Z"
    }
  ],
  
  // Current status
  status: "complete", // or "in_progress", "error"
  
  // Final answer
  result: "I found that Tokyo is 22°C and sunny, and saved this to /tmp/tokyo-weather.txt"
}
```

### Orchestrator as Core vs Plugin

**Decision: CORE**

Reasons:
1. Fundamental to LocalFlow's value proposition
2. Needs deep integration with LLM manager
3. Needs to discover and use other plugins as tools
4. Complex state management
5. Should "just work" out of the box

However, the orchestrator will USE the plugin system:
- Plugins register as tools
- Orchestrator discovers available tools
- Users can enable/disable which tools agent can use

---

## Node Specification

### Standard Node Interface

Every node (core or plugin) must conform to this interface:

```typescript
interface NodeDefinition {
  // === IDENTITY ===
  id: string;              // Unique identifier (e.g., "http-request")
  name: string;            // Display name (e.g., "HTTP Request")
  version: number;         // Version number for compatibility
  
  // === CATEGORIZATION ===
  category: 'trigger' | 'ai' | 'data' | 'output' | 'control' | 'custom';
  description: string;     // Short description for tooltip
  
  // === UI ===
  icon: string;            // Lucide icon name or path to SVG
  color: string;           // Hex color for node accent
  
  // === PORTS ===
  inputs: Port[];          // Input connection points
  outputs: Port[];         // Output connection points
  
  // === CONFIGURATION ===
  config: ConfigField[];   // User-configurable fields
  
  // === EXECUTION ===
  execute: ExecuteFunction;
}

interface Port {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  description?: string;
}

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'range';
  default?: any;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];  // For select type
  min?: number;           // For number/range
  max?: number;           // For number/range
  step?: number;          // For range
}

type ExecuteFunction = (
  inputs: Record<string, any>,
  config: Record<string, any>,
  context: ExecutionContext
) => Promise<Record<string, any>>;

interface ExecutionContext {
  log: (message: string) => void;
  llm: {
    generateSync: (prompt: string, options?: LLMOptions) => Promise<string>;
  };
  http: (url: string, options?: RequestOptions) => Promise<Response>;
  fs: {
    read: (path: string) => Promise<string>;
    write: (path: string, content: string) => Promise<void>;
    exists: (path: string) => Promise<boolean>;
  };
  workflowId: string;
  nodeId: string;
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
│    - All nodes connected?       │
│    - Required configs set?      │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 2. Topological sort             │
│    - Determine execution order  │
│    - Detect cycles (error)      │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 3. Execute nodes in order       │
│    For each node:               │
│    a. Gather inputs from edges  │
│    b. Get config from node data │
│    c. Call execute() function   │
│    d. Store outputs             │
│    e. Send progress to UI       │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 4. Complete                     │
│    - Send final status          │
│    - Display outputs            │
└─────────────────────────────────┘
```

### Data Between Nodes

```javascript
// Output from Node A
{ 
  response: "Hello world",
  status: 200 
}

// Edge connects Node A (output: "response") to Node B (input: "text")

// Input to Node B
{
  text: "Hello world"  // Mapped from response
}
```

---

## Development Rules

### For Core Development

1. **Don't break existing nodes** - Maintain backwards compatibility
2. **Keep node definitions together** - Work towards single source of truth
3. **Document IPC channels** - Every new channel needs documentation
4. **Test via CLI first** - Use test-cli before UI testing
5. **Commit working code** - Don't push broken builds

### For Plugin Development

1. **Use manifest.json** - Always include complete manifest
2. **Handle errors gracefully** - Never throw unhandled exceptions
3. **Document inputs/outputs** - Be explicit about what node expects
4. **Keep it focused** - One node = one responsibility
5. **No global state** - Plugins must be stateless between executions

### Code Style

- TypeScript for core code
- JavaScript allowed for plugins (lower barrier)
- Use async/await (no callbacks)
- Meaningful variable names
- Comments for complex logic

---

## Roadmap

### Phase 1: Current State ✅
- [x] Visual canvas with React Flow
- [x] Core nodes (trigger, text, ai-chat, ai-transform, debug)
- [x] Data nodes (http, file-read, file-write, json-parse, loop)
- [x] Basic AI Agent (ReAct with calculator/datetime)
- [x] LLM integration (Llama 3.2 local)
- [x] Workflow save/load
- [x] Execution engine
- [x] Output panel
- [x] Node status visualization

### Phase 2: Plugin System 🔲
- [ ] Design plugin manifest schema
- [ ] Create plugin loader in main process
- [ ] Send plugin data to renderer via IPC
- [ ] Dynamic sidebar from plugins
- [ ] Dynamic properties panel from plugins
- [ ] Sample plugin template
- [ ] Plugin documentation

### Phase 3: AI Orchestrator 🔲
- [ ] Design orchestrator node
- [ ] Tool registry system
- [ ] Memory/state management
- [ ] Reasoning loop implementation
- [ ] Tool discovery from plugins
- [ ] Max steps / timeout handling
- [ ] Orchestrator UI (show thinking)

### Phase 4: Advanced Features 🔲
- [ ] Trigger types (webhook, schedule, file watch)
- [ ] Conditional branching (if/else node)
- [ ] Sub-workflows (workflow as node)
- [ ] Variables / global state
- [ ] Undo/redo
- [ ] Dark mode
- [ ] Workflow templates library

### Phase 5: Polish & Distribution 🔲
- [ ] Installer packages (Mac, Windows, Linux)
- [ ] Auto-update
- [ ] Plugin marketplace concept
- [ ] Documentation site
- [ ] Tutorial videos

---

## Appendix

### IPC Channels Reference

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `llm:list-models` | R→M | Get available models |
| `llm:load-model` | R→M | Load a model |
| `llm:generate` | R→M | Generate text (streaming) |
| `llm:generation-chunk` | M→R | Stream chunk |
| `workflow:save` | R→M | Save workflow to disk |
| `workflow:load` | R→M | Load workflow from disk |
| `workflow:execute` | R→M | Run workflow |
| `workflow:node-progress` | M→R | Node status update |
| `workflow:log` | M→R | Log message |
| `app:quit` | R→M | Quit app |
| `app:restart` | R→M | Restart app |

*R = Renderer, M = Main*

### Environment

- **Node.js:** 18+
- **Electron:** 27+
- **React:** 18+
- **Platform:** macOS (primary), Windows/Linux (planned)

---

*This document should be updated as architecture evolves.*
