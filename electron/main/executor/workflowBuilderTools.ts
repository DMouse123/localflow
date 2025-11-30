/**
 * Workflow Builder Tools
 * Tools that allow the AI orchestrator to build workflows programmatically
 */

import { Tool } from './tools'

// Store for workflow being built (separate from chat sessions)
interface BuilderState {
  nodes: any[]
  edges: any[]
  nextNodeId: number
}

const builderState: BuilderState = {
  nodes: [],
  edges: [],
  nextNodeId: 1
}

// Reset builder state
export function resetBuilderState() {
  builderState.nodes = []
  builderState.edges = []
  builderState.nextNodeId = 1
}

// Get current builder state
export function getBuilderState() {
  return builderState
}

/**
 * Tool: Clear the workflow canvas
 */
export const clearCanvasTool: Tool = {
  name: 'clear_canvas',
  description: 'Clears all nodes and connections from the workflow canvas. Use this to start fresh before building a new workflow.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async () => {
    resetBuilderState()
    return { 
      success: true, 
      message: 'Canvas cleared. Ready to build a new workflow.' 
    }
  }
}

/**
 * Tool: Add a node to the workflow
 */
export const addNodeTool: Tool = {
  name: 'add_node',
  description: `Adds a node to the workflow canvas. 
Node types available:
- text-input: Static text that feeds into other nodes. Use config.text to set the content.
- ai-chat: Sends input to AI and gets response. Use config.systemPrompt to set behavior.
- ai-orchestrator: Autonomous AI agent with tools. Use config.tools to list available tools.
- debug: Displays output for viewing results.
Returns the node_id which you need for connecting nodes.`,
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Node type: text-input, ai-chat, ai-orchestrator, or debug'
      },
      label: {
        type: 'string',
        description: 'Display name for the node'
      },
      config_text: {
        type: 'string',
        description: 'For text-input nodes: the text content to provide'
      },
      config_systemPrompt: {
        type: 'string',
        description: 'For ai-chat nodes: the system prompt to use'
      },
      config_tools: {
        type: 'string',
        description: 'For ai-orchestrator nodes: comma-separated list of tools to enable'
      }
    },
    required: ['type', 'label']
  },
  execute: async (params) => {
    const nodeId = `node_${builderState.nextNodeId++}`
    
    // Build config from params
    const config: any = {}
    if (params.config_text) config.text = params.config_text
    if (params.config_systemPrompt) config.systemPrompt = params.config_systemPrompt
    if (params.config_tools) config.tools = params.config_tools
    
    const node = {
      id: nodeId,
      type: 'custom',
      position: { x: 150 + builderState.nodes.length * 250, y: 200 },
      data: {
        label: params.label,
        type: params.type,
        config
      }
    }
    
    builderState.nodes.push(node)
    
    return { 
      success: true, 
      node_id: nodeId,
      message: `Added ${params.type} node "${params.label}" with id ${nodeId}`
    }
  }
}

/**
 * Tool: Connect two nodes
 */
export const connectNodesTool: Tool = {
  name: 'connect_nodes',
  description: 'Connects two nodes in the workflow. The output of the source node will flow to the input of the target node. Use the node_id values returned from add_node.',
  inputSchema: {
    type: 'object',
    properties: {
      from_node_id: {
        type: 'string',
        description: 'The node_id of the source node (where data comes from)'
      },
      to_node_id: {
        type: 'string',
        description: 'The node_id of the target node (where data goes to)'
      }
    },
    required: ['from_node_id', 'to_node_id']
  },
  execute: async (params) => {
    // Find nodes by ID or by label (fallback for AI that uses labels)
    const findNode = (identifier: string) => {
      // First try exact ID match
      let node = builderState.nodes.find(n => n.id === identifier)
      if (node) return node
      
      // Then try label match (case insensitive)
      node = builderState.nodes.find(n => 
        n.data.label.toLowerCase() === identifier.toLowerCase()
      )
      return node
    }
    
    const fromNode = findNode(params.from_node_id)
    const toNode = findNode(params.to_node_id)
    
    if (!fromNode) {
      return { success: false, error: `Source node not found: ${params.from_node_id}` }
    }
    if (!toNode) {
      return { success: false, error: `Target node not found: ${params.to_node_id}` }
    }
    
    const edge = {
      id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      source: fromNode.id,
      target: toNode.id
    }
    
    builderState.edges.push(edge)
    
    return { 
      success: true, 
      message: `Connected ${fromNode.data.label} → ${toNode.data.label}`
    }
  }
}

/**
 * Tool: List current nodes
 */
export const listNodesTool: Tool = {
  name: 'list_nodes',
  description: 'Lists all nodes currently on the workflow canvas. Use this to see what has been built so far.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async () => {
    if (builderState.nodes.length === 0) {
      return { success: true, nodes: [], message: 'Canvas is empty. No nodes yet.' }
    }
    
    const nodes = builderState.nodes.map(n => ({
      node_id: n.id,
      type: n.data.type,
      label: n.data.label
    }))
    
    return { success: true, nodes, count: nodes.length }
  }
}

/**
 * Tool: Save the built workflow
 */
export const saveBuiltWorkflowTool: Tool = {
  name: 'save_built_workflow',
  description: 'Saves the workflow that has been built to disk. The workflow can then be loaded and run later.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name for the saved workflow'
      },
      description: {
        type: 'string',
        description: 'Optional description of what the workflow does'
      }
    },
    required: ['name']
  },
  execute: async (params) => {
    if (builderState.nodes.length === 0) {
      return { success: false, error: 'No nodes to save. Build a workflow first.' }
    }
    
    // Import here to avoid circular dependency
    const { saveWorkflow } = require('../workflowStorage')
    
    const saved = saveWorkflow(
      params.name, 
      builderState.nodes, 
      builderState.edges, 
      params.description
    )
    
    return { 
      success: true, 
      workflow_id: saved.id,
      message: `Saved workflow "${saved.name}" with ${builderState.nodes.length} nodes`
    }
  }
}

/**
 * Tool: Run the built workflow to test it
 */
export const runBuiltWorkflowTool: Tool = {
  name: 'run_built_workflow',
  description: 'Runs the workflow that has been built to test if it works. Returns the result.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async () => {
    if (builderState.nodes.length === 0) {
      return { success: false, error: 'No workflow to run. Add some nodes first.' }
    }
    
    // Import here to avoid circular dependency
    const { executeWorkflow } = require('./engine')
    
    try {
      const result = await executeWorkflow({
        id: 'builder-test',
        name: 'Builder Test',
        nodes: builderState.nodes,
        edges: builderState.edges
      }, null)
      
      // Try to extract a meaningful result
      const outputs = result.outputs || {}
      let finalResult = 'Workflow completed'
      
      for (const [nodeId, output] of Object.entries(outputs)) {
        const o = output as any
        if (o.response) finalResult = o.response
        else if (o.result) finalResult = o.result
        else if (o.input && typeof o.input === 'string') finalResult = o.input
      }
      
      return { 
        success: true, 
        result: finalResult,
        message: 'Workflow executed successfully'
      }
    } catch (err) {
      return { success: false, error: `Workflow failed: ${err}` }
    }
  }
}

/**
 * Get all workflow builder tools
 */
export function getWorkflowBuilderTools(): Tool[] {
  return [
    clearCanvasTool,
    addNodeTool,
    connectNodesTool,
    listNodesTool,
    saveBuiltWorkflowTool,
    runBuiltWorkflowTool
  ]
}
