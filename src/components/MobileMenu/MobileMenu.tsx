import React, { useState, useEffect } from 'react';
import { useLocation } from '@docusaurus/router';
import './MobileMenu.css';

const menuItems = [
  { label: 'Documentation', href: '/' },
  { label: 'Playground', href: '/playground' },
  { label: 'Changelog', href: '/changelog' },
];

export default function MobileMenu(): JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Listen for hamburger click (Docusaurus toggle)
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => !prev);
    };

    // Intercept the Docusaurus toggle button
    const observer = new MutationObserver(() => {
      const toggle = document.querySelector('.navbar__toggle');
      if (toggle && !toggle.hasAttribute('data-mobile-menu-bound')) {
        toggle.setAttribute('data-mobile-menu-bound', 'true');
        toggle.addEventListener('click', handleToggle);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial bind
    const toggle = document.querySelector('.navbar__toggle');
    if (toggle && !toggle.hasAttribute('data-mobile-menu-bound')) {
      toggle.setAttribute('data-mobile-menu-bound', 'true');
      toggle.addEventListener('click', handleToggle);
    }

    return () => {
      observer.disconnect();
      const toggle = document.querySelector('.navbar__toggle');
      if (toggle) {
        toggle.removeEventListener('click', handleToggle);
      }
    };
  }, []);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/' ||
             (!location.pathname.startsWith('/playground') &&
              !location.pathname.startsWith('/changelog') &&
              !location.pathname.startsWith('/simple-api') &&
              !location.pathname.startsWith('/standard-api') &&
              !location.pathname.startsWith('/advanced-api') &&
              !location.pathname.startsWith('/canvas'));
    }
    if (href === '/playground') {
      return location.pathname.startsWith('/playground') ||
             location.pathname.startsWith('/simple-api') ||
             location.pathname.startsWith('/standard-api') ||
             location.pathname.startsWith('/advanced-api') ||
             location.pathname.startsWith('/canvas');
    }
    return location.pathname.startsWith(href);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="mobile-menu-backdrop" onClick={() => setIsOpen(false)} />
      <div className="mobile-menu-sidebar">
        <div className="mobile-menu-header">
          <span className="mobile-menu-title">Menu</span>
          <button className="mobile-menu-close" onClick={() => setIsOpen(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="mobile-menu-nav">
          {menuItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`mobile-menu-link ${isActive(item.href) ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
