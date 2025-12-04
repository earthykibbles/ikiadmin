# 🎨 Iki Gen - Complete Overview

## What Is This?

**Iki Gen** is a beautiful, general-purpose AI content generation tool built specifically for the Iki wellness app. It provides a visual interface to generate structured content using OpenAI, with schemas that match your Flutter app's Dart models perfectly.

## ✨ Key Features

### 🎯 General Purpose Design
- **Flexible Schema Editor**: Define any JSON schema visually
- **Custom Prompts**: Separate system and user prompts with full control
- **Variable Substitution**: Use `{count}` placeholder for dynamic batch sizes
- **Template System**: Pre-built templates for common use cases

### 🎨 Beautiful UI
- **Split-Pane Layout**: Configuration on left, progress on right
- **Dark Mode Support**: Automatic theme switching
- **Real-time Updates**: Server-Sent Events for live progress
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Iki Branding**: Purple/indigo gradient theme matching your app

### 🔥 Firebase Integration
- **Direct Firestore Write**: No manual import needed
- **Batch Operations**: Efficient bulk writes (400 docs per batch)
- **Auto Timestamps**: Adds `createdAt` and `updatedAt` fields
- **Same Structure**: Matches your existing Flutter app queries

### 📋 Pre-built Templates

1. **Health Conditions** 🏥
   - 300 chronic conditions for WellSphere
   - Matches `ChronicCondition` Dart model
   - Includes symptoms, treatments, specialists, etc.

2. **Fitness Exercises** 💪
   - 100 exercises across all categories
   - Instructions, difficulty, muscle groups
   - Modifications and safety notes

3. **Nutrition Recipes** 🥗
   - 200 healthy recipes with nutritional data
   - Ingredients, instructions, dietary tags
   - Storage tips and health benefits

4. **Mindfulness Exercises** 🧘
   - 50 meditation and breathing exercises
   - Step-by-step guidance
   - Audio cues for guided sessions

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (UI)                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Template Selector  │  Config Editor          │  │
│  │  (Pre-built themes) │  (Settings, prompts)    │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Schema Editor      │  Progress Panel         │  │
│  │  (JSON editor)      │  (Real-time updates)    │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                         ↓ HTTP POST
┌─────────────────────────────────────────────────────┐
│              Next.js Server (API Route)             │
│  ┌─────────────────────────────────────────────┐   │
│  │  /api/generate                              │   │
│  │  - Validates config                         │   │
│  │  - Streams progress (SSE)                   │   │
│  │  - Handles batching                         │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
          ↓ OpenAI API              ↓ Firebase
┌──────────────────────┐    ┌─────────────────────┐
│   OpenAI GPT-4O      │    │  Cloud Firestore    │
│   Structured Output  │    │  Collection Write   │
└──────────────────────┘    └─────────────────────┘
                                     ↓
                         ┌───────────────────────┐
                         │  Flutter App (Iki)    │
                         │  Reads from Firestore │
                         └───────────────────────┘
```

## 🎯 How It Works

### 1. User Selects Template
```typescript
// Pre-configured settings load
{
  jobName: 'wellsphere-conditions',
  count: 300,
  collection: 'wellsphere_conditions',
  systemPrompt: '...',
  userPrompt: 'Generate {count} conditions...',
  jsonSchema: { /* OpenAI JSON Schema */ }
}
```

### 2. User Customizes (Optional)
- Adjust count and batch size
- Edit prompts for different tone/style
- Modify schema to add/remove fields
- Change collection name or model

### 3. Generation Process
```
Click Generate
     ↓
API validates config
     ↓
Splits into batches (e.g., 300 items = 12 batches of 25)
     ↓
For each batch:
  - Calls OpenAI with structured output
  - Validates against schema
  - Sends progress update to UI
  - Accumulates results
     ↓
Writes to Firestore in chunks (400 per batch)
     ↓
Completes with success message
```

### 4. Real-time Updates
```
Browser establishes SSE connection
     ↓
Server sends events:
  - {type: 'started', total: 300}
  - {type: 'progress', completed: 25, message: 'Batch 1/12'}
  - {type: 'progress', completed: 50, message: 'Batch 2/12'}
  - ...
  - {type: 'saved', sink: 'firestore', collection: 'wellsphere_conditions'}
  - {type: 'completed', total: 300}
     ↓
