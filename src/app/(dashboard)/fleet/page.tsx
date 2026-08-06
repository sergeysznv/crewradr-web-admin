// src/app/(dashboard)/fleet/page.tsx
import { DashboardView } from '@/components/dashboard/DashboardView';
import { TierGateGuard } from '@/components/tier/TierGateGuard';

export default function Page() {
  return (
    <TierGateGuard minTier="firstMate" fallback={null}>
      <DashboardView />
    </TierGateGuard>
  );
}
