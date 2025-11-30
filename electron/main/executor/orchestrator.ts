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
  onToolComplete?: (action: string) => void
  onComplete?: (finalResult: string) => void
  onError?: (error: string) => void
  log: (message: string) => void
}

// Build the system prompt for the orchestrator
function buildSystemPrompt(config: OrchestratorConfig): string {
  // Build rich tool descriptions from tool registry
  const toolDescriptions = config.enabledTools.map(toolName => {
    const tool = getTool(toolName)
    if (!tool) return `${toolName}: (unknown tool)`
    
    const params = Object.entries(tool.inputSchema.properties)
      .map(([name, prop]: [string, any]) => `    ${name}: ${prop.description || prop.type}`)
      .join('\n')
    
    return `• ${toolName}: ${tool.description}\n  Parameters:\n${params}`
  }).join('\n\n')
  
  return `You are an autonomous AI agent that completes tasks by using tools.

AVAILABLE TOOLS:
${toolDescriptions}

PROCESS:
1. Analyze the task and identify what information you need
2. Look at your available tools and plan which ones to use
3. Call ONE tool at a time using the format below
4. Wait for RESULT, then decide next step
5. When you have all the information needed, say DONE

FORMAT - To use a tool:
ACTION: tool_name
INPUT: {"param": "value"}

FORMAT - When task is complete:
DONE: [your final answer combining all results]

RULES:
- Call only ONE tool per response
- Wait for RESULT before calling next tool
- Use information from previous results in later tool calls
- Only say DONE when task is fully complete
- To run another workflow, use: ACTION: run_workflow with INPUT: {"workflow_id": "wf_xxx", "input": "optional text"}
- To see available workflows, use: ACTION: list_workflows with INPUT: {}`
}

// Parse LLM response to extract thought, action, input, or done
// IMPORTANT: Captures the FIRST action/input, not the last
// If ACTION is present, ignore DONE (model is hallucinating ahead)
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
  let foundAction = false  // Flag to only capture FIRST action

  for (const line of lines) {
    const trimmed = line.trim()
    
    if (trimmed.startsWith('THOUGHT:')) {
      // Only capture first thought before an action
      if (!thought) {
        thought = trimmed.substring(8).trim()
      }
    } else if (trimmed.startsWith('ACTION:') && !foundAction) {
      // Only capture FIRST action
      action = trimmed.substring(7).trim().toLowerCase()
      foundAction = true
    } else if (trimmed.startsWith('INPUT:') && foundAction && !input) {
      // Only capture input for the FIRST action
      const inputStr = trimmed.substring(6).trim()
      input = parseJsonFlexible(inputStr, response, action)
    } else if (trimmed.startsWith('DONE:') && !foundAction) {
      // Only capture DONE if there's NO action (model can't hallucinate both)
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
function parseJsonFlexible(inputStr: string, fullResponse: string, actionName?: string): any {
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
  
  // Create a persistent session for this orchestrator run
  try {
    await LLMManager.createOrchestratorSession(systemPrompt)
  } catch (error) {
    log(`Failed to create session: ${error}`)
    memory.status = 'error'
    memory.finalResult = `Session error: ${error}`
    return memory
  }

  try {
    // First prompt is the task
    let nextPrompt = `Task: ${task}`

    for (let step = 0; step < config.maxSteps; step++) {
      log(`\n--- Step ${step + 1}/${config.maxSteps} ---`)

      // Call LLM with persistent session
      let response: string
      try {
        response = await LLMManager.orchestratorPrompt(nextPrompt, {
          maxTokens: 200,
          temperature: 0.1
        })
      } catch (error) {
        log(`LLM error: ${error}`)
        memory.status = 'error'
        memory.finalResult = `LLM error: ${error}`
        callbacks.onError?.(`LLM error: ${error}`)
        break
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
        break
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
          nextPrompt = `ERROR: ${errorMsg}. Available tools: ${config.enabledTools.join(', ')}`
        } else {
          // Get and execute tool
          const tool = getTool(parsed.action)
          if (!tool) {
            const errorMsg = `Tool "${parsed.action}" not found`
            log(`ERROR: ${errorMsg}`)
            stepRecord.result = { error: errorMsg }
            nextPrompt = `ERROR: ${errorMsg}`
          } else {
            try {
              const result = await tool.execute(parsed.input || {})
              stepRecord.result = result
              log(`RESULT: ${JSON.stringify(result).substring(0, 200)}...`)
              callbacks.onResult?.(result)
              callbacks.onToolComplete?.(parsed.action)
              // Next prompt is just the result - session remembers context
              nextPrompt = `RESULT: ${JSON.stringify(result)}`
            } catch (error) {
              const errorMsg = `Tool execution failed: ${error}`
              log(`ERROR: ${errorMsg}`)
              stepRecord.result = { error: errorMsg }
              nextPrompt = `ERROR: ${errorMsg}`
            }
          }
        }
      } else {
        // No action parsed - prompt to continue
        nextPrompt = `Continue. Use a tool or say DONE.`
      }

      memory.steps.push(stepRecord)
    }

    // Check if we reached max steps without completing
    if (memory.status !== 'complete') {
      log(`Reached max steps (${config.maxSteps})`)
      memory.status = 'complete'
      memory.finalResult = `Reached maximum steps. Last progress: ${memory.steps[memory.steps.length - 1]?.thought || 'unknown'}`
    }

  } finally {
    // Always clean up the session
    await LLMManager.disposeOrchestratorSession()
  }
  
  return memory
}

export default { runOrchestrator }
