import { ComplianceView } from '@/components/compliance/ComplianceView';

// Auth-gated, session-dependent page — never statically prerender.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <ComplianceView />;
}
