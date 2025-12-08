import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';

interface WalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (walletType: string) => void;
}

const wallets = [
  { id: 'metamask', name: 'MetaMask', icon: '🦊', detected: true },
  { id: 'coinbase', name: 'Coinbase Wallet', icon: '🔵', detected: true },
  { id: 'walletconnect', name: 'WalletConnect', icon: '🌈', detected: false, comingSoon: true },
];

export default function WalletModal({ open, onOpenChange, onConnect }: WalletModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-secondary">
        <DialogHeader>
          <DialogTitle className="text-h2">Connect Wallet</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 mt-4">
          {wallets.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => !wallet.comingSoon && onConnect(wallet.id)}
              disabled={wallet.comingSoon}
              className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                wallet.comingSoon 
                  ? 'border-secondary bg-secondary/30 opacity-50 cursor-not-allowed' 
                  : 'border-secondary hover:border-primary/50 hover:bg-secondary/50 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{wallet.icon}</span>
                <span className="font-medium text-foreground">{wallet.name}</span>
              </div>
              {wallet.detected && !wallet.comingSoon && (
                <span className="text-xs px-2 py-1 rounded bg-success/20 text-success font-medium">
                  Detected
                </span>
              )}
              {wallet.comingSoon && (
                <span className="text-xs text-muted-foreground">Coming soon</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-secondary">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            Don't have a wallet?{' '}
            <a 
              href="https://metamask.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Get MetaMask <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
