/**
 * AI Orchestrator Node Registration
 * 
 * This file registers the AI Orchestrator as a node type.
 * It's separate from nodeTypes.ts because it depends on the tools system.
 * 
 * Tools can be:
 * 1. Connected visually (tool nodes wired to orchestrator's tool port)
 * 2. Configured via text field (fallback)
 */

import { NodeTypeDefinition, registerNode, ExecutionContext, ToolSchema } from './nodeTypes'
import { runOrchestrator } from './orchestrator'
import { getToolNames, getTool } from './tools'

const aiOrchestratorNode: NodeTypeDefinition = {
  id: 'ai-orchestrator',
  name: 'AI Orchestrator',
  category: 'ai',
  inputs: [
    { id: 'task', name: 'Task', type: 'string' },
    // Note: 'tools' is a special port handled by the UI, not a regular input
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'string' },
    { id: 'steps', name: 'Steps', type: 'any' },
    { id: 'memory', name: 'Memory', type: 'object' },
  ],
  config: {
    systemPrompt: { 
      type: 'text', 
      label: 'System Context', 
      default: '' 
    },
    maxSteps: { 
      type: 'number', 
      label: 'Max Steps', 
      default: 10 
    },
    // Fallback: only used if no tools are visually connected
    tools: { 
      type: 'text', 
      label: 'Fallback Tools (if none connected)', 
      default: '' 
    },
  },
  execute: async (inputs, config, context: ExecutionContext) => {
    const task = inputs.task || inputs.input || inputs.prompt || inputs.text || ''
    
    context.log(`[Orchestrator] Received inputs: ${JSON.stringify(Object.keys(inputs))}`)
    
    if (!task) {
      context.log('[Orchestrator] No task provided')
      return { 
        result: 'Error: No task provided', 
        steps: [],
        memory: { task: '', steps: [], status: 'error' }
      }
    }

    // Check for visually connected tools (passed by engine)
    const connectedTools: ToolSchema[] = config._connectedTools || []
    let enabledTools: string[] = []
    
    if (connectedTools.length > 0) {
      // Use connected tools
      enabledTools = connectedTools.map(t => t.name)
      context.log(`Using ${connectedTools.length} connected tools: ${enabledTools.join(', ')}`)
    } else if (config.tools) {
      // Fallback to config text field
      const configTools = config.tools.split(',').map((t: string) => t.trim()).filter(Boolean)
      const availableTools = getToolNames()
      enabledTools = configTools.filter((t: string) => availableTools.includes(t))
      context.log(`Using fallback config tools: ${enabledTools.join(', ')}`)
    }
    
    if (enabledTools.length === 0) {
      context.log(`No tools available. Connect tool nodes to the orchestrator's tool port.`)
      return {
        result: 'Error: No tools connected. Drag tool nodes and connect them to the orchestrator.',
        steps: [],
        memory: { task, steps: [], status: 'error' }
      }
    }

    context.log(`Orchestrator starting task: "${task.substring(0, 100)}..."`)

    // Run the orchestrator
    const memory = await runOrchestrator(
      task,
      {
        maxSteps: config.maxSteps || 10,
        enabledTools,
        systemPrompt: config.systemPrompt || undefined
      },
      {
        log: context.log,
        onThought: (thought) => {
          context.log(`💭 ${thought}`)
        },
        onAction: (action, input) => {
          context.log(`🔧 ${action}: ${JSON.stringify(input)}`)
        },
        onResult: (result) => {
          context.log(`📋 Result: ${JSON.stringify(result).substring(0, 100)}...`)
        },
        onComplete: (finalResult) => {
          context.log(`✅ Complete: ${finalResult}`)
        },
        onError: (error) => {
          context.log(`❌ Error: ${error}`)
        }
      }
    )

    return {
      result: memory.finalResult || 'No result',
      steps: memory.steps,
      memory
    }
  }
}

// Register the orchestrator node
export function registerOrchestratorNode() {
  registerNode(aiOrchestratorNode)
}

export default { registerOrchestratorNode }
