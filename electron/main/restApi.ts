/**
 * REST API Server for LocalFlow
 * Simple HTTP endpoints for running workflows
 * 
 * Endpoints:
 *   GET  /health              - Health check
 *   GET  /templates           - List all templates
 *   GET  /templates/:id       - Get template details
 *   POST /run                 - Run a workflow { templateId: string }
 *   POST /chat                - Chat with Master AI { sessionId?, message }
 *   GET  /chat/sessions       - List chat sessions
 *   GET  /chat/:sessionId     - Get chat history
 *   DELETE /chat/:sessionId   - Delete chat session
 *   GET  /workflows           - List saved workflows
 *   GET  /workflows/:id       - Get a workflow
 *   POST /workflows           - Save a workflow
 *   PUT  /workflows/:id       - Update a workflow
 *   DELETE /workflows/:id     - Delete a workflow
 */

import http from 'http'
import { getTemplate, listTemplates, getTemplateSchema, listTemplatesWithSchema } from './templates'
import { executeWorkflow } from './executor/engine'
import { getAllTools } from './executor/tools'
import { BrowserWindow } from 'electron'
import { chat, listSessions, getHistory, deleteSession, createSession } from './chatSessions'
import { executeCommands, getSessionWorkflow } from './commandExecutor'
import { listWorkflows, getWorkflow, saveWorkflow, deleteWorkflow, renameWorkflow, duplicateWorkflow } from './workflowStorage'

const REST_PORT = 9998
let server: http.Server | null = null
let mainWindow: BrowserWindow | null = null

