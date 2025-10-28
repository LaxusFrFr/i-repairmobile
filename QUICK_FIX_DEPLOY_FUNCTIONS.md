# 🚨 QUICK FIX: Deploy Functions Now

You're getting "error creating user, internal" because the Cloud Functions haven't been deployed to Firebase yet.

## ⚡ Quick Solution (5 minutes)

### Step 1: Open Terminal/Command Prompt

Navigate to your project root:
```bash
cd i-repair
```

### Step 2: Install Firebase CLI (if not installed)

```bash
npm install -g firebase-tools
```

### Step 3: Login to Firebase

```bash
firebase login
```

### Step 4: Initialize Firebase in Project Root

```bash
firebase init
```

**When prompted:**
- Select "Functions" with spacebar
- Press Enter
- Choose "Use an existing project"
- Select "i-repair-laxus"
- Keep defaults

### Step 5: Install Function Dependencies

```bash
cd functions
npm install
```

### Step 6: Build Functions

```bash
npm run build
```

### Step 7: Deploy Functions

```bash
cd ..
firebase deploy --only functions
```

### Step 8: Test!

Now try creating a user again - it should work without logout! 🎉

## ⚠️ If You Get Errors

**Error: "firebase command not found"**
→ Install: `npm install -g firebase-tools`

**Error: "Not logged in"**
→ Login: `firebase login`

**Error: "Functions directory not found"**
→ You need to run `firebase init` first

**Error: "Build failed"**
→ Check: `cd functions && npm install && npm run build`

## ✅ Once Deployed

You'll see:
```
✔  functions[createUser(us-central1)]: Successful update operation.
✔  functions[createTechnician(us-central1)]: Successful update operation.
```

Then creating users/technicians will work perfectly - NO logout required!

