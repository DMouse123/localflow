/**
 * Plugin Types
 * TypeScript interfaces for the plugin system
 */

export interface PluginToolInput {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required?: boolean
  description?: string
  default?: any
}

export interface PluginToolOutput {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
}

export interface PluginToolConfig {
  type: 'string' | 'number' | 'boolean'
  label: string
  default?: any
  description?: string
}

export interface PluginToolDefinition {
  id: string
  name: string
  description: string
  file: string
  icon?: string
  color?: string
  inputs: Record<string, PluginToolInput>
  outputs: Record<string, PluginToolOutput>
  config?: Record<string, PluginToolConfig>
}

export interface PluginNodeDefinition {
  id: string
  name: string
  description: string
  file: string
  type: 'trigger' | 'action' | 'transform'
  icon?: string
  color?: string
}

export interface PluginManifest {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  tools?: PluginToolDefinition[]
  nodes?: PluginNodeDefinition[]
}

export interface LoadedPlugin {
  manifest: PluginManifest
  path: string
  tools: Map<string, PluginToolExecutor>
}

export interface PluginToolExecutor {
  execute: (input: any, config: any, context: any) => Promise<any>
}
