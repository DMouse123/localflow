/**
 * Test headless workflow execution via WebSocket
 */

const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9999');

ws.on('open', () => {
  console.log('✅ Connected to LocalFlow');
  
  // Run the character builder template
  console.log('🚀 Running ai-character-builder...\n');
  ws.send(JSON.stringify({
    type: 'workflow:runTemplate',
    payload: { templateId: 'ai-character-builder' }
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  if (msg.type === 'welcome') {
    console.log('📡 ' + msg.message);
  } else if (msg.type === 'workflow:log') {
    console.log('📋 ' + msg.message);
  } else if (msg.type === 'workflow:progress') {
    console.log(`🔄 ${msg.nodeId}: ${msg.status}`);
  } else if (msg.type === 'workflow:complete') {
    console.log('\n✅ WORKFLOW COMPLETE!');
    console.log('📦 Result:', JSON.stringify(msg.result, null, 2));
    ws.close();
  } else if (msg.type === 'workflow:error') {
    console.log('❌ Error:', msg.error);
    ws.close();
  } else if (msg.result) {
    // Final response with full result
    if (msg.result.outputs) {
      console.log('\n🎯 FINAL OUTPUT:');
      Object.entries(msg.result.outputs).forEach(([nodeId, output]) => {
        if (output.debug) {
          console.log('\n' + '='.repeat(50));
          console.log(output.debug);
          console.log('='.repeat(50));
        }
      });
    }
  }
});

ws.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
});

ws.on('close', () => {
  console.log('\n👋 Disconnected');
  process.exit(0);
});
