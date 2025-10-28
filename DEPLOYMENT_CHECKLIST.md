# Deployment Checklist for Hostinger

## ✅ Must Do Before Uploading to Hostinger

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase
```bash
firebase login
```

### Step 3: Deploy Functions

**For Windows:**
```bash
.\deploy-functions.ps1
```

**For Mac/Linux:**
```bash
chmod +x deploy-functions.sh
./deploy-functions.sh
```

**Or manually:**
```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

### Step 4: Verify Functions Are Deployed

After deployment, you should see:
```
✔  functions[createUser(us-central1)]: Successful update operation.
✔  functions[createTechnician(us-central1)]: Successful update operation.
```

### Step 5: Build Admin Panel

```bash
cd admin
npm run build
```

### Step 6: Upload to Hostinger

Upload the `admin/build` folder contents to your Hostinger hosting.

## ⚠️ What Happens If You Don't Deploy Functions First?

If you upload without deploying functions, you'll get these errors when creating users:

1. **User Creation** → Error: "Functions not found"
2. **Technician Creation** → Error: "Functions not found"
3. **Admin Logs Out** → Session gets disrupted
4. **Can't Create Accounts** → Function calls fail

## ✅ After Uploading to Hostinger

1. Test creating a user - should work without logout!
2. Test creating a technician - should work without logout!
3. Verify admin stays logged in

## 📋 Quick Checklist

- [ ] Firebase CLI installed
- [ ] Logged into Firebase (`firebase login`)
- [ ] Functions deployed successfully
- [ ] Admin panel built (`npm run build` in admin folder)
- [ ] Uploaded to Hostinger
- [ ] Tested user creation (no logout required!)
- [ ] Tested technician creation (no logout required!)

## 🆘 Troubleshooting

### Error: "Functions not found"
→ You forgot to deploy! Run `firebase deploy --only functions`

### Error: "Permission denied"
→ Make sure you're logged in: `firebase login`

### Error: "Build failed"
→ Install dependencies: `cd functions && npm install`

### Error: "Module not found"
→ Install admin panel dependencies: `cd admin && npm install`

