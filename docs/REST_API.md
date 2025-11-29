# LocalFlow REST API

LocalFlow exposes a REST API for external systems to discover and run workflows.

**Base URL:** `http://localhost:9998`

---

## Endpoints

### Health Check

```
GET /health
```

Returns service status.

**Response:**
```json
{ "status": "ok", "service": "localflow" }
```

---

### List Templates

```
GET /templates
```

Returns all available workflow templates with full schema.

**Response:**
```json
{
  "templates": [
    {
      "id": "ai-character-builder",
      "name": "AI Character Builder",
      "description": "Build a character using multiple AI tools",
      "icon": "🎭",
      "inputs": {
        "task": {
          "type": "string",
          "required": false,
          "default": "Create a fantasy character...",
          "description": "The task or prompt for the workflow"
        }
      },
      "tools": ["ai_name_generator", "ai_color_picker", "ai_trait_generator", "ai_backstory"],
      "maxSteps": 12,
      "outputs": {
        "result": { "type": "string", "description": "Final result from the workflow" },
        "steps": { "type": "array", "description": "Array of tool calls and their results" },
        "logs": { "type": "array", "description": "Execution logs" }
      }
    }
  ]
}
```

---

### Get Template Details

```
GET /templates/:id
```

Returns schema for a specific template.

**Example:**
```bash
curl http://localhost:9998/templates/ai-character-builder
```

---

### Run Workflow

```
POST /run
Content-Type: application/json
```

Executes a workflow template.

**Request Body:**
```json
{
  "templateId": "ai-character-builder",
  "params": {
    "task": "Create a sci-fi robot character"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| templateId | string | Yes | ID of the template to run |
| params.task | string | No | Override the default task/prompt |

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "outputs": {
      "orchestrator_1": {
        "result": "Aethon Zorvath, a sci-fi robot...",
        "steps": [...],
        "memory": {...}
      }
    },
    "logs": [...]
  }
}
```

---

## Examples

### Discover available workflows
```bash
curl http://localhost:9998/templates
```

### Run with default settings
```bash
curl -X POST http://localhost:9998/run \
  -H "Content-Type: application/json" \
  -d '{"templateId": "ai-character-builder"}'
```

### Run with custom prompt
```bash
curl -X POST http://localhost:9998/run \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "ai-character-builder",
    "params": {"task": "Create a steampunk inventor character"}
  }'
```

### Extract just the final result
```bash
curl -s -X POST http://localhost:9998/run \
  -H "Content-Type: application/json" \
  -d '{"templateId": "ai-character-builder"}' \
  | jq '.result.outputs.orchestrator_1.result'
```

---

## WebSocket API

For real-time progress streaming, connect to: `ws://localhost:9999`

See [WEBSOCKET_API.md](./WEBSOCKET_API.md) for details.

---

## Chat API

Talk to the Master AI with conversation memory: `POST /chat`

See [CHAT_API.md](./CHAT_API.md) for details.

---

## Workflow Storage API

Save and manage custom workflows.

### List Saved Workflows

```
GET /workflows
```

### Get a Workflow

```
GET /workflows/:id
```

### Save a New Workflow

```
POST /workflows
Content-Type: application/json

{
  "name": "My Workflow",
  "description": "Optional description",
  "nodes": [...],
  "edges": [...]
}
```

### Update a Workflow

```
PUT /workflows/:id
Content-Type: application/json

{
  "name": "New Name",
  "nodes": [...],
  "edges": [...]
}
```

### Delete a Workflow

```
DELETE /workflows/:id
```

Workflows are stored in `~/.localflow/workflows/`.
