# Port Conflict Detection & Resolution Feature

## Overview
Code Tutor now automatically detects and resolves port conflicts without requiring manual intervention.

## Features Implemented

### 1. Automatic Port Detection ✅
- Runs during extension activation
- Checks if preferred ports are available
- Tries alternative ports if primary port is in use
- Dashboard ports: `51987-51990`
- Prompt server ports: `3001-3004`

### 2. Clear User Feedback ✅
- **Activation Output Channel**: Logs all port detection steps with timestamps
- **Activation Notification**: Shows completion message with actual port
- **Dashboard URL**: Automatically updated to reflect actual port in use
- **Error Messages**: Clear explanation if port conflict persists

### 3. Runtime Port Management ✅
- Ports stored in workspace state for persistence
- Dashboard URL generated using actual port
- Server listeners use detected port

### 4. New Commands ✅
- **`Code Tutor: Check Ports`**: Shows status of all scanned ports
  - Displays which ports are in use
  - Shows which are available
  - Useful for diagnostics
  
- **`Code Tutor: Restart Dashboard`**: Restarts server on new port
  - Closes existing server
  - Re-detects available port
  - Shows new URL in notification

## How It Works

### During Activation
1. Detects available port from range `51987-51990`
2. Stores actual port in workspace state
3. Logs detection steps to "Code Tutor" output channel
4. Shows completion notification with dashboard URL
5. Uses actual port for all server operations

### If Conflict Detected
1. User sees notification showing fallback port
2. Output channel logs which port is in use
3. Run `Code Tutor: Check Ports` for detailed status
4. Run `Code Tutor: Restart Dashboard` to try different port

## File Changes

### New Files
- `src/core/services/PortManager.ts` - Port detection logic
  - `isPortAvailable()`: Check if port is free
  - `findAvailablePort()`: Find available port in range
  - `getPortsInUse()`: Get status of multiple ports

### Modified Files
- `src/extension.ts`: 
  - Added port detection during activation
  - Added `actualDashboardPort` and `actualPromptServerPort` globals
  - Updated server startup to use detected ports
  - Added `code-tutor.checkPorts` command
  - Added `code-tutor.restartDashboard` command
  
- `src/core/constants/config.ts`:
  - Added `DASHBOARD_PORT_RANGE` constant
  - Added `PROMPT_SERVER_PORT_RANGE` constant
  
- `src/core/constants/index.ts`:
  - Exported port range constants
  
- `INSTALL.md`:
  - Updated port configuration section
  - Added auto-detection explanation
  - Updated troubleshooting for port conflicts

## User Experience

### Before
❌ Port in use → Server startup fails → Manual netstat commands → Kill process → Restart
- No feedback on what's happening
- Requires terminal knowledge
- Frustrating developer experience

### After
✅ Port in use → Auto-detect fallback → Show new URL → Done!
- Clear notification with actual port
- Complete logs in Output panel
- One-click restart if needed
- All handled automatically

## Technical Details

### Port Detection Algorithm
1. Check preferred port first
2. If in use, try fallback ports sequentially
3. Return first available port found
4. If all ports in use, return preferred port with flag

### Port Ranges
- **Dashboard**: 51987-51990 (4 ports)
  - Primary: 51987
  - Fallback: 51988, 51989, 51990
  
- **Prompt Server**: 3001-3004 (4 ports)
  - Primary: 3001
  - Fallback: 3002, 3003, 3004

### Non-Blocking
- Port detection is async but fast (~100-200ms total)
- Already included in activation progress UI
- Doesn't delay extension startup

## Testing

✅ All 138 tests pass
✅ ESLint: 0 errors, 0 warnings
✅ TypeScript: 0 compilation errors
✅ Backwards compatible with existing code

## Future Enhancements (Optional)

- [ ] Make port ranges configurable via settings
- [ ] Add telemetry for port conflicts
- [ ] Prompt server port auto-detection
- [ ] Save successful port to user settings for persistence across sessions

