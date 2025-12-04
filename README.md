# Iki Gen - AI Content Generator

A beautiful, general-purpose content generation tool for the Iki app, built with Next.js, TypeScript, and Tailwind CSS.

## ✨ Features

- 🎨 **Beautiful UI** - Modern, responsive interface with dark mode support
- 📝 **Schema Editor** - Visual JSON schema editor with validation
- 💬 **Prompt Designer** - Separate system and user prompts with variable substitution
- 📦 **Pre-built Templates** - Ready-to-use templates for common content types
- 🔥 **Firebase Integration** - Direct Firestore write support
- 📁 **File Export** - Alternative JSON file output
- ⚡ **Real-time Progress** - Live updates using Server-Sent Events
- 🎯 **Flexible** - Works with any OpenAI-compatible API

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env.local` file:

```env
OPENAI_API_KEY=sk-your-key-here
MODEL=gpt-4o-mini

# Firebase (choose one option)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# OR
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

DATA_SINK=firestore
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📋 Pre-built Templates

### Health Conditions (300 items)
Generate chronic health conditions for WellSphere with comprehensive medical information.

### Fitness Exercises (100 items)
Create workout exercises with instructions, difficulty levels, and muscle groups.

### Nutrition Recipes (200 items)
Generate healthy recipes with nutritional information and cooking instructions.

### Mindfulness Exercises (50 items)
Create meditation and mindfulness practices with step-by-step guidance.

### Custom
Start from scratch with your own schema and prompts.

## 🎯 How to Use

1. **Select a Template** - Choose a pre-built template or start custom
2. **Configure Settings**
   - Set job name, count, and batch size
   - Choose your collection name
   - Select Firestore or File output
3. **Edit Prompts**
   - Customize system prompt (AI behavior)
   - Edit user prompt (use `{count}` for dynamic batch size)
4. **Define Schema**
   - Edit JSON schema to match your needs
   - Ensures OpenAI returns structured data
5. **Generate** - Click the button and watch real-time progress!

## 🏗️ Architecture

```
iki-gen/
├── app/
│   ├── api/generate/    # API route for content generation
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main UI
├── components/          # React components
│   ├── ConfigEditor.tsx
│   ├── ProgressPanel.tsx
│   └── TemplateSelector.tsx
├── lib/
│   ├── firebase.ts      # Firebase/Firestore utilities
│   ├── openai.ts        # OpenAI client and generation logic
│   ├── templates.ts     # Pre-built templates
│   └── types.ts         # TypeScript types
└── .env.local           # Environment variables
```

## 🔧 API Endpoints

### POST `/api/generate`

Generate content using OpenAI and save to Firestore or file.

**Request Body:**
```typescript
{
  jobName: string;
  count: number;
  batchSize: number;
  systemPrompt: string;
  userPrompt: string;
  jsonSchema: {
    name: string;
    schema: object;
    strict?: boolean;
  };
  collection: string;
  sink: 'firestore' | 'file';
  model: string;
}
```

**Response:** Server-Sent Events stream with progress updates

```json
data: {"type":"started","total":300}
data: {"type":"progress","completed":25,"total":300,"message":"Batch 1/12"}
data: {"type":"completed","total":300}
```

## 📝 Creating Custom Templates

Add your own template to `lib/templates.ts`:

```typescript
{
  id: 'my-custom-content',
  name: 'My Content',
  description: 'Generate my custom content',
  icon: '🎯',
  config: {
    jobName: 'my-content',
    count: 50,
    batchSize: 10,
    collection: 'my_collection',
    systemPrompt: 'Your system prompt...',
    userPrompt: 'Generate {count} items...',
    jsonSchema: {
      name: 'MySchema',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            // Your schema here
          },
          required: ['field1', 'field2'],
        },
      },
      strict: true,
    },
  },
}
```

## 🔥 Firebase Setup

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download the JSON file
4. Either:
   - Copy entire JSON to `FIREBASE_SERVICE_ACCOUNT_JSON`
   - Or extract individual fields to separate env vars

Your Flutter app will read from the same Firestore collection!

## 💡 Tips

- **Batch Size**: Larger batches = fewer API calls but longer wait
- **Count Placeholder**: Use `{count}` in prompts to reference batch size
- **Schema Validation**: OpenAI's structured outputs ensure perfect JSON
- **Model Selection**: `gpt-4o-mini` is fast and cheap, `gpt-4o` for best quality
- **Cost Estimation**: 300 items ≈ $0.50-$1.00 with gpt-4o-mini

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 📦 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI API
- **Database**: Firebase Firestore
- **Validation**: Zod

## 🔒 Security

- ✅ Environment variables for secrets
- ✅ Never commit `.env.local`
- ✅ API routes handle server-side operations only
- ✅ No credentials exposed to client

## 📄 License

Part of the Iki wellness app ecosystem.

## 🤝 Contributing

This tool is designed to be flexible and extensible. Add your own templates, modify the UI, or extend functionality as needed for your Iki app features!

---

Made with ❤️ for the Iki app
# iki-admin
