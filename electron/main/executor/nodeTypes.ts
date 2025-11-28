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

// ============ NODE REGISTRY ============

export const NODE_TYPES: Record<string, NodeTypeDefinition> = {
  'trigger': manualTrigger,
  'text-input': textInput,
  'ai-chat': aiChat,
  'ai-transform': aiTransform,
  'debug': debugNode,
}

export function getNodeType(typeId: string): NodeTypeDefinition | undefined {
  return NODE_TYPES[typeId]
}

export function getAllNodeTypes(): NodeTypeDefinition[] {
  return Object.values(NODE_TYPES)
}
