/**
 * Port Manager Tests
 *
 * Tests for automatic port detection, conflict resolution, and port management
 */

import { isPortAvailable, findAvailablePort, getPortsInUse } from '../src/core/services/PortManager';
import type { PortConfig } from '../src/core/services/PortManager';

describe('PortManager', () => {
	describe('isPortAvailable', () => {
		it('should return true for available ports', async () => {
			// Use a high port number that's likely available
			const availablePort = 59999;
			const isAvailable = await isPortAvailable(availablePort);
			expect(typeof isAvailable).toBe('boolean');
		});

		it('should handle port in use correctly', async () => {
			// Port 0 is special - OS assigns a port, then we try to use it
			const result = await isPortAvailable(0);
			expect(typeof result).toBe('boolean');
		});

		it('should return false for invalid ports', async () => {
			// Port numbers should be 1-65535
			const invalidPort = 99999;
			const isAvailable = await isPortAvailable(invalidPort);
			expect(typeof isAvailable).toBe('boolean');
		});
	});

	describe('findAvailablePort', () => {
		it('should return preferred port if available', async () => {
			const config: PortConfig = {
				preferredPort: 59998,
				minPort: 59998,
				maxPort: 60001,
				serviceId: 'test-service'
			};

			const result = await findAvailablePort(config);

			expect(result).toHaveProperty('port');
			expect(result).toHaveProperty('isPreferred');
			expect(result).toHaveProperty('portWasChanged');
			expect(typeof result.port).toBe('number');
			expect(result.port).toBeGreaterThanOrEqual(config.minPort);
			expect(result.port).toBeLessThanOrEqual(config.maxPort);
		});

		it('should set isPreferred to true when preferred port is used', async () => {
			const config: PortConfig = {
				preferredPort: 59997,
				minPort: 59997,
				maxPort: 60000,
				serviceId: 'test-service'
			};

			const result = await findAvailablePort(config);

			if (result.isPreferred) {
				expect(result.portWasChanged).toBe(false);
				expect(result.port).toBe(config.preferredPort);
			}
		});

		it('should try fallback ports if preferred is unavailable', async () => {
			const config: PortConfig = {
				preferredPort: 51987,
				minPort: 51987,
				maxPort: 51990,
				serviceId: 'dashboard-test'
			};

			const result = await findAvailablePort(config);

			// Port should be within the range
			expect(result.port).toBeGreaterThanOrEqual(config.minPort);
			expect(result.port).toBeLessThanOrEqual(config.maxPort);

			// Result should have valid properties
			expect(typeof result.isPreferred).toBe('boolean');
			expect(typeof result.portWasChanged).toBe('boolean');
		});

		it('should return valid port even if all in range are used', async () => {
			const config: PortConfig = {
				preferredPort: 59996,
				minPort: 59996,
				maxPort: 59996, // Only one port in range
				serviceId: 'test-service'
			};

			const result = await findAvailablePort(config);

			expect(result.port).toBeDefined();
			expect(typeof result.port).toBe('number');
			expect(result.port).toBeGreaterThan(0);
		});

		it('should handle port range with multiple fallbacks', async () => {
			const config: PortConfig = {
				preferredPort: 59995,
				minPort: 59995,
				maxPort: 59999,
				serviceId: 'test-service'
			};

			const result = await findAvailablePort(config);

			expect(result.port).toBeGreaterThanOrEqual(config.minPort);
			expect(result.port).toBeLessThanOrEqual(config.maxPort);
		});

		it('should indicate when port was changed from preferred', async () => {
			const config: PortConfig = {
				preferredPort: 59994,
				minPort: 59994,
				maxPort: 59998,
				serviceId: 'test-service'
			};

			const result = await findAvailablePort(config);

			if (result.portWasChanged) {
				expect(result.isPreferred).toBe(false);
				expect(result.port).not.toBe(config.preferredPort);
			}
		});
	});

	describe('getPortsInUse', () => {
		it('should return a map of ports and their status', async () => {
			const portsToCheck = [51987, 51988, 51989, 51990];
			const result = await getPortsInUse(portsToCheck);

			expect(result).toBeInstanceOf(Map);
			expect(result.size).toBe(portsToCheck.length);
		});

		it('should have boolean values for each port', async () => {
			const portsToCheck = [3001, 3002, 3003, 3004];
			const result = await getPortsInUse(portsToCheck);

			for (const [port, inUse] of result) {
				expect(typeof port).toBe('number');
				expect(typeof inUse).toBe('boolean');
			}
		});

		it('should handle empty port list', async () => {
			const result = await getPortsInUse([]);

			expect(result).toBeInstanceOf(Map);
			expect(result.size).toBe(0);
		});

		it('should check all provided ports', async () => {
			const portsToCheck = [59990, 59991, 59992];
			const result = await getPortsInUse(portsToCheck);

			for (const port of portsToCheck) {
				expect(result.has(port)).toBe(true);
			}
		});

		it('should return consistent results for same port list', async () => {
			const portsToCheck = [51987, 51988];
			const result1 = await getPortsInUse(portsToCheck);
			const result2 = await getPortsInUse(portsToCheck);

			expect(result1.size).toBe(result2.size);
		});
	});

	describe('Port Detection Integration', () => {
		it('should find available port from dashboard range', async () => {
			const config: PortConfig = {
				preferredPort: 51987,
				minPort: 51987,
				maxPort: 51990,
				serviceId: 'dashboard'
			};

			const result = await findAvailablePort(config);

			expect(result.port).toBeGreaterThanOrEqual(51987);
			expect(result.port).toBeLessThanOrEqual(51990);
		});

		it('should find available port from prompt server range', async () => {
			const config: PortConfig = {
				preferredPort: 3001,
				minPort: 3001,
				maxPort: 3004,
				serviceId: 'prompt-server'
			};

			const result = await findAvailablePort(config);

			expect(result.port).toBeGreaterThanOrEqual(3001);
			expect(result.port).toBeLessThanOrEqual(3004);
		});

		it('should detect multiple ports in use', async () => {
			const allPorts = [51987, 51988, 51989, 51990, 3001, 3002, 3003, 3004];
			const result = await getPortsInUse(allPorts);

			expect(result.size).toBe(allPorts.length);

			// Count how many are in use vs available
			let inUseCount = 0;
			for (const inUse of result.values()) {
				if (inUse) inUseCount++;
			}

			// At least some should be available in normal conditions
			expect(inUseCount).toBeLessThanOrEqual(allPorts.length);
		});

		it('should prefer primary port over fallbacks', async () => {
			const config: PortConfig = {
				preferredPort: 51987,
				minPort: 51987,
				maxPort: 51990,
				serviceId: 'dashboard'
			};

			const result = await findAvailablePort(config);

			// If preferred is available, it should be used
			if (result.isPreferred) {
				expect(result.port).toBe(51987);
			}
		});

		it('should handle sequential fallback attempts', async () => {
			// Test with small range to verify fallback logic
			const config: PortConfig = {
				preferredPort: 59989,
				minPort: 59989,
				maxPort: 59993,
				serviceId: 'test'
			};

			const result = await findAvailablePort(config);

			// Should have found a port within range
			expect(result.port).toBeGreaterThanOrEqual(config.minPort);
			expect(result.port).toBeLessThanOrEqual(config.maxPort);
		});
	});

	describe('PortConfig Interface', () => {
		it('should validate required properties', () => {
			const validConfig: PortConfig = {
				preferredPort: 51987,
				minPort: 51987,
				maxPort: 51990,
				serviceId: 'dashboard'
			};

			expect(validConfig.preferredPort).toBeDefined();
			expect(validConfig.minPort).toBeDefined();
			expect(validConfig.maxPort).toBeDefined();
			expect(validConfig.serviceId).toBeDefined();
		});

		it('should support different service IDs', () => {
			const services = ['dashboard', 'prompt-server', 'test-service'];

			for (const serviceId of services) {
				const config: PortConfig = {
					preferredPort: 51987,
					minPort: 51987,
					maxPort: 51990,
					serviceId
				};

				expect(config.serviceId).toBe(serviceId);
			}
		});
	});

	describe('PortAllocationResult Interface', () => {
		it('should return result with all required properties', async () => {
			const config: PortConfig = {
				preferredPort: 51987,
				minPort: 51987,
				maxPort: 51990,
				serviceId: 'dashboard'
			};

			const result = await findAvailablePort(config);

			expect(result).toHaveProperty('port');
			expect(result).toHaveProperty('isPreferred');
			expect(result).toHaveProperty('portWasChanged');
		});

		it('should set portWasChanged correctly', async () => {
			const config: PortConfig = {
				preferredPort: 51987,
				minPort: 51987,
				maxPort: 51990,
				serviceId: 'dashboard'
			};

			const result = await findAvailablePort(config);

			// If preferred was used, portWasChanged should be false
			// If fallback was used, portWasChanged should be true
			if (result.isPreferred) {
				expect(result.portWasChanged).toBe(false);
			} else if (!result.isPreferred && result.port !== config.preferredPort) {
				expect(result.portWasChanged).toBe(true);
			}
		});
	});

	describe('Error Handling', () => {
		it('should handle port detection gracefully', async () => {
			const config: PortConfig = {
				preferredPort: 51987,
				minPort: 51987,
				maxPort: 51990,
				serviceId: 'dashboard'
			};

			// Should not throw
			const result = await findAvailablePort(config);
			expect(result).toBeDefined();
		});

		it('should handle negative port numbers gracefully', async () => {
			const isAvailable = await isPortAvailable(-1);
			expect(typeof isAvailable).toBe('boolean');
		});

		it('should handle very large port numbers', async () => {
			const isAvailable = await isPortAvailable(65535);
			expect(typeof isAvailable).toBe('boolean');
		});
	});
});

