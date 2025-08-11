/**
 * Jest Test Setup
 * Global setup and configuration for tests
 */

'use strict';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Only show console output if VERBOSE_TESTS is set
if (!process.env.VERBOSE_TESTS) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

// Global test helpers
global.testHelpers = {
  restoreConsole: () => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  },
  
  mockConsole: () => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});