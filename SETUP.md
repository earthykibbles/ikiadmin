# 🚀 Iki Gen Setup Guide

Get started in 3 minutes!

## Step 1: Install Dependencies

```bash
cd iki-gen
npm install
```

## Step 2: Create Environment File

Copy the example and add your keys:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual keys:

### Required: OpenAI API Key

Get from: https://platform.openai.com/api-keys

```env
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

### Required: Firebase Credentials

**Option A: Full Service Account JSON** (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Settings → Service Accounts
4. Generate New Private Key
5. Download the JSON
6. Copy entire JSON content:

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project",...}
```

**Option B: Individual Fields** (More readable)

Extract these from your service account JSON:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nMulti\nLine\nKey\nHere\n-----END PRIVATE KEY-----\n"
```

⚠️ **Important**: Keep the `\n` characters in the private key!

### Optional Settings

```env
MODEL=gpt-4o-mini
DATA_SINK=firestore
OUT_DIR=./output
```

## Step 3: Run the App

```bash
npm run dev
```

Open http://localhost:3000 🎉

## 🎯 Quick Test

1. Click on **"Health Conditions"** template
2. Change count to `5` (start small!)
3. Click **"🚀 Generate Content"**
4. Watch the progress bar
5. Check your Firestore collection `wellsphere_conditions`

## 🔥 Using with Your Flutter App

Your Flutter app can now read from these Firestore collections:

```dart
final conditionDoc = await FirebaseFirestore.instance
    .collection('wellsphere_conditions')
    .doc(conditionName)
    .get();

final condition = ChronicCondition.fromJson(
    conditionDoc.data()!['data']
);
```

The schema matches perfectly with your existing Dart models!

## 💡 Creating Your Own Content

### Example: Daily Challenges

1. Click **"✨ Custom"** template
2. Set up:
   - **Job Name**: `daily-challenges`
   - **Count**: `30`
   - **Collection**: `daily_challenges`
   - **System Prompt**: 
     ```
     Generate engaging daily wellness challenges for a health app. 
     Be motivating, achievable, and diverse. Return strict JSON.
     ```
   - **User Prompt**:
     ```
     Generate {count} daily wellness challenges. Each should include:
     - title: catchy challenge name
     - description: what to do (2 sentences)
     - category: fitness/nutrition/mindfulness/social
     - difficulty: easy/medium/hard
     - duration: estimated minutes
     - points: reward points (10-100)
     - instructions: step by step
     - tips: helpful tips array
     ```
   - **JSON Schema**:
     ```json
     {
       "type": "array",
       "items": {
         "type": "object",
         "properties": {
           "title": {"type": "string"},
           "description": {"type": "string"},
           "category": {"type": "string"},
           "difficulty": {"type": "string"},
           "duration": {"type": "integer"},
           "points": {"type": "integer"},
           "instructions": {"type": "array", "items": {"type": "string"}},
           "tips": {"type": "array", "items": {"type": "string"}}
         },
         "required": ["title", "description", "category", "difficulty"]
       }
     }
     ```

3. Click Generate!

## 🐛 Troubleshooting

### "Missing OPENAI_API_KEY"
- Make sure `.env.local` exists (not `.env.example`)
- Check the key starts with `sk-`
- Restart the dev server after adding env vars

### "Firebase authentication failed"
- Verify your service account JSON is complete
- Check project ID matches your Firebase project
- Ensure the service account has Firestore permissions

### "Cannot connect to OpenAI"
- Check your API key is valid
- Verify you have credits in your OpenAI account
- Try setting `OPENAI_BASE_URL` if using a proxy

### UI doesn't update during generation
- Check browser console for errors
- Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)
- Server-Sent Events (SSE) must be supported

## 📊 Cost Estimation

Using `gpt-4o-mini` (recommended):
- 10 items: ~$0.02
- 100 items: ~$0.20
- 300 items: ~$0.60

Using `gpt-4o` (best quality):
- 10 items: ~$0.10
- 100 items: ~$1.00
- 300 items: ~$3.00

💰 Start with small counts to test!

## 🎨 Customizing the UI

The UI is built with Tailwind CSS. Edit these files:

- `app/page.tsx` - Main layout
- `components/*.tsx` - Individual components
- `app/globals.css` - Global styles

## 🔐 Security Checklist

- ✅ Never commit `.env.local`
- ✅ Don't share your OpenAI API key
- ✅ Keep Firebase credentials secret
- ✅ Set billing limits in OpenAI dashboard
- ✅ Use Firestore security rules in production

## 🚢 Deploying

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard.

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📚 Next Steps

1. ✅ Generate your first content
2. 📱 Test in your Flutter app
3. 🎯 Create custom templates for your features
4. 🔧 Tweak prompts for better results
5. 📈 Scale up when satisfied

## 🆘 Need Help?

- Check the [README.md](./README.md) for detailed docs
- Review pre-built templates in `lib/templates.ts`
- Inspect API route in `app/api/generate/route.ts`

---

Happy generating! 🎉

