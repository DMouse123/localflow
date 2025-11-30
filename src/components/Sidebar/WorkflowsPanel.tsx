import { useState, useEffect } from 'react'
import { Trash2, FolderOpen, RefreshCw } from 'lucide-react'
import { useWorkflowStore } from '../../stores/workflowStore'

interface SavedWorkflow {
  id: string
  name: string
  description?: string
  nodes: any[]
  edges: any[]
  createdAt: number
  updatedAt: number
}

export default function WorkflowsPanel() {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { setNodes, setEdges, setWorkflowName, setWorkflowId } = useWorkflowStore()

  const loadWorkflows = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.workflow.list()
      if (result.success) {
        setWorkflows(result.workflows || [])
      } else {
        setError(result.error || 'Failed to load workflows')
      }
    } catch (err) {
      setError(String(err))
    }
    setLoading(false)
  }

  useEffect(() => {
    loadWorkflows()
  }, [])

  const handleLoad = async (workflow: SavedWorkflow) => {
    setWorkflowId(workflow.id)
    setWorkflowName(workflow.name)
    setNodes(workflow.nodes)
    setEdges(workflow.edges)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    
    try {
      const result = await window.api.workflow.delete(id)
      if (result.success) {
        setWorkflows(workflows.filter(w => w.id !== id))
      }
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm p-3 bg-red-50 rounded-lg">
        {error}
        <button onClick={loadWorkflows} className="ml-2 underline">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">
          {workflows.length} saved workflow{workflows.length !== 1 ? 's' : ''}
        </p>
        <button 
          onClick={loadWorkflows}
          className="p-1 text-slate-400 hover:text-slate-600"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No saved workflows</p>
          <p className="text-xs mt-1">Save your current workflow to see it here</p>
        </div>
      ) : (
        workflows.map(workflow => (
          <div
            key={workflow.id}
            className="p-3 bg-white border border-slate-200 rounded-lg
                       hover:border-blue-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <button
                onClick={() => handleLoad(workflow)}
                className="flex-1 text-left"
              >
                <h3 className="font-medium text-sm text-slate-800 group-hover:text-blue-600">
                  {workflow.name}
                </h3>
                {workflow.description && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {workflow.description}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {workflow.nodes.length} nodes · {formatDate(workflow.updatedAt)}
                </p>
              </button>
              <button
                onClick={() => handleDelete(workflow.id, workflow.name)}
                className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
