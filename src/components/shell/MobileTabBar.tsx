'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ScrollText, Settings } from 'lucide-react';

const TABS = [
  { href: '/', icon: LayoutDashboard, label: 'Home' },
  { href: '/members', icon: Users, label: 'Members' },
  { href: '/audit-log', icon: ScrollText, label: 'Logs' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-outline-variant flex justify-around py-2 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {TABS.map(({ href, icon: Icon, label }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link key={href} href={href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-2xs font-semibold
              ${active ? 'text-primary' : 'text-on-surface-variant'}`}>
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
