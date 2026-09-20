// src/lib/__tests__/meshAttribution.test.ts
import { describe, it, expect } from 'vitest';
import { extractMeshAttribution } from '../meshAttribution';

describe('meshAttribution', () => {
  it('detects explicit mesh relayed flags', () => {
    const res = extractMeshAttribution({
      is_mesh_relayed: true,
      mesh_hop_count: 3,
      relayed_by: 'Driver-B',
    });
    expect(res.isMeshRelayed).toBe(true);
    expect(res.hopCount).toBe(3);
    expect(res.relayedBy).toBe('Driver-B');
  });

  it('detects mesh relayed metadata', () => {
    const res = extractMeshAttribution({
      metadata: {
        is_mesh_relayed: true,
        mesh_hop_count: 2,
        relayed_by: 'Truck-04',
      },
    });
    expect(res.isMeshRelayed).toBe(true);
    expect(res.hopCount).toBe(2);
    expect(res.relayedBy).toBe('Truck-04');
  });

  it('detects text indicators in message', () => {
    const res = extractMeshAttribution({
      message: 'SOS packet delivered via BLE Mesh Relay (2 hops) from cellular dead zone',
    });
    expect(res.isMeshRelayed).toBe(true);
    expect(res.hopCount).toBe(2);
  });

  it('returns false for normal cellular packets', () => {
    const res = extractMeshAttribution({
      message: 'Vehicle speed exceeded 80 mph on Highway 101',
    });
    expect(res.isMeshRelayed).toBe(false);
    expect(res.hopCount).toBe(0);
  });
});
