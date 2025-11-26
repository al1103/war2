import React, { useState, useEffect, useCallback } from 'react';
import HoloGlobe from './components/HoloGlobe';
import CommandTerminal from './components/CommandTerminal';
import { TacticalRadar, IntensityChart, WarStats } from './components/HudWidgets';
import { INITIAL_LOGS } from './constants';
import { SystemLog, CountryFeature, WarState } from './types';
import { getVisualRecon, simulateWarScenario } from './services/geminiService';

const App: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>(INITIAL_LOGS);
  const [warState, setWarState] = useState<WarState>({ aggressor: null, defender: null, defenderAllies: [] });
  const [isSimulating, setIsSimulating] = useState(false);
  const [isReconLoading, setIsReconLoading] = useState(false);
  const [reconImage, setReconImage] = useState<string | null>(null);
  
  // Selection mode for adding allies
  const [isSelectingAlly, setIsSelectingAlly] = useState(false);

  const addLog = useCallback((message: string, type: SystemLog['type'] = 'INFO') => {
    const newLog: SystemLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      message,
      type
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const handleCountrySelect = useCallback((country: CountryFeature) => {
    setWarState(prev => {
      // 1. Ally Selection Mode
      if (isSelectingAlly) {
        // Prevent selecting self or already selected
        if (prev.aggressor?.id === country.id || prev.defender?.id === country.id || prev.defenderAllies.some(a => a.id === country.id)) {
            addLog(`Invalid Ally Selection: ${country.properties.name}`, 'WARNING');
            return prev;
        }
        addLog(`Ally added to coalition: ${country.properties.name}`, 'INFO');
        setIsSelectingAlly(false); // Turn off mode after selection
        return {
            ...prev,
            defenderAllies: [...prev.defenderAllies, country]
        };
      }

      // 2. Standard Selection Logic
      
      // If clicking the same country, deselect it
      if (prev.aggressor?.id === country.id) {
        addLog(`Faction A (${country.properties.name}) deselected.`, 'INFO');
        return { ...prev, aggressor: null };
      }
      if (prev.defender?.id === country.id) {
        addLog(`Faction B (${country.properties.name}) deselected.`, 'INFO');
        return { ...prev, defender: null, defenderAllies: [] }; // Reset allies if defender clears
      }
      
      // Check if clicking an existing ally -> remove it
      if (prev.defenderAllies.some(a => a.id === country.id)) {
          addLog(`Ally (${country.properties.name}) removed from coalition.`, 'INFO');
          return {
              ...prev,
              defenderAllies: prev.defenderAllies.filter(a => a.id !== country.id)
          };
      }

      // Selection Logic: Fill Aggressor first, then Defender
      if (!prev.aggressor) {
        addLog(`Faction A selected: ${country.properties.name}`, 'INFO');
        return { ...prev, aggressor: country };
      } else if (!prev.defender) {
        addLog(`Faction B selected: ${country.properties.name}`, 'INFO');
        return { ...prev, defender: country };
      } else {
        // If both full, reset Aggressor to new selection, clear Defender (Start over)
        addLog(`Selection reset. Faction A: ${country.properties.name}`, 'INFO');
        return { aggressor: country, defender: null, defenderAllies: [] };
      }
    });
    setReconImage(null);
  }, [addLog, isSelectingAlly]);

  const triggerWarSimulation = async () => {
    if (!warState.aggressor || !warState.defender) return;
    
    setIsSimulating(true);
    const nameA = warState.aggressor.properties.name;
    const nameB = warState.defender.properties.name;
    const allies = warState.defenderAllies.map(a => a.properties.name);

    addLog(`INITIATING WAR SIMULATION: ${nameA} vs ${nameB} ${allies.length > 0 ? `(+ ${allies.length} Allies)` : ''}`, 'WARNING');
    addLog(`Calculating kinetic outcomes...`, 'INFO');
    
    const analysis = await simulateWarScenario(nameA, nameB, allies);
    
    addLog(analysis, 'COMBAT');
    setIsSimulating(false);
  };

  const triggerVisualRecon = async () => {
    const target = warState.aggressor || warState.defender;
    if (!target) return;

    setIsReconLoading(true);
    setReconImage(null);
    addLog(`Requesting satellite visual uplink for ${target.properties.name}...`, 'INFO');

    const imageBase64 = await getVisualRecon(target.properties.name);

    if (imageBase64) {
      setReconImage(imageBase64);
      addLog(`Visual link established. Displaying tactical feed.`, 'INFO');
    } else {
      addLog(`Visual link failed. Satellite obstruction detected.`, 'ERROR');
    }
    setIsReconLoading(false);
  };

  useEffect(() => {
    setTimeout(() => {
      addLog('Welcome back, Commander. Global map loaded.', 'INFO');
    }, 1000);
  }, [addLog]);

  return (
    <div className="w-screen h-screen bg-slate-950 text-cyan-50 overflow-hidden flex flex-col relative">
      {/* Moving Perspective Grid Background */}
      <div className="perspective-grid"></div>

      {/* TOP HEADER */}
      <header className="z-10 h-16 border-b border-cyan-900/50 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 relative shrink-0">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-cyan-500 rounded-sm animate-pulse shadow-[0_0_15px_#06b6d4]"></div>
          <div>
            <h1 className="text-2xl font-bold tracking-[0.2em] font-mono text-white glow-text">AEGIS</h1>
            <p className="text-[10px] text-cyan-500 uppercase tracking-widest">Global Conflict Simulator</p>
          </div>
        </div>
        <div className="flex space-x-8 font-mono text-xs">
          <div className="text-right">
            <span className="block text-slate-500">DEFCON</span>
            <span className="text-xl text-orange-500 font-bold glow-text">1</span>
          </div>
          <div className="text-right">
            <span className="block text-slate-500">SYSTEM</span>
            <span className="text-cyan-400">ONLINE</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <main className="flex-1 z-10 flex p-4 gap-4 min-h-0">
        
        {/* LEFT COLUMN: Controls & Matchup */}
        <aside className="w-1/4 flex flex-col gap-4 min-w-[300px]">
           
           {/* Matchup Panel */}
           <div className="bg-slate-900/50 border border-cyan-900/30 p-4 flex flex-col gap-4 relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-transparent"></div>
              
              <div className="text-xs font-bold text-cyan-400 tracking-widest">CONFLICT CONFIGURATION</div>

              {/* Faction A */}
              <div className={`p-3 border-l-4 transition-all ${
                warState.aggressor ? 'border-orange-500 bg-orange-950/30' : 'border-slate-700 bg-slate-800/20'
              }`}>
                <div className="text-[10px] text-slate-400 uppercase flex justify-between">
                    <span>Faction A (Aggressor)</span>
                    <span className="text-orange-500 font-bold">HOSTILE</span>
                </div>
                <div className={`text-xl font-mono font-bold ${warState.aggressor ? 'text-white' : 'text-slate-600'}`}>
                   {warState.aggressor ? warState.aggressor.properties.name : 'SELECT ON MAP'}
                </div>
              </div>

              <div className="flex justify-center text-red-500 font-bold font-mono text-xs">VS</div>

              {/* Faction B */}
              <div className={`p-3 border-l-4 transition-all relative ${
                warState.defender ? 'border-cyan-500 bg-cyan-950/30' : 'border-slate-700 bg-slate-800/20'
              }`}>
                <div className="text-[10px] text-slate-400 uppercase flex justify-between items-center">
                    <span>Faction B (Defender)</span>
                    {warState.defender && (
                        <button 
                            onClick={() => setIsSelectingAlly(!isSelectingAlly)}
                            className={`px-2 py-0.5 text-[9px] border ${isSelectingAlly ? 'bg-cyan-500 text-black border-cyan-500 animate-pulse' : 'border-cyan-500/50 text-cyan-500 hover:bg-cyan-500/20'}`}
                        >
                            {isSelectingAlly ? 'SELECT ALLY...' : '+ CALL ALLY'}
                        </button>
                    )}
                </div>
                <div className={`text-xl font-mono font-bold ${warState.defender ? 'text-white' : 'text-slate-600'}`}>
                   {warState.defender ? warState.defender.properties.name : 'SELECT ON MAP'}
                </div>

                {/* Ally List */}
                {warState.defenderAllies.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-cyan-500/30">
                        <div className="text-[9px] text-cyan-300 mb-1">COALITION FORCES:</div>
                        <div className="flex flex-wrap gap-1">
                            {warState.defenderAllies.map(ally => (
                                <span key={ally.id} className="text-[10px] bg-cyan-500/20 border border-cyan-500/30 px-1 rounded text-cyan-100">
                                    {ally.properties.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
              </div>
           </div>

           {/* Quick Actions */}
           <div className="h-40 bg-slate-900/50 border border-cyan-900/30 p-4 flex flex-col justify-center gap-2 backdrop-blur-sm">
              <div className="text-[10px] text-slate-500 tracking-widest mb-1">COMMAND ACTIONS</div>
              
              {/* Simulate Button */}
              <button 
                onClick={triggerWarSimulation}
                disabled={isSimulating || !warState.aggressor || !warState.defender}
                className="w-full py-3 bg-red-900/30 hover:bg-red-500/20 border border-red-500/50 text-red-300 font-mono text-sm uppercase tracking-wider transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 group"
              >
                {isSimulating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>RUNNING SIMULATION...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <span>SIMULATE WAR</span>
                  </>
                )}
              </button>

              {/* Visual Recon Button */}
              <button 
                onClick={triggerVisualRecon}
                disabled={isReconLoading || !warState.aggressor}
                className="w-full py-2 bg-slate-800/50 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500 text-cyan-300 font-mono text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                 {isReconLoading ? 'UPLINKING...' : 'GENERATE BATTLE VISUAL'}
              </button>
           </div>
           
           <div className="flex-1 bg-black/40 border border-slate-800 p-2 text-[10px] font-mono text-slate-500 overflow-y-auto backdrop-blur-md">
             <p className="mb-2 text-cyan-600">INSTRUCTIONS:</p>
             <ol className="list-decimal pl-4 space-y-1">
               <li>Click country for Aggressor (A).</li>
               <li>Click country for Defender (B).</li>
               <li className="text-cyan-400">Optional: Click "+ CALL ALLY" to add coalition forces for B.</li>
               <li>Click SIMULATE WAR.</li>
             </ol>
           </div>
        </aside>

        {/* CENTER COLUMN: Globe Visualization */}
        <section className="flex-1 bg-slate-900/30 border border-cyan-900/20 relative flex flex-col rounded-lg overflow-hidden group backdrop-blur-sm shadow-[0_0_50px_rgba(0,0,0,0.5)]">
           {/* Decorative UI elements on top of globe */}
           <div className="absolute top-4 left-4 z-20 pointer-events-none">
             <div className="text-[10px] text-cyan-500 font-mono tracking-widest border border-cyan-500/30 px-2 py-1 bg-black/50">
                LIVE FEED // GEO-SPATIAL
             </div>
           </div>
           
           <div className="absolute inset-0">
             {reconImage ? (
                <div className="w-full h-full relative animate-in fade-in duration-500">
                   <div className="absolute inset-0 bg-[radial-gradient(circle,_transparent_30%,_#000_100%)] z-10 pointer-events-none" />
                   <img src={reconImage} alt="Recon" className="w-full h-full object-cover opacity-80" />
                   {/* Scan overlay for image */}
                   <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,_rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] opacity-30 pointer-events-none z-10"></div>
                   
                   {/* Close/Dismiss Button */}
                   <button 
                      onClick={() => setReconImage(null)}
                      className="absolute top-4 right-4 z-30 bg-black/60 hover:bg-red-900/80 text-white border border-white/20 px-3 py-1 text-xs font-mono uppercase transition-colors"
                   >
                     Close Feed [X]
                   </button>
                </div>
             ) : (
                <HoloGlobe 
                  warState={warState}
                  onCountrySelect={handleCountrySelect}
                  isSimulating={isSimulating}
                />
             )}
           </div>

           {/* Loading Overlay */}
           {isReconLoading && (
              <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center backdrop-blur-sm">
                 <div className="text-center">
                    <div className="w-16 h-16 border-4 border-t-cyan-500 border-r-transparent border-b-cyan-500 border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-cyan-500 font-mono tracking-widest animate-pulse">ESTABLISHING UPLINK...</div>
                 </div>
              </div>
           )}

           {/* Bottom Overlay Info */}
           <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 pointer-events-none z-20">
              <div className="text-center text-slate-500 font-mono text-xs">
                 {isSelectingAlly ? (
                    <span className="text-cyan-400 animate-pulse font-bold">SELECT ALLY NATION ON MAP...</span>
                 ) : warState.aggressor ? (
                  <span>
                    TARGET LOCKED: <span className="text-orange-400">{warState.aggressor.properties.name}</span>
                  </span>
                ) : (
                  "SELECT TARGET TERRITORY"
                )}
              </div>
           </div>
        </section>

        {/* RIGHT COLUMN: Stats & Terminal */}
        <aside className="w-1/4 flex flex-col gap-4 min-w-[300px]">
           {/* Stats Panel (Only visible if something selected) */}
           <div className="flex-1 bg-slate-900/50 border border-cyan-900/30 p-4 flex flex-col relative backdrop-blur-sm">
              <div className="text-cyan-400 font-bold text-xs tracking-widest mb-4 flex justify-between">
                <span>WAR ASSETS</span>
                <span className="text-[10px] opacity-50">#SYS-OVR</span>
              </div>
              
              <div className="flex-1 flex flex-col">
                 <div className="flex-1 min-h-[150px]">
                   <TacticalRadar warState={warState} />
                 </div>
                 <WarStats warState={warState} />
                 <div className="flex-1 min-h-[120px]">
                   <IntensityChart />
                 </div>
              </div>
           </div>

           {/* Terminal */}
           <div className="h-1/3 min-h-[250px] shadow-[0_0_20px_rgba(0,0,0,0.5)]">
             <CommandTerminal logs={logs} />
           </div>
        </aside>

      </main>
    </div>
  );
};

export default App;