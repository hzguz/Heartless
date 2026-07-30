import { motion, AnimatePresence } from 'framer-motion';

/** Which edge of the window the panel is docked against. */
export type SidebarSide = 'left' | 'right';

const WIDTH = 280;

interface Props {
  /** Distinct key so AnimatePresence can tell the panels apart. */
  panelKey: string;
  open: boolean;
  side: SidebarSide;
  children: React.ReactNode;
}

/**
 * Shared chrome for the three sidebars: the width open/close animation plus a
 * content slide that follows the docked edge — sliding in from the outside on
 * the right, and from the inside on the left. The divider likewise sits on
 * whichever edge faces the editor.
 */
export function SidebarPanel({ panelKey, open, side, children }: Props) {
  const fromOutside = side === 'right' ? 12 : -12;
  const toOutside = side === 'right' ? 8 : -8;

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key={panelKey}
          initial={{ width: 0 }}
          animate={{ width: WIDTH }}
          exit={{ width: 0 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          className="relative flex h-full shrink-0 flex-col overflow-hidden"
        >
          <motion.div
            initial={{ opacity: 0, x: fromOutside }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: toOutside }}
            transition={{ duration: 0.22, ease: [0.25, 0, 0, 1] }}
            className={
              'flex h-full w-[280px] flex-col bg-paper border-subtle ' +
              (side === 'right' ? 'border-l' : 'border-r')
            }
          >
            {children}
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
