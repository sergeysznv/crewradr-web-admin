// src/app/page.tsx
import { DashboardView } from '@/components/dashboard/DashboardView';

// Auth-gated, session-dependent page — never statically prerender.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <DashboardView />;
}
