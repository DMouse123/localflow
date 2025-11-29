import { useState, useEffect, useRef } from 'react'
import { X, Play, Square, Trash2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'

interface LogEntry {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error' | 'node'
}

interface OutputPanelProps {
  isOpen: boolean
  onClose: () => void
  logs: LogEntry[]
  isRunning: boolean
  onClear: () => void
}

export default function OutputPanel({ isOpen, onClose, logs, isRunning, onClear }: OutputPanelProps) {
  const logsEndRef = useRef<HTMLDivElement>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [copied, setCopied] = useState(false)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current && !isMinimized) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isMinimized])

  const handleCopy = () => {
    const text = logs.map(l => `${l.timestamp} ${l.message}`).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-400'
      case 'error': return 'text-red-400'
      case 'node': return 'text-blue-400'
      default: return 'text-slate-300'
    }
  }

  return (
    <div className={`absolute bottom-0 left-64 right-0 bg-slate-900 border-t border-slate-700 
                     transition-all duration-200 ${isMinimized ? 'h-10' : 'h-64'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">Output</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              Running...
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
            title="Copy logs"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={onClear}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Area */}
      {!isMinimized && (
        <div className="h-[calc(100%-2.5rem)] overflow-y-auto p-4 font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-slate-500 text-center py-8">
              No output yet. Click "Run" to execute the workflow.
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex gap-2 py-0.5">
                <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                <span className={getLogColor(log.type)}>{log.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  )
}
