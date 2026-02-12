# 📦 Packaging & Distribution Guide

## ✅ Package Created Successfully!

**File:** `code-tutor-0.1.0.vsix`  
**Size:** ~370 KB  
**Location:** Root of project directory

---

## 📤 How to Share

### 1. Locate the Package
The `.vsix` file is in your project root:
```
ai-participant-prototype/
  └── code-tutor-0.1.0.vsix  ← This file!
```

### 2. Share Methods

**Option A: Email**
- Attach `code-tutor-0.1.0.vsix` to email
- Size is small enough for most email services

**Option B: Cloud Storage**
- Upload to Google Drive / Dropbox / OneDrive
- Share link with recipient

**Option C: GitHub Release**
- Create a release in your repository
- Attach the `.vsix` file as an asset

**Option D: Direct File Transfer**
- USB drive
- Network share
- Messaging apps (Discord, Slack, etc.)

---

## 📥 Installation Instructions for Recipients

### Method 1: VS Code UI (Recommended)

1. **Open VS Code**
2. **Open Extensions panel:** Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)
3. **Click "..." menu** at top-right of Extensions panel
4. **Select "Install from VSIX..."**
5. **Browse to** `code-tutor-0.1.0.vsix` file
6. **Click "Install"**
7. **Reload window** when prompted

### Method 2: Command Line

```bash
# Navigate to folder containing the .vsix file
cd path/to/folder

# Install the extension
code --install-extension code-tutor-0.1.0.vsix

# Verify installation
code --list-extensions | grep code-tutor
```

---

## 🧪 Testing After Installation

### For the User Who Receives It:

**1. Verify Extension is Installed:**
- Open Extensions panel (`Ctrl+Shift+X`)
- Search for "Code Tutor"
- Should appear in installed list

**2. Activate Extension:**
- Press `F5` (starts in debug mode)
- OR just use it normally (auto-activates on chat use)

**3. Test Dashboard:**
```
Ctrl+Shift+P → "Code Tutor: Open Dashboard"
```
Or visit: `http://localhost:51987/`

**4. Test Chat Participant:**
- Open Chat: `View → Chat` or `Ctrl+Alt+I`
- Type: `@tutor /help`
- Should see list of commands

---

## 🔄 Updating the Package

To create a new version:

### 1. Update Version Number
Edit `package.json`:
```json
"version": "0.2.0",  // Bump version
```

### 2. Rebuild & Package
```bash
# Compile latest code
npm run compile

# Run tests
npm test

# Create new package
npm run package
```

### 3. Distribute New Version
- New file: `code-tutor-0.2.0.vsix`
- Users can install over old version (auto-updates)

---

## ⚠️ Important Notes for Recipients

### Requirements
- **VS Code:** Version 1.106.1 or higher
- **Node.js:** Not required for users (only for development)
- **GitHub Copilot:** Recommended for chat API features

### Ports Used
- **Dashboard:** Port `51987`
- **Prompt Server:** Port `3001` (internal)

Make sure these ports aren't blocked by firewall.

### Data Storage
Extension stores data in:
- **Windows:** `%APPDATA%\Code\User\globalStorage\code-tutor-dev.code-tutor\`
- **Mac:** `~/Library/Application Support/Code/User/globalStorage/code-tutor-dev.code-tutor/`
- **Linux:** `~/.config/Code/User/globalStorage/code-tutor-dev.code-tutor/`

---

## 🐛 Troubleshooting Installation

### Error: "Extension is not signed"
**Fix:** This is normal for unpublished extensions. Click "Install Anyway"

### Error: "Unable to install extension"
**Fix:** 
1. Make sure VS Code is up to date
2. Try command line method instead
3. Check file isn't corrupted (should be ~370 KB)

### Extension Shows But Won't Activate
**Fix:**
1. Reload window: `Ctrl+R` or `Cmd+R`
2. Check Output panel for errors
3. Ensure no conflicting extensions

### Dashboard Not Working
**Fix:**
1. Press `F5` to explicitly start extension
2. Wait 3-5 seconds for server to start
3. Check port 51987 isn't in use

---

## 📚 Additional Resources

Share these with recipients:
- **`INSTALL.md`** - Detailed installation & usage guide
- **`README.md`** - Project overview
- **`MANUAL-TEST-PROCEDURE.md`** - Testing guide

---

## 🚀 Publishing to Marketplace (Optional)

To publish publicly:

### 1. Create Publisher Account
```bash
# Create account at: https://marketplace.visualstudio.com/
# Get Personal Access Token from Azure DevOps
```

### 2. Login with vsce
```bash
npx vsce login your-publisher-name
```

### 3. Publish
```bash
npx vsce publish
```

Then users can install with:
```bash
code --install-extension code-tutor-dev.code-tutor
```

---

**That's it! Your extension is ready to share! 🎉**
