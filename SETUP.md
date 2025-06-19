# QRBox Setup Guide

## Firebase Configuration

To get QRBox working, you need to set up Firebase Firestore:

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "qrbox-inventory")
4. Follow the setup wizard (you can disable Google Analytics if you don't need it)

### 2. Enable Firestore Database

1. In your Firebase project, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (we'll add security rules later)
4. Select a location close to you
5. Click "Done"

### 3. Get Your Firebase Config

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click the web icon (</>) to add a web app
4. Register your app with a nickname (e.g., "QRBox Web")
5. Copy the config object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 4. Create Environment File

Create a `.env.local` file in your project root with:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# OpenAI Configuration (for AI photo analysis)
OPENAI_API_KEY=your_openai_api_key_here
```

### 5. Set up OpenAI (Optional)

For the AI photo analysis feature:

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Go to API Keys section
4. Create a new API key
5. Add it to your `.env.local` file as `OPENAI_API_KEY`

**Note**: The AI photo feature is optional. The app will work without it, but you won't be able to use the camera/upload feature to automatically identify items.

### 5. Test the Application

1. Run `npm run dev`
2. Open http://localhost:3000
3. Try creating your first box!

## Security Rules (Optional)

For production, you should set up Firestore security rules. In Firebase Console > Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all users under any document
    // WARNING: This is for development only!
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

For production, you'll want more restrictive rules based on user authentication.

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Update `NEXT_PUBLIC_BASE_URL` to your Vercel domain (e.g., `https://qrbox-mu.vercel.app`)
5. Deploy!

### Firebase Hosting (Optional)

If you want to host the backend on Firebase:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## QR Code URLs

- **Development**: QR codes will link to `http://localhost:3000/box/[id]` (won't work on mobile)
- **Production**: QR codes will link to `https://qrbox-mu.vercel.app/box/[id]` (works everywhere)

For local testing of QR codes, consider using ngrok:
```bash
npm install -g ngrok
ngrok http 3000
# Then update NEXT_PUBLIC_BASE_URL to your ngrok URL
```

## AI Photo Analysis

The app includes AI-powered photo analysis using OpenAI's Vision API:

### Features:
- **Camera Capture**: Take photos directly with your device camera
- **Photo Upload**: Upload existing photos from your device
- **AI Analysis**: Automatically identify items in the photo
- **Smart Categorization**: Items are categorized and described
- **Bulk Import**: Add multiple items at once

### How it works:
1. Click "AI Photo" button on any box
2. Choose camera or upload option
3. Take/select a photo of your box contents
4. AI analyzes the image and identifies items
5. Review the results and add them to your box

### Requirements:
- OpenAI API key (see setup instructions above)
- Modern browser with camera support (for camera feature)

## Troubleshooting

### Common Issues

1. **"Firebase not initialized" error**: Check your environment variables
2. **"Permission denied" error**: Make sure Firestore is in test mode
3. **QR codes not working**: Verify `NEXT_PUBLIC_BASE_URL` is set correctly
4. **QR codes not working on mobile**: Use ngrok for local testing or deploy to production
5. **AI photo analysis not working**: Check your OpenAI API key and internet connection

### Getting Help

- Check the Firebase Console for any error messages
- Verify your environment variables are loaded correctly
- Make sure you're using the latest version of the dependencies