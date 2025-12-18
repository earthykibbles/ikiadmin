import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { GenerationConfig } from '@/lib/types';
import { ChevronDown } from 'lucide-react';

interface Props {
  config: GenerationConfig;
  onChange: (config: GenerationConfig) => void;
}

export default function ConfigEditor({ config, onChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <section className="card">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="heading-sm font-goldplay text-iki-white">Configuration</h3>
            <p className="body-sm text-iki-white/60 mt-1">Job naming, batching, destination, and model.</p>
          </div>
          <span className="badge badge-secondary">Basics</span>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-iki-white/60 mb-2">Job name</label>
            <Input
              type="text"
              value={config.jobName}
              onChange={(e) => onChange({ ...config, jobName: e.target.value })}
              placeholder="my-generation-job"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-iki-white/60 mb-2">Count</label>
              <Input
                type="number"
                value={config.count}
                onChange={(e) => onChange({ ...config, count: Number.parseInt(e.target.value) })}
                min="1"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-iki-white/60 mb-2">Batch size</label>
              <Input
                type="number"
                value={config.batchSize}
                onChange={(e) =>
                  onChange({ ...config, batchSize: Number.parseInt(e.target.value) })
                }
                min="1"
                max="50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-iki-white/60 mb-2">Collection</label>
              <Input
                type="text"
                value={config.collection}
                onChange={(e) => onChange({ ...config, collection: e.target.value })}
                placeholder="my_collection"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-iki-white/60 mb-2">Sink</label>
              <Select
                value={config.sink}
                onValueChange={(value) => onChange({ ...config, sink: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="firestore">Firestore</SelectItem>
                  <SelectItem value="file">File</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-iki-white/60 mb-2">Model</label>
            <Select
              value={config.model}
              onValueChange={(value) => onChange({ ...config, model: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-5">GPT-5 (Latest & Best)</SelectItem>
                <SelectItem value="gpt-5-turbo">GPT-5 Turbo (Faster)</SelectItem>
                <SelectItem value="gpt-4o">GPT-4O (Reliable)</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4O Mini (Budget)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Prompts */}
      <section className="card">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="heading-sm font-goldplay text-iki-white">Prompts</h3>
            <p className="body-sm text-iki-white/60 mt-1">Define behavior and the content you want back.</p>
          </div>
          <span className="badge badge-secondary">Text</span>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-iki-white/60 mb-2">System prompt</label>
            <Textarea
              value={config.systemPrompt}
              onChange={(e) => onChange({ ...config, systemPrompt: e.target.value })}
              className="font-mono text-sm"
              rows={4}
              placeholder="Define the AI's role and behavior..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-iki-white/60 mb-2">
              User prompt{' '}
              <span className="text-iki-white/40 text-xs font-normal ml-2">
                (use {'{count}'} for batch size)
              </span>
            </label>
            <Textarea
              value={config.userPrompt}
              onChange={(e) => onChange({ ...config, userPrompt: e.target.value })}
              className="font-mono text-sm"
              rows={6}
              placeholder="Generate {count} items with..."
            />
          </div>
        </div>
      </section>

      {/* JSON Schema */}
      <details className="card group" open>
        <summary className="list-none cursor-pointer select-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="heading-sm font-goldplay text-iki-white">JSON schema</h3>
              <p className="body-sm text-iki-white/60 mt-1">
                Controls the shape of the generated output. Keep it strict and explicit.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-secondary">Advanced</span>
              <ChevronDown className="w-4 h-4 text-iki-white/60 transition-transform group-open:rotate-180" />
            </div>
          </div>
        </summary>

        <div className="mt-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-iki-white/60 mb-2">Schema name</label>
            <Input
              type="text"
              value={config.jsonSchema.name}
              onChange={(e) =>
                onChange({
                  ...config,
                  jsonSchema: { ...config.jsonSchema, name: e.target.value },
                })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-iki-white/60 mb-2">Schema definition</label>
            <Textarea
              value={JSON.stringify(config.jsonSchema.schema, null, 2)}
              onChange={(e) => {
                try {
                  const schema = JSON.parse(e.target.value);
                  onChange({
                    ...config,
                    jsonSchema: { ...config.jsonSchema, schema },
                  });
                } catch (err) {
                  // Invalid JSON, don't update
                }
              }}
              className="font-mono text-xs"
              rows={16}
              placeholder={'{\n  "type": "array",\n  "items": {...}\n}'}
            />
            <p className="text-xs text-iki-white/45 mt-2">
              Invalid JSON won&apos;t be applied. Validate before running large generations.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}
