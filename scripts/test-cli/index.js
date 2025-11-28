#!/usr/bin/env node
/**
 * LocalFlow Test CLI
 * 
 * A command-line interface for Claude (or humans) to test LocalFlow
 * without needing to interact with the GUI.
 * 
 * Usage:
 *   node scripts/test-cli/index.js <command> [args...]
 * 
 * Commands:
 *   models list              - List all available models
 *   models download <id>     - Download a model
 *   models load <id>         - Load a model into memory
 *   models unload            - Unload current model
 *   models status            - Show current model status
 * 
 *   chat <message>           - Send a message to loaded model
 *   chat --system <sys> <msg> - Chat with system prompt
 * 
 *   workflow list            - List saved workflows
 *   workflow create <name>   - Create a new workflow
 *   workflow run <id>        - Execute a workflow
 *   workflow delete <id>     - Delete a workflow
 * 
 *   test all                 - Run full test suite
 *   test models              - Test model operations
 *   test chat                - Test chat functionality
 *   test workflow            - Test workflow operations
 */

const path = require('path')
const fs = require('fs')
const os = require('os')

// Paths
const LOCALFLOW_DIR = path.join(os.homedir(), '.localflow')
const MODELS_DIR = path.join(LOCALFLOW_DIR, 'models')
const WORKFLOWS_DIR = path.join(LOCALFLOW_DIR, 'workflows')
const STATE_FILE = path.join(LOCALFLOW_DIR, 'cli-state.json')

// Ensure directories exist
if (!fs.existsSync(LOCALFLOW_DIR)) fs.mkdirSync(LOCALFLOW_DIR, { recursive: true })
if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true })
if (!fs.existsSync(WORKFLOWS_DIR)) fs.mkdirSync(WORKFLOWS_DIR, { recursive: true })

// Model catalog (same as in the app)
const MODEL_CATALOG = [
  {
    id: 'llama-3.2-1b-q4',
    name: 'Llama 3.2 1B',
    size: '0.77 GB',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
  },
  {
    id: 'llama-3.2-3b-q4',
    name: 'Llama 3.2 3B',
    size: '2.02 GB',
    filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
  },
  {
    id: 'smollm2-1.7b-q4',
    name: 'SmolLM2 1.7B',
    size: '1.0 GB',
    filename: 'SmolLM2-1.7B-Instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/SmolLM2-1.7B-Instruct-GGUF/resolve/main/SmolLM2-1.7B-Instruct-Q4_K_M.gguf',
  },
]

// State management
let state = { loadedModel: null }
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
    }
  } catch (e) { /* ignore */ }
}
function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

// LLM instance (lazy loaded)
let llama = null
let model = null
let context = null

// ============ Model Commands ============

async function listModels() {
  const downloaded = fs.readdirSync(MODELS_DIR)
  console.log('\n📦 Available Models:\n')
  
  for (const m of MODEL_CATALOG) {
    const isDownloaded = downloaded.includes(m.filename)
    const isLoaded = state.loadedModel === m.id
    const status = isLoaded ? '🟢 LOADED' : isDownloaded ? '✅ Downloaded' : '⬇️  Not downloaded'
    console.log(`  ${m.id}`)
    console.log(`    Name: ${m.name}`)
    console.log(`    Size: ${m.size}`)
    console.log(`    Status: ${status}`)
    console.log()
  }
}

async function downloadModel(modelId) {
  const modelInfo = MODEL_CATALOG.find(m => m.id === modelId)
  if (!modelInfo) {
    console.error(`❌ Model not found: ${modelId}`)
    console.log('Available:', MODEL_CATALOG.map(m => m.id).join(', '))
    return false
  }

  const destPath = path.join(MODELS_DIR, modelInfo.filename)
  if (fs.existsSync(destPath)) {
    console.log(`✅ Model already downloaded: ${modelInfo.name}`)
    return true
  }

  console.log(`⬇️  Downloading ${modelInfo.name} (${modelInfo.size})...`)
  console.log(`   From: ${modelInfo.downloadUrl}`)

  try {
    const response = await fetch(modelInfo.downloadUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const contentLength = parseInt(response.headers.get('content-length') || '0')
    const reader = response.body.getReader()
    const chunks = []
    let received = 0
    let lastPercent = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      
      const percent = Math.round((received / contentLength) * 100)
      if (percent >= lastPercent + 10) {
        console.log(`   Progress: ${percent}% (${(received / 1024 / 1024).toFixed(1)} MB)`)
        lastPercent = percent
      }
    }

    const buffer = Buffer.concat(chunks.map(c => Buffer.from(c)))
    fs.writeFileSync(destPath, buffer)
    console.log(`✅ Download complete: ${modelInfo.name}`)
    return true
  } catch (error) {
    console.error(`❌ Download failed:`, error.message)
    return false
  }
}

