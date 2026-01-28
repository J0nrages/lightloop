import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorLogo,
  ModelSelectorName,
} from '@/components/ai-elements/model-selector'
import { useModelStore, AVAILABLE_MODELS, type Model } from '@/stores/model'

// Group models by provider
const groupedModels = AVAILABLE_MODELS.reduce((acc, model) => {
  if (!acc[model.provider]) {
    acc[model.provider] = []
  }
  acc[model.provider].push(model)
  return acc
}, {} as Record<string, Model[]>)

const providerLabels: Record<string, string> = {
  anthropic: 'Anthropic',
  google: 'Google',
  openai: 'OpenAI',
  xai: 'xAI',
  deepseek: 'DeepSeek',
  zhipuai: 'Z.AI',
  minimax: 'MiniMax',
  alibaba: 'Qwen',
  llama: 'Meta',
  mistral: 'Mistral',
  xiaomi: 'Xiaomi',
  nvidia: 'NVIDIA',
  moonshotai: 'Moonshot',
  writer: 'Writer',
  upstage: 'Upstage',
  liquid: 'Liquid AI',
  nothingiisreal: 'Community',
  aion: 'Aion Labs',
}

export function ModelSelectorButton() {
  const [open, setOpen] = useState(false)
  const { selectedModel, setSelectedModel } = useModelStore()

  const handleSelect = (model: Model) => {
    setSelectedModel(model)
    setOpen(false)
  }

  return (
    <ModelSelector open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 rounded-full border-muted-foreground/20 bg-background/50 backdrop-blur-sm px-3 font-normal"
        >
          <ModelSelectorLogo
            provider={selectedModel.provider as any}
            className="size-4"
          />
          <span className="hidden sm:inline text-sm">{selectedModel.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent className="w-[340px]">
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          {Object.entries(groupedModels).map(([provider, models]) => (
            <ModelSelectorGroup
              key={provider}
              heading={providerLabels[provider] || provider}
            >
              {models.map((model) => (
                <ModelSelectorItem
                  key={model.id}
                  value={model.id}
                  onSelect={() => handleSelect(model)}
                  className="flex items-center gap-3 py-2.5"
                >
                  <ModelSelectorLogo
                    provider={model.provider as any}
                    className="size-4"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <ModelSelectorName className="font-medium">
                      {model.name}
                    </ModelSelectorName>
                    {model.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {model.description}
                      </span>
                    )}
                  </div>
                  {selectedModel.id === model.id && (
                    <span className="text-xs text-primary font-medium">Active</span>
                  )}
                </ModelSelectorItem>
              ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  )
}
