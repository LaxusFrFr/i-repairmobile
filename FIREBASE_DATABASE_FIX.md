# 🔧 Firebase Database Fix - Account Type Mismatch

## The Problem
Your user account exists in **BOTH** the `users` and `technicians` collections in Firebase, causing the "Account Type Mismatch" error.

## Quick Fix via Firebase Console

### Step 1: Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `i-repair-laxusfrfr`
3. Go to **Firestore Database**

### Step 2: Check Your Account
1. In Firestore, you'll see two collections: `users` and `technicians`
2. Look for your user ID in both collections
3. Your user ID is the same in both collections (this is the problem!)

### Step 3: Fix the Mismatch
**Option A: Keep as Regular User (Recommended)**
1. Go to the `technicians` collection
2. Find your user ID document
3. **Delete** that document
4. Keep the document in the `users` collection

**Option B: Keep as Technician**
1. Go to the `users` collection  
2. Find your user ID document
3. **Delete** that document
4. Keep the document in the `technicians` collection

### Step 4: Verify the Fix
1. Try logging in again
2. The mismatch error should be gone
3. You should be able to access the correct interface

## Alternative: Use the Script
If you prefer to use the script I created:

1. Download your Firebase service account key from:
   - Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `service-account-key.json`

2. Install Firebase Admin SDK:
   ```bash
   npm install firebase-admin
   ```

3. Update the script:
   - Replace `'./path-to-your-service-account-key.json'` with `'./service-account-key.json'`
   - Replace `'your-email@example.com'` with your actual email

4. Run the script:
   ```bash
   node check-database.js
   ```

## Why This Happened
This usually occurs when:
- You registered as both a user and technician with the same email
- There was a bug during registration that created duplicate entries
- Database was not properly reverted after testing

## Prevention
- Always use different emails for testing different account types
- Properly clean up test data after development
- Use Firebase Console to monitor your database regularly

## Need Help?
If you're still having issues, check:
1. Your Firebase project ID is correct: `i-repair-laxusfrfr`
2. You have the right permissions to access Firestore
3. Your internet connection is stable


