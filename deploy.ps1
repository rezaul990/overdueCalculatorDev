# PowerShell Deployment Script for Hostinger Shared Hosting
# Plaza-wise Overdue Comparison Tool

param(
    [string]$Subdomain = "",
    [string]$Domain = "",
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Plaza-wise Overdue Comparison Tool - Hostinger Deployment Script

USAGE:
    .\deploy.ps1 -Subdomain "app" -Domain "yourdomain.com"
    .\deploy.ps1 -Subdomain "overdue" -Domain "example.com"

PARAMETERS:
    -Subdomain    The subdomain name (e.g., 'app' for app.yourdomain.com)
    -Domain       Your main domain name (e.g., 'yourdomain.com')
    -Help         Show this help message

EXAMPLES:
    .\deploy.ps1 -Subdomain "app" -Domain "mycompany.com"
    .\deploy.ps1 -Subdomain "overdue" -Domain "business.net"

This script will:
1. Create a deployment package with all necessary files
2. Generate a deployment guide with your specific domain
3. Create a ZIP file ready for Hostinger upload
"@
    exit 0
}

if (-not $Subdomain -or -not $Domain) {
    Write-Host "ERROR: Both -Subdomain and -Domain parameters are required!" -ForegroundColor Red
    Write-Host "Use -Help for usage information." -ForegroundColor Yellow
    exit 1
}

$FullDomain = "$Subdomain.$Domain"
$DeploymentDir = "hostinger-deployment"
$ZipFile = "hostinger-deployment-$Subdomain-$Domain.zip"

Write-Host "🚀 Preparing deployment for: $FullDomain" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan

# Create deployment directory
if (Test-Path $DeploymentDir) {
    Remove-Item $DeploymentDir -Recurse -Force
}
New-Item -ItemType Directory -Path $DeploymentDir | Out-Null

# Copy all necessary files
Write-Host "📁 Copying application files..." -ForegroundColor Yellow

$FilesToCopy = @(
    "index.html",
    "script.js", 
    "style.css",
    ".htaccess",
    "robots.txt"
)

foreach ($file in $FilesToCopy) {
    if (Test-Path $file) {
        Copy-Item $file $DeploymentDir
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (not found)" -ForegroundColor Red
    }
}

# Copy directories
$DirsToCopy = @("libs", "images")

foreach ($dir in $DirsToCopy) {
    if (Test-Path $dir) {
        Copy-Item $dir $DeploymentDir -Recurse
        Write-Host "  ✓ $dir/" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $dir/ (not found)" -ForegroundColor Red
    }
}

# Create deployment guide
Write-Host "📝 Creating deployment guide..." -ForegroundColor Yellow

$DeploymentGuide = @"
# Deployment Guide: Plaza-wise Overdue Comparison Tool
## Domain: $FullDomain

### Quick Setup Steps

1. **Upload Files to Hostinger**
   - Log in to your Hostinger control panel
   - Go to Files → File Manager
   - Navigate to your subdomain directory (usually `/public_html/$Subdomain/`)
   - Upload the ZIP file: `$ZipFile`
   - Extract the ZIP file in the File Manager

2. **Configure Firebase**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select project: `overdue-c6f74`
   - Go to Authentication → Settings → Authorized domains
   - Add your domain: `$FullDomain`
   - Save changes

3. **Enable SSL (Recommended)**
   - In Hostinger control panel, go to SSL/TLS
   - Select your subdomain: `$Subdomain`
   - Enable SSL certificate
   - Wait for certificate to be issued

4. **Test Your Application**
   - Visit: https://$FullDomain
   - Test Google Sign-In
   - Test file upload and comparison features

### File Structure After Upload
```
/public_html/$Subdomain/
├── index.html
├── script.js
├── style.css
├── .htaccess
├── robots.txt
├── libs/
│   └── xlsx.full.min.js
└── images/
    └── developer.png
```

### Troubleshooting

**If Google Sign-In doesn't work:**
- Verify `$FullDomain` is added to Firebase authorized domains
- Check browser console for errors
- Ensure SSL is enabled

**If files don't load:**
- Check file permissions (should be 644 for files, 755 for directories)
- Verify all files were uploaded correctly
- Check .htaccess file is present

**If you get CORS errors:**
- Confirm domain is in Firebase authorized domains
- Check that all external resources use HTTPS

### Support
- Hostinger Support: Through your hosting control panel
- Firebase Issues: [Firebase Documentation](https://firebase.google.com/docs)
"@

$DeploymentGuide | Out-File -FilePath "$DeploymentDir\DEPLOYMENT_GUIDE.md" -Encoding UTF8
Write-Host "  ✓ DEPLOYMENT_GUIDE.md" -ForegroundColor Green

# Create ZIP file
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow

if (Test-Path $ZipFile) {
    Remove-Item $ZipFile -Force
}

Compress-Archive -Path "$DeploymentDir\*" -DestinationPath $ZipFile -Force

# Clean up
Remove-Item $DeploymentDir -Recurse -Force

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "✅ Deployment package created successfully!" -ForegroundColor Green
Write-Host "📁 Package: $ZipFile" -ForegroundColor White
Write-Host "🌐 Target domain: $FullDomain" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Upload $ZipFile to your Hostinger subdomain directory" -ForegroundColor White
Write-Host "2. Extract the ZIP file in Hostinger File Manager" -ForegroundColor White
Write-Host "3. Add $FullDomain to Firebase authorized domains" -ForegroundColor White
Write-Host "4. Enable SSL for your subdomain" -ForegroundColor White
Write-Host "5. Test your application at https://$FullDomain" -ForegroundColor White
Write-Host ""
Write-Host "📖 See DEPLOYMENT_GUIDE.md for detailed instructions" -ForegroundColor Cyan
