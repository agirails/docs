import { useEffect, useState } from 'react';
import { Trophy, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CompletionCelebrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  txHash?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  delay: number;
}

export default function CompletionCelebration({
  open,
  onOpenChange,
  txHash,
}: CompletionCelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (open) {
      // Generate confetti particles
      const colors = ['#00E4E4', '#0052FF', '#00C853', '#FF9100', '#E5E7EB'];
      const newParticles: Particle[] = [];
      
      for (let i = 0; i < 50; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: -10 - Math.random() * 20,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          delay: Math.random() * 500,
        });
      }
      
      setParticles(newParticles);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-card border-secondary overflow-hidden">
        {/* Confetti */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-2 h-2 animate-confetti"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                backgroundColor: particle.color,
                transform: `rotate(${particle.rotation}deg)`,
                animationDelay: `${particle.delay}ms`,
              }}
            />
          ))}
        </div>

        <DialogHeader className="text-center relative z-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-bounce-slow">
              <Trophy className="w-8 h-8 text-background" />
            </div>
          </div>
          <DialogTitle className="text-2xl text-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Congratulations!
            <Sparkles className="w-5 h-5 text-primary" />
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            You've successfully completed your first AGIRAILS transaction on the testnet!
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-success/10 border border-success/30 rounded-lg">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="text-sm font-medium text-success">Confirmed ✓</span>
            </div>
            
            {txHash && (
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Transaction</span>
                <a 
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono text-primary hover:underline flex items-center gap-1"
                >
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <span className="text-sm text-muted-foreground">Network</span>
              <span className="text-sm font-medium text-foreground">Base Sepolia</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 relative z-10">
          <Button 
            onClick={() => onOpenChange(false)}
            className="btn-primary w-full"
          >
            Continue Building
          </Button>
          <a 
            href="https://docs.agirails.com/quickstart"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 justify-center transition-colors"
          >
            Read the full documentation
            <ExternalLink className="w-3 h-3" />
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
