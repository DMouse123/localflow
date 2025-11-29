#!/usr/bin/env node
/**
 * Test orchestrator step by step with detailed logging
 */

const WebSocket = require('ws')

const CLAUDE_PORT = 9999
let ws = null
let commandId = 0
let logs = []

function connect() {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(`ws://localhost:${CLAUDE_PORT}`)
    ws.on('open', () => resolve())
    ws.on('error', reject)
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString())
      if (msg.type === 'welcome') console.log('Connected!')
      if (msg.type === 'log') logs.push(msg.message)
    })
  })
}

function sendCommand(type, payload = {}) {
  return new Promise((resolve, reject) => {
    const id = `cmd_${++commandId}_${Date.now()}`
    const timeout = setTimeout(() => reject(new Error('Timeout')), 120000)
    
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

async function runTest(testName, task, tools) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`TEST: ${testName}`)
  console.log(`Task: ${task}`)
  console.log(`Tools: ${tools.join(', ')}`)
  console.log('='.repeat(60))
  
  logs = []
  
  // Clear and build minimal workflow
  await sendCommand('workflow:clear')
  
  const trigger = await sendCommand('node:add', { type: 'trigger', label: 'Start', position: { x: 50, y: 200 } })
  const taskNode = await sendCommand('node:add', { type: 'text-input', config: { text: task }, label: 'Task', position: { x: 200, y: 200 } })
  const orch = await sendCommand('node:add', { type: 'ai-orchestrator', config: { maxSteps: 6 }, label: 'Agent', position: { x: 400, y: 200 } })
  const debug = await sendCommand('node:add', { type: 'debug', label: 'Result', position: { x: 600, y: 200 } })
  
  // Connect data flow
  await sendCommand('edge:add', { source: trigger.nodeId, target: taskNode.nodeId })
  await sendCommand('edge:add', { source: taskNode.nodeId, target: orch.nodeId })
  await sendCommand('edge:add', { source: orch.nodeId, target: debug.nodeId })
  
  // Add tools
  let y = 350
  for (const tool of tools) {
    const toolNode = await sendCommand('node:add', { type: tool, label: tool, position: { x: 400, y } })
    await sendCommand('edge:add', { source: toolNode.nodeId, target: orch.nodeId, sourceHandle: 'toolOut', targetHandle: 'tools' })
    y += 80
  }
  
  console.log('Running workflow...')
  await sendCommand('workflow:run')
  
  // Wait for completion
  await new Promise(r => setTimeout(r, 30000))
  
  // Print relevant logs
  console.log('\n--- Key Logs ---')
  logs.forEach(log => {
    if (log.includes('ACTION:') || log.includes('DONE:') || log.includes('RESULT:') || log.includes('Step')) {
      console.log(log)
    }
  })
}

async function main() {
  await connect()
  console.log('\n🧪 Testing Orchestrator Behavior\n')

  // Test 1: Single tool, simple task
  await runTest(
    'Single Tool (Calculator)',
    'What is 15 times 8?',
    ['tool-calculator']
  )

  await new Promise(r => setTimeout(r, 3000))

  // Test 2: Two tools, must use both
  await runTest(
    'Two Tools (Calculator + Generate ID)',
    'Calculate 100 divided by 4, then generate a UUID.',
    ['tool-calculator', 'tool-generate-id']
  )

  console.log('\n✅ Tests complete!')
  ws.close()
}

main().catch(console.error)
