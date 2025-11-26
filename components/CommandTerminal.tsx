import React, { useEffect, useRef } from 'react';
import { SystemLog } from '../types';

interface CommandTerminalProps {
  logs: SystemLog[];
}

const CommandTerminal: React.FC<CommandTerminalProps> = ({ logs }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      // Use scrollTo on the container instead of scrollIntoView on an element
      // to prevents the main window from scrolling.
      const { scrollHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        top: scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [logs]);

  return (
    <div className="h-full flex flex-col font-mono text-sm bg-slate-900/80 backdrop-blur-sm border border-cyan-900/50 relative overflow-hidden group">
       {/* Decorative Header */}
       <div className="bg-cyan-950/30 px-3 py-1 border-b border-cyan-900/50 flex justify-between items-center shrink-0">
         <span className="text-cyan-400 font-bold tracking-wider">SYSTEM.LOG</span>
         <div className="flex space-x-1">
           <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
           <div className="w-2 h-2 bg-orange-500 rounded-full opacity-50"></div>
         </div>
       </div>

       {/* Content */}
       <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
         {logs.map((log) => (
           <div key={log.id} className="border-l-2 border-slate-700 pl-3 py-1 animate-in fade-in slide-in-from-left-2 duration-300">
             <div className="flex items-center space-x-2 text-xs opacity-60 mb-0.5">
               <span className="text-cyan-300">{log.timestamp}</span>
               <span className={`uppercase font-bold tracking-wider ${
                 log.type === 'ERROR' || log.type === 'WARNING' ? 'text-orange-500' : 'text-slate-400'
               }`}>
                 [{log.type}]
               </span>
             </div>
             <div className={`${
               log.type === 'AI' ? 'text-cyan-100' : 
               log.type === 'WARNING' ? 'text-orange-300' : 
               'text-slate-300'
             }`}>
               {log.type === 'AI' ? (
                 <span className="whitespace-pre-line leading-relaxed border-l-2 border-cyan-500/50 pl-2 block my-1 shadow-[0_0_15px_rgba(6,182,212,0.1)] bg-cyan-900/10 p-2">
                    {log.message}
                 </span>
               ) : (
                 log.message
               )}
             </div>
           </div>
         ))}
       </div>

       {/* Scanline overlay specific to terminal */}
       <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] opacity-20"></div>
    </div>
  );
};

export default CommandTerminal;