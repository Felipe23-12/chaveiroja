import React from 'react';
import { Check } from 'lucide-react';

export default function NativeSelectOptions({ options, value, onSelect }) {
  const moveFocus = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
    const index = buttons.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };
  return <div className="mt-2 max-h-[60dvh] overflow-y-auto space-y-1" onKeyDown={moveFocus}>
    {options.map(option => <button key={option.value} type="button" disabled={option.disabled}
      aria-pressed={String(option.value) === String(value)}
      onClick={() => onSelect(option.value)}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-lg text-left text-sm min-h-[44px] transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${String(option.value) === String(value) ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent text-foreground'}`}>
      <span>{option.label}</span>{String(option.value) === String(value) && <Check className="w-4 h-4 shrink-0" />}
    </button>)}
  </div>;
}