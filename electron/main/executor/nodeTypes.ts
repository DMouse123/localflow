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

export interface NodeTypeDefinition {
  id: string
  name: string
  category: 'trigger' | 'ai' | 'data' | 'output'
  inputs: NodePort[]
  outputs: NodePort[]
  config: NodeConfig
  execute: (inputs: NodeInput, config: any, context: ExecutionContext) => Promise<NodeOutput>
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

// ============ NODE REGISTRY ============

export const NODE_TYPES: Record<string, NodeTypeDefinition> = {
  'trigger': manualTrigger,
  'text-input': textInput,
  'ai-chat': aiChat,
  'ai-transform': aiTransform,
  'debug': debugNode,
  'http-request': httpRequest,
}

export function getNodeType(typeId: string): NodeTypeDefinition | undefined {
  return NODE_TYPES[typeId]
}

export function getAllNodeTypes(): NodeTypeDefinition[] {
  return Object.values(NODE_TYPES)
}