async function loadModel(modelId) {
  const modelInfo = MODEL_CATALOG.find(m => m.id === modelId)
  if (!modelInfo) {
    console.error(`❌ Model not found: ${modelId}`)
    return false
  }

  const modelPath = path.join(MODELS_DIR, modelInfo.filename)
  if (!fs.existsSync(modelPath)) {
    console.error(`❌ Model not downloaded. Run: models download ${modelId}`)
    return false
  }

  // Unload existing model
  if (model) {
    console.log('🔄 Unloading current model...')
    await unloadModel()
  }

  console.log(`🔄 Loading ${modelInfo.name}...`)
  
  try {
    const nodeLlamaCpp = await import('node-llama-cpp')
    llama = await nodeLlamaCpp.getLlama()
    model = await llama.loadModel({ modelPath })
    context = await model.createContext()
    
    state.loadedModel = modelId
    saveState()
    
    console.log(`✅ Model loaded: ${modelInfo.name}`)
    return true
  } catch (error) {
    console.error(`❌ Failed to load model:`, error.message)
    return false
  }
}

async function unloadModel() {
  if (context) { await context.dispose(); context = null }
  if (model) { await model.dispose(); model = null }
  state.loadedModel = null
  saveState()
  console.log('✅ Model unloaded')
}

async function modelStatus() {
  loadState()
  if (state.loadedModel) {
    const info = MODEL_CATALOG.find(m => m.id === state.loadedModel)
    console.log(`\n🟢 Loaded: ${info?.name || state.loadedModel}`)
  } else {
    console.log('\n⚪ No model loaded')
  }
}

// ============ Chat Commands ============

async function chat(message, systemPrompt = null) {
  loadState()
  
  if (!state.loadedModel) {
    console.error('❌ No model loaded. Run: models load <model-id>')
    return null
  }

  // Load model if not in memory
  if (!model) {
    await loadModel(state.loadedModel)
  }

  console.log(`\n💬 You: ${message}\n`)
  
  try {
    const { LlamaChatSession } = await import('node-llama-cpp')
    const session = new LlamaChatSession({ 
      contextSequence: context.getSequence(),
      systemPrompt: systemPrompt || 'You are a helpful AI assistant.',
    })
    
    let response = ''
    process.stdout.write('🤖 AI: ')
    
    await session.prompt(message, {
      maxTokens: 512,
      temperature: 0.7,
      onTextChunk: (chunk) => {
        response += chunk
        process.stdout.write(chunk)
      },
    })
    
    console.log('\n')
    return response
  } catch (error) {
    console.error(`\n❌ Chat failed:`, error.message)
    return null
  }
}

// ============ Workflow Commands ============

async function listWorkflows() {
  const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json'))
  
  if (files.length === 0) {
    console.log('\n📋 No workflows found')
    return []
  }

  console.log('\n📋 Workflows:\n')
  const workflows = []
  
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf-8'))
    workflows.push(data)
    console.log(`  ${data.id}`)
    console.log(`    Name: ${data.name}`)
    console.log(`    Nodes: ${data.nodes?.length || 0}`)
    console.log(`    Updated: ${data.updatedAt || 'unknown'}`)
    console.log()
  }
  
  return workflows
}

async function createWorkflow(name, nodes = [], edges = []) {
  const id = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const workflow = {
    id,
    name,
    nodes,
    edges,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  const filepath = path.join(WORKFLOWS_DIR, `${id}.json`)
  fs.writeFileSync(filepath, JSON.stringify(workflow, null, 2))
  
  console.log(`✅ Created workflow: ${name} (${id})`)
  return workflow
}

async function deleteWorkflow(id) {
  const filepath = path.join(WORKFLOWS_DIR, `${id}.json`)
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath)
    console.log(`✅ Deleted workflow: ${id}`)
    return true
  }
  console.error(`❌ Workflow not found: ${id}`)
  return false
}

