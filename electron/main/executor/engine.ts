/**
 * Workflow Execution Engine
 * 
 * Executes workflows by:
 * 1. Topologically sorting nodes based on edges
 * 2. Executing each node in order
 * 3. Passing outputs to connected input nodes
 * 4. Reporting progress back to the renderer
 */

import { BrowserWindow } from 'electron'
import { getNodeType, ExecutionContext, NodeInput } from './nodeTypes'
import LLMManager from '../llm/manager'

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
 */
function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  // Initialize
  nodes.forEach(n => {
    inDegree.set(n.id, 0)
    adjacency.set(n.id, [])
  })

  // Build graph
  edges.forEach(e => {
    adjacency.get(e.source)?.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
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
  }

  const sendProgress = (nodeId: string, status: string, data?: any) => {
    window?.webContents.send('workflow:node-progress', { nodeId, status, data })
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
        const sourceHandle = edge.sourceHandle || Object.keys(sourceOutputs)[0]
        const targetHandle = edge.targetHandle || nodeType.inputs[0]?.id || 'input'
        
        if (sourceOutputs[sourceHandle] !== undefined) {
          inputs[targetHandle] = sourceOutputs[sourceHandle]
        }
      }

      // Execute the node
      try {
        const config = node.data.config || {}
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

    return {
      success: false,
      outputs: {},
      logs,
      error: errorMsg,
    }
  }
}

export default { executeWorkflow }
