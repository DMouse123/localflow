/**
 * Workflow Templates for Main Process
 * These templates can be executed headlessly without UI
 */

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  icon: string
  nodes: any[]
  edges: any[]
}

// Import the same templates used by frontend
// For now, we define key templates here for headless execution

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'simple-qa',
    name: 'Simple Q&A',
    description: 'Ask a question, get an answer',
    icon: '💬',
    nodes: [
      { id: 'node_1', type: 'custom', position: { x: 100, y: 150 }, data: { label: 'Question', type: 'text-input', config: { text: 'What is the capital of France?' } } },
      { id: 'node_2', type: 'custom', position: { x: 350, y: 150 }, data: { label: 'AI Answer', type: 'ai-chat', config: { systemPrompt: 'Answer questions briefly and accurately.', maxTokens: 100 } } },
      { id: 'node_3', type: 'custom', position: { x: 600, y: 150 }, data: { label: 'Output', type: 'debug', config: { label: 'Answer' } } }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2' },
      { id: 'e2-3', source: 'node_2', target: 'node_3' }
    ]
  },

  {
    id: 'ai-character-builder',
    name: 'AI Character Builder',
    description: 'Build a character using multiple AI tools',
    icon: '🎭',
    nodes: [
      { id: 'trigger_1', type: 'custom', position: { x: 50, y: 220 }, data: { label: 'Start', type: 'trigger', config: {} } },
      { id: 'task_1', type: 'custom', position: { x: 200, y: 220 }, data: { label: 'Task', type: 'text-input', config: { text: 'Create a fantasy character with a name, hair color, eye color, a personality trait, and a short backstory.' } } },
      { id: 'orchestrator_1', type: 'custom', position: { x: 480, y: 220 }, data: { label: 'Character Builder', type: 'ai-orchestrator', config: { maxSteps: 12 } } },
      { id: 'debug_1', type: 'custom', position: { x: 750, y: 220 }, data: { label: 'Character', type: 'debug', config: {} } },
      { id: 'tool_name', type: 'custom', position: { x: 300, y: 400 }, data: { label: 'Name Gen', type: 'tool-ai-name', config: {} } },
      { id: 'tool_color', type: 'custom', position: { x: 420, y: 400 }, data: { label: 'Color Pick', type: 'tool-ai-color', config: {} } },
      { id: 'tool_trait', type: 'custom', position: { x: 540, y: 400 }, data: { label: 'Trait Gen', type: 'tool-ai-trait', config: {} } },
      { id: 'tool_backstory', type: 'custom', position: { x: 660, y: 400 }, data: { label: 'Backstory', type: 'tool-ai-backstory', config: {} } }
    ],
    edges: [
      { id: 'e1', source: 'trigger_1', target: 'task_1' },
      { id: 'e2', source: 'task_1', target: 'orchestrator_1' },
      { id: 'e3', source: 'orchestrator_1', target: 'debug_1' },
      { id: 'e_name', source: 'tool_name', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' },
      { id: 'e_color', source: 'tool_color', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' },
      { id: 'e_trait', source: 'tool_trait', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' },
      { id: 'e_backstory', source: 'tool_backstory', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' }
    ]
  },

  {
    id: 'rpg-character-sheet',
    name: 'RPG Character Sheet Generator',
    description: 'Full RPG character with stats and creative details',
    icon: '⚔️',
    nodes: [
      { id: 'trigger_1', type: 'custom', position: { x: 50, y: 200 }, data: { label: 'Start', type: 'trigger', config: {} } },
      { id: 'task_1', type: 'custom', position: { x: 200, y: 200 }, data: { label: 'Task', type: 'text-input', config: { text: 'Create a complete RPG character sheet with: a fantasy name, a unique character ID, hair and eye colors, a personality trait, base stats (roll 3d6 for strength, dexterity, wisdom - calculate each as 3 random numbers 1-6 added together), and a backstory that references their stats.' } } },
      { id: 'orchestrator_1', type: 'custom', position: { x: 520, y: 200 }, data: { label: 'RPG Generator', type: 'ai-orchestrator', config: { maxSteps: 15 } } },
      { id: 'debug_1', type: 'custom', position: { x: 820, y: 200 }, data: { label: 'Character Sheet', type: 'debug', config: {} } },
      { id: 'tool_name', type: 'custom', position: { x: 280, y: 380 }, data: { label: 'Name Gen', type: 'tool-ai-name', config: {} } },
      { id: 'tool_color', type: 'custom', position: { x: 380, y: 380 }, data: { label: 'Color Pick', type: 'tool-ai-color', config: {} } },
      { id: 'tool_trait', type: 'custom', position: { x: 480, y: 380 }, data: { label: 'Trait Gen', type: 'tool-ai-trait', config: {} } },
      { id: 'tool_backstory', type: 'custom', position: { x: 580, y: 380 }, data: { label: 'Backstory', type: 'tool-ai-backstory', config: {} } },
      { id: 'tool_calc', type: 'custom', position: { x: 680, y: 380 }, data: { label: 'Calculator', type: 'tool-calculator', config: {} } },
      { id: 'tool_genid', type: 'custom', position: { x: 780, y: 380 }, data: { label: 'Generate ID', type: 'tool-generate-id', config: {} } }
    ],
    edges: [
      { id: 'e1', source: 'trigger_1', target: 'task_1' },
      { id: 'e2', source: 'task_1', target: 'orchestrator_1' },
      { id: 'e3', source: 'orchestrator_1', target: 'debug_1' },
      { id: 'e_name', source: 'tool_name', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' },
      { id: 'e_color', source: 'tool_color', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' },
      { id: 'e_trait', source: 'tool_trait', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' },
      { id: 'e_backstory', source: 'tool_backstory', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' },
      { id: 'e_calc', source: 'tool_calc', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' },
      { id: 'e_genid', source: 'tool_genid', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' }
    ]
  },

  {
    id: 'plugin-test',
    name: 'Plugin Test',
    description: 'Test workflow using plugin tools',
    icon: '🔌',
    nodes: [
      { id: 'trigger_1', type: 'custom', position: { x: 50, y: 200 }, data: { label: 'Start', type: 'trigger', config: {} } },
      { id: 'task_1', type: 'custom', position: { x: 200, y: 200 }, data: { label: 'Task', type: 'text-input', config: { text: 'Greet the user named "Developer" and then generate a random number between 1 and 10.' } } },
      { id: 'orchestrator_1', type: 'custom', position: { x: 480, y: 200 }, data: { label: 'Plugin Tester', type: 'ai-orchestrator', config: { maxSteps: 5 } } },
      { id: 'debug_1', type: 'custom', position: { x: 750, y: 200 }, data: { label: 'Result', type: 'debug', config: {} } },
      { id: 'tool_greet', type: 'custom', position: { x: 350, y: 350 }, data: { label: 'Greeter', type: 'tool-greet', config: {} } },
      { id: 'tool_random', type: 'custom', position: { x: 500, y: 350 }, data: { label: 'Random', type: 'tool-random_number', config: {} } }
    ],
    edges: [
      { id: 'e1', source: 'trigger_1', target: 'task_1' },
      { id: 'e2', source: 'task_1', target: 'orchestrator_1' },
      { id: 'e3', source: 'orchestrator_1', target: 'debug_1' },
      { id: 'e_greet', source: 'tool_greet', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' },
      { id: 'e_random', source: 'tool_random', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' }
    ]
  }
]

// Get template by ID
export function getTemplate(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find(t => t.id === id)
}

// List all templates (id, name, icon only)
export function listTemplates(): { id: string; name: string; icon: string }[] {
  return WORKFLOW_TEMPLATES.map(t => ({ id: t.id, name: t.name, icon: t.icon }))
}

// Get template schema for discovery (what inputs/tools/outputs it has)
export function getTemplateSchema(id: string): any | undefined {
  const template = getTemplate(id)
  if (!template) return undefined

  // Find the text-input node (main input)
  const inputNode = template.nodes.find(n => n.data.type === 'text-input')
  
  // Find the orchestrator node
  const orchestratorNode = template.nodes.find(n => n.data.type === 'ai-orchestrator')
  
  // Find connected tools by looking at edges going INTO orchestrator's tools handle
  const toolNodes = template.nodes.filter(n => n.data.type.startsWith('tool-'))
  const connectedTools = toolNodes.map(t => {
    // Extract tool name from type (e.g., 'tool-ai-name' -> 'ai_name_generator')
    const toolType = t.data.type
    const toolNameMap: Record<string, string> = {
      'tool-ai-name': 'ai_name_generator',
      'tool-ai-color': 'ai_color_picker',
      'tool-ai-trait': 'ai_trait_generator',
      'tool-ai-backstory': 'ai_backstory',
      'tool-calculator': 'calculator',
      'tool-datetime': 'datetime',
      'tool-generate-id': 'generate_id',
      'tool-http': 'http_get',
      'tool-file-read': 'file_read',
      'tool-file-write': 'file_write',
      'tool-file-list': 'file_list',
      'tool-math-advanced': 'math_advanced',
      'tool-string-ops': 'string_ops',
      'tool-json-query': 'json_query',
      'tool-shell': 'shell',
    }
    return toolNameMap[toolType] || toolType.replace('tool-', '')
  })

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    icon: template.icon,
    inputs: {
      task: {
        type: 'string',
        required: false,
        default: inputNode?.data.config?.text || '',
        description: 'The task or prompt for the workflow'
      }
    },
    tools: connectedTools,
    maxSteps: orchestratorNode?.data.config?.maxSteps || 10,
    outputs: {
      result: { type: 'string', description: 'Final result from the workflow' },
      steps: { type: 'array', description: 'Array of tool calls and their results' },
      logs: { type: 'array', description: 'Execution logs' }
    }
  }
}

// List all templates with full schema
export function listTemplatesWithSchema(): any[] {
  return WORKFLOW_TEMPLATES.map(t => getTemplateSchema(t.id))
}

export default { WORKFLOW_TEMPLATES, getTemplate, listTemplates, getTemplateSchema, listTemplatesWithSchema }
