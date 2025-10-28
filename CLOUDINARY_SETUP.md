# Cloudinary Setup Guide for I-Repair

## 🔧 **Step 1: Create Cloudinary Account**

1. Go to [https://cloudinary.com/](https://cloudinary.com/)
2. Sign up for a free account
3. Verify your email address

## 🔑 **Step 2: Get Your Cloudinary Credentials**

1. After logging in, go to your **Dashboard**
2. Copy the following information:
   - **Cloud Name** (e.g., `your-cloud-name`)
   - Note: We only need the Cloud Name for unsigned uploads (no API key/secret needed)

## ⚙️ **Step 3: Configure Upload Preset**

1. Go to **Settings** → **Upload**
2. Click **Add upload preset**
3. Set the following:
   - **Preset name**: `irepair_uploads` (or any name you prefer)
   - **Signing Mode**: `Unsigned` (for client-side uploads)
   - **Folder**: `i-repair`
   - **Access Mode**: `Public`
4. Click **Save**

## 📝 **Step 4: Update Configuration File**

Open `i-repair/cloudinary/cloudinary.ts` and replace the placeholder values:

```typescript
const CLOUDINARY_CONFIG = {
  cloud_name: 'your_cloud_name',        // Replace with your Cloud Name
  upload_preset: 'your_upload_preset',  // Replace with your Upload Preset name
};
```

**Example:**
```typescript
const CLOUDINARY_CONFIG = {
  cloud_name: 'my-irepair-app',         // Your actual cloud name
  upload_preset: 'irepair_uploads',     // Your upload preset name
};
```

## 🗂️ **Step 5: Folder Structure**

Your Cloudinary will automatically organize files like this:

```
i-repair/
├── shop-requirements/
│   └── {userId}/
│       ├── business-permit.jpg
│       └── government-id.jpg
└── freelance-requirements/
    └── {userId}/
        ├── profile-photo.jpg
        ├── government-id.jpg
        └── certificate.jpg
```

## 🚀 **Step 6: Test the Setup**

1. Run your app: `npx expo run:android`
2. Try registering as a shop owner or freelance technician
3. Upload some test images in the requirements step
4. Check your Cloudinary dashboard to see if files are uploaded

## 💰 **Free Tier Limits**

- **Storage**: 25 GB
- **Bandwidth**: 25 GB/month
- **Transformations**: 25,000/month
- **Uploads**: 1,000/month

## 🔒 **Security Notes**

- Never expose your API Secret in client-side code
- Use unsigned upload presets for client uploads
- Consider implementing server-side uploads for production

## 🆘 **Troubleshooting**

### Common Issues:

1. **"Upload failed" error**: Check your upload preset configuration
2. **"Invalid cloud name"**: Verify your cloud name in the configuration
3. **"Unauthorized" error**: Check your API key and secret

### Debug Steps:

1. Check browser console for detailed error messages
2. Verify all credentials are correct
3. Ensure upload preset is set to "Unsigned"
4. Test with a simple image first

## 📞 **Support**

- Cloudinary Documentation: [https://cloudinary.com/documentation](https://cloudinary.com/documentation)
- Cloudinary Support: [https://support.cloudinary.com/](https://support.cloudinary.com/)

---

**Your multi-step registration form is now ready with Cloudinary integration!** 🎉
