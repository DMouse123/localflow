# LocalFlow TODO

## ✅ Completed

### Phase 1: Core App
- [x] Visual workflow builder with drag-and-drop
- [x] 11 built-in tool nodes
- [x] AI Orchestrator (autonomous tool selection)
- [x] Local LLM integration (llama.cpp)
- [x] Templates system

### Phase 2: Headless Execution
- [x] Templates in main process
- [x] Direct execution via WebSocket
- [x] `workflow:runTemplate` command

### Phase 3: REST API
- [x] HTTP server on port 9998
- [x] `GET /health`
- [x] `GET /templates` - full schema discovery
- [x] `GET /templates/:id`
- [x] `POST /run` with custom params

### Phase 4: Plugin System
- [x] Auto-discovery from `~/.localflow/plugins/`
- [x] Manifest-based tool definition
- [x] Plugin tools work with orchestrator
- [x] Hello-world example plugin

### Phase 5: Documentation
- [x] docs/REST_API.md
- [x] docs/WEBSOCKET_API.md
- [x] PLUGIN_ARCHITECTURE.md

---

## 🔲 TODO

### Master AI Chat
- [x] Chat interface in app (upgraded existing)
- [x] System prompt with full platform knowledge
- [x] Can see all nodes, tools, plugins, templates
- [x] Can explain the system to users
- [x] Can suggest workflow designs from descriptions
- [x] Can build workflows from conversation (command blocks)
- [x] Can run workflows via commands
- [x] Remembers conversation context (session memory)
- [x] Chat API for external access (POST /chat)
- [ ] Improve command execution reliability (local model inconsistent)

### MCP Server Integration
- [x] Create MCP server package
- [x] Expose `list_templates` as MCP tool
- [x] Expose `run_workflow` as MCP tool  
- [x] Expose `chat` as MCP tool (talk to Master AI)
- [x] Expose `health` as MCP tool
- [ ] Test with Claude Desktop
- [x] Document MCP setup (mcp-server/README.md)
- [x] Add to Claude Desktop config instructions

### Workflow Composability
- [ ] Create `tool-workflow` node type
- [ ] Allow workflows to call other workflows
- [ ] Pass outputs between workflows
- [ ] Test nested workflow execution

### Persistence
- [ ] Save custom workflows to disk (~/.localflow/workflows/)
- [ ] Load saved workflows via API
- [ ] `GET /workflows` - list saved workflows
- [ ] `POST /workflows` - save new workflow
- [ ] `DELETE /workflows/:id`
- [ ] Save/load in UI

### UI Improvements
- [ ] Fix edge animation bug (BUGLIST.md)
- [ ] Improve debug node output display
- [ ] Plugin tools in sidebar

---

## Ideas / Future
- [ ] Webhook triggers (run workflow on HTTP POST)
- [ ] Scheduled workflows (cron-like)
- [ ] Workflow versioning
- [ ] Result caching
- [ ] Parallel tool execution
- [ ] Custom tool creation UI
- [ ] Visual workflow diff/history