export function initRestApi(window: BrowserWindow) {
  mainWindow = window

  server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Content-Type', 'application/json')

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    const url = new URL(req.url || '/', `http://localhost:${REST_PORT}`)
    const path = url.pathname

    try {
      // GET /health
      if (req.method === 'GET' && path === '/health') {
        res.writeHead(200)
        res.end(JSON.stringify({ status: 'ok', service: 'localflow' }))
        return
      }

      // GET /tools - list all available tools
      if (req.method === 'GET' && path === '/tools') {
        const tools = getAllTools().map(t => ({
          name: t.name,
          description: t.description,
          inputs: t.inputSchema.properties
        }))
        res.writeHead(200)
        res.end(JSON.stringify({ tools }))
        return
      }

      // POST /tools/:name - execute a tool directly
      if (req.method === 'POST' && path.startsWith('/tools/')) {
        const toolName = path.replace('/tools/', '')
        const tools = getAllTools()
        const tool = tools.find(t => t.name === toolName)
        
        if (!tool) {
          res.writeHead(404)
          res.end(JSON.stringify({ error: `Tool not found: ${toolName}` }))
          return
        }
        
        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', async () => {
          try {
            const params = JSON.parse(body || '{}')
            const result = await tool.execute(params)
            res.writeHead(200)
            res.end(JSON.stringify({ success: true, result }))
          } catch (err) {
            res.writeHead(500)
            res.end(JSON.stringify({ error: String(err) }))
          }
        })
        return
      }

      // GET /templates
      if (req.method === 'GET' && path === '/templates') {
        res.writeHead(200)
        res.end(JSON.stringify({ templates: listTemplatesWithSchema() }))
        return
      }

      // GET /templates/:id
      if (req.method === 'GET' && path.startsWith('/templates/')) {
        const id = path.replace('/templates/', '')
        const schema = getTemplateSchema(id)
        if (schema) {
          res.writeHead(200)
          res.end(JSON.stringify(schema))
        } else {
          res.writeHead(404)
          res.end(JSON.stringify({ error: `Template not found: ${id}` }))
        }
        return
      }

      // POST /run
      if (req.method === 'POST' && path === '/run') {
        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', async () => {
          try {
            const { templateId, workflowId, params } = JSON.parse(body || '{}')
            
            let workflow: { id: string; name: string; nodes: any[]; edges: any[] } | null = null
            
            // Try templateId first, then workflowId
            if (templateId) {
              const template = getTemplate(templateId)
              if (!template) {
                res.writeHead(404)
                res.end(JSON.stringify({ error: `Template not found: ${templateId}` }))
                return
              }
              workflow = {
                id: templateId,
                name: template.name,
                nodes: JSON.parse(JSON.stringify(template.nodes)),
                edges: template.edges
              }
            } else if (workflowId) {
              const saved = getWorkflow(workflowId)
              if (!saved) {
                res.writeHead(404)
                res.end(JSON.stringify({ error: `Workflow not found: ${workflowId}` }))
                return
              }
              workflow = {
                id: workflowId,
                name: saved.name,
                nodes: JSON.parse(JSON.stringify(saved.nodes)),
                edges: saved.edges
              }
            } else {
              res.writeHead(400)
              res.end(JSON.stringify({ error: 'Missing templateId or workflowId' }))
              return
            }

            // Apply custom params (e.g., override task text)
            if (params?.task) {
              const inputNode = workflow.nodes.find((n: any) => n.data?.type === 'text-input')
              if (inputNode) {
                inputNode.data.config = inputNode.data.config || {}
                inputNode.data.config.text = params.task
              }
            }

            console.log(`[REST API] Running workflow: ${workflow.name}`)
            if (params?.task) {
              console.log(`[REST API] Custom task: ${params.task.substring(0, 50)}...`)
            }
            
            const result = await executeWorkflow(workflow, mainWindow)

            res.writeHead(200)
            res.end(JSON.stringify({ success: true, result }))
          } catch (err) {
            res.writeHead(500)
            res.end(JSON.stringify({ error: String(err) }))
          }
        })
        return
      }

      // POST /chat - Send message to Master AI
      if (req.method === 'POST' && path === '/chat') {
        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', async () => {
          try {
            const { sessionId, message, executeCommands: shouldExecute = true } = JSON.parse(body || '{}')
            
            if (!message) {
              res.writeHead(400)
              res.end(JSON.stringify({ error: 'Missing message' }))
              return
            }

            console.log(`[REST API] Chat: ${message.substring(0, 50)}...`)
            const result = await chat(sessionId || null, message)

            // Execute any commands the AI returned
            let commandResults: string[] = []
            if (shouldExecute && result.commands.length > 0) {
              console.log(`[REST API] Executing ${result.commands.length} commands...`)
              commandResults = await executeCommands(result.sessionId, result.commands, mainWindow)
            }

            // Get current workflow state
            const workflow = getSessionWorkflow(result.sessionId)

            res.writeHead(200)
            res.end(JSON.stringify({
              ...result,
              commandResults,
              workflow: {
                nodeCount: workflow.nodes.length,
                edgeCount: workflow.edges.length
              }
            }))
          } catch (err) {
            res.writeHead(500)
            res.end(JSON.stringify({ error: String(err) }))
          }
        })
        return
      }

      // GET /chat/sessions - List all chat sessions
      if (req.method === 'GET' && path === '/chat/sessions') {
        res.writeHead(200)
        res.end(JSON.stringify({ sessions: listSessions() }))
        return
      }

      // POST /chat/new - Create new session explicitly
      if (req.method === 'POST' && path === '/chat/new') {
        const session = createSession()
        res.writeHead(200)
        res.end(JSON.stringify({ sessionId: session.id }))
        return
      }

      // GET /chat/:sessionId - Get chat history
      if (req.method === 'GET' && path.startsWith('/chat/') && !path.includes('/workflow') && path !== '/chat/sessions') {
        const sessionId = path.replace('/chat/', '')
        const history = getHistory(sessionId)
        if (history) {
          res.writeHead(200)
          res.end(JSON.stringify({ sessionId, messages: history }))
        } else {
          res.writeHead(404)
          res.end(JSON.stringify({ error: 'Session not found' }))
        }
        return
      }

      // DELETE /chat/:sessionId - Delete session
      if (req.method === 'DELETE' && path.startsWith('/chat/')) {
        const sessionId = path.replace('/chat/', '')
        const deleted = deleteSession(sessionId)
        res.writeHead(200)
        res.end(JSON.stringify({ deleted }))
        return
      }

      // GET /chat/:sessionId/workflow - Get workflow built in this session
      if (req.method === 'GET' && path.match(/\/chat\/[^\/]+\/workflow$/)) {
        const sessionId = path.replace('/chat/', '').replace('/workflow', '')
        const workflow = getSessionWorkflow(sessionId)
        res.writeHead(200)
        res.end(JSON.stringify({ sessionId, workflow }))
        return
      }

      // ============ WORKFLOW STORAGE ENDPOINTS ============

      // GET /workflows - List all saved workflows
      if (req.method === 'GET' && path === '/workflows') {
        const workflows = listWorkflows()
        res.writeHead(200)
        res.end(JSON.stringify({ workflows }))
        return
      }

      // GET /workflows/:id - Get a specific workflow
      if (req.method === 'GET' && path.startsWith('/workflows/')) {
        const id = path.replace('/workflows/', '')
        const workflow = getWorkflow(id)
        if (workflow) {
          res.writeHead(200)
          res.end(JSON.stringify(workflow))
        } else {
          res.writeHead(404)
          res.end(JSON.stringify({ error: `Workflow not found: ${id}` }))
        }
        return
      }

      // POST /workflows - Save a new workflow
      if (req.method === 'POST' && path === '/workflows') {
        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', async () => {
          try {
            const { name, nodes, edges, description } = JSON.parse(body || '{}')
            
            if (!name) {
              res.writeHead(400)
              res.end(JSON.stringify({ error: 'Missing name' }))
              return
            }
            if (!nodes || !Array.isArray(nodes)) {
              res.writeHead(400)
              res.end(JSON.stringify({ error: 'Missing or invalid nodes array' }))
              return
            }

            const workflow = saveWorkflow(name, nodes, edges || [], description)
            res.writeHead(201)
            res.end(JSON.stringify(workflow))
          } catch (err) {
            res.writeHead(500)
            res.end(JSON.stringify({ error: String(err) }))
          }
        })
        return
      }

      // PUT /workflows/:id - Update an existing workflow
      if (req.method === 'PUT' && path.startsWith('/workflows/')) {
        const id = path.replace('/workflows/', '')
        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', async () => {
          try {
            const existing = getWorkflow(id)
            if (!existing) {
              res.writeHead(404)
              res.end(JSON.stringify({ error: `Workflow not found: ${id}` }))
              return
            }

            const { name, nodes, edges, description } = JSON.parse(body || '{}')
            
            const workflow = saveWorkflow(
              name || existing.name,
              nodes || existing.nodes,
              edges || existing.edges,
              description !== undefined ? description : existing.description,
              id
            )
            res.writeHead(200)
            res.end(JSON.stringify(workflow))
          } catch (err) {
            res.writeHead(500)
            res.end(JSON.stringify({ error: String(err) }))
          }
        })
        return
      }

      // DELETE /workflows/:id - Delete a workflow
      if (req.method === 'DELETE' && path.startsWith('/workflows/')) {
        const id = path.replace('/workflows/', '')
        const deleted = deleteWorkflow(id)
        if (deleted) {
          res.writeHead(200)
          res.end(JSON.stringify({ deleted: true, id }))
        } else {
          res.writeHead(404)
          res.end(JSON.stringify({ error: `Workflow not found: ${id}` }))
        }
        return
      }

      // 404 for everything else
      res.writeHead(404)
      res.end(JSON.stringify({ error: 'Not found' }))

    } catch (err) {
      res.writeHead(500)
      res.end(JSON.stringify({ error: String(err) }))
    }
  })

  server.listen(REST_PORT, () => {
    console.log(`[REST API] Server started on http://localhost:${REST_PORT}`)
  })

  server.on('error', (err) => {
    console.error('[REST API] Server error:', err)
  })
}

export function shutdownRestApi() {
  if (server) {
    server.close()
    server = null
  }
}

export default { initRestApi, shutdownRestApi }