// Execute a workflow
async function runWorkflow(workflowId) {
  // Load the workflow
  const filepath = path.join(WORKFLOWS_DIR, `${workflowId}.json`)
  if (!fs.existsSync(filepath)) {
    console.error(`❌ Workflow not found: ${workflowId}`)
    return null
  }

  const workflow = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
  console.log(`\n🚀 Running workflow: ${workflow.name}\n`)
  console.log(`   Nodes: ${workflow.nodes.length}`)
  console.log(`   Edges: ${workflow.edges.length}`)

  // Ensure model is loaded
  loadState()
  if (!model) {
    // Model not in memory, need to load it
    const downloaded = fs.readdirSync(MODELS_DIR)
    let modelToLoad = state.loadedModel
    
    // If no model was previously loaded, pick first available
    if (!modelToLoad) {
      const availableModel = MODEL_CATALOG.find(m => downloaded.includes(m.filename))
      if (availableModel) {
        modelToLoad = availableModel.id
      }
    }
    
    if (modelToLoad && MODEL_CATALOG.find(m => m.id === modelToLoad && downloaded.includes(m.filename))) {
      console.log(`   Loading model: ${modelToLoad}...`)
      await loadModel(modelToLoad)
    } else {
      console.error('❌ No model available. Download one first.')
      return null
    }
  }

  // Execute nodes in topological order
  const nodeOutputs = new Map()
  const sortedNodes = topologicalSort(workflow.nodes, workflow.edges)
  
  console.log(`\n   Execution order: ${sortedNodes.map(n => n.data.label).join(' → ')}\n`)

  for (const node of sortedNodes) {
    console.log(`   ▶ Executing: ${node.data.label} (${node.data.type})`)
    
    // Gather inputs
    const inputs = {}
    const incomingEdges = workflow.edges.filter(e => e.target === node.id)
    for (const edge of incomingEdges) {
      const sourceOutputs = nodeOutputs.get(edge.source) || {}
      // Use sourceHandle if specified, otherwise first output key
      const sourceKey = edge.sourceHandle || Object.keys(sourceOutputs)[0]
      // Use targetHandle if specified, otherwise default inputs
      const targetKey = edge.targetHandle || 'input'
      if (sourceOutputs[sourceKey] !== undefined) {
        inputs[targetKey] = sourceOutputs[sourceKey]
        // Also map common aliases
        inputs.input = inputs.input || sourceOutputs[sourceKey]
        inputs.prompt = inputs.prompt || sourceOutputs[sourceKey]
        inputs.text = inputs.text || sourceOutputs[sourceKey]
      }
    }

    // Execute based on type
    const config = node.data.config || {}
    let outputs = {}

    switch (node.data.type) {
      case 'trigger':
        outputs = { trigger: true }
        break
      
      case 'text-input':
        outputs = { text: config.text || '' }
        console.log(`     Output: "${outputs.text.substring(0, 50)}..."`)
        break
      
      case 'ai-chat':
        let chatPrompt = inputs.prompt || inputs.text || inputs.input || config.prompt || ''
        // If prompt is an object, stringify it
        if (typeof chatPrompt === 'object') {
          chatPrompt = JSON.stringify(chatPrompt)
        }
        console.log(`     Prompt: "${String(chatPrompt).substring(0, 50)}..."`)
        if (chatPrompt && model) {
          const response = await chatInternal(chatPrompt, config.systemPrompt)
          outputs = { response }
          console.log(`     Response: "${response.substring(0, 80)}..."`)
        } else if (!model) {
          console.log(`     ⚠️ Model not loaded`)
        }
        break
      
      case 'ai-transform':
        let transformInput = inputs.input || ''
        // If input is an object, stringify it
        if (typeof transformInput === 'object') {
          transformInput = JSON.stringify(transformInput)
        }
        if (transformInput && model) {
          const instruction = config.instruction || 'Summarize:'
          const fullPrompt = `${instruction}\n\n${transformInput}`
          const result = await chatInternal(fullPrompt)
          outputs = { output: result }
          console.log(`     Transformed: "${result.substring(0, 80)}..."`)
        }
        break
      
      case 'debug':
        const debugValue = inputs.input || ''
        const debugOutput = typeof debugValue === 'object' 
          ? JSON.stringify(debugValue, null, 2) 
          : String(debugValue)
        console.log(`     [DEBUG] ${config.label || 'Output'}: ${debugOutput}`)
        break
      
      case 'http-request':
        const url = inputs.url || config.url
        if (url) {
          console.log(`     HTTP ${config.method || 'GET'} ${url}`)
          try {
            const fetchOptions = {
              method: config.method || 'GET',
              headers: {},
            }
            
            // Parse headers
            try {
              fetchOptions.headers = JSON.parse(config.headers || '{}')
            } catch {}
            
            // Add body for POST/PUT/PATCH
            if (['POST', 'PUT', 'PATCH'].includes(config.method) && inputs.body) {
              fetchOptions.headers['Content-Type'] = config.contentType || 'application/json'
              fetchOptions.body = typeof inputs.body === 'string' 
                ? inputs.body 
                : JSON.stringify(inputs.body)
            }
            
            const response = await fetch(url, fetchOptions)
            const contentType = response.headers.get('content-type') || ''
            let responseData
            if (contentType.includes('application/json')) {
              responseData = await response.json()
            } else {
              responseData = await response.text()
            }
            
            outputs = { 
              response: responseData, 
              status: response.status, 
              headers: Object.fromEntries(response.headers.entries()) 
            }
            console.log(`     Status: ${response.status}`)
            const preview = typeof responseData === 'object' 
              ? JSON.stringify(responseData).substring(0, 80) 
              : String(responseData).substring(0, 80)
            console.log(`     Response: ${preview}...`)
          } catch (err) {
            console.log(`     Error: ${err.message}`)
            outputs = { response: { error: err.message }, status: 0, headers: {} }
          }
        }
        break
      
      case 'file-read':
        const readPath = inputs.path || config.path
        if (readPath) {
          console.log(`     Reading: ${readPath}`)
          try {
            if (fs.existsSync(readPath)) {
              const content = fs.readFileSync(readPath, config.encoding || 'utf-8')
              outputs = { content, exists: true }
              console.log(`     Read ${content.length} characters`)
            } else {
              outputs = { content: '', exists: false }
              console.log(`     File not found`)
            }
          } catch (err) {
            console.log(`     Error: ${err.message}`)
            outputs = { content: '', exists: false }
          }
        }
        break
      
      case 'file-write':
        const writePath = inputs.path || config.path
        const writeContent = inputs.content || ''
        if (writePath) {
          console.log(`     Writing: ${writePath}`)
          try {
            const dir = path.dirname(writePath)
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true })
            }
            const contentStr = typeof writeContent === 'object' 
              ? JSON.stringify(writeContent, null, 2) 
              : String(writeContent)
            if (config.mode === 'append') {
              fs.appendFileSync(writePath, contentStr)
            } else {
              fs.writeFileSync(writePath, contentStr)
            }
            outputs = { success: true, path: writePath }
            console.log(`     Wrote ${contentStr.length} characters`)
          } catch (err) {
            console.log(`     Error: ${err.message}`)
            outputs = { success: false, path: writePath }
          }
        }
        break
      
      case 'json-parse':
        const jsonInput = inputs.input || ''
        try {
          let jsonData = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput
          if (config.path) {
            const parts = config.path.split('.')
            for (const part of parts) {
              if (jsonData && typeof jsonData === 'object') {
                jsonData = jsonData[part]
              }
            }
          }
          outputs = { data: jsonData, valid: true }
          console.log(`     Parsed: ${typeof jsonData}`)
        } catch (err) {
          outputs = { data: null, valid: false }
          console.log(`     Parse error: ${err.message}`)
        }
        break
      
      case 'loop':
        let loopItems = inputs.items || []
        if (typeof loopItems === 'string') {
          try {
            loopItems = JSON.parse(loopItems)
          } catch {
            loopItems = loopItems.split('\n').filter(line => line.trim())
          }
        }
        if (!Array.isArray(loopItems)) {
          loopItems = [loopItems]
        }
        if (config.maxItems && config.maxItems > 0) {
          loopItems = loopItems.slice(0, config.maxItems)
        }
        outputs = { item: loopItems[0], index: 0, results: loopItems }
        console.log(`     Loop: ${loopItems.length} items`)
        break
      
      case 'ai-agent':
        const agentTask = inputs.task || inputs.input || ''
        if (agentTask && model) {
          console.log(`     Agent task: "${String(agentTask).substring(0, 50)}..."`)
          
          const maxSteps = config.maxSteps || 5
          const enabledTools = (config.tools || 'calculator,datetime').split(',').map(t => t.trim())
          const steps = []
          
          // Simple tools
          const tools = {
            calculator: (expr) => {
              try {
                return String(Function('"use strict"; return (' + expr.replace(/[^0-9+\-*/().sqrt,pow\s]/g, '') + ')')())
              } catch { return 'Error' }
            },
            datetime: () => new Date().toLocaleString()
          }
          
          const toolDescs = enabledTools.map(t => `- ${t}`).join('\n')
          const agentSystemPrompt = `${config.systemPrompt || 'You are a helpful AI agent.'}\n\nTools:\n${toolDescs}\n\nFormat:\nTHOUGHT: reasoning\nACTION: tool_name\nINPUT: input\n\nOr when done:\nTHOUGHT: reasoning\nFINAL: answer`
          
          let agentPrompt = `Task: ${agentTask}`
          let agentResult = ''
          
          for (let step = 0; step < maxSteps; step++) {
            const response = await chatInternal(agentPrompt, agentSystemPrompt)
            
            const finalMatch = response.match(/FINAL:\s*(.+)/s)
            if (finalMatch) {
              agentResult = finalMatch[1].trim()
              console.log(`     Final: ${agentResult.substring(0, 80)}...`)
              break
            }
            
            const actionMatch = response.match(/ACTION:\s*(\w+)/i)
            const inputMatch = response.match(/INPUT:\s*(.+?)(?=THOUGHT:|ACTION:|FINAL:|$)/s)
            
            if (actionMatch && inputMatch && tools[actionMatch[1].toLowerCase()]) {
              const toolName = actionMatch[1].toLowerCase()
              const toolInput = inputMatch[1].trim()
              const observation = tools[toolName](toolInput)
              console.log(`     Tool ${toolName}: ${observation}`)
              agentPrompt += `\nOBSERVATION: ${observation}\nContinue.`
              steps.push({ action: toolName, input: toolInput, observation })
            } else {
              agentResult = response
              break
            }
          }
          
          outputs = { result: agentResult || 'No result', steps }
        }
        break
    }

    nodeOutputs.set(node.id, outputs)
  }

  console.log(`\n✅ Workflow complete!\n`)
  return nodeOutputs
}

