'use client';

import { type ReactNode } from 'react';
import { useCrew } from '@/hooks/useCrew';

/**
 * Gates children behind a crew-management role check (captain / co-captain).
 *
 * Complements TierGateGuard: TierGateGuard answers "did the crew pay for
 * this tier?", RoleGate answers "may THIS user manage crew settings?". Write
 * controls that hit role-checked RPCs (save_alert_rule, save_report_template,
 * get_web_fleet_export, update_member_role, ...) must pass BOTH gates — a
 * plain member in a Captain-tier crew otherwise sees tools that the server
 * rejects with "Only captains can ...".
 *
 * Accepts both 'co-captain' and the legacy 'co_captain' spelling (the Flutter
 * app tolerates both, and old crew_members rows may use either).
 */
const MANAGER_ROLES = ['captain', 'co-captain', 'co_captain'];

interface RoleGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGate({ children, fallback = null }: RoleGateProps) {
  const { role } = useCrew();

  // Role unknown (account profile still loading): render a skeleton like
  // TierGateGuard does, so gated sections never flash unauthorized tools.
  if (!role) {
    return (
      <div className="animate-pulse rounded-2xl bg-surface-container/50" style={{ height: 64 }}>
        <div className="h-full w-full rounded-2xl bg-surface-container-high/30" />
      </div>
    );
  }

  if (!MANAGER_ROLES.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
