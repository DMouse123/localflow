/**
 * Command Executor
 * Executes Master AI commands and builds workflows
 */

import { getTemplate, listTemplates } from './templates'
import { executeWorkflow } from './executor/engine'
import { BrowserWindow } from 'electron'

interface WorkflowState {
  nodes: any[]
  edges: any[]
  nextNodeId: number
}

// In-memory workflow state per session
const sessionWorkflows: Map<string, WorkflowState> = new Map()

function getWorkflowState(sessionId: string): WorkflowState {
  if (!sessionWorkflows.has(sessionId)) {
    sessionWorkflows.set(sessionId, {
      nodes: [],
      edges: [],
      nextNodeId: 1
    })
  }
  return sessionWorkflows.get(sessionId)!
}

/**
 * Execute a command from the Master AI
 */
export async function executeCommand(
  sessionId: string,
  command: any,
  mainWindow: BrowserWindow | null
): Promise<{ success: boolean; result: string; nodeId?: string }> {
  const state = getWorkflowState(sessionId)
  
  switch (command.action) {
    case 'addNode': {
      const nodeId = `node_${state.nextNodeId++}`
      const node = {
        id: nodeId,
        type: 'custom',
        position: { x: 150 + state.nodes.length * 200, y: 200 },
        data: {
          label: command.label || command.type,
          type: command.type,
          config: command.config || {}
        }
      }
      state.nodes.push(node)
      
      // Also send to UI if window available
      mainWindow?.webContents.send('workflow:addNode', node)
      
      return { 
        success: true, 
        result: `Added node "${node.data.label}" (${nodeId})`,
        nodeId 
      }
    }
    
    case 'connect': {
      const edge = {
        id: `edge_${Date.now()}`,
        source: command.from,
        target: command.to,
        sourceHandle: command.sourceHandle,
        targetHandle: command.targetHandle
      }
      state.edges.push(edge)
      
      // Also send to UI if window available
      mainWindow?.webContents.send('workflow:addEdge', edge)
      
      return { 
        success: true, 
        result: `Connected ${command.from} → ${command.to}` 
      }
    }
    
    case 'clear': {
      state.nodes = []
      state.edges = []
      state.nextNodeId = 1
      
      mainWindow?.webContents.send('workflow:clear')
      
      return { success: true, result: 'Canvas cleared' }
    }
    
    case 'loadTemplate': {
      const template = getTemplate(command.id)
      if (!template) {
        return { success: false, result: `Template not found: ${command.id}` }
      }
      
      state.nodes = JSON.parse(JSON.stringify(template.nodes))
      state.edges = JSON.parse(JSON.stringify(template.edges))
      
      // Find the highest node ID number in the template to avoid collisions
      let maxId = 0
      for (const node of state.nodes) {
        const match = node.id.match(/(\d+)/)
        if (match) {
          maxId = Math.max(maxId, parseInt(match[1]))
        }
      }
      state.nextNodeId = maxId + 1
      
      // Build a summary of loaded nodes
      const nodeList = state.nodes.map((n: any) => `${n.id}: ${n.data?.type || n.type}`).join(', ')
      
      mainWindow?.webContents.send('workflow:loadTemplate', template)
      
      return { success: true, result: `Loaded template: ${template.name}. Nodes: ${nodeList}` }
    }
    
    case 'run': {
      // Run current workflow or a template
      if (command.templateId) {
        const template = getTemplate(command.templateId)
        if (!template) {
          return { success: false, result: `Template not found: ${command.templateId}` }
        }
        
        try {
          const result = await executeWorkflow(
            { id: command.templateId, name: template.name, nodes: template.nodes, edges: template.edges },
            mainWindow
          )
          
          // Extract final result
          const outputs = result.outputs || {}
          const orchestratorOutput = Object.values(outputs).find((o: any) => o.result || o.memory)
          const finalResult = (orchestratorOutput as any)?.result || 
                            (orchestratorOutput as any)?.memory?.finalResult || 
                            'Workflow completed'
          
          return { success: true, result: `Workflow result: ${finalResult}` }
        } catch (err) {
          return { success: false, result: `Workflow failed: ${err}` }
        }
      } else if (state.nodes.length > 0) {
        // Run the workflow we've been building
        try {
          const result = await executeWorkflow(
            { id: 'session-workflow', name: 'Session Workflow', nodes: state.nodes, edges: state.edges },
            mainWindow
          )
          return { success: true, result: 'Workflow executed' }
        } catch (err) {
          return { success: false, result: `Workflow failed: ${err}` }
        }
      } else {
        return { success: false, result: 'No workflow to run. Add some nodes first.' }
      }
    }
    
    case 'getWorkflow': {
      return { 
        success: true, 
        result: JSON.stringify({ nodes: state.nodes, edges: state.edges }, null, 2)
      }
    }
    
    default:
      return { success: false, result: `Unknown action: ${command.action}` }
  }
}

/**
 * Execute multiple commands
 */
export async function executeCommands(
  sessionId: string,
  commands: any[],
  mainWindow: BrowserWindow | null
): Promise<string[]> {
  const results: string[] = []
  
  for (const command of commands) {
    const result = await executeCommand(sessionId, command, mainWindow)
    results.push(result.result)
  }
  
  return results
}

/**
 * Get the current workflow state for a session
 */
export function getSessionWorkflow(sessionId: string): WorkflowState {
  return getWorkflowState(sessionId)
}

export default {
  executeCommand,
  executeCommands,
  getSessionWorkflow
}
