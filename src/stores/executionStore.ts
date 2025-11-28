import { create } from 'zustand'

interface LogEntry {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error' | 'node'
}

interface ExecutionState {
  isRunning: boolean
  isPanelOpen: boolean
  logs: LogEntry[]
  runningNodeId: string | null
  
  // Actions
  startExecution: () => void
  stopExecution: () => void
  addLog: (message: string, type?: LogEntry['type']) => void
  clearLogs: () => void
  setRunningNode: (nodeId: string | null) => void
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
}

const getTimestamp = () => new Date().toISOString().substr(11, 8)

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  isRunning: false,
  isPanelOpen: false,
  logs: [],
  runningNodeId: null,

  startExecution: () => {
    set({ isRunning: true, isPanelOpen: true })
    get().addLog('Starting workflow execution...', 'info')
  },

  stopExecution: () => {
    set({ isRunning: false, runningNodeId: null })
  },

  addLog: (message, type = 'info') => {
    set(state => ({
      logs: [...state.logs, { timestamp: getTimestamp(), message, type }]
    }))
  },

  clearLogs: () => set({ logs: [] }),

  setRunningNode: (nodeId) => set({ runningNodeId: nodeId }),

  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  togglePanel: () => set(state => ({ isPanelOpen: !state.isPanelOpen })),
}))

// Set up IPC listeners for execution events
if (typeof window !== 'undefined' && window.electron) {
  window.electron.on('workflow:log', (data: unknown) => {
    const message = data as string
    useExecutionStore.getState().addLog(message, 'info')
  })

  window.electron.on('workflow:node-progress', (data: unknown) => {
    const { nodeId, status } = data as { nodeId: string; status: string; data?: any }
    const store = useExecutionStore.getState()
    
    if (status === 'running') {
      store.setRunningNode(nodeId)
      store.addLog(`Executing node: ${nodeId}`, 'node')
    } else if (status === 'complete') {
      store.addLog(`Node complete: ${nodeId}`, 'success')
    } else if (status === 'error') {
      store.addLog(`Node error: ${nodeId}`, 'error')
    }
  })

  window.electron.on('workflow:execution-start', () => {
    useExecutionStore.getState().startExecution()
  })

  window.electron.on('workflow:execution-complete', (data: unknown) => {
    const { success, error } = data as { success: boolean; error?: string }
    const store = useExecutionStore.getState()
    
    if (success) {
      store.addLog('Workflow completed successfully!', 'success')
    } else {
      store.addLog(`Workflow failed: ${error}`, 'error')
    }
    store.stopExecution()
  })
}