// Internal chat without console output
async function chatInternal(message, systemPrompt = null) {
  if (!model) return ''
  
  try {
    const { LlamaChatSession } = await import('node-llama-cpp')
    const session = new LlamaChatSession({ 
      contextSequence: context.getSequence(),
      systemPrompt: systemPrompt || 'You are a helpful assistant.',
    })
    
    const response = await session.prompt(message, {
      maxTokens: 256,
      temperature: 0.7,
    })
    
    return response
  } catch (error) {
    return `Error: ${error.message}`
  }
}

// Topological sort for execution order
function topologicalSort(nodes, edges) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const inDegree = new Map()
  const adjacency = new Map()

  nodes.forEach(n => {
    inDegree.set(n.id, 0)
    adjacency.set(n.id, [])
  })

  edges.forEach(e => {
    adjacency.get(e.source)?.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
  })

  const queue = []
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId)
  })

  const sorted = []
  while (queue.length > 0) {
    const nodeId = queue.shift()
    const node = nodeMap.get(nodeId)
    if (node) sorted.push(node)

    adjacency.get(nodeId)?.forEach(targetId => {
      const newDegree = (inDegree.get(targetId) || 0) - 1
      inDegree.set(targetId, newDegree)
      if (newDegree === 0) queue.push(targetId)
    })
  }

  return sorted
}

