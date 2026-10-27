import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

interface DropdownProps<T extends string> {
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

/**
 * Themed select. A native <select> can't be used: its option list is drawn by
 * the OS and ignores the app's colour tokens (and custom themes entirely).
 */
export function Dropdown<T extends string>({ options, value, onChange, ariaLabel }: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(0, options.findIndex((opt) => opt.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const openList = () => {
    setHighlighted(selectedIndex);
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return openList();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setHighlighted((current) => (current + step + options.length) % options.length);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) choose(highlighted);
      else openList();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center justify-between rounded-[8px] border border-subtle px-2.5 py-1.5 text-left text-[12px] text-text-primary transition-colors hover:bg-surface"
      >
        <span>{selected?.label}</span>
        <ChevronDown size={12} className="text-muted" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.14, ease: [0.25, 0, 0, 1] }}
            className="allow-shadow absolute left-0 right-0 top-full z-50 mt-1 origin-top rounded-soft border border-subtle bg-paper px-1 py-1"
            style={{ boxShadow: 'var(--shadow-popover)' }}
          >
            {options.map((opt, index) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlighted(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(index)}
                  className={
                    'flex cursor-pointer items-center justify-between rounded-[5px] px-2 py-1.5 text-[12px] text-text-primary transition-colors ' +
                    (index === highlighted ? 'bg-surface' : '')
                  }
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={12} className="text-accent" />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
