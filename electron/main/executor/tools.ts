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

// ============ TOOL REGISTRY ============

const BUILT_IN_TOOLS: Tool[] = [
  calculatorTool,
  datetimeTool,
  httpGetTool,
  fileReadTool,
  fileWriteTool,
  fileListTool,
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
