import { ReactNode } from 'react';
import './battle.css';

/**
 * Variant types for FlipCard styling
 */
export type FlipCardVariant = 'requester' | 'provider';

/**
 * Props for the FlipCard component
 */
export interface FlipCardProps {
  /** Content to display on the front of the card */
  frontContent: ReactNode;
  /** Content to display on the back of the card */
  backContent: ReactNode;
  /** Whether the card is currently flipped (showing back) */
  isFlipped: boolean;
  /** Callback when flip is triggered */
  onFlip: () => void;
  /** Visual variant for styling */
  variant: FlipCardVariant;
  /** Title displayed in the card header */
  title: string;
  /** Optional step indicator (e.g., "Step 1") */
  step?: string;
}

/**
 * Icon component for the code toggle button
 */
const CodeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

/**
 * Icon component for the settings/form toggle button
 */
const SettingsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

/**
 * Icon for requester variant
 */
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

/**
 * Icon for provider variant
 */
const BotIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="18" height="10" x="3" y="11" rx="2"/>
    <circle cx="12" cy="5" r="2"/>
    <path d="M12 7v4"/>
    <line x1="8" x2="8" y1="16" y2="16"/>
    <line x1="16" x2="16" y1="16" y2="16"/>
  </svg>
);

/**
 * FlipCard component with 3D CSS transform animation.
 * Displays two sides that can be flipped between using a button toggle.
 *
 * @example
 * ```tsx
 * <FlipCard
 *   frontContent={<FormComponent />}
 *   backContent={<CodeDisplay code={code} />}
 *   isFlipped={isFlipped}
 *   onFlip={() => setIsFlipped(!isFlipped)}
 *   variant="requester"
 *   title="Requester Agent"
 *   step="Step 1"
 * />
 * ```
 */
export default function FlipCard({
  frontContent,
  backContent,
  isFlipped,
  onFlip,
  variant,
  title,
  step,
}: FlipCardProps) {
  const cardClassName = variant === 'requester' ? 'requester-card' : 'provider-card';
  const textClassName = variant === 'requester' ? 'requester-text' : 'provider-text';
  const VariantIcon = variant === 'requester' ? UserIcon : BotIcon;

  return (
    <div className={`flip-card ${isFlipped ? 'flipped' : ''}`}>
      <div className="flip-card-inner">
        {/* Front side */}
        <div className="flip-card-front">
          <div className={`battle-card ${cardClassName}`}>
            <div className="battle-card-header">
              <div className="battle-card-header-left">
                <VariantIcon />
                <span className={textClassName}>{title}</span>
                {step && <span className="flip-card-step">{step}</span>}
              </div>
              <button
                className="battle-flip-toggle"
                onClick={onFlip}
                title="Show code"
                aria-label="Flip to show code"
              >
                <CodeIcon />
              </button>
            </div>
            <div className="battle-card-body">
              {frontContent}
            </div>
          </div>
        </div>

        {/* Back side */}
        <div className="flip-card-back">
          <div className={`battle-card ${cardClassName}`}>
            <div className="battle-card-header">
              <div className="battle-card-header-left">
                <CodeIcon />
                <span>Generated Code</span>
                {step && <span className="flip-card-step">{step}</span>}
              </div>
              <button
                className="battle-flip-toggle"
                onClick={onFlip}
                title="Show form"
                aria-label="Flip to show form"
              >
                <SettingsIcon />
              </button>
            </div>
            <div className="battle-card-body battle-code-body">
              {backContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
