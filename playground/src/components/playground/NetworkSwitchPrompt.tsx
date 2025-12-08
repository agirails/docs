import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface NetworkSwitchPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentNetwork: string;
  targetNetwork: string;
  onSwitch: () => void;
}

export default function NetworkSwitchPrompt({
  open,
  onOpenChange,
  currentNetwork,
  targetNetwork,
  onSwitch,
}: NetworkSwitchPromptProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-secondary">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <DialogTitle className="text-foreground">Wrong Network</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground">
            You're currently connected to <span className="text-foreground font-medium">{currentNetwork}</span>. 
            This playground requires <span className="text-primary font-medium">{targetNetwork}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm text-muted-foreground">{currentNetwork}</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-sm text-foreground">{targetNetwork}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              onSwitch();
              onOpenChange(false);
            }}
            className="btn-primary flex-1"
          >
            Switch Network
          </Button>
        </DialogFooter>

        <div className="pt-2 border-t border-secondary">
          <a 
            href="https://docs.base.org/guides/run-a-base-node/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 justify-center transition-colors"
          >
            Learn about Base Sepolia
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
