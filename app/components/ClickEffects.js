'use client';

import { useEffect } from 'react';

// Anything matching this gets a ripple that spreads from the click point.
const TARGETS = 'button, .course-row-link, .quick-action, .hub-card, .topnav-link';

export default function ClickEffects() {
  useEffect(() => {
    function onPointerDown(e) {
      if (e.button !== undefined && e.button !== 0) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const el = e.target.closest ? e.target.closest(TARGETS) : null;
      if (!el) return;
      if (el.disabled || el.classList.contains('disabled')) return;

      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;

      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

      if (getComputedStyle(el).position === 'static') {
        el.style.position = 'relative';
      }
      el.style.overflow = 'hidden';
      el.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    }

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return null;
}
