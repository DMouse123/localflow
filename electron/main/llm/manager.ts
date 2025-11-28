// LLM Manager - handles model downloads, loading, and inference

import path from 'path'
import fs from 'fs'
import os from 'os'
import { BrowserWindow } from 'electron'
import { MODEL_CATALOG, ModelInfo } from './catalog'

// Paths
const LOCALFLOW_DIR = path.join(os.homedir(), '.localflow')
const MODELS_DIR = path.join(LOCALFLOW_DIR, 'models')
const STATE_FILE = path.join(LOCALFLOW_DIR, 'model-state.json')

// Ensure models directory exists
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true })
}

// Persistent state helpers
function loadPersistedState(): { lastLoadedModel?: string } {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
    }
  } catch {}
  return {}
}

function savePersistedState(data: { lastLoadedModel?: string }) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('[LLM] Failed to save state:', e)
  }
}

// Track model state
interface ModelState {
  downloaded: string[]  // Model IDs that are downloaded
  loading: string | null  // Model ID currently loading
  loaded: string | null   // Model ID currently loaded
  downloading: string | null  // Model ID currently downloading
}

const state: ModelState = {
  downloaded: [],
  loading: null,
  loaded: null,
  downloading: null,
}

// node-llama-cpp instances (lazy loaded)
let llama: any = null
let model: any = null
let context: any = null

// Initialize - scan for downloaded models
export function initModelManager() {
  const files = fs.readdirSync(MODELS_DIR)
  state.downloaded = MODEL_CATALOG
    .filter(m => files.includes(m.filename))
    .map(m => m.id)
  console.log('[LLM] Found downloaded models:', state.downloaded)
  
  // Check for last loaded model
  const persisted = loadPersistedState()
  if (persisted.lastLoadedModel) {
    console.log('[LLM] Last loaded model:', persisted.lastLoadedModel)
  }
}

// Get last loaded model ID (for auto-restore)
export function getLastLoadedModel(): string | null {
  const persisted = loadPersistedState()
  // Only return if model is still downloaded
  if (persisted.lastLoadedModel && state.downloaded.includes(persisted.lastLoadedModel)) {
    return persisted.lastLoadedModel
  }
  return null
}

// Get catalog with download status
export function getModelCatalog() {
  return MODEL_CATALOG.map(m => ({
    ...m,
    isDownloaded: state.downloaded.includes(m.id),
    isLoaded: state.loaded === m.id,
    isLoading: state.loading === m.id,
    isDownloading: state.downloading === m.id,
  }))
}

// Get current state
export function getModelState() {
  return {
    ...state,
    loadedModel: state.loaded ? MODEL_CATALOG.find(m => m.id === state.loaded) : null,
  }
}

// Download a model
export async function downloadModel(modelId: string, window: BrowserWindow): Promise<boolean> {
  const modelInfo = MODEL_CATALOG.find(m => m.id === modelId)
  if (!modelInfo) {
    console.error('[LLM] Model not found:', modelId)
    return false
  }

  if (state.downloading) {
    console.error('[LLM] Already downloading a model')
    return false
  }

  state.downloading = modelId
  const destPath = path.join(MODELS_DIR, modelInfo.filename)
  
  try {
    console.log('[LLM] Starting download:', modelInfo.name)
    window.webContents.send('llm:download-progress', { modelId, progress: 0, status: 'starting' })

    // Use fetch for download with progress
    const response = await fetch(modelInfo.downloadUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const contentLength = parseInt(response.headers.get('content-length') || '0')
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const chunks: Uint8Array[] = []
    let receivedLength = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      chunks.push(value)
      receivedLength += value.length
      
      const progress = contentLength > 0 ? Math.round((receivedLength / contentLength) * 100) : 0
      window.webContents.send('llm:download-progress', { 
        modelId, 
        progress, 
        receivedMB: (receivedLength / 1024 / 1024).toFixed(1),
        totalMB: (contentLength / 1024 / 1024).toFixed(1),
        status: 'downloading' 
      })
    }

    // Write to file
    const buffer = Buffer.concat(chunks.map(c => Buffer.from(c)))
    fs.writeFileSync(destPath, buffer)
    
    state.downloaded.push(modelId)
    state.downloading = null
    
    window.webContents.send('llm:download-progress', { modelId, progress: 100, status: 'complete' })
    console.log('[LLM] Download complete:', modelInfo.name)
    return true
    
  } catch (error) {
    console.error('[LLM] Download failed:', error)
    state.downloading = null
    window.webContents.send('llm:download-progress', { 
      modelId, 
      progress: 0, 
      status: 'error', 
      error: String(error) 
    })
    return false
  }
}

// Load a model into memory
export async function loadModel(modelId: string, window: BrowserWindow): Promise<boolean> {
  const modelInfo = MODEL_CATALOG.find(m => m.id === modelId)
  if (!modelInfo) {
    console.error('[LLM] Model not found:', modelId)
    return false
  }

  if (!state.downloaded.includes(modelId)) {
    console.error('[LLM] Model not downloaded:', modelId)
    return false
  }

  // Unload current model if any
  if (state.loaded) {
    await unloadModel()
  }

  state.loading = modelId
  window.webContents.send('llm:model-status', { modelId, status: 'loading' })

  try {
    console.log('[LLM] Loading model:', modelInfo.name)
    
    // Dynamic import node-llama-cpp
    if (!llama) {
      const llamaModule = await import('node-llama-cpp')
      llama = await llamaModule.getLlama()
    }

    const modelPath = path.join(MODELS_DIR, modelInfo.filename)
    model = await llama.loadModel({ modelPath })
    context = await model.createContext()

    state.loading = null
    state.loaded = modelId
    
    // Save last loaded model for auto-restore
    savePersistedState({ lastLoadedModel: modelId })
    
    window.webContents.send('llm:model-status', { modelId, status: 'loaded' })
    console.log('[LLM] Model loaded:', modelInfo.name)
    return true

  } catch (error) {
    console.error('[LLM] Load failed:', error)
    state.loading = null
    window.webContents.send('llm:model-status', { modelId, status: 'error', error: String(error) })
    return false
  }
}

// Unload current model
export async function unloadModel(): Promise<void> {
  if (context) {
    await context.dispose()
    context = null
  }
  if (model) {
    await model.dispose()
    model = null
  }
  state.loaded = null
  console.log('[LLM] Model unloaded')
}

// Generate text completion
export async function generate(
  prompt: string, 
  window: BrowserWindow,
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
    
    let fullResponse = ''
    
    const response = await session.prompt(prompt, {
      maxTokens,
      temperature,
      onTextChunk: (chunk: string) => {
        fullResponse += chunk
        window.webContents.send('llm:generation-chunk', { chunk, full: fullResponse })
      },
    })

    window.webContents.send('llm:generation-done', { response: fullResponse })
    return fullResponse
    
  } catch (error) {
    console.error('[LLM] Generation failed:', error)
    throw error
  }
}

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
    
    const response = await session.prompt(prompt, { maxTokens, temperature })
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
