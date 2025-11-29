/**
 * Workflow Tool Node
 * Allows workflows to call other workflows as tools
 */

import { NodeTypeDefinition } from './nodeTypes'
import { executeWorkflow } from './engine'
import { getWorkflow, listWorkflows } from '../workflowStorage'

/**
 * Create a tool node for a saved workflow
 */
export function createWorkflowToolNode(workflowId: string, workflowName: string): NodeTypeDefinition {
  return {
    id: `tool-workflow-${workflowId}`,
    name: workflowName,
    category: 'tool',
    inputs: [],
    outputs: [],
    config: {},
    execute: async () => ({}),
    toolSchema: {
      name: `workflow_${workflowId.replace(/[^a-zA-Z0-9]/g, '_')}`,
      description: `Run the "${workflowName}" workflow`,
      inputSchema: {
        type: 'object',
        properties: {
          input: { 
            type: 'string', 
            description: 'Input text to pass to the workflow (will be set as the first text-input node\'s value)' 
          }
        },
        required: []
      }
    }
  }
}

/**
 * Register all saved workflows as tool nodes
 */
export function registerWorkflowTools(registerNode: (node: NodeTypeDefinition) => void): number {
  const workflows = listWorkflows()
  let count = 0
  
  for (const workflow of workflows) {
    const node = createWorkflowToolNode(workflow.id, workflow.name)
    registerNode(node)
    count++
  }
  
  console.log(`[WorkflowTools] Registered ${count} workflow tools`)
  return count
}

/**
 * Execute a saved workflow as a tool
 * Returns the result from the last debug node or orchestrator
 */
export async function executeWorkflowTool(
  workflowId: string, 
  input?: string
): Promise<{ success: boolean; result?: string; error?: string }> {
  const workflow = getWorkflow(workflowId)
  
  if (!workflow) {
    return { success: false, error: `Workflow not found: ${workflowId}` }
  }
  
  // Clone nodes to avoid mutation
  const nodes = JSON.parse(JSON.stringify(workflow.nodes))
  
  // If input provided, set it on the first text-input node
  if (input) {
    const textInputNode = nodes.find((n: any) => n.data?.type === 'text-input')
    if (textInputNode) {
      textInputNode.data.config = textInputNode.data.config || {}
      textInputNode.data.config.text = input
    }
  }
  
  try {
    const result = await executeWorkflow(
      { id: workflowId, name: workflow.name, nodes, edges: workflow.edges },
      null // No window for sub-workflow execution
    )
    
    // Extract the final result from outputs
    const outputs = result.outputs || {}
    console.log('[WorkflowTool] Outputs:', JSON.stringify(outputs, null, 2))
    
    // Build a map of node types
    const nodeTypes: Record<string, string> = {}
    for (const node of nodes) {
      nodeTypes[node.id] = node.data?.type || ''
    }
    console.log('[WorkflowTool] Node types:', nodeTypes)
    
    // Priority 1: Orchestrator output
    for (const [nodeId, output] of Object.entries(outputs)) {
      if (nodeTypes[nodeId] === 'ai-orchestrator') {
        if ((output as any)?.result || (output as any)?.memory?.finalResult) {
          return { 
            success: true, 
            result: (output as any).result || (output as any).memory?.finalResult 
          }
        }
      }
    }
    
    // Priority 2: AI chat/transform response
    for (const [nodeId, output] of Object.entries(outputs)) {
      if ((nodeTypes[nodeId] === 'ai-chat' || nodeTypes[nodeId] === 'ai-transform') && output) {
        const response = (output as any).response || (output as any).output
        if (response) {
          return { success: true, result: response }
        }
      }
    }
    
    // Priority 3: Debug node output (only if it has actual content)
    for (const [nodeId, output] of Object.entries(outputs)) {
      if (nodeTypes[nodeId] === 'debug' && output && Object.keys(output as object).length > 0) {
        return { success: true, result: JSON.stringify(output) }
      }
    }
    
    // Fallback: return last non-trigger output
    const outputEntries = Object.entries(outputs)
    for (let i = outputEntries.length - 1; i >= 0; i--) {
      const [nodeId, output] = outputEntries[i]
      if (nodeTypes[nodeId] !== 'trigger' && nodeTypes[nodeId] !== 'text-input' && output) {
        return { success: true, result: typeof output === 'string' ? output : JSON.stringify(output) }
      }
    }
    
    return { success: true, result: 'Workflow completed' }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export default {
  createWorkflowToolNode,
  registerWorkflowTools,
  executeWorkflowTool
}
