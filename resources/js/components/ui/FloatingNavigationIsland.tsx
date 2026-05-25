import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, Transition } from 'motion/react';
import { ChevronUp, X } from 'lucide-react';
import clsx from 'clsx';

export interface FloatingNavigationItem {
  id: string;
  name: string;
  href: string;
  icon: React.ReactElement;
  active?: boolean;
}

interface FloatingNavigationIslandProps {
  items: FloatingNavigationItem[];
  currentSection: string;
}

const islandTransition: Transition = {
  type: 'tween',
  ease: [0.22, 1, 0.36, 1],
  duration: 0.34,
};

const INSTITUTIONAL_BLUE = '#1e2b66';

const renderIcon = (icon: React.ReactElement, active?: boolean) => (
  <span
    className={clsx(
      'grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors',
      active ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800'
    )}
    style={active ? { backgroundColor: INSTITUTIONAL_BLUE } : undefined}
  >
    {React.cloneElement(icon, {
      className: clsx('h-5 w-5', icon.props.className),
      strokeWidth: 2.1,
    })}
  </span>
);

export function FloatingNavigationIsland({ items, currentSection }: FloatingNavigationIslandProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeItem = useMemo(() => items.find((item) => item.active) || items[0], [items]);

  useEffect(() => {
    setIsExpanded(false);
  }, [currentSection]);

  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <motion.button
            type="button"
            aria-label="Cerrar navegación"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={islandTransition}
            className="fixed inset-0 z-[70] cursor-default bg-slate-950/25 backdrop-blur-[3px]"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      <motion.nav
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="fixed bottom-5 left-1/2 z-[80] w-[min(calc(100vw-2rem),23rem)] -translate-x-1/2"
        aria-label="Navegación principal"
      >
        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? 'auto' : 56,
            borderRadius: isExpanded ? 24 : 999,
          }}
          transition={islandTransition}
          className="relative overflow-hidden border border-white/60 bg-white/95 text-slate-950 shadow-2xl shadow-slate-900/20 ring-1 ring-slate-950/5 backdrop-blur-xl"
        >
          <motion.button
            type="button"
            onClick={() => setIsExpanded(true)}
            initial={false}
            animate={{ opacity: isExpanded ? 0 : 1, scale: isExpanded ? 0.98 : 1 }}
            transition={islandTransition}
            className={clsx('absolute inset-x-0 top-0 flex h-14 w-full items-center gap-3 px-3 text-left', isExpanded && 'pointer-events-none')}
          >
            {activeItem ? renderIcon(activeItem.icon, true) : <span className="h-9 w-9" />}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Navegación</p>
              <p className="truncate text-sm font-semibold text-slate-900">{activeItem?.name || currentSection}</p>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500">
              <ChevronUp className="h-4 w-4" />
            </span>
          </motion.button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ ...islandTransition, delay: 0.04 }}
                className="px-3 pb-3 pt-4"
              >
                <div className="flex items-center justify-between px-2 pb-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: INSTITUTIONAL_BLUE }}>
                      MIS - HUV
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{currentSection}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Cerrar navegación"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      to={item.href}
                      onClick={() => setIsExpanded(false)}
                      aria-current={item.active ? 'page' : undefined}
                      className={clsx(
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition focus-visible:ring-4 focus-visible:ring-blue-100',
                        item.active ? 'bg-[#1e2b66]/10 text-[#1e2b66]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                      )}
                    >
                      {renderIcon(item.icon, item.active)}
                      <span className="flex-1 truncate">{item.name}</span>
                      {item.active && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: INSTITUTIONAL_BLUE }} />}
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.nav>
    </>
  );
}

export default FloatingNavigationIsland;