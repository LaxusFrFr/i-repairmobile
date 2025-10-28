# Quick Fix: Remove Cloud Functions (Temporary)

If you need to deploy to Hostinger RIGHT NOW without setting up Cloud Functions, you can temporarily revert to the old logout method.

## Option 1: Quick Revert (Use Old Method Temporarily)

If you uploaded without deploying functions, user creation will show errors like:
- "Function not found"
- "Failed to create user account"
- "404 Not Found"

### Quick Fix: Revert to old logout method

**File: `admin/src/pages/users.tsx`**

Replace lines 170-189 with:

```typescript
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

// Then in the component:
const navigate = useNavigate();

// And in handleAddUser:
setIsCreating(true);
try {
  // Create user in Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Save user details in Firestore 'users' collection
  await setDoc(doc(db, 'users', user.uid), {
    username: username,
    email: email,
    phone: phone,
    createdAt: new Date(),
  });

  // Sign out and redirect
  await signOut(auth);
  notification.notify('User created! Redirecting to login...', 'success');
  setTimeout(() => navigate('/adminlogin'), 2000);
} catch (error: any) {
  notification.notify('Error: ' + error.message, 'error');
} finally {
  setIsCreating(false);
}
```

Do the same for `technicians.tsx`.

---

## Option 2: Deploy Functions (Better Long-term)

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase
```bash
firebase login
```

### Step 3: Install dependencies
```bash
cd functions
npm install
```

### Step 4: Deploy
```bash
cd ..
firebase deploy --only functions
```

### Step 5: Then upload admin panel to Hostinger

---

## Recommendation

**For now**: Use Option 1 to get your site live
**Later**: Set up Option 2 for the better experience

The Cloud Functions only take 5-10 minutes to deploy, but if you need it live NOW, Option 1 works.
