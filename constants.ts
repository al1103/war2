import { ConflictZone, ThreatLevel } from './types';

export const CONFLICT_ZONES: ConflictZone[] = [
  {
    id: 'z-alpha',
    name: 'Sector 7 - Neo Tokyo',
    coordinates: { lat: 35.6762, lng: 139.6503 },
    threatLevel: ThreatLevel.HIGH,
    activeUnits: 1420,
    civilianDensity: 'High',
    intelSummary: 'Cyber-warfare units detected near grid center.'
  },
  {
    id: 'z-beta',
    name: 'Sector 4 - Lunar Base',
    coordinates: { lat: 40.7128, lng: -74.0060 }, // NYC coords for demo
    threatLevel: ThreatLevel.MODERATE,
    activeUnits: 560,
    civilianDensity: 'Low',
    intelSummary: 'Atmospheric stabilizers fluctuating.'
  },
  {
    id: 'z-gamma',
    name: 'Sector 9 - Arctic Outpost',
    coordinates: { lat: 78.2232, lng: 15.6267 },
    threatLevel: ThreatLevel.LOW,
    activeUnits: 120,
    civilianDensity: 'None',
    intelSummary: 'Routine patrol. No anomalies.'
  },
  {
    id: 'z-delta',
    name: 'Sector 1 - Prime City',
    coordinates: { lat: 51.5074, lng: -0.1278 },
    threatLevel: ThreatLevel.CRITICAL,
    activeUnits: 4500,
    civilianDensity: 'Extreme',
    intelSummary: 'Mass insurgent activity reported in lower districts.'
  },
  {
    id: 'z-epsilon',
    name: 'Sector 12 - Desert Shield',
    coordinates: { lat: 25.2048, lng: 55.2708 },
    threatLevel: ThreatLevel.HIGH,
    activeUnits: 2100,
    civilianDensity: 'Moderate',
    intelSummary: 'Energy spikes detected from unregistered sources.'
  }
];

export const INITIAL_LOGS = [
  { id: '1', timestamp: '08:00:01', message: 'AEGIS System initialized.', type: 'INFO' as const },
  { id: '2', timestamp: '08:00:05', message: 'Global satellite link established.', type: 'INFO' as const },
  { id: '3', timestamp: '08:01:22', message: 'Warning: Energy spike in Sector 12.', type: 'WARNING' as const },
];
