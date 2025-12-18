'use client';

import ConfigEditor from '@/components/ConfigEditor';
import ProgressPanel from '@/components/ProgressPanel';
import TemplateSelector from '@/components/TemplateSelector';
import { templates } from '@/lib/templates';
import { GenerationConfig, Template } from '@/lib/types';
import { useState } from 'react';

const defaultConfig: GenerationConfig = {
  jobName: 'custom-generation',
  count: 10,
  batchSize: 5,
  systemPrompt: '',
  userPrompt: '',
  jsonSchema: {
    name: 'CustomSchema',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {},
      },
    },
    strict: true,
  },
  collection: 'generated_content',
  sink: 'firestore',
  model: 'gpt-5',
};

export default function GeneratePage() {
  const [config, setConfig] = useState<GenerationConfig>(defaultConfig);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('custom');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({
    completed: 0,
    total: 0,
    message: '',
    status: 'idle' as 'idle' | 'running' | 'completed' | 'error',
  });

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplateId(template.id);
    setConfig({
      ...defaultConfig,
      ...template.config,
    } as GenerationConfig);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress({ completed: 0, total: config.count, message: 'Starting...', status: 'running' });

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error('Generation failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'progress') {
              setProgress({
                completed: data.completed,
                total: data.total,
                message: data.message || '',
                status: 'running',
              });
            } else if (data.type === 'completed') {
              setProgress({
                completed: data.total,
                total: data.total,
                message: 'Generation completed!',
                status: 'completed',
              });
            } else if (data.type === 'error') {
              setProgress({
                completed: 0,
                total: config.count,
                message: data.message,
                status: 'error',
              });
            } else if (data.type === 'saved') {
              setProgress((prev) => ({
                ...prev,
                message: `Saved to ${data.sink}: ${data.collection || data.path}`,
              }));
            }
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setProgress({
        completed: 0,
        total: config.count,
        message: errorMessage,
        status: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="page-container relative">
      <div className="container-standard relative">
        {/* Header */}
        <div className="pt-6 pb-8">
          <div className="flex flex-col gap-3">
            <h1 className="heading-lg font-goldplay text-iki-white">
              Content <span className="text-gradient-green">Generator</span>
            </h1>
            <p className="body-md text-iki-white/60 max-w-3xl">
              Generate structured content for Iki. Pick a template, review your schema and prompts, then
              run generation and watch progress in real time.
            </p>
          </div>

          {/* Quick summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="card-compact card-hover">
              <div className="text-xs text-iki-white/50 font-medium">Output</div>
              <div className="mt-1 text-sm text-iki-white font-semibold">
                {config.sink === 'firestore' ? 'Firestore' : 'File'} ·{' '}
                <span className="text-iki-white/70">{config.collection}</span>
              </div>
              <div className="mt-2 text-xs text-iki-white/50">
                Job: <span className="text-iki-white/70">{config.jobName}</span>
              </div>
            </div>
            <div className="card-compact card-hover">
              <div className="text-xs text-iki-white/50 font-medium">Generation</div>
              <div className="mt-1 text-sm text-iki-white font-semibold">
                {config.count} items · batch {config.batchSize}
              </div>
              <div className="mt-2 text-xs text-iki-white/50">
                Schema: <span className="text-iki-white/70">{config.jsonSchema.name}</span>
              </div>
            </div>
            <div className="card-compact card-hover">
              <div className="text-xs text-iki-white/50 font-medium">Model</div>
              <div className="mt-1 text-sm text-iki-white font-semibold">{config.model}</div>
              <div className="mt-2 text-xs text-iki-white/50">
                Status:{' '}
                <span
                  className={
                    progress.status === 'completed'
                      ? 'text-light-green'
                      : progress.status === 'error'
                        ? 'text-red-300'
                        : progress.status === 'running'
                          ? 'text-iki-brown'
                          : 'text-iki-white/70'
                  }
                >
                  {progress.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Templates */}
        <TemplateSelector
          templates={templates}
          onSelect={handleTemplateSelect}
          selectedTemplateId={selectedTemplateId}
        />

        {/* Main Content */}
        <div className="mt-8 grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 xl:col-span-8">
            <ConfigEditor config={config} onChange={setConfig} />
          </div>

          <div className="lg:col-span-5 xl:col-span-4">
            <ProgressPanel
              config={config}
              progress={progress}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
