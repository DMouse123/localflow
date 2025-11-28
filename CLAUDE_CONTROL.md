# LocalFlow - Claude Control Guide

> **Purpose:** This document explains how Claude can programmatically control, test, and develop the LocalFlow application without needing human GUI interaction.

---

## 🚀 QUICK START FOR NEW CLAUDE INSTANCES

```bash
# 1. Navigate to project
cd /Users/developer/Documents/PROJECTS/ELECTRON_DOC_EDITOR/localflow

# 2. Check if app is running
node scripts/claude-remote.js status

# 3. If not running, start it
node scripts/claude-remote.js start

# 4. Run the visual demo (human watches as you build a workflow!)
node scripts/claude-remote.js demo

# 5. Or test via CLI
node scripts/test-cli/index.js models status
node scripts/test-cli/index.js workflow list
node scripts/test-cli/index.js workflow run wf_template_qa
```

---

## 📁 Project Overview

**LocalFlow** is a visual AI workflow automation tool that runs entirely locally.

| Component | Location | Purpose |
|-----------|----------|---------|
| React UI | `src/` | Visual canvas, sidebar, panels |
| Electron Main | `electron/main/` | LLM, execution engine, IPC |
| Node Types | `electron/main/executor/nodeTypes.ts` | Define node behaviors |
| Execution Engine | `electron/main/executor/engine.ts` | Runs workflows |
| LLM Manager | `electron/main/llm/manager.ts` | Load/run local AI models |
| Test CLI | `scripts/test-cli/index.js` | Test without GUI |
| Remote Control | `scripts/claude-remote.js` | Control app in real-time |

---

## 🎮 Two Ways to Control the App

### Method 1: Remote Control (Real-time, Human Watches)

```bash
# Start/stop/restart the app
node scripts/claude-remote.js start
node scripts/claude-remote.js stop
node scripts/claude-remote.js restart
node scripts/claude-remote.js status

# Run the demo - human sees nodes appear in real-time!
node scripts/claude-remote.js demo
```

When connected, you can send commands and the human sees everything happen live in the GUI.

### Method 2: CLI Testing (Headless)

```bash
# Models
node scripts/test-cli/index.js models list
node scripts/test-cli/index.js models load llama-3.2-1b-q4
node scripts/test-cli/index.js models status

# Chat directly
node scripts/test-cli/index.js chat "Hello world"

# Workflows
node scripts/test-cli/index.js workflow list
node scripts/test-cli/index.js workflow run <workflow-id>
node scripts/test-cli/index.js workflow run wf_template_qa
```

---

## 🔧 Development Workflow

### After Editing Code

| Change Type | What to Do |
|-------------|------------|
| React/UI (`src/`) | Auto-reloads via Vite HMR |
| Main process (`electron/main/`) | Restart app: `node scripts/claude-remote.js restart` |
| Added new IPC handler | Also update `electron/preload/index.ts` |

### Adding a New Node Type

1. Add node definition in `electron/main/executor/nodeTypes.ts`
2. Add to NODE_TYPES registry in same file
3. Add UI entry in `src/components/Sidebar/Sidebar.tsx` (nodeCategories)
4. Add config fields in `src/components/Panel/PropertiesPanel.tsx` (NODE_CONFIGS)
5. Test: `node scripts/claude-remote.js restart` then run a workflow

### Git Workflow

```bash
cd /Users/developer/Documents/PROJECTS/ELECTRON_DOC_EDITOR/localflow
git add .
git commit -m "Description of changes"
git push
```

---

## 📍 Key File Locations

| What | Path |
|------|------|
| Project Root | `/Users/developer/Documents/PROJECTS/ELECTRON_DOC_EDITOR/localflow` |
| Downloaded Models | `~/.localflow/models/` |
| Saved Workflows | `~/.localflow/workflows/` |
| CLI State | `~/.localflow/cli-state.json` |

---

## ✅ Current Status

### Completed
- [x] Visual workflow canvas (drag/drop, connect, save/load)
- [x] Local LLM integration (Llama 3.2 1B/3B)
- [x] Node types: trigger, text-input, ai-chat, ai-transform, debug
- [x] Workflow execution (CLI + GUI)
- [x] Run button + Output panel
- [x] Node configuration in Properties panel
- [x] 5 pre-built templates
- [x] AI Assistant (self-teaching chat)
- [x] Claude Remote Control (real-time testing)
- [x] App control scripts (start/stop/restart)
- [x] Git repo on GitHub

### Not Started
- [ ] HTTP Request node
- [ ] File Read/Write nodes
- [ ] Loop node
- [ ] Filter/Condition node
- [ ] AI Agent node (ReAct loop)
- [ ] Undo/redo
- [ ] Dark mode

---

## 🧪 Testing Checklist

Before considering a feature complete:

```bash
# 1. App starts without errors
node scripts/claude-remote.js restart

# 2. Run the demo
node scripts/claude-remote.js demo

# 3. Test templates via CLI
node scripts/test-cli/index.js workflow run wf_template_qa
node scripts/test-cli/index.js workflow run wf_template_story

# 4. Commit if all passes
git add . && git commit -m "Feature: description" && git push
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 5173 in use | `lsof -ti:5173 \| xargs kill -9` |
| Port 9999 in use | `lsof -ti:9999 \| xargs kill -9` |
| App won't start | `node scripts/claude-remote.js stop` then `start` |
| Model won't load | Check RAM (need ~2x model size) |
| "No model loaded" | `node scripts/test-cli/index.js models load llama-3.2-1b-q4` |

---

## 📝 Available Templates

| Template | Command |
|----------|---------|
| Simple Q&A | `node scripts/test-cli/index.js workflow run wf_template_qa` |
| Text Summarizer | `node scripts/test-cli/index.js workflow run wf_template_summarizer` |
| Creative Story | `node scripts/test-cli/index.js workflow run wf_template_story` |
| Translator | `node scripts/test-cli/index.js workflow run wf_template_translator` |
| Code Explainer | `node scripts/test-cli/index.js workflow run wf_template_code` |

---

## 🔌 Remote Control API

When connected via `node scripts/claude-remote.js connect`, you can use:

```javascript
await think("Message shown to human")     // Show thinking in UI
await addNode('text-input', {text: 'Hi'}, 'Label')  // Add node
await connectNodes(id1, id2)              // Connect nodes
await clearWorkflow()                      // Clear canvas
await runWorkflow()                        // Execute
await loadModel('llama-3.2-1b-q4')        // Load AI model
```

---

*Last updated: 2025-11-28*
*GitHub: https://github.com/DMouse123/localflow*
