/**
 * Chat Session Manager
 * Manages Master AI chat sessions with memory
 * 
 * NEW: Uses Workflow Builder for building workflows instead of direct JSON output
 */

import LLMManager from './llm/manager'
import { listTemplates } from './templates'
import { getAllPluginTools } from './plugins/loader'
import { listWorkflows, getWorkflow } from './workflowStorage'
import { executeWorkflow } from './executor/engine'
import { getBuilderState } from './executor/workflowBuilderTools'

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

// Workflow Builder workflow ID (find the best one)
let workflowBuilderId: string | null = null

async function getWorkflowBuilderId(): Promise<string | null> {
  if (workflowBuilderId) return workflowBuilderId
  
  try {
    const workflows = listWorkflows()
    // Look for Workflow Builder (prefer v3, v4, v5 etc)
    const builder = workflows.find(w => 
      w.name.toLowerCase().includes('workflow builder')
    )
    if (builder) {
      workflowBuilderId = builder.id
      console.log(`[Chat] Found Workflow Builder: ${builder.name} (${builder.id})`)
    }
    return workflowBuilderId
  } catch (e) {
    console.error('[Chat] Failed to find Workflow Builder:', e)
    return null
  }
}

/**
 * Build the Master AI system prompt - now simpler, focused on dispatching
 */
export function buildMasterAIPrompt(): string {
  const templates = listTemplates()
  const plugins = getAllPluginTools()

  const templateList = templates.map(t => `- ${t.name} (${t.id})`).join('\n')
  
  const pluginList = plugins.length > 0
    ? plugins.map(p => `- ${p.tool.id}: ${p.tool.description}`).join('\n')
    : 'No plugins installed.'

  return `You are the Master AI for LocalFlow, a local AI workflow automation platform.

## Your Role
You help users by:
1. Answering questions about LocalFlow
2. Suggesting workflow designs
3. Building workflows when asked (the system handles this automatically)
4. Loading templates and saved workflows
5. Running workflows

## Available Templates
${templateList}

## Plugin Tools Available
${pluginList}

## Commands You Can Use

To load a template:
\`\`\`command
{"action": "loadTemplate", "id": "simple-qa"}
\`\`\`

To load a saved workflow:
\`\`\`command
{"action": "loadWorkflow", "id": "wf_123456"}
\`\`\`

To list saved workflows:
\`\`\`command
{"action": "listWorkflows"}
\`\`\`

To run the current workflow:
\`\`\`command
{"action": "run"}
\`\`\`

To clear the canvas:
\`\`\`command
{"action": "clear"}
\`\`\`

## IMPORTANT: Building Workflows
When user asks to BUILD or CREATE a workflow, just describe what they want clearly.
The system will automatically use the Workflow Builder to construct it.
You don't need to output node commands - just acknowledge and describe the workflow.

## Guidelines
- Be helpful and concise
- When user wants to build something, confirm what they want and let the builder handle it
- Suggest templates when appropriate
- Help users understand what's possible

You have full control. Help users build amazing automations!`
}

/**
 * Detect if user wants to build a workflow
 */
function isBuildRequest(message: string): boolean {
  const lower = message.toLowerCase()
  const buildKeywords = [
    'build', 'create', 'make', 'generate', 'design',
    'new workflow', 'workflow that', 'workflow to',
    'set up', 'setup', 'construct'
  ]
  const workflowKeywords = ['workflow', 'workflo', 'flow', 'automation', 'pipeline', 'translator', 'generator', 'maker', 'converter']
  
  // Check for explicit build + workflow intent
  const hasBuildIntent = buildKeywords.some(k => lower.includes(k))
  const hasWorkflowContext = workflowKeywords.some(k => lower.includes(k))
  
  return hasBuildIntent && hasWorkflowContext
}

/**
 * Build a workflow using the Workflow Builder workflow
 */
