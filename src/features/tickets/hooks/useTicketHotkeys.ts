import { useEffect } from 'react';

const isTypingTarget = (el: EventTarget | null) => {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || node.isContentEditable === true;
};

/**
 * Global shortcuts: C → create ticket, / → focus [data-hotkey="search"], Esc → close overlay.
 * Returns a cleanup-less listener; handlers may be omitted to disable a binding.
 */
export function useTicketHotkeys(handlers: { onCreate?: () => void; onSearch?: () => void; onEscape?: () => void }) {
  const { onCreate, onSearch, onEscape } = handlers;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const typing = isTypingTarget(e.target);
      if (e.key === 'Escape') { onEscape?.(); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'c' || e.key === 'C') { e.preventDefault(); onCreate?.(); }
      if (e.key === '/') {
        e.preventDefault();
        const el = document.querySelector<HTMLElement>('[data-hotkey="search"]');
        if (el) el.focus();
        else onSearch?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCreate, onSearch, onEscape]);
}
