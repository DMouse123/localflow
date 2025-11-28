
// Generate without window (for executor use)
export async function generateSync(
  prompt: string,
  options: { systemPrompt?: string; maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  if (!model || !context) {
    throw new Error('No model loaded')
  }

  const { systemPrompt, maxTokens = 512, temperature = 0.7 } = options
  
  try {
    const { LlamaChatSession } = await import('node-llama-cpp')
    const session = new LlamaChatSession({ 
      contextSequence: context.getSequence(),
      systemPrompt: systemPrompt || undefined,
    })
    
    const response = await session.prompt(prompt, {
      maxTokens,
      temperature,
    })

    return response
    
  } catch (error) {
    console.error('[LLM] Generation failed:', error)
    throw error
  }
}

// Check if model is loaded
export function isModelLoaded(): boolean {
  return model !== null && context !== null
}

// Export for IPC handlers
export default {
  initModelManager,
  getModelCatalog,
  getModelState,
  downloadModel,
  loadModel,
  unloadModel,
  generate,
  generateSync,
  isModelLoaded,
}

export { LLMManager }
