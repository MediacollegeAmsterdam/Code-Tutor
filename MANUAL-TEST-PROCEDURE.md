# Manual Test Procedure - Phase 8 Validation

**Purpose:** Verify all functionality works after 81.5% code reduction (2,975 → 551 lines)  
**Branch:** 001-modular-refactor  
**Date:** February 11, 2026

---

## Pre-Test Setup

### 1. Compile Extension
```bash
npm run compile
```
**Expected:** ✅ 0 errors

### 2. Start Prompt Server
```bash
node prompt-server.js
```
**Expected:** Server running on port 3000  
**Keep this terminal open**

**Note:** For manual testing, the prompt server runs on port 3000. In production, the dashboard runs on port 51987 (DASHBOARD_PORT constant).

### 3. Start Extension
- Press `F5` in VS Code (Run Extension)
- New Extension Development Host window opens
- Check Debug Console for: `"code-tutor" is now active!`

---

## Test Suite

### ✅ Test 1: Chat Participant - Feedback Command
**Feature:** Progressive feedback system (FeedbackCommand.ts)

1. Open any code file in Extension Host
2. Open Chat panel (View → Chat)
3. Type: `@code-tutor /feedback I don't understand loops`
4. **Expected:**
   - Level 1 feedback appears (problem identification)
   - Offered options for more help
5. Reply: `more help`
6. **Expected:**
   - Level 2 feedback appears (specific tips)
7. Reply: `show example`
8. **Expected:**
   - Level 3 feedback appears (full working example)

**Pass Criteria:** ✅ 3-level feedback system works, no errors in Debug Console

---

### ✅ Test 2: Chat Participant - Explain Command
**Feature:** Code explanation (ExplainCommand.ts)

1. Create test file: `test.js`
   ```javascript
   function fibonacci(n) {
       if (n <= 1) return n;
       return fibonacci(n - 1) + fibonacci(n - 2);
   }
   ```
2. Select the function code
3. In Chat: `@code-tutor /explain`
4. **Expected:**
   - Clear explanation of recursion
   - Mentions base case and recursive calls
   - Educational tone

**Pass Criteria:** ✅ Explanation generated without errors

---

### ✅ Test 3: Intelligent Comments
**Feature:** Comment generation (comment-generator.ts)

1. Open test file with uncommented code
2. Command Palette: `Generate Intelligent Comments`
3. Select option: "Generate comments for selection" or "whole file"
4. **Expected:**
   - Educational comments inserted above complex lines
   - Proper indentation maintained
5. Command Palette: `Remove AI-Generated Comments`
6. **Expected:**
   - All generated comments removed

**Pass Criteria:** ✅ Comments add/remove correctly, no formatting issues

---

### ✅ Test 4: Exercise Assignment
**Feature:** Exercise creation and submission

1. Command Palette: `Create Exercise Assignment`
2. Select topic: "Functions"
3. Select difficulty: "Beginner"
4. **Expected:**
   - New panel opens with exercise description
   - Has clear instructions
   - Shows solution button
5. Click "Submit Solution"
6. **Expected:**
   - Feedback on attempt
   - Can retry or view solution

**Pass Criteria:** ✅ Exercise flow works end-to-end

---

### ✅ Test 5: Dashboard HTTP Route
**Feature:** Student dashboard (HTTP server + routes)

1. Open browser: `http://localhost:3000/` or `http://localhost:3000/dashboard` (both URLs work)
2. **Expected:**
   - Dashboard loads with student stats
   - Shows exercises completed
   - Shows progress metrics
   - No 404 or 500 errors
3. Check browser console for errors
4. **Expected:** No JavaScript errors

**Pass Criteria:** ✅ Dashboard renders correctly with data

---

### ✅ Test 6: Progress Tracking API
**Feature:** Progress tracking endpoints

1. Open browser dev tools
2. Navigate to: `http://localhost:3000/api/progress/stats`
3. **Expected:** JSON response with:
   ```json
   {
     "exercisesCompleted": <number>,
     "totalAttempts": <number>,
     "averageScore": <number>
   }
   ```
