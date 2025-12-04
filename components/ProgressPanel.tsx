import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Props {
  progress: {
    completed: number;
    total: number;
    message: string;
    status: 'idle' | 'running' | 'completed' | 'error';
  };
  isGenerating: boolean;
  onGenerate: () => void;
}

export default function ProgressPanel({ progress, isGenerating, onGenerate }: Props) {
  const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <div className="space-y-6 lg:sticky lg:top-24 self-start">
      {/* Generate Button */}
      <div className="relative glass rounded-3xl shadow-2xl border border-light-green/20 p-10 overflow-hidden glow-green">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-light-green/5 to-iki-brown/5"></div>
        
        <div className="relative z-10">
          <h3 className="text-3xl font-black bg-gradient-to-r from-iki-brown via-[#f5e6b8] to-iki-brown bg-clip-text text-transparent mb-4">
            Ready to Generate?
          </h3>
          <p className="text-iki-white/60 mb-8 leading-relaxed">
            Review your configuration on the left, then click the button below to start generating content.
          </p>
          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            size="lg"
            className="w-full rounded-3xl font-black shadow-2xl"
          >
            {isGenerating ? (
              <>
                <span className="w-5 h-5 border-3 border-dark-blue border-t-transparent rounded-full animate-spin"></span>
                Generating...
              </>
            ) : (
              'Generate Content'
            )}
          </Button>
        </div>
      </div>

      {/* Progress */}
      {progress.status !== 'idle' && (
        <div className="glass rounded-3xl shadow-2xl border border-light-green/20 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-iki-brown to-transparent rounded-full"></div>
            <h3 className="text-2xl font-black text-iki-brown">
              Progress
            </h3>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-iki-white/60 font-bold mb-4">
              <span>{progress.completed} / {progress.total}</span>
              <span className="text-light-green">{Math.round(percentage)}%</span>
            </div>
            <Progress value={percentage} />
          </div>

          {/* Status */}
          <div
            className={`p-5 rounded-2xl border-2 ${
              progress.status === 'completed'
                ? 'bg-light-green/10 border-light-green text-light-green glow-green'
                : progress.status === 'error'
                ? 'bg-red-500/10 border-red-500 text-red-400'
                : 'bg-iki-brown/10 border-iki-brown text-iki-brown'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-bold">{progress.message}</span>
            </div>
          </div>

          {/* Stats */}
          {progress.status === 'running' && (
            <div className="mt-6 grid grid-cols-2 gap-5">
              <div className="relative p-6 bg-gradient-to-br from-dark-blue/80 to-iki-grey/50 rounded-2xl border-2 border-light-green/30 overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-light-green/10 rounded-full -mr-8 -mt-8"></div>
                <div className="relative z-10">
                  <div className="text-xs text-iki-brown font-bold mb-2">Completed</div>
                  <div className="text-3xl font-black text-light-green">
                    {progress.completed}
                  </div>
                </div>
              </div>
              <div className="relative p-6 bg-gradient-to-br from-dark-blue/80 to-iki-grey/50 rounded-2xl border-2 border-iki-brown/30 overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-iki-brown/10 rounded-full -mr-8 -mt-8"></div>
                <div className="relative z-10">
                  <div className="text-xs text-iki-brown font-bold mb-2">Remaining</div>
                  <div className="text-3xl font-black text-iki-white">
                    {progress.total - progress.completed}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Cards */}
      <div className="glass rounded-3xl shadow-2xl border border-light-green/20 p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-8 bg-gradient-to-b from-iki-brown to-transparent rounded-full"></div>
          <h3 className="text-2xl font-black text-iki-brown">
            Tips
          </h3>
        </div>
        <ul className="space-y-4 text-sm text-iki-white/70 leading-relaxed">
          <li className="flex items-start gap-4 p-3 rounded-xl hover:bg-light-green/5 transition-colors">
            <span className="text-light-green mt-0.5 font-black text-lg">→</span>
            <span>Use templates for quick starts with pre-configured schemas</span>
          </li>
          <li className="flex items-start gap-4 p-3 rounded-xl hover:bg-light-green/5 transition-colors">
            <span className="text-light-green mt-0.5 font-black text-lg">→</span>
            <span>Batch size controls how many items are generated per API call</span>
          </li>
          <li className="flex items-start gap-4 p-3 rounded-xl hover:bg-light-green/5 transition-colors">
            <span className="text-light-green mt-0.5 font-black text-lg">→</span>
            <span>Use {'{count}'} in your prompt to reference the batch size</span>
          </li>
          <li className="flex items-start gap-4 p-3 rounded-xl hover:bg-light-green/5 transition-colors">
            <span className="text-light-green mt-0.5 font-black text-lg">→</span>
            <span>Firestore sink writes directly to your Firebase project</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

