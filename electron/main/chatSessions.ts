/**
 * Chat Session Manager
 * Manages Master AI chat sessions with memory
 */

import LLMManager from './llm/manager'
import { listTemplates } from './templates'
import { getAllPluginTools } from './plugins/loader'

// Simple ID generator
function generateId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

interface ChatSession {
  id: string
  messages: Message[]
  createdAt: number
  lastActivity: number
}

// Store active sessions
const sessions: Map<string, ChatSession> = new Map()

// Session timeout (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000

/**
 * Build the Master AI system prompt with full platform knowledge
 */
export function buildMasterAIPrompt(): string {
  const templates = listTemplates()
  const plugins = getAllPluginTools()

  const templateList = templates.map(t => `- ${t.name} (${t.id})`).join('\n')
  
  const pluginList = plugins.length > 0
    ? plugins.map(p => `- ${p.tool.id}: ${p.tool.description}`).join('\n')
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

## Plugin Tools
${pluginList}

## Commands You Can Execute
When user asks you to DO something, respond with a command block:

To add a node:
\`\`\`command
{"action": "addNode", "type": "text-input", "label": "My Input", "config": {"text": "Hello"}}
\`\`\`

To connect nodes (use the node IDs returned from addNode):
\`\`\`command
{"action": "connect", "from": "node_1", "to": "node_2"}
\`\`\`

To run workflow:
\`\`\`command
{"action": "run", "templateId": "ai-character-builder"}
\`\`\`

To load template:
\`\`\`command
{"action": "loadTemplate", "id": "ai-character-builder"}
\`\`\`

To clear canvas:
\`\`\`command
{"action": "clear"}
\`\`\`

To save current workflow:
\`\`\`command
{"action": "saveWorkflow", "name": "My Workflow", "description": "Optional description"}
\`\`\`

To load a saved workflow:
\`\`\`command
{"action": "loadWorkflow", "id": "wf_123456"}
\`\`\`

To list saved workflows:
\`\`\`command
{"action": "listWorkflows"}
\`\`\`

To delete a saved workflow:
\`\`\`command
{"action": "deleteWorkflow", "id": "wf_123456"}
\`\`\`

To rename a workflow:
\`\`\`command
{"action": "renameWorkflow", "id": "wf_123456", "name": "New Name"}
\`\`\`

## Guidelines
- Be helpful and concise
- When user describes what they want, suggest a workflow design
- When user says "build it" or "create it", use command blocks to actually build
- Explain what you're doing as you go
- If something isn't possible, explain why and suggest alternatives

You have full control. Help users build amazing automations!`
}

/**
 * Create a new chat session
 */
export function createSession(): ChatSession {
  const session: ChatSession = {
    id: generateId(),
    messages: [],
    createdAt: Date.now(),
    lastActivity: Date.now()
  }
  sessions.set(session.id, session)
  console.log(`[Chat] Created session: ${session.id}`)
  return session
}

/**
 * Get a session by ID
 */
export function getSession(id: string): ChatSession | undefined {
  const session = sessions.get(id)
  if (session) {
    // Check if expired
    if (Date.now() - session.lastActivity > SESSION_TIMEOUT) {
      sessions.delete(id)
      console.log(`[Chat] Session expired: ${id}`)
      return undefined
    }
    session.lastActivity = Date.now()
  }
  return session
}

/**
 * List all active sessions
 */
export function listSessions(): { id: string; messageCount: number; createdAt: number }[] {
  // Clean up expired sessions first
  for (const [id, session] of sessions) {
    if (Date.now() - session.lastActivity > SESSION_TIMEOUT) {
      sessions.delete(id)
    }
  }
  
  return Array.from(sessions.values()).map(s => ({
    id: s.id,
    messageCount: s.messages.length,
    createdAt: s.createdAt
  }))
}

/**
 * Delete a session
 */
export function deleteSession(id: string): boolean {
  return sessions.delete(id)
}

/**
 * Send a message to the Master AI
 */
