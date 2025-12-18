/* ============================================
   Toast Notification Component
   ============================================

   Simple toast notifications for user feedback.
   Auto-dismisses after 3 seconds.
   ============================================ */

import React, { useEffect } from 'react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icon =
    type === 'success' ? '✓'
      : type === 'error' ? '✕'
        : type === 'warning' ? '⚠'
          : 'ℹ';

  return (
    <div className={`cv-toast cv-toast--${type}`}>
      <span className="cv-toast__icon">{icon}</span>
      <span className="cv-toast__message">{message}</span>
      <button className="cv-toast__close" onClick={onClose} aria-label="Close">
        ×
      </button>
    </div>
  );
}
