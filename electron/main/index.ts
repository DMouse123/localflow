import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import LLMManager from './llm/manager'
import { initClaudeControl, shutdown as shutdownClaudeControl } from './claudeControl'

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV !== 'production'

// LocalFlow data directory
const LOCALFLOW_DIR = path.join(os.homedir(), '.localflow')
const WORKFLOWS_DIR = path.join(LOCALFLOW_DIR, 'workflows')

// Ensure directories exist
function ensureDirectories() {
  if (!fs.existsSync(LOCALFLOW_DIR)) {
    fs.mkdirSync(LOCALFLOW_DIR, { recursive: true })
  }
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    fs.mkdirSync(WORKFLOWS_DIR, { recursive: true })
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// App lifecycle
app.whenReady().then(() => {
  ensureDirectories()
  LLMManager.initModelManager()
  createWindow()
  
  // Initialize Claude Remote Control after window is created
  if (mainWindow) {
    initClaudeControl(mainWindow)
  }
})

app.on('window-all-closed', () => {
  shutdownClaudeControl()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// ============ IPC Handlers ============

// Get app version
ipcMain.handle('get-app-version', () => app.getVersion())

// ============ Workflow Handlers ============

ipcMain.handle('workflow:save', async (_, workflow) => {
  try {
    const filename = `${workflow.id}.json`
    const filepath = path.join(WORKFLOWS_DIR, filename)
    const data = { ...workflow, updatedAt: new Date().toISOString() }
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
    return { success: true, path: filepath }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('workflow:load', async (_, id) => {
  try {
    const filepath = path.join(WORKFLOWS_DIR, `${id}.json`)
    if (!fs.existsSync(filepath)) return { success: false, error: 'Workflow not found' }
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('workflow:list', async () => {
  try {
    const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json'))
    const workflows = files.map(file => {
      const data = JSON.parse(fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf-8'))
      return { id: data.id, name: data.name, updatedAt: data.updatedAt }
    })
    return { success: true, data: workflows }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('workflow:delete', async (_, id) => {
  try {
    const filepath = path.join(WORKFLOWS_DIR, `${id}.json`)
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

// ============ LLM Handlers ============

ipcMain.handle('llm:list-models', () => {
  return LLMManager.getModelCatalog()
})

ipcMain.handle('llm:get-state', () => {
  return LLMManager.getModelState()
})

ipcMain.handle('llm:download-model', async (_, modelId) => {
  if (!mainWindow) return { success: false, error: 'No window' }
  const result = await LLMManager.downloadModel(modelId, mainWindow)
  return { success: result }
})

ipcMain.handle('llm:load-model', async (_, modelId) => {
  if (!mainWindow) return { success: false, error: 'No window' }
  const result = await LLMManager.loadModel(modelId, mainWindow)
  return { success: result }
})

ipcMain.handle('llm:unload-model', async () => {
  await LLMManager.unloadModel()
  return { success: true }
})

ipcMain.handle('llm:generate', async (_, prompt, options) => {
  if (!mainWindow) return { success: false, error: 'No window' }
  try {
    const response = await LLMManager.generate(prompt, mainWindow, options)
    return { success: true, response }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})


// ============ Workflow Execution Handlers ============

import { executeWorkflow } from './executor/engine'

ipcMain.handle('workflow:execute', async (_, workflowData) => {
  if (!mainWindow) return { success: false, error: 'No window' }
  
  // Check if model is loaded
  if (!LLMManager.isModelLoaded()) {
    return { success: false, error: 'No model loaded. Please load a model first.' }
  }

  try {
    const result = await executeWorkflow(workflowData, mainWindow)
    return result
  } catch (error) {
    return { success: false, error: String(error) }
  }
})
