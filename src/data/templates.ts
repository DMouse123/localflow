/**
 * Workflow Templates
 * Pre-built workflows for quick testing and learning
 */

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  icon: string
  nodes: any[]
  edges: any[]
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'simple-qa',
    name: 'Simple Q&A',
    description: 'Ask a question, get an answer',
    icon: '💬',
    nodes: [
      {
        id: 'node_1',
        type: 'custom',
        position: { x: 100, y: 150 },
        data: { label: 'Question', type: 'text-input', config: { text: 'What is the capital of France?' } }
      },
      {
        id: 'node_2',
        type: 'custom',
        position: { x: 350, y: 150 },
        data: { label: 'AI Answer', type: 'ai-chat', config: { systemPrompt: 'Answer questions briefly and accurately.', maxTokens: 100 } }
      },
      {
        id: 'node_3',
        type: 'custom',
        position: { x: 600, y: 150 },
        data: { label: 'Output', type: 'debug', config: { label: 'Answer' } }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2' },
      { id: 'e2-3', source: 'node_2', target: 'node_3' }
    ]
  },

  {
    id: 'text-summarizer',
    name: 'Text Summarizer',
    description: 'Summarize any text into key points',
    icon: '📝',
    nodes: [
      {
        id: 'node_1',
        type: 'custom',
        position: { x: 100, y: 150 },
        data: { 
          label: 'Input Text', 
          type: 'text-input', 
          config: { text: 'Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. AI research has been defined as the field of study of intelligent agents, which refers to any system that perceives its environment and takes actions that maximize its chance of achieving its goals.' } 
        }
      },
      {
        id: 'node_2',
        type: 'custom',
        position: { x: 400, y: 150 },
        data: { label: 'Summarize', type: 'ai-transform', config: { instruction: 'Summarize this text in 2-3 bullet points:', maxTokens: 150 } }
      },
      {
        id: 'node_3',
        type: 'custom',
        position: { x: 700, y: 150 },
        data: { label: 'Summary', type: 'debug', config: { label: 'Summary' } }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2' },
      { id: 'e2-3', source: 'node_2', target: 'node_3' }
    ]
  },

  {
    id: 'story-writer',
    name: 'Creative Story',
    description: 'Generate a short creative story',
    icon: '✨',
    nodes: [
      {
        id: 'node_1',
        type: 'custom',
        position: { x: 100, y: 150 },
        data: { label: 'Topic', type: 'text-input', config: { text: 'a robot who learns to paint' } }
      },
      {
        id: 'node_2',
        type: 'custom',
        position: { x: 350, y: 150 },
        data: { 
          label: 'Story Writer', 
          type: 'ai-chat', 
          config: { 
            systemPrompt: 'You are a creative storyteller. Write a short, imaginative 3-sentence story about the topic given. Be poetic and engaging.', 
            maxTokens: 200,
            temperature: 0.9
          } 
        }
      },
      {
        id: 'node_3',
        type: 'custom',
        position: { x: 600, y: 150 },
        data: { label: 'Story', type: 'debug', config: { label: '📖 Story' } }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2' },
      { id: 'e2-3', source: 'node_2', target: 'node_3' }
    ]
  },

  {
    id: 'translator',
    name: 'Translator',
    description: 'Translate text to another language',
    icon: '🌍',
    nodes: [
      {
        id: 'node_1',
        type: 'custom',
        position: { x: 100, y: 150 },
        data: { label: 'English Text', type: 'text-input', config: { text: 'Hello! How are you today? I hope you are having a wonderful day.' } }
      },
      {
        id: 'node_2',
        type: 'custom',
        position: { x: 400, y: 150 },
        data: { label: 'Translate', type: 'ai-transform', config: { instruction: 'Translate the following text to Spanish:', maxTokens: 100 } }
      },
      {
        id: 'node_3',
        type: 'custom',
        position: { x: 700, y: 150 },
        data: { label: 'Spanish', type: 'debug', config: { label: '🇪🇸 Spanish' } }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2' },
      { id: 'e2-3', source: 'node_2', target: 'node_3' }
    ]
  },

  {
    id: 'code-explainer',
    name: 'Code Explainer',
    description: 'Explain what code does in plain English',
    icon: '💻',
    nodes: [
      {
        id: 'node_1',
        type: 'custom',
        position: { x: 100, y: 150 },
        data: { label: 'Code', type: 'text-input', config: { text: 'const factorial = n => n <= 1 ? 1 : n * factorial(n - 1);' } }
      },
      {
        id: 'node_2',
        type: 'custom',
        position: { x: 400, y: 150 },
        data: { 
          label: 'Explain', 
          type: 'ai-chat', 
          config: { 
            systemPrompt: 'You are a helpful programming tutor. Explain code in simple terms that a beginner could understand.', 
            maxTokens: 200 
          } 
        }
      },
      {
        id: 'node_3',
        type: 'custom',
        position: { x: 700, y: 150 },
        data: { label: 'Explanation', type: 'debug', config: { label: 'Explanation' } }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2' },
      { id: 'e2-3', source: 'node_2', target: 'node_3' }
    ]
  },

  {
    id: 'full-demo',
    name: 'Full Capabilities Demo',
    description: 'HTTP + AI + File operations all in one',
    icon: '🚀',
    nodes: [
      {
        id: 'node_1',
        type: 'custom',
        position: { x: 50, y: 80 },
        data: { label: '🌐 Fetch Joke', type: 'http-request', config: { method: 'GET', url: 'https://official-joke-api.appspot.com/random_joke' } }
      },
      {
        id: 'node_2',
        type: 'custom',
        position: { x: 300, y: 80 },
        data: { label: '📋 Show Joke', type: 'debug', config: { label: '🌐 API Response' } }
      },
      {
        id: 'node_3',
        type: 'custom',
        position: { x: 50, y: 220 },
        data: { label: '📝 Question', type: 'text-input', config: { text: 'What is the capital of Japan?' } }
      },
      {
        id: 'node_4',
        type: 'custom',
        position: { x: 300, y: 220 },
        data: { label: '🤖 AI Answer', type: 'ai-chat', config: { systemPrompt: 'Answer in one word only.', maxTokens: 20 } }
      },
      {
        id: 'node_5',
        type: 'custom',
        position: { x: 550, y: 220 },
        data: { label: '💾 Save', type: 'file-write', config: { path: '/tmp/localflow_answer.txt', mode: 'overwrite' } }
      },
      {
        id: 'node_6',
        type: 'custom',
        position: { x: 550, y: 360 },
        data: { label: '📂 Read Back', type: 'file-read', config: { path: '/tmp/localflow_answer.txt' } }
      },
      {
        id: 'node_7',
        type: 'custom',
        position: { x: 300, y: 360 },
        data: { label: '✅ Final', type: 'debug', config: { label: '📄 From File' } }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2' },
      { id: 'e3-4', source: 'node_3', target: 'node_4' },
      { id: 'e4-5', source: 'node_4', target: 'node_5' },
      { id: 'e5-6', source: 'node_5', target: 'node_6' },
      { id: 'e6-7', source: 'node_6', target: 'node_7' }
    ]
  },

  {
    id: 'ai-orchestrator-full',
    name: 'AI Orchestrator (All Tools)',
    description: 'Autonomous AI agent with all tools connected',
    icon: '🧠',
    nodes: [
      // Trigger
      {
        id: 'trigger_1',
        type: 'custom',
        position: { x: 50, y: 200 },
        data: { label: 'Start', type: 'trigger', config: {} }
      },
      // Task input
      {
        id: 'task_1',
        type: 'custom',
        position: { x: 200, y: 200 },
        data: { 
          label: 'Task', 
          type: 'text-input', 
          config: { text: 'Calculate the square root of 144, then tell me today\'s date.' } 
        }
      },
      // AI Orchestrator
      {
        id: 'orchestrator_1',
        type: 'custom',
        position: { x: 400, y: 200 },
        data: { 
          label: 'AI Agent', 
          type: 'ai-orchestrator', 
          config: { 
            maxSteps: 10,
            systemPrompt: 'You are a helpful assistant. Use your tools to complete tasks step by step. Think carefully about which tool to use.'
          } 
        }
      },
      // Debug output
      {
        id: 'debug_1',
        type: 'custom',
        position: { x: 650, y: 200 },
        data: { label: 'Result', type: 'debug', config: {} }
      },
      // === TOOLS (connected to orchestrator) ===
      // Row 1
      {
        id: 'tool_calc',
        type: 'custom',
        position: { x: 200, y: 380 },
        data: { label: 'Calculator', type: 'tool-calculator', config: {} }
      },
      {
        id: 'tool_math',
        type: 'custom',
        position: { x: 330, y: 380 },
        data: { label: 'Math Advanced', type: 'tool-math-advanced', config: {} }
      },
      {
        id: 'tool_datetime',
        type: 'custom',
        position: { x: 460, y: 380 },
        data: { label: 'Date/Time', type: 'tool-datetime', config: {} }
      },
      {
        id: 'tool_string',
        type: 'custom',
        position: { x: 590, y: 380 },
        data: { label: 'String Ops', type: 'tool-string-ops', config: {} }
      },
      // Row 2
      {
        id: 'tool_http',
        type: 'custom',
        position: { x: 200, y: 480 },
        data: { label: 'HTTP', type: 'tool-http', config: {} }
      },
      {
        id: 'tool_json',
        type: 'custom',
        position: { x: 330, y: 480 },
        data: { label: 'JSON Query', type: 'tool-json-query', config: {} }
      },
      {
        id: 'tool_shell',
        type: 'custom',
        position: { x: 460, y: 480 },
        data: { label: 'Shell', type: 'tool-shell', config: {} }
      },
      {
        id: 'tool_genid',
        type: 'custom',
        position: { x: 590, y: 480 },
        data: { label: 'Generate ID', type: 'tool-generate-id', config: {} }
      }
    ],
    edges: [
      // Data flow
      { id: 'e_trig_task', source: 'trigger_1', target: 'task_1' },
      { id: 'e_task_orch', source: 'task_1', target: 'orchestrator_1' },
      { id: 'e_orch_debug', source: 'orchestrator_1', target: 'debug_1' },
      // Tool connections (all connect to orchestrator's tools port)
      { id: 'e_tool_calc', source: 'tool_calc', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' },
      { id: 'e_tool_math', source: 'tool_math', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' },
      { id: 'e_tool_datetime', source: 'tool_datetime', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' },
      { id: 'e_tool_string', source: 'tool_string', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' },
      { id: 'e_tool_http', source: 'tool_http', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' },
      { id: 'e_tool_json', source: 'tool_json', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' },
      { id: 'e_tool_shell', source: 'tool_shell', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' },
      { id: 'e_tool_genid', source: 'tool_genid', target: 'orchestrator_1', sourceHandle: 'toolOut', targetHandle: 'tools' }
    ]
  },
]
