# Code Tutor Extension - Installation Guide

## 📦 Installing the Extension

### Option 1: Install from VSIX File

1. **Open VS Code**
2. **Open Extensions view:** Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac)
3. **Click the "..." menu** (top right of Extensions panel)
4. **Select "Install from VSIX..."**
5. **Browse to** `code-tutor-0.1.0.vsix` file
6. **Click Install**
7. **Reload VS Code** when prompted

### Option 2: Command Line Install

```bash
code --install-extension code-tutor-0.1.0.vsix
```

---

## 🚀 Getting Started

### 1. Verify Installation

After installing:
- Press `F5` to start the extension
- Look for "code-tutor is now active!" message in Debug Console

### 2. Open the Dashboard

**Method A - Command Palette:**
- Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
- Type: "Code Tutor: Open Dashboard"
- Press Enter

**Method B - Direct URL:**
- Open browser to: `http://localhost:51987/`

### 3. Use Chat Participant

1. Open Chat panel: `View → Chat` or `Ctrl+Alt+I`
2. Type: `@tutor` to interact with Code Tutor
3. Try commands:
   - `@tutor /explain` - Explain selected code
   - `@tutor /feedback` - Get progressive feedback
   - `@tutor /exercise` - Generate coding exercises
   - `@tutor /quiz` - Test your knowledge
   - `@tutor /help` - See all commands

---

## ⚙️ Configuration

### Port Settings

The extension uses these ports:
- **Dashboard:** `51987` (HTTP server)
- **Prompt Server:** `3001` (internal)

**Automatic Port Detection:**
If your preferred ports are in use, Code Tutor will automatically try alternative ports:
- Dashboard: `51987-51990`
- Prompt Server: `3001-3004`

The actual port in use is shown:
- In the activation notification
- In the Output panel ("Code Tutor" channel)
- Via the `Code Tutor: Check Ports` command

**Port Conflict Resolution:**
If both the preferred port and all fallback ports are in use:
1. Run the `Code Tutor: Restart Dashboard` command
2. Check the Output panel for the actual port in use
3. Run `Code Tutor: Check Ports` to see which ports are available

**Manual Port Override:**
To override ports, edit: `src/core/constants/config.ts`
- Update `DASHBOARD_PORT` constant
- Restart the extension

### Data Storage

Student data is stored in:
- Windows: `%APPDATA%\Code\User\globalStorage\code-tutor-dev.code-tutor\`
- Mac/Linux: `~/.config/Code/User/globalStorage/code-tutor-dev.code-tutor/`

---

## 🧪 Testing Features

### ✅ Dashboard
- Open: `http://localhost:51987/`
- Check: Student stats, progress tracking, achievements

### ✅ Chat Commands
- `/explain` - Code explanation
- `/feedback` - Progressive learning feedback
- `/quiz` - Interactive quizzes
- `/exercise` - Coding exercises
- `/debug` - Debug assistance
- `/refactor` - Code improvement suggestions
- `/review` - Code review
- `/concept` - Learn programming concepts

### ✅ Slideshow
- Command: "Code Tutor: Add Selected Code to Slideshow"
- Keyboard: `Ctrl+Shift+S` (with code selected)
- Creates educational slides from code

---

## 🐛 Troubleshooting

### Extension Won't Activate
**Fix:** Reload window (`Ctrl+R` or `Cmd+R`)

### Dashboard Not Loading
**Fix:** 
1. Check extension is running (press `F5`)
2. Wait 2-3 seconds for HTTP server to start
3. Access dashboard at: `http://localhost:51987/` or `http://localhost:51987/dashboard`
4. Check Debug Console for "Dashboard running at..." message

### Chat Participant Registration Issues
**What happens:** Extension automatically retries chat participant registration 3 times

**If registration fails:**
1. Look for error notification with suggested action
2. Check VS Code version (requires 1.90+)
3. If prompted, click "Reload Window" button
4. Check Debug Console for detailed error messages

**Manual fix (if needed):**
1. Press `Ctrl+R` (or `Cmd+R` on Mac) to reload window
2. Wait for "Chat participant @code-tutor is ready!" notification

### Port Already in Use
**What happens:** Code Tutor automatically detects port conflicts and tries alternative ports (51987-51990)

**If still failing:**
1. Run: `Code Tutor: Check Ports` (shows which ports are in use)
2. Run: `Code Tutor: Restart Dashboard` (finds new available port)
3. Check Output panel for actual dashboard URL

**Manual diagnosis (if needed):**
```bash
# Windows
netstat -ano | findstr :51987

# Mac/Linux
lsof -i :51987
```

---

## 📚 Features Overview

### 🎓 Student Dashboard
- Real-time progress tracking
- Achievement system
- Exercise history
- Skill level assessment

### 💬 AI Chat Tutor
- Context-aware code explanation
- Progressive feedback (3 levels)
- Adaptive to year level
- Supports multiple languages

### 📝 Exercise System
- Generates custom exercises
- Tracks attempts and solutions
- Provides hints and feedback
- Difficulty scaling

### 🎨 Educational Slideshow
- Create slides from code
- Share with students
- Live demo mode
- Interactive presentations

### 📊 Teacher Tools
- Class statistics dashboard
- Student progress monitoring
- Early warning system
- Broadcast messages to students

---

## 🆘 Support

### Need Help?
- Check Debug Console for errors (`Help → Toggle Developer Tools`)
- Review logs in Output panel
- Ensure TypeScript compiled successfully (`npm run compile`)

### Known Issues
- First activation may take 3-5 seconds
- A startup progress notification appears while Code Tutor initializes
- Dashboard requires extension to be running
- Chat requires VS Code Copilot API access

---

## 📄 License

MIT License - See LICENSE file for details

## 🔄 Version

**Current Version:** 0.1.0

**Changelog:**
- ✅ Modular refactored architecture (81.5% reduction)
- ✅ Fixed wildcard route handling
- ✅ Chat participant with 15+ commands
- ✅ Dashboard with SSE real-time updates
- ✅ Teacher and student modes
- ✅ 113 passing tests

---

**Enjoy learning with Code Tutor! 🎓✨**
