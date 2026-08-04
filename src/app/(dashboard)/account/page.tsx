import { AccountView } from '@/components/account/AccountView';

// Auth-gated, session-dependent page — never statically prerender.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <AccountView />;
}
