/**
 * Workflow Execution Engine
 * 
 * Executes workflows by:
 * 1. Topologically sorting nodes based on edges
 * 2. Executing each node in order
 * 3. Passing outputs to connected input nodes
 * 4. Reporting progress back to the renderer
 * 5. Discovering tools connected to orchestrator nodes
 */

import { BrowserWindow } from 'electron'
import { getNodeType, ExecutionContext, NodeInput, ToolSchema } from './nodeTypes'
import LLMManager from '../llm/manager'
import { broadcastToClient } from '../claudeControl'

interface WorkflowNode {
  id: string
  type: string
  data: {
    label: string
    type: string
    config?: Record<string, any>
  }
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

interface Workflow {
  id: string
  name: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

interface ExecutionResult {
  success: boolean
  outputs: Record<string, any>
  logs: string[]
  error?: string
}

/**
 * Topologically sort nodes based on edges
 * Returns nodes in execution order (sources before targets)
 * Excludes tool nodes (they don't execute in normal flow)
 */
function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  // Filter out tool nodes - they don't execute in the data flow
  const executableNodes = nodes.filter(n => !n.data.type.startsWith('tool-'))
  
  // Filter out tool edges (connections to 'tools' handle)
  const dataEdges = edges.filter(e => e.targetHandle !== 'tools')
  
  const nodeMap = new Map(executableNodes.map(n => [n.id, n]))
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  // Initialize
  executableNodes.forEach(n => {
    inDegree.set(n.id, 0)
    adjacency.set(n.id, [])
  })

  // Build graph (only using data edges)
  dataEdges.forEach(e => {
    if (adjacency.has(e.source) && inDegree.has(e.target)) {
      adjacency.get(e.source)?.push(e.target)
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
    }
  })

  // Kahn's algorithm
  const queue: string[] = []
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId)
  })

  const sorted: WorkflowNode[] = []
  while (queue.length > 0) {
    const nodeId = queue.shift()!
    const node = nodeMap.get(nodeId)
    if (node) sorted.push(node)

    adjacency.get(nodeId)?.forEach(targetId => {
      const newDegree = (inDegree.get(targetId) || 0) - 1
      inDegree.set(targetId, newDegree)
      if (newDegree === 0) queue.push(targetId)
    })
  }

  return sorted
}

/**
 * Find tools connected to a node's "tools" handle
 * Returns array of tool info including schemas and node IDs
 */
interface ConnectedToolInfo {
  schema: ToolSchema
  nodeId: string
  toolName: string
}

function getConnectedTools(
  nodeId: string, 
  workflow: Workflow
): ConnectedToolInfo[] {
  const connectedTools: ConnectedToolInfo[] = []
  
  // Find edges targeting this node's "tools" handle
  const toolEdges = workflow.edges.filter(
    e => e.target === nodeId && e.targetHandle === 'tools'
  )
  
  for (const edge of toolEdges) {
    // Find the source node
    const sourceNode = workflow.nodes.find(n => n.id === edge.source)
    if (!sourceNode) continue
    
    // Get the node type definition
    const nodeType = getNodeType(sourceNode.data.type)
    if (!nodeType?.toolSchema) continue
    
    connectedTools.push({
      schema: nodeType.toolSchema,
      nodeId: sourceNode.id,
      toolName: nodeType.toolSchema.name
    })
  }
  
  return connectedTools
}

/**
 * Execute a workflow
 */
