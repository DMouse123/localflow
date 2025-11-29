# LocalFlow MCP Server

MCP (Model Context Protocol) server that exposes LocalFlow workflows as tools for Claude Desktop.

## Prerequisites

1. LocalFlow must be running (`npm run dev` in main localflow directory)
2. A model must be loaded in LocalFlow

## Installation

```bash
cd mcp-server
npm install
```

## Claude Desktop Configuration

Add this to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "localflow": {
      "command": "node",
      "args": ["/FULL/PATH/TO/localflow/mcp-server/index.js"]
    }
  }
}
```

Replace `/FULL/PATH/TO/` with the actual path to your localflow directory.

## Available Tools

### localflow_health
Check if LocalFlow is running.

### localflow_list_templates
List all available workflow templates.

### localflow_run_workflow
Run a workflow by template ID.

Parameters:
- `templateId` (required): Template to run (e.g., "ai-character-builder")
- `task` (optional): Custom task/prompt to override default

### localflow_chat
Chat with the Master AI.

Parameters:
- `message` (required): Your message
- `sessionId` (optional): Continue a previous conversation

## Example Usage in Claude Desktop

> "Use localflow to list available templates"

> "Run the character builder workflow with a pirate theme"

> "Ask localflow's master AI how to build a text summarizer"

## Troubleshooting

**"Failed to connect to LocalFlow"**
- Make sure LocalFlow is running (`npm run dev`)
- Check that port 9998 is accessible

**"No model loaded"**
- Open LocalFlow UI
- Go to Models tab
- Load a model (e.g., Llama 3.2 3B)
