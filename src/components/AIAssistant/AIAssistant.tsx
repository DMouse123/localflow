import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react'
import { useWorkflowStore } from '../../stores/workflowStore'
import { useLLMStore } from '../../stores/llmStore'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `You are a helpful AI assistant built into LocalFlow, a visual workflow automation app. 
You help users learn how to build workflows.

Key features of LocalFlow:
- Drag nodes from the left sidebar onto the canvas
- Connect nodes by dragging from output handle to input handle
- Node types: Manual Trigger, Text Input, AI Chat, AI Transform, Debug
- Click Run to execute workflows
- Configure nodes in the right Properties panel

When helping users:
- Be concise and friendly
- Give specific step-by-step instructions
- Suggest workflows they could build
- Explain what each node type does when asked

If asked about building a workflow, describe the nodes needed and how to connect them.`

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "👋 Hi! I'm your LocalFlow assistant. I can help you build workflows. What would you like to create?" }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { nodes, edges } = useWorkflowStore()
  const { loadedModelId } = useLLMStore()

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      // Add context about current workflow
      const context = nodes.length > 0 
        ? `\n\nCurrent workflow has ${nodes.length} nodes: ${nodes.map(n => n.data.label).join(', ')}`
        : '\n\nThe canvas is currently empty.'

      const result = await window.electron.llm.generate(
        userMessage + context,
        { systemPrompt: SYSTEM_PROMPT, maxTokens: 300 }
      )
      
      if (result.success && result.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.response! }])
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: loadedModelId 
            ? "Sorry, I had trouble responding. Please try again."
            : "⚠️ No AI model loaded. Go to Models tab and load a model first!"
        }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, something went wrong. Make sure a model is loaded."
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

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg 
                    flex items-center justify-center transition-all z-50
                    ${isOpen 
                      ? 'bg-slate-700 hover:bg-slate-800' 
                      : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
                    }`}
        title="AI Assistant"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Sparkles className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl 
                        flex flex-col overflow-hidden z-50 border border-slate-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">AI Assistant</span>
            </div>
            <p className="text-xs text-purple-100 mt-0.5">Ask me anything about building workflows</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-md'
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
                placeholder="Ask me anything..."
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
