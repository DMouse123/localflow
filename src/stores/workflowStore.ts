import { create } from 'zustand'
import { 
  Node, 
  Edge, 
  Connection, 
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from '@xyflow/react'

export interface WorkflowNode extends Node {
  data: {
    label: string
    type: string
    config?: Record<string, unknown>
  }
}

interface WorkflowState {
  // Workflow metadata
  workflowId: string
  workflowName: string
  isDirty: boolean
  
  // Canvas state
  nodes: WorkflowNode[]
  edges: Edge[]
  selectedNode: WorkflowNode | null
  
  // Actions
  setNodes: (nodes: WorkflowNode[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (node: WorkflowNode) => void
  updateNode: (id: string, data: Partial<WorkflowNode['data']>) => void
  deleteNode: (id: string) => void
  deleteSelectedNodes: () => void
  selectNode: (node: WorkflowNode | null) => void
  
  // Workflow operations
  newWorkflow: () => void
  saveWorkflow: () => Promise<boolean>
  loadWorkflow: (id: string) => Promise<boolean>
  setWorkflowName: (name: string) => void
  setWorkflowId: (id: string) => void
}

// Generate unique IDs
const generateId = () => `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
let nodeCounter = 0
const generateNodeId = () => `node_${nodeCounter++}`

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflowId: generateId(),
  workflowName: 'Untitled Workflow',
  isDirty: false,
  nodes: [],
  edges: [],
  selectedNode: null,

  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as WorkflowNode[],
      isDirty: true,
    })
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      isDirty: true,
    })
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
      isDirty: true,
    })
  },

  addNode: (node) => {
    set({
      nodes: [...get().nodes, { ...node, id: generateNodeId() }],
      isDirty: true,
    })
  },

  updateNode: (id, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ),
      isDirty: true,
    })
  },

  deleteNode: (id) => {
    set({
      nodes: get().nodes.filter((node) => node.id !== id),
      edges: get().edges.filter(
        (edge) => edge.source !== id && edge.target !== id
      ),
      selectedNode: get().selectedNode?.id === id ? null : get().selectedNode,
      isDirty: true,
    })
  },

  deleteSelectedNodes: () => {
    const selected = get().selectedNode
    if (selected) {
      get().deleteNode(selected.id)
    }
  },

  selectNode: (node) => set({ selectedNode: node }),

  setWorkflowName: (name) => set({ workflowName: name, isDirty: true }),

  setWorkflowId: (id) => set({ workflowId: id }),

  newWorkflow: () => {
    nodeCounter = 0
    set({
      workflowId: generateId(),
      workflowName: 'Untitled Workflow',
      nodes: [],
      edges: [],
      selectedNode: null,
      isDirty: false,
    })
  },

  saveWorkflow: async () => {
    try {
      const { workflowId, workflowName, nodes, edges } = get()
      const result = await window.electron.workflow.save({
        id: workflowId,
        name: workflowName,
        nodes,
        edges,
      })
      if (result.success) {
        set({ isDirty: false })
        return true
      }
      console.error('Failed to save workflow:', result.error)
      return false
    } catch (error) {
      console.error('Failed to save workflow:', error)
      return false
    }
  },

  loadWorkflow: async (id) => {
    try {
      const result = await window.electron.workflow.load(id)
      if (result.success && result.data) {
        const data = result.data as {
          id: string
          name: string
          nodes: WorkflowNode[]
          edges: Edge[]
        }
        nodeCounter = data.nodes.length
        set({
          workflowId: data.id,
          workflowName: data.name,
          nodes: data.nodes,
          edges: data.edges,
          selectedNode: null,
          isDirty: false,
        })
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to load workflow:', error)
      return false
    }
  },
}))