async function buildWorkflowViaBuilder(request: string): Promise<{
  success: boolean
  result?: string
  error?: string
  builtWorkflow?: { nodes: any[], edges: any[] }
}> {
  const builderId = await getWorkflowBuilderId()
  
  if (!builderId) {
    return { 
      success: false, 
      error: 'Workflow Builder not found. Please ensure a "Workflow Builder" workflow is saved.' 
    }
  }
  
  try {
    const workflow = getWorkflow(builderId)
    if (!workflow) {
      return { success: false, error: 'Workflow Builder workflow not found' }
    }
    
    console.log(`[Chat] Building workflow via Builder: "${request.substring(0, 50)}..."`)
    
    // Wrap user request with explicit step-by-step instructions
    const explicitRequest = `Build a 3-node workflow. IMPORTANT: Use type=ai-chat (NOT ai-orchestrator).

Steps:
1. clear_canvas
2. add_node type=text-input label=Input config_text=Enter text here
3. add_node type=ai-chat label=Processor config_systemPrompt=You will ${request}. Process the input text.
4. add_node type=debug label=Output
5. connect_nodes from_node_id=Input to_node_id=Processor
6. connect_nodes from_node_id=Processor to_node_id=Output
7. DONE

Start step 1.`
    
    // Inject the build request into the workflow's text-input
    const modifiedNodes = workflow.nodes.map((node: any) => {
      if (node.data?.type === 'text-input') {
        return {
          ...node,
          data: {
            ...node.data,
            config: { ...node.data.config, text: explicitRequest }
          }
        }
      }
      return node
    })
    
    // Execute the builder workflow
    const result = await executeWorkflow({
      ...workflow,
      nodes: modifiedNodes
    }, null)
    
    // Get the built workflow from builder state
    const builtState = getBuilderState()
    const builtWorkflow = builtState.nodes.length > 0 
      ? { nodes: [...builtState.nodes], edges: [...builtState.edges] }
      : undefined
    
    console.log(`[Chat] Builder created ${builtState.nodes.length} nodes, ${builtState.edges.length} edges`)
    
    // Extract result from orchestrator output
    const outputs = result.outputs || {}
    let builderResult = 'Workflow built'
    
    for (const [nodeId, output] of Object.entries(outputs)) {
      const o = output as any
      if (o?.result) builderResult = o.result
      if (o?.memory?.finalResult) builderResult = o.memory.finalResult
    }
    
    return { success: true, result: builderResult, builtWorkflow }
  } catch (err) {
    console.error('[Chat] Builder execution failed:', err)
    return { success: false, error: String(err) }
  }
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
 * Get session history
 */
export function getHistory(id: string): Message[] | null {
  const session = sessions.get(id)
  if (!session) return null
  return session.messages
}

/**
 * Send a message to the Master AI
 */
export async function chat(sessionId: string | null, message: string): Promise<{
  sessionId: string
  response: string
  commands: any[]
  commandResults: string[]
  buildResult?: { success: boolean; result?: string; error?: string; builtWorkflow?: { nodes: any[], edges: any[] } }
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

  const commands: any[] = []
  const commandResults: string[] = []
  let buildResult: { success: boolean; result?: string; error?: string } | undefined
  
  // Check if this is a build request - dispatch to Workflow Builder
  if (isBuildRequest(message)) {
    console.log(`[Chat] Detected build request, dispatching to Workflow Builder`)
    buildResult = await buildWorkflowViaBuilder(message)
    
    const response = buildResult.success 
      ? `I've built your workflow!\n\n${buildResult.result}`
      : `Sorry, I couldn't build the workflow: ${buildResult.error}`
    
    session.messages.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    })
    
    return {
      sessionId: session.id,
      response,
      commands,
      commandResults,
      buildResult
    }
  }

  // Regular chat - use LLM
  const systemPrompt = buildMasterAIPrompt()
  const conversationHistory = session.messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n')

  console.log(`[Chat] Sending to LLM: ${conversationHistory.substring(0, 100)}...`)

  let response: string
  try {
    response = await LLMManager.generateSync(
      conversationHistory,
      { systemPrompt, maxTokens: 600 }
    )
    console.log(`[Chat] LLM response: ${response.substring(0, 100)}...`)
  } catch (err) {
    console.error('[Chat] LLM error:', err)
    response = `Error: ${err}`
  }
  
  // Parse commands from response
  const extractCommands = (parsed: any) => {
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && item.action) commands.push(item)
      }
    } else if (parsed && parsed.action) {
      commands.push(parsed)
    }
  }
  
  // Try ```command blocks
  const commandRegex = /```command\n([\s\S]*?)\n```/g
  let match
  while ((match = commandRegex.exec(response)) !== null) {
    const content = match[1].trim()
    try {
      const parsed = JSON.parse(content)
      extractCommands(parsed)
    } catch (e) {
      // Try line by line
      const lines = content.split('\n').filter(line => line.trim().startsWith('{'))
      for (const line of lines) {
        try {
          extractCommands(JSON.parse(line.trim()))
        } catch {}
      }
    }
  }
  
  // Try ```json blocks
  const jsonRegex = /```json\n([\s\S]*?)\n```/g
  while ((match = jsonRegex.exec(response)) !== null) {
    try {
      extractCommands(JSON.parse(match[1].trim()))
    } catch {}
  }
  
  // Execute any commands found
  if (commands.length > 0) {
    const { executeCommand } = require('./commandExecutor')
    for (const cmd of commands) {
      try {
        const result = await executeCommand(cmd, session.id)
        commandResults.push(result)
      } catch (err) {
        commandResults.push(`Error: ${err}`)
      }
    }
  }

  // Add response to session
  session.messages.push({
    role: 'assistant',
    content: response,
    timestamp: Date.now()
  })

  return {
    sessionId: session.id,
    response,
    commands,
    commandResults,
    buildResult
  }
}
