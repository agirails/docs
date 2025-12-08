import { useState } from 'react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
}

const wallets = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M24.0891 3.5L15.3441 10.0067L16.9174 6.21333L24.0891 3.5Z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3.90234 3.5L12.5773 10.0717L11.0823 6.21333L3.90234 3.5Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20.8457 18.6533L18.5107 22.19L23.5757 23.59L25.0357 18.7367L20.8457 18.6533Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2.97266 18.7367L4.42432 23.59L9.48932 22.19L7.15432 18.6533L2.97266 18.7367Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9.21016 12.3083L7.80182 14.4083L12.8318 14.6383L12.6485 9.25833L9.21016 12.3083Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18.7812 12.3083L15.2979 9.19333L15.1729 14.6383L20.1962 14.4083L18.7812 12.3083Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9.48926 22.19L12.5176 20.7167L9.90426 18.7717L9.48926 22.19Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15.4746 20.7167L18.5096 22.19L18.0879 18.7717L15.4746 20.7167Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="6" fill="#0052FF"/>
        <path d="M14 5C9.02944 5 5 9.02944 5 14C5 18.9706 9.02944 23 14 23C18.9706 23 23 18.9706 23 14C23 9.02944 18.9706 5 14 5ZM11.5 12.25C11.5 11.8358 11.8358 11.5 12.25 11.5H15.75C16.1642 11.5 16.5 11.8358 16.5 12.25V15.75C16.5 16.1642 16.1642 16.5 15.75 16.5H12.25C11.8358 16.5 11.5 16.1642 11.5 15.75V12.25Z" fill="white"/>
      </svg>
    ),
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="6" fill="#3B99FC"/>
        <path d="M9.17 11.08C12.14 8.11 16.86 8.11 19.83 11.08L20.19 11.44C20.34 11.59 20.34 11.83 20.19 11.98L18.85 13.32C18.77 13.4 18.65 13.4 18.57 13.32L18.05 12.8C16.01 10.76 12.99 10.76 10.95 12.8L10.39 13.36C10.31 13.44 10.19 13.44 10.11 13.36L8.77 12.02C8.62 11.87 8.62 11.63 8.77 11.48L9.17 11.08ZM22.31 13.56L23.49 14.74C23.64 14.89 23.64 15.13 23.49 15.28L18.58 20.19C18.43 20.34 18.19 20.34 18.04 20.19L14.54 16.69C14.5 16.65 14.44 16.65 14.4 16.69L10.9 20.19C10.75 20.34 10.51 20.34 10.36 20.19L5.51 15.28C5.36 15.13 5.36 14.89 5.51 14.74L6.69 13.56C6.84 13.41 7.08 13.41 7.23 13.56L10.73 17.06C10.77 17.1 10.83 17.1 10.87 17.06L14.37 13.56C14.52 13.41 14.76 13.41 14.91 13.56L18.41 17.06C18.45 17.1 18.51 17.1 18.55 17.06L22.05 13.56C22.2 13.41 22.44 13.41 22.31 13.56Z" fill="white"/>
      </svg>
    ),
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="6" fill="#001E59"/>
        <path d="M7 18.5V20C7 20.5523 7.44772 21 8 21H9.5" stroke="#FF4000" strokeWidth="2" strokeLinecap="round"/>
        <path d="M7 14.5V17C7 18.6569 8.34315 20 10 20H11.5" stroke="#FF9901" strokeWidth="2" strokeLinecap="round"/>
        <path d="M7 10.5V13C7 16.3137 9.68629 19 13 19H14.5" stroke="#FFFF00" strokeWidth="2" strokeLinecap="round"/>
        <path d="M7 7V9C7 14.5228 11.4772 19 17 19H21" stroke="#01DA40" strokeWidth="2" strokeLinecap="round"/>
        <path d="M10 7H17C19.7614 7 22 9.23858 22 12V14" stroke="#00AAFF" strokeWidth="2" strokeLinecap="round"/>
        <path d="M14 7H18C19.6569 7 21 8.34315 21 10V10.5" stroke="#8B49F7" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function WalletModal({ isOpen, onClose, onConnect }: WalletModalProps) {
  const [connecting, setConnecting] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleWalletClick = async (walletId: string) => {
    setConnecting(walletId);
    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setConnecting(null);
    onConnect();
    onClose();
  };

  return (
    <div className="pg-modal-overlay" onClick={onClose}>
      <div className="pg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pg-modal-header">
          <h2 className="pg-modal-title">Connect Wallet</h2>
          <button className="pg-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="pg-modal-body">
          <p className="pg-modal-subtitle">
            Connect with one of our available wallet providers (simulated for playground).
          </p>

          <div className="pg-wallet-list">
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                className={`pg-wallet-option ${connecting === wallet.id ? 'connecting' : ''}`}
                onClick={() => handleWalletClick(wallet.id)}
                disabled={connecting !== null}
              >
                <div className="pg-wallet-option-icon">{wallet.icon}</div>
                <span className="pg-wallet-option-name">{wallet.name}</span>
                {connecting === wallet.id && (
                  <div className="pg-wallet-option-spinner" />
                )}
              </button>
            ))}
          </div>

          <p className="pg-modal-note">
            This is a simulated wallet connection for the SDK Playground. No real transactions will occur.
          </p>
        </div>
      </div>
    </div>
  );
}
