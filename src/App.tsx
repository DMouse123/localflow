import { useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import WorkflowCanvas from './components/Canvas/WorkflowCanvas'
import Sidebar from './components/Sidebar/Sidebar'
import PropertiesPanel from './components/Panel/PropertiesPanel'
import OutputPanel from './components/Panel/OutputPanel'
import AIAssistant from './components/AIAssistant/AIAssistant'
import ClaudeActivity from './components/ClaudeActivity/ClaudeActivity'
import { useWorkflowStore } from './stores/workflowStore'
import { useExecutionStore } from './stores/executionStore'
import { useLLMStore } from './stores/llmStore'
import { Save, FileText, Play, Square, Terminal, Power, RotateCcw } from 'lucide-react'

function App() {
  const selectedNode = useWorkflowStore((state) => state.selectedNode)
  const workflowName = useWorkflowStore((state) => state.workflowName)
  const workflowId = useWorkflowStore((state) => state.workflowId)
  const nodes = useWorkflowStore((state) => state.nodes)
  const edges = useWorkflowStore((state) => state.edges)
  const isDirty = useWorkflowStore((state) => state.isDirty)
  const saveWorkflow = useWorkflowStore((state) => state.saveWorkflow)
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName)

  const { isRunning, isPanelOpen, logs, clearLogs, openPanel, closePanel, addLog, stopExecution } = useExecutionStore()
  const { loadedModelId, fetchModels, models } = useLLMStore()

  // Initialize - fetch models on app start
  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  const handleRun = async () => {
    if (isRunning) return
    
    // Re-check models before running
    const currentModels = await window.electron.llm.listModels() as any[]
    console.log('[Run] Models from main process:', currentModels.map(m => ({ id: m.id, isLoaded: m.isLoaded, isDownloaded: m.isDownloaded })))
    
    const loadedModel = currentModels.find((m: any) => m.isLoaded)
    console.log('[Run] Loaded model:', loadedModel)
    
    if (!loadedModel) {
      openPanel()
      addLog('❌ No model loaded. Go to Models tab and click the blue button to load a model.', 'error')
      return
    }

    if (nodes.length === 0) {
      openPanel()
      addLog('❌ No nodes in workflow. Add some nodes first.', 'error')
      return
    }

    openPanel()
    addLog('Sending workflow to executor...', 'info')

    try {
      const workflow = {
        id: workflowId,
        name: workflowName,
        nodes,
        edges,
      }
      
      const result = await window.electron.workflow.execute(workflow)
      
      if (!result.success) {
        addLog(`Execution failed: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`Error: ${error}`, 'error')
      stopExecution()
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50">
      {/* Top Header Bar */}
      <header className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0"
              style={{ paddingLeft: '80px' }}
      >
        <div className="flex items-center gap-2 flex-1">
          <FileText className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="text-sm font-medium text-slate-700 bg-transparent border-none 
                       focus:outline-none focus:ring-0 w-48"
            placeholder="Workflow name"
          />
          {isDirty && (
            <span className="text-xs text-amber-500 font-medium">• Unsaved</span>
          )}
        </div>

        {/* Run Button */}
        <button
          onClick={handleRun}
          disabled={isRunning}
          data-testid="run-button"
          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors
            ${isRunning 
              ? 'bg-amber-100 text-amber-700 cursor-not-allowed' 
              : 'bg-green-500 text-white hover:bg-green-600'}`}
          title="Run workflow"
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run
            </>
          )}
        </button>

        {/* Toggle Output Panel */}
        <button
          onClick={() => isPanelOpen ? closePanel() : openPanel()}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors
            ${isPanelOpen ? 'bg-slate-200 text-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
          title="Toggle output panel"
        >
          <Terminal className="w-4 h-4" />
        </button>

        {/* Save Button */}
        <button
          onClick={() => saveWorkflow()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 
                     hover:bg-slate-100 rounded-md transition-colors"
          title="Save workflow (⌘S)"
        >
          <Save className="w-4 h-4" />
          Save
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200" />

        {/* Restart Button */}
        <button
          onClick={() => window.electron.app.restart()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 
                     hover:bg-blue-50 rounded-md transition-colors"
          title="Restart app"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Quit Button */}
        <button
          onClick={() => window.electron.app.quit()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 
                     hover:bg-red-50 rounded-md transition-colors"
          title="Quit app"
        >
          <Power className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar - Node Palette */}
        <Sidebar />

        {/* Main Canvas Area */}
        <div className="flex-1 relative">
          <ReactFlowProvider>
            <WorkflowCanvas />
          </ReactFlowProvider>
          
          {/* Output Panel */}
          <OutputPanel
            isOpen={isPanelOpen}
            onClose={closePanel}
            logs={logs}
            isRunning={isRunning}
            onClear={clearLogs}
          />
        </div>

        {/* Right Panel - Properties */}
        {selectedNode && <PropertiesPanel />}
      </div>

      {/* AI Assistant - Floating */}
      <AIAssistant />
      
      {/* Claude Remote Control Activity */}
      <ClaudeActivity />
    </div>
  )
}

export default App
