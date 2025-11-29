/**
 * AI Orchestrator
 * 
 * The core reasoning engine that:
 * 1. Receives a task
 * 2. Uses tools to complete it
 * 3. Maintains memory of steps
 * 4. Returns final result
 */

import { getTool, getAllTools, getToolDescriptionsForPrompt } from './tools'
import LLMManager from '../llm/manager'

// Types
export interface OrchestratorStep {
  thought: string
  action?: string
  input?: any
  result?: any
  timestamp: string
}

export interface OrchestratorMemory {
  task: string
  steps: OrchestratorStep[]
  status: 'in_progress' | 'complete' | 'error'
  finalResult?: string
}

export interface OrchestratorConfig {
  maxSteps: number
  enabledTools: string[]
  systemPrompt?: string
}

export interface OrchestratorCallbacks {
  onThought?: (thought: string) => void
  onAction?: (action: string, input: any) => void
  onResult?: (result: any) => void
  onComplete?: (finalResult: string) => void
  onError?: (error: string) => void
  log: (message: string) => void
}

// Build the system prompt for the orchestrator
function buildSystemPrompt(config: OrchestratorConfig): string {
  const toolDescriptions = getToolDescriptionsForPrompt()
  
  return `You are an AI assistant that completes tasks by using tools. You have access to the following tools:

${toolDescriptions}

To use a tool, respond in this EXACT format:
THOUGHT: [your reasoning about what to do next]
ACTION: [tool_name]
INPUT: [JSON parameters for the tool]

When you have completed the task, respond with:
THOUGHT: [summary of what you did]
DONE: [your final answer to the user]

Rules:
- Always start with THOUGHT to explain your reasoning
- Only use tools from the list above
- INPUT must be valid JSON
- Keep working until the task is complete
- If you cannot complete the task, explain why in DONE`
}

// Parse LLM response to extract thought, action, input, or done
function parseResponse(response: string): {
  thought: string
  action?: string
  input?: any
  done?: string
} {
  const lines = response.trim().split('\n')
  let thought = ''
  let action: string | undefined
  let input: any
  let done: string | undefined

  for (const line of lines) {
    const trimmed = line.trim()
    
    if (trimmed.startsWith('THOUGHT:')) {
      thought = trimmed.substring(8).trim()
    } else if (trimmed.startsWith('ACTION:')) {
      action = trimmed.substring(7).trim().toLowerCase()
    } else if (trimmed.startsWith('INPUT:')) {
      const inputStr = trimmed.substring(6).trim()
      input = parseJsonFlexible(inputStr, response)
    } else if (trimmed.startsWith('DONE:')) {
      done = trimmed.substring(5).trim()
    }
  }

  // If no structured response, treat whole thing as thought
  if (!thought && !action && !done) {
    thought = response.trim()
  }

  return { thought, action, input, done }
}

