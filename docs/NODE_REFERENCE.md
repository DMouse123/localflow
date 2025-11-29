# LocalFlow Node Types Reference

Complete reference for all built-in node types.

---

## Categories

| Category | Purpose |
|----------|---------|
| **trigger** | Start workflow execution |
| **input** | Provide data |
| **ai** | AI-powered processing |
| **tool** | Utility operations |
| **output** | Display/capture results |

---

## Trigger Nodes

### trigger

Starts workflow execution. Every workflow should have one.

| Property | Value |
|----------|-------|
| Inputs | none |
| Outputs | `trigger` |
| Config | none |

---

## Input Nodes

### text-input

Provides static text to the workflow.

| Property | Value |
|----------|-------|
| Inputs | none |
| Outputs | `text` |
| Config | `text` (string) - The text to output |

**Example Config:**
```json
{ "text": "Hello, world!" }
```

---

## AI Nodes

### ai-chat

Send a prompt to the LLM and get a response.

| Property | Value |
|----------|-------|
| Inputs | `input` (prompt text) |
| Outputs | `response` |
| Config | `systemPrompt`, `maxTokens`, `temperature` |

**Example Config:**
```json
{
  "systemPrompt": "You are a helpful assistant.",
  "maxTokens": 500,
  "temperature": 0.7
}
```

### ai-transform

Transform input text using AI instructions.

| Property | Value |
|----------|-------|
| Inputs | `input` (text to transform) |
| Outputs | `output` |
| Config | `instruction`, `maxTokens` |

**Example Config:**
```json
{
  "instruction": "Translate to French:",
  "maxTokens": 200
}
```

### ai-orchestrator

Autonomous AI agent that uses tools to complete tasks.

| Property | Value |
|----------|-------|
| Inputs | `task` (what to do), `tools` (connected tool nodes) |
| Outputs | `result`, `steps`, `memory` |
| Config | `maxSteps`, `systemPrompt`, `tools` (comma-separated) |

**Example Config:**
```json
{
  "maxSteps": 10,
  "systemPrompt": "Be thorough and use all available tools.",
  "tools": "calculator,datetime,file_read"
}
```

---

## Tool Nodes

### tool-calculator

Evaluate mathematical expressions.

| Property | Value |
|----------|-------|
| Inputs | `expression` |
| Outputs | `result` |
| Tool Name | `calculator` |

**Supported:** Basic math, parentheses, functions (sin, cos, sqrt, etc.)

### tool-datetime

Get current date/time or format dates.

| Property | Value |
|----------|-------|
| Inputs | `format` (optional) |
| Outputs | `datetime` |
| Tool Name | `datetime` |

**Formats:** ISO, readable, timestamp, or custom strftime

### tool-generate-id

Generate unique identifiers.

| Property | Value |
|----------|-------|
| Inputs | `type` (uuid, nanoid, timestamp) |
| Outputs | `id` |
| Tool Name | `generate_id` |

### tool-file-read

Read contents of a file.

| Property | Value |
|----------|-------|
| Inputs | `path` |
| Outputs | `content`, `error` |
| Tool Name | `file_read` |
| Config | `path`, `encoding` |

### tool-file-write

Write content to a file.

| Property | Value |
|----------|-------|
| Inputs | `path`, `content` |
| Outputs | `success`, `error` |
| Tool Name | `file_write` |
| Config | `path`, `mode` (overwrite/append) |

### tool-file-list

List files in a directory.

| Property | Value |
|----------|-------|
| Inputs | `path` |
| Outputs | `files` |
| Tool Name | `file_list` |

### tool-http

Make HTTP requests.

| Property | Value |
|----------|-------|
| Inputs | `url`, `method`, `body`, `headers` |
| Outputs | `response`, `status`, `error` |
| Tool Name | `http_get` |
| Config | `url`, `method`, `headers`, `contentType` |

### tool-json-query

Query JSON data with path expressions.

| Property | Value |
|----------|-------|
| Inputs | `json`, `path` |
| Outputs | `result` |
| Tool Name | `json_query` |

**Path Examples:** `user.name`, `items[0]`, `data.users[*].email`

### tool-shell

Execute shell commands.

| Property | Value |
|----------|-------|
| Inputs | `command` |
| Outputs | `stdout`, `stderr`, `exitCode` |
| Tool Name | `shell` |

**Warning:** Use with caution. Commands run with app permissions.

### tool-string-ops

String manipulation operations.

| Property | Value |
|----------|-------|
| Inputs | `text`, `operation`, `params` |
| Outputs | `result` |
| Tool Name | `string_ops` |

**Operations:** uppercase, lowercase, trim, replace, split, join, substring

---

## AI Tool Nodes

These are tools specifically for AI-driven creative tasks.

### tool-ai-name

Generate character/entity names.

| Property | Value |
|----------|-------|
| Tool Name | `ai_name_generator` |
| Inputs | `type` (fantasy, sci-fi, modern, etc.) |
| Outputs | `name` |

### tool-ai-color

Pick colors with descriptions.

| Property | Value |
|----------|-------|
| Tool Name | `ai_color_picker` |
| Inputs | `context` (what the color is for) |
| Outputs | `color`, `hex`, `description` |

### tool-ai-trait

Generate personality traits.

| Property | Value |
|----------|-------|
| Tool Name | `ai_trait_generator` |
| Inputs | `type` (positive, negative, neutral) |
| Outputs | `trait`, `description` |

### tool-ai-backstory

Generate character backstories.

| Property | Value |
|----------|-------|
| Tool Name | `ai_backstory` |
| Inputs | `name`, `traits`, `context` |
| Outputs | `backstory` |

---

## Output Nodes

### debug

Display data for debugging/output.

| Property | Value |
|----------|-------|
| Inputs | `input` (any data) |
| Outputs | none |
| Config | `label` |

---

## Workflow Tools

These are available to the orchestrator for workflow-to-workflow execution.

### run_workflow

Execute another saved workflow.

| Property | Value |
|----------|-------|
| Tool Name | `run_workflow` |
| Inputs | `workflow_id`, `input` (optional) |
| Outputs | `result` |

### list_workflows

List all saved workflows.

| Property | Value |
|----------|-------|
| Tool Name | `list_workflows` |
| Inputs | none |
| Outputs | `workflows` (array of {id, name}) |

---

## Node Configuration

All nodes can have configuration set in the UI or via API:

```json
{
  "id": "node_1",
  "type": "custom",
  "position": { "x": 100, "y": 100 },
  "data": {
    "label": "My Node",
    "type": "ai-chat",
    "config": {
      "systemPrompt": "Be helpful",
      "maxTokens": 500
    }
  }
}
```

---

## Creating Custom Nodes

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for:
- Creating plugins with custom tools
- Adding built-in node types
- Tool schema format
