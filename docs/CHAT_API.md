# LocalFlow Chat API

Talk to the Master AI - a conversational interface to the entire LocalFlow platform.

**Base URL:** `http://localhost:9998`

---

## Quick Start

```bash
# Start a conversation
curl -X POST http://localhost:9998/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What can you do?"}'

# Response includes sessionId for continuing the conversation
{
  "sessionId": "chat_123456_abc",
  "response": "I'm the Master AI for LocalFlow...",
  "commands": []
}

# Continue the conversation (with memory)
curl -X POST http://localhost:9998/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "chat_123456_abc", "message": "Show me the templates"}'
```

---

## Endpoints

### Send Message

```
POST /chat
Content-Type: application/json
```

**Request:**
```json
{
  "sessionId": "chat_123456_abc",  // Optional - omit to start new session
  "message": "Your message here"
}
```

**Response:**
```json
{
  "sessionId": "chat_123456_abc",
  "response": "Master AI's response...",
  "commands": []  // Any commands the AI wants to execute
}
```

### List Sessions

```
GET /chat/sessions
```

**Response:**
```json
{
  "sessions": [
    { "id": "chat_123456_abc", "messageCount": 5, "createdAt": 1234567890 }
  ]
}
```

### Get Chat History

```
GET /chat/:sessionId
```

**Response:**
```json
{
  "sessionId": "chat_123456_abc",
  "messages": [
    { "role": "user", "content": "Hello", "timestamp": 1234567890 },
    { "role": "assistant", "content": "Hi there!", "timestamp": 1234567891 }
  ]
}
```

### Create New Session

```
POST /chat/new
```

**Response:**
```json
{
  "sessionId": "chat_789xyz_def"
}
```

### Delete Session

```
DELETE /chat/:sessionId
```

**Response:**
```json
{
  "deleted": true
}
```

---

## What the Master AI Knows

The Master AI has full knowledge of:

- **All node types**: triggers, inputs, AI nodes, tools, outputs
- **All templates**: simple-qa, ai-character-builder, rpg-character-sheet, plugin-test
- **All plugins**: any tools installed in ~/.localflow/plugins/
- **Current workflow state**: what's on the canvas

## Example Conversations

### Ask about capabilities
```bash
curl -X POST http://localhost:9998/chat \
  -d '{"message": "What can you do?"}'
```

### Ask about templates
```bash
curl -X POST http://localhost:9998/chat \
  -d '{"sessionId": "xxx", "message": "What templates are available?"}'
```

### Ask to build something
```bash
curl -X POST http://localhost:9998/chat \
  -d '{"sessionId": "xxx", "message": "Build me a workflow that summarizes text"}'
```

### Ask to run a workflow
```bash
curl -X POST http://localhost:9998/chat \
  -d '{"sessionId": "xxx", "message": "Run the character builder"}'
```

---

## Session Memory

- Sessions persist for 30 minutes of inactivity
- Each session maintains full conversation history
- The AI remembers context from previous messages
- Sessions are stored in memory (lost on app restart)

---

## For Claude (AI Assistant)

If you're Claude helping a user with LocalFlow:

1. **Start a session:**
   ```bash
   curl -X POST http://localhost:9998/chat -H "Content-Type: application/json" -d '{"message": "Hello"}'
   ```

2. **Save the sessionId** from the response

3. **Continue conversations** using that sessionId:
   ```bash
   curl -X POST http://localhost:9998/chat -H "Content-Type: application/json" -d '{"sessionId": "YOUR_SESSION_ID", "message": "Next question"}'
   ```

4. **The Master AI can:**
   - Explain how LocalFlow works
   - Suggest workflow designs
   - Describe available templates and tools
   - Help troubleshoot issues

5. **To run workflows directly** (bypass chat), use:
   ```bash
   curl -X POST http://localhost:9998/run -H "Content-Type: application/json" -d '{"templateId": "ai-character-builder"}'
   ```

---

## See Also

- [REST_API.md](./REST_API.md) - Run workflows directly
- [WEBSOCKET_API.md](./WEBSOCKET_API.md) - Real-time streaming
