import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AgentBattle from './AgentBattle';

// Mock the hooks
vi.mock('../../hooks/useBattleState', () => ({
  useBattleState: () => ({
    state: {
      requesterWallet: {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        label: 'Requester Agent',
        ethBalance: '0.5 ETH',
        usdcBalance: '1,000.00 USDC',
        role: 'requester',
      },
      providerWallet: {
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        label: 'Provider Agent',
        ethBalance: '0.25 ETH',
        usdcBalance: '500.00 USDC',
        role: 'provider',
      },
      transaction: null,
      timeline: [],
      isSimulating: false,
    },
    dispatch: vi.fn(),
    canPerformAction: true,
  }),
}));

vi.mock('../../hooks/usePlaygroundContext', () => ({
  usePlaygroundContext: vi.fn(),
  PlaygroundContext: {},
}));

describe('AgentBattle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FlipCard integration', () => {
    it('renders FlipCard component for Create Transaction', () => {
      const { container } = render(<AgentBattle />);

      // Should have the new flip-card class (not battle-flip-card)
      const flipCard = container.querySelector('.flip-card');
      expect(flipCard).toBeInTheDocument();
    });

    it('does not use old battle-flip-card class', () => {
      const { container } = render(<AgentBattle />);

      // Should NOT have the old battle-flip-card class
      const oldFlipCard = container.querySelector('.battle-flip-card');
      expect(oldFlipCard).not.toBeInTheDocument();
    });

    it('renders FlipCard with correct structure', () => {
      const { container } = render(<AgentBattle />);

      expect(container.querySelector('.flip-card-inner')).toBeInTheDocument();
      expect(container.querySelector('.flip-card-front')).toBeInTheDocument();
      expect(container.querySelector('.flip-card-back')).toBeInTheDocument();
    });

    it('FlipCard has requester-card styling', () => {
      const { container } = render(<AgentBattle />);

      const cards = container.querySelectorAll('.requester-card');
      // Both front and back of the FlipCard have requester-card class
      expect(cards.length).toBeGreaterThanOrEqual(2);
    });

    it('shows "Step 1" indicator on FlipCard', () => {
      render(<AgentBattle />);

      const stepIndicators = screen.getAllByText('Step 1');
      expect(stepIndicators.length).toBeGreaterThanOrEqual(1);
    });

    it('shows Requester Agent title on FlipCard', () => {
      render(<AgentBattle />);

      expect(screen.getByText('Requester Agent')).toBeInTheDocument();
    });
  });

  describe('flip animation behavior', () => {
    it('FlipCard starts in non-flipped state', () => {
      const { container } = render(<AgentBattle />);

      const flipCard = container.querySelector('.flip-card');
      expect(flipCard).not.toHaveClass('flipped');
    });

    it('flip toggle button exists on front side', () => {
      render(<AgentBattle />);

      expect(screen.getByTitle('Show code')).toBeInTheDocument();
    });

    it('flip toggle button exists on back side', () => {
      render(<AgentBattle />);

      expect(screen.getByTitle('Show form')).toBeInTheDocument();
    });

    it('clicking front flip button flips the card', () => {
      const { container } = render(<AgentBattle />);

      const showCodeButton = screen.getByTitle('Show code');
      fireEvent.click(showCodeButton);

      const flipCard = container.querySelector('.flip-card');
      expect(flipCard).toHaveClass('flipped');
    });

    it('clicking back flip button unflips the card', () => {
      const { container } = render(<AgentBattle />);

      // First flip to show back
      const showCodeButton = screen.getByTitle('Show code');
      fireEvent.click(showCodeButton);

      // Then flip back to front
      const showFormButton = screen.getByTitle('Show form');
      fireEvent.click(showFormButton);

      const flipCard = container.querySelector('.flip-card');
      expect(flipCard).not.toHaveClass('flipped');
    });
  });

  describe('BattleCodeDisplay integration', () => {
    it('renders BattleCodeDisplay on back of FlipCard', () => {
      const { container } = render(<AgentBattle />);

      expect(container.querySelector('.battle-code-display')).toBeInTheDocument();
    });

    it('shows syntax-highlighted code', () => {
      const { container } = render(<AgentBattle />);

      // The prism-react-renderer creates pre tags with code
      const codeBlock = container.querySelector('.battle-code');
      expect(codeBlock).toBeInTheDocument();
    });

    it('shows copy button on code display', () => {
      const { container } = render(<AgentBattle />);

      const copyButton = container.querySelector('.battle-code-copy-btn');
      expect(copyButton).toBeInTheDocument();
    });

    it('shows code comment', () => {
      render(<AgentBattle />);

      expect(screen.getByText('// Create a new ACTP transaction')).toBeInTheDocument();
    });
  });

  describe('dynamic code generation', () => {
    // Helper to get the code container's text content
    const getCodeContent = (container: HTMLElement) => {
      const codeContainer = container.querySelector('.battle-code-container');
      return codeContainer?.textContent || '';
    };

    it('code includes default provider address', () => {
      const { container } = render(<AgentBattle />);

      const codeContent = getCodeContent(container);
      expect(codeContent).toContain('0x742d35Cc6634C0532925a3b844Bc9e7595f8fE21');
    });

    it('code includes default amount', () => {
      const { container } = render(<AgentBattle />);

      // Default amount is 50
      const codeContent = getCodeContent(container);
      expect(codeContent).toContain("parseUnits('50', 6)");
    });

    it('code updates when form amount changes', async () => {
      const { container } = render(<AgentBattle />);

      // Find the amount input and change it
      const amountInput = screen.getByPlaceholderText('100');
      fireEvent.change(amountInput, { target: { value: '75' } });

      // The code should now show the new amount
      await waitFor(() => {
        const codeContent = getCodeContent(container);
        expect(codeContent).toContain("parseUnits('75', 6)");
      });
    });

    it('code updates when form deadline changes', async () => {
      const { container } = render(<AgentBattle />);

      // Find deadline inputs (there are two - we want the one in the form row)
      const deadlineInputs = screen.getAllByDisplayValue('24');
      const deadlineInput = deadlineInputs[0];
      fireEvent.change(deadlineInput, { target: { value: '48' } });

      // The code should now show the new deadline (48 hours = 172800 seconds)
      await waitFor(() => {
        const codeContent = getCodeContent(container);
        expect(codeContent).toContain('+ 172800');
      });
    });

    it('code updates when form dispute window changes', async () => {
      const { container } = render(<AgentBattle />);

      // Find dispute window input
      const disputeInputs = screen.getAllByDisplayValue('2');
      const disputeInput = disputeInputs[0];
      fireEvent.change(disputeInput, { target: { value: '4' } });

      // The code should now show the new dispute window (4 hours = 14400 seconds)
      await waitFor(() => {
        const codeContent = getCodeContent(container);
        expect(codeContent).toContain('disputeWindow: 14400');
      });
    });

    it('code updates when form description changes', async () => {
      const { container } = render(<AgentBattle />);

      // Find description textarea
      const descriptionInput = screen.getByPlaceholderText('Describe the work...');
      fireEvent.change(descriptionInput, { target: { value: 'Custom task description' } });

      // The code should now show the new metadata
      await waitFor(() => {
        const codeContent = getCodeContent(container);
        expect(codeContent).toContain("metadata: 'Custom task description'");
      });
    });

    it('code updates when provider address changes', async () => {
      const { container } = render(<AgentBattle />);

      // Find provider address input
      const providerInput = screen.getByPlaceholderText('0x...');
      fireEvent.change(providerInput, { target: { value: '0xNewProviderAddress1234567890abcdef12' } });

      // The code should now show the new provider
      await waitFor(() => {
        const codeContent = getCodeContent(container);
        expect(codeContent).toContain("provider: '0xNewProviderAddress1234567890abcdef12'");
      });
    });
  });

  describe('form content on front side', () => {
    it('renders provider address input', () => {
      render(<AgentBattle />);

      expect(screen.getByPlaceholderText('0x...')).toBeInTheDocument();
    });

    it('renders amount input', () => {
      render(<AgentBattle />);

      expect(screen.getByPlaceholderText('100')).toBeInTheDocument();
    });

    it('renders description textarea', () => {
      render(<AgentBattle />);

      expect(screen.getByPlaceholderText('Describe the work...')).toBeInTheDocument();
    });

    it('renders deadline input', () => {
      render(<AgentBattle />);

      expect(screen.getByText('Deadline (hours)')).toBeInTheDocument();
    });

    it('renders dispute window input', () => {
      render(<AgentBattle />);

      expect(screen.getByText('Dispute Window (hours)')).toBeInTheDocument();
    });

    it('renders Create Transaction button on front', () => {
      render(<AgentBattle />);

      const createButtons = screen.getAllByText('Create Transaction');
      expect(createButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('wallet info display', () => {
    it('displays requester wallet address', () => {
      render(<AgentBattle />);

      expect(screen.getByText('0x1234567890abcdef1234567890abcdef12345678')).toBeInTheDocument();
    });

    it('displays requester ETH balance', () => {
      render(<AgentBattle />);

      expect(screen.getByText('0.5 ETH')).toBeInTheDocument();
    });

    it('displays requester USDC balance', () => {
      render(<AgentBattle />);

      expect(screen.getByText('1,000.00 USDC')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('flip buttons have proper aria-labels', () => {
      render(<AgentBattle />);

      expect(screen.getByLabelText('Flip to show code')).toBeInTheDocument();
      expect(screen.getByLabelText('Flip to show form')).toBeInTheDocument();
    });
  });
});
