# LocalFlow TODO

## ✅ Completed

### Core App
- [x] Visual workflow builder with drag-and-drop
- [x] 11 built-in tool nodes
- [x] AI Orchestrator (autonomous tool selection)
- [x] Local LLM integration (llama.cpp)
- [x] Templates system

### APIs
- [x] REST API on port 9998 (health, templates, run, chat)
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
- [x] Command execution (addNode, connect, clear, loadTemplate, run)
- [x] Workflow state tracking per session
- [x] GET /chat/:sessionId/workflow endpoint
- [x] Parser handles multiple command formats
- [x] Works reliably with Qwen 2.5 3B (function-calling model)

### MCP Server
- [x] MCP server package (mcp-server/)
- [x] 4 tools: health, list_templates, run_workflow, chat
- [x] Claude Desktop configuration instructions

### Documentation
- [x] README.md
- [x] docs/REST_API.md
- [x] docs/WEBSOCKET_API.md
- [x] docs/CHAT_API.md
- [x] docs/DEVELOPER_GUIDE.md (plugin & tool creation guide)
- [x] docs/ARCHITECTURE.md (system design overview)
- [x] docs/NODE_REFERENCE.md (all built-in nodes)
- [x] docs/CONTRIBUTING.md (how to contribute)
- [x] PLUGIN_ARCHITECTURE.md
- [x] mcp-server/README.md

---

## 🔲 TODO

### Persistence (Workflow Save/Load)
- [x] Save workflow to disk (~/.localflow/workflows/)
- [x] Load saved workflows
- [x] Rename workflows
- [x] Delete workflows
- [x] List saved workflows via API
- [x] Master AI commands: save, load, rename, delete, list
- [x] UI for workflow management (Saved tab in sidebar)

### Workflow Composability
- [x] Create workflow execution tools (run_workflow, list_workflows)
- [x] Allow workflows to call other workflows
- [x] Pass outputs between workflows
- [x] Test nested workflow execution

### UI Improvements
- [ ] Fix edge animation bug (BUGLIST.md)
- [ ] Plugin tools in sidebar
- [ ] Better debug node output display

### Master AI Improvements
- [x] Make Master AI use Workflow Builder instead of direct JSON output
- [x] Dispatcher pattern: Master AI interprets, Builder builds

### Testing
- [ ] Test MCP server with Claude Desktop

---

## Notes

**Model Requirement:** Use Qwen 2.5 3B or another model with function-calling capability. Smaller models (1B, 1.7B) are inconsistent at outputting command JSON.

---

## Future Ideas
- [ ] Webhook triggers
- [ ] Scheduled workflows (cron)
- [ ] Workflow versioning
- [ ] Result caching
- [ ] Parallel tool execution
