'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';

export interface VehicleDiagnosticFault {
  id: string;
  driverName: string;
  code: string;
  severity: 'critical' | 'moderate' | 'minor' | 'advisory';
  title: string;
  description: string;
  recommendation: string;
  crankingVoltage?: number;
  occurredAt: string;
}

export interface VehicleHealthSummary {
  totalScanned: number;
  cleanVehicles: number;
  faultsCount: number;
  criticalCount: number;
  crankingSagCount: number;
  faults: VehicleDiagnosticFault[];
}

export function useVehicleHealth(crewId: string | null) {
  const supabase = useSupabase();

  return useQuery<VehicleHealthSummary>({
    queryKey: ['vehicleHealth', crewId],
    queryFn: async () => {
      if (!crewId) {
        return {
          totalScanned: 0,
          cleanVehicles: 0,
          faultsCount: 0,
          criticalCount: 0,
          crankingSagCount: 0,
          faults: [],
        };
      }

      // Query safety_alerts matching vehicle health, dtc, or battery faults
      const { data: alerts, error } = await supabase
        .from('safety_alerts')
        .select(`
          id,
          alert_type,
          severity,
          message,
          metadata,
          created_at,
          resolved,
          target_user_id
        `)
        .eq('crew_id', crewId)
        .in('alert_type', ['dtc_fault', 'dtc_check_engine', 'battery_cranking_critical', 'low_battery', 'vehicle_health'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        // Table might not have alerts yet, fallback cleanly
        console.warn('Error fetching vehicle health alerts:', error.message);
      }

      // Query total crew members for vehicle count
      const { count: memberCount } = await supabase
        .from('crew_members')
        .select('*', { count: 'exact', head: true })
        .eq('crew_id', crewId);

      const totalScanned = Math.max(memberCount ?? 0, 1);
      const faults: VehicleDiagnosticFault[] = [];

      let criticalCount = 0;
      let crankingSagCount = 0;

      for (const a of alerts ?? []) {
        if (a.resolved) continue;
        const meta = a.metadata as Record<string, unknown> | null;
        const code = (meta?.dtc_code as string) || (a.alert_type === 'battery_cranking_critical' ? 'BATT-CRANK' : 'P0300');
        const isCrank = a.alert_type === 'battery_cranking_critical' || meta?.cranking_voltage != null;
        const severity = (a.severity as 'critical' | 'moderate' | 'minor' | 'advisory') || 'moderate';

        if (severity === 'critical') criticalCount++;
        if (isCrank) crankingSagCount++;

        faults.push({
          id: a.id,
          driverName: (meta?.display_name as string) || 'Fleet Vehicle',
          code,
          severity,
          title: a.message || 'Diagnostic Trouble Code Detected',
          description: (meta?.description as string) || (isCrank ? '12V starter battery cranking voltage dropped below 9.5V threshold.' : 'Powertrain or emissions anomaly detected via OBD-II ECU link.'),
          recommendation: (meta?.recommendation as string) || (isCrank ? 'Replace 12V starter battery before winter cold-start failure.' : 'Inspect ignition coil, spark plugs, and sensor wiring harness.'),
          crankingVoltage: meta?.cranking_voltage as number | undefined,
          occurredAt: a.created_at,
        });
      }

      return {
        totalScanned,
        cleanVehicles: Math.max(0, totalScanned - faults.length),
        faultsCount: faults.length,
        criticalCount,
        crankingSagCount,
        faults,
      };
    },
    enabled: !!crewId,
    staleTime: 60_000,
  });
}
