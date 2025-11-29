# LocalFlow WebSocket API

Real-time streaming API for workflow execution.

**URL:** `ws://localhost:9999`

---

## Connection

```javascript
const ws = new WebSocket('ws://localhost:9999');

ws.onopen = () => {
  console.log('Connected to LocalFlow');
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log(msg);
};
```

On connection, you'll receive:
```json
{ "type": "welcome", "message": "Connected to LocalFlow! Ready to receive commands." }
```

---

## Commands

### Run Template

```javascript
ws.send(JSON.stringify({
  type: 'workflow:runTemplate',
  payload: { templateId: 'ai-character-builder' }
}));
```

### List Templates

```javascript
ws.send(JSON.stringify({
  type: 'workflow:listTemplates'
}));
```

---

## Events

During workflow execution, you'll receive streaming events:

### workflow:log
Execution log messages.
```json
{ "type": "workflow:log", "message": "[13:04:00] Starting workflow: AI Character Builder" }
```

### workflow:progress
Node status changes.
```json
{ "type": "workflow:progress", "nodeId": "orchestrator_1", "status": "running" }
```

### workflow:complete
Workflow finished successfully.
```json
{ "type": "workflow:complete", "success": true, "result": {...} }
```

### workflow:error
Workflow failed.
```json
{ "type": "workflow:error", "error": "Error message" }
```

---

## Example Client

```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9999');

ws.on('open', () => {
  console.log('Connected');
  ws.send(JSON.stringify({
    type: 'workflow:runTemplate',
    payload: { templateId: 'ai-character-builder' }
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  switch (msg.type) {
    case 'workflow:log':
      console.log('📋', msg.message);
      break;
    case 'workflow:progress':
      console.log('🔄', msg.nodeId, msg.status);
      break;
    case 'workflow:complete':
      console.log('✅ Done!', msg.result);
      ws.close();
      break;
    case 'workflow:error':
      console.log('❌', msg.error);
      ws.close();
      break;
  }
});
```

---

## HTML Client

A standalone HTML client is available at:
```
localflow/examples/remote-client.html
```

Open it directly in a browser (file://) to connect and run workflows.

---

## See Also

- [REST_API.md](./REST_API.md) - Synchronous HTTP API
