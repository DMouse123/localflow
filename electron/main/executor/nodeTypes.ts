/**
 * Node Type Definitions
 * 
 * Each node type has:
 * - id: unique identifier
 * - name: display name
 * - category: grouping (trigger, ai, data, output)
 * - inputs: array of input port definitions
 * - outputs: array of output port definitions
 * - config: configuration schema
 * - execute: async function that runs the node
 */

import LLMManager from '../llm/manager'
import * as fs from 'fs'
import * as path from 'path'

export interface NodePort {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'any' | 'object'
}

export interface NodeConfig {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'select' | 'text'
    label: string
    default?: any
    options?: { value: string; label: string }[]
  }
}

export interface ExecutionContext {
  llm: typeof LLMManager
  workflowId: string
  log: (message: string) => void
  sendProgress: (nodeId: string, status: string, data?: any) => void
}

export interface NodeInput {
  [portId: string]: any
}

export interface NodeOutput {
  [portId: string]: any
}

// MCP-compatible tool schema for nodes that can be used as tools
export interface ToolSchema {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, { type: string; description: string }>
    required: string[]
  }
}

export interface NodeTypeDefinition {
  id: string
  name: string
  category: 'trigger' | 'ai' | 'data' | 'output' | 'tool'
  inputs: NodePort[]
  outputs: NodePort[]
  config: NodeConfig
  execute: (inputs: NodeInput, config: any, context: ExecutionContext) => Promise<NodeOutput>
  // Optional: Makes this node available as a tool for AI Orchestrator
  toolSchema?: ToolSchema
}

// ============ NODE IMPLEMENTATIONS ============

// TRIGGER: Manual Trigger
const manualTrigger: NodeTypeDefinition = {
  id: 'trigger',
  name: 'Manual Trigger',
  category: 'trigger',
  inputs: [],
  outputs: [{ id: 'trigger', name: 'Trigger', type: 'any' }],
  config: {},
  execute: async () => {
    return { trigger: true }
  },
}

// DATA: Text Input
const textInput: NodeTypeDefinition = {
  id: 'text-input',
  name: 'Text Input',
  category: 'data',
  inputs: [],
  outputs: [{ id: 'text', name: 'Text', type: 'string' }],
  config: {
    text: { type: 'text', label: 'Text', default: '' },
  },
  execute: async (inputs, config) => {
    return { text: config.text || '' }
  },
}

// AI: Chat Node
const aiChat: NodeTypeDefinition = {
  id: 'ai-chat',
  name: 'AI Chat',
  category: 'ai',
  inputs: [{ id: 'prompt', name: 'Prompt', type: 'string' }],
  outputs: [{ id: 'response', name: 'Response', type: 'string' }],
  config: {
    systemPrompt: { type: 'text', label: 'System Prompt', default: 'You are a helpful assistant.' },
    maxTokens: { type: 'number', label: 'Max Tokens', default: 512 },
    temperature: { type: 'number', label: 'Temperature', default: 0.7 },
  },
  execute: async (inputs, config, context) => {
    const prompt = inputs.prompt || ''
    if (!prompt) {
      return { response: '' }
    }

    context.log(`AI Chat processing: "${prompt.substring(0, 50)}..."`)
    
    try {
      // Use the LLM manager to generate
      const response = await context.llm.generateSync(prompt, {
        systemPrompt: config.systemPrompt,
        maxTokens: config.maxTokens || 512,
        temperature: config.temperature || 0.7,
      })
      
      context.log(`AI Chat response: "${response.substring(0, 50)}..."`)
      return { response }
    } catch (error) {
      context.log(`AI Chat error: ${error}`)
      return { response: `Error: ${error}` }
    }
  },
}

// AI: Transform Node
const aiTransform: NodeTypeDefinition = {
  id: 'ai-transform',
  name: 'AI Transform',
  category: 'ai',
  inputs: [{ id: 'input', name: 'Input', type: 'string' }],
  outputs: [{ id: 'output', name: 'Output', type: 'string' }],
  config: {
    instruction: { 
      type: 'text', 
      label: 'Instruction', 
      default: 'Summarize the following text:' 
    },
    maxTokens: { type: 'number', label: 'Max Tokens', default: 256 },
  },
  execute: async (inputs, config, context) => {
    const input = inputs.input || ''
    if (!input) {
      return { output: '' }
    }

    const prompt = `${config.instruction}\n\n${input}`
    context.log(`AI Transform: "${config.instruction}"`)
    
    try {
      const output = await context.llm.generateSync(prompt, {
        maxTokens: config.maxTokens || 256,
        temperature: 0.3, // Lower temp for transforms
      })
      return { output }
    } catch (error) {
      context.log(`AI Transform error: ${error}`)
      return { output: `Error: ${error}` }
    }
  },
}

