/**
 * REST API Server for LocalFlow
 * Simple HTTP endpoints for running workflows
 * 
 * Endpoints:
 *   GET  /health              - Health check
 *   GET  /templates           - List all templates
 *   GET  /templates/:id       - Get template details
 *   POST /run                 - Run a workflow { templateId: string }
 */

import http from 'http'
import { getTemplate, listTemplates, getTemplateSchema, listTemplatesWithSchema } from './templates'
import { executeWorkflow } from './executor/engine'
import { BrowserWindow } from 'electron'

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
            const { templateId, params } = JSON.parse(body || '{}')
            
            if (!templateId) {
              res.writeHead(400)
              res.end(JSON.stringify({ error: 'Missing templateId' }))
              return
            }

            const template = getTemplate(templateId)
            if (!template) {
              res.writeHead(404)
              res.end(JSON.stringify({ error: `Template not found: ${templateId}` }))
              return
            }

            // Clone template nodes to avoid mutating original
            const nodes = JSON.parse(JSON.stringify(template.nodes))

            // Apply custom params (e.g., override task text)
            if (params?.task) {
              const inputNode = nodes.find((n: any) => n.data.type === 'text-input')
              if (inputNode) {
                inputNode.data.config.text = params.task
              }
            }

            console.log(`[REST API] Running template: ${template.name}`)
            if (params?.task) {
              console.log(`[REST API] Custom task: ${params.task.substring(0, 50)}...`)
            }
            
            const result = await executeWorkflow(
              { id: templateId, name: template.name, nodes, edges: template.edges },
              mainWindow
            )

            res.writeHead(200)
            res.end(JSON.stringify({ success: true, result }))
          } catch (err) {
            res.writeHead(500)
            res.end(JSON.stringify({ error: String(err) }))
          }
        })
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
