import fs from 'node:fs/promises';
import path from 'node:path';
import { writeToFirestore } from '@/lib/firebase';
import { generateContent } from '@/lib/openai';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import { GenerationConfig } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // RBAC check
    const authCheck = await requirePermission(request, RESOURCE_TYPES.GENERATE, 'write');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const config: GenerationConfig = await request.json();

    // Validate required fields
    if (!config.systemPrompt || !config.userPrompt || !config.jsonSchema) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Set defaults
    config.count = config.count || 10;
    config.batchSize = Math.min(config.batchSize || 5, 50);
    config.model = config.model || process.env.MODEL || 'gpt-4o-mini';
    config.collection = config.collection || 'generated_content';
    config.sink = config.sink || 'firestore';

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendUpdate = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          sendUpdate({ type: 'started', total: config.count });

          // Generate content
          const docs = await generateContent(config, (completed, total, message) => {
            sendUpdate({
              type: 'progress',
              completed,
              total,
              message,
            });
          });

          sendUpdate({ type: 'generated', count: docs.length });

          // Write to sink
          if (config.sink === 'firestore') {
            await writeToFirestore(config.collection, docs);
            sendUpdate({ type: 'saved', sink: 'firestore', collection: config.collection });
          } else {
            // Save to file
            const outDir = process.env.OUT_DIR || './output';
            await fs.mkdir(outDir, { recursive: true });
            const filePath = path.join(outDir, `${config.collection}.json`);
            await fs.writeFile(
              filePath,
              JSON.stringify({ collection: config.collection, docs }, null, 2)
            );
            sendUpdate({ type: 'saved', sink: 'file', path: filePath });
          }

          sendUpdate({ type: 'completed', total: docs.length });
          controller.close();
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          sendUpdate({ type: 'error', message });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