// OUTPUT: Debug Node
const debugNode: NodeTypeDefinition = {
  id: 'debug',
  name: 'Debug',
  category: 'output',
  inputs: [{ id: 'input', name: 'Input', type: 'any' }],
  outputs: [],
  config: {
    label: { type: 'string', label: 'Label', default: 'Debug' },
  },
  execute: async (inputs, config, context) => {
    const value = inputs.input
    const label = config.label || 'Debug'
    const output = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
    
    context.log(`[${label}] ${output}`)
    context.sendProgress('debug', 'output', { label, value: output })
    
    return {}
  },
}

// DATA: HTTP Request Node
const httpRequest: NodeTypeDefinition = {
  id: 'http-request',
  name: 'HTTP Request',
  category: 'data',
  inputs: [
    { id: 'url', name: 'URL', type: 'string' },
    { id: 'body', name: 'Body', type: 'any' },
  ],
  outputs: [
    { id: 'response', name: 'Response', type: 'any' },
    { id: 'status', name: 'Status', type: 'number' },
    { id: 'headers', name: 'Headers', type: 'object' },
  ],
  config: {
    method: { type: 'select', label: 'Method', default: 'GET', options: [
      { value: 'GET', label: 'GET' },
      { value: 'POST', label: 'POST' },
      { value: 'PUT', label: 'PUT' },
      { value: 'DELETE', label: 'DELETE' },
      { value: 'PATCH', label: 'PATCH' },
    ]},
    url: { type: 'string', label: 'URL', default: 'https://api.example.com' },
    headers: { type: 'text', label: 'Headers (JSON)', default: '{}' },
    contentType: { type: 'select', label: 'Content Type', default: 'application/json', options: [
      { value: 'application/json', label: 'JSON' },
      { value: 'application/x-www-form-urlencoded', label: 'Form URL Encoded' },
      { value: 'text/plain', label: 'Plain Text' },
    ]},
  },
  execute: async (inputs, config, context) => {
    // URL from input takes priority over config
    const url = inputs.url || config.url
    if (!url) {
      context.log('HTTP Request: No URL provided')
      return { response: null, status: 0, headers: {} }
    }

    context.log(`HTTP ${config.method} ${url}`)

    try {
      // Parse headers from config
      let headers: Record<string, string> = {}
      try {
        headers = JSON.parse(config.headers || '{}')
      } catch {
        context.log('Warning: Could not parse headers JSON')
      }

      // Add content type for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(config.method) && config.contentType) {
        headers['Content-Type'] = config.contentType
      }

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: config.method || 'GET',
        headers,
      }

      // Add body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(config.method) && inputs.body) {
        if (config.contentType === 'application/json') {
          fetchOptions.body = typeof inputs.body === 'string' 
            ? inputs.body 
            : JSON.stringify(inputs.body)
        } else {
          fetchOptions.body = String(inputs.body)
        }
      }

      // Make the request
      const response = await fetch(url, fetchOptions)
      const status = response.status
      const responseHeaders = Object.fromEntries(response.headers.entries())

      // Parse response based on content type
      let responseData: any
      const contentType = response.headers.get('content-type') || ''
      
      if (contentType.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = await response.text()
      }

      context.log(`HTTP Response: ${status}`)
      return { response: responseData, status, headers: responseHeaders }

    } catch (error) {
      context.log(`HTTP Request error: ${error}`)
      return { response: { error: String(error) }, status: 0, headers: {} }
    }
  },
}

