# LocalFlow

**Local-first AI workflow automation platform**

Build, run, and automate AI workflows entirely on your local machine - no cloud required.

![LocalFlow](resources/icon.png)

## Features

### 🎨 Visual Workflow Builder
- Drag & drop nodes onto canvas
- Connect nodes to build data pipelines
- Real-time execution with progress tracking

### 🤖 Local AI Integration
- Runs Llama 3.2, Qwen, SmolLM models locally
- No API keys or cloud services needed
- Download models directly in the app

### 📦 Node Types
- **Text Input** - Static text values
- **AI Chat** - Chat with AI model
- **AI Transform** - Transform text with instructions
- **Debug** - Log outputs

### 🚀 One-Click Templates
- Simple Q&A
- Text Summarizer
- Creative Story Writer
- Translator
- Code Explainer

### 💬 AI Assistant
- Built-in help chat
- Learns you how to build workflows
- Context-aware suggestions

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Usage

1. **Load a Model**: Go to Models tab, click download on Llama 3.2 1B, then click to load
2. **Pick a Template**: Go to Templates tab, click any template to load it
3. **Run**: Click the green Run button
4. **Watch**: See output in the bottom panel

## Building Custom Workflows

1. Go to **Nodes** tab
2. Drag nodes onto the canvas
3. Connect nodes by dragging from output handle to input handle
4. Click a node to configure it in the Properties panel
5. Click **Run** to execute

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, React Flow
- **Backend**: Electron, Node.js
- **AI**: node-llama-cpp (local inference)
- **State**: Zustand

## Project Structure

```
localflow/
├── electron/          # Electron main process
│   ├── main/          # Main process code
│   │   ├── llm/       # LLM management
│   │   └── executor/  # Workflow execution
│   └── preload/       # Preload scripts
├── src/               # React renderer
│   ├── components/    # UI components
│   ├── stores/        # Zustand stores
│   └── data/          # Templates, etc.
├── scripts/           # CLI tools
└── shared/            # Shared types
```

## Development

See [CLAUDE_CONTROL.md](./CLAUDE_CONTROL.md) for detailed development guide.
See [DEV_LOG.md](./DEV_LOG.md) for development history and progress.

## License

MIT