// Flexible JSON parser that handles common LLM output quirks
function parseJsonFlexible(inputStr: string, fullResponse: string): any {
  // Try standard JSON parse first
  try {
    return JSON.parse(inputStr)
  } catch { /* continue */ }
  
  // Try to extract JSON object from the input
  const jsonMatch = fullResponse.match(/INPUT:\s*(\{[\s\S]*?\})/m)
  if (jsonMatch) {
    let jsonStr = jsonMatch[1]
    
    // Try as-is first
    try {
      return JSON.parse(jsonStr)
    } catch { /* continue */ }
    
    // Fix single quotes to double quotes (common LLM mistake)
    try {
      const fixed = jsonStr
        .replace(/'/g, '"')
        .replace(/(\w+):/g, '"$1":')  // quote unquoted keys
      return JSON.parse(fixed)
    } catch { /* continue */ }
    
    // Try even more lenient parsing
    try {
      // Remove trailing commas and fix common issues
      const fixed = jsonStr
        .replace(/'/g, '"')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
      return JSON.parse(fixed)
    } catch { /* continue */ }
  }
  
  // Last resort: try to parse key=value style
  // e.g., "operation: 'uppercase', text: 'hello'" 
  if (inputStr.includes(':')) {
    try {
      const obj: any = {}
      // Match patterns like: key: 'value' or key: "value" or key: value
      const pairs = inputStr.match(/(\w+)\s*[:=]\s*['"]?([^'"}\],]+)['"]?/g)
      if (pairs) {
        for (const pair of pairs) {
          const match = pair.match(/(\w+)\s*[:=]\s*['"]?([^'"}\],]+)['"]?/)
          if (match) {
            obj[match[1]] = match[2].trim()
          }
        }
        if (Object.keys(obj).length > 0) {
          return obj
        }
      }
    } catch { /* continue */ }
  }
  
  // Return as raw if nothing works
  return { raw: inputStr }
}

// Main orchestrator execution
export async function runOrchestrator(
  task: string,
  config: OrchestratorConfig,
  callbacks: OrchestratorCallbacks
): Promise<OrchestratorMemory> {
  const { log } = callbacks
  
  const memory: OrchestratorMemory = {
    task,
    steps: [],
    status: 'in_progress'
  }

  log(`Starting orchestrator with task: "${task}"`)
  log(`Enabled tools: ${config.enabledTools.join(', ')}`)
  log(`Max steps: ${config.maxSteps}`)

  const systemPrompt = buildSystemPrompt(config)
  
  // Build conversation for context
  let conversationHistory = `Task: ${task}\n\n`

  for (let step = 0; step < config.maxSteps; step++) {
    log(`\n--- Step ${step + 1}/${config.maxSteps} ---`)

    // Call LLM
    let response: string
    try {
      response = await LLMManager.generateSync(conversationHistory, {
        systemPrompt,
        maxTokens: 512,
        temperature: 0.3  // Lower temperature for more consistent tool use
      })
    } catch (error) {
      log(`LLM error: ${error}`)
      memory.status = 'error'
      memory.finalResult = `LLM error: ${error}`
      callbacks.onError?.(`LLM error: ${error}`)
      return memory
    }

    log(`LLM response: ${response.substring(0, 200)}...`)

    // Parse the response
    const parsed = parseResponse(response)
    
    const stepRecord: OrchestratorStep = {
      thought: parsed.thought,
      timestamp: new Date().toISOString()
    }

    if (parsed.thought) {
      log(`THOUGHT: ${parsed.thought}`)
      callbacks.onThought?.(parsed.thought)
    }

    // Check if done
    if (parsed.done) {
      log(`DONE: ${parsed.done}`)
      memory.steps.push(stepRecord)
      memory.status = 'complete'
      memory.finalResult = parsed.done
      callbacks.onComplete?.(parsed.done)
      return memory
    }

    // Execute action if present
    if (parsed.action) {
      stepRecord.action = parsed.action
      stepRecord.input = parsed.input

      log(`ACTION: ${parsed.action}`)
      log(`INPUT: ${JSON.stringify(parsed.input)}`)
      callbacks.onAction?.(parsed.action, parsed.input)

      // Check if tool is enabled
      if (!config.enabledTools.includes(parsed.action)) {
        const errorMsg = `Tool "${parsed.action}" is not enabled`
        log(`ERROR: ${errorMsg}`)
        stepRecord.result = { error: errorMsg }
        conversationHistory += `${response}\n\nERROR: ${errorMsg}. Available tools: ${config.enabledTools.join(', ')}\n\n`
      } else {
        // Get and execute tool
        const tool = getTool(parsed.action)
        if (!tool) {
          const errorMsg = `Tool "${parsed.action}" not found`
          log(`ERROR: ${errorMsg}`)
          stepRecord.result = { error: errorMsg }
          conversationHistory += `${response}\n\nERROR: ${errorMsg}\n\n`
        } else {
          try {
            const result = await tool.execute(parsed.input || {})
            stepRecord.result = result
            log(`RESULT: ${JSON.stringify(result).substring(0, 200)}...`)
            callbacks.onResult?.(result)
            conversationHistory += `${response}\n\nRESULT: ${JSON.stringify(result)}\n\n`
          } catch (error) {
            const errorMsg = `Tool execution failed: ${error}`
            log(`ERROR: ${errorMsg}`)
            stepRecord.result = { error: errorMsg }
            conversationHistory += `${response}\n\nERROR: ${errorMsg}\n\n`
          }
        }
      }
    } else {
      // No action, add thought to history and continue
      conversationHistory += `${response}\n\nPlease continue with the task. Use a tool or say DONE if finished.\n\n`
    }

    memory.steps.push(stepRecord)
  }

  // Reached max steps
  log(`Reached max steps (${config.maxSteps})`)
  memory.status = 'complete'
  memory.finalResult = `Reached maximum steps. Last progress: ${memory.steps[memory.steps.length - 1]?.thought || 'unknown'}`
  
  return memory
}

export default { runOrchestrator }
