'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, Settings, Home, Sparkles } from 'lucide-react';
import { templates } from '@/lib/templates';
import { GenerationConfig, Template } from '@/lib/types';
import TemplateSelector from '@/components/TemplateSelector';
import ConfigEditor from '@/components/ConfigEditor';
import ProgressPanel from '@/components/ProgressPanel';
import ProfileDropdown from '@/components/ProfileDropdown';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({
    completed: 0,
    total: 0,
    message: '',
    status: 'idle' as 'idle' | 'running' | 'completed' | 'error',
  });

  const handleTemplateSelect = (template: Template) => {
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
    } catch (error: any) {
      setProgress({
        completed: 0,
        total: config.count,
        message: error.message,
        status: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen relative">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-light-green/10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 flex items-center justify-center transform hover:scale-105 transition-transform">
              <img 
                src="/logo.png" 
                alt="Iki Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-iki-brown via-[#f5e6b8] to-iki-brown bg-clip-text text-transparent">
                Iki Gen
              </h1>
              <p className="text-sm text-iki-white/60 font-medium mt-0.5">
                AI Content Generator
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors flex items-center gap-2 text-sm text-iki-white/80"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/users"
              className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors flex items-center gap-2 text-sm text-iki-white/80"
            >
              <Users className="w-4 h-4" />
              Users
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 hover:bg-iki-grey/70 transition-colors flex items-center gap-2 text-sm text-iki-white/80"
            >
              <Settings className="w-4 h-4" />
              Admin Dashboard
            </Link>
            <ProfileDropdown />
            <div className="px-4 py-2 rounded-full bg-iki-grey/50 border border-light-green/20 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-light-green" />
              <span className="text-sm text-iki-white/60 font-medium">Powered by OpenAI</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        {/* Template Selector */}
        <TemplateSelector templates={templates} onSelect={handleTemplateSelect} />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mt-8">
          {/* Left: Configuration */}
          <ConfigEditor config={config} onChange={setConfig} />

          {/* Right: Progress */}
          <ProgressPanel
            progress={progress}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />
        </div>
      </div>
    </main>
  );
}

