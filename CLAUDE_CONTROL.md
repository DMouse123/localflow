# LocalFlow - Claude Control Guide

> **Purpose:** This document explains how Claude can programmatically control, test, and develop the LocalFlow application without needing human GUI interaction.

---

## Quick Reference

```bash
# Navigate to project
cd /Users/developer/Documents/PROJECTS/ELECTRON_DOC_EDITOR/localflow

# Run the CLI
node scripts/test-cli/index.js <command>
```

---

## 1. Model Operations

### List Available Models
```bash
node scripts/test-cli/index.js models list
```
Shows all models, their download status, and which is loaded.

### Download a Model
```bash
node scripts/test-cli/index.js models download llama-3.2-1b-q4
node scripts/test-cli/index.js models download llama-3.2-3b-q4
node scripts/test-cli/index.js models download smollm2-1.7b-q4
```
Downloads take time based on size (0.77GB - 2GB).

### Load a Model (into memory)
```bash
node scripts/test-cli/index.js models load llama-3.2-1b-q4
```
Must be downloaded first. Takes 5-30 seconds depending on model size.

### Unload Model (free memory)
```bash
node scripts/test-cli/index.js models unload
```

### Check Status
```bash
node scripts/test-cli/index.js models status
```

---

## 2. Chat with AI

### Basic Chat
```bash
node scripts/test-cli/index.js chat "Your message here"
```
Requires a model to be loaded. Response streams to stdout.

### Examples
```bash
node scripts/test-cli/index.js chat "What is 2 + 2?"
node scripts/test-cli/index.js chat "Write a haiku about coding"
node scripts/test-cli/index.js chat "Explain quantum computing briefly"
```

---

## 3. Workflow Operations

### List Workflows
```bash
node scripts/test-cli/index.js workflow list
```
Shows all saved workflows in `~/.localflow/workflows/`

### Create Workflow
```bash
node scripts/test-cli/index.js workflow create "My Workflow Name"
```

### Run Workflow (Execute!)
```bash
node scripts/test-cli/index.js workflow run <workflow-id>
```
Executes the workflow, automatically loading a model if needed. Shows execution progress and node outputs.

### Delete Workflow
```bash
node scripts/test-cli/index.js workflow delete <workflow-id>
```

---

## 4. Running Tests

### Full Test Suite
```bash
node scripts/test-cli/index.js test all
```
Runs all tests: models, chat, workflows.

### Individual Tests
```bash
node scripts/test-cli/index.js test models
node scripts/test-cli/index.js test chat
node scripts/test-cli/index.js test workflows
```

---

## 5. Starting/Stopping the GUI App

### Easy Control (Recommended)
```bash
cd /Users/developer/Documents/PROJECTS/ELECTRON_DOC_EDITOR/localflow

# Check status
node scripts/claude-remote.js status

# Start the app
node scripts/claude-remote.js start

# Stop the app
node scripts/claude-remote.js stop

# Restart the app
node scripts/claude-remote.js restart
```

### Alternative: Direct Scripts
```bash
./scripts/app.sh start
./scripts/app.sh stop
./scripts/app.sh restart
./scripts/app.sh status
```

### Manual (old way)
```bash
# Start
npm run dev

# Stop
pkill -f "localflow.*Electron"
lsof -ti:5173 | xargs kill -9
```

---

## 6. File Locations

| What | Path |
|------|------|
| Project Root | `/Users/developer/Documents/PROJECTS/ELECTRON_DOC_EDITOR/localflow` |
| Downloaded Models | `~/.localflow/models/` |
| Saved Workflows | `~/.localflow/workflows/` |
| CLI State | `~/.localflow/cli-state.json` |
| Main Process | `electron/main/index.ts` |
| Renderer (React) | `src/` |
| LLM Manager | `electron/main/llm/manager.ts` |
| Test CLI | `scripts/test-cli/index.js` |

---

## 7. Development Workflow

### After Making Code Changes

1. **Renderer changes (React/UI):** Auto-reloads via Vite HMR
2. **Main process changes (Electron):** Restart the app:
   ```bash
   pkill -f "localflow.*Electron"
   cd /Users/developer/Documents/PROJECTS/ELECTRON_DOC_EDITOR/localflow && npm run dev
   ```

### Adding New Features

1. Edit source files in `src/` (renderer) or `electron/main/` (main process)
2. Add IPC handlers in `electron/main/index.ts`
3. Expose via preload in `electron/preload/index.ts`
4. Update CLI in `scripts/test-cli/index.js` for testing

---

## 8. Current Project Status

### Completed ✅
- [x] Phase 1: Basic workflow canvas (drag/drop nodes, connect, save/load)
- [x] Phase 2: LLM integration (download, load, chat)
- [x] Phase 3a: Node types (trigger, text-input, ai-chat, ai-transform, debug)
- [x] Phase 3b: Workflow execution engine (CLI + GUI!)
- [x] GUI: Run button and Output panel
- [x] GUI: Node configuration in Properties panel
- [x] AI Assistant (self-teaching chat bubble)
- [x] Templates (5 pre-built workflows)
- [x] Test CLI for Claude control
- [x] **Claude Remote Control** - Real-time visible testing ✨ NEW

