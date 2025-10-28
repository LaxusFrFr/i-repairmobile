# Deployment Guide: Firebase Admin SDK with Cloud Functions

This guide will help you deploy your admin panel to Hostinger with Firebase Cloud Functions support.

## Prerequisites

1. Firebase CLI installed
2. Node.js 18 or higher
3. Access to your Firebase project

## Setup Instructions

### Step 1: Install Dependencies for Functions

```bash
cd i-repair/functions
npm install
```

### Step 2: Initialize Firebase Functions (if not already done)

```bash
cd i-repair
firebase init functions
```

When prompted:
- Choose to use TypeScript
- Say YES to ESLint
- Say YES to install dependencies

### Step 3: Build Functions

```bash
cd i-repair/functions
npm run build
```

### Step 4: Deploy Functions to Firebase

```bash
cd i-repair
firebase deploy --only functions
```

This will deploy:
- `createUser` function - Creates users without signing them in
- `createTechnician` function - Creates technicians without signing them in

### Step 5: Verify Deployment

After deployment, you'll see output like:
```
✔  functions[createUser(us-central1)]: Successful update operation.
✔  functions[createTechnician(us-central1)]: Successful update operation.
```

### Step 6: Update Admin Panel Firebase Config

Make sure your Firebase config in `admin/src/firebase/firebase.ts` includes:

```typescript
export const functions = getFunctions(app);
```

### Step 7: Deploy Admin Panel to Hostinger

1. Build the admin panel:
```bash
cd i-repair/admin
npm run build
```

2. Upload the `build` folder to Hostinger

3. Configure Hostinger to serve the React app

## How It Works Now

✅ **Before (with logout):**
- Create user → User signs in → Admin gets kicked out → Redirect to login

✅ **After (with Cloud Functions):**
- Create user → Cloud Function creates user server-side → Admin stays logged in → No redirect!

## Troubleshooting

### Error: "Functions not found"

Make sure you've deployed the functions to Firebase:
```bash
firebase deploy --only functions
```

### Error: "Permission denied"

The functions check that you're an admin. Make sure:
1. You're logged in as an admin
2. Your UID exists in the `admins` collection in Firestore

### Error: "Module not found"

Make sure you've installed dependencies:
```bash
cd functions
npm install
```

## Testing Locally

You can test the functions locally before deploying:

```bash
cd functions
npm run serve
```

This starts the Firebase emulator. Your admin panel will connect to local functions for testing.

## Cost Considerations

Cloud Functions are billed per invocation. Creating users/technicians is infrequent, so costs should be minimal.

## Security Notes

- ✅ Only authenticated admins can call these functions
- ✅ Functions validate admin status before creating users
- ✅ No sensitive data is logged
- ✅ Input validation on both client and server

## Updating Functions

After making changes to functions:

```bash
cd i-repair/functions
npm run build
cd ..
firebase deploy --only functions
```

The changes will be live immediately for your admin panel.