// ============ Test Commands ============

async function testAll() {
  console.log('\n🧪 Running Full Test Suite\n')
  console.log('='.repeat(50))
  
  await testModels()
  await testChat()
  await testWorkflows()
  
  console.log('='.repeat(50))
  console.log('\n✅ All tests complete!\n')
}

async function testModels() {
  console.log('\n📦 Testing Model Operations...\n')
  
  await listModels()
  
  // Check if any model is downloaded
  const downloaded = fs.readdirSync(MODELS_DIR)
  const availableModel = MODEL_CATALOG.find(m => downloaded.includes(m.filename))
  
  if (availableModel) {
    console.log(`\n🔄 Testing load/unload with ${availableModel.name}...`)
    await loadModel(availableModel.id)
    await modelStatus()
    await unloadModel()
  } else {
    console.log('\n⚠️  No models downloaded. Skipping load test.')
    console.log('   Download one with: models download llama-3.2-1b-q4')
  }
}

async function testChat() {
  console.log('\n💬 Testing Chat...\n')
  
  loadState()
  const downloaded = fs.readdirSync(MODELS_DIR)
  const availableModel = MODEL_CATALOG.find(m => downloaded.includes(m.filename))
  
  if (!availableModel) {
    console.log('⚠️  No models downloaded. Skipping chat test.')
    return
  }

  await loadModel(availableModel.id)
  
  // Simple test
  await chat('What is 2 + 2? Answer briefly.')
  
  // Test with system prompt
  await chat('Tell me a joke.', 'You are a comedian who tells short, funny jokes.')
  
  await unloadModel()
}

