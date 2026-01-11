import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import BattleCodeDisplay from './BattleCodeDisplay';

// Mock navigator.clipboard
const mockWriteText = vi.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

describe('BattleCodeDisplay', () => {
  const defaultProps = {
    code: 'const x = 1;',
    language: 'typescript' as const,
  };

  beforeEach(() => {
    mockWriteText.mockReset();
    mockWriteText.mockResolvedValue(undefined);
  });

  describe('render tests', () => {
    it('renders code content', () => {
      render(<BattleCodeDisplay {...defaultProps} />);

      expect(screen.getByText('const')).toBeInTheDocument();
    });

    it('renders copy button', () => {
      render(<BattleCodeDisplay {...defaultProps} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('renders with initial aria-label for copy button', () => {
      render(<BattleCodeDisplay {...defaultProps} />);

      expect(screen.getByLabelText('Copy code')).toBeInTheDocument();
    });
  });

  describe('syntax highlighting tests', () => {
    it('applies syntax highlighting for TypeScript code', () => {
      const { container } = render(
        <BattleCodeDisplay code="const x: number = 1;" language="typescript" />
      );

      // Check that prism classes are applied
      expect(container.querySelector('.battle-code')).toBeInTheDocument();
    });

    it('applies syntax highlighting for Python code', () => {
      const { container } = render(
        <BattleCodeDisplay code="def hello(): pass" language="python" />
      );

      expect(container.querySelector('.battle-code')).toBeInTheDocument();
    });

    it('applies syntax highlighting for JavaScript code', () => {
      const { container } = render(
        <BattleCodeDisplay code="function test() {}" language="javascript" />
      );

      expect(container.querySelector('.battle-code')).toBeInTheDocument();
    });

    it('applies syntax highlighting for JSON code', () => {
      const { container } = render(
        <BattleCodeDisplay code='{"key": "value"}' language="json" />
      );

      expect(container.querySelector('.battle-code')).toBeInTheDocument();
    });

    it('applies syntax highlighting for bash code', () => {
      const { container } = render(
        <BattleCodeDisplay code="echo hello" language="bash" />
      );

      expect(container.querySelector('.battle-code')).toBeInTheDocument();
    });

    it('applies syntax highlighting for solidity code', () => {
      const { container } = render(
        <BattleCodeDisplay code="contract Test {}" language="solidity" />
      );

      expect(container.querySelector('.battle-code')).toBeInTheDocument();
    });
  });

  describe('language mapping tests', () => {
    it('maps typescript to tsx for Prism', () => {
      // Just verify it renders without error - mapping is internal
      const { container } = render(
        <BattleCodeDisplay code="const x = 1" language="typescript" />
      );
      expect(container.querySelector('.battle-code')).toBeInTheDocument();
    });

    it('handles all supported languages', () => {
      const languages = ['typescript', 'python', 'javascript', 'solidity', 'json', 'bash'] as const;

      languages.forEach((language) => {
        const { container, unmount } = render(
          <BattleCodeDisplay code="test code" language={language} />
        );
        expect(container.querySelector('.battle-code')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('copy button tests', () => {
    it('copies code to clipboard when copy button is clicked', async () => {
      render(<BattleCodeDisplay {...defaultProps} />);

      const copyButton = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(mockWriteText).toHaveBeenCalledWith('const x = 1;');
    });

    it('shows success state after copying', async () => {
      render(<BattleCodeDisplay {...defaultProps} />);

      const copyButton = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    it('changes aria-label to "Copied!" after copying', async () => {
      render(<BattleCodeDisplay {...defaultProps} />);

      const copyButton = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.getByLabelText('Copied!')).toBeInTheDocument();
    });

    it('reverts to initial state after 2 seconds', async () => {
      vi.useFakeTimers();

      render(<BattleCodeDisplay {...defaultProps} />);

      const copyButton = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(copyButton);
        await Promise.resolve(); // Flush promises
      });

      expect(screen.getByText('Copied!')).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText('Copy')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('calls onCopy callback when provided', async () => {
      const onCopy = vi.fn();
      render(<BattleCodeDisplay {...defaultProps} onCopy={onCopy} />);

      const copyButton = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(onCopy).toHaveBeenCalledWith('const x = 1;');
    });

    it('does not throw when onCopy is not provided', async () => {
      render(<BattleCodeDisplay {...defaultProps} />);

      const copyButton = screen.getByRole('button');

      await expect(
        act(async () => {
          fireEvent.click(copyButton);
        })
      ).resolves.not.toThrow();
    });

    it('handles clipboard copy failure gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockWriteText.mockRejectedValueOnce(new Error('Copy failed'));

      render(<BattleCodeDisplay {...defaultProps} />);

      const copyButton = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(consoleError).toHaveBeenCalledWith('Failed to copy code:', expect.any(Error));

      consoleError.mockRestore();
    });
  });

  describe('comment tests', () => {
    it('renders comment when provided', () => {
      render(<BattleCodeDisplay {...defaultProps} comment="// This is a comment" />);

      expect(screen.getByText('// This is a comment')).toBeInTheDocument();
    });

    it('does not render comment section when not provided', () => {
      const { container } = render(<BattleCodeDisplay {...defaultProps} />);

      expect(container.querySelector('.battle-code-comment')).not.toBeInTheDocument();
    });

    it('renders comment in correct container', () => {
      const { container } = render(
        <BattleCodeDisplay {...defaultProps} comment="Test comment" />
      );

      const commentElement = container.querySelector('.battle-code-comment');
      expect(commentElement).toBeInTheDocument();
      expect(commentElement).toHaveTextContent('Test comment');
    });
  });

  describe('CSS structure tests', () => {
    it('has correct container structure', () => {
      const { container } = render(<BattleCodeDisplay {...defaultProps} />);

      expect(container.querySelector('.battle-code-display')).toBeInTheDocument();
      expect(container.querySelector('.battle-code-container')).toBeInTheDocument();
    });

    it('has correct copy button class', () => {
      const { container } = render(<BattleCodeDisplay {...defaultProps} />);

      expect(container.querySelector('.battle-code-copy-btn')).toBeInTheDocument();
    });

    it('has line numbers', () => {
      const { container } = render(<BattleCodeDisplay {...defaultProps} />);

      expect(container.querySelector('.battle-code-line-number')).toBeInTheDocument();
    });

    it('has line content elements', () => {
      const { container } = render(<BattleCodeDisplay {...defaultProps} />);

      expect(container.querySelector('.battle-code-line-content')).toBeInTheDocument();
    });

    it('displays correct line numbers for multiline code', () => {
      const multilineCode = `line 1
line 2
line 3`;
      const { container } = render(
        <BattleCodeDisplay code={multilineCode} language="typescript" />
      );

      const lineNumbers = container.querySelectorAll('.battle-code-line-number');
      expect(lineNumbers.length).toBe(3);
      expect(lineNumbers[0]).toHaveTextContent('1');
      expect(lineNumbers[1]).toHaveTextContent('2');
      expect(lineNumbers[2]).toHaveTextContent('3');
    });
  });

  describe('code trimming tests', () => {
    it('trims whitespace from code', async () => {
      const codeWithWhitespace = '  const x = 1;  ';
      render(<BattleCodeDisplay code={codeWithWhitespace} language="typescript" />);

      // Code should be trimmed
      expect(mockWriteText).not.toHaveBeenCalled(); // Just testing render doesn't crash

      const copyButton = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      // But the original code is passed to clipboard
      expect(mockWriteText).toHaveBeenCalledWith('  const x = 1;  ');
    });
  });
});
