'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Bell, ScrollText, Settings, Anchor } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/members', icon: Users, label: 'Members' },
  { href: '/audit-log', icon: ScrollText, label: 'Audit Log' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function IconSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col items-center w-14 h-screen bg-surface border-r border-outline-variant py-3 gap-3 flex-shrink-0">
      <div className="mb-2 text-primary">
        <Anchor size={22} />
      </div>
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link key={href} href={href} title={label}
            className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors
              ${active ? 'bg-primary-container text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <Icon size={18} />
          </Link>
        );
      })}
    </aside>
  );
}
