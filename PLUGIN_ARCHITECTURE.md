# Plugin Architecture Plan

## Overview

Transform LocalFlow from hardcoded tools to a plugin-based system where developers can add capabilities by dropping folders into a plugins directory.

---

## Directory Structure

```
~/.localflow/
  plugins/
    email-tools/
      manifest.json
      tools/
        send-email.js
        read-inbox.js
      icon.svg
    
    calendar/
      manifest.json
      tools/
        get-events.js
        create-event.js
      
    my-custom-tool/
      manifest.json
      tools/
        my-tool.js
```

---

## Manifest Schema

```json
{
  "id": "email-tools",
  "name": "Email Tools",
  "version": "1.0.0",
  "description": "Send and read emails",
  "author": "Your Name",
  
  "tools": [
    {
      "id": "send_email",
      "name": "Send Email",
      "description": "Send an email to a recipient",
      "file": "tools/send-email.js",
      "icon": "Mail",
      "color": "blue",
      "inputs": {
        "to": { "type": "string", "required": true, "description": "Recipient email" },
        "subject": { "type": "string", "required": true },
        "body": { "type": "string", "required": true }
      },
      "outputs": {
        "success": { "type": "boolean" },
        "messageId": { "type": "string" }
      },
      "config": {
        "smtpHost": { "type": "string", "label": "SMTP Host", "default": "smtp.gmail.com" },
        "smtpPort": { "type": "number", "label": "SMTP Port", "default": 587 }
      }
    }
  ],
  
  "nodes": [
    {
      "id": "email-trigger",
      "name": "Email Trigger",
      "description": "Triggers when new email arrives",
      "file": "nodes/email-trigger.js",
      "type": "trigger"
    }
  ]
}
```

---

## Tool JavaScript Format

```javascript
// tools/send-email.js
module.exports = {
  // Called when orchestrator uses this tool
  async execute(input, config, context) {
    const { to, subject, body } = input;
    const { smtpHost, smtpPort } = config;
    
    // Do the work...
    
    return {
      success: true,
      messageId: "abc123"
    };
  }
};
```

---

## Implementation Phases

### Phase 1: Plugin Discovery ✅ COMPLETE
- [x] Create plugin directory on startup (~/.localflow/plugins/)
- [x] Scan for manifest.json files
- [x] Parse and validate manifests
- [x] Log discovered plugins
- [x] Test: Drop a test plugin, see it discovered

### Phase 2: Tool Registration ✅ COMPLETE
- [x] Load tool JS files dynamically
- [x] Register tools with existing tool registry
- [x] Make tools available via REST API
- [x] Test: Call plugin tool via `POST /tools/greet`

### Phase 3: Node Registration
- [ ] Register plugin nodes with node type system
- [ ] Add plugin nodes to sidebar (new "Plugins" section)
- [ ] Handle plugin node icons and colors
- [ ] Test: Drag plugin node onto canvas

### Phase 4: Configuration UI
- [ ] Show plugin settings in properties panel
- [ ] Save plugin config to ~/.localflow/plugin-config.json
- [ ] Load config on startup
- [ ] Test: Configure and use plugin tool

### Phase 5: Hot Reload (Optional)
- [ ] Watch plugins directory for changes
- [ ] Reload plugins without app restart
- [ ] Test: Modify plugin, see changes

---

## Testing Plan

### Test Plugin: "hello-world"
```
plugins/
  hello-world/
    manifest.json
    tools/
      greet.js
```

**manifest.json:**
```json
{
  "id": "hello-world",
  "name": "Hello World",
  "version": "1.0.0",
  "tools": [{
    "id": "greet",
    "name": "Greeter",
    "description": "Says hello to someone",
    "file": "tools/greet.js",
    "inputs": {
      "name": { "type": "string", "required": true }
    },
    "outputs": {
      "greeting": { "type": "string" }
    }
  }]
}
```

**tools/greet.js:**
```javascript
module.exports = {
  async execute(input) {
    return { greeting: `Hello, ${input.name}!` };
  }
};
```

### Test Scenarios:
1. App starts, discovers hello-world plugin
2. Orchestrator can call "greet" tool
3. REST API shows "greet" in available tools
4. Create workflow using greet, run via curl

---

## Migration Plan

### Keep Existing Tools Working
- Built-in tools stay in source code (for now)
- Plugins are additive, not replacement
- Later: migrate built-ins to plugins

### Backwards Compatible
- Existing workflows keep working
- No breaking changes to API
- Plugin tools appear alongside built-ins

---

## Files to Create/Modify

### New Files:
- `electron/main/plugins/loader.ts` - Discovery and loading
- `electron/main/plugins/registry.ts` - Plugin registration
- `electron/main/plugins/types.ts` - TypeScript interfaces

### Modify:
- `electron/main/index.ts` - Initialize plugin system
- `electron/main/executor/tools.ts` - Accept plugin tools
- `electron/main/executor/nodeTypes.ts` - Accept plugin nodes
- `src/components/Sidebar/Sidebar.tsx` - Show plugin nodes

---

## Success Criteria

1. ✅ Drop folder into ~/.localflow/plugins/
2. ✅ Restart app
3. ✅ Plugin tool appears in system
4. ✅ Orchestrator can use it
5. ✅ API shows it in schema
6. ✅ No source code changes needed

---

## Start

Begin with Phase 1: Plugin Discovery
