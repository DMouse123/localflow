import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electron', {
  // App info
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Workflow operations
  workflow: {
    save: (workflow: unknown) => ipcRenderer.invoke('workflow:save', workflow),
    load: (id: string) => ipcRenderer.invoke('workflow:load', id),
    list: () => ipcRenderer.invoke('workflow:list'),
    delete: (id: string) => ipcRenderer.invoke('workflow:delete', id),
    execute: (workflow: unknown) => ipcRenderer.invoke('workflow:execute', workflow),
  },
  
  // LLM operations
  llm: {
    listModels: () => ipcRenderer.invoke('llm:list-models'),
    getState: () => ipcRenderer.invoke('llm:get-state'),
    downloadModel: (id: string) => ipcRenderer.invoke('llm:download-model', id),
    loadModel: (id: string) => ipcRenderer.invoke('llm:load-model', id),
    unloadModel: () => ipcRenderer.invoke('llm:unload-model'),
    generate: (prompt: string, options?: unknown) => ipcRenderer.invoke('llm:generate', prompt, options),
  },
  
  // Event listeners
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  },
  send: (channel: string, ...args: unknown[]) => {
    ipcRenderer.send(channel, ...args)
  },
})

// Type definitions for renderer
export interface ElectronAPI {
  getVersion: () => Promise<string>
  workflow: {
    save: (workflow: unknown) => Promise<{ success: boolean; path?: string; error?: string }>
    load: (id: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
    list: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>
    delete: (id: string) => Promise<{ success: boolean; error?: string }>
    execute: (workflow: unknown) => Promise<{ success: boolean; outputs?: unknown; logs?: string[]; error?: string }>
  }
  llm: {
    listModels: () => Promise<unknown[]>
    getState: () => Promise<unknown>
    downloadModel: (id: string) => Promise<{ success: boolean; error?: string }>
    loadModel: (id: string) => Promise<{ success: boolean; error?: string }>
    unloadModel: () => Promise<{ success: boolean }>
    generate: (prompt: string, options?: unknown) => Promise<{ success: boolean; response?: string; error?: string }>
  }
  on: (channel: string, callback: (...args: unknown[]) => void) => void
  off: (channel: string, callback: (...args: unknown[]) => void) => void
  send: (channel: string, ...args: unknown[]) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
