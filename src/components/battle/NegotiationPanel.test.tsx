import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NegotiationPanel from './NegotiationPanel';
import { NegotiationState, NegotiationOffer } from '../../types/battle';

describe('NegotiationPanel', () => {
  const mockOnCounterOffer = vi.fn();
  const mockOnAccept = vi.fn();

  const createMockOffer = (overrides: Partial<NegotiationOffer> = {}): NegotiationOffer => ({
    id: 'offer-1',
    amount: '100',
    from: 'provider',
    timestamp: Date.now(),
    round: 1,
    type: 'initial',
    ...overrides,
  });

  const createMockNegotiation = (overrides: Partial<NegotiationState> = {}): NegotiationState => ({
    currentRound: 1,
    maxRounds: 3,
    history: [createMockOffer()],
    currentOffer: createMockOffer(),
    whoseTurn: 'requester',
    isActive: true,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders nothing when negotiation is not active', () => {
      const { container } = render(
        <NegotiationPanel
          negotiation={createMockNegotiation({ isActive: false })}
          variant="requester"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      expect(container.querySelector('.negotiation-panel')).not.toBeInTheDocument();
    });

    it('renders nothing when history is empty', () => {
      const { container } = render(
        <NegotiationPanel
          negotiation={createMockNegotiation({ history: [] })}
          variant="requester"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      expect(container.querySelector('.negotiation-panel')).not.toBeInTheDocument();
    });

    it('renders when negotiation is active with history', () => {
      const { container } = render(
        <NegotiationPanel
          negotiation={createMockNegotiation()}
          variant="requester"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      expect(container.querySelector('.negotiation-panel')).toBeInTheDocument();
    });

    it('shows round indicator', () => {
      render(
        <NegotiationPanel
          negotiation={createMockNegotiation({ currentRound: 2, maxRounds: 3 })}
          variant="requester"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      expect(screen.getByText('Round 2 / 3')).toBeInTheDocument();
    });

    it('shows max rounds warning when reached', () => {
      render(
        <NegotiationPanel
          negotiation={createMockNegotiation({ currentRound: 3, maxRounds: 3 })}
          variant="requester"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      expect(screen.getByText('Max rounds reached')).toBeInTheDocument();
    });
  });

  describe('offer history', () => {
    it('displays initial offer in history', () => {
      const { container } = render(
        <NegotiationPanel
          negotiation={createMockNegotiation()}
          variant="requester"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      expect(screen.getByText('Initial Quote')).toBeInTheDocument();
      // Check offer amount is in history (may appear multiple places)
      const offerAmounts = container.querySelectorAll('.negotiation-offer-amount');
      const has100USDC = Array.from(offerAmounts).some(el => el.textContent === '100 USDC');
      expect(has100USDC).toBe(true);
    });

    it('displays provider offers with provider icon', () => {
      const { container } = render(
        <NegotiationPanel
          negotiation={createMockNegotiation()}
          variant="requester"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      const providerOffers = container.querySelectorAll('.negotiation-offer.provider');
      expect(providerOffers.length).toBeGreaterThanOrEqual(1);
    });

    it('displays requester counter offers', () => {
      const counterOffer = createMockOffer({
        id: 'offer-2',
        amount: '90',
        from: 'requester',
        round: 2,
        type: 'counter',
      });

      render(
        <NegotiationPanel
          negotiation={createMockNegotiation({
            currentRound: 2,
            history: [createMockOffer(), counterOffer],
            currentOffer: counterOffer,
          })}
          variant="provider"
          currentAmount="90"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      expect(screen.getByText('Counter #1')).toBeInTheDocument();
      expect(screen.getByText('90 USDC')).toBeInTheDocument();
    });

    it('displays multiple offers in history', () => {
      const offers = [
        createMockOffer({ id: 'offer-1', amount: '100', from: 'provider', round: 1, type: 'initial' }),
        createMockOffer({ id: 'offer-2', amount: '80', from: 'requester', round: 2, type: 'counter' }),
        createMockOffer({ id: 'offer-3', amount: '90', from: 'provider', round: 3, type: 'counter' }),
      ];

      const { container } = render(
        <NegotiationPanel
          negotiation={createMockNegotiation({
            currentRound: 3,
            history: offers,
            currentOffer: offers[2],
          })}
          variant="requester"
          currentAmount="90"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      // Check all offer amounts are displayed
      const offerAmounts = container.querySelectorAll('.negotiation-offer-amount');
      const amounts = Array.from(offerAmounts).map(el => el.textContent);
      expect(amounts).toContain('100 USDC');
      expect(amounts).toContain('80 USDC');
      expect(amounts).toContain('90 USDC');
    });
  });

  describe('requester actions', () => {
    it("shows counter and accept buttons when it's requester's turn", () => {
      render(
        <NegotiationPanel
          negotiation={createMockNegotiation({ whoseTurn: 'requester' })}
          variant="requester"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      expect(screen.getByPlaceholderText('Your counter amount')).toBeInTheDocument();
      expect(screen.getByText('Counter')).toBeInTheDocument();
      expect(screen.getByText('Accept 100 USDC')).toBeInTheDocument();
    });

    it("shows waiting message when it's not requester's turn", () => {
      render(
        <NegotiationPanel
          negotiation={createMockNegotiation({ whoseTurn: 'provider' })}
          variant="requester"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      expect(screen.getByText(/Waiting for provider to respond/)).toBeInTheDocument();
    });

    it('calls onCounterOffer when counter button is clicked', () => {
      render(
        <NegotiationPanel
          negotiation={createMockNegotiation({ whoseTurn: 'requester' })}
          variant="requester"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      const input = screen.getByPlaceholderText('Your counter amount');
      fireEvent.change(input, { target: { value: '85' } });

      const counterButton = screen.getByText('Counter');
      fireEvent.click(counterButton);

      expect(mockOnCounterOffer).toHaveBeenCalledWith('85');
    });

    it('calls onAccept when accept button is clicked', () => {
      render(
        <NegotiationPanel
          negotiation={createMockNegotiation({ whoseTurn: 'requester' })}
          variant="requester"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      const acceptButton = screen.getByText('Accept 100 USDC');
      fireEvent.click(acceptButton);

      expect(mockOnAccept).toHaveBeenCalled();
    });

    it('disables counter button when input is empty', () => {
      render(
        <NegotiationPanel
          negotiation={createMockNegotiation({ whoseTurn: 'requester' })}
          variant="requester"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      const counterButton = screen.getByText('Counter');
      expect(counterButton).toBeDisabled();
    });

    it('disables counter when max rounds reached', () => {
      render(
        <NegotiationPanel
          negotiation={createMockNegotiation({ currentRound: 3, maxRounds: 3, whoseTurn: 'requester' })}
          variant="requester"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      // Counter input should not be present when max rounds reached
      expect(screen.queryByPlaceholderText('Your counter amount')).not.toBeInTheDocument();
      expect(screen.getByText('Maximum rounds reached. You must accept or cancel.')).toBeInTheDocument();
    });
  });

  describe('provider actions', () => {
    it("shows counter and accept buttons when it's provider's turn", () => {
      const counterOffer = createMockOffer({
        id: 'offer-2',
        amount: '85',
        from: 'requester',
        round: 2,
        type: 'counter',
      });

      render(
        <NegotiationPanel
          negotiation={createMockNegotiation({
            currentRound: 2,
            history: [createMockOffer(), counterOffer],
            currentOffer: counterOffer,
            whoseTurn: 'provider',
          })}
          variant="provider"
          currentAmount="85"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      expect(screen.getByText('Accept 85 USDC')).toBeInTheDocument();
    });

    it("shows waiting message when it's not provider's turn", () => {
      render(
        <NegotiationPanel
          negotiation={createMockNegotiation({ whoseTurn: 'requester' })}
          variant="provider"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      expect(screen.getByText(/Waiting for requester to respond/)).toBeInTheDocument();
    });
  });

  describe('styling variants', () => {
    it('applies requester variant styling', () => {
      const { container } = render(
        <NegotiationPanel
          negotiation={createMockNegotiation()}
          variant="requester"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      const panel = container.querySelector('.negotiation-panel');
      expect(panel).toHaveAttribute('data-variant', 'requester');
    });

    it('applies provider variant styling', () => {
      const { container } = render(
        <NegotiationPanel
          negotiation={createMockNegotiation({ whoseTurn: 'provider' })}
          variant="provider"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      const panel = container.querySelector('.negotiation-panel');
      expect(panel).toHaveAttribute('data-variant', 'provider');
    });
  });

  describe('disabled state', () => {
    it('disables accept button when disabled prop is true', () => {
      render(
        <NegotiationPanel
          negotiation={createMockNegotiation({ whoseTurn: 'requester' })}
          variant="requester"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
          disabled={true}
        />
      );

      const acceptButton = screen.getByText('Accept 100 USDC');
      expect(acceptButton).toBeDisabled();
    });

    it('hides counter form when disabled prop is true', () => {
      render(
        <NegotiationPanel
          negotiation={createMockNegotiation({ whoseTurn: 'requester' })}
          variant="requester"
          currentAmount="100"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
          disabled={true}
        />
      );

      // Counter form is not shown when disabled
      expect(screen.queryByPlaceholderText('Your counter amount')).not.toBeInTheDocument();
    });
  });

  describe('current amount display', () => {
    it('shows current offer amount', () => {
      render(
        <NegotiationPanel
          negotiation={createMockNegotiation({ whoseTurn: 'requester' })}
          variant="requester"
          currentAmount="150"
          onCounterOffer={mockOnCounterOffer}
          onAccept={mockOnAccept}
        />
      );

      expect(screen.getByText('150 USDC')).toBeInTheDocument();
    });
  });
});
