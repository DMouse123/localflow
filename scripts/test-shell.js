#!/usr/bin/env node
/**
 * Test shell command tool
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
  console.log('\n🧪 Testing Shell Command Tool\n')

  const status = await sendCommand('model:status')
  if (!status.loaded) { console.log('No model!'); ws.close(); return }

  await sendCommand('workflow:clear')

  // Task: List files in current directory
  const task = 'List the files in the /tmp directory.'

  const trigger = await sendCommand('node:add', { type: 'trigger', position: { x: 100, y: 200 } })
  const textNode = await sendCommand('node:add', { type: 'text-input', config: { text: task }, position: { x: 300, y: 200 } })
  const orchestrator = await sendCommand('node:add', { type: 'ai-orchestrator', config: { maxSteps: 5 }, position: { x: 500, y: 200 } })
  const debug = await sendCommand('node:add', { type: 'debug', position: { x: 700, y: 200 } })
  const shellTool = await sendCommand('node:add', { type: 'tool-shell', position: { x: 500, y: 380 } })

  await sendCommand('edge:add', { source: trigger.nodeId, target: textNode.nodeId })
  await sendCommand('edge:add', { source: textNode.nodeId, target: orchestrator.nodeId })
  await sendCommand('edge:add', { source: orchestrator.nodeId, target: debug.nodeId })
  await sendCommand('edge:add', { source: shellTool.nodeId, target: orchestrator.nodeId, sourceHandle: 'toolOut', targetHandle: 'tools' })

  console.log(`📝 Task: "${task}"`)
  console.log('\n🚀 Running...')
  await sendCommand('workflow:run')

  await new Promise(r => setTimeout(r, 15000))
  console.log('\n✅ Done!')
  ws.close()
}

main().catch(console.error)
