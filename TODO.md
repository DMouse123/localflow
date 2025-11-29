# LocalFlow TODO

## ✅ Completed

### Core App
- [x] Visual workflow builder with drag-and-drop
- [x] 11 built-in tool nodes
- [x] AI Orchestrator (autonomous tool selection)
- [x] Local LLM integration (llama.cpp)
- [x] Templates system

### APIs
- [x] REST API on port 9998 (health, templates, run)
- [x] WebSocket API on port 9999 (real-time streaming)
- [x] Full schema discovery for templates
- [x] Custom parameters support

### Plugin System
- [x] Auto-discovery from `~/.localflow/plugins/`
- [x] Manifest-based tool definition
- [x] Plugin tools work with orchestrator
- [x] Hello-world example plugin

### Master AI Chat
- [x] Chat interface in app
- [x] System prompt with full platform knowledge
- [x] Session memory (multi-turn conversations)
- [x] Chat API for external access (POST /chat)

### MCP Server
- [x] MCP server package (mcp-server/)
- [x] 4 tools: health, list_templates, run_workflow, chat
- [x] Claude Desktop configuration instructions
- [ ] Test with Claude Desktop (user testing)

### Documentation
- [x] README.md (complete overview)
- [x] docs/REST_API.md
- [x] docs/WEBSOCKET_API.md
- [x] docs/CHAT_API.md
- [x] PLUGIN_ARCHITECTURE.md
- [x] mcp-server/README.md

---

## 🔲 TODO

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
