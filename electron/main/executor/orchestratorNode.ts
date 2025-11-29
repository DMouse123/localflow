/**
 * AI Orchestrator Node Registration
 * 
 * This file registers the AI Orchestrator as a node type.
 * It's separate from nodeTypes.ts because it depends on the tools system.
 */

import { NodeTypeDefinition, registerNode, ExecutionContext } from './nodeTypes'
import { runOrchestrator } from './orchestrator'
import { getToolNames } from './tools'

const aiOrchestratorNode: NodeTypeDefinition = {
  id: 'ai-orchestrator',
  name: 'AI Orchestrator',
  category: 'ai',
  inputs: [
    { id: 'task', name: 'Task', type: 'string' },
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
    tools: { 
      type: 'text', 
      label: 'Enabled Tools', 
      default: 'calculator,datetime,http_get,file_read,file_write,file_list' 
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

    // Parse enabled tools
    const enabledToolsInput = config.tools || 'calculator,datetime'
    const enabledTools = enabledToolsInput.split(',').map((t: string) => t.trim())
    
    // Validate tools exist
    const availableTools = getToolNames()
    const validTools = enabledTools.filter((t: string) => availableTools.includes(t))
    
    if (validTools.length === 0) {
      context.log(`No valid tools enabled. Available: ${availableTools.join(', ')}`)
      return {
        result: 'Error: No valid tools enabled',
        steps: [],
        memory: { task, steps: [], status: 'error' }
      }
    }

    context.log(`Orchestrator starting task: "${task.substring(0, 100)}..."`)
    context.log(`Enabled tools: ${validTools.join(', ')}`)

    // Run the orchestrator
    const memory = await runOrchestrator(
      task,
      {
        maxSteps: config.maxSteps || 10,
        enabledTools: validTools,
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
