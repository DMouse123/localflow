#!/usr/bin/env node
/**
 * Test the AI Orchestrator with verbose output
 */

const WebSocket = require('ws')

const CLAUDE_PORT = 9999
let ws = null
let commandId = 0
let executionLogs = []

function connect() {
  return new Promise((resolve, reject) => {
    console.log(`Connecting to ws://localhost:${CLAUDE_PORT}...`)
    ws = new WebSocket(`ws://localhost:${CLAUDE_PORT}`)
    
    ws.on('open', () => {
      console.log('✅ Connected to LocalFlow!')
      resolve()
    })
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString())
      if (msg.type === 'welcome') {
        console.log(`📨 ${msg.message}`)
      } else if (msg.type === 'execution:log') {
        console.log(`📋 LOG: ${msg.message}`)
        executionLogs.push(msg.message)
      } else if (msg.type === 'execution:complete') {
        console.log(`✅ Execution complete:`, msg.result)
      } else if (msg.type === 'execution:error') {
        console.log(`❌ Execution error:`, msg.error)
      }
    })
    
    ws.on('error', (err) => {
      reject(new Error(`Connection failed: ${err.message}`))
    })
    
    ws.on('close', () => {
      console.log('🔌 Disconnected from LocalFlow')
    })
  })
}

function sendCommand(type, payload = {}) {
  return new Promise((resolve, reject) => {
    const id = `cmd_${++commandId}_${Date.now()}`
    
    const timeout = setTimeout(() => {
      console.log('\n⏱️ Command timed out. Logs received:')
      executionLogs.forEach(l => console.log(`  ${l}`))
      reject(new Error('Command timeout'))
    }, 120000)
    
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

async function getModelStatus() {
  return await sendCommand('model:status')
}

async function loadModel(modelId) {
  console.log(`🔄 Loading model: ${modelId}...`)
  return await sendCommand('model:load', { modelId })
}

async function addNode(type, config = {}, label = null) {
  const result = await sendCommand('node:add', { 
    type, 
    config, 
    label: label || type 
  })
  console.log(`📦 Added node: ${result.nodeId} (${type})`)
  return result.nodeId
}

async function connectNodes(source, target) {
  const result = await sendCommand('edge:add', { source, target })
  console.log(`🔗 Connected: ${source} → ${target}`)
  return result.edgeId
}

async function clearWorkflow() {
  await sendCommand('workflow:clear')
  console.log('🗑️ Cleared workflow')
}

async function runWorkflow() {
  console.log('🚀 Running workflow...')
  executionLogs = []
  const result = await sendCommand('workflow:run')
  console.log('✅ Workflow complete!')
  return result
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  try {
    await connect()
    
    console.log('\n🧪 Testing AI Orchestrator\n')
    
    // Check model status
    console.log('Checking model status...')
    const status = await getModelStatus()
    console.log('Model status:', status)
    
    if (!status.loaded) {
      console.log('No model loaded. Please load a model first.')
      ws.close()
      return
    }
    
    // Clear any existing workflow
    await clearWorkflow()
    await sleep(500)
    
    // Build a simple orchestrator test
    console.log('\nBuilding test workflow...')
    
    // Add trigger
    const triggerId = await addNode('trigger', {}, '▶️ Start')
    await sleep(200)
    
    // Add text input with task
    const taskId = await addNode('text-input', {
      text: 'What is 25 times 17? Use the calculator to compute this.'
    }, '📝 Task')
    await sleep(200)
    
    // Add orchestrator
    const orchestratorId = await addNode('ai-orchestrator', {
      maxSteps: 5,
      tools: 'calculator,datetime'
    }, '🧠 Orchestrator')
    await sleep(200)
    
    // Add debug output
    const debugId = await addNode('debug', {
      label: 'Result'
    }, '📋 Result')
    await sleep(200)
    
    // Connect them
    await connectNodes(triggerId, taskId)
    await connectNodes(taskId, orchestratorId)
    await connectNodes(orchestratorId, debugId)
    await sleep(500)
    
    console.log('\n--- Running workflow ---\n')
    
    // Run it
    const result = await runWorkflow()
    
    console.log('\n--- Execution Logs ---')
    executionLogs.forEach(log => console.log(log))
    
    console.log('\n🎉 Test complete!')
    
    await sleep(1000)
    ws.close()
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\nExecution logs so far:')
    executionLogs.forEach(log => console.log(log))
    ws.close()
    process.exit(1)
  }
}

main()
