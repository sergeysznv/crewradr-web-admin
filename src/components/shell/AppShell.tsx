'use client';
import type { ReactNode } from 'react';
import { IconSidebar } from './IconSidebar';
import { HeaderBar } from './HeaderBar';
import { MobileTabBar } from './MobileTabBar';

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-screen bg-scaffold">
      <IconSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar title={title} />
        <main className="flex-1 overflow-auto p-lg md:p-xl pb-20 md:pb-xl max-w-[1400px] w-full">
          {children}
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
