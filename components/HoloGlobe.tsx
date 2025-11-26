import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { CountryFeature, WarState } from '../types';

interface HoloGlobeProps {
  warState: WarState;
  onCountrySelect: (country: CountryFeature) => void;
  isSimulating: boolean;
}

// Particle System Types
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Missile {
  t: number; // Progress 0 to 1
  speed: number;
  offset: number; // Offset from start time
  id: number;
  pathIndex: number; // Which conflict path this missile belongs to
}

interface ConflictPath {
  start: [number, number]; // [lng, lat]
  end: [number, number];   // [lng, lat]
  color: string;
  type: 'AGGRESSION' | 'COUNTER_ATTACK';
}

const HoloGlobe: React.FC<HoloGlobeProps> = ({ warState, onCountrySelect, isSimulating }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [worldData, setWorldData] = useState<any>(null);
  
  // Refs for Prop Data (to access inside render loop without re-triggering effect)
  const warStateRef = useRef(warState);
  const isSimulatingRef = useRef(isSimulating);
  const onCountrySelectRef = useRef(onCountrySelect);

  // Keep refs updated
  useEffect(() => { warStateRef.current = warState; }, [warState]);
  useEffect(() => { isSimulatingRef.current = isSimulating; }, [isSimulating]);
  useEffect(() => { onCountrySelectRef.current = onCountrySelect; }, [onCountrySelect]);
  
  // Physics & Interaction State
  const rotationRef = useRef<[number, number]>([0, -20]);
  const velocityRef = useRef<[number, number]>([0.02, 0]); // Inertia
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });
  const startDragRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });
  
  // Load World Data
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(response => response.json())
      .then(topology => {
        const countries = topojson.feature(topology, topology.objects.countries);
        setWorldData(countries);
      })
      .catch(err => console.error("Failed to load map data", err));
  }, []);

  // Main Graphics Loop
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current || !worldData) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // High DPI Support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.scale(dpr, dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Projections
    // 1. Front (Clipped)
    const projection = d3.geoOrthographic()
      .scale(height / 2.2)
      .translate([width / 2, height / 2])
      .clipAngle(90)
      .rotate(rotationRef.current); // Set initial rotation

    const path = d3.geoPath()
      .projection(projection)
      .context(context);

    // 2. Back (Full globe for transparency effect)
    const backProjection = d3.geoOrthographic()
      .scale(height / 2.2)
      .translate([width / 2, height / 2])
      .clipAngle(180)
      .rotate(rotationRef.current);
    
    const backPath = d3.geoPath()
      .projection(backProjection)
      .context(context);

    // Animation Variables
    let animationId: number;
    let particles: Particle[] = [];
    let missiles: Missile[] = [];
    let lastTime = Date.now();
    
    // Initialize missiles for multiple paths
    const initMissiles = () => {
        missiles = [];
        // We will spawn missiles dynamically based on active paths in the render loop
        // But to keep state simple, we can pre-seed a pool
        for(let i=0; i<20; i++) {
            missiles.push({
                t: Math.random(), // Start at random positions
                speed: 0.2 + Math.random() * 0.2,
                offset: Math.random(),
                id: i,
                pathIndex: 0 // Placeholder, assigned in render
            });
        }
    };
    initMissiles();

    const render = () => {
      const now = Date.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1); // Cap dt
      lastTime = now;
      
      const currentWarState = warStateRef.current;
      const currentIsSimulating = isSimulatingRef.current;

      // Physics: Rotation & Inertia
      if (!isDraggingRef.current) {
        // Apply friction to velocity
        velocityRef.current[0] *= 0.92;
        velocityRef.current[1] *= 0.92;
        
        // Minimum auto-rotation
        if (Math.abs(velocityRef.current[0]) < 0.05) {
             // slowly ramp back up to idle spin
             velocityRef.current[0] = velocityRef.current[0] * 0.9 + 0.05 * 0.1;
        }

        rotationRef.current[0] += velocityRef.current[0];
        rotationRef.current[1] += velocityRef.current[1];
        
        // Clamp Y rotation
        rotationRef.current[1] = Math.max(-45, Math.min(45, rotationRef.current[1]));
      }

      projection.rotate(rotationRef.current);
      backProjection.rotate(rotationRef.current);

      // Clear
      context.clearRect(0, 0, width, height);

      // --- LAYER 1: BACKSIDE (Transparency Effect) ---
      context.beginPath();
      backPath(worldData);
      context.fillStyle = 'rgba(6, 182, 212, 0.03)';
      context.fill();
      context.strokeStyle = 'rgba(6, 182, 212, 0.05)';
      context.lineWidth = 0.5;
      context.stroke();

      // --- LAYER 2: ATMOSPHERE & GLOW ---
      const gradient = context.createRadialGradient(width/2, height/2, height/2.5 - 20, width/2, height/2, height/2.2 + 20);
      gradient.addColorStop(0, "rgba(2, 6, 23, 0)");
      gradient.addColorStop(0.85, "rgba(6, 182, 212, 0.1)"); // Inner glow
      gradient.addColorStop(1, "rgba(6, 182, 212, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      // --- LAYER 3: FRONT SIDE COUNTRIES ---
      // Draw grid
      const graticule = d3.geoGraticule();
      context.beginPath();
      path(graticule());
      context.lineWidth = 0.5;
      context.strokeStyle = 'rgba(6, 182, 212, 0.1)';
      context.stroke();

      // Draw Countries
      if (worldData.features) {
        worldData.features.forEach((feature: CountryFeature) => {
          context.beginPath();
          path(feature);
          
          const isAggressor = currentWarState.aggressor?.id === feature.id;
          const isDefender = currentWarState.defender?.id === feature.id;
          const isAlly = currentWarState.defenderAllies.some(ally => ally.id === feature.id);

          if (isAggressor) {
            context.fillStyle = 'rgba(234, 88, 12, 0.6)'; // Red/Orange (Aggressor)
            context.fill();
            context.shadowBlur = 10;
            context.shadowColor = '#f97316';
            context.strokeStyle = '#fdba74';
            context.lineWidth = 1;
          } else if (isDefender) {
            context.fillStyle = 'rgba(6, 182, 212, 0.5)'; // Cyan (Defender)
            context.fill();
            context.shadowBlur = 10;
            context.shadowColor = '#22d3ee';
            context.strokeStyle = '#a5f3fc';
            context.lineWidth = 1;
          } else if (isAlly) {
            context.fillStyle = 'rgba(59, 130, 246, 0.5)'; // Blue (Ally)
            context.fill();
            context.shadowBlur = 8;
            context.shadowColor = '#3b82f6';
            context.strokeStyle = '#93c5fd';
            context.lineWidth = 1;
          } else {
             // Standard Country
             context.fillStyle = 'rgba(2, 6, 23, 0.8)'; // Dark background
             context.fill();
             context.shadowBlur = 0;
             context.strokeStyle = 'rgba(6, 182, 212, 0.4)';
             context.lineWidth = 0.8;
          }
          context.stroke();
          
          // Reset shadow
          context.shadowBlur = 0;
        });
      }

      // --- LAYER 4: WAR SIMULATION ---
      if (currentWarState.aggressor && currentWarState.defender && currentIsSimulating) {
        
        // Define all active conflict paths
        const paths: ConflictPath[] = [];
        
        const centerAggressor = d3.geoCentroid(currentWarState.aggressor);
        const centerDefender = d3.geoCentroid(currentWarState.defender);
        
        // 1. Primary: Aggressor -> Defender
        paths.push({
            start: centerAggressor,
            end: centerDefender,
            color: '#f97316', // Orange
            type: 'AGGRESSION'
        });

        // 2. Secondary: Allies -> Aggressor (Counter-attack)
        currentWarState.defenderAllies.forEach(ally => {
            const centerAlly = d3.geoCentroid(ally);
            paths.push({
                start: centerAlly,
                end: centerAggressor, // Attack the aggressor
                color: '#22d3ee', // Cyan
                type: 'COUNTER_ATTACK'
            });
        });

        // Draw paths and update missiles
        paths.forEach((p, pathIdx) => {
             // Draw Trajectory Line
            const trajectory: any = { type: "LineString", coordinates: [p.start, p.end] };
            context.beginPath();
            path(trajectory);
            context.setLineDash([4, 8]);
            context.lineDashOffset = -now * (pathIdx === 0 ? 0.05 : 0.03); // Animate dash
            context.lineWidth = 2;
            context.strokeStyle = p.color === '#f97316' ? 'rgba(234, 179, 8, 0.6)' : 'rgba(34, 211, 238, 0.5)'; 
            context.stroke();
            context.setLineDash([]); // Reset
        });

        // Update & Draw Missiles (Jets)
        // We assign missiles to paths using modulo
        const interpolators = paths.map(p => d3.geoInterpolate(p.start, p.end));
        
        missiles.forEach((m, idx) => {
            const assignedPathIdx = idx % paths.length; // Distribute missiles across all paths
            const interpolator = interpolators[assignedPathIdx];
            const p = paths[assignedPathIdx];

            // Update time
            m.t += m.speed * dt;
            const cycleT = (m.t + m.offset) % 1.5; // Loop with gap

            if (cycleT <= 1) {
                // Current position
                const pos = interpolator(cycleT);
                const projectedPos = projection(pos);

                // Future position for rotation angle
                const nextT = Math.min(1, cycleT + 0.01);
                const nextPos = interpolator(nextT);
                const nextProjected = projection(nextPos);

                // Visibility check (is it on front side?)
                const center = [width/2, height/2];
                if (projectedPos && nextProjected) {
                   const dist = Math.sqrt(Math.pow(projectedPos[0] - center[0], 2) + Math.pow(projectedPos[1] - center[1], 2));
                   
                   // Check if visible (within globe radius)
                   if (dist < (height/2.2)) {
                       
                       // Calculate Rotation Angle
                       const angle = Math.atan2(
                           nextProjected[1] - projectedPos[1], 
                           nextProjected[0] - projectedPos[0]
                       );

                       context.save();
                       context.translate(projectedPos[0], projectedPos[1]);
                       context.rotate(angle);

                       // --- Draw Fighter Jet Shape ---
                       context.beginPath();
                       context.moveTo(8, 0); 
                       context.lineTo(-4, 5); 
                       context.lineTo(-2, 2); 
                       context.lineTo(-6, 0); 
                       context.lineTo(-2, -2); 
                       context.lineTo(-4, -5); 
                       context.closePath();

                       context.fillStyle = '#fff';
                       context.shadowBlur = 8;
                       context.shadowColor = p.color; 
                       context.fill();
                       context.restore();

                       // --- Draw Afterburner Trail ---
                       const prevPos = projection(interpolator(Math.max(0, cycleT - 0.05)));
                       if (prevPos) {
                           context.beginPath();
                           context.moveTo(projectedPos[0], projectedPos[1]);
                           context.lineTo(prevPos[0], prevPos[1]);
                           context.strokeStyle = p.color === '#f97316' ? 'rgba(249, 115, 22, 0.4)' : 'rgba(34, 211, 238, 0.4)';
                           context.lineWidth = 3;
                           context.lineCap = 'round';
                           context.stroke();
                       }

                       // Spawn impact particles when reaching destination
                       if (cycleT > 0.95 && Math.random() < 0.3) {
                          const destCoords = p.end;
                          const destPos = projection(destCoords);
                          if (destPos) {
                              particles.push({
                                  x: destPos[0],
                                  y: destPos[1],
                                  vx: (Math.random() - 0.5) * 20,
                                  vy: (Math.random() - 0.5) * 20,
                                  life: 1.0,
                                  maxLife: 1.0,
                                  size: Math.random() * 10 + 5,
                                  color: p.color
                              });
                          }
                       }
                   }
                }
            }
        });

        // 3. Particle System (Explosions/Impacts)
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt * 1.5; // Decay
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            
            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            // Draw Shockwave ring
            context.beginPath();
            context.arc(p.x, p.y, p.size * (1 - p.life) * 3, 0, Math.PI * 2);
            context.strokeStyle = `${p.color}${Math.floor(p.life * 255).toString(16).padStart(2, '0')}`;
            context.lineWidth = 2;
            context.stroke();
        }
      }

      // --- LAYER 5: OUTER RING ---
      context.beginPath();
      path({ type: 'Sphere' });
      context.strokeStyle = 'rgba(6, 182, 212, 0.8)';
      context.lineWidth = 2;
      context.stroke();

      animationId = requestAnimationFrame(render);
    };

    render();

    // Event Handlers
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      velocityRef.current = [0, 0]; // Stop inertia on grab
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      startDragRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        
        // Update Rotation directly via ref
        rotationRef.current = [
          rotationRef.current[0] + dx * 0.5, 
          rotationRef.current[1] - dy * 0.5
        ];

        // Store velocity for inertia release
        velocityRef.current = [dx * 0.5, -dy * 0.5];
        
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        
        const dist = Math.sqrt(
          Math.pow(e.clientX - startDragRef.current.x, 2) + 
          Math.pow(e.clientY - startDragRef.current.y, 2)
        );

        // Click detection
        if (dist < 15) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          
          const x = (e.clientX - rect.left) * scaleX / dpr; 
          const y = (e.clientY - rect.top) * scaleY / dpr;

          const inverted = projection.invert([x, y]);
          if (inverted) {
            const clickedCountry = worldData.features.find((feature: any) => {
              return d3.geoContains(feature, inverted);
            });

            if (clickedCountry) {
              onCountrySelectRef.current(clickedCountry);
            }
          }
        }
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [worldData]); 

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative bg-transparent">
      <canvas 
        ref={canvasRef} 
        className="cursor-crosshair active:cursor-grabbing w-full h-full block"
      />
      {!worldData && (
        <div className="absolute inset-0 flex items-center justify-center text-cyan-500 font-mono animate-pulse">
          INITIALIZING GLOBAL TOPOLOGY...
        </div>
      )}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-cyan-500/50 text-xs font-mono tracking-[0.3em] pointer-events-none">
        GLOBAL CONFLICT SIMULATOR // ONLINE
      </div>
    </div>
  );
};

export default HoloGlobe;