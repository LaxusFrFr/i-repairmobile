# Step-by-Step Deployment Guide

## Step 1: Install Firebase CLI

Open PowerShell or Command Prompt and run:

```bash
npm install -g firebase-tools
```

**Wait for it to finish** (takes about 1-2 minutes)

## Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser window. Sign in with your Google account that has access to Firebase.

## Step 3: Navigate to Project

```bash
cd C:\Users\Laxus\Documents\I-Repair\i-repair
```

## Step 4: Initialize Firebase Functions

```bash
firebase init functions
```

**When prompted, select:**
- ✅ Use an existing project
- ✅ Select "i-repair-laxus"
- ✅ Language: TypeScript
- ✅ ESLint: Yes
- ✅ Install dependencies: Yes

Wait for it to finish.

## Step 5: Navigate to Functions Directory

```bash
cd functions
```

## Step 6: Install Function Dependencies

```bash
npm install
```

Wait for it to finish.

## Step 7: Build Functions

```bash
npm run build
```

You should see "Build succeeded"

## Step 8: Go Back to Root

```bash
cd ..
```

## Step 9: Deploy Functions

```bash
firebase deploy --only functions
```

**This takes about 2-3 minutes**

You'll see:
```
✔  functions[createUser(us-central1)]: Successful update operation.
✔  functions[createTechnician(us-central1)]: Successful update operation.
```

## ✅ DONE!

Now test creating a user - it should work without logout! 🎉

## If You Get Errors

**"firebase is not recognized"**
→ Run: `npm install -g firebase-tools` and restart terminal

**"Not logged in"**
→ Run: `firebase login` again

**"Project not found"**
→ Make sure you selected "i-repair-laxus" in step 4

**"Build failed"**
→ Check the error, usually missing dependencies. Run `npm install` again.

**"Permission denied"**
→ Make sure your Google account has access to the Firebase project

## After Deployment

Your functions are now live! You can:
1. ✅ Create users without logout
2. ✅ Create technicians without logout
3. ✅ Deploy to Hostinger
4. ✅ Everything works seamlessly

