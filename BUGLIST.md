# LocalFlow Bug List

## Critical Bugs

### BUG-001: Workflow Runs Twice
**Status:** Open
**Severity:** High
**Description:** When clicking the trigger node or run button, the workflow executes twice.
**Symptoms:**
- Logs show duplicate execution traces
- "2 connected tools" appears as "4 connected tools"
- Results are duplicated

**Likely Cause:** Event handler firing twice - possibly double-binding of click event or React StrictMode double-rendering.

**Files to investigate:**
- `src/components/Canvas/WorkflowCanvas.tsx`
- `src/components/Toolbar.tsx`
- `electron/main/index.ts` (IPC handlers)

---

### BUG-002: "No sequences left" LLM Error
**Status:** Open  
**Severity:** Medium
**Description:** Intermittent error from llama.cpp about sequence management.
**Error:** `Error: No sequences left`
**Symptoms:**
- LLM calls fail randomly
- More common with longer conversations/context

**Likely Cause:** Context/sequence slots not being released properly between calls.

**Files to investigate:**
- `electron/main/llm/manager.ts`
- `electron/main/llm/llama-worker.mjs`

---

### BUG-003: Orchestrator Executes Before Task Input
**Status:** Open
**Severity:** Medium  
**Description:** In topological sort, orchestrator sometimes executes before receiving input.
**Symptoms:**
- "[Orchestrator] No task provided" in logs
- Then runs again with proper input

**Likely Cause:** Tool edges affecting topological sort incorrectly, or node appearing multiple times.

**Files to investigate:**
- `electron/main/executor/engine.ts` (topologicalSort function)

---

## Minor Bugs

### BUG-004: Edge Styling Not Different for Tool Connections
**Status:** Open
**Severity:** Low
**Description:** Tool edges look the same as data flow edges. Should be different color/style.
**Expected:** Purple dashed lines for tool connections
**Actual:** Same gray animated lines

**Files to fix:**
- `src/components/Canvas/WorkflowCanvas.tsx` (defaultEdgeOptions)

---

### BUG-005: 1B Model Struggles with JSON Format
**Status:** Open (by design?)
**Severity:** Low
**Description:** Llama 3.2 1B often fails to produce correct JSON for tool inputs.
**Workaround:** Use 3B model or improve system prompt with examples.

---

## Fixed Bugs

### BUG-F001: Edge Handles Not Stored ✅
**Fixed in:** 371cace
**Description:** edge:add command wasn't storing sourceHandle/targetHandle
**Fix:** Added handle properties to edge object in ClaudeActivity.tsx

---

## Notes

- Run `tail -f /tmp/localflow*.log` to watch live logs
- Test scripts in `scripts/` folder for reproducing issues
