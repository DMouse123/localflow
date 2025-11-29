#!/usr/bin/env node
/**
 * Test LLM isolation - check if context bleeds between calls
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

async function testLLM(prompt, label) {
  console.log(`\n=== ${label} ===`)
  console.log(`Prompt: "${prompt.substring(0, 50)}..."`)
  
  const result = await sendCommand('llm:generate', {
    prompt,
    options: {
      maxTokens: 100,
      temperature: 0.3
    }
  })
  
  console.log(`Response: "${result.text?.substring(0, 150)}..."`)
  return result.text
}

async function main() {
  await connect()
  console.log('\n🧪 Testing LLM Isolation\n')

  // Test 1: Simple isolated calls
  console.log('\n--- TEST 1: Simple isolated calls ---')
  await testLLM('What is 2 + 2? Answer with just the number.', 'Call 1')
  await new Promise(r => setTimeout(r, 500))
  await testLLM('What is 3 + 3? Answer with just the number.', 'Call 2')
  await new Promise(r => setTimeout(r, 500))
  await testLLM('What is 4 + 4? Answer with just the number.', 'Call 3')

  // Test 2: Same prompt twice
  console.log('\n--- TEST 2: Same prompt twice (should get same/similar result) ---')
  await testLLM('Say only the word "APPLE"', 'Call A')
  await new Promise(r => setTimeout(r, 500))
  await testLLM('Say only the word "APPLE"', 'Call B')

  // Test 3: Context bleed test
  console.log('\n--- TEST 3: Context bleed test ---')
  await testLLM('Remember this secret code: BANANA123', 'Set context')
  await new Promise(r => setTimeout(r, 500))
  await testLLM('What is the secret code I told you?', 'Check bleed')

  // Test 4: Action format test
  console.log('\n--- TEST 4: Action format test ---')
  const actionPrompt = `You MUST respond with ONLY this format:
ACTION: calculator
INPUT: {"expression": "5 + 5"}

Nothing else. Just those two lines.`
  await testLLM(actionPrompt, 'Format test 1')
  await new Promise(r => setTimeout(r, 500))
  await testLLM(actionPrompt, 'Format test 2')

  // Test 5: Rapid fire
  console.log('\n--- TEST 5: Rapid fire (no delay) ---')
  await testLLM('Say "ONE"', 'Rapid 1')
  await testLLM('Say "TWO"', 'Rapid 2')
  await testLLM('Say "THREE"', 'Rapid 3')

  console.log('\n✅ Tests complete!')
  ws.close()
}

main().catch(console.error)
