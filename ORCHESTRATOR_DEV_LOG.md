# AI Orchestrator Development Log

## Session: November 29, 2025

### Goal
Build the AI Orchestrator node - the core of LocalFlow that allows an AI agent to autonomously use tools to complete tasks.

### Key Requirements
1. Receives a task/goal as input
2. Has access to tools (MCP-compatible format)
3. Uses reasoning loop: Think → Act → Observe
4. Maintains memory of steps taken
5. Returns final result when done
6. Works with local Llama (sequential LLM calls)

### Progress

#### Step 1: Planning the Implementation ✅

**Files created:**
- `electron/main/executor/tools.ts` - Tool registry (MCP-compatible)
- `electron/main/executor/orchestrator.ts` - Orchestrator logic
- `electron/main/executor/orchestratorNode.ts` - Node wrapper

**Files modified:**
- `electron/main/index.ts` - imports and initializes tools + orchestrator
- `electron/main/executor/nodeTypes.ts` - added `registerNode()` function
- `src/components/Sidebar/Sidebar.tsx` - added AI Orchestrator to UI
- `src/components/Panel/PropertiesPanel.tsx` - added config fields
- `src/components/Canvas/CustomNode.tsx` - added icons/colors

---

#### Step 2: Building Tool Registry ✅

Created `electron/main/executor/tools.ts` with:
- MCP-compatible `Tool` interface
- Built-in tools: calculator, datetime, http_get, file_read, file_write, file_list
- Registry functions: getTool, getAllTools, registerTool
- `getToolDescriptionsForPrompt()` for LLM context

---

#### Step 3: Building Orchestrator Logic ✅

Created `electron/main/executor/orchestrator.ts` with:
- `OrchestratorMemory` interface for state tracking
- `buildSystemPrompt()` - creates tool-use instructions
- `parseResponse()` - extracts THOUGHT/ACTION/INPUT/DONE from LLM output
- `runOrchestrator()` - main reasoning loop

---

#### Step 4: Registering as Node ✅

Created `electron/main/executor/orchestratorNode.ts`:
- Wraps orchestrator as a node type
- Inputs: task
- Outputs: result, steps, memory
- Config: systemPrompt, maxSteps, tools (text field)

---

#### Step 5: Testing ✅

**Test Results:**

| Task | Tools | Result |
|------|-------|--------|
| Calculate 15% of 280 | calculator | ✅ PASS - Got 42 correctly |
| What is 25 times 17? | calculator | ✅ PASS - Got 425 correctly |
| Current date/time | datetime | ❌ FAIL - Hit max steps, wrong format |
| $500 - 30% = ? | calculator | ❌ FAIL - Wrong parameter format |
| List files in /Users/... | file_list | ❌ FAIL - Wrong JSON format |

**Key Finding: Model Limitation**

The 1B Llama model struggles with:
1. Following exact JSON input format for tool parameters
2. Choosing the correct tool consistently
3. Using proper parameter names (e.g., `{"path": "..."}` vs just `"..."`)

Simple direct math works. Complex multi-step or format-sensitive tasks fail.

**Options:**
- Try 3B model (already downloaded)
- Improve system prompt with more examples
- Both

---

#### Step 6: Critical Architecture Issue Discovered ⚠️

**THE PROBLEM:**

Current implementation has tools as a TEXT CONFIG FIELD:
```
config.tools = "calculator,datetime,http_get"
```

This is WRONG. User can't see what tools are available.

**HOW N8N DOES IT (CORRECT WAY):**

Tools are VISUAL NODES that connect to the orchestrator:

```
                    [Calculator] ───┐
                                    │
[Trigger] → [Task] → [Orchestrator] ← [Tools Port]
                                    │
                    [HTTP Request] ─┘
```

- AI Agent node has a special "Tools" connector
- User drags tool nodes and connects them
- Agent only has access to VISUALLY CONNECTED tools
- Tools don't pass data IN - they make themselves AVAILABLE

**KEY INSIGHT:**
> Tools don't pass data INTO the orchestrator.
> Tools make themselves AVAILABLE to the orchestrator.
> The orchestrator calls them when IT decides to.

---

### Architecture Redesign Required

See `ARCHITECTURE.md` Section: "Tool Connection Architecture" for full details.

**Summary of changes needed:**

1. **New edge type: "tool"** - Different from data flow edges
2. **Orchestrator gets "tools" input port** - Special port for tool connections
3. **Tool nodes have `canBeTool` + `toolSchema`** - Opt-in to being used as tools
4. **Executor discovers tools from connections** - Not from config text
5. **Visual distinction** - Tool edges look different (color, style)

**Files to modify:**
```
electron/main/executor/nodeTypes.ts    - Add toolSchema to nodes
electron/main/executor/engine.ts       - Discover tools from edges
electron/main/executor/orchestrator.ts - Accept tools as parameter
src/components/Canvas/WorkflowCanvas.tsx - Handle tool edge type
src/components/Canvas/CustomNode.tsx   - Render tool port
src/stores/workflowStore.ts           - Support tool edges
```

---

### Current State (NOT COMMITTED)

**Uncommitted files:**
```
Untracked:
  - electron/main/executor/orchestrator.ts
  - electron/main/executor/orchestratorNode.ts
  - electron/main/executor/tools.ts
  - scripts/test-orchestrator.js
  - scripts/test-orchestrator-tasks.js
  - ORCHESTRATOR_DEV_LOG.md

Modified:
  - electron/main/executor/nodeTypes.ts
  - electron/main/index.ts
  - src/components/Canvas/CustomNode.tsx
  - src/components/Panel/PropertiesPanel.tsx
  - src/components/Sidebar/Sidebar.tsx
  - src/components/ClaudeActivity/ClaudeActivity.tsx
  - ARCHITECTURE.md
```

**Decision needed:** Commit current state before redesign, or redesign first?

---

### Next Steps for Next Claude

1. **Read ARCHITECTURE.md** - Section "Tool Connection Architecture" has the full plan
2. **Decide:** Commit current (working but wrong architecture) or redesign first
3. **If redesigning:**
   - Start with edge types (tool vs data)
   - Add tool port to orchestrator node
   - Convert existing tools (calculator, etc.) to tool nodes
   - Update executor to discover from connections
4. **Test with 3B model** - May solve the format issues

---

### Known Issues

1. **"No sequences left" error** - LLM context sequence issue, intermittent
2. **Workflow runs twice** - UI triggers multiple executions sometimes
3. **Small model limitations** - 1B model can't follow complex formats

---

### Files Reference

```
electron/main/executor/
├── engine.ts          # Workflow executor
├── nodeTypes.ts       # Node definitions + registerNode()
├── orchestrator.ts    # Core reasoning loop
├── orchestratorNode.ts # Node wrapper
└── tools.ts           # Tool registry (6 built-in tools)

scripts/
├── test-orchestrator.js       # Basic orchestrator test
└── test-orchestrator-tasks.js # Multi-task test suite
```
