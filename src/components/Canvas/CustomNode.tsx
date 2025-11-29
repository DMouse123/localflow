import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { 
  Play, 
  MessageSquare, 
  FileText, 
  Zap, 
  Database,
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
  Bot,
  Brain,
  Globe,
  FileInput,
  FileOutput,
  Braces,
  Repeat,
  type LucideIcon 
} from 'lucide-react'
import { useExecutionStore } from '../../stores/executionStore'

// Icon mapping for different node types
const nodeIcons: Record<string, LucideIcon> = {
  trigger: Play,
  'ai-chat': MessageSquare,
  'ai-transform': Zap,
  'ai-agent': Bot,
  'ai-orchestrator': Brain,
  'text-input': FileText,
  'http-request': Globe,
  'file-read': FileInput,
  'file-write': FileOutput,
  'json-parse': Braces,
  'loop': Repeat,
  'debug': Settings,
  default: Database,
}

// Color mapping for node types
const nodeColors: Record<string, string> = {
  trigger: 'bg-green-500',
  'ai-chat': 'bg-purple-500',
  'ai-transform': 'bg-blue-500',
  'ai-agent': 'bg-indigo-500',
  'ai-orchestrator': 'bg-pink-500',
  'text-input': 'bg-gray-500',
  'http-request': 'bg-cyan-500',
  'file-read': 'bg-emerald-500',
  'file-write': 'bg-teal-500',
  'json-parse': 'bg-amber-500',
  'loop': 'bg-violet-500',
  'debug': 'bg-orange-500',
  default: 'bg-slate-500',
}

interface CustomNodeData {
  label: string
  type: string
  config?: Record<string, unknown>
}

function CustomNode({ id, data, selected }: NodeProps<CustomNodeData>) {
  const Icon = nodeIcons[data.type] || nodeIcons.default
  const colorClass = nodeColors[data.type] || nodeColors.default
  const nodeState = useExecutionStore(state => state.nodeStates[id] || 'idle')

  // Determine state class
  const stateClass = nodeState === 'running' ? 'node-running' 
                   : nodeState === 'complete' ? 'node-complete'
                   : nodeState === 'error' ? 'node-error'
                   : ''

  return (
    <div
      className={`
        px-4 py-3 shadow-lg rounded-lg border-2 bg-white min-w-[150px]
        ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'}
        ${stateClass}
        transition-all duration-150
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-slate-400 !w-3 !h-3 !border-2 !border-white"
      />

      {/* Node Content */}
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded ${colorClass}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="font-medium text-sm text-slate-700">
          {data.label}
        </span>
        
        {/* Status indicator */}
        {nodeState === 'running' && (
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin ml-auto" />
        )}
        {nodeState === 'complete' && (
          <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
        )}
        {nodeState === 'error' && (
          <XCircle className="w-4 h-4 text-red-500 ml-auto" />
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-slate-400 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  )
}

export default memo(CustomNode)
