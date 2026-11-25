import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ROUTES, href, useRoute } from '../../lib/router';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/Button';
import { SettingsPanel } from './SettingsPanel';

export function Logo() {
  return (
    <a href={href('home')} className="group flex items-center gap-2.5 rounded-lg" aria-label="FluxQuest home">
      <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="14" fill="#2B201A" />
        <rect x="22" y="6" width="20" height="52" rx="4" fill="none" stroke="#BFAE93" strokeWidth="3" />
        <g className="transition-transform duration-500 group-hover:translate-y-2">
          <rect x="25" y="20" width="14" height="8" rx="2" fill="#9DBB8C" />
          <rect x="25" y="28" width="14" height="8" rx="2" fill="#E3D7C1" />
        </g>
        <path d="M16 20c-6 6-6 14 0 20M48 20c6 6 6 14 0 20" fill="none" stroke="#86CFC3" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="font-display text-xl font-bold tracking-tight text-oat-50">
        Flux<span className="text-sage-300">Quest</span>
      </span>
    </a>
  );
}

export function Header() {
  const route = useRoute();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  useEffect(() => setOpen(false), [route.name]);
  return (
    <header className="no-print sticky top-0 z-50 border-b border-espresso-700/70 bg-espresso-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {ROUTES.slice(1).map((r) => {
              const active = route.name === r.name;
              return (
                <li key={r.name}>
                  <a
                    href={href(r.name)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${active ? 'text-oat-50' : 'text-oat-300 hover:text-oat-50'}`}
                  >
                    {r.label}
                    {active && <motion.span layoutId="nav-pill" className="absolute inset-x-2 -bottom-[13px] h-[3px] rounded-full bg-sage-400" />}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <IconButton icon="settings" label="Display and accessibility settings" onClick={() => setSettings(true)} />
          <IconButton icon={open ? 'close' : 'menu'} label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-nav" className="lg:hidden" onClick={() => setOpen(!open)} />
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Main"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-espresso-700 lg:hidden"
          >
            <ul className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
              {ROUTES.map((r) => (
                <li key={r.name}>
                  <a
                    href={href(r.name)}
                    aria-current={route.name === r.name ? 'page' : undefined}
                    className={`flex min-h-[48px] items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${
                      route.name === r.name ? 'border-sage-400 bg-sage-400/12 text-sage-200' : 'border-espresso-700 text-oat-200'
                    }`}
                  >
                    {r.label}
                    {route.name === r.name && <Icon name="check" size={16} className="ml-auto" />}
                  </a>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
      <SettingsPanel open={settings} onClose={() => setSettings(false)} />
    </header>
  );
}
