import { GenerationConfig } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  config: GenerationConfig;
  onChange: (config: GenerationConfig) => void;
}

export default function ConfigEditor({ config, onChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <div className="glass rounded-3xl shadow-2xl border border-light-green/20 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-gradient-to-b from-iki-brown to-transparent rounded-full"></div>
          <h3 className="text-2xl font-black text-iki-brown">
            Configuration
          </h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-iki-brown/90 mb-3">
              Job Name
            </label>
            <Input
              type="text"
              value={config.jobName}
              onChange={(e) => onChange({ ...config, jobName: e.target.value })}
              placeholder="my-generation-job"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-iki-brown/90 mb-3">
                Count
              </label>
              <Input
                type="number"
                value={config.count}
                onChange={(e) => onChange({ ...config, count: parseInt(e.target.value) })}
                min="1"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-iki-brown/90 mb-3">
                Batch Size
              </label>
              <Input
                type="number"
                value={config.batchSize}
                onChange={(e) => onChange({ ...config, batchSize: parseInt(e.target.value) })}
                min="1"
                max="50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-iki-brown/90 mb-3">
                Collection
              </label>
              <Input
                type="text"
                value={config.collection}
                onChange={(e) => onChange({ ...config, collection: e.target.value })}
                placeholder="my_collection"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-iki-brown/90 mb-3">
                Sink
              </label>
              <Select value={config.sink} onValueChange={(value) => onChange({ ...config, sink: value as any })}>
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
            <label className="block text-sm font-bold text-iki-brown/90 mb-3">
              Model
            </label>
            <Select value={config.model} onValueChange={(value) => onChange({ ...config, model: value })}>
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
      </div>

      {/* Prompts */}
      <div className="glass rounded-3xl shadow-2xl border border-light-green/20 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-gradient-to-b from-iki-brown to-transparent rounded-full"></div>
          <h3 className="text-2xl font-black text-iki-brown">
            Prompts
          </h3>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-iki-brown/90 mb-3">
              System Prompt
            </label>
            <Textarea
              value={config.systemPrompt}
              onChange={(e) => onChange({ ...config, systemPrompt: e.target.value })}
              className="font-mono text-sm"
              rows={4}
              placeholder="Define the AI's role and behavior..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-iki-brown/90 mb-3">
              User Prompt <span className="text-iki-white/40 text-xs font-normal">(use {'{count}'} for batch size)</span>
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
      </div>

      {/* JSON Schema */}
      <div className="glass rounded-3xl shadow-2xl border border-light-green/20 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-gradient-to-b from-iki-brown to-transparent rounded-full"></div>
          <h3 className="text-2xl font-black text-iki-brown">
            JSON Schema
          </h3>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-iki-brown/90 mb-3">
              Schema Name
            </label>
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
            <label className="block text-sm font-bold text-iki-brown/90 mb-3">
              Schema Definition
            </label>
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
          </div>
        </div>
      </div>
    </div>
  );
}

