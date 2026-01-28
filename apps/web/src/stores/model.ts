import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { validateModelId } from '@/lib/model-validation'
import { notify } from '@/stores/notifications'

export interface Model {
  id: string
  name: string
  provider: string
  description?: string
  validated?: boolean // Track if model ID has been validated
}

// Top models available on OpenRouter (January 2026)
export const AVAILABLE_MODELS: Model[] = [
  // Anthropic
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'anthropic', description: 'Best for agents & coding' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'anthropic', description: 'Fast & efficient' },

  // Google
  { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'google', description: '1M context, multimodal leader' },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'google', description: 'Fast reasoning, 1M context' },

  // OpenAI
  { id: 'openai/gpt-5.2', name: 'GPT-5.2', provider: 'openai', description: '400K context, top benchmark' },
  { id: 'openai/o4-mini', name: 'o4 Mini', provider: 'openai', description: 'Fast reasoning model' },

  // xAI
  { id: 'x-ai/grok-4.1-fast', name: 'Grok 4.1 Fast', provider: 'xai', description: 'Latest Grok model' },
  { id: 'x-ai/grok-code-fast-1', name: 'Grok Code Fast', provider: 'xai', description: 'Optimized for coding' },

  // DeepSeek
  { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'deepseek', description: 'Frontier-class, 1/100th cost' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'deepseek', description: 'Advanced reasoning' },

  // Z.AI (GLM)
  { id: 'z-ai/glm-4.7', name: 'GLM 4.7', provider: 'zhipuai', description: 'Enhanced coding & reasoning' },

  // MiniMax
  { id: 'minimax/minimax-m2.1', name: 'MiniMax M2.1', provider: 'minimax', description: 'Lightweight, great for coding' },
  { id: 'minimax/minimax-m2-her', name: 'MiniMax M2-her', provider: 'minimax', description: 'Roleplay & character chat' },

  // Qwen
  { id: 'qwen/qwen3-235b-instruct', name: 'Qwen3 235B', provider: 'alibaba', description: 'Top open-source performer' },

  // Meta
  { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'llama', description: '1M context, open weights' },

  // Mistral
  { id: 'mistralai/devstral-2', name: 'Devstral 2', provider: 'mistral', description: 'Agentic coding specialist' },
  { id: 'mistralai/mistral-small-creative', name: 'Mistral Small Creative', provider: 'mistral', description: 'Creative writing & roleplay' },

  // Xiaomi
  { id: 'xiaomi/mimo-v2-flash', name: 'MiMo-V2-Flash', provider: 'xiaomi', description: '#1 open-source, 256K context' },

  // NVIDIA
  { id: 'nvidia/nemotron-3-nano-30b-a3b', name: 'Nemotron 3 Nano', provider: 'nvidia', description: 'Efficient MoE for agents' },

  // Moonshot
  { id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5', provider: 'moonshotai', description: 'Visual coding & agent swarm' },

  // Writer
  { id: 'writer/palmyra-x5', name: 'Palmyra X5', provider: 'writer', description: '1M context, enterprise agents' },

  // Upstage
  { id: 'upstage/solar-pro-3:free', name: 'Solar Pro 3', provider: 'upstage', description: 'Free, 102B MoE model' },

  // Liquid
  { id: 'liquid/lfm2.5-1.2b-thinking:free', name: 'LFM 2.5 Thinking', provider: 'liquid', description: 'Free, lightweight reasoning' },

  // Roleplay Specialists
  { id: 'nothingiisreal/mn-celeste-12b', name: 'Nemo Celeste 12B', provider: 'nothingiisreal', description: 'Story writing & roleplay' },
  { id: 'aion-labs/aion-rp-llama-3.1-8b', name: 'Aion-RP 8B', provider: 'aion', description: '#1 RPBench, persona chat' },
]

interface ModelState {
  selectedModel: Model
  isValidating: boolean
  setSelectedModel: (model: Model) => void
  validateSelectedModel: () => Promise<boolean>
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      selectedModel: AVAILABLE_MODELS[0],
      isValidating: false,

      setSelectedModel: async (model) => {
        set({ selectedModel: model, isValidating: true })

        // Validate the model ID against OpenRouter
        try {
          const result = await validateModelId(model.id)

          if (!result.valid) {
            const message = result.suggestion
              ? `Model "${model.id}" not found on OpenRouter. Did you mean "${result.suggestion}"?`
              : `Model "${model.id}" is not available on OpenRouter.`

            notify.error(message, {
              cta: result.suggestion
                ? {
                    label: 'Use suggestion',
                    onClick: () => {
                      const suggested = AVAILABLE_MODELS.find((m) => m.id === result.suggestion)
                      if (suggested) {
                        get().setSelectedModel(suggested)
                      }
                    },
                  }
                : undefined,
            })
          } else {
            set({ selectedModel: { ...model, validated: true } })

            if (result.probe && !result.probe.ok) {
              notify.warning(`Model "${model.id}" validated, but a probe request failed. It may not stream correctly.`)
            }
          }
        } catch (error) {
          console.error('Model validation failed:', error)
          notify.warning('Could not validate model. It may not work correctly.')
        } finally {
          set({ isValidating: false })
        }
      },

      validateSelectedModel: async () => {
        const { selectedModel } = get()
        set({ isValidating: true })

        try {
          const result = await validateModelId(selectedModel.id)
          if (!result.valid) {
            notify.error(`Current model "${selectedModel.id}" is not available on OpenRouter.`)
          } else if (result.probe && !result.probe.ok) {
            notify.warning(`Model "${selectedModel.id}" validated, but a probe request failed. It may not stream correctly.`)
          }
          return result.valid
        } finally {
          set({ isValidating: false })
        }
      },
    }),
    {
      name: 'lightloop-model',
      partialize: (state) => ({ selectedModel: state.selectedModel }), // Only persist selectedModel
    }
  )
)
