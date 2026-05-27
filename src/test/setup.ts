import '@testing-library/jest-dom';

// Mock clipboard API for tests (only in browser-env tests; node-env tests skip).
const mockWriteText = vi.fn().mockResolvedValue(undefined);
if (typeof navigator !== 'undefined') {
  Object.assign(navigator, {
    clipboard: {
      writeText: mockWriteText,
    },
  });
}

// Export for use in tests
export { mockWriteText };
