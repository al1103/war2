export interface Coordinates {
  lat: number;
  lng: number;
}

export enum ThreatLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ConflictZone {
  id: string;
  name: string;
  coordinates: Coordinates;
  threatLevel: ThreatLevel;
  activeUnits: number;
  civilianDensity: string;
  intelSummary: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'AI' | 'COMBAT';
}

export interface ChartData {
  name: string;
  value: number;
  fullMark: number;
}

// New types for Country Selection
export interface CountryFeature {
  type: 'Feature';
  id: string | number;
  properties: {
    name: string;
  };
  geometry: any;
}

export interface WarState {
  aggressor: CountryFeature | null;
  defender: CountryFeature | null;
  defenderAllies: CountryFeature[]; // Allies joining the defender to attack the aggressor
}