// src/lib/meshAttribution.ts

export interface MeshAttributionInfo {
  isMeshRelayed: boolean;
  hopCount: number;
  relayedBy?: string | null;
  relayTimestamp?: string | null;
}

export interface MeshAttributionTarget {
  is_mesh_relayed?: boolean;
  mesh_hop_count?: number;
  relayed_by?: string | null;
  relay_timestamp?: string | null;
  message?: string | null;
  alert_type?: string | null;
  event_type?: string | null;
  resolution_notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Detects whether an alert, telemetry record, or live position was delivered via
 * an offline BLE mesh store-and-forward peer relay in cellular dead zones.
 */
export function extractMeshAttribution(item: MeshAttributionTarget): MeshAttributionInfo {
  // 1. Explicit boolean or hop count flag
  if (item.is_mesh_relayed) {
    return {
      isMeshRelayed: true,
      hopCount: Math.max(1, item.mesh_hop_count ?? 1),
      relayedBy: item.relayed_by,
      relayTimestamp: item.relay_timestamp,
    };
  }

  // 2. Metadata attributes
  if (item.metadata && typeof item.metadata === 'object') {
    const meta = item.metadata as Record<string, unknown>;
    if (meta.is_mesh_relayed || meta.mesh_relay || meta.mesh_hop_count) {
      return {
        isMeshRelayed: true,
        hopCount: Math.max(1, Number(meta.mesh_hop_count || 1)),
        relayedBy: typeof meta.relayed_by === 'string' ? meta.relayed_by : null,
        relayTimestamp: typeof meta.relay_timestamp === 'string' ? meta.relay_timestamp : null,
      };
    }
  }

  // 3. Text indicators in message or alert_type (e.g. "[BLE Mesh Relay]" or "Dead Zone Relay")
  const combined = `${item.message || ''} ${item.alert_type || ''} ${item.resolution_notes || ''}`.toLowerCase();
  if (
    combined.includes('mesh relay') ||
    combined.includes('ble mesh') ||
    combined.includes('dead zone relay') ||
    combined.includes('offline mesh')
  ) {
    const hopMatch = combined.match(/(\d+)\s*(?:hop|hops)/i);
    const hopCount = hopMatch ? parseInt(hopMatch[1], 10) : 1;
    return {
      isMeshRelayed: true,
      hopCount,
      relayedBy: item.relayed_by,
      relayTimestamp: item.relay_timestamp,
    };
  }

  return {
    isMeshRelayed: false,
    hopCount: 0,
  };
}
