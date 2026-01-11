import '@testing-library/jest-dom';

// Mock clipboard API for tests
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Export for use in tests
export { mockWriteText };
