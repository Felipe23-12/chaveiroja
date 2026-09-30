import React, { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import NativeSelectOptions from '@/components/ui/NativeSelectOptions';
import { cn } from '@/lib/utils';

export default function NativeSelectDrawer({ value, onChange, options = [], label, placeholder = 'Selecione', disabled = false, className, id, ...buttonProps }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const selected = options.find(option => String(option.value) === String(value));
  const select = next => {
    if (disabled || trigger.current?.matches(':disabled')) return;
    onChange(next);
    setOpen(false);
  };
  return <Sheet open={open && !disabled} onOpenChange={setOpen}>
    <SheetTrigger asChild>
      <button {...buttonProps} ref={trigger} id={id} type="button" disabled={disabled}
        aria-label={buttonProps['aria-label'] || label || placeholder}
        className={cn('w-full min-w-0 flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-input bg-background text-sm min-h-[44px] select-none touch-manipulation text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed', className)}>
        <span className={cn('min-w-0 truncate', selected ? 'text-foreground' : 'text-muted-foreground')}>{selected?.label || placeholder}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
    </SheetTrigger>
    <SheetContent side="bottom" className="select-none max-h-[90dvh] pb-[max(1.5rem,env(safe-area-inset-bottom))]" aria-describedby={undefined}>
      <SheetHeader><SheetTitle>{label || 'Selecione uma opção'}</SheetTitle></SheetHeader>
      <NativeSelectOptions options={options} value={value} onSelect={select} />
    </SheetContent>
  </Sheet>;
}