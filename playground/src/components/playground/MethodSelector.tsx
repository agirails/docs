import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Swords, Sparkles } from 'lucide-react';
import { methods, methodCategories } from '@/data/methods';
import { cn } from '@/lib/utils';

interface MethodSelectorProps {
  selectedMethod: string;
  onSelectMethod: (methodId: string) => void;
}

export default function MethodSelector({ selectedMethod, onSelectMethod }: MethodSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(methodCategories);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <aside className="w-60 min-w-[240px] border-r border-secondary bg-card overflow-y-auto">
      <div className="p-4">
        {/* Agent Battle Link - Featured */}
        <Link
          to="/battle"
          className="group flex items-center gap-3 p-3 mb-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 border border-primary/20 hover:border-primary/40 transition-all duration-300"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Swords className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-foreground">Agent Battle</span>
              <Sparkles className="h-3 w-3 text-yellow-500" />
            </div>
            <span className="text-xs text-muted-foreground">Dual-agent simulator</span>
          </div>
        </Link>

        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Methods
        </h2>
        
        <nav className="space-y-1">
          {methodCategories.map((category) => {
            const categoryMethods = methods.filter(m => m.category === category);
            const isExpanded = expandedCategories.includes(category);
            
            return (
              <div key={category} className="space-y-1">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm font-medium text-foreground hover:bg-secondary/50 rounded-lg transition-colors duration-200"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  {category}
                </button>
                
                {isExpanded && (
                  <div className="ml-2 space-y-0.5 animate-fade-in">
                    {categoryMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => onSelectMethod(method.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm font-mono rounded-lg transition-all duration-200",
                          selectedMethod === method.id
                            ? "bg-primary/10 border-l-2 border-l-primary text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        )}
                      >
                        {method.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
