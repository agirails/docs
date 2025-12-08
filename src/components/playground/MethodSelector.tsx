import { useState } from 'react';
import { methods, methodCategories } from '../../data/methods';

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
    <aside className="pg-sidebar">
      {/* Agent Battle Link */}
      <a
        href="/battle"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem',
          marginBottom: '1rem',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(0, 82, 255, 0.1) 0%, rgba(147, 51, 234, 0.1) 50%, rgba(0, 228, 228, 0.1) 100%)',
          border: '1px solid rgba(0, 228, 228, 0.2)',
          textDecoration: 'none',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0, 228, 228, 0.4)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0, 228, 228, 0.2)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(0, 82, 255, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pg-primary)" strokeWidth="2">
            <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
            <path d="M13 19l6-6"/>
            <path d="M16 16l4 4"/>
            <path d="M19 21l2-2"/>
            <path d="M14.5 6.5L18 3h3v3l-3.5 3.5"/>
            <path d="m5 14 4 4"/>
            <path d="m7 17-2 2"/>
            <path d="m3 21 2-2"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--pg-text)' }}>Agent Battle</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#FACC15">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--pg-text-muted)' }}>Dual-agent simulator</span>
        </div>
      </a>

      <h2 className="pg-sidebar-title">Methods</h2>

      <nav>
        {methodCategories.map((category) => {
          const categoryMethods = methods.filter(m => m.category === category);
          const isExpanded = expandedCategories.includes(category);

          return (
            <div key={category} style={{ marginBottom: '0.5rem' }}>
              <button
                onClick={() => toggleCategory(category)}
                className="pg-category-btn"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {category}
              </button>

              {isExpanded && (
                <div style={{ marginLeft: '0.5rem' }}>
                  {categoryMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => onSelectMethod(method.id)}
                      className={`pg-method-item ${selectedMethod === method.id ? 'active' : ''}`}
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
    </aside>
  );
}