// DATA: File Read Node
const fileRead: NodeTypeDefinition = {
  id: 'file-read',
  name: 'File Read',
  category: 'data',
  inputs: [
    { id: 'path', name: 'Path', type: 'string' },
  ],
  outputs: [
    { id: 'content', name: 'Content', type: 'string' },
    { id: 'exists', name: 'Exists', type: 'boolean' },
  ],
  config: {
    path: { type: 'string', label: 'File Path', default: '' },
    encoding: { type: 'select', label: 'Encoding', default: 'utf-8', options: [
      { value: 'utf-8', label: 'UTF-8' },
      { value: 'ascii', label: 'ASCII' },
      { value: 'base64', label: 'Base64' },
    ]},
  },
  execute: async (inputs, config, context) => {
    // Use config.path as primary, inputs.path only if it's a valid string path
    const filePath = config.path || (typeof inputs.path === 'string' && inputs.path.startsWith('/') ? inputs.path : '')
    if (!filePath) {
      context.log('File Read: No path provided')
      return { content: '', exists: false }
    }

    context.log(`Reading file: ${filePath}`)

    try {
      if (!fs.existsSync(filePath)) {
        context.log(`File not found: ${filePath}`)
        return { content: '', exists: false }
      }

      const content = fs.readFileSync(filePath, config.encoding || 'utf-8')
      context.log(`Read ${content.length} characters`)
      return { content, exists: true }
    } catch (error) {
      context.log(`File Read error: ${error}`)
      return { content: `Error: ${error}`, exists: false }
    }
  },
}

// DATA: File Write Node
const fileWrite: NodeTypeDefinition = {
  id: 'file-write',
  name: 'File Write',
  category: 'data',
  inputs: [
    { id: 'path', name: 'Path', type: 'string' },
    { id: 'content', name: 'Content', type: 'string' },
  ],
  outputs: [
    { id: 'success', name: 'Success', type: 'boolean' },
    { id: 'path', name: 'Path', type: 'string' },
  ],
  config: {
    path: { type: 'string', label: 'File Path', default: '' },
    mode: { type: 'select', label: 'Mode', default: 'overwrite', options: [
      { value: 'overwrite', label: 'Overwrite' },
      { value: 'append', label: 'Append' },
    ]},
  },
  execute: async (inputs, config, context) => {
    // Use config.path as primary for the file path
    const filePath = config.path || (typeof inputs.path === 'string' && inputs.path.startsWith('/') ? inputs.path : '')
    const content = inputs.content || inputs.input || inputs.text || inputs.response || ''
    
    if (!filePath) {
      context.log('File Write: No path provided')
      return { success: false, path: '' }
    }

    context.log(`Writing to file: ${filePath}`)

    try {
      // Ensure directory exists
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // Write content
      const contentStr = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content)
      
      if (config.mode === 'append') {
        fs.appendFileSync(filePath, contentStr)
      } else {
        fs.writeFileSync(filePath, contentStr)
      }

      context.log(`Wrote ${contentStr.length} characters`)
      return { success: true, path: filePath }
    } catch (error) {
      context.log(`File Write error: ${error}`)
      return { success: false, path: filePath }
    }
  },
}

// DATA: JSON Parse Node
const jsonParse: NodeTypeDefinition = {
  id: 'json-parse',
  name: 'JSON Parse',
  category: 'data',
  inputs: [
    { id: 'input', name: 'Input', type: 'string' },
  ],
  outputs: [
    { id: 'data', name: 'Data', type: 'any' },
    { id: 'valid', name: 'Valid', type: 'boolean' },
  ],
  config: {
    path: { type: 'string', label: 'Extract Path (optional)', default: '' },
  },
  execute: async (inputs, config, context) => {
    const input = inputs.input || ''
    
    try {
      let data = typeof input === 'string' ? JSON.parse(input) : input
      
      // Extract nested path if specified (e.g., "items.0.name")
      if (config.path) {
        const parts = config.path.split('.')
        for (const part of parts) {
          if (data && typeof data === 'object') {
            data = data[part]
          }
        }
      }
      
      context.log(`JSON Parse: ${typeof data}`)
      return { data, valid: true }
    } catch (error) {
      context.log(`JSON Parse error: ${error}`)
      return { data: null, valid: false }
    }
  },
}