UI updates progress bar and status in real-time
```

## 📊 Data Flow Example

### Input (Your Configuration)
```json
{
  "jobName": "wellsphere-conditions",
  "count": 5,
  "batchSize": 5,
  "systemPrompt": "You generate medical overviews...",
  "userPrompt": "Generate {count} chronic conditions...",
  "jsonSchema": {
    "name": "ChronicConditionArray",
    "schema": {
      "type": "array",
      "items": { /* schema */ }
    }
  },
  "collection": "wellsphere_conditions",
  "sink": "firestore"
}
```

### Processing
```
OpenAI API Call → [
  {
    "condition_name": "Diabetes",
    "condition_description": "...",
    "common_symptoms": [...],
    ...
  },
  { /* condition 2 */ },
  { /* condition 3 */ },
  ...
]
```

### Output (Firestore)
```
wellsphere_conditions/
  └── diabetes/
      ├── data: {
      │     condition_name: "Diabetes",
      │     condition_description: "...",
      │     common_symptoms: [...],
      │     ...
      │   }
      ├── createdAt: Timestamp
      └── updatedAt: Timestamp
```

### Flutter App Reads It
```dart
final doc = await FirebaseFirestore.instance
  .collection('wellsphere_conditions')
  .doc('diabetes')
  .get();

final condition = ChronicCondition.fromJson(doc.data()!['data']);
// Perfectly matches your Dart model!
```

## 🎨 UI Components

### TemplateSelector
- Grid of pre-built templates
- Hover effects and icons
- One-click loading

### ConfigEditor
- Basic settings (job name, count, batch size, collection, sink, model)
- System & user prompt text areas
- JSON schema editor with syntax highlighting

### ProgressPanel
- Large "Generate" button
- Real-time progress bar
- Status messages
- Completed/remaining stats
- Helpful tips

## 🔧 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 15 | React framework with App Router |
| Language | TypeScript | Type safety and better DX |
| Styling | Tailwind CSS 4 | Utility-first CSS with dark mode |
| AI | OpenAI API | Structured content generation |
| Database | Firebase Admin | Firestore batch writes |
| Validation | Zod | Runtime type validation |
| API | Server-Sent Events | Real-time progress streaming |

## 💰 Cost Estimation

### GPT-4O Mini (Recommended)
- **Input**: ~$0.15 per 1M tokens
- **Output**: ~$0.60 per 1M tokens
- **Typical**: 300 conditions ≈ $0.50-$1.00

### GPT-4O (Best Quality)
- **Input**: ~$2.50 per 1M tokens  
- **Output**: ~$10.00 per 1M tokens
- **Typical**: 300 conditions ≈ $2.50-$5.00

💡 **Tip**: Start with `gpt-4o-mini` for testing, upgrade to `gpt-4o` for production.

## 🚀 Use Cases

### Wellness Content
- Health conditions, symptoms, treatments
- Fitness exercises and workout plans
- Nutrition recipes and meal plans
- Mindfulness exercises and meditations

### User Engagement
- Daily challenges and goals
- Motivational quotes and affirmations
- Educational tips and articles
- Quiz questions and assessments

### Personalization
- User onboarding questions
- Health assessment forms
- Preference questionnaires
- Goal setting templates

### Community Features
- Discussion topics and prompts
- Group activity ideas
- Social challenges
- Achievement badges

## 🎯 Perfect For

✅ **Bulk Content Generation**: Create hundreds of items in minutes  
✅ **Schema Validation**: Guaranteed valid data structure  
✅ **Flutter Integration**: Direct Firestore write, instant availability  
✅ **Consistency**: Same format, tone, and quality across all items  
✅ **Rapid Iteration**: Test different prompts and schemas easily  
✅ **No Migration**: Works with your existing data models  

## 🔮 Future Enhancements

- [ ] **Template Library**: Save and share custom templates
- [ ] **Batch History**: View past generation jobs
- [ ] **Preview Mode**: See sample output before full generation
- [ ] **Export Options**: CSV, SQL, GraphQL formats
- [ ] **A/B Testing**: Generate variations for testing
- [ ] **Scheduling**: Automated daily/weekly generation
- [ ] **Webhooks**: Notify external systems on completion
- [ ] **Multi-language**: Generate content in different languages

## 📝 Summary

**Iki Gen** transforms hours of manual content creation into minutes of automated generation. With a beautiful UI, real-time progress tracking, and direct Firebase integration, it's the perfect tool for scaling content in the Iki wellness app.

**Start generating in 3 minutes** → See [SETUP.md](./SETUP.md)

---

Built with ❤️ for the Iki wellness ecosystem

