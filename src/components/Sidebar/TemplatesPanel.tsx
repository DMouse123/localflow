import { WORKFLOW_TEMPLATES, WorkflowTemplate } from '../../data/templates'
import { useWorkflowStore } from '../../stores/workflowStore'

interface TemplateCardProps {
  template: WorkflowTemplate
  onLoad: () => void
}

function TemplateCard({ template, onLoad }: TemplateCardProps) {
  return (
    <button
      onClick={onLoad}
      className="w-full p-3 bg-white border border-slate-200 rounded-lg text-left
                 hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-slate-800 group-hover:text-blue-600">
            {template.name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{template.description}</p>
          <p className="text-xs text-slate-400 mt-1">
            {template.nodes.length} nodes
          </p>
        </div>
      </div>
    </button>
  )
}

export default function TemplatesPanel() {
  const { setNodes, setEdges, setWorkflowName, setWorkflowId } = useWorkflowStore()

  const loadTemplate = (template: WorkflowTemplate) => {
    // Generate new workflow ID
    const newId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Load template
    setWorkflowId(newId)
    setWorkflowName(template.name)
    setNodes(template.nodes)
    setEdges(template.edges)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3">
        Click a template to load it. Then click Run!
      </p>
      {WORKFLOW_TEMPLATES.map(template => (
        <TemplateCard
          key={template.id}
          template={template}
          onLoad={() => loadTemplate(template)}
        />
      ))}
    </div>
  )
}
