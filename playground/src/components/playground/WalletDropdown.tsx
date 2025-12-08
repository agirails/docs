import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, LogOut } from 'lucide-react';
import { WalletState } from '@/types/playground';

interface WalletDropdownProps {
  wallet: WalletState;
  onDisconnect: () => void;
}

export default function WalletDropdown({ wallet, onDisconnect }: WalletDropdownProps) {
  const shortAddress = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="font-mono text-sm">{shortAddress}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-secondary">
        <div className="px-3 py-2 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">💎 ETH</span>
            <span className="font-mono text-foreground">{wallet.ethBalance}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">💵 USDC</span>
            <span className="font-mono text-foreground">{wallet.usdcBalance}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">🔗 Network</span>
            <span className="text-foreground">{wallet.network}</span>
          </div>
        </div>
        <DropdownMenuSeparator className="bg-secondary" />
        <DropdownMenuItem 
          onClick={onDisconnect}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
