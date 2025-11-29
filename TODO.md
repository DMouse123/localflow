# LocalFlow TODO

## ✅ Completed

### Phase 1: Headless Execution
- [x] Templates in main process
- [x] Direct execution via WebSocket
- [x] `workflow:runTemplate` command

### Phase 2: REST API
- [x] HTTP server on port 9998
- [x] `GET /health`
- [x] `GET /templates` - full schema discovery
- [x] `GET /templates/:id`
- [x] `POST /run` with custom params

### Phase 3: Documentation
- [x] docs/REST_API.md
- [x] docs/WEBSOCKET_API.md

---

## 🔲 TODO

### MCP Server Integration
- [ ] Create MCP server (Model Context Protocol)
- [ ] Expose `run_workflow` as MCP tool
- [ ] Expose `list_templates` as MCP resource
- [ ] Test with Claude Desktop
- [ ] Document MCP setup

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

### Authentication (if public)
- [ ] API key support
- [ ] Rate limiting
- [ ] CORS configuration

### UI Improvements
- [ ] Fix edge animation bug (BUGLIST.md)
- [ ] Improve debug node output display
- [ ] Add workflow save/load in UI

---

## Ideas / Future
- [ ] Webhook triggers (run workflow on HTTP POST)
- [ ] Scheduled workflows (cron-like)
- [ ] Workflow versioning
- [ ] Result caching
- [ ] Parallel tool execution
- [ ] Custom tool creation UI
