#!/usr/bin/env node
/**
 * Test different orchestrator tasks to see what it can do
 */

const WebSocket = require('ws')

const CLAUDE_PORT = 9999
let ws = null
let commandId = 0

function connect() {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(`ws://localhost:${CLAUDE_PORT}`)
    ws.on('open', () => resolve())
    ws.on('error', reject)
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString())
      if (msg.type === 'welcome') console.log('Connected!')
    })
  })
}

function sendCommand(type, payload = {}) {
  return new Promise((resolve, reject) => {
    const id = `cmd_${++commandId}_${Date.now()}`
    const timeout = setTimeout(() => reject(new Error('Timeout')), 60000)
    
    const handler = (data) => {
      const msg = JSON.parse(data.toString())
      if (msg.id === id) {
        clearTimeout(timeout)
        ws.off('message', handler)
        resolve(msg.result || {})
      }
    }
    ws.on('message', handler)
    ws.send(JSON.stringify({ id, type, payload }))
  })
}

async function runOrchestratorTask(task, tools = 'calculator,datetime,http_get,file_read,file_list') {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`TASK: ${task}`)
  console.log(`TOOLS: ${tools}`)
  console.log('='.repeat(60))
  
  // Clear and build workflow
  await sendCommand('workflow:clear')
  
  const triggerId = await sendCommand('node:add', { type: 'trigger', label: 'Start' })
  const taskId = await sendCommand('node:add', { 
    type: 'text-input', 
    config: { text: task },
    label: 'Task' 
  })
  const orchestratorId = await sendCommand('node:add', { 
    type: 'ai-orchestrator', 
    config: { maxSteps: 8, tools },
    label: 'Orchestrator' 
  })
  const debugId = await sendCommand('node:add', { type: 'debug', label: 'Result' })
  
  await sendCommand('edge:add', { source: triggerId.nodeId, target: taskId.nodeId })
  await sendCommand('edge:add', { source: taskId.nodeId, target: orchestratorId.nodeId })
  await sendCommand('edge:add', { source: orchestratorId.nodeId, target: debugId.nodeId })
  
  // Small delay to ensure UI is ready
  await new Promise(r => setTimeout(r, 500))
  
  // Run
  await sendCommand('workflow:run')
  
  // Wait for execution
  await new Promise(r => setTimeout(r, 3000))
  
  console.log('(Check logs for result)')
}

async function main() {
  await connect()
  
  const testTasks = [
    // Math
    { task: 'Calculate 15% of 280', tools: 'calculator' },
    
    // Date/Time
    { task: 'What is the current date and time?', tools: 'datetime' },
    
    // Multi-step math
    { task: 'If I have $500 and spend 30%, how much do I have left?', tools: 'calculator' },
    
    // File system
    { task: 'List the files in /Users/developer/Documents', tools: 'file_list' },
    
    // Combined
    { task: 'What day is it today and what is 7 times 8?', tools: 'calculator,datetime' },
  ]
  
  // Run just one task at a time to avoid sequence issues
  const taskIndex = parseInt(process.argv[2]) || 0
  
  if (taskIndex >= testTasks.length) {
    console.log('All tasks tested!')
    ws.close()
    return
  }
  
  const test = testTasks[taskIndex]
  await runOrchestratorTask(test.task, test.tools)
  
  console.log(`\nRun next test with: node scripts/test-orchestrator-tasks.js ${taskIndex + 1}`)
  
  await new Promise(r => setTimeout(r, 2000))
  ws.close()
}

main().catch(console.error)
