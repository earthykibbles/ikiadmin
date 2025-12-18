import OpenAI from 'openai';
import { GenerationConfig } from './types';

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    });
  }
  return client;
}

export async function generateContent(
  config: GenerationConfig,
  onProgress?: (completed: number, total: number, message?: string) => void
): Promise<{ id: string; data: any }[]> {
  const client = getOpenAI();
  const docs: { id: string; data: any }[] = [];
  const batches = Math.ceil(config.count / config.batchSize);

  // Map GPT-5 models to available models (GPT-5 not yet released)
  const modelMap: Record<string, string> = {
    'gpt-5': 'gpt-4o',
    'gpt-5-turbo': 'gpt-4o-mini',
    'gpt-4o': 'gpt-4o',
    'gpt-4o-mini': 'gpt-4o-mini',
  };
  const model = modelMap[config.model] || 'gpt-4o-mini';

  for (let i = 0; i < batches; i++) {
    const needed = Math.min(config.batchSize, config.count - docs.length);
    const batchPrompt = config.userPrompt.replace(/\{count\}/g, String(needed));

    try {
      // Try structured output first
      const response = await client.responses.create({
        model,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: config.systemPrompt }],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: batchPrompt }],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: config.jsonSchema.name || 'generated_item',
            json_schema: {
              name: config.jsonSchema.name || 'generated_item',
              schema: config.jsonSchema.schema,
              strict: config.jsonSchema.strict,
            },
          },
        },
      } as any);

      const text =
        (response as any).output_text ?? (response as any).choices?.[0]?.message?.content ?? '[]';
      const arr = JSON.parse(text);
      const items = Array.isArray(arr) ? arr : [arr];

      for (const item of items) {
        const id =
          item.id ||
          item.name ||
          item.condition_name ||
          item.exercise_name ||
          `item-${docs.length + 1}`;
        docs.push({ id: String(id).replace(/\s+/g, '-').toLowerCase(), data: item });
      }

      onProgress?.(Math.min(docs.length, config.count), config.count, `Batch ${i + 1}/${batches}`);
    } catch (e: any) {
      // Fallback to chat completion
      console.warn('Structured output failed, falling back to chat:', e.message);

      const chat = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: config.systemPrompt },
          { role: 'user', content: `${batchPrompt}\nReturn JSON array only.` },
        ],
        temperature: 0.7,
      });

      const content = chat.choices[0]?.message?.content ?? '[]';
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        const id =
          item.id ||
          item.name ||
          item.condition_name ||
          item.exercise_name ||
          `item-${docs.length + 1}`;
        docs.push({ id: String(id).replace(/\s+/g, '-').toLowerCase(), data: item });
      }

      onProgress?.(Math.min(docs.length, config.count), config.count, `Batch ${i + 1}/${batches}`);
    }
  }

  return docs.slice(0, config.count);
}
