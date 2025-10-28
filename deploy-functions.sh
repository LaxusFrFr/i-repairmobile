#!/bin/bash
# Bash script to deploy Firebase Functions
# Run this before uploading to Hostinger

echo "🚀 Deploying Firebase Cloud Functions..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Navigate to functions directory
echo "📦 Installing function dependencies..."
cd functions
npm install

# Build functions
echo "🔨 Building functions..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Check the errors above."
    exit 1
fi

# Navigate back to root
cd ..

# Deploy functions
echo "📤 Deploying functions to Firebase..."
firebase deploy --only functions

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed! Check the errors above."
    exit 1
fi

echo ""
echo "✅ Functions deployed successfully!"
echo "✅ You can now upload to Hostinger!"
echo ""

