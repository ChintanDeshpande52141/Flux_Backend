// Free OpenRouter Models
// Updated: 2026-06-03
// These models are available for free use on OpenRouter

export const FREE_MODELS = {
  // Primary free models (recommended)
  primary: [
    "z-ai/glm-4.5-air:free",
    "poolside/laguna-xs.2:free", 
    "poolside/laguna-m.1:free",
    "qwen/qwen3-coder:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  ],
  
  // Alternative free models (backup options)
  alternatives: [
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "openrouter/owl-alpha",
  ],
  
  // All available free models
  all: [
    "z-ai/glm-4.5-air:free",
    "poolside/laguna-xs.2:free",
    "poolside/laguna-m.1:free", 
    "qwen/qwen3-coder:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "openrouter/owl-alpha",
  ]
} as const;

// Model descriptions and capabilities
export const MODEL_INFO = {
  "z-ai/glm-4.5-air:free": {
    name: "Z.ai GLM 4.5 Air",
    description: "Lightweight variant of GLM 4.5, good for general tasks",
    context: 131072,
    pricing: "Free"
  },
  "poolside/laguna-xs.2:free": {
    name: "Poolside Laguna XS.2",
    description: "Efficient coding agent with tool calling and reasoning",
    context: 262144,
    pricing: "Free"
  },
  "poolside/laguna-m.1:free": {
    name: "Poolside Laguna M.1", 
    description: "Flagship coding agent optimized for complex software engineering",
    context: 262144,
    pricing: "Free"
  },
  "qwen/qwen3-coder:free": {
    name: "Qwen3 Coder",
    description: "480B parameter MoE code generation model",
    context: 1048576,
    pricing: "Free"
  },
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free": {
    name: "NVIDIA Nemotron 3 Nano Omni",
    description: "30B multimodal model with reasoning capabilities",
    context: 256000,
    pricing: "Free"
  },
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free": {
    name: "Venice Uncensored",
    description: "24B parameter uncensored instruction model",
    context: 32768,
    pricing: "Free"
  },
  "openrouter/owl-alpha": {
    name: "Owl Alpha",
    description: "High-performance foundation model for agentic workloads",
    context: 1048756,
    pricing: "Free"
  }
} as const;

// Helper functions
export function getRandomFreeModel(): string {
  const models = FREE_MODELS.primary;
  return models[Math.floor(Math.random() * models.length)];
}

export function isFreeModel(model: string): boolean {
  return FREE_MODELS.all.includes(model as any);
}

export function getPrimaryFreeModel(): string {
  return FREE_MODELS.primary[0]; // z-ai/glm-4.5-air:free
}
