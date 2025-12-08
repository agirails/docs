import { useState } from 'react';
import { WalletState } from '../../types/playground';

interface HeaderProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function Header({ wallet, onConnect, onDisconnect }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="pg-header">
      <div className="pg-header-left">
        <div className="pg-header-logo">
          <span>A</span>
        </div>
        <h1 className="pg-header-title">SDK Playground</h1>
      </div>

      {wallet.connected ? (
        <div className="pg-wallet-connected">
          <button
            className="pg-wallet-btn"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <span className="pg-wallet-dot pg-wallet-dot-connected" />
            <span className="pg-wallet-address">
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showDropdown && (
            <div className="pg-wallet-dropdown">
              <div className="pg-wallet-dropdown-info">
                <div className="pg-wallet-balance">
                  <span className="pg-wallet-balance-label">ETH Balance</span>
                  <span className="pg-wallet-balance-value">{wallet.ethBalance}</span>
                </div>
                <div className="pg-wallet-balance">
                  <span className="pg-wallet-balance-label">USDC Balance</span>
                  <span className="pg-wallet-balance-value">{wallet.usdcBalance}</span>
                </div>
                <div className="pg-wallet-network">
                  <span className="pg-wallet-network-dot" />
                  {wallet.network}
                </div>
              </div>
              <button
                className="pg-wallet-disconnect"
                onClick={() => {
                  onDisconnect();
                  setShowDropdown(false);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Disconnect
              </button>
            </div>
          )}
        </div>
      ) : (
        <button className="pg-connect-btn" onClick={onConnect}>
          <span className="pg-wallet-dot" />
          Connect Wallet
        </button>
      )}
    </header>
  );
}
