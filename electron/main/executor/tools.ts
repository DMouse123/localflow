/**
 * Tool Registry for AI Orchestrator
 * 
 * Tools are capabilities the AI agent can use autonomously.
 * Format is MCP-compatible (Model Context Protocol).
 */

import * as fs from 'fs'
import * as path from 'path'

// MCP-compatible tool interface
export interface ToolInputSchema {
  type: 'object'
  properties: Record<string, {
    type: string
    description: string
    enum?: string[]
  }>
  required: string[]
}

export interface Tool {
  name: string
  description: string
  inputSchema: ToolInputSchema
  execute: (params: any) => Promise<any>
}

// ============ BUILT-IN TOOLS ============

const calculatorTool: Tool = {
  name: 'calculator',
  description: 'Performs mathematical calculations. Use this for any math operations like addition, subtraction, multiplication, division, percentages, etc.',
  inputSchema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate, e.g., "25 * 4" or "(100 / 5) + 10"'
      }
    },
    required: ['expression']
  },
  execute: async (params) => {
    try {
      // Safe math evaluation (no eval)
      const expr = params.expression
        .replace(/[^0-9+\-*/().%\s]/g, '')
        .replace(/%/g, '/100*')
      const result = Function(`"use strict"; return (${expr})`)()
      return { success: true, result: Number(result.toFixed(10)) }
    } catch (error) {
      return { success: false, error: `Failed to calculate: ${error}` }
    }
  }
}

const datetimeTool: Tool = {
  name: 'datetime',
  description: 'Gets current date and time information. Use this to know what time or date it is.',
  inputSchema: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        description: 'What to return: "full" (date and time), "date" (just date), "time" (just time), "timestamp" (unix timestamp)',
        enum: ['full', 'date', 'time', 'timestamp']
      }
    },
    required: []
  },
  execute: async (params) => {
    const now = new Date()
    const format = params.format || 'full'
    
    switch (format) {
      case 'date':
        return { result: now.toLocaleDateString() }
      case 'time':
        return { result: now.toLocaleTimeString() }
      case 'timestamp':
        return { result: now.getTime() }
      default:
        return { result: now.toLocaleString() }
    }
  }
}

const httpGetTool: Tool = {
  name: 'http_get',
  description: 'Fetches data from a URL using HTTP GET. Use this to retrieve information from websites or APIs.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch data from'
      }
    },
    required: ['url']
  },
  execute: async (params) => {
    try {
      const response = await fetch(params.url)
      const contentType = response.headers.get('content-type') || ''
      
      let data
      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
        // Truncate very long text responses
        if (data.length > 2000) {
          data = data.substring(0, 2000) + '... [truncated]'
        }
      }
      
      return {
        success: true,
        status: response.status,
        data
      }
    } catch (error) {
      return { success: false, error: `HTTP request failed: ${error}` }
    }
  }
}

const fileReadTool: Tool = {
  name: 'file_read',
  description: 'Reads the contents of a file from the local filesystem.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The absolute path to the file to read'
      }
    },
    required: ['path']
  },
  execute: async (params) => {
    try {
      const content = fs.readFileSync(params.path, 'utf-8')
      // Truncate very long files
      const truncated = content.length > 3000 
        ? content.substring(0, 3000) + '... [truncated]'
        : content
      return { success: true, content: truncated, length: content.length }
    } catch (error) {
      return { success: false, error: `Failed to read file: ${error}` }
    }
  }
}

const fileWriteTool: Tool = {
  name: 'file_write',
  description: 'Writes content to a file on the local filesystem. Creates the file if it does not exist.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The absolute path to the file to write'
      },
      content: {
        type: 'string',
        description: 'The content to write to the file'
      }
    },
    required: ['path', 'content']
  },
  execute: async (params) => {
    try {
      // Ensure directory exists
      const dir = path.dirname(params.path)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(params.path, params.content, 'utf-8')
      return { success: true, bytesWritten: params.content.length }
    } catch (error) {
      return { success: false, error: `Failed to write file: ${error}` }
    }
  }
}

const fileListTool: Tool = {
  name: 'file_list',
  description: 'Lists files and directories at a given path.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The directory path to list'
      }
    },
    required: ['path']
  },
  execute: async (params) => {
    try {
      const items = fs.readdirSync(params.path)
      const detailed = items.map(item => {
        const fullPath = path.join(params.path, item)
        const stat = fs.statSync(fullPath)
        return {
          name: item,
          type: stat.isDirectory() ? 'directory' : 'file',
          size: stat.size
        }
      })
      return { success: true, items: detailed }
    } catch (error) {
      return { success: false, error: `Failed to list directory: ${error}` }
    }
  }
}

