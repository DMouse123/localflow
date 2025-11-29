/**
 * Claude Remote Control Server
 * 
 * WebSocket server that allows Claude to control the app in real-time.
 * Human can watch as Claude adds nodes, connects them, and runs workflows.
 */

import { WebSocketServer, WebSocket } from 'ws'
import { BrowserWindow, ipcMain } from 'electron'
import { getTemplate, listTemplates } from './templates'
import { executeWorkflow } from './executor/engine'

let wss: WebSocketServer | null = null
let mainWindow: BrowserWindow | null = null
let connectedClient: WebSocket | null = null

const CLAUDE_PORT = 9999

export interface ClaudeCommand {
  id: string
  type: string
  payload?: any
}

export interface ClaudeResponse {
  id: string
  success: boolean
  result?: any
  error?: string
}

export function initClaudeControl(window: BrowserWindow) {
  mainWindow = window

  try {
    wss = new WebSocketServer({ port: CLAUDE_PORT })
    console.log(`[Claude Control] Server started on ws://localhost:${CLAUDE_PORT}`)

    wss.on('connection', (ws: WebSocket) => {
      console.log('[Claude Control] 🤖 Claude connected!')
      connectedClient = ws
      
      // Notify renderer
      mainWindow?.webContents.send('claude:connected')

      ws.on('message', async (data: Buffer) => {
        try {
          const command: ClaudeCommand = JSON.parse(data.toString())
          console.log('[Claude Control] Command:', command.type, command.payload || '')
          
          // Handle some commands directly in main process (headless)
          let result: any = null
          let handled = false

          switch (command.type) {
            case 'workflow:listTemplates':
              result = { templates: listTemplates() }
              handled = true
              break

            case 'workflow:runTemplate':
              // Run a template directly without UI
              const templateId = command.payload?.templateId
              if (!templateId) {
                result = { error: 'Missing templateId' }
              } else {
                const template = getTemplate(templateId)
                if (!template) {
                  result = { error: `Template not found: ${templateId}` }
                } else {
                  console.log(`[Claude Control] Running template: ${template.name}`)
                  try {
                    const execResult = await executeWorkflow(
                      { id: templateId, name: template.name, nodes: template.nodes, edges: template.edges },
                      mainWindow
                    )
                    result = execResult
                  } catch (err) {
                    result = { error: String(err) }
                  }
                }
              }
              handled = true
              break
          }

          if (handled) {
            // Send result directly
            const response: ClaudeResponse = {
              id: command.id,
              success: !result?.error,
              result
            }
            ws.send(JSON.stringify(response))
            return
          }

          // Forward other commands to renderer for UI updates
          mainWindow?.webContents.send('claude:command', command)
          
          // Wait for renderer to process and respond
          const rendererResult = await waitForRendererResponse(command.id)
          
          // Send result back to Claude
          const response: ClaudeResponse = {
            id: command.id,
            success: true,
            result: rendererResult
          }
          ws.send(JSON.stringify(response))
          
        } catch (error) {
          console.error('[Claude Control] Error:', error)
          ws.send(JSON.stringify({ 
            id: 'error', 
            success: false, 
            error: String(error) 
          }))
        }
      })

      ws.on('close', () => {
        console.log('[Claude Control] 👋 Claude disconnected')
        connectedClient = null
        mainWindow?.webContents.send('claude:disconnected')
      })

      ws.on('error', (error) => {
        console.error('[Claude Control] WebSocket error:', error)
      })

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to LocalFlow! Ready to receive commands.'
      }))
    })

    wss.on('error', (error) => {
      console.error('[Claude Control] Server error:', error)
    })

  } catch (error) {
    console.error('[Claude Control] Failed to start server:', error)
  }
}

// Wait for renderer to respond to a command
function waitForRendererResponse(commandId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ipcMain.removeListener(`claude:response:${commandId}`, handler)
      reject(new Error('Timeout waiting for renderer response'))
    }, 30000)

    const handler = (_event: any, result: any) => {
      clearTimeout(timeout)
      ipcMain.removeListener(`claude:response:${commandId}`, handler)
      resolve(result)
    }

    ipcMain.once(`claude:response:${commandId}`, handler)
  })
}

// Broadcast activity to UI (for thinking messages, etc.)
export function broadcastActivity(type: string, message: string, data?: any) {
  mainWindow?.webContents.send('claude:activity', { 
    type, 
    message, 
    data,
    timestamp: Date.now() 
  })
}

// Broadcast to connected WebSocket client
export function broadcastToClient(data: any) {
  if (connectedClient && connectedClient.readyState === WebSocket.OPEN) {
    connectedClient.send(JSON.stringify(data))
  }
}

// Check if Claude is connected
export function isClaudeConnected(): boolean {
  return connectedClient !== null && connectedClient.readyState === WebSocket.OPEN
}

// Shutdown server
export function shutdown() {
  if (wss) {
    wss.close()
    wss = null
  }
  connectedClient = null
}

export default { 
  initClaudeControl, 
  broadcastActivity,
  broadcastToClient,
  isClaudeConnected, 
  shutdown 
}