// DATA: Loop Node - Processes each item in an array
const loopNode: NodeTypeDefinition = {
  id: 'loop',
  name: 'Loop',
  category: 'data',
  inputs: [
    { id: 'items', name: 'Items', type: 'any' },
  ],
  outputs: [
    { id: 'item', name: 'Current Item', type: 'any' },
    { id: 'index', name: 'Index', type: 'number' },
    { id: 'results', name: 'All Results', type: 'any' },
  ],
  config: {
    maxItems: { type: 'number', label: 'Max Items (0=all)', default: 0 },
  },
  execute: async (inputs, config, context) => {
    let items = inputs.items || []
    
    // Handle string input (try to parse as JSON array)
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items)
      } catch {
        // If not JSON, split by newlines
        items = items.split('\n').filter((line: string) => line.trim())
      }
    }
    
    // Ensure it's an array
    if (!Array.isArray(items)) {
      items = [items]
    }
    
    // Apply max items limit
    if (config.maxItems && config.maxItems > 0) {
      items = items.slice(0, config.maxItems)
    }
    
    context.log(`Loop: Processing ${items.length} items`)
    
    // For now, return the array - the execution engine will need
    // to be enhanced to support true looping
    return { 
      item: items[0], 
      index: 0, 
      results: items 
    }
  },
}

// AI: Agent Node - ReAct loop with tools
const aiAgent: NodeTypeDefinition = {
  id: 'ai-agent',
  name: 'AI Agent',
  category: 'ai',
  inputs: [
    { id: 'task', name: 'Task', type: 'string' },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'string' },
    { id: 'steps', name: 'Steps', type: 'any' },
  ],
  config: {
    systemPrompt: { type: 'text', label: 'System Prompt', default: 'You are a helpful AI agent that can use tools to accomplish tasks.' },
    maxSteps: { type: 'number', label: 'Max Steps', default: 5 },
    tools: { type: 'text', label: 'Enabled Tools', default: 'calculator,datetime' },
  },
  execute: async (inputs, config, context) => {
    const task = inputs.task || ''
    if (!task) {
      return { result: 'No task provided', steps: [] }
    }

    const maxSteps = config.maxSteps || 5
    const enabledTools = (config.tools || 'calculator,datetime').split(',').map((t: string) => t.trim())
    const steps: Array<{ thought: string; action?: string; observation?: string }> = []

    // Available tools
    const tools: Record<string, { description: string; execute: (input: string) => string }> = {
      calculator: {
        description: 'Evaluate a math expression. Input: math expression like "2 + 2" or "sqrt(16)"',
        execute: (input: string) => {
          try {
            // Simple safe eval for math
            const result = Function('"use strict"; return (' + input.replace(/[^0-9+\-*/().sqrt,pow\s]/g, '') + ')')()
            return String(result)
          } catch {
            return 'Error: Invalid math expression'
          }
        }
      },
      datetime: {
        description: 'Get current date and time. Input: ignored',
        execute: () => new Date().toLocaleString()
      },
    }

    // Build tool descriptions for prompt
    const toolDescs = enabledTools
      .filter(t => tools[t])
      .map(t => `- ${t}: ${tools[t].description}`)
      .join('\n')

    const systemPrompt = `${config.systemPrompt}

You have access to these tools:
${toolDescs}

To use a tool, respond in this EXACT format:
THOUGHT: [your reasoning]
ACTION: [tool_name]
INPUT: [input for the tool]

When you have the final answer, respond:
THOUGHT: [your reasoning]
FINAL: [your final answer]

Always use THOUGHT before ACTION or FINAL.`

    context.log(`Agent starting: "${task.substring(0, 50)}..."`)
    let currentPrompt = `Task: ${task}`
    let finalResult = ''

    for (let step = 0; step < maxSteps; step++) {
      context.log(`Agent step ${step + 1}/${maxSteps}`)
      
      const response = await context.llm.generateSync(currentPrompt, {
        systemPrompt,
        maxTokens: 256,
        temperature: 0.3,
      })

      // Parse response
      const thoughtMatch = response.match(/THOUGHT:\s*(.+?)(?=ACTION:|FINAL:|$)/s)
      const actionMatch = response.match(/ACTION:\s*(\w+)/i)
      const inputMatch = response.match(/INPUT:\s*(.+?)(?=THOUGHT:|ACTION:|FINAL:|$)/s)
      const finalMatch = response.match(/FINAL:\s*(.+)/s)

      const thought = thoughtMatch ? thoughtMatch[1].trim() : response.trim()
      
      if (finalMatch) {
        finalResult = finalMatch[1].trim()
        steps.push({ thought, observation: `Final answer: ${finalResult}` })
        context.log(`Agent finished: ${finalResult.substring(0, 50)}...`)
        break
      }

      if (actionMatch && inputMatch) {
        const action = actionMatch[1].toLowerCase()
        const toolInput = inputMatch[1].trim()
        
        if (tools[action] && enabledTools.includes(action)) {
          const observation = tools[action].execute(toolInput)
          steps.push({ thought, action: `${action}(${toolInput})`, observation })
          context.log(`Tool ${action}: ${observation}`)
          currentPrompt = `${currentPrompt}\n\nTHOUGHT: ${thought}\nACTION: ${action}\nINPUT: ${toolInput}\nOBSERVATION: ${observation}\n\nContinue with the task.`
        } else {
          steps.push({ thought, action: `${action} (unknown tool)`, observation: 'Tool not available' })
          currentPrompt = `${currentPrompt}\n\nThe tool "${action}" is not available. Available tools: ${enabledTools.join(', ')}`
        }
      } else {
        steps.push({ thought })
        finalResult = thought
        break
      }
    }

    if (!finalResult) {
      finalResult = 'Agent reached max steps without final answer'
    }

    return { result: finalResult, steps }
  },
}

