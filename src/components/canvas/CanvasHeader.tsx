import React from 'react';

export function CanvasHeader() {
  return (
    <header className="cv-header">
      <div className="cv-header__left">
        <h1 className="cv-header__title">
          <span className="cv-header__logo">⬡</span>
          Canvas
        </h1>
        <span className="cv-header__badge">Phase 1</span>
      </div>
    </header>
  );
}