### Not Started
- [ ] Phase 4: More node types (HTTP Request, Filter/Condition, Loop, File Read/Write)
- [ ] Phase 5: AI Agent node (ReAct loop, tool calling)
- [ ] Phase 6: Polish (undo/redo, copy/paste, dark mode)

---

## 9. Troubleshooting

### "Port 5173 is already in use"
```bash
lsof -ti:5173 | xargs kill -9
```

### Model won't load
- Check if downloaded: `node scripts/test-cli/index.js models list`
- Check disk space: `df -h ~/.localflow`
- Check RAM: Model needs ~2x its size in RAM

### App won't start
```bash
# Full cleanup and restart
pkill -f localflow
rm -rf dist-electron
npm run dev
```

---

## 10. Example Session

Here's a complete example of Claude testing the app:

```bash
# 1. Check what models are available
node scripts/test-cli/index.js models list

# 2. Load a model (must be downloaded first)
node scripts/test-cli/index.js models load llama-3.2-1b-q4

# 3. Test the chat
node scripts/test-cli/index.js chat "Hello! What can you do?"

# 4. Test more complex prompt
node scripts/test-cli/index.js chat "Explain the concept of recursion in 2 sentences"

# 5. Check workflows
node scripts/test-cli/index.js workflow list

# 6. Create a test workflow
node scripts/test-cli/index.js workflow create "Claude Test Workflow"

# 7. Run full test suite
node scripts/test-cli/index.js test all

# 8. Clean up - unload model to free RAM
node scripts/test-cli/index.js models unload
```

---

## 11. Extending the CLI

To add new CLI capabilities, edit `scripts/test-cli/index.js`:

1. Add the function (e.g., `async function myNewFeature() { ... }`)
2. Add to the switch statement in `main()`
3. Update the help text

The CLI uses the same `node-llama-cpp` library as the Electron app, so testing here validates the core functionality.

---

## 12. Notes for Future Claude Instances

- **Always check model status** before attempting chat
- **The CLI and GUI share state** - workflows saved in GUI appear in CLI and vice versa
- **Models are large** - downloading takes time, be patient
- **RAM matters** - 1B model needs ~2GB RAM, 3B needs ~6GB
- **Use Desktop Commander** - All file/process operations go through the MCP tools
- **Read FIRST.md** for the complete project roadmap

---

*Last updated: 2025-11-28*


---

## 13. Available Templates

Pre-built workflows ready to test:

| Template | ID | Description |
|----------|-----|-------------|
| 💬 Simple Q&A | `wf_template_qa` | Ask a question, get answer |
| 📝 Text Summarizer | `wf_template_summarizer` | Summarize text to bullet points |
| ✨ Creative Story | `wf_template_story` | Generate short creative stories |
| 🌍 Translator | `wf_template_translator` | Translate English to Spanish |
| 💻 Code Explainer | `wf_template_code` | Explain code in plain English |

### Run a template:
```bash
node scripts/test-cli/index.js workflow run wf_template_qa
node scripts/test-cli/index.js workflow run wf_template_story
```

---

## 14. GUI Features

The app now has:

### Header Bar
- **Workflow name** (editable)
- **Run button** (green) - executes workflow
- **Terminal button** - toggles output panel
- **Save button**

### Sidebar (3 tabs)
- **Templates** - Pre-built workflows, click to load
- **Nodes** - Drag & drop to canvas
- **Models** - Download/load AI models

### Canvas
- Drag nodes from sidebar
- Connect nodes by dragging handles
- Click node to select → shows Properties panel
- Delete with Delete/Backspace key

### Properties Panel (right side)
- Shows when node selected
- Node-specific configuration:
  - Text Input: text content
  - AI Chat: system prompt, max tokens, temperature
  - AI Transform: instruction, max tokens
  - Debug: label

### Output Panel (bottom)
- Shows execution logs
- Toggle with Terminal button
- Clear logs button
- Minimize/expand

### AI Assistant (bottom-right)
- Sparkle button to open
- Ask questions about building workflows
- Context-aware (knows current workflow state)

---

*Last updated: 2025-11-28 15:20*


---

## 15. Claude Remote Control (NEW!)

Claude can now control the app in real-time while you watch!

### Start the Demo
```bash
# Make sure app is running first
npm run dev

# In another terminal, run the demo
node scripts/claude-remote.js demo
```

### What You'll See
1. "🤖 Claude Connected" banner appears in top-right
2. "🤔 Thinking..." messages as Claude works
3. Nodes appearing on the canvas
4. Edges connecting automatically
5. Workflow runs at the end

### Available Commands (for Claude)

```javascript
// Thinking message (shows in UI)
await think("I'm going to build a workflow...")

// Add nodes
const nodeId = await addNode('text-input', { text: 'Hello' }, 'My Label')
const nodeId2 = await addNode('ai-chat', { systemPrompt: '...' }, 'AI')
const nodeId3 = await addNode('debug', { label: 'Output' }, 'Debug')

// Connect nodes
await connectNodes(nodeId, nodeId2)
await connectNodes(nodeId2, nodeId3)

// Clear canvas
await clearWorkflow()

// Run workflow
await runWorkflow()
```

### Port
WebSocket server runs on `ws://localhost:9999`

---

*Last updated: 2025-11-28 15:30*