// ============ ADVANCED TOOLS ============

const mathAdvancedTool: Tool = {
  name: 'math_advanced',
  description: 'Advanced math operations: sqrt, power, sin, cos, tan, log, abs, round, floor, ceil, min, max, random.',
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: 'The operation: sqrt, power, sin, cos, tan, log, abs, round, floor, ceil, min, max, random',
        enum: ['sqrt', 'power', 'sin', 'cos', 'tan', 'log', 'abs', 'round', 'floor', 'ceil', 'min', 'max', 'random']
      },
      value: {
        type: 'number',
        description: 'The primary value for the operation'
      },
      value2: {
        type: 'number',
        description: 'Second value (for power, min, max operations)'
      }
    },
    required: ['operation']
  },
  execute: async (params) => {
    try {
      const { operation, value, value2 } = params
      let result: number
      
      switch (operation) {
        case 'sqrt': result = Math.sqrt(value); break
        case 'power': result = Math.pow(value, value2 || 2); break
        case 'sin': result = Math.sin(value); break
        case 'cos': result = Math.cos(value); break
        case 'tan': result = Math.tan(value); break
        case 'log': result = Math.log(value); break
        case 'abs': result = Math.abs(value); break
        case 'round': result = Math.round(value); break
        case 'floor': result = Math.floor(value); break
        case 'ceil': result = Math.ceil(value); break
        case 'min': result = Math.min(value, value2); break
        case 'max': result = Math.max(value, value2); break
        case 'random': result = Math.random() * (value || 1); break
        default: return { success: false, error: `Unknown operation: ${operation}` }
      }
      
      return { success: true, result: Number(result.toFixed(10)) }
    } catch (error) {
      return { success: false, error: `Math error: ${error}` }
    }
  }
}

const stringOpsTool: Tool = {
  name: 'string_ops',
  description: 'String operations: length, uppercase, lowercase, reverse, trim, replace, split, contains, startsWith, endsWith.',
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: 'The operation: length, uppercase, lowercase, reverse, trim, replace, split, contains, startsWith, endsWith',
        enum: ['length', 'uppercase', 'lowercase', 'reverse', 'trim', 'replace', 'split', 'contains', 'startsWith', 'endsWith']
      },
      text: {
        type: 'string',
        description: 'The text to operate on'
      },
      search: {
        type: 'string',
        description: 'Search string (for replace, split, contains, startsWith, endsWith)'
      },
      replacement: {
        type: 'string',
        description: 'Replacement string (for replace operation)'
      }
    },
    required: ['operation', 'text']
  },
  execute: async (params) => {
    try {
      const { operation, text, search, replacement } = params
      let result: any
      
      switch (operation) {
        case 'length': result = text.length; break
        case 'uppercase': result = text.toUpperCase(); break
        case 'lowercase': result = text.toLowerCase(); break
        case 'reverse': result = text.split('').reverse().join(''); break
        case 'trim': result = text.trim(); break
        case 'replace': result = text.replace(new RegExp(search, 'g'), replacement || ''); break
        case 'split': result = text.split(search || ' '); break
        case 'contains': result = text.includes(search); break
        case 'startsWith': result = text.startsWith(search); break
        case 'endsWith': result = text.endsWith(search); break
        default: return { success: false, error: `Unknown operation: ${operation}` }
      }
      
      return { success: true, result }
    } catch (error) {
      return { success: false, error: `String error: ${error}` }
    }
  }
}

const jsonQueryTool: Tool = {
  name: 'json_query',
  description: 'Query JSON data using dot notation paths. Extract specific values from JSON objects.',
  inputSchema: {
    type: 'object',
    properties: {
      json: {
        type: 'string',
        description: 'The JSON string to query'
      },
      path: {
        type: 'string',
        description: 'The path to extract, e.g., "user.name" or "items.0.title" or "data.results.length"'
      }
    },
    required: ['json', 'path']
  },
  execute: async (params) => {
    try {
      const data = typeof params.json === 'string' ? JSON.parse(params.json) : params.json
      const path = params.path.split('.')
      
      let result = data
      for (const key of path) {
        if (result === undefined || result === null) {
          return { success: false, error: `Path not found: ${params.path}` }
        }
        // Handle array indices and "length" property
        if (key === 'length' && Array.isArray(result)) {
          result = result.length
        } else {
          result = result[key]
        }
      }
      
      return { success: true, result }
    } catch (error) {
      return { success: false, error: `JSON query error: ${error}` }
    }
  }
}

