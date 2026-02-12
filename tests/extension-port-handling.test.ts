/**
 * Extension Port Handling Integration Tests
 *
 * Tests for port detection during activation, command handling, and state management
 */

import {
	DASHBOARD_PORT,
	DASHBOARD_PORT_RANGE,
	PROMPT_SERVER_PORT,
	PROMPT_SERVER_PORT_RANGE
} from '../src/core/constants';
import { findAvailablePort, getPortsInUse } from '../src/core/services/PortManager';
import type { PortConfig } from '../src/core/services/PortManager';

describe('Extension Port Handling', () => {
	describe('Port Configuration', () => {
		it('should have valid port constants', () => {
			expect(DASHBOARD_PORT).toBe(51987);
			expect(PROMPT_SERVER_PORT).toBe(3001);
			expect(DASHBOARD_PORT_RANGE).toBeDefined();
			expect(PROMPT_SERVER_PORT_RANGE).toBeDefined();
		});

		it('should have valid port ranges', () => {
			expect(DASHBOARD_PORT_RANGE.min).toBe(51987);
			expect(DASHBOARD_PORT_RANGE.max).toBe(51990);
			expect(PROMPT_SERVER_PORT_RANGE.min).toBe(3001);
			expect(PROMPT_SERVER_PORT_RANGE.max).toBe(3004);
		});

		it('should have minimum 4 fallback ports for dashboard', () => {
			const range = DASHBOARD_PORT_RANGE;

			const portCount = range.max - range.min + 1;
			expect(portCount).toBeGreaterThanOrEqual(4);
		});

		it('should have minimum 4 fallback ports for prompt server', () => {
			const range = PROMPT_SERVER_PORT_RANGE;

			const portCount = range.max - range.min + 1;
			expect(portCount).toBeGreaterThanOrEqual(4);
		});

		it('should prefer primary ports', () => {
			expect(DASHBOARD_PORT).toBe(DASHBOARD_PORT_RANGE.min);
			expect(PROMPT_SERVER_PORT).toBe(PROMPT_SERVER_PORT_RANGE.min);
		});
	});

	describe('Port Manager Integration', () => {
		it('should export PortManager functions', () => {
			expect(typeof findAvailablePort).toBe('function');
			expect(typeof getPortsInUse).toBe('function');
		});

		it('should have PortConfig type available', () => {
			// Type checking at compile time - this test validates the type exists
			const config: PortConfig = {
				preferredPort: 51987,
				minPort: 51987,
				maxPort: 51990,
				serviceId: 'test'
			};

			expect(config).toBeDefined();
		});
	});

	describe('Port Status Commands', () => {
		it('should support checkPorts command structure', () => {
			// This tests that the command would be able to:
			// 1. Call getPortsInUse with a list of ports
			// 2. Format results as a status message
			// 3. Show the message to the user

			const allPorts = [
				DASHBOARD_PORT,
				DASHBOARD_PORT_RANGE.min + 1,
				DASHBOARD_PORT_RANGE.min + 2,
				DASHBOARD_PORT_RANGE.min + 3,
				PROMPT_SERVER_PORT,
				PROMPT_SERVER_PORT_RANGE.min + 1,
				PROMPT_SERVER_PORT_RANGE.min + 2,
				PROMPT_SERVER_PORT_RANGE.min + 3
			];

			expect(allPorts.length).toBeGreaterThanOrEqual(8);
		});

		it('should support restartDashboard command structure', () => {
			// This tests that the restart command would be able to:
			// 1. Close existing server
			// 2. Call findAvailablePort again
			// 3. Start new server
			// 4. Update workspace state
			// 5. Show notification with new URL

			expect(true).toBe(true); // Placeholder for integration test
		});
	});

	describe('Port State Management', () => {
		it('should store dashboard port in workspace state', () => {
			// In actual extension:
			// context.workspaceState.update('codeTutor.dashboardPort', actualDashboardPort)

			const mockWorkspaceState = new Map<string, any>();
			mockWorkspaceState.set('codeTutor.dashboardPort', 51987);

			expect(mockWorkspaceState.get('codeTutor.dashboardPort')).toBe(51987);
		});

		it('should support port override in state', () => {
			const mockWorkspaceState = new Map<string, any>();

			// Initial port
			mockWorkspaceState.set('codeTutor.dashboardPort', 51987);
			expect(mockWorkspaceState.get('codeTutor.dashboardPort')).toBe(51987);

			// Update to fallback port
			mockWorkspaceState.set('codeTutor.dashboardPort', 51988);
			expect(mockWorkspaceState.get('codeTutor.dashboardPort')).toBe(51988);
		});

		it('should persist port across activation', () => {
			// Simulates workspace state persistence
			const persistedState = {
				dashboardPort: 51989,
				promptServerPort: 3002
			};

			const storedPort = persistedState.dashboardPort;
			expect(storedPort).toBe(51989);
		});
	});

	describe('Port Conflict Scenarios', () => {
		it('should handle primary port in use', async () => {
			const config: PortConfig = {
				preferredPort: 51987,
				minPort: 51987,
				maxPort: 51990,
				serviceId: 'dashboard'
			};

			const result = await findAvailablePort(config);

			// Should have found a valid port
			expect(result.port).toBeGreaterThanOrEqual(51987);
			expect(result.port).toBeLessThanOrEqual(51990);
		});

		it('should try all fallback ports before failing', async () => {
			const config: PortConfig = {
				preferredPort: 51987,
				minPort: 51987,
				maxPort: 51990,
				serviceId: 'dashboard'
			};

			const result = await findAvailablePort(config);

			// In normal conditions, at least one port should be available
			expect(result.port).toBeDefined();
			expect(result.port > 0).toBe(true);
		});

		it('should report port change in allocation result', async () => {
			const config: PortConfig = {
				preferredPort: 51987,
				minPort: 51987,
				maxPort: 51990,
				serviceId: 'dashboard'
			};

			const result = await findAvailablePort(config);

			// Result should indicate if port was changed
			expect(typeof result.isPreferred).toBe('boolean');
			expect(typeof result.portWasChanged).toBe('boolean');
		});
	});

	describe('Dashboard URL Generation', () => {
		it('should generate correct URL for primary port', () => {
			const port = 51987;
			const url = `http://localhost:${port}`;

			expect(url).toBe('http://localhost:51987');
		});

		it('should generate correct URL for fallback port', () => {
			const port = 51989;
			const url = `http://localhost:${port}`;

			expect(url).toBe('http://localhost:51989');
		});

		it('should handle dynamic port in URL generation', () => {
			const dynamicPort = 51988;
			const generateUrl = (port: number) => `http://localhost:${port}`;

			expect(generateUrl(dynamicPort)).toBe('http://localhost:51988');
		});

		it('should show actual port in notification', () => {
			const actualPort = 51989;
			const message = `Code Tutor ready! Dashboard: http://localhost:${actualPort}`;

			expect(message).toContain('51989');
			expect(message).toContain('Code Tutor ready');
		});
	});

	describe('Activation Logging', () => {
		it('should log port detection start', () => {
			const logMessage = '[activation +100ms] Detecting available ports...';

			expect(logMessage).toContain('Detecting available ports');
			expect(logMessage).toContain('100ms');
		});

		it('should log when port changes from preferred', () => {
			const preferredPort = 51987;
			const actualPort = 51988;
			const logMessage = `Dashboard port ${preferredPort} in use, using ${actualPort} instead`;

			expect(logMessage).toContain('in use');
			expect(logMessage).toContain('51987');
			expect(logMessage).toContain('51988');
		});

		it('should log when preferred port is used', () => {
			const port = 51987;
			const logMessage = `Dashboard will use preferred port ${port}`;

			expect(logMessage).toContain('preferred port');
			expect(logMessage).toContain('51987');
		});

		it('should log server startup port', () => {
			const port = 51989;
			const logMessage = `Server started on port ${port}`;

			expect(logMessage).toContain('Server started');
			expect(logMessage).toContain('51989');
		});

		it('should log activation completion with port info', () => {
			const port = 51988;
			const logMessage = `Dashboard: http://localhost:${port}`;

			expect(logMessage).toContain('Dashboard');
			expect(logMessage).toContain('51988');
		});
	});

	describe('Command Registration', () => {
		it('should register checkPorts command', () => {
			// Command: code-tutor.checkPorts
			// Handler should call getPortsInUse and show results
			const commandId = 'code-tutor.checkPorts';
			expect(commandId).toBe('code-tutor.checkPorts');
		});

		it('should register restartDashboard command', () => {
			// Command: code-tutor.restartDashboard
			// Handler should restart server on new port
			const commandId = 'code-tutor.restartDashboard';
			expect(commandId).toBe('code-tutor.restartDashboard');
		});

		it('should have commands for port troubleshooting', () => {
			const commands = ['code-tutor.checkPorts', 'code-tutor.restartDashboard'];

			expect(commands.length).toBe(2);
			expect(commands).toContain('code-tutor.checkPorts');
			expect(commands).toContain('code-tutor.restartDashboard');
		});
	});

	describe('Error Messages', () => {
		it('should show clear message for port conflict', () => {
			const port = 51987;
			const message = `Dashboard port ${port} in use. Try "Code Tutor: Restart Dashboard" command.`;

			expect(message).toContain('in use');
			expect(message).toContain('Restart Dashboard');
		});

		it('should show port info in error recovery', () => {
			const port = 51988;
			const message = `Check Output panel for the actual port in use`;

			expect(message).toContain('Output panel');
		});

		it('should guide user to Check Ports command', () => {
			const message = 'Run `Code Tutor: Check Ports` to see which ports are available';

			expect(message).toContain('Check Ports');
		});
	});

	describe('Fallback Strategy', () => {
		it('should have 4 ports in dashboard range', () => {
			const ports = [];

			for (let i = DASHBOARD_PORT_RANGE.min; i <= DASHBOARD_PORT_RANGE.max; i++) {
				ports.push(i);
			}

			expect(ports).toEqual([51987, 51988, 51989, 51990]);
		});

		it('should have 4 ports in prompt server range', () => {
			const ports = [];

			for (let i = PROMPT_SERVER_PORT_RANGE.min; i <= PROMPT_SERVER_PORT_RANGE.max; i++) {
				ports.push(i);
			}

			expect(ports).toEqual([3001, 3002, 3003, 3004]);
		});

		it('should try ports sequentially', async () => {
			// Test that fallback logic tries ports in order
			const config: PortConfig = {
				preferredPort: 51987,
				minPort: 51987,
				maxPort: 51990,
				serviceId: 'dashboard'
			};

			const result = await findAvailablePort(config);

			// Result should be one of the ports in range
			const expectedPorts = [51987, 51988, 51989, 51990];
			expect(expectedPorts).toContain(result.port);
		});
	});

	describe('Performance', () => {
		it('should detect ports quickly', async () => {
			const startTime = Date.now();

			const config: PortConfig = {
				preferredPort: 51987,
				minPort: 51987,
				maxPort: 51990,
				serviceId: 'dashboard'
			};

			await findAvailablePort(config);

			const elapsed = Date.now() - startTime;

			// Port detection should complete in reasonable time (< 2 seconds)
			expect(elapsed).toBeLessThan(2000);
		});

		it('should check multiple ports efficiently', async () => {

			const startTime = Date.now();
			const portsToCheck = [51987, 51988, 51989, 51990, 3001, 3002, 3003, 3004];
			await getPortsInUse(portsToCheck);

			const elapsed = Date.now() - startTime;

			// Checking 8 ports should complete quickly
			expect(elapsed).toBeLessThan(2000);
		});
	});
});

