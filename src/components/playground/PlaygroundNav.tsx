/**
 * Shared navigation component for all playground pages
 */

// Icons
const ZapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const LayersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
);

const CodeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>
);

const CanvasIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <circle cx="15.5" cy="15.5" r="1.5"/>
    <line x1="10" y1="8.5" x2="14" y2="15.5"/>
  </svg>
);

interface PlaygroundNavProps {
  currentLevel: 'simple-api' | 'standard-api' | 'advanced-api' | 'canvas';
}

export default function PlaygroundNav({ currentLevel }: PlaygroundNavProps) {
  const navItems = [
    { id: 'simple-api', label: 'Simple API', href: '/simple-api', icon: ZapIcon },
    { id: 'standard-api', label: 'Standard API', href: '/standard-api', icon: LayersIcon },
    { id: 'advanced-api', label: 'Advanced API', href: '/advanced-api', icon: CodeIcon },
    { id: 'canvas', label: 'Agent Canvas', href: '/canvas', icon: CanvasIcon },
  ];

  return (
    <nav className="pg-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.id}
            href={item.href}
            className={`pg-nav-item ${currentLevel === item.id ? 'pg-nav-item-active' : ''}`}
          >
            <Icon />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
