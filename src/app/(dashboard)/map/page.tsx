import { MapView } from '@/components/map/MapView';

// Auth-gated, session-dependent page — never statically prerender.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <MapView />;
}
