/**
 * Plugin Registry
 * Registers plugin tools with the main tool registry and node types
 */

import { getAllPluginTools } from './loader'
import { registerTool, Tool } from '../executor/tools'
import { registerNode, NodeTypeDefinition } from '../executor/nodeTypes'

/**
 * Register all plugin tools with the main tool registry and as node types
 */
export function registerPluginTools(): number {
  const pluginTools = getAllPluginTools()
  let count = 0
  
  for (const { pluginId, tool, executor } of pluginTools) {
    // Build input schema
    const inputSchema = {
      type: 'object' as const,
      properties: Object.fromEntries(
        Object.entries(tool.inputs || {}).map(([key, input]: [string, any]) => [
          key,
          {
            type: input.type || 'string',
            description: input.description || key
          }
        ])
      ),
      required: Object.entries(tool.inputs || {})
        .filter(([_, input]: [string, any]) => input.required)
        .map(([key]) => key)
    }

    // Convert plugin tool format to main Tool format
    const registryTool: Tool = {
      name: tool.id,
      description: tool.description,
      inputSchema,
      execute: async (params: any) => {
        try {
          return await executor.execute(params, {}, {})
        } catch (err) {
          return { success: false, error: String(err) }
        }
      }
    }
    
    registerTool(registryTool)

    // Also register as a node type so orchestrator can discover it
    const nodeType: NodeTypeDefinition = {
      id: `tool-${tool.id}`,
      name: tool.name,
      category: 'plugin-tools',
      inputs: ['trigger'],
      outputs: ['result'],
      execute: async (inputs: any, config: any) => {
        const result = await executor.execute(inputs, config, {})
        return { result }
      },
      toolSchema: {
        name: tool.id,
        description: tool.description,
        inputSchema
      }
    }

    registerNode(nodeType)
    console.log(`[Plugins] Registered tool: ${tool.id} (from ${pluginId})`)
    count++
  }
  
  return count
}

export default { registerPluginTools }
