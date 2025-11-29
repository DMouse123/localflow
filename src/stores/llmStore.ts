import { create } from 'zustand'

export interface ModelInfo {
  id: string
  name: string
  description: string
  size: string
  ramRequired: string
  isDownloaded: boolean
  isLoaded: boolean
  isLoading: boolean
  isDownloading: boolean
  recommended: boolean
}

interface DownloadProgress {
  modelId: string
  progress: number
  receivedMB?: string
  totalMB?: string
  status: 'starting' | 'downloading' | 'complete' | 'error'
  error?: string
}

interface LLMState {
  models: ModelInfo[]
  loadedModelId: string | null
  downloadProgress: DownloadProgress | null
  isGenerating: boolean
  generatedText: string
  
  // Actions
  fetchModels: () => Promise<void>
  downloadModel: (modelId: string) => Promise<void>
  loadModel: (modelId: string) => Promise<void>
  unloadModel: () => Promise<void>
  generate: (prompt: string) => Promise<string>
  setDownloadProgress: (progress: DownloadProgress | null) => void
  setGeneratedText: (text: string) => void
}

export const useLLMStore = create<LLMState>((set, get) => ({
  models: [],
  loadedModelId: null,
  downloadProgress: null,
  isGenerating: false,
  generatedText: '',

  fetchModels: async () => {
    try {
      const models = await window.electron.llm.listModels()
      set({ models: models as ModelInfo[] })
      
      // Find loaded model
      const loaded = (models as ModelInfo[]).find(m => m.isLoaded)
      if (loaded) {
        set({ loadedModelId: loaded.id })
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
    }
  },

  downloadModel: async (modelId) => {
    set({ downloadProgress: { modelId, progress: 0, status: 'starting' } })
    await window.electron.llm.downloadModel(modelId)
    // Progress updates come via IPC events
  },

  loadModel: async (modelId) => {
    await window.electron.llm.loadModel(modelId)
    set({ loadedModelId: modelId })
    get().fetchModels() // Refresh state
  },

  unloadModel: async () => {
    await window.electron.llm.unloadModel()
    set({ loadedModelId: null })
    get().fetchModels()
  },

  generate: async (prompt) => {
    set({ isGenerating: true, generatedText: '' })
    try {
      const result = await window.electron.llm.generate(prompt)
      set({ isGenerating: false })
      return result.response || ''
    } catch (error) {
      set({ isGenerating: false })
      throw error
    }
  },

  setDownloadProgress: (progress) => set({ downloadProgress: progress }),
  setGeneratedText: (text) => set({ generatedText: text }),
}))

// Set up IPC event listeners and auto-load last model
if (typeof window !== 'undefined' && window.electron) {
  window.electron.on('llm:download-progress', (data: unknown) => {
    const progress = data as DownloadProgress
    useLLMStore.getState().setDownloadProgress(progress)
    if (progress.status === 'complete' || progress.status === 'error') {
      useLLMStore.getState().fetchModels()
      setTimeout(() => useLLMStore.getState().setDownloadProgress(null), 2000)
    }
  })

  window.electron.on('llm:model-status', (data: unknown) => {
    const { modelId, status } = data as { modelId: string; status: string }
    console.log('[LLM Store] Model status:', modelId, status)
    if (status === 'loaded') {
      useLLMStore.setState({ loadedModelId: modelId })
    } else if (status === 'unloaded') {
      useLLMStore.setState({ loadedModelId: null })
    }
    useLLMStore.getState().fetchModels()
  })

  window.electron.on('llm:generation-chunk', (data: unknown) => {
    const { full } = data as { chunk: string; full: string }
    useLLMStore.getState().setGeneratedText(full)
  })

  // Auto-load last used model on startup - triggered by main process
  window.electron.on('llm:auto-load', async (modelId: unknown) => {
    console.log('[LLM Store] Auto-load signal received:', modelId)
    if (modelId && typeof modelId === 'string') {
      console.log('[LLM Store] Auto-loading model:', modelId)
      useLLMStore.getState().loadModel(modelId)
    }
  })
}
