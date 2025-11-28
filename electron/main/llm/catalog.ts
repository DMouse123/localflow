// Model catalog - curated list of recommended models

export interface ModelInfo {
  id: string
  name: string
  description: string
  size: string
  ramRequired: string
  quantization: string
  filename: string
  downloadUrl: string
  capabilities: string[]
  recommended: boolean
}

export const MODEL_CATALOG: ModelInfo[] = [
  {
    id: 'llama-3.2-1b-q4',
    name: 'Llama 3.2 1B',
    description: 'Fast, lightweight model for simple tasks',
    size: '0.77 GB',
    ramRequired: '2 GB',
    quantization: 'Q4_K_M',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    capabilities: ['chat', 'completion'],
    recommended: false,
  },
  {
    id: 'llama-3.2-3b-q4',
    name: 'Llama 3.2 3B',
    description: 'Good balance of speed and quality',
    size: '2.02 GB',
    ramRequired: '4 GB',
    quantization: 'Q4_K_M',
    filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    capabilities: ['chat', 'completion', 'function-calling'],
    recommended: true,
  },
  {
    id: 'qwen-2.5-3b-q4',
    name: 'Qwen 2.5 3B',
    description: 'Strong reasoning and coding ability',
    size: '2.13 GB',
    ramRequired: '4 GB',
    quantization: 'Q4_K_M',
    filename: 'Qwen2.5-3B-Instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf',
    capabilities: ['chat', 'completion', 'function-calling', 'coding'],
    recommended: false,
  },
  {
    id: 'smollm2-1.7b-q4',
    name: 'SmolLM2 1.7B',
    description: 'Tiny but capable, great for testing',
    size: '1.0 GB',
    ramRequired: '2 GB',
    quantization: 'Q4_K_M',
    filename: 'SmolLM2-1.7B-Instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/SmolLM2-1.7B-Instruct-GGUF/resolve/main/SmolLM2-1.7B-Instruct-Q4_K_M.gguf',
    capabilities: ['chat', 'completion'],
    recommended: false,
  },
]
