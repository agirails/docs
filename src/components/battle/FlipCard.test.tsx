import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FlipCard from './FlipCard';

describe('FlipCard', () => {
  const defaultProps = {
    frontContent: <div data-testid="front">Front Content</div>,
    backContent: <div data-testid="back">Back Content</div>,
    isFlipped: false,
    onFlip: vi.fn(),
    variant: 'requester' as const,
    title: 'Test Card',
  };

  describe('render tests', () => {
    it('renders front content correctly', () => {
      render(<FlipCard {...defaultProps} />);

      expect(screen.getByTestId('front')).toBeInTheDocument();
      expect(screen.getByText('Front Content')).toBeInTheDocument();
    });

    it('renders back content correctly', () => {
      render(<FlipCard {...defaultProps} />);

      expect(screen.getByTestId('back')).toBeInTheDocument();
      expect(screen.getByText('Back Content')).toBeInTheDocument();
    });

    it('renders title correctly', () => {
      render(<FlipCard {...defaultProps} />);

      expect(screen.getByText('Test Card')).toBeInTheDocument();
    });

    it('renders step indicator when provided', () => {
      render(<FlipCard {...defaultProps} step="Step 1" />);

      expect(screen.getAllByText('Step 1')).toHaveLength(2); // Both front and back have step
    });

    it('does not render step indicator when not provided', () => {
      render(<FlipCard {...defaultProps} />);

      expect(screen.queryByText(/Step/)).not.toBeInTheDocument();
    });
  });

  describe('flip toggle tests', () => {
    it('calls onFlip when front flip button is clicked', () => {
      const onFlip = vi.fn();
      render(<FlipCard {...defaultProps} onFlip={onFlip} />);

      const flipButtons = screen.getAllByRole('button');
      fireEvent.click(flipButtons[0]);

      expect(onFlip).toHaveBeenCalledTimes(1);
    });

    it('calls onFlip when back flip button is clicked', () => {
      const onFlip = vi.fn();
      render(<FlipCard {...defaultProps} onFlip={onFlip} />);

      const flipButtons = screen.getAllByRole('button');
      fireEvent.click(flipButtons[1]);

      expect(onFlip).toHaveBeenCalledTimes(1);
    });

    it('front flip button has correct aria-label', () => {
      render(<FlipCard {...defaultProps} />);

      expect(screen.getByLabelText('Flip to show code')).toBeInTheDocument();
    });

    it('back flip button has correct aria-label', () => {
      render(<FlipCard {...defaultProps} />);

      expect(screen.getByLabelText('Flip to show form')).toBeInTheDocument();
    });

    it('front flip button has correct title', () => {
      render(<FlipCard {...defaultProps} />);

      expect(screen.getByTitle('Show code')).toBeInTheDocument();
    });

    it('back flip button has correct title', () => {
      render(<FlipCard {...defaultProps} />);

      expect(screen.getByTitle('Show form')).toBeInTheDocument();
    });
  });

  describe('variant styling tests', () => {
    it('applies requester-card class for requester variant', () => {
      const { container } = render(<FlipCard {...defaultProps} variant="requester" />);

      const cards = container.querySelectorAll('.requester-card');
      expect(cards.length).toBe(2); // Front and back both have card
    });

    it('applies provider-card class for provider variant', () => {
      const { container } = render(<FlipCard {...defaultProps} variant="provider" />);

      const cards = container.querySelectorAll('.provider-card');
      expect(cards.length).toBe(2); // Front and back both have card
    });

    it('applies requester-text class for requester variant title', () => {
      const { container } = render(<FlipCard {...defaultProps} variant="requester" />);

      expect(container.querySelector('.requester-text')).toBeInTheDocument();
    });

    it('applies provider-text class for provider variant title', () => {
      const { container } = render(<FlipCard {...defaultProps} variant="provider" />);

      expect(container.querySelector('.provider-text')).toBeInTheDocument();
    });
  });

  describe('flipped state tests', () => {
    it('does not have flipped class when isFlipped is false', () => {
      const { container } = render(<FlipCard {...defaultProps} isFlipped={false} />);

      const flipCard = container.querySelector('.flip-card');
      expect(flipCard).not.toHaveClass('flipped');
    });

    it('has flipped class when isFlipped is true', () => {
      const { container } = render(<FlipCard {...defaultProps} isFlipped={true} />);

      const flipCard = container.querySelector('.flip-card');
      expect(flipCard).toHaveClass('flipped');
    });
  });

  describe('CSS structure tests', () => {
    it('has correct flip-card structure', () => {
      const { container } = render(<FlipCard {...defaultProps} />);

      expect(container.querySelector('.flip-card')).toBeInTheDocument();
      expect(container.querySelector('.flip-card-inner')).toBeInTheDocument();
      expect(container.querySelector('.flip-card-front')).toBeInTheDocument();
      expect(container.querySelector('.flip-card-back')).toBeInTheDocument();
    });

    it('has battle-card class on both sides', () => {
      const { container } = render(<FlipCard {...defaultProps} />);

      const battleCards = container.querySelectorAll('.battle-card');
      expect(battleCards.length).toBe(2);
    });

    it('has battle-card-header on both sides', () => {
      const { container } = render(<FlipCard {...defaultProps} />);

      const headers = container.querySelectorAll('.battle-card-header');
      expect(headers.length).toBe(2);
    });

    it('has battle-card-body on both sides', () => {
      const { container } = render(<FlipCard {...defaultProps} />);

      const bodies = container.querySelectorAll('.battle-card-body');
      expect(bodies.length).toBe(2);
    });

    it('has battle-flip-toggle buttons', () => {
      const { container } = render(<FlipCard {...defaultProps} />);

      const toggles = container.querySelectorAll('.battle-flip-toggle');
      expect(toggles.length).toBe(2);
    });
  });

  describe('back header content tests', () => {
    it('shows "Generated Code" text on back side', () => {
      render(<FlipCard {...defaultProps} />);

      expect(screen.getByText('Generated Code')).toBeInTheDocument();
    });

    it('shows code body class on back side', () => {
      const { container } = render(<FlipCard {...defaultProps} />);

      expect(container.querySelector('.battle-code-body')).toBeInTheDocument();
    });
  });
});
