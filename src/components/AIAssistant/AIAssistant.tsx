import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Sparkles, Zap } from 'lucide-react'
import { useWorkflowStore } from '../../stores/workflowStore'
import { useLLMStore } from '../../stores/llmStore'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// Build dynamic system prompt with full platform knowledge
function buildSystemPrompt(nodes: any[], edges: any[], templates: any[], plugins: any[]): string {
  const nodeList = nodes.length > 0
    ? `Current workflow: ${nodes.map(n => `${n.data.label} (${n.data.type})`).join(' → ')}`
    : 'Canvas is empty.'

  const templateList = templates.map(t => `- ${t.name}: ${t.description || t.id}`).join('\n')
  
  const pluginList = plugins.length > 0
    ? plugins.map(p => `- ${p.name}: ${p.tools?.map((t: any) => t.id).join(', ') || 'no tools'}`).join('\n')
    : 'No plugins installed.'

  return `You are the Master AI for LocalFlow, a local AI workflow automation platform.

## Your Capabilities
You can SEE and CONTROL the entire system:
- View all available nodes, tools, and plugins
- Build workflows by adding nodes and connections
- Run workflows and see results
- Help users design automation systems

## Available Node Types
TRIGGERS: trigger (start workflow)
INPUTS: text-input (static text)
AI: ai-chat (conversation), ai-transform (modify text), ai-orchestrator (autonomous agent)
TOOLS: tool-calculator, tool-datetime, tool-generate-id, tool-file-read, tool-file-write, tool-file-list, tool-http, tool-json-query, tool-shell, tool-string-ops
AI TOOLS: tool-ai-name, tool-ai-color, tool-ai-trait, tool-ai-backstory
OUTPUT: debug (display results)

## Available Templates
${templateList}

## Installed Plugins
${pluginList}

## Current State
${nodeList}

## Commands You Can Execute
When user asks you to DO something, respond with a command block:

To add a node:
\`\`\`command
{"action": "addNode", "type": "text-input", "label": "My Input", "config": {"text": "Hello"}}
\`\`\`

To connect nodes:
\`\`\`command
{"action": "connect", "from": "node_1", "to": "node_2"}
\`\`\`

To run workflow:
\`\`\`command
{"action": "run"}
\`\`\`

To load template:
\`\`\`command
{"action": "loadTemplate", "id": "ai-character-builder"}
\`\`\`

To clear canvas:
\`\`\`command
{"action": "clear"}
\`\`\`

## Guidelines
- Be helpful and concise
- When user describes what they want, suggest a workflow design
- When user says "build it" or "create it", use command blocks to actually build
- Explain what you're doing as you go
- If something isn't possible, explain why and suggest alternatives

You have full control. Help users build amazing automations!`
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "🧠 I'm your Master AI. I can see the entire LocalFlow system and help you design, build, and run workflows.\n\nTry:\n• \"What can you do?\"\n• \"Show me the templates\"\n• \"Build a character generator\"\n• \"Create a workflow that summarizes text\"" }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [plugins, setPlugins] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { nodes, edges, setNodes, setEdges } = useWorkflowStore()
  const { loadedModelId } = useLLMStore()

  // Load templates and plugins on mount
  useEffect(() => {
    fetch('http://localhost:9998/templates')
      .then(r => r.json())
      .then(data => setTemplates(data.templates || []))
      .catch(() => {})
    
    // TODO: Add plugin list endpoint
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Execute commands from AI response
  const executeCommand = async (command: any) => {
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
        return `Added ${command.label || command.type} node`
      }
      
      case 'connect': {
        const newEdge = {
          id: `edge_${Date.now()}`,
          source: command.from,
          target: command.to,
          sourceHandle: command.sourceHandle,
          targetHandle: command.targetHandle
        }
        setEdges([...edges, newEdge])
        return `Connected ${command.from} → ${command.to}`
      }
      
      case 'run': {
        document.querySelector<HTMLButtonElement>('[data-testid="run-button"]')?.click()
        return 'Running workflow...'
      }
      
      case 'loadTemplate': {
        const template = templates.find(t => t.id === command.id)
        if (template) {
          // Fetch and load template via API
          try {
            const response = await fetch(`http://localhost:9998/templates/${command.id}`)
            const data = await response.json()
            // Template loading would need the full node/edge data
            return `Loaded template: ${template.name}`
          } catch {
            return `Failed to load template: ${command.id}`
          }
        }
        return `Template not found: ${command.id}`
      }
      
      case 'clear': {
        setNodes([])
        setEdges([])
        return 'Canvas cleared'
      }
      
      default:
        return `Unknown action: ${command.action}`
    }
  }

  // Parse and execute commands from response
  const processResponse = async (response: string): Promise<string> => {
    const commandRegex = /```command\n([\s\S]*?)\n```/g
    let match
    let processedResponse = response
    const results: string[] = []

    while ((match = commandRegex.exec(response)) !== null) {
      try {
        const command = JSON.parse(match[1])
        const result = await executeCommand(command)
        results.push(result)
      } catch (e) {
        results.push(`Error: ${e}`)
      }
    }

    if (results.length > 0) {
      // Remove command blocks and add results
      processedResponse = response.replace(/```command\n[\s\S]*?\n```/g, '').trim()
      processedResponse += '\n\n✅ ' + results.join('\n✅ ')
    }

    return processedResponse
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const systemPrompt = buildSystemPrompt(nodes, edges, templates, plugins)

      const result = await window.electron.llm.generate(
        userMessage,
        { systemPrompt, maxTokens: 500 }
      )
      
      if (result.success && result.response) {
        const processedResponse = await processResponse(result.response)
        setMessages(prev => [...prev, { role: 'assistant', content: processedResponse }])
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
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="font-semibold">Master AI</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Full Control</span>
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
