import { ProvisioningView } from '@/components/provisioning/ProvisioningView';

// Auth-gated, session-dependent page — never statically prerender.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <ProvisioningView />;
}
