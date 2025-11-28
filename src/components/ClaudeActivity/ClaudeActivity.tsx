import { useState, useEffect } from 'react'
import { Bot, X, Loader2 } from 'lucide-react'
import { useWorkflowStore } from '../../stores/workflowStore'

interface Activity {
  type: string
  message: string
  timestamp: number
}

export default function ClaudeActivity() {
  const [isConnected, setIsConnected] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [thinking, setThinking] = useState<string | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)

  const { setNodes, setEdges, nodes, edges } = useWorkflowStore()

  useEffect(() => {
    if (!window.electron) return

    // Listen for Claude connection events
    window.electron.on('claude:connected', () => {
      setIsConnected(true)
      setActivities([{ type: 'system', message: '🤖 Claude connected!', timestamp: Date.now() }])
    })

    window.electron.on('claude:disconnected', () => {
      setIsConnected(false)
      setActivities(prev => [...prev, { type: 'system', message: '👋 Claude disconnected', timestamp: Date.now() }])
      setThinking(null)
    })

    // Listen for Claude commands
    window.electron.on('claude:command', async (data: any) => {
      const { id, type, payload } = data
      
      setActivities(prev => [...prev.slice(-20), { 
        type: 'command', 
        message: `${type}: ${JSON.stringify(payload || {}).slice(0, 50)}`, 
        timestamp: Date.now() 
      }])

      let result: any = { success: true }

      try {
        switch (type) {
          case 'claude:think':
            setThinking(payload?.message || null)
            break

          case 'node:add':
            const newNode = {
              id: `node_${Date.now()}`,
              type: 'custom',
              position: payload?.position || { x: 200 + Math.random() * 200, y: 150 + Math.random() * 100 },
              data: {
                label: payload?.label || payload?.type || 'New Node',
                type: payload?.type || 'text-input',
                config: payload?.config || {}
              }
            }
            setNodes([...nodes, newNode])
            result = { nodeId: newNode.id }
            break

          case 'node:delete':
            if (payload?.nodeId) {
              setNodes(nodes.filter(n => n.id !== payload.nodeId))
              setEdges(edges.filter(e => e.source !== payload.nodeId && e.target !== payload.nodeId))
            }
            break

          case 'edge:add':
            if (payload?.source && payload?.target) {
              const newEdge = {
                id: `edge_${Date.now()}`,
                source: payload.source,
                target: payload.target,
              }
              setEdges([...edges, newEdge])
              result = { edgeId: newEdge.id }
            }
            break

          case 'workflow:clear':
            setNodes([])
            setEdges([])
            break

          case 'model:load':
            if (payload?.modelId) {
              try {
                const loadResult = await window.electron.llm.loadModel(payload.modelId)
                result = loadResult
              } catch (err) {
                result = { error: String(err) }
              }
            }
            break

          case 'model:status':
            try {
              const models = await window.electron.llm.listModels() as any[]
              console.log('[ClaudeActivity] Models:', models)
              const loaded = models.find((m: any) => m.isLoaded)
              result = { 
                loaded: loaded?.id || null, 
                models: models.map((m: any) => ({ 
                  id: m.id, 
                  isLoaded: m.isLoaded, 
                  isDownloaded: m.isDownloaded 
                })) 
              }
              console.log('[ClaudeActivity] Model status result:', result)
            } catch (err) {
              result = { error: String(err) }
            }
            break

          case 'workflow:run':
            // Trigger the run button programmatically
            document.querySelector<HTMLButtonElement>('[data-testid="run-button"]')?.click()
            break

          default:
            result = { error: `Unknown command: ${type}` }
        }
      } catch (error) {
        result = { error: String(error) }
      }

      // Send response back to main process
      window.electron.send(`claude:response:${id}`, result)
    })

    // Listen for activity broadcasts
    window.electron.on('claude:activity', (data: any) => {
      if (data.type === 'think') {
        setThinking(data.message)
      }
      setActivities(prev => [...prev.slice(-20), {
        type: data.type,
        message: data.message,
        timestamp: data.timestamp
      }])
    })

  }, [nodes, edges, setNodes, setEdges])

  if (!isConnected) return null

  return (
    <div className={`fixed top-16 right-4 z-50 transition-all duration-200 
                     ${isMinimized ? 'w-auto' : 'w-80'}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg 
                       bg-gradient-to-r from-green-500 to-emerald-500 text-white
                       ${isMinimized ? 'rounded-lg' : ''}`}>
        <Bot className="w-4 h-4" />
        <span className="font-medium text-sm flex-1">Claude Connected</span>
        {thinking && <Loader2 className="w-4 h-4 animate-spin" />}
        <button 
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-1 hover:bg-white/20 rounded"
        >
          {isMinimized ? '↑' : '↓'}
        </button>
      </div>

      {/* Body */}
      {!isMinimized && (
        <div className="bg-white border border-t-0 border-slate-200 rounded-b-lg shadow-lg">
          {/* Thinking indicator */}
          {thinking && (
            <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 text-sm text-amber-700">
              🤔 {thinking}
            </div>
          )}

          {/* Activity log */}
          <div className="max-h-48 overflow-y-auto p-2 space-y-1">
            {activities.slice(-10).map((activity, i) => (
              <div key={i} className="text-xs text-slate-600 py-0.5">
                <span className="text-slate-400">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </span>{' '}
                {activity.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
