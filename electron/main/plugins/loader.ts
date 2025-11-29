/**
 * Plugin Loader
 * Discovers and loads plugins from ~/.localflow/plugins/
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { PluginManifest, LoadedPlugin, PluginToolExecutor } from './types'

const PLUGINS_DIR = path.join(os.homedir(), '.localflow', 'plugins')

// Store loaded plugins
const loadedPlugins: Map<string, LoadedPlugin> = new Map()

/**
 * Ensure plugins directory exists
 */
export function ensurePluginsDir(): void {
  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true })
    console.log(`[Plugins] Created plugins directory: ${PLUGINS_DIR}`)
  }
}

/**
 * Discover all plugins in the plugins directory
 */
export function discoverPlugins(): PluginManifest[] {
  ensurePluginsDir()
  
  const manifests: PluginManifest[] = []
  
  try {
    const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      
      const pluginPath = path.join(PLUGINS_DIR, entry.name)
      const manifestPath = path.join(pluginPath, 'manifest.json')
      
      if (!fs.existsSync(manifestPath)) {
        console.log(`[Plugins] Skipping ${entry.name}: no manifest.json`)
        continue
      }
      
      try {
        const manifestContent = fs.readFileSync(manifestPath, 'utf-8')
        const manifest: PluginManifest = JSON.parse(manifestContent)
        
        // Validate required fields
        if (!manifest.id || !manifest.name || !manifest.version) {
          console.warn(`[Plugins] Invalid manifest in ${entry.name}: missing id, name, or version`)
          continue
        }
        
        manifests.push(manifest)
        console.log(`[Plugins] Discovered: ${manifest.name} v${manifest.version}`)
        
      } catch (err) {
        console.error(`[Plugins] Error parsing manifest in ${entry.name}:`, err)
      }
    }
  } catch (err) {
    console.error('[Plugins] Error scanning plugins directory:', err)
  }
  
  console.log(`[Plugins] Found ${manifests.length} plugin(s)`)
  return manifests
}

/**
 * Load a plugin's tools
 */
export async function loadPlugin(manifest: PluginManifest): Promise<LoadedPlugin | null> {
  const pluginPath = path.join(PLUGINS_DIR, manifest.id)
  
  const plugin: LoadedPlugin = {
    manifest,
    path: pluginPath,
    tools: new Map()
  }
  
  // Load tools
  if (manifest.tools) {
    for (const toolDef of manifest.tools) {
      const toolPath = path.join(pluginPath, toolDef.file)
      
      if (!fs.existsSync(toolPath)) {
        console.warn(`[Plugins] Tool file not found: ${toolPath}`)
        continue
      }
      
      try {
        // Clear require cache for hot reload support
        delete require.cache[require.resolve(toolPath)]
        
        const toolModule = require(toolPath)
        
        if (typeof toolModule.execute !== 'function') {
          console.warn(`[Plugins] Tool ${toolDef.id} missing execute function`)
          continue
        }
        
        plugin.tools.set(toolDef.id, toolModule as PluginToolExecutor)
        console.log(`[Plugins] Loaded tool: ${toolDef.id}`)
        
      } catch (err) {
        console.error(`[Plugins] Error loading tool ${toolDef.id}:`, err)
      }
    }
  }
  
  loadedPlugins.set(manifest.id, plugin)
  return plugin
}

/**
 * Load all discovered plugins
 */
export async function loadAllPlugins(): Promise<LoadedPlugin[]> {
  const manifests = discoverPlugins()
  const plugins: LoadedPlugin[] = []
  
  for (const manifest of manifests) {
    const plugin = await loadPlugin(manifest)
    if (plugin) {
      plugins.push(plugin)
    }
  }
  
  console.log(`[Plugins] Loaded ${plugins.length} plugin(s)`)
  return plugins
}

/**
 * Get all loaded plugins
 */
export function getLoadedPlugins(): Map<string, LoadedPlugin> {
  return loadedPlugins
}

/**
 * Get a specific plugin
 */
export function getPlugin(id: string): LoadedPlugin | undefined {
  return loadedPlugins.get(id)
}

/**
 * Get all plugin tools as a flat list
 */
export function getAllPluginTools(): Array<{ pluginId: string, tool: any, executor: PluginToolExecutor }> {
  const tools: Array<{ pluginId: string, tool: any, executor: PluginToolExecutor }> = []
  
  for (const [pluginId, plugin] of loadedPlugins) {
    if (plugin.manifest.tools) {
      for (const toolDef of plugin.manifest.tools) {
        const executor = plugin.tools.get(toolDef.id)
        if (executor) {
          tools.push({ pluginId, tool: toolDef, executor })
        }
      }
    }
  }
  
  return tools
}

export default {
  ensurePluginsDir,
  discoverPlugins,
  loadPlugin,
  loadAllPlugins,
  getLoadedPlugins,
  getPlugin,
  getAllPluginTools
}
