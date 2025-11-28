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
]
