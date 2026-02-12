# Discord Bot - Shutdown Command

## `/shutdown` - Turn Off The Bot

Safely shuts down the Discord bot with a single command.

### Usage
```
/shutdown
```

### Features
✅ **Owner-Only** - Only the server owner can use this command
✅ **Safe Shutdown** - Gracefully closes the bot
✅ **Confirmation Message** - Shows confirmation before shutting down
✅ **Logged** - Logs shutdown info (time, user, server)
✅ **Ephemeral** - Error messages are only visible to you

### What Happens

1. **Owner uses `/shutdown`**
   ```
   /shutdown
   ```

2. **Bot sends confirmation**
   ```
   ⚠️ Bot Wordt Uitgeschakeld
   De bot gaat nu offline. Tot ziens! 👋
   ```

3. **Bot gracefully shuts down**
   - All connections are properly closed
   - Terminal shows shutdown logs
   - Process exits cleanly

### Restart The Bot

To turn the bot back on:

```bash
npm start
```

Or in watch mode (auto-restart on file changes):

```bash
npm run dev
```

---

## How It Works

The `/shutdown` command:

1. **Checks permissions** - Only server owner allowed
   - ❌ If not owner → Shows "Not Allowed" error
   - ✅ If owner → Continues

2. **Sends confirmation** - Shows message that bot is going offline

3. **Waits 1 second** - Gives Discord time to receive the message

4. **Shuts down** - Process exits with code 0 (clean shutdown)

5. **Logs information** - Shows:
   - Who shut it down
   - When it happened
   - Which server
   - How to restart

### Terminal Output Example

```
🛑 Bot wordt uitgeschakeld door gebruiker: YourName
⏰ Timestamp: 12/9/2025, 14:30:45
📍 Server: Code Tutor Learning

Gebruik `npm start` om de bot weer online te zetten.
```

---

## Security

🔒 **Only owner can use it** - Prevents accidental shutdowns
🔒 **Ephemeral error messages** - Only you see permission errors
🔒 **Clean process exit** - No orphaned processes left running

---

## When To Use

**Use `/shutdown` when:**
- ✅ Bot needs maintenance
- ✅ You want to update the bot code
- ✅ Server is shutting down
- ✅ You're changing configuration
- ✅ Bot is acting up and needs a restart

---

## Alternatives

### Keyboard Shortcut (While Running)
Press `Ctrl + C` in the terminal where the bot is running:
```
^C
Bot shut down
```

### Terminal Command
Kill the process manually:
```bash
# Find the process
ps aux | grep "node bot.js"

# Kill it
kill <PID>
```

### Using npm
Stop the process with npm:
```bash
# In another terminal, in the bot folder
npm stop
```

---

## Troubleshooting

### "Alleen de server eigenaar kan de bot uitschakelen!"
You're not the server owner. Ask the server owner to run the command or give you owner permissions.

### Bot doesn't shut down
Press `Ctrl + C` in the terminal where it's running:
```
^C
```

### Bot process still running
List and kill it manually:
```bash
# Windows
tasklist | find "node"
taskkill /PID <PID> /F

# Linux/Mac
ps aux | grep node
kill <PID>
```

---

## Tips

💡 **Use before updates** - Always shut down gracefully before updating code
💡 **Check logs** - The terminal shows when/who shut it down
💡 **Restart quickly** - Just run `npm start` again
💡 **Schedule updates** - Shut down during off-peak hours