4. Try: `http://localhost:3000/api/progress/history`
5. **Expected:** Array of progress events

**Pass Criteria:** ✅ API endpoints return valid JSON, no 500 errors

---

### ✅ Test 7: Slideshow Live Demo
**Feature:** Slideshow presentation mode

1. Command Palette: `Start Slideshow`
2. **Expected:**
   - Webview panel opens
   - Shows first slide
3. Use arrow keys or click "Next"
4. **Expected:**
   - Advances through slides
   - Code snippets render correctly
5. Click "Stop Slideshow"
6. **Expected:** Panel closes cleanly

**Pass Criteria:** ✅ Slideshow navigation works, no UI glitches

---

### ✅ Test 8: Prompt Server Integration
**Feature:** Prompt server communication

1. In Chat: `@code-tutor how do I write clean code?`
2. Check Debug Console for:
   - `Sending request to prompt server...`
   - Response received
3. **Expected:**
   - Response appears in chat
   - No timeout errors
4. Stop prompt server (Ctrl+C in terminal)
5. Try same chat query
6. **Expected:**
   - Graceful failure message
   - Still can use other features

**Pass Criteria:** ✅ Server integration works, handles failures gracefully

---

### ✅ Test 9: Command Registration
**Feature:** All VSCode commands registered

1. Command Palette: Search "Code Tutor"
2. **Expected commands visible:**
   - `Generate Intelligent Comments`
   - `Remove AI-Generated Comments`
   - `Create Exercise Assignment`
   - `Start Slideshow`
   - `Show Dashboard`
   - `Check Student Progress`
3. Each command runs without errors

**Pass Criteria:** ✅ All commands present and functional

---

### ✅ Test 10: Extension Deactivation
**Feature:** Clean shutdown

1. Stop debugging (Shift+F5)
2. Check Debug Console for:
   - `Deactivating code-tutor extension...`
   - HTTP server stopped messages
   - No error stack traces
3. **Expected:** Clean shutdown, no resource leaks

**Pass Criteria:** ✅ Extension deactivates without errors

---

## Automated Test Verification

Run full test suite to confirm unit tests still pass:

```bash
npm test
```

**Expected:**
```
Test Suites: 5 passed, 5 total
Tests: 113 passed, 113 total
```

---

## Pass/Fail Summary

Fill in results:

| Test | Feature | Status | Notes |
|------|---------|--------|-------|
| 1 | Feedback Command | ⬜ | |
| 2 | Explain Command | ⬜ | |
| 3 | Intelligent Comments | ⬜ | |
| 4 | Exercise Assignment | ⬜ | |
| 5 | Dashboard HTTP | ⬜ | |
| 6 | Progress API | ⬜ | |
| 7 | Slideshow | ⬜ | |
| 8 | Prompt Server | ⬜ | |
| 9 | Commands | ⬜ | |
| 10 | Deactivation | ⬜ | |

**Overall Result:** ⬜ PASS / ⬜ FAIL

---

## Troubleshooting

### Issue: "Prompt server not responding"
**Fix:** Ensure `node prompt-server.js` is running in separate terminal

### Issue: "Command not found"
**Fix:** Reload window (Cmd/Ctrl + R in Extension Host)

### Issue: "Tests failing"
**Fix:** 
1. Clean compile: `npm run compile`
2. Clear node_modules: `rm -rf node_modules && npm install`

---

## Success Criteria

**All tests must pass to validate refactoring:**
- ✅ All 10 manual tests pass
- ✅ All 113 automated tests pass
- ✅ 0 TypeScript compilation errors
- ✅ No runtime errors in Debug Console
- ✅ HTTP server starts/stops cleanly
- ✅ Extension activates/deactivates without issues

**If all criteria met:** Phase 8 refactoring validated successfully! ✨

---

## Notes Section

_Use this space to document any issues found or observations:_

```
Date: ___________
Tester: ___________

Observations:
-
-
-

Issues Found:
-
-
-
```