async function testWorkflows() {
  console.log('\n📋 Testing Workflows...\n')
  
  // Create test workflow
  const testNodes = [
    { id: 'node_1', type: 'custom', position: { x: 100, y: 100 }, data: { label: 'Text Input', type: 'text-input' } },
    { id: 'node_2', type: 'custom', position: { x: 300, y: 100 }, data: { label: 'AI Chat', type: 'ai-chat' } },
    { id: 'node_3', type: 'custom', position: { x: 500, y: 100 }, data: { label: 'Debug', type: 'debug' } },
  ]
  const testEdges = [
    { id: 'edge_1', source: 'node_1', target: 'node_2' },
    { id: 'edge_2', source: 'node_2', target: 'node_3' },
  ]
  
  const wf = await createWorkflow('Test Workflow', testNodes, testEdges)
  await listWorkflows()
  await deleteWorkflow(wf.id)
  
  console.log('✅ Workflow operations working')
}

// ============ CLI Router ============

async function main() {
  loadState()
  
  const args = process.argv.slice(2)
  const command = args[0]
  const subcommand = args[1]
  
  if (!command) {
    console.log(`
LocalFlow Test CLI

Usage: node scripts/test-cli/index.js <command> [args...]

Commands:
  models list              List all available models
  models download <id>     Download a model  
  models load <id>         Load a model into memory
  models unload            Unload current model
  models status            Show current model status

  chat <message>           Send a message to loaded model

  workflow list            List saved workflows
  workflow create <name>   Create a new workflow
  workflow run <id>        Run a workflow
  workflow delete <id>     Delete a workflow

  test all                 Run full test suite
  test models              Test model operations
  test chat                Test chat functionality
  test workflows           Test workflow operations

Available models: ${MODEL_CATALOG.map(m => m.id).join(', ')}
`)
    return
  }

  try {
    switch (command) {
      case 'models':
        switch (subcommand) {
          case 'list': await listModels(); break
          case 'download': await downloadModel(args[2]); break
          case 'load': await loadModel(args[2]); break
          case 'unload': await unloadModel(); break
          case 'status': await modelStatus(); break
          default: console.log('Usage: models <list|download|load|unload|status>')
        }
        break
        
      case 'chat':
        const message = args.slice(1).join(' ')
        if (!message) {
          console.log('Usage: chat <message>')
        } else {
          await chat(message)
        }
        break
        
      case 'workflow':
        switch (subcommand) {
          case 'list': await listWorkflows(); break
          case 'create': await createWorkflow(args[2] || 'New Workflow'); break
          case 'run': await runWorkflow(args[2]); break
          case 'delete': await deleteWorkflow(args[2]); break
          default: console.log('Usage: workflow <list|create|run|delete>')
        }
        break
        
      case 'test':
        switch (subcommand) {
          case 'all': await testAll(); break
          case 'models': await testModels(); break
          case 'chat': await testChat(); break
          case 'workflows': await testWorkflows(); break
          default: console.log('Usage: test <all|models|chat|workflows>')
        }
        break
        
      default:
        console.log(`Unknown command: ${command}`)
    }
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
