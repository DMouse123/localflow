#!/usr/bin/env node
/**
 * Test orchestrator with multiple connected tools
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
  console.log('\n🔧 Testing Multiple Tool Connections\n')

  // Check model
  const status = await sendCommand('model:status')
  if (!status.loaded) {
    console.log('No model loaded!')
    ws.close()
    return
  }

  await sendCommand('workflow:clear')
  console.log('✅ Cleared')

  // Build workflow
  const trigger = await sendCommand('node:add', { type: 'trigger', label: 'Start', position: { x: 100, y: 200 } })
  const task = await sendCommand('node:add', { 
    type: 'text-input', 
    config: { text: 'What is 100 divided by 4, and what time is it now?' },
    label: 'Task',
    position: { x: 300, y: 200 }
  })
  const orchestrator = await sendCommand('node:add', { type: 'ai-orchestrator', config: { maxSteps: 8 }, label: 'Orchestrator', position: { x: 500, y: 200 } })
  const debug = await sendCommand('node:add', { type: 'debug', label: 'Result', position: { x: 700, y: 200 } })

  // Add TWO tool nodes
  const calcTool = await sendCommand('node:add', { type: 'tool-calculator', label: 'Calculator', position: { x: 450, y: 380 } })
  const dateTool = await sendCommand('node:add', { type: 'tool-datetime', label: 'Date/Time', position: { x: 550, y: 380 } })

  console.log('📦 Added nodes')

  // Connect data flow
  await sendCommand('edge:add', { source: trigger.nodeId, target: task.nodeId })
  await sendCommand('edge:add', { source: task.nodeId, target: orchestrator.nodeId })
  await sendCommand('edge:add', { source: orchestrator.nodeId, target: debug.nodeId })

  // Connect BOTH tools to orchestrator
  await sendCommand('edge:add', { source: calcTool.nodeId, target: orchestrator.nodeId, sourceHandle: 'toolOut', targetHandle: 'tools' })
  await sendCommand('edge:add', { source: dateTool.nodeId, target: orchestrator.nodeId, sourceHandle: 'toolOut', targetHandle: 'tools' })

  console.log('🔗 Connected (including 2 tools)')

  console.log('\n🚀 Running...')
  await sendCommand('workflow:run')

  await new Promise(r => setTimeout(r, 15000))
  console.log('\n✅ Done! Check logs.')
  ws.close()
}

main().catch(console.error)
