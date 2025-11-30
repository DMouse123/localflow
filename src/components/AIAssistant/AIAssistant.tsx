import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Sparkles, Zap, Plus, Trash2, ChevronDown } from 'lucide-react'
import { useWorkflowStore } from '../../stores/workflowStore'
import { useLLMStore } from '../../stores/llmStore'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatSession {
  id: string
  messageCount: number
  createdAt: number
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "🧠 I'm your Master AI. I can see the entire LocalFlow system and help you design, build, and run workflows.\n\nTry:\n• \"What can you do?\"\n• \"Show me the templates\"\n• \"Build a character generator\"\n• \"Create a workflow that summarizes text\"" }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [showSessions, setShowSessions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { nodes, edges, setNodes, setEdges } = useWorkflowStore()
  const { loadedModelId } = useLLMStore()

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadSessions = async () => {
    try {
      const res = await fetch('http://localhost:9998/chat/sessions')
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (e) {
      console.error('Failed to load sessions:', e)
    }
  }

  const startNewChat = () => {
    setSessionId(null)
    setMessages([
      { role: 'assistant', content: "🧠 I'm your Master AI. I can see the entire LocalFlow system and help you design, build, and run workflows.\n\nTry:\n• \"What can you do?\"\n• \"Show me the templates\"\n• \"Build a character generator\"\n• \"Create a workflow that summarizes text\"" }
    ])
    setShowSessions(false)
  }

  const loadSession = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:9998/chat/${id}`)
      const data = await res.json()
      if (data.messages) {
        setSessionId(id)
        setMessages(data.messages.map((m: any) => ({
          role: m.role,
          content: m.content
        })))
      }
    } catch (e) {
      console.error('Failed to load session:', e)
    }
    setShowSessions(false)
  }

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`http://localhost:9998/chat/${id}`, { method: 'DELETE' })
      setSessions(sessions.filter(s => s.id !== id))
      if (sessionId === id) {
        startNewChat()
      }
    } catch (e) {
      console.error('Failed to delete session:', e)
    }
  }

  // Execute commands from AI response
  const executeCommands = async (commands: any[]): Promise<string[]> => {
    const results: string[] = []
    for (const command of commands) {
      switch (command.action) {
        case 'addNode': {
          const newNode = {
            id: `node_${Date.now()}`,
            type: 'custom',
            position: { x: 200 + nodes.length * 200, y: 200 },
            data: {
              label: command.label || command.type,
              type: command.type,
              config: command.config || {}
            }
          }
          setNodes([...nodes, newNode])
          results.push(`Added ${command.label || command.type} node`)
          break
        }
        case 'connect': {
          const newEdge = {
            id: `edge_${Date.now()}`,
            source: command.from,
            target: command.to
          }
          setEdges([...edges, newEdge])
          results.push(`Connected ${command.from} → ${command.to}`)
          break
        }
        case 'run': {
          document.querySelector<HTMLButtonElement>('[data-testid="run-button"]')?.click()
          results.push('Running workflow...')
          break
        }
        case 'clear': {
          setNodes([])
          setEdges([])
          results.push('Canvas cleared')
          break
        }
        default:
          results.push(`${command.action}`)
      }
    }
    return results
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      // Use REST API for chat
      const res = await fetch('http://localhost:9998/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: userMessage
        })
      })
      
      const data = await res.json()
      
      if (data.sessionId) {
        setSessionId(data.sessionId)
      }
      
      let response = data.response || 'No response'
      
      // Execute any commands and append results
      if (data.commands && data.commands.length > 0) {
        const results = await executeCommands(data.commands)
        if (results.length > 0) {
          response = response.replace(/```command\n[\s\S]*?\n```/g, '').trim()
          response += '\n\n✅ ' + results.join('\n✅ ')
        }
      }
      
      // Add command results from server
      if (data.commandResults && data.commandResults.length > 0) {
        response += '\n\n✅ ' + data.commandResults.join('\n✅ ')
      }
      
      // Add build result info and load built workflow onto canvas
      if (data.buildResult) {
        if (data.buildResult.success) {
          response += '\n\n🔨 Workflow built successfully!'
          
          // Load the built workflow onto the canvas
          if (data.buildResult.builtWorkflow) {
            const { nodes: builtNodes, edges: builtEdges } = data.buildResult.builtWorkflow
            if (builtNodes && builtNodes.length > 0) {
              setNodes(builtNodes)
              setEdges(builtEdges || [])
              response += `\n📋 Loaded ${builtNodes.length} nodes onto canvas.`
            }
          }
        }
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
      
      // Refresh sessions list
      loadSessions()
      
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, something went wrong. Make sure LocalFlow backend is running."
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg 
                    flex items-center justify-center transition-all z-50
                    ${isOpen 
                      ? 'bg-slate-700 hover:bg-slate-800' 
                      : 'bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600'
                    }`}
        title="Master AI"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Zap className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[420px] h-[550px] bg-white rounded-2xl shadow-2xl 
                        flex flex-col overflow-hidden z-50 border border-slate-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <span className="font-semibold">Master AI</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Full Control</span>
              </div>
              <div className="flex items-center gap-1">
                {/* New Chat Button */}
                <button
                  onClick={startNewChat}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="New Chat"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {/* Sessions Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowSessions(!showSessions)}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1"
                    title="Chat History"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSessions ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Sessions Dropdown Menu */}
                  {showSessions && (
                    <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                      <div className="px-3 py-2 text-xs font-medium text-slate-500 border-b border-slate-100">
                        Recent Chats ({sessions.length})
                      </div>
                      {sessions.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-slate-400 text-center">
                          No saved chats
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto">
                          {sessions.map(s => (
                            <div
                              key={s.id}
                              onClick={() => loadSession(s.id)}
                              className={`px-3 py-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer group
                                ${sessionId === s.id ? 'bg-purple-50' : ''}`}
                            >
                              <div>
                                <div className="text-sm text-slate-700">
                                  {s.messageCount} messages
                                </div>
                                <div className="text-xs text-slate-400">
                                  {formatDate(s.createdAt)}
                                </div>
                              </div>
                              <button
                                onClick={(e) => deleteSession(s.id, e)}
                                className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-purple-100 mt-0.5">I can see, build, and run your workflows</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-purple-500 text-white rounded-br-md'
                      : 'bg-slate-100 text-slate-700 rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 px-4 py-2 rounded-2xl rounded-bl-md">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me to build something..."
                className="flex-1 px-4 py-2 border border-slate-200 rounded-full text-sm
                           focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center
                           hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
