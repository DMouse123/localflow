import { X, Trash2 } from 'lucide-react'
import { useWorkflowStore } from '../../stores/workflowStore'

// Node configuration schemas
const NODE_CONFIGS: Record<string, { fields: FieldConfig[] }> = {
  'text-input': {
    fields: [
      { key: 'text', label: 'Text Content', type: 'textarea', placeholder: 'Enter your text here...' },
    ],
  },
  'ai-chat': {
    fields: [
      { key: 'systemPrompt', label: 'System Prompt', type: 'textarea', placeholder: 'You are a helpful assistant...', default: 'You are a helpful assistant.' },
      { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 512, min: 1, max: 4096 },
      { key: 'temperature', label: 'Temperature', type: 'range', default: 0.7, min: 0, max: 2, step: 0.1 },
    ],
  },
  'ai-transform': {
    fields: [
      { key: 'instruction', label: 'Instruction', type: 'textarea', placeholder: 'Summarize the following text:', default: 'Summarize the following text:' },
      { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 256, min: 1, max: 4096 },
    ],
  },
  'debug': {
    fields: [
      { key: 'label', label: 'Output Label', type: 'text', placeholder: 'Debug', default: 'Debug' },
    ],
  },
  'trigger': {
    fields: [],
  },
  'http-request': {
    fields: [
      { key: 'method', label: 'Method', type: 'select', default: 'GET', options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
        { value: 'PATCH', label: 'PATCH' },
      ]},
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/data', default: '' },
      { key: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Authorization": "Bearer ..."}', default: '{}' },
      { key: 'contentType', label: 'Content Type', type: 'select', default: 'application/json', options: [
        { value: 'application/json', label: 'JSON' },
        { value: 'application/x-www-form-urlencoded', label: 'Form URL Encoded' },
        { value: 'text/plain', label: 'Plain Text' },
      ]},
    ],
  },
  'file-read': {
    fields: [
      { key: 'path', label: 'File Path', type: 'text', placeholder: '/path/to/file.txt' },
      { key: 'encoding', label: 'Encoding', type: 'select', default: 'utf-8', options: [
        { value: 'utf-8', label: 'UTF-8' },
        { value: 'ascii', label: 'ASCII' },
        { value: 'base64', label: 'Base64' },
      ]},
    ],
  },
  'file-write': {
    fields: [
      { key: 'path', label: 'File Path', type: 'text', placeholder: '/path/to/output.txt' },
      { key: 'mode', label: 'Mode', type: 'select', default: 'overwrite', options: [
        { value: 'overwrite', label: 'Overwrite' },
        { value: 'append', label: 'Append' },
      ]},
    ],
  },
  'json-parse': {
    fields: [
      { key: 'path', label: 'Extract Path (optional)', type: 'text', placeholder: 'data.items.0' },
    ],
  },
  'loop': {
    fields: [
      { key: 'maxItems', label: 'Max Items (0=all)', type: 'number', default: 0, min: 0 },
    ],
  },
  'ai-agent': {
    fields: [
      { key: 'systemPrompt', label: 'System Prompt', type: 'textarea', default: 'You are a helpful AI agent that can use tools to accomplish tasks.' },
      { key: 'maxSteps', label: 'Max Steps', type: 'number', default: 5, min: 1, max: 20 },
      { key: 'tools', label: 'Enabled Tools', type: 'text', placeholder: 'calculator,datetime', default: 'calculator,datetime' },
    ],
  },
}

interface FieldConfig {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'range' | 'select'
  placeholder?: string
  default?: any
  min?: number
  max?: number
  step?: number
  options?: { value: string; label: string }[]
}

interface ConfigFieldProps {
  field: FieldConfig
  value: any
  onChange: (value: any) => void
}

function ConfigField({ field, value, onChange }: ConfigFieldProps) {
  const currentValue = value ?? field.default ?? ''

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          value={currentValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      )
    
    case 'number':
      return (
        <input
          type="number"
          value={currentValue}
          onChange={(e) => onChange(Number(e.target.value))}
          min={field.min}
          max={field.max}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )
    
    case 'range':
      return (
        <div className="flex items-center gap-3">
          <input
            type="range"
            value={currentValue}
            onChange={(e) => onChange(Number(e.target.value))}
            min={field.min}
            max={field.max}
            step={field.step}
            className="flex-1"
          />
          <span className="text-sm text-slate-600 w-12 text-right">{currentValue}</span>
        </div>
      )

    case 'select':
      return (
        <select
          value={currentValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )

    default:
      return (
        <input
          type="text"
          value={currentValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )
  }
}

export default function PropertiesPanel() {
  const { selectedNode, selectNode, updateNode, deleteNode } = useWorkflowStore()

  if (!selectedNode) return null

  const nodeType = selectedNode.data.type
  const nodeConfig = NODE_CONFIGS[nodeType] || { fields: [] }
  const config = selectedNode.data.config || {}

  const handleConfigChange = (key: string, value: any) => {
    updateNode(selectedNode.id, {
      config: { ...config, [key]: value }
    })
  }

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <h2 className="font-semibold text-slate-800">Properties</h2>
        <button
          onClick={() => selectNode(null)}
          className="p-1 hover:bg-slate-100 rounded"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Node Info */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Node Type
          </label>
          <div className="px-3 py-2 bg-slate-50 rounded text-sm text-slate-700 capitalize">
            {nodeType.replace('-', ' ')}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Label
          </label>
          <input
            type="text"
            value={selectedNode.data.label}
            onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Node-specific Configuration */}
        {nodeConfig.fields.length > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Configuration
            </h3>
            <div className="space-y-4">
              {nodeConfig.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {field.label}
                  </label>
                  <ConfigField
                    field={field}
                    value={config[field.key]}
                    onChange={(value) => handleConfigChange(field.key, value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Node ID (collapsed) */}
        <div className="pt-4 border-t border-slate-200">
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Node ID
          </label>
          <div className="px-2 py-1 bg-slate-50 rounded text-xs text-slate-400 font-mono truncate">
            {selectedNode.id}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={() => deleteNode(selectedNode.id)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 
                     bg-red-50 text-red-600 rounded-lg text-sm 
                     hover:bg-red-100 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Node
        </button>
      </div>
    </aside>
  )
}
