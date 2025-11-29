# Contributing to LocalFlow

Guide for developers who want to contribute to LocalFlow.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Setup

```bash
# Clone the repo
git clone https://github.com/DMouse123/localflow.git
cd localflow

# Install dependencies
npm install

# Start development
npm run dev
```

This starts:
- Vite dev server on http://localhost:5173
- Electron app with hot reload
- REST API on port 9998
- WebSocket on port 9999

---

## Development Commands

```bash
npm run dev           # Start dev mode (Vite + Electron)
npm run build         # Build for production
npm run build:electron # Build just Electron main process
npm run preview       # Preview production build
```

### Quick Rebuild

After changing Electron main process files:

```bash
npm run build:electron
# Then restart the app or use the remote restart script
node scripts/claude-remote.js restart
```

---

## Project Structure

```
localflow/
├── electron/main/      # Main process (backend)
├── electron/preload/   # Preload scripts
├── src/                # React frontend
├── mcp-server/         # Claude Desktop integration
├── docs/               # Documentation
├── scripts/            # Build scripts
└── examples/           # Example clients
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed component overview.

---

## Making Changes

### Adding a New Tool

1. Edit `electron/main/executor/tools.ts`
2. Define the tool with schema
3. Register it with `registerTool()`

```typescript
const myTool: Tool = {
  name: 'my_tool',
  description: 'What it does',
  inputSchema: {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'Input value' }
    },
    required: ['input']
  },
  execute: async (input) => {
    return { success: true, result: 'done' };
  }
};
registerTool(myTool);
```

### Adding a New Node Type

1. Edit `electron/main/executor/nodeTypes.ts`
2. Add to the `nodeTypes` array:

```typescript
{
  id: 'my-node',
  name: 'My Node',
  category: 'tool',
  inputs: ['input'],
  outputs: ['output'],
  config: {},
  execute: async (inputs, config, context) => {
    return { output: inputs.input };
  }
}
```

### Adding an API Endpoint

Edit `electron/main/restApi.ts`:

```typescript
if (req.method === 'GET' && path === '/my-endpoint') {
  res.writeHead(200);
  res.end(JSON.stringify({ data: 'hello' }));
  return;
}
```

### Adding a Template

Edit `electron/main/templates.ts`:

```typescript
{
  id: 'my-template',
  name: 'My Template',
  description: 'What it does',
  nodes: [...],
  edges: [...]
}
```

---

## Testing

### Manual Testing

1. Start dev mode: `npm run dev`
2. Test in the UI
3. Test via REST API: `curl http://localhost:9998/health`
4. Test via chat: Send messages to `/chat` endpoint

### Testing Plugins

1. Create plugin in `~/.localflow/plugins/test-plugin/`
2. Restart app
3. Check console for load confirmation
4. Test via orchestrator or chat

---

## Code Style

- TypeScript for Electron main process
- React + TypeScript for frontend
- Functional components with hooks
- Async/await for async operations

### Naming Conventions

- Files: `camelCase.ts`
- Components: `PascalCase.tsx`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

---

## Pull Request Process

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes
4. Test thoroughly
5. Commit with clear message
6. Push and create PR

### Commit Messages

```
Add: New feature description
Fix: Bug fix description
Update: Change description
Docs: Documentation update
```

---

## Areas to Contribute

### High Priority
- More built-in tools (web search, email, calendar)
- Better error handling
- UI improvements
- More templates

### Medium Priority
- Plugin marketplace concept
- Workflow versioning
- Result caching
- Performance optimization

### Low Priority
- Themes/styling
- Internationalization
- Mobile support

---

## Getting Help

- Check existing code for patterns
- Look at `hello-world` plugin for plugin examples
- Read the docs in `/docs`
- Open an issue for questions

---

## License

MIT - see LICENSE file
