# All Your Items - Smart Moving Inventory with QR Codes

A modern web application to organize moving boxes using QR codes. Track items, manage moving waves, and never lose track of your belongings again.

**🌐 Live Demo: [https://allmyitems.com/](https://allmyitems.com/)**

## Features

- 📦 **Box Management**: Create and organize boxes by waves (Wave 1, 2, 3, Storage)
- 🏷️ **Item Tracking**: Add, edit, and delete items within each box
- 📱 **QR Code Generation**: Generate QR codes linking directly to box details
- 🔍 **Smart Search**: Search across boxes and items with real-time filtering
- 📱 **Mobile Friendly**: Responsive design that works on all devices
- 🎨 **Visual Organization**: Use emojis and categories to organize your boxes

## Tech Stack

- **Frontend**: Next.js 13 (App Router), TypeScript, Tailwind CSS
- **Backend**: Firebase Firestore (NoSQL database)
- **QR Codes**: qrcode.react for client-side generation
- **Deployment**: Vercel (frontend), Firebase (backend)

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd allyouritems
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Firebase

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Get your Firebase configuration from Project Settings > General > Your apps
4. Create a `.env.local` file with your Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Usage

### Creating Boxes

1. Click "Add Box" on the dashboard
2. Fill in the required information:
   - **Box Number**: Automatically suggested
   - **Group**: Choose from Wave 1, 2, 3, or Storage
   - **Category**: e.g., Kitchen, Bedroom, Office
   - **Summary**: Brief description of contents
   - **Visual Identifiers**: Choose one or more emojis for visual identification
   - **Location**: Where the box is stored
   - **Notes**: Additional information

### Managing Items

1. Click "View" on any box to see its details
2. Click "Add Item" to add items to the box
3. Edit or delete items using the inline controls

### QR Codes

1. Click "QR" on any box card or "QR Code" on the box detail page
2. The QR code links directly to the box's detail page at `https://allmyitems.com/box/[id]`
3. Download the QR code as a PNG image
4. Print and attach to your physical boxes

### Search and Filter

- Use the search bar to find boxes or items by name
- Filter boxes by group using the dropdown
- Search works across box summaries, categories, notes, and item names

## Data Model

### Box Collection
```typescript
{
  id: string;           // Auto-generated
  boxNumber: number;    // Human-readable ID
  group: string;         // "Wave 1", "Wave 2", "Wave 3", "Storage"
  category: string;     // "Kitchen", "Bedroom", etc.
  summary: string;      // Short description
  colorCode: string;    // Space-separated emojis for visual identification
  location: string;     // Storage location
  notes: string;        // Additional notes
  createdAt: Timestamp; // Creation date
}
```

### Items Subcollection (boxes/{boxId}/items)
```typescript
{
  id: string;           // Auto-generated
  name: string;         // Item name
  notes?: string;       // Optional notes
  createdAt: Timestamp; // Creation date
}
```

## Deployment

### Frontend (Vercel)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Update `NEXT_PUBLIC_BASE_URL` to your Vercel domain
5. Deploy!

### Backend (Firebase)

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init`
4. Deploy: `firebase deploy`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

If you have any questions or need help, please open an issue on GitHub.
