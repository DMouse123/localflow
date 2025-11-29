import { useState } from 'react'
import { 
  Play, 
  MessageSquare, 
  Zap, 
  FileText, 
  Settings,
  Bot,
  Search,
  Cpu,
  Blocks,
  LayoutTemplate,
  Globe,
  FileInput,
  FileOutput,
  Braces,
  Repeat,
  Brain,
  type LucideIcon
} from 'lucide-react'
import ModelManager from './ModelManager'
import TemplatesPanel from './TemplatesPanel'

interface NodeType {
  type: string
  label: string
  icon: LucideIcon
  color: string
  description: string
}

const nodeCategories = {
  triggers: {
    label: 'Triggers',
    nodes: [
      { type: 'trigger', label: 'Manual Trigger', icon: Play, color: 'bg-green-500', description: 'Click to start workflow' },
    ],
  },
  ai: {
    label: 'AI Nodes',
    nodes: [
      { type: 'ai-chat', label: 'AI Chat', icon: MessageSquare, color: 'bg-purple-500', description: 'Chat with AI model' },
      { type: 'ai-transform', label: 'AI Transform', icon: Zap, color: 'bg-blue-500', description: 'Transform text with AI' },
      { type: 'ai-agent', label: 'AI Agent', icon: Bot, color: 'bg-indigo-500', description: 'Agent with tools' },
      { type: 'ai-orchestrator', label: 'AI Orchestrator', icon: Brain, color: 'bg-pink-500', description: 'Autonomous task completion' },
    ],
  },
  data: {
    label: 'Data',
    nodes: [
      { type: 'text-input', label: 'Text Input', icon: FileText, color: 'bg-gray-500', description: 'Static text value' },
      { type: 'http-request', label: 'HTTP Request', icon: Globe, color: 'bg-cyan-500', description: 'Make API calls' },
      { type: 'file-read', label: 'File Read', icon: FileInput, color: 'bg-emerald-500', description: 'Read local file' },
      { type: 'file-write', label: 'File Write', icon: FileOutput, color: 'bg-teal-500', description: 'Write local file' },
      { type: 'json-parse', label: 'JSON Parse', icon: Braces, color: 'bg-amber-500', description: 'Parse JSON data' },
      { type: 'loop', label: 'Loop', icon: Repeat, color: 'bg-violet-500', description: 'Iterate over items' },
    ],
  },
  output: {
    label: 'Output',
    nodes: [
      { type: 'debug', label: 'Debug', icon: Settings, color: 'bg-orange-500', description: 'Log to console' },
    ],
  },
}

function DraggableNode({ node }: { node: NodeType }) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow/type', node.type)
    event.dataTransfer.setData('application/reactflow/label', node.label)
    event.dataTransfer.effectAllowed = 'move'
  }

  const Icon = node.icon

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 
                 cursor-grab hover:border-slate-300 hover:shadow-sm transition-all"
      title={node.description}
    >
      <div className={`p-1.5 rounded ${node.color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <span className="text-sm text-slate-700">{node.label}</span>
    </div>
  )
}

function NodePalette() {
  return (
    <>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search nodes..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Node Categories */}
      <div className="space-y-6">
        {Object.entries(nodeCategories).map(([key, category]) => (
          <div key={key}>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {category.label}
            </h2>
            <div className="space-y-2">
              {category.nodes.map((node) => (
                <DraggableNode key={node.type} node={node} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<'nodes' | 'templates' | 'models'>('templates')

  return (
    <aside className="w-72 bg-slate-100 border-r border-slate-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800">LocalFlow</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors
            ${activeTab === 'templates' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab('nodes')}
          className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors
            ${activeTab === 'nodes' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Blocks className="w-3.5 h-3.5" />
          Nodes
        </button>
        <button
          onClick={() => setActiveTab('models')}
          className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors
            ${activeTab === 'models' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Models
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'templates' && <TemplatesPanel />}
        {activeTab === 'nodes' && <NodePalette />}
        {activeTab === 'models' && <ModelManager />}
      </div>
    </aside>
  )
}
