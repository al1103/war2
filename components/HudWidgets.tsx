import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell, ReferenceLine } from 'recharts';
import { WarState, CountryFeature } from '../types';

interface WarWidgetProps {
  warState: WarState;
}

// Helper to generate deterministic stats based on country name
const getCountryStats = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = Math.imul(31, h) + name.charCodeAt(i) | 0;
  const seed = Math.abs(h);
  
  return {
    infantry: 40 + (seed % 60),
    armor: 40 + ((seed >> 2) % 60),
    air: 40 + ((seed >> 4) % 60),
    cyber: 40 + ((seed >> 6) % 60),
    logistics: 40 + ((seed >> 8) % 60),
    intel: 40 + ((seed >> 10) % 60),
    manpower: 50000 + (seed % 500000),
    techLevel: 1 + (seed % 10) // 1-10
  };
};

export const TacticalRadar: React.FC<WarWidgetProps> = ({ warState }) => {
  const data = useMemo(() => {
    const statsA = warState.aggressor ? getCountryStats(warState.aggressor.properties.name) : null;
    const statsB = warState.defender ? getCountryStats(warState.defender.properties.name) : null;

    return [
      { subject: 'INFANTRY', A: statsA?.infantry || 0, B: statsB?.infantry || 0, fullMark: 100 },
      { subject: 'ARMOR', A: statsA?.armor || 0, B: statsB?.armor || 0, fullMark: 100 },
      { subject: 'AIR FORCE', A: statsA?.air || 0, B: statsB?.air || 0, fullMark: 100 },
      { subject: 'CYBER', A: statsA?.cyber || 0, B: statsB?.cyber || 0, fullMark: 100 },
      { subject: 'LOGISTICS', A: statsA?.logistics || 0, B: statsB?.logistics || 0, fullMark: 100 },
      { subject: 'INTEL', A: statsA?.intel || 0, B: statsB?.intel || 0, fullMark: 100 },
    ];
  }, [warState]);

  return (
    <div className="w-full h-48 relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#0e7490" strokeOpacity={0.3} />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#67e8f9', fontSize: 9, fontFamily: 'Share Tech Mono' }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          
          {warState.aggressor && (
            <Radar
              name={warState.aggressor.properties.name}
              dataKey="A"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="#06b6d4"
              fillOpacity={0.3}
            />
          )}
          
          {warState.defender && (
            <Radar
              name={warState.defender.properties.name}
              dataKey="B"
              stroke="#f97316"
              strokeWidth={2}
              fill="#f97316"
              fillOpacity={0.3}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="absolute top-0 left-0 flex flex-col gap-1">
         {warState.aggressor && (
             <div className="flex items-center gap-1">
                 <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                 <span className="text-[9px] text-cyan-500 font-mono">{warState.aggressor.properties.name.substring(0, 10)}</span>
             </div>
         )}
         {warState.defender && (
             <div className="flex items-center gap-1">
                 <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                 <span className="text-[9px] text-orange-500 font-mono">{warState.defender.properties.name.substring(0, 10)}</span>
             </div>
         )}
      </div>
    </div>
  );
};

export const WarStats: React.FC<WarWidgetProps> = ({ warState }) => {
  const statsA = warState.aggressor ? getCountryStats(warState.aggressor.properties.name) : null;
  const statsB = warState.defender ? getCountryStats(warState.defender.properties.name) : null;
  
  // Calculate relative power
  const powerA = statsA ? (statsA.infantry + statsA.armor + statsA.air + statsA.techLevel * 10) : 0;
  const powerB = statsB ? (statsB.infantry + statsB.armor + statsB.air + statsB.techLevel * 10) : 0;
  const totalPower = powerA + powerB;
  const percentA = totalPower > 0 ? (powerA / totalPower) * 100 : 50;

  if (!warState.aggressor && !warState.defender) {
      return (
          <div className="flex-1 flex items-center justify-center text-slate-600 font-mono text-xs">
              AWAITING TARGET SELECTION...
          </div>
      )
  }

  return (
    <div className="mt-2 font-mono flex flex-col gap-3">
        {/* Power Balance Bar */}
        {(warState.aggressor && warState.defender) && (
            <div className="w-full">
                <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                    <span>PROJ. DOMINANCE</span>
                    <span>{(percentA).toFixed(1)}% vs {(100-percentA).toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 flex overflow-hidden border border-slate-700">
                    <div style={{ width: `${percentA}%` }} className="bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></div>
                    <div className="flex-1 bg-orange-500 shadow-[0_0_10px_#f97316]"></div>
                </div>
            </div>
        )}

        {/* Comparison Grid */}
        <div className="grid grid-cols-3 gap-y-2 text-xs">
            {/* Header */}
            <div className="text-center text-cyan-500 text-[10px] opacity-70">{warState.aggressor?.properties.name.substring(0, 3).toUpperCase() || '--'}</div>
            <div className="text-center text-slate-500 text-[10px]">METRIC</div>
            <div className="text-center text-orange-500 text-[10px] opacity-70">{warState.defender?.properties.name.substring(0, 3).toUpperCase() || '--'}</div>

            {/* Manpower */}
            <div className="text-center font-bold text-cyan-100">{statsA ? (statsA.manpower/1000).toFixed(0)+'K' : '-'}</div>
            <div className="text-center text-slate-500 text-[9px] uppercase tracking-wider">Troops</div>
            <div className="text-center font-bold text-orange-100">{statsB ? (statsB.manpower/1000).toFixed(0)+'K' : '-'}</div>

            {/* Tech Level */}
            <div className="text-center font-bold text-cyan-100">{statsA ? 'MK-'+statsA.techLevel : '-'}</div>
            <div className="text-center text-slate-500 text-[9px] uppercase tracking-wider">Tech</div>
            <div className="text-center font-bold text-orange-100">{statsB ? 'MK-'+statsB.techLevel : '-'}</div>
            
            {/* Cyber Readiness */}
             <div className="text-center font-bold text-cyan-100">{statsA ? statsA.cyber + '%' : '-'}</div>
            <div className="text-center text-slate-500 text-[9px] uppercase tracking-wider">NetSec</div>
            <div className="text-center font-bold text-orange-100">{statsB ? statsB.cyber + '%' : '-'}</div>
        </div>
    </div>
  );
}

// Keeping IntensityChart generic but styled
export const IntensityChart: React.FC = () => {
    // Generate some random looking waveform
  const data = useMemo(() => {
      return Array.from({length: 20}, (_, i) => ({
          name: i.toString(),
          value: Math.floor(Math.random() * 50) + 20
      }))
  }, [])

  return (
    <div className="w-full h-24 relative mt-2 border-t border-cyan-900/30 pt-2">
      <div className="absolute top-2 left-0 text-[9px] text-slate-500 font-mono tracking-widest">SIGNAL_NOISE_RATIO</div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={1}>
          <Tooltip cursor={{fill: 'transparent'}} content={() => null} />
          <Bar dataKey="value" fill="#1e293b" />
          {/* Overlay line trend manually via bars for retro look */}
          <Bar dataKey="value" fill="#0e7490" className="opacity-50" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};