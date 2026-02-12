# 🚀 Quick Start - Code Tutor Extension (For Testers)

## Installation (2 minutes)

### Step 1: Install the Extension
1. **Open VS Code**
2. Press `Ctrl+Shift+X` to open Extensions
3. Click the **"..."** menu (top right)
4. Select **"Install from VSIX..."**
5. Choose the `code-tutor-0.1.0.vsix` file
6. Click **Install**
7. **Reload window** when prompted

✅ Done! Extension is now installed.

---

## Quick Test (1 minute)

### Test 1: Dashboard
1. Press `Ctrl+Shift+P` (Command Palette)
2. Type: **"Code Tutor: Open Dashboard"**
3. Press Enter
4. Browser opens to dashboard ✅

**Expected:** See student dashboard with stats and progress

### Test 2: Chat Tutor
1. Open Chat panel: `View → Chat` or `Ctrl+Alt+I`
2. Type: **`@tutor /help`**
3. Press Enter

**Expected:** See list of available commands ✅

---

## Main Features to Try

### 💬 Chat Commands
Type in Chat panel (don't forget `@tutor` prefix):

- **`@tutor /explain`** - Select code, get explanation
- **`@tutor /feedback I don't understand loops`** - Get progressive help
- **`@tutor /quiz`** - Test your knowledge
- **`@tutor /exercise`** - Get coding practice
- **`@tutor /debug`** - Help with bugs
- **`@tutor /help`** - Show all commands

### 📊 Dashboard Features
Open with: `Ctrl+Shift+P` → "Code Tutor: Open Dashboard"

- Track your coding progress
- View exercises completed
- Check achievements
- See learning statistics

### 📝 Code Slideshow
1. Select some code in editor
2. Press `Ctrl+Shift+S`
3. Creates educational slide from your code

---

## Common Issues & Fixes

### Issue: "Not Found" Error on Dashboard
**Fix:** 
- Press `F5` to explicitly start extension
- Wait 3 seconds for server
- Refresh browser

### Issue: Chat Says "@tutor not found"
**Fix:**
- Reload window: `Ctrl+R` or `Cmd+R`
- Make sure you're in VS Code Chat (not terminal)

### Issue: Extension Won't Activate
**Fix:**
- Open Command Palette: `Ctrl+Shift+P`
- Type: "Reload Window"
- Press Enter

---

## Ports Used

- **51987** - Dashboard server
- **3001** - Internal prompt server

If you get "port in use" errors, stop other apps using these ports.

---

## Feedback Needed

Please test and report:
- ✅ What works well
- ❌ What doesn't work
- 💡 Suggestions for improvement
- 🐛 Any bugs or errors

Check the **Output** panel and **Debug Console** for errors:
- `View → Output` → Select "Code Tutor"
- `Help → Toggle Developer Tools` → Console tab

---

## Additional Help

More detailed guides in the package:
- **INSTALL.md** - Full installation guide
- **PACKAGING.md** - Distribution info
- **README.md** - Complete feature overview

---

**Need Help?** Contact the developer or check VS Code's Output panel for error messages.

**Enjoy testing! 🎓✨**
