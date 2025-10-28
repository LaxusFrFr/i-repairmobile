# PowerShell Script to Deploy Firebase Functions
# Run this from the i-repair directory

Write-Host "🚀 Starting Firebase Functions Deployment..." -ForegroundColor Green
Write-Host ""

# Step 1: Navigate to functions directory
Write-Host "Step 1: Installing function dependencies..." -ForegroundColor Yellow
Set-Location functions
npm install

# Step 2: Build functions
Write-Host "Step 2: Building functions..." -ForegroundColor Yellow
npm run build

# Step 3: Go back to root
Set-Location ..

# Step 4: Deploy functions
Write-Host "Step 3: Deploying functions to Firebase..." -ForegroundColor Yellow
firebase deploy --only functions

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🎉 Functions are now live! Test creating a user - no logout required!" -ForegroundColor Cyan

