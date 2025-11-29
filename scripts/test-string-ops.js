#!/usr/bin/env node
/**
 * Test string operations tool
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
  console.log('\n🧪 Testing String Operations\n')

  const status = await sendCommand('model:status')
  if (!status.loaded) {
    console.log('No model loaded!')
    ws.close()
    return
  }

  await sendCommand('workflow:clear')

  // Simple task
  const task = 'Convert the text "hello world" to uppercase.'

  const trigger = await sendCommand('node:add', { type: 'trigger', label: 'Start', position: { x: 100, y: 200 } })
  const textNode = await sendCommand('node:add', { 
    type: 'text-input', 
    config: { text: task },
    label: 'Task',
    position: { x: 300, y: 200 }
  })
  const orchestrator = await sendCommand('node:add', { 
    type: 'ai-orchestrator', 
    config: { maxSteps: 5 }, 
    label: 'Orchestrator', 
    position: { x: 500, y: 200 } 
  })
  const debug = await sendCommand('node:add', { type: 'debug', label: 'Result', position: { x: 700, y: 200 } })

  // String ops tool
  const strTool = await sendCommand('node:add', { type: 'tool-string-ops', label: 'String', position: { x: 500, y: 380 } })

  await sendCommand('edge:add', { source: trigger.nodeId, target: textNode.nodeId })
  await sendCommand('edge:add', { source: textNode.nodeId, target: orchestrator.nodeId })
  await sendCommand('edge:add', { source: orchestrator.nodeId, target: debug.nodeId })
  await sendCommand('edge:add', { source: strTool.nodeId, target: orchestrator.nodeId, sourceHandle: 'toolOut', targetHandle: 'tools' })

  console.log(`📝 Task: "${task}"`)
  console.log('🔧 Tool: string_ops')

  console.log('\n🚀 Running...')
  await sendCommand('workflow:run')

  await new Promise(r => setTimeout(r, 15000))
  console.log('\n✅ Done!')
  ws.close()
}

main().catch(console.error)
