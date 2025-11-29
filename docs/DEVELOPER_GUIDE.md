# LocalFlow Developer Guide

How to extend LocalFlow with custom tools, nodes, and plugins.

---

## Overview

LocalFlow can be extended in two ways:

1. **Plugins** (Recommended) - Drop a folder in `~/.localflow/plugins/` - no code changes needed
2. **Built-in Tools** - Add directly to the codebase

---

## Option 1: Creating Plugins (Easiest)

Plugins are auto-discovered at startup. Just create a folder with a manifest and tool files.

### Plugin Structure

```
~/.localflow/plugins/
└── my-plugin/
    ├── manifest.json    # Plugin definition
    └── tools/
        ├── my-tool.js   # Tool implementation
        └── another.js
```

### manifest.json

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "What this plugin does",
  "tools": [
    {
      "id": "my_tool",
      "name": "My Tool",
      "description": "Description for AI to understand when to use this",
      "file": "tools/my-tool.js",
      "inputs": {
        "param1": { "type": "string", "description": "First parameter" },
        "param2": { "type": "number", "description": "Optional number", "default": 10 }
      },
      "outputs": {
        "result": { "type": "string" }
      }
    }
  ]
}
```

### Tool Implementation (tools/my-tool.js)

```javascript
module.exports = {
  async execute(input, config, context) {
    const { param1, param2 } = input;
    
    // Do your work here
    const result = await someOperation(param1, param2);
    
    return {
      success: true,
      result: result
    };
  }
};
```

### Input Parameters

- `input` - The parameters passed to the tool (from manifest inputs)
- `config` - Node configuration from the UI
- `context` - Execution context with logging

### Return Value

Return an object. Common patterns:
```javascript
// Success
return { success: true, result: "data here" };

// With multiple outputs
return { success: true, data: {...}, message: "Done" };

// Error
return { success: false, error: "What went wrong" };
```

---

## Plugin Examples

### Web Scraper Plugin

```json
{
  "id": "web-scraper",
  "name": "Web Scraper",
  "version": "1.0.0",
  "tools": [
    {
      "id": "scrape_url",
      "name": "Scrape URL",
      "description": "Fetches and extracts text content from a webpage URL",
      "file": "tools/scrape.js",
      "inputs": {
        "url": { "type": "string", "description": "URL to scrape" }
      }
    }
  ]
}
```

```javascript
// tools/scrape.js
const https = require('https');
const http = require('http');

module.exports = {
  async execute(input) {
    const { url } = input;
    
    return new Promise((resolve) => {
      const client = url.startsWith('https') ? https : http;
      
      client.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          // Simple text extraction (strip HTML tags)
          const text = data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          resolve({ success: true, content: text.substring(0, 5000) });
        });
      }).on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }
};
```

### Google Search Plugin (using SerpAPI)

```json
{
  "id": "google-search",
  "name": "Google Search",
  "version": "1.0.0",
  "tools": [
    {
      "id": "google_search",
      "name": "Google Search",
      "description": "Search Google and return top results",
      "file": "tools/search.js",
      "inputs": {
        "query": { "type": "string", "description": "Search query" },
        "num_results": { "type": "number", "description": "Number of results", "default": 5 }
      }
    }
  ]
}
```

### Email Plugin (using nodemailer)

```json
{
  "id": "email",
  "name": "Email Tools",
  "version": "1.0.0",
  "tools": [
    {
      "id": "send_email",
      "name": "Send Email",
      "description": "Send an email via SMTP",
      "file": "tools/send.js",
      "inputs": {
        "to": { "type": "string", "description": "Recipient email" },
        "subject": { "type": "string", "description": "Email subject" },
        "body": { "type": "string", "description": "Email body" }
      }
    }
  ]
}
```

---

## Option 2: Built-in Tools

For tools that should ship with LocalFlow.

### Step 1: Add Tool Definition

Edit `electron/main/executor/tools.ts`:

```typescript
const myTool: Tool = {
  name: 'my_tool',
  description: 'What this tool does - be descriptive for the AI',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'First parameter' },
      param2: { type: 'number', description: 'Second parameter' }
    },
    required: ['param1']
  },
  execute: async (input: any) => {
    const { param1, param2 } = input;
    // Implementation
    return { success: true, result: 'done' };
  }
};

// Register it
registerTool(myTool);
```

### Step 2: Add Node Type (Optional)

If you want a visual node in the builder, edit `electron/main/executor/nodeTypes.ts`:

```typescript
{
  id: 'tool-my-tool',
  name: 'My Tool',
  category: 'tool',
  inputs: ['input'],
  outputs: ['output'],
  config: {
    param1: { type: 'string', default: '' }
  },
  execute: async (inputs, config, context) => {
    const tool = getTool('my_tool');
    return await tool.execute({ ...inputs, ...config });
  },
  toolSchema: {
    name: 'my_tool',
    description: 'Tool description',
    inputSchema: { ... }
  }
}
```

---

## How the AI Uses Tools

The AI Orchestrator sees tools via their descriptions and schemas:

```
AVAILABLE TOOLS:
• my_tool: What this tool does - be descriptive for the AI
  Parameters:
    param1: First parameter
    param2: Second parameter
```

**Good descriptions help the AI know when to use your tool.**

Bad: `"Sends data"`
Good: `"Send an email to a recipient with a subject and body. Use this when the user wants to email someone or send notifications."`

---

## Testing Your Plugin

1. Create plugin folder in `~/.localflow/plugins/`
2. Restart LocalFlow
3. Check console for: `[Plugins] Loaded: my-plugin (2 tools)`
4. Test via chat: "Use the my_tool to do X"
5. Or create a workflow with an orchestrator and connect tool nodes

---

## API Access

Plugins are automatically available via:

- **REST API**: Tools listed in `/tools` endpoint
- **Orchestrator**: Available when connected to orchestrator node
- **Master AI Chat**: Can be invoked via commands

---

## Ideas for Plugins

- **Email**: Send/read emails (nodemailer, IMAP)
- **Calendar**: Google Calendar, Outlook integration
- **Web Scraping**: Puppeteer, Cheerio
- **Search**: Google (SerpAPI), Bing, DuckDuckGo
- **Image AI**: DALL-E, Stable Diffusion, Midjourney
- **Database**: SQLite, PostgreSQL queries
- **Cloud Storage**: S3, Google Drive, Dropbox
- **Social Media**: Twitter/X, LinkedIn posting
- **Notifications**: Slack, Discord, Telegram
- **PDF**: Read/generate PDFs
- **OCR**: Extract text from images
- **Translation**: DeepL, Google Translate
- **Weather**: OpenWeatherMap
- **Stock Data**: Alpha Vantage, Yahoo Finance

---

## Need Help?

- Check existing plugins in `~/.localflow/plugins/hello-world/`
- Look at built-in tools in `electron/main/executor/tools.ts`
- Check node types in `electron/main/executor/nodeTypes.ts`
