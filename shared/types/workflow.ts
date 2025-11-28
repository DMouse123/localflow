// Workflow types shared between main and renderer

export interface WorkflowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    type: string
    config?: Record<string, unknown>
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface Workflow {
  id: string
  name: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt?: string
  updatedAt?: string
}

export interface WorkflowListItem {
  id: string
  name: string
  updatedAt: string
}

// Node type definitions
export type NodeCategory = 'triggers' | 'ai' | 'data' | 'output'

export interface NodeTypeDefinition {
  type: string
  label: string
  category: NodeCategory
  color: string
  description: string
  inputs: number
  outputs: number
  configSchema?: Record<string, unknown>
}
