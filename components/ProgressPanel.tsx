'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { GenerationConfig } from '@/lib/types';
import { usePermissions } from '@/components/PermissionsProvider';
import { RBAC_ACTIONS, RBAC_RESOURCES } from '@/lib/permissions';

interface Props {
  config: GenerationConfig;
  progress: {
    completed: number;
    total: number;
    message: string;
    status: 'idle' | 'running' | 'completed' | 'error';
  };
  isGenerating: boolean;
  onGenerate: () => void;
}

export default function ProgressPanel({ config, progress, isGenerating, onGenerate }: Props) {
  const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
  const { can } = usePermissions();
  const canGenerate = can(RBAC_RESOURCES.GENERATE, RBAC_ACTIONS.WRITE);

  return (
    <div className="space-y-6 lg:sticky lg:top-24 self-start">
      {/* Generate Button */}
      <section className="card card-hover glow-green relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-light-green/6 via-transparent to-iki-brown/6" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="heading-sm font-goldplay text-iki-white">Run generation</h3>
              <p className="body-sm text-iki-white/60 mt-1">
                Sends the configuration to the generator API and streams progress updates.
              </p>
            </div>
            <span className="badge badge-secondary">
              {config.sink === 'firestore' ? 'Firestore' : 'File'}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="badge badge-secondary">{config.count} items</span>
            <span className="badge badge-secondary">batch {config.batchSize}</span>
            <span className="badge badge-secondary">{config.model}</span>
            <span className="badge badge-secondary">{config.collection}</span>
          </div>

          <div className="mt-6">
            <Button
              onClick={onGenerate}
              disabled={isGenerating || !canGenerate}
              size="lg"
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <span className="w-5 h-5 border-3 border-dark-blue border-t-transparent rounded-full animate-spin" />
                  Generating
                </>
              ) : (
                'Generate'
              )}
            </Button>
            <p className="text-xs text-iki-white/50 mt-3">
              {!canGenerate
                ? 'You do not have permission to run generation.'
                : 'Tip: start with a smaller count to validate the schema and prompts.'}
            </p>
          </div>
        </div>
      </section>

      {/* Progress */}
      {progress.status !== 'idle' && (
        <section className="card">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h3 className="heading-sm font-goldplay text-iki-white">Progress</h3>
            <span
              className={`badge ${
                progress.status === 'completed'
                  ? 'status-success'
                  : progress.status === 'error'
                    ? 'status-error'
                    : 'status-info'
              }`}
            >
              {progress.status}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-iki-white/60 font-bold mb-4">
              <span>
                {progress.completed} / {progress.total}
              </span>
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
                <div className="absolute top-0 right-0 w-16 h-16 bg-light-green/10 rounded-full -mr-8 -mt-8" />
                <div className="relative z-10">
                  <div className="text-xs text-iki-brown font-bold mb-2">Completed</div>
                  <div className="text-3xl font-black text-light-green">{progress.completed}</div>
                </div>
              </div>
              <div className="relative p-6 bg-gradient-to-br from-dark-blue/80 to-iki-grey/50 rounded-2xl border-2 border-iki-brown/30 overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-iki-brown/10 rounded-full -mr-8 -mt-8" />
                <div className="relative z-10">
                  <div className="text-xs text-iki-brown font-bold mb-2">Remaining</div>
                  <div className="text-3xl font-black text-iki-white">
                    {progress.total - progress.completed}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Info Cards */}
      <section className="card">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h3 className="heading-sm font-goldplay text-iki-white">Tips</h3>
          <span className="badge badge-secondary">Best practices</span>
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
      </section>
    </div>
  );
}
