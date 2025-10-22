# Deployment Guide: Plaza-wise Overdue Comparison Tool

## Deploying to Hostinger Shared Hosting

This guide provides step-by-step instructions for deploying this application to Hostinger shared hosting using a subdomain.

### Prerequisites

- A Hostinger shared hosting account
- Access to the Hostinger control panel
- PowerShell (for running the deployment script)

### Quick Start

1. **Run the deployment script:**
   ```powershell
   .\deploy.ps1 -Subdomain "app" -Domain "yourdomain.com"
   ```

2. **Upload the generated ZIP file to Hostinger**

3. **Configure Firebase for your domain**

4. **Enable SSL and test**

### Detailed Steps

#### Step 1: Create Deployment Package

Run the PowerShell deployment script with your subdomain and domain:

```powershell
# Example: Create deployment for app.yourdomain.com
.\deploy.ps1 -Subdomain "app" -Domain "yourdomain.com"

# Example: Create deployment for overdue.example.com  
.\deploy.ps1 -Subdomain "overdue" -Domain "example.com"
```

This will create a ZIP file named `hostinger-deployment-[subdomain]-[domain].zip` with all necessary files.

#### Step 2: Set Up Your Subdomain

1. Log in to your Hostinger control panel
2. Navigate to **Domains** → **Subdomains**
3. Create a new subdomain (e.g., `app.yourdomain.com`)
4. Note the directory path where the subdomain files will be stored (typically `/public_html/app/`)

#### Step 3: Upload Your Files

##### Option A: Using File Manager (Recommended)

1. In Hostinger control panel, go to **Files** → **File Manager**
2. Navigate to your subdomain's directory (e.g., `/public_html/app/`)
3. Click **Upload** and select the generated ZIP file
4. Once uploaded, right-click the ZIP file and select **Extract**
5. Delete the ZIP file after extraction
6. Verify the file structure:
   ```
   /public_html/app/
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

##### Option B: Using FTP

1. Use an FTP client like FileZilla
2. Connect to your Hostinger hosting using the FTP credentials from your hosting panel
   - Host: Your FTP hostname (usually `ftp.yourdomain.com`)
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: 21 (default FTP port)
3. Navigate to your subdomain's directory
4. Upload all files from the extracted deployment folder

#### Step 4: Configure Firebase for Your Domain

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **overdue-c6f74**
3. Navigate to **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Add your subdomain (e.g., `app.yourdomain.com`)
6. Click **Add**
7. Save the changes

#### Step 5: Enable SSL (Recommended)

1. In Hostinger control panel, go to **SSL/TLS**
2. Select your subdomain
3. Enable SSL if not already enabled
4. Wait for the SSL certificate to be issued and installed (usually takes a few minutes)

#### Step 6: Test Your Deployment

1. Visit your subdomain in a web browser (e.g., `https://app.yourdomain.com`)
2. Verify that all functionality works correctly:
   - ✅ Google Sign-In works
   - ✅ File uploads and processing work
   - ✅ Comparison functionality works
   - ✅ Download and screenshot features work
   - ✅ SMS functionality works (if enabled)

### File Structure

After successful deployment, your subdomain directory should contain:

```
/public_html/[subdomain]/
├── index.html              # Main application file
├── script.js              # Application logic
├── style.css              # Styling (if separate file exists)
├── .htaccess              # Apache configuration
├── robots.txt             # Search engine directives
├── libs/
│   └── xlsx.full.min.js   # Excel processing library
└── images/
    └── developer.png      # Developer photo
```

### Troubleshooting Common Issues

#### Google Sign-In Not Working

**Symptoms:** Users can't sign in with Google

**Solutions:**
- ✅ Verify your subdomain is added to Firebase authorized domains
- ✅ Check browser console for specific error messages
- ✅ Ensure SSL is enabled for your subdomain
- ✅ Confirm Firebase project has Google authentication enabled

#### Files Not Loading (404 Errors)

**Symptoms:** CSS, JS, or other files return 404 errors

**Solutions:**
- ✅ Verify all files were uploaded correctly
- ✅ Check file permissions (should be 644 for files, 755 for directories)
- ✅ Ensure .htaccess file is present and readable
- ✅ Check file paths are correct

#### CORS Errors

**Symptoms:** Browser shows CORS-related errors in console

**Solutions:**
- ✅ Confirm your domain is added to Firebase authorized domains
- ✅ Check that all external resources use HTTPS
- ✅ Verify .htaccess file includes CORS headers

#### Mixed Content Warnings

**Symptoms:** Browser shows "Mixed Content" warnings

**Solutions:**
- ✅ Ensure SSL is enabled for your subdomain
- ✅ Check that all external resources use HTTPS
- ✅ Update any HTTP links to HTTPS

#### Application Not Loading

**Symptoms:** Blank page or JavaScript errors

**Solutions:**
- ✅ Check browser console for JavaScript errors
- ✅ Verify all required files are present
- ✅ Check file permissions
- ✅ Ensure Firebase configuration is correct

### Performance Optimization

The deployment includes several optimizations:

- **Compression:** Gzip compression enabled for text files
- **Caching:** Browser caching headers set for static assets
- **Security:** Security headers configured
- **HTTPS:** SSL/TLS configuration ready

### Maintenance and Updates

When you need to update your application:

1. Make changes to your local files
2. Run the deployment script again:
   ```powershell
   .\deploy.ps1 -Subdomain "app" -Domain "yourdomain.com"
   ```
3. Upload and extract the new ZIP file to your Hostinger subdomain
4. Clear browser cache if needed

### Security Considerations

Your deployment includes:

- ✅ Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- ✅ Protection against common attacks
- ✅ Proper file permissions
- ✅ HTTPS enforcement (when SSL is enabled)

### Support and Resources

#### Hostinger Support
- Contact through your hosting control panel
- Knowledge base: [Hostinger Help Center](https://support.hostinger.com/)

#### Firebase Support
- Documentation: [Firebase Documentation](https://firebase.google.com/docs)
- Console: [Firebase Console](https://console.firebase.google.com/)

#### Application Issues
- Check browser console for errors
- Verify all files are uploaded correctly
- Test on different browsers

### Domain Configuration Examples

**Example 1:** Business subdomain
```powershell
.\deploy.ps1 -Subdomain "overdue" -Domain "mycompany.com"
# Results in: https://overdue.mycompany.com
```

**Example 2:** App subdomain
```powershell
.\deploy.ps1 -Subdomain "app" -Domain "business.net"
# Results in: https://app.business.net
```

**Example 3:** Tool subdomain
```powershell
.\deploy.ps1 -Subdomain "tools" -Domain "company.org"
# Results in: https://tools.company.org
```