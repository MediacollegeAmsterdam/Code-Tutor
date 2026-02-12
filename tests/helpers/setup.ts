/**
 * Jest setup configuration
 * Runs before all tests to configure the test environment
 */

// Extend Jest matchers
import '@testing-library/jest-dom';

// Set longer timeout for VS Code extension tests
jest.setTimeout(10000);

// Suppress console output during tests (optional - uncomment if desired)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
