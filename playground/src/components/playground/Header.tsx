import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { WalletState } from '@/types/playground';
import WalletModal from './WalletModal';
import WalletDropdown from './WalletDropdown';
import { Swords } from 'lucide-react';

interface HeaderProps {
  wallet: WalletState;
  onConnect: (walletType: string) => void;
  onDisconnect: () => void;
}

export default function Header({ wallet, onConnect, onDisconnect }: HeaderProps) {
  const [showWalletModal, setShowWalletModal] = useState(false);

  return (
    <header className="h-16 border-b border-secondary flex items-center justify-between px-6 bg-card">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <span className="text-primary font-bold text-sm">A</span>
        </div>
        <h1 className="text-h2 text-foreground">SDK Playground</h1>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/battle">
          <Button variant="outline" size="sm" className="gap-2 border-primary/30 hover:bg-primary/10">
            <Swords className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Agent Battle</span>
          </Button>
        </Link>
        <div className="h-6 w-px bg-border" />
        {wallet.connected ? (
          <WalletDropdown wallet={wallet} onDisconnect={onDisconnect} />
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowWalletModal(true)}
            className="gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            Connect Wallet
          </Button>
        )}
      </div>

      <WalletModal
        open={showWalletModal}
        onOpenChange={setShowWalletModal}
        onConnect={(type) => {
          onConnect(type);
          setShowWalletModal(false);
        }}
      />
    </header>
  );
}
