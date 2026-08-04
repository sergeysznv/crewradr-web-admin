// src/app/audit-log/page.tsx
import { AuditLogView } from '@/components/audit-log/AuditLogView';

// Auth-gated, session-dependent page — never statically prerender.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <AuditLogView />;
}
