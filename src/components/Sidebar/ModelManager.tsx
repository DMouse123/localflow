import { useEffect } from 'react'
import { useLLMStore, ModelInfo } from '../../stores/llmStore'
import { Download, Check, Loader2, Cpu, Trash2 } from 'lucide-react'

function ModelCard({ model }: { model: ModelInfo }) {
  const { downloadModel, loadModel, unloadModel, downloadProgress } = useLLMStore()
  
  const isThisDownloading = downloadProgress?.modelId === model.id
  const progress = isThisDownloading ? downloadProgress?.progress : 0

  const handleAction = async () => {
    if (model.isLoaded) {
      await unloadModel()
    } else if (model.isDownloaded) {
      await loadModel(model.id)
    } else {
      await downloadModel(model.id)
    }
  }

  return (
    <div className={`p-3 rounded-lg border ${model.isLoaded ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-slate-800 truncate">{model.name}</span>
            {model.recommended && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Recommended</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{model.description}</p>
          <div className="flex gap-2 mt-1 text-xs text-slate-400">
            <span>{model.size}</span>
            <span>•</span>
            <span>RAM: {model.ramRequired}</span>
          </div>
        </div>

        <button
          onClick={handleAction}
          disabled={model.isLoading || isThisDownloading}
          className={`p-2 rounded-md transition-colors ${
            model.isLoaded 
              ? 'bg-green-500 text-white hover:bg-green-600'
              : model.isDownloaded
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          } disabled:opacity-50`}
          title={model.isLoaded ? 'Unload' : model.isDownloaded ? 'Load' : 'Download'}
        >
          {model.isLoading || isThisDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : model.isLoaded ? (
            <Cpu className="w-4 h-4" />
          ) : model.isDownloaded ? (
            <Check className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </button>
      </div>
      
      {/* Download progress bar */}
      {isThisDownloading && (
        <div className="mt-2">
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {downloadProgress?.receivedMB || 0} / {downloadProgress?.totalMB || '?'} MB
          </div>
        </div>
      )}
    </div>
  )
}

export default function ModelManager() {
  const { models, fetchModels, loadedModelId } = useLLMStore()

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  const loadedModel = models.find(m => m.id === loadedModelId)

  return (
    <div className="space-y-3">
      {/* Status indicator */}
      <div className={`p-2 rounded-lg text-xs ${loadedModel ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
        {loadedModel ? (
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            <span className="font-medium">{loadedModel.name}</span>
            <span>loaded</span>
          </div>
        ) : (
          <span>No model loaded</span>
        )}
      </div>

      {/* Model list */}
      <div className="space-y-2">
        {models.map(model => (
          <ModelCard key={model.id} model={model} />
        ))}
      </div>

      {models.length === 0 && (
        <div className="text-center text-sm text-slate-400 py-4">
          Loading models...
        </div>
      )}
    </div>
  )
}