export async function chat(sessionId: string | null, message: string): Promise<{
  sessionId: string
  response: string
  commands: any[]
}> {
  // Get or create session
  let session: ChatSession
  if (sessionId && sessions.has(sessionId)) {
    session = getSession(sessionId)!
  } else {
    session = createSession()
  }

  // Add user message
  session.messages.push({
    role: 'user',
    content: message,
    timestamp: Date.now()
  })

  // Build conversation history for LLM
  const systemPrompt = buildMasterAIPrompt()
  const conversationHistory = session.messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n')

  console.log(`[Chat] Sending to LLM: ${conversationHistory.substring(0, 100)}...`)

  // Generate response
  let response: string
  try {
    // generateSync returns a string directly, not an object
    response = await LLMManager.generateSync(
      conversationHistory,
      { systemPrompt, maxTokens: 600 }
    )
    console.log(`[Chat] LLM response: ${response.substring(0, 100)}...`)
  } catch (err) {
    console.error('[Chat] LLM error:', err)
    response = `Error: ${err}`
  }
  
  // Parse commands from response - look for command blocks OR json blocks with action field
  const commands: any[] = []
  
  // Helper to extract commands from parsed JSON
  const extractCommands = (parsed: any) => {
    if (Array.isArray(parsed)) {
      // Array of commands
      for (const item of parsed) {
        if (item && item.action) commands.push(item)
      }
    } else if (parsed && parsed.action) {
      // Single command
      commands.push(parsed)
    }
  }
  
  // Try ```command blocks first
  const commandRegex = /```command\n([\s\S]*?)\n```/g
  let match
  while ((match = commandRegex.exec(response)) !== null) {
    const content = match[1].trim()
    
    // Try parsing as single JSON object
    try {
      const parsed = JSON.parse(content)
      extractCommands(parsed)
      continue
    } catch (e) {}
    
    // Try parsing as JSON array
    try {
      const parsed = JSON.parse('[' + content + ']')
      extractCommands(parsed)
      continue
    } catch (e) {}
    
    // Try parsing multiple JSON objects separated by newlines
    const lines = content.split('\n').filter(line => line.trim().startsWith('{'))
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line.trim())
        extractCommands(parsed)
      } catch (e) {}
    }
    
    // Try wrapping with commas
    try {
      const wrapped = '[' + content.replace(/}\s*\n\s*{/g, '},{').replace(/}\s*,?\s*{/g, '},{') + ']'
      const parsed = JSON.parse(wrapped)
      extractCommands(parsed)
    } catch (e) {
      console.error('[Chat] Failed to parse command block:', content.substring(0, 100))
    }
  }
  
  // Also try ```json blocks that contain action field
  const jsonRegex = /```json\n([\s\S]*?)\n```/g
  while ((match = jsonRegex.exec(response)) !== null) {
    const content = match[1].trim()
    
    try {
      const parsed = JSON.parse(content)
      extractCommands(parsed)
      continue
    } catch (e) {}
    
    // Try parsing multiple JSON objects separated by newlines
    const lines = content.split('\n').filter(line => line.trim().startsWith('{'))
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line.trim())
        extractCommands(parsed)
      } catch (e) {}
    }
  }
  
  // Also try bare ``` blocks
  const bareRegex = /```\n([\s\S]*?)\n```/g
  while ((match = bareRegex.exec(response)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      extractCommands(parsed)
    } catch (e) {
      try {
        const wrapped = '[' + match[1].replace(/}\s*,?\s*{/g, '},{') + ']'
        const parsed = JSON.parse(wrapped)
        extractCommands(parsed)
      } catch (e2) {
        // Not valid, ignore
      }
    }
  }
  
  // Also try inline `{...}` with action field (single backticks)
  const inlineRegex = /`(\{"action":[^`]+\})`/g
  while ((match = inlineRegex.exec(response)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      extractCommands(parsed)
    } catch (e) {
      // Not valid, ignore
    }
  }
  
  // Last resort: find any JSON object with "action" field in the text
  const looseRegex = /\{"action"\s*:\s*"[^"]+"\s*[^}]*\}/g
  while ((match = looseRegex.exec(response)) !== null) {
    try {
      const parsed = JSON.parse(match[0])
      // Avoid duplicates
      if (!commands.some(c => JSON.stringify(c) === JSON.stringify(parsed))) {
        extractCommands(parsed)
      }
    } catch (e) {
      // Not valid, ignore
    }
  }

  // Add assistant message
  session.messages.push({
    role: 'assistant',
    content: response,
    timestamp: Date.now()
  })

  return {
    sessionId: session.id,
    response,
    commands
  }
}

/**
 * Get chat history for a session
 */
export function getHistory(sessionId: string): Message[] | null {
  const session = getSession(sessionId)
  return session ? session.messages : null
}

export default {
  createSession,
  getSession,
  listSessions,
  deleteSession,
  chat,
  getHistory,
  buildMasterAIPrompt
}