const shellTool: Tool = {
  name: 'shell',
  description: 'Execute a shell command (safe commands only: ls, cat, head, tail, wc, grep, find, echo, pwd, whoami, date, uname).',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute, e.g., "ls /tmp" or "date"'
      }
    },
    required: ['command']
  },
  execute: async (params) => {
    const { execSync } = require('child_process')
    const allowedCommands = ['ls', 'cat', 'head', 'tail', 'wc', 'grep', 'find', 'echo', 'pwd', 'whoami', 'date', 'uname']
    
    try {
      // Handle various input formats
      let cmd = params.command || params.raw || params.cmd || ''
      if (typeof cmd !== 'string') {
        cmd = String(cmd)
      }
      cmd = cmd.replace(/`/g, '').trim()  // Remove backticks
      
      if (!cmd) {
        return { success: false, error: 'No command provided. Use {"command": "ls /tmp"}' }
      }
      
      const firstWord = cmd.split(' ')[0]
      
      if (!allowedCommands.includes(firstWord)) {
        return { success: false, error: `Command not allowed: ${firstWord}. Allowed: ${allowedCommands.join(', ')}` }
      }
      
      const output = execSync(cmd, { encoding: 'utf-8', timeout: 5000 })
      return { success: true, output: output.substring(0, 2000) }
    } catch (error: any) {
      return { success: false, error: `Shell error: ${error.message}` }
    }
  }
}

const generateIdTool: Tool = {
  name: 'generate_id',
  description: 'Generate unique identifiers: uuid, timestamp, random string.',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Type of ID: uuid, timestamp, random',
        enum: ['uuid', 'timestamp', 'random']
      },
      length: {
        type: 'number',
        description: 'Length for random string (default 8)'
      }
    },
    required: ['type']
  },
  execute: async (params) => {
    // Handle various input formats
    const type = params.type || params.raw || 'uuid'
    const length = params.length || 8
    let result: string
    
    switch (type) {
      case 'uuid':
        result = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0
          const v = c === 'x' ? r : (r & 0x3 | 0x8)
          return v.toString(16)
        })
        break
      case 'timestamp':
        result = Date.now().toString()
        break
      case 'random':
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        result = Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        break
      default:
        return { success: false, error: `Unknown type: ${type}. Use: uuid, timestamp, or random` }
    }
    
    return { success: true, id: result }
  }
}

// ============ TOOL REGISTRY ============

const BUILT_IN_TOOLS: Tool[] = [
  calculatorTool,
  datetimeTool,
  httpGetTool,
  fileReadTool,
  fileWriteTool,
  fileListTool,
  // Advanced tools
  mathAdvancedTool,
  stringOpsTool,
  jsonQueryTool,
  shellTool,
  generateIdTool,
]

// Registry holds all available tools
const toolRegistry = new Map<string, Tool>()

// Initialize with built-in tools
export function initToolRegistry() {
  BUILT_IN_TOOLS.forEach(tool => {
    toolRegistry.set(tool.name, tool)
  })
  console.log('[Tools] Initialized with:', Array.from(toolRegistry.keys()))
}

// Get a tool by name
export function getTool(name: string): Tool | undefined {
  return toolRegistry.get(name)
}

// Get all tools
export function getAllTools(): Tool[] {
  return Array.from(toolRegistry.values())
}

// Get tool names
export function getToolNames(): string[] {
  return Array.from(toolRegistry.keys())
}

// Register a new tool (for plugins)
export function registerTool(tool: Tool) {
  toolRegistry.set(tool.name, tool)
  console.log('[Tools] Registered:', tool.name)
}

// Generate tool descriptions for LLM prompt
export function getToolDescriptionsForPrompt(): string {
  const tools = getAllTools()
  return tools.map(tool => {
    const params = Object.entries(tool.inputSchema.properties)
      .map(([name, prop]) => `  - ${name}: ${prop.description}`)
      .join('\n')
    return `${tool.name}: ${tool.description}\n  Parameters:\n${params}`
  }).join('\n\n')
}

// Initialize on import
initToolRegistry()

export default {
  getTool,
  getAllTools,
  getToolNames,
  registerTool,
  getToolDescriptionsForPrompt,
}
