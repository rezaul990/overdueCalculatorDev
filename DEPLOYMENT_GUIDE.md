# Deployment Guide: Plaza-wise Overdue Comparison Tool

## Deploying to Hostinger Shared Hosting

This guide provides step-by-step instructions for deploying this application to Hostinger shared hosting using a subdomain.

### Prerequisites

- A Hostinger shared hosting account
- Access to the Hostinger control panel
- The deployment package (`hostinger-deployment.zip`) created by the `deploy.ps1` script

### Step 1: Set Up Your Subdomain

1. Log in to your Hostinger control panel
2. Navigate to **Domains** → **Subdomains**
3. Create a new subdomain (e.g., `app.yourdomain.com`)
4. Note the directory path where the subdomain files will be stored (typically `/public_html/app/`)

### Step 2: Upload Your Files

#### Option A: Using File Manager

1. In Hostinger control panel, go to **Files** → **File Manager**
2. Navigate to your subdomain's directory (e.g., `/public_html/app/`)
3. Click **Upload** and select the `hostinger-deployment.zip` file
4. Once uploaded, extract the ZIP file using the File Manager's extract function
5. Ensure all files are in the correct directory structure:
   - Root files: `index.html`, `script.js`, `style.css`, `.htaccess`, `robots.txt`
   - Subdirectories: `libs/` and `images/`

#### Option B: Using FTP

1. Use an FTP client like FileZilla
2. Connect to your Hostinger hosting using the FTP credentials from your hosting panel
   - Host: Your FTP hostname (usually `ftp.yourdomain.com`)
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: 21 (default FTP port)
3. Navigate to your subdomain's directory
4. Upload all files from the `deployment` folder to this directory, maintaining the same structure

### Step 3: Configure Firebase for Your Domain

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project ("hobby-4494b")
3. Navigate to **Authentication** → **Settings** → **Authorized domains**
4. Add your subdomain (e.g., `app.yourdomain.com`) to the list of authorized domains
5. Save the changes

### Step 4: Test Your Deployment

1. Visit your subdomain in a web browser (e.g., `https://app.yourdomain.com`)
2. Verify that all functionality works correctly:
   - Google Sign-In
   - File uploads and processing
   - Comparison functionality
   - Download and screenshot features

### Troubleshooting Common Issues

#### CORS Issues

If you encounter CORS (Cross-Origin Resource Sharing) errors:

- Ensure your subdomain is added to Firebase authorized domains
- Check browser console for specific error messages

#### 404 Errors

If files are not loading:

- Verify file paths are correct
- Check file permissions (files should be readable, typically 644)
- Ensure all files were uploaded correctly

#### Authentication Errors

If Google Sign-In isn't working:

- Confirm your subdomain is added to Firebase authorized domains
- Check if your Firebase project has Google authentication enabled
- Verify the Firebase configuration in `script.js` is correct

#### Mixed Content Warnings

If you see mixed content warnings:

- Ensure all external resources (scripts, stylesheets) use HTTPS
- Update any HTTP links to HTTPS
- Check if your subdomain has SSL enabled in Hostinger

### SSL Configuration

For secure operation, ensure SSL is enabled for your subdomain:

1. In Hostinger control panel, go to **SSL/TLS**
2. Select your subdomain
3. Enable SSL if not already enabled
4. Wait for the SSL certificate to be issued and installed

### Maintenance and Updates

When you need to update your application:

1. Make changes to your local files
2. Run the `deploy.ps1` script to create a new deployment package
3. Upload and extract the new package to your Hostinger subdomain

### Support

If you encounter issues with Hostinger hosting:

- Contact Hostinger support through your hosting control panel
- Check Hostinger knowledge base for common issues and solutions

For Firebase-related issues:

- Refer to [Firebase documentation](https://firebase.google.com/docs)
- Check Firebase console for error logs and debugging information