export async function executeWorkflow(
  workflow: Workflow,
  window: BrowserWindow | null
): Promise<ExecutionResult> {
  const logs: string[] = []
  const nodeOutputs = new Map<string, Record<string, any>>()

  const log = (message: string) => {
    const timestamp = new Date().toISOString().substr(11, 8)
    const logLine = `[${timestamp}] ${message}`
    logs.push(logLine)
    console.log(`[Executor] ${message}`)
    window?.webContents.send('workflow:log', logLine)
    // Also broadcast to WebSocket client
    broadcastToClient({ type: 'workflow:log', message: logLine })
  }

  const sendProgress = (nodeId: string, status: string, data?: any) => {
    window?.webContents.send('workflow:node-progress', { nodeId, status, data })
    // Also broadcast to WebSocket client
    broadcastToClient({ type: 'workflow:progress', nodeId, status, data })
  }

  // Create execution context
  const context: ExecutionContext = {
    llm: LLMManager,
    workflowId: workflow.id,
    log,
    sendProgress,
  }

  log(`Starting workflow: ${workflow.name}`)
  window?.webContents.send('workflow:execution-start', { workflowId: workflow.id })

  try {
    // Sort nodes topologically
    const sortedNodes = topologicalSort(workflow.nodes, workflow.edges)
    log(`Execution order: ${sortedNodes.map(n => n.data.label).join(' → ')}`)

    // Execute each node
    for (const node of sortedNodes) {
      const nodeType = getNodeType(node.data.type)
      if (!nodeType) {
        log(`Unknown node type: ${node.data.type}`)
        continue
      }

      log(`Executing: ${node.data.label} (${node.data.type})`)
      sendProgress(node.id, 'running')

      // Gather inputs from connected nodes
      const inputs: NodeInput = {}
      const incomingEdges = workflow.edges.filter(e => e.target === node.id)
      
      for (const edge of incomingEdges) {
        const sourceOutputs = nodeOutputs.get(edge.source) || {}
        
        // Determine source handle - use specified or first available
        const sourceHandle = edge.sourceHandle || Object.keys(sourceOutputs)[0]
        const sourceValue = sourceOutputs[sourceHandle]
        
        if (sourceValue !== undefined) {
          // Determine target handle
          let targetHandle = edge.targetHandle
          
          if (!targetHandle) {
            // Smart mapping: try to find the best input match
            const inputIds = nodeType.inputs.map(i => i.id)
            
            // Common mappings
            if (inputIds.includes('content') && (sourceHandle === 'response' || sourceHandle === 'output' || sourceHandle === 'text')) {
              targetHandle = 'content'
            } else if (inputIds.includes('input')) {
              targetHandle = 'input'
            } else if (inputIds.includes('prompt') && (sourceHandle === 'text' || sourceHandle === 'output')) {
              targetHandle = 'prompt'
            } else {
              targetHandle = nodeType.inputs[0]?.id || 'input'
            }
          }
          
          inputs[targetHandle] = sourceValue
          
          // Also populate common aliases for backwards compatibility
          if (!inputs.input) inputs.input = sourceValue
          if (!inputs.prompt && typeof sourceValue === 'string') inputs.prompt = sourceValue
          if (!inputs.text && typeof sourceValue === 'string') inputs.text = sourceValue
        }
      }

      // Execute the node
      try {
        const config = node.data.config || {}
        
        // For orchestrator nodes, discover connected tools
        if (node.data.type === 'ai-orchestrator') {
          const connectedTools = getConnectedTools(node.id, workflow)
          if (connectedTools.length > 0) {
            // Pass connected tools info (includes node IDs for progress updates)
            config._connectedTools = connectedTools.map(t => t.schema)
            config._toolNodeMap = Object.fromEntries(
              connectedTools.map(t => [t.toolName, t.nodeId])
            )
            config._sendProgress = sendProgress  // Pass progress function
            log(`Orchestrator has ${connectedTools.length} connected tools: ${connectedTools.map(t => t.toolName).join(', ')}`)
          } else {
            log(`Orchestrator has no connected tools - using config.tools fallback`)
          }
        }
        
        const outputs = await nodeType.execute(inputs, config, context)
        nodeOutputs.set(node.id, outputs)
        sendProgress(node.id, 'complete', outputs)
        log(`Completed: ${node.data.label}`)
      } catch (error) {
        log(`Error in ${node.data.label}: ${error}`)
        sendProgress(node.id, 'error', { error: String(error) })
        throw error
      }
    }

    log(`Workflow complete!`)
    window?.webContents.send('workflow:execution-complete', { 
      workflowId: workflow.id,
      success: true 
    })

    // Collect all outputs
    const allOutputs: Record<string, any> = {}
    nodeOutputs.forEach((outputs, nodeId) => {
      allOutputs[nodeId] = outputs
    })

    // Broadcast final result to WebSocket - find debug node output
    const debugOutput = Array.from(nodeOutputs.entries())
      .find(([id, _]) => workflow.nodes.find(n => n.id === id && n.data.type === 'debug'))
    broadcastToClient({ 
      type: 'workflow:complete', 
      success: true, 
      result: debugOutput ? debugOutput[1] : allOutputs 
    })

    return {
      success: true,
      outputs: allOutputs,
      logs,
    }

  } catch (error) {
    const errorMsg = String(error)
    log(`Workflow failed: ${errorMsg}`)
    window?.webContents.send('workflow:execution-complete', {
      workflowId: workflow.id,
      success: false,
      error: errorMsg,
    })
    broadcastToClient({ type: 'workflow:error', error: errorMsg })

    return {
      success: false,
      outputs: {},
      logs,
      error: errorMsg,
    }
  }
}

export default { executeWorkflow }
