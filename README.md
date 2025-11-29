# LocalFlow

**Local-first AI workflow automation platform**

Build, run, and automate AI workflows entirely on your local machine - no cloud required.

![LocalFlow](resources/icon.png)

## What is LocalFlow?

LocalFlow is a local AI agent framework. You design workflows visually, connect tools, and let a local AI decide how to use them to complete tasks. It's like giving an AI a toolbox and watching it figure out what to do.

**Key Concept:** The AI Orchestrator looks at your task, examines available tools, plans a sequence, executes step-by-step, and combines results.

## Features

### 🎨 Visual Workflow Builder
- Drag & drop nodes onto canvas
- Connect nodes to build data pipelines
- Real-time execution with progress tracking
- Pink tool connections, gray data connections

### 🤖 AI Orchestrator
- Autonomous tool selection and execution
- Self-discovers connected tools
- Plans and executes multi-step tasks
- Remembers context across steps

### 🔧 Built-in Tools (11)
- **AI Tools**: Name generator, color picker, trait generator, backstory
- **Utility**: Calculator, datetime, generate ID
- **File**: Read, write, list directory
- **Advanced**: HTTP request, JSON query, shell command, string ops

### 🔌 Plugin System
- Drop a folder in `~/.localflow/plugins/`
- Define tools in `manifest.json` + JavaScript
- Auto-discovered on startup
- Works with AI Orchestrator

### 🌐 APIs
- **REST API** (port 9998): Discover and run workflows
- **WebSocket** (port 9999): Real-time streaming
- Full schema discovery
- Custom parameters

### 🤖 Local AI
- Runs Llama, Qwen, SmolLM models locally
- No API keys or cloud services
- Download models in-app

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Usage

1. **Load a Model**: Models tab → Download → Load
2. **Pick a Template**: Templates tab → Click to load
3. **Run**: Click the green Run button
4. **Watch**: See output in the bottom panel

## API Access

```bash
# Health check
curl http://localhost:9998/health

# List available workflows
curl http://localhost:9998/templates

# Run a workflow
curl -X POST http://localhost:9998/run \
  -H "Content-Type: application/json" \
  -d '{"templateId": "ai-character-builder"}'

# Run with custom prompt
curl -X POST http://localhost:9998/run \
  -H "Content-Type: application/json" \
  -d '{"templateId": "ai-character-builder", "params": {"task": "Create a pirate captain"}}'
```

## Creating Plugins

Create a folder in `~/.localflow/plugins/`:

```
~/.localflow/plugins/my-plugin/
├── manifest.json
└── tools/
    └── my-tool.js
```

**manifest.json:**
```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "tools": [{
    "id": "my_tool",
    "name": "My Tool",
    "description": "Does something cool",
    "file": "tools/my-tool.js",
    "inputs": {
      "text": { "type": "string", "required": true }
    },
    "outputs": {
      "result": { "type": "string" }
    }
  }]
}
```

**tools/my-tool.js:**
```javascript
module.exports = {
  async execute(input, config, context) {
    return { success: true, result: `Processed: ${input.text}` };
  }
};
```

Restart LocalFlow and your tool is available!

## Documentation

- [REST API](docs/REST_API.md) - HTTP endpoints
- [WebSocket API](docs/WEBSOCKET_API.md) - Real-time streaming
- [Plugin Architecture](PLUGIN_ARCHITECTURE.md) - Creating plugins
- [Architecture](ARCHITECTURE.md) - System design

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, React Flow
- **Backend**: Electron, Node.js
- **AI**: node-llama-cpp (local inference)
- **State**: Zustand

## Project Structure

```
localflow/
├── electron/          # Electron main process
│   ├── main/
│   │   ├── llm/       # LLM management
│   │   ├── executor/  # Workflow execution
│   │   └── plugins/   # Plugin system
│   └── preload/
├── src/               # React renderer
│   ├── components/
│   ├── stores/
│   └── data/
├── docs/              # API documentation
├── examples/          # Example clients
└── scripts/           # CLI tools
```

## What's Next

See [TODO.md](TODO.md) for the roadmap:
- Master AI Chat (conversational workflow design)
- MCP integration (Claude Desktop)
- Workflow-to-workflow calls
- Persistence (save/load workflows)

## License

MIT
