// src/app/settings/page.tsx
import { SettingsView } from '@/components/settings/SettingsView';

// Auth-gated, session-dependent page — never statically prerender.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <SettingsView />;
}
