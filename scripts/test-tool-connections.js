#!/usr/bin/env node
/**
 * Test the visual tool connection system
 * Creates an orchestrator with visually connected tool nodes
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

async function main() {
  await connect()
  console.log('\n🔧 Testing Visual Tool Connections\n')

  // Check model
  const status = await sendCommand('model:status')
  if (!status.loaded) {
    console.log('No model loaded!')
    ws.close()
    return
  }

  // Clear and build workflow
  await sendCommand('workflow:clear')
  console.log('✅ Cleared workflow')

  // Add trigger
  const trigger = await sendCommand('node:add', { 
    type: 'trigger', 
    label: 'Start',
    position: { x: 100, y: 200 }
  })
  console.log(`📦 Added trigger: ${trigger.nodeId}`)

  // Add text input with task
  const task = await sendCommand('node:add', { 
    type: 'text-input', 
    config: { text: 'What is 42 times 17?' },
    label: 'Task',
    position: { x: 300, y: 200 }
  })
  console.log(`📦 Added task: ${task.nodeId}`)

  // Add orchestrator
  const orchestrator = await sendCommand('node:add', { 
    type: 'ai-orchestrator', 
    config: { maxSteps: 5 },
    label: 'Orchestrator',
    position: { x: 500, y: 200 }
  })
  console.log(`📦 Added orchestrator: ${orchestrator.nodeId}`)

  // Add debug
  const debug = await sendCommand('node:add', { 
    type: 'debug', 
    label: 'Result',
    position: { x: 700, y: 200 }
  })
  console.log(`📦 Added debug: ${debug.nodeId}`)

  // Add tool node - Calculator
  const calcTool = await sendCommand('node:add', { 
    type: 'tool-calculator', 
    label: 'Calculator',
    position: { x: 500, y: 350 }
  })
  console.log(`🔧 Added calculator tool: ${calcTool.nodeId}`)

  // Connect data flow: trigger → task → orchestrator → debug
  await sendCommand('edge:add', { source: trigger.nodeId, target: task.nodeId })
  console.log('🔗 Connected trigger → task')
  
  await sendCommand('edge:add', { source: task.nodeId, target: orchestrator.nodeId })
  console.log('🔗 Connected task → orchestrator')
  
  await sendCommand('edge:add', { source: orchestrator.nodeId, target: debug.nodeId })
  console.log('🔗 Connected orchestrator → debug')

  // Connect tool to orchestrator's tool port
  // This is the key connection - tool connects to 'tools' handle
  await sendCommand('edge:add', { 
    source: calcTool.nodeId, 
    target: orchestrator.nodeId,
    sourceHandle: 'toolOut',
    targetHandle: 'tools'
  })
  console.log('🔗 Connected calculator tool → orchestrator (tool port)')

  console.log('\n🚀 Running workflow...')
  await sendCommand('workflow:run')

  // Wait for completion
  await new Promise(r => setTimeout(r, 10000))

  console.log('\n✅ Test complete! Check the app logs.')
  ws.close()
}

main().catch(console.error)
