# GitHub Pages Setup for RUC License Management Add-In

## Step 1: Push to GitHub Repository

1. **Create a new repository on GitHub:**
   - Go to https://github.com/new
   - Repository name: `RUC1` (or your preferred name)
   - Make it Public (required for free GitHub Pages)
   - Don't initialize with README (you already have files)

2. **Connect your local repo to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/RUC1.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Enable GitHub Pages

1. **Go to your GitHub repository**
2. **Click on "Settings" tab**
3. **Scroll down to "Pages" section**
4. **Under "Source", select "Deploy from a branch"**
5. **Select "main" branch**
6. **Select "/ (root)" folder**
7. **Click "Save"**

## Step 3: Your GitHub Pages URLs

After enabling GitHub Pages, your files will be available at:
- **Base URL**: `https://YOUR-USERNAME.github.io/RUC1/`
- **Add-In Files**:
  - HTML: `https://YOUR-USERNAME.github.io/RUC1/RUC_AddIn/index.html`
  - CSS: `https://YOUR-USERNAME.github.io/RUC1/RUC_AddIn/style.css`
  - JS: `https://YOUR-USERNAME.github.io/RUC1/RUC_AddIn/main.js`

## Step 4: Update config.json

Replace YOUR-USERNAME with your actual GitHub username in the config.json file.

## Step 5: Install in MyGeotab

Use the updated config.json content to install the add-in in MyGeotab.

## Benefits of GitHub Pages:
- ✅ Free HTTPS hosting
- ✅ Automatic updates when you push changes
- ✅ Reliable CDN delivery
- ✅ Perfect for MyGeotab Add-Ins