// ============ TOOL NODES ============
// These nodes can be connected to the AI Orchestrator's tool port
// They have a toolSchema that describes how the AI can use them

const toolCalculator: NodeTypeDefinition = {
  id: 'tool-calculator',
  name: 'Calculator',
  category: 'tool',
  inputs: [],
  outputs: [],
  config: {},
  execute: async () => ({ }), // Tool nodes don't execute in normal flow
  toolSchema: {
    name: 'calculator',
    description: 'Performs mathematical calculations. Use for math like addition, subtraction, multiplication, division.',
    inputSchema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression like "25 * 17" or "100 / 4 + 10"' }
      },
      required: ['expression']
    }
  }
}

const toolDatetime: NodeTypeDefinition = {
  id: 'tool-datetime',
  name: 'Date/Time',
  category: 'tool',
  inputs: [],
  outputs: [],
  config: {},
  execute: async () => ({ }),
  toolSchema: {
    name: 'datetime',
    description: 'Gets current date and time.',
    inputSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', description: 'Format: "full", "date", "time", or "timestamp"' }
      },
      required: []
    }
  }
}

const toolHttp: NodeTypeDefinition = {
  id: 'tool-http',
  name: 'HTTP Request',
  category: 'tool',
  inputs: [],
  outputs: [],
  config: {},
  execute: async () => ({ }),
  toolSchema: {
    name: 'http_get',
    description: 'Fetches data from a URL using HTTP GET.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to fetch' }
      },
      required: ['url']
    }
  }
}

const toolFileRead: NodeTypeDefinition = {
  id: 'tool-file-read',
  name: 'File Read',
  category: 'tool',
  inputs: [],
  outputs: [],
  config: {},
  execute: async () => ({ }),
  toolSchema: {
    name: 'file_read',
    description: 'Reads contents of a file.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file' }
      },
      required: ['path']
    }
  }
}

const toolFileWrite: NodeTypeDefinition = {
  id: 'tool-file-write',
  name: 'File Write',
  category: 'tool',
  inputs: [],
  outputs: [],
  config: {},
  execute: async () => ({ }),
  toolSchema: {
    name: 'file_write',
    description: 'Writes content to a file.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file' },
        content: { type: 'string', description: 'Content to write' }
      },
      required: ['path', 'content']
    }
  }
}

const toolFileList: NodeTypeDefinition = {
  id: 'tool-file-list',
  name: 'File List',
  category: 'tool',
  inputs: [],
  outputs: [],
  config: {},
  execute: async () => ({ }),
  toolSchema: {
    name: 'file_list',
    description: 'Lists files and directories at a path.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to list' }
      },
      required: ['path']
    }
  }
}

