#!/usr/bin/env node
/**
 * Claude Remote Control CLI
 * 
 * Connects to LocalFlow app via WebSocket and controls it in real-time.
 * Human watches in the UI as Claude adds nodes, connects them, runs workflows.
 * 
 * Usage:
 *   node scripts/claude-remote.js connect
 *   node scripts/claude-remote.js demo
 */

const WebSocket = require('ws')

const CLAUDE_PORT = 9999
let ws = null
let commandId = 0

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
      reject(new Error('Command timeout'))
    }, 30000)
    
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

// High-level commands
async function think(message) {
  console.log(`🤔 ${message}`)
  return sendCommand('claude:think', { message })
}

async function loadModel(modelId) {
  console.log(`🔄 Loading model: ${modelId}...`)
  const result = await sendCommand('model:load', { modelId })
  if (result.success) {
    console.log(`✅ Model loaded: ${modelId}`)
  } else {
    console.log(`❌ Failed to load model: ${result.error}`)
  }
  return result
}

async function getModelStatus() {
  const result = await sendCommand('model:status', {})
  return result
}

async function ensureModelLoaded() {
  const status = await getModelStatus()
  
  if (status.loaded) {
    console.log(`✅ Model already loaded: ${status.loaded}`)
    return true
  }
  
  // Find a downloaded model to load
  const downloaded = status.models?.filter(m => m.isDownloaded) || []
  
  if (downloaded.length === 0) {
    console.log('❌ No models downloaded! Please download one in the app first.')
    return false
  }
  
  // Load the first available model
  const modelToLoad = downloaded[0].id
  await loadModel(modelToLoad)
  return true
}

async function addNode(type, config = {}, label = null) {
  const result = await sendCommand('node:add', { 
    type, 
    config, 
    label: label || type 
  })
  console.log(`📦 Added node: ${result.nodeId}`)
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
  await sendCommand('workflow:run')
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Demo - builds a complete workflow while human watches
async function runDemo() {
  console.log('\n🎬 === LOCALFLOW DEMO ===\n')
  console.log('Watch the app as I build a workflow!\n')
  await sleep(1000)

  // First, ensure a model is loaded
  await think("Let me check if a model is loaded...")
  const modelReady = await ensureModelLoaded()
  if (!modelReady) {
    console.log('❌ Cannot run demo without a model. Please download one first.')
    return
  }
  await sleep(800)

  await think("Let me clear the canvas first...")
  await clearWorkflow()
  await sleep(800)

  await think("I'll create a simple Q&A workflow")
  await sleep(1000)

  await think("Adding a Text Input node with a question...")
  const node1 = await addNode('text-input', { 
    text: 'What is the meaning of life?' 
  }, 'Question')
  await sleep(1200)

  await think("Now adding an AI Chat node to answer it...")
  const node2 = await addNode('ai-chat', { 
    systemPrompt: 'You are a wise philosopher. Answer thoughtfully but briefly.',
    maxTokens: 150 
  }, 'Philosopher AI')
  await sleep(1200)

  await think("Adding a Debug node to see the output...")
  const node3 = await addNode('debug', { 
    label: '💡 Answer' 
  }, 'Output')
  await sleep(1000)

  await think("Connecting the nodes together...")
  await connectNodes(node1, node2)
  await sleep(600)
  await connectNodes(node2, node3)
  await sleep(800)

  await think("Perfect! Now let's run it...")
  await sleep(1000)
  await runWorkflow()

  await sleep(2000)
  await think("Done! Check the output panel for the answer.")
  
  console.log('\n✅ Demo complete!\n')
}

const { execSync } = require('child_process')
const path = require('path')

const APP_DIR = path.join(__dirname, '..')
const APP_SCRIPT = path.join(__dirname, 'app.sh')

// App control functions (no WebSocket needed)
function appStart() {
  console.log('Starting LocalFlow...')
  execSync(`${APP_SCRIPT} start`, { cwd: APP_DIR, stdio: 'inherit' })
}

function appStop() {
  console.log('Stopping LocalFlow...')
  execSync(`${APP_SCRIPT} stop`, { cwd: APP_DIR, stdio: 'inherit' })
}

function appRestart() {
  console.log('Restarting LocalFlow...')
  execSync(`${APP_SCRIPT} restart`, { cwd: APP_DIR, stdio: 'inherit' })
}

function appStatus() {
  execSync(`${APP_SCRIPT} status`, { cwd: APP_DIR, stdio: 'inherit' })
}

// CLI handler
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command) {
    console.log(`
Claude Remote Control for LocalFlow
====================================

Usage:
  node scripts/claude-remote.js <command>

App Control (no connection needed):
  start           Start the app
  stop            Stop the app
  restart         Restart the app
  status          Check if app is running

Remote Commands (connects to running app):
  connect         Connect and stay connected
  demo            Run the full demo (builds a workflow live!)

The human can watch the LocalFlow app as you work.
`)
    return
  }

  // App control commands (don't need WebSocket)
  switch (command) {
    case 'start':
      appStart()
      return
    case 'stop':
      appStop()
      return
    case 'restart':
      appRestart()
      return
    case 'status':
      appStatus()
      return
  }

  // Commands that need WebSocket connection
  try {
    await connect()
    
    switch (command) {
      case 'connect':
        console.log('\nConnected! Press Ctrl+C to disconnect.\n')
        console.log('You can now run commands in another terminal,')
        console.log('or use this connection for testing.\n')
        await new Promise(() => {}) // Keep alive
        break
        
      case 'demo':
        await runDemo()
        ws.close()
        break
        
      default:
        console.log(`Unknown command: ${command}`)
        ws.close()
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\nMake sure LocalFlow app is running:')
    console.log('  node scripts/claude-remote.js start')
    process.exit(1)
  }
}

main()
