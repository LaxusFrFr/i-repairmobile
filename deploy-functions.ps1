# PowerShell script to deploy Firebase Functions
# Run this before uploading to Hostinger

Write-Host "🚀 Deploying Firebase Cloud Functions..." -ForegroundColor Green

# Check if Node.js is installed
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Navigate to functions directory
Write-Host "📦 Installing function dependencies..." -ForegroundColor Yellow
cd functions
npm install

# Build functions
Write-Host "🔨 Building functions..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Check the errors above." -ForegroundColor Red
    exit 1
}

# Navigate back to root
cd ..

# Deploy functions
Write-Host "📤 Deploying functions to Firebase..." -ForegroundColor Yellow
firebase deploy --only functions

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed! Check the errors above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Functions deployed successfully!" -ForegroundColor Green
Write-Host "✅ You can now upload to Hostinger!" -ForegroundColor Green
Write-Host ""

