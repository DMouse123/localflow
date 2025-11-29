/**
 * Workflow Storage
 * Save/load/manage workflows to disk
 * Storage location: ~/.localflow/workflows/
 */

import fs from 'fs'
import path from 'path'
import { app } from 'electron'

// Storage directory
const WORKFLOWS_DIR = path.join(app.getPath('home'), '.localflow', 'workflows')

export interface SavedWorkflow {
  id: string
  name: string
  description?: string
  nodes: any[]
  edges: any[]
  createdAt: number
  updatedAt: number
}

/**
 * Ensure workflows directory exists
 */
export function ensureWorkflowsDir(): void {
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    fs.mkdirSync(WORKFLOWS_DIR, { recursive: true })
    console.log(`[Workflows] Created directory: ${WORKFLOWS_DIR}`)
  }
}

/**
 * Generate a slug from a name
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
}

/**
 * Save a workflow to disk
 */
export function saveWorkflow(
  name: string,
  nodes: any[],
  edges: any[],
  description?: string,
  existingId?: string
): SavedWorkflow {
  ensureWorkflowsDir()
  
  const now = Date.now()
  const id = existingId || generateId()
  
  const workflow: SavedWorkflow = {
    id,
    name,
    description,
    nodes,
    edges,
    createdAt: existingId ? getWorkflow(existingId)?.createdAt || now : now,
    updatedAt: now
  }
  
  const filename = `${id}.json`
  const filepath = path.join(WORKFLOWS_DIR, filename)
  
  fs.writeFileSync(filepath, JSON.stringify(workflow, null, 2))
  console.log(`[Workflows] Saved: ${name} (${id})`)
  
  return workflow
}

/**
 * Load a workflow by ID
 */
export function getWorkflow(id: string): SavedWorkflow | null {
  ensureWorkflowsDir()
  
  const filepath = path.join(WORKFLOWS_DIR, `${id}.json`)
  
  if (!fs.existsSync(filepath)) {
    return null
  }
  
  try {
    const content = fs.readFileSync(filepath, 'utf-8')
    return JSON.parse(content)
  } catch (err) {
    console.error(`[Workflows] Failed to load ${id}:`, err)
    return null
  }
}

/**
 * List all saved workflows
 */
export function listWorkflows(): SavedWorkflow[] {
  ensureWorkflowsDir()
  
  const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json'))
  const workflows: SavedWorkflow[] = []
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf-8')
      workflows.push(JSON.parse(content))
    } catch (err) {
      console.error(`[Workflows] Failed to read ${file}:`, err)
    }
  }
  
  // Sort by updatedAt descending
  return workflows.sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * Delete a workflow
 */
export function deleteWorkflow(id: string): boolean {
  ensureWorkflowsDir()
  
  const filepath = path.join(WORKFLOWS_DIR, `${id}.json`)
  
  if (!fs.existsSync(filepath)) {
    return false
  }
  
  try {
    fs.unlinkSync(filepath)
    console.log(`[Workflows] Deleted: ${id}`)
    return true
  } catch (err) {
    console.error(`[Workflows] Failed to delete ${id}:`, err)
    return false
  }
}

/**
 * Rename a workflow
 */
export function renameWorkflow(id: string, newName: string): SavedWorkflow | null {
  const workflow = getWorkflow(id)
  if (!workflow) {
    return null
  }
  
  workflow.name = newName
  workflow.updatedAt = Date.now()
  
  const filepath = path.join(WORKFLOWS_DIR, `${id}.json`)
  fs.writeFileSync(filepath, JSON.stringify(workflow, null, 2))
  
  console.log(`[Workflows] Renamed ${id} to: ${newName}`)
  return workflow
}

/**
 * Duplicate a workflow
 */
export function duplicateWorkflow(id: string, newName?: string): SavedWorkflow | null {
  const workflow = getWorkflow(id)
  if (!workflow) {
    return null
  }
  
  const name = newName || `${workflow.name} (copy)`
  return saveWorkflow(name, workflow.nodes, workflow.edges, workflow.description)
}

export default {
  ensureWorkflowsDir,
  saveWorkflow,
  getWorkflow,
  listWorkflows,
  deleteWorkflow,
  renameWorkflow,
  duplicateWorkflow
}