// Advanced tool nodes
const toolMathAdvanced: NodeTypeDefinition = {
  id: 'tool-math-advanced',
  name: 'Math Advanced',
  category: 'tool',
  inputs: [],
  outputs: [],
  config: {},
  execute: async () => ({ }),
  toolSchema: {
    name: 'math_advanced',
    description: 'Advanced math: sqrt, power, sin, cos, tan, log, abs, round, floor, ceil, min, max, random.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', description: 'Operation: sqrt, power, sin, cos, tan, log, abs, round, floor, ceil, min, max, random' },
        value: { type: 'number', description: 'Primary value' },
        value2: { type: 'number', description: 'Second value (for power, min, max)' }
      },
      required: ['operation']
    }
  }
}

const toolStringOps: NodeTypeDefinition = {
  id: 'tool-string-ops',
  name: 'String Ops',
  category: 'tool',
  inputs: [],
  outputs: [],
  config: {},
  execute: async () => ({ }),
  toolSchema: {
    name: 'string_ops',
    description: 'String operations: length, uppercase, lowercase, reverse, trim, replace, split, contains.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', description: 'Operation: length, uppercase, lowercase, reverse, trim, replace, split, contains' },
        text: { type: 'string', description: 'Text to operate on' },
        search: { type: 'string', description: 'Search string (for replace, contains)' },
        replacement: { type: 'string', description: 'Replacement (for replace)' }
      },
      required: ['operation', 'text']
    }
  }
}

const toolJsonQuery: NodeTypeDefinition = {
  id: 'tool-json-query',
  name: 'JSON Query',
  category: 'tool',
  inputs: [],
  outputs: [],
  config: {},
  execute: async () => ({ }),
  toolSchema: {
    name: 'json_query',
    description: 'Query JSON using dot notation paths, e.g., "user.name" or "items.0.title".',
    inputSchema: {
      type: 'object',
      properties: {
        json: { type: 'string', description: 'JSON string to query' },
        path: { type: 'string', description: 'Dot notation path, e.g., "data.results.0.name"' }
      },
      required: ['json', 'path']
    }
  }
}

const toolShell: NodeTypeDefinition = {
  id: 'tool-shell',
  name: 'Shell Command',
  category: 'tool',
  inputs: [],
  outputs: [],
  config: {},
  execute: async () => ({ }),
  toolSchema: {
    name: 'shell',
    description: 'Run safe shell commands: ls, cat, head, tail, wc, grep, find, echo, pwd, date.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' }
      },
      required: ['command']
    }
  }
}

const toolGenerateId: NodeTypeDefinition = {
  id: 'tool-generate-id',
  name: 'Generate ID',
  category: 'tool',
  inputs: [],
  outputs: [],
  config: {},
  execute: async () => ({ }),
  toolSchema: {
    name: 'generate_id',
    description: 'Generate unique identifiers: uuid, timestamp, or random string.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Type: uuid, timestamp, random' },
        length: { type: 'number', description: 'Length for random string (default 8)' }
      },
      required: ['type']
    }
  }
}

// ============ NODE REGISTRY ============

export const NODE_TYPES: Record<string, NodeTypeDefinition> = {
  'trigger': manualTrigger,
  'text-input': textInput,
  'ai-chat': aiChat,
  'ai-transform': aiTransform,
  'debug': debugNode,
  'http-request': httpRequest,
  'file-read': fileRead,
  'file-write': fileWrite,
  'json-parse': jsonParse,
  'loop': loopNode,
  'ai-agent': aiAgent,
  // Tool nodes
  'tool-calculator': toolCalculator,
  'tool-datetime': toolDatetime,
  'tool-http': toolHttp,
  'tool-file-read': toolFileRead,
  'tool-file-write': toolFileWrite,
  'tool-file-list': toolFileList,
  // Advanced tool nodes
  'tool-math-advanced': toolMathAdvanced,
  'tool-string-ops': toolStringOps,
  'tool-json-query': toolJsonQuery,
  'tool-shell': toolShell,
  'tool-generate-id': toolGenerateId,
}

// Note: AI Orchestrator is registered separately via registerOrchestratorNode()
// This is done after the tools system is initialized

export function getNodeType(typeId: string): NodeTypeDefinition | undefined {
  return NODE_TYPES[typeId]
}

export function getAllNodeTypes(): NodeTypeDefinition[] {
  return Object.values(NODE_TYPES)
}

// Register a node dynamically (used for orchestrator and plugins)
export function registerNode(node: NodeTypeDefinition) {
  NODE_TYPES[node.id] = node
  console.log(`[Nodes] Registered: ${node.id}`)
}
