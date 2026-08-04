// src/app/members/page.tsx
import { MembersView } from '@/components/members/MembersView';

// Auth-gated, session-dependent page — never statically prerender.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <MembersView />;
}
