# LocalFlow

**Local-first AI workflow automation platform**

Build, run, and automate AI workflows entirely on your local machine - no cloud required.

## What is LocalFlow?

LocalFlow is a **local AI agent framework**. You design workflows visually, connect tools, and let a local AI decide how to use them to complete tasks. It's like giving an AI a toolbox and watching it figure out what to do.

**Everything runs locally.** No API keys. No cloud. No data leaves your machine.

---

## Key Features

### 🎨 Visual Workflow Builder
Drag & drop nodes, connect them, run workflows with real-time progress.

### 🤖 AI Orchestrator
An autonomous agent that examines available tools, plans a sequence, and executes step-by-step.

### 🔧 11 Built-in Tools
AI tools (name generator, color picker, trait generator, backstory), utility (calculator, datetime, ID generator), file operations, HTTP, shell, and more.

### 🔌 Plugin System
Drop a folder in `~/.localflow/plugins/` → auto-discovered on startup. Create custom tools with simple JavaScript.

### 💬 Master AI Chat
A conversational interface that knows the entire system. Ask it to explain, design, or build workflows.

### 🌐 Full API Access
- **REST API** (port 9998): List templates, run workflows, chat with Master AI
- **WebSocket** (port 9999): Real-time execution streaming
- **MCP Server**: Use LocalFlow from Claude Desktop

### 🧠 Local LLM
Runs Llama 3.2, Qwen, SmolLM models locally via llama.cpp. Download models in-app.

**Recommended:** Use **Qwen 2.5 3B** for best results with the Master AI Chat (has function-calling capability).

---

## Quick Start

```bash
npm install
npm run dev
```

1. **Load a Model**: Models tab → Download → Load
2. **Pick a Template**: Templates tab → Click to load
3. **Run**: Click the green Run button

---

## API Examples

```bash
# List available workflows
curl http://localhost:9998/templates

# Run a workflow
curl -X POST http://localhost:9998/run \
  -H "Content-Type: application/json" \
  -d '{"templateId": "ai-character-builder"}'

# Chat with Master AI
curl -X POST http://localhost:9998/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What can you do?"}'
```

---

## Claude Desktop Integration (MCP)

LocalFlow can be used as a tool from Claude Desktop.

1. Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "localflow": {
      "command": "node",
      "args": ["/path/to/localflow/mcp-server/index.js"]
    }
  }
}
```

2. Restart Claude Desktop
3. Say: "Use localflow to run the character builder"

See [mcp-server/README.md](mcp-server/README.md) for details.

---

## Creating Plugins

```
~/.localflow/plugins/my-plugin/
├── manifest.json
└── tools/
    └── my-tool.js
```

See [PLUGIN_ARCHITECTURE.md](PLUGIN_ARCHITECTURE.md) for full guide.

---

## Documentation

| Doc | Description |
|-----|-------------|
| [REST_API.md](docs/REST_API.md) | HTTP endpoints |
| [WEBSOCKET_API.md](docs/WEBSOCKET_API.md) | Real-time streaming |
| [CHAT_API.md](docs/CHAT_API.md) | Master AI chat with sessions |
| [PLUGIN_ARCHITECTURE.md](PLUGIN_ARCHITECTURE.md) | Creating plugins |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
| [TODO.md](TODO.md) | Roadmap |

---

## Project Structure

```
localflow/
├── electron/main/     # Backend (LLM, executor, plugins, APIs)
├── src/               # React frontend
├── mcp-server/        # MCP server for Claude Desktop
├── docs/              # API documentation
└── examples/          # Example clients
```

---

## What's Complete

- ✅ Visual workflow builder
- ✅ AI Orchestrator (autonomous tool selection)
- ✅ 11 built-in tools
- ✅ Plugin system (auto-discovery)
- ✅ REST API with schema discovery
- ✅ WebSocket real-time streaming
- ✅ Master AI Chat (builds workflows from conversation)
- ✅ MCP Server (Claude Desktop integration)
- ✅ Workflow persistence (save/load/rename/delete)
- ✅ Workflow-to-workflow (composable agents)

## Documentation

- [REST API](docs/REST_API.md) - HTTP endpoints
- [WebSocket API](docs/WEBSOCKET_API.md) - Real-time streaming
- [Chat API](docs/CHAT_API.md) - Master AI conversation
- [Developer Guide](docs/DEVELOPER_GUIDE.md) - Create plugins and custom tools
- [Architecture](docs/ARCHITECTURE.md) - System design overview
- [Node Reference](docs/NODE_REFERENCE.md) - All built-in nodes
- [Contributing](docs/CONTRIBUTING.md) - How to contribute
- [Plugin Architecture](PLUGIN_ARCHITECTURE.md) - How plugins work

## What's Next

- 🔲 UI polish (edge animations, plugin sidebar)
- 🔲 More built-in integrations

---

## License

MIT
