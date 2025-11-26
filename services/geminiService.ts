import { GoogleGenAI } from "@google/genai";
import { ConflictZone } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getTacticalAnalysis = async (zone: ConflictZone): Promise<string> => {
  try {
    const prompt = `
      You are A.E.G.I.S., an advanced futuristic military AI command interface.
      
      Analyze the following conflict zone:
      Zone Name: ${zone.name}
      Threat Level: ${zone.threatLevel}
      Active Units: ${zone.activeUnits}
      Civilian Density: ${zone.civilianDensity}
      Current Intel: ${zone.intelSummary}

      Provide a concise, tactical situation report (SITREP).
      Structure the response as follows:
      1. STRATEGIC ASSESSMENT: (1 sentence)
      2. PREDICTED OUTCOME: (Win Probability %)
      3. RECOMMENDED ACTION: (Short directive)
      
      Keep the tone robotic, efficient, and military-sci-fi.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 150,
        temperature: 0.7,
      }
    });

    return response.text || "Unable to establish link with tactical mainframe.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "CONNECTION ERROR: Tactical link offline. Manual override required.";
  }
};

export const getVisualRecon = async (zoneName: string): Promise<string | null> => {
  try {
    const prompt = `
      In-game screenshot depicting army mobilization effect for ${zoneName}. 
      Isometric view of futuristic military units moving across terrain. 
      Style: Cyberpunk military, highly detailed, unreal engine 5 render style, cinematic lighting.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    return null;
  }
};

// --- PROCEDURAL GENERATION HELPERS (Fallback logic) ---

// Helper to match HudWidgets logic for consistency so the text winner matches the stats bars
const getPowerScore = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = Math.imul(31, h) + name.charCodeAt(i) | 0;
  const seed = Math.abs(h);
  const infantry = 40 + (seed % 60);
  const armor = 40 + ((seed >> 2) % 60);
  const air = 40 + ((seed >> 4) % 60);
  const tech = 1 + (seed % 10);
  // Simple weighted score approximation
  return infantry + armor + air + (tech * 10);
};

const EXTERNAL_EVENTS = [
  "Neighboring nations impose a strict trade embargo, stifling supply lines.",
  "Orbital blockade established by the Lunar Defense Force.",
  "Neutral neighboring states mobilize borders to contain the conflict.",
  "UN Peacekeeping drone squadrons deployed to protect civilian sectors.",
  "Cyber-attack from a rogue third-party state blacks out the region.",
  "Mercenary fleets from the Outer Rim join the aggressor's vanguard.",
  "Global trade routes diverted, causing economic collapse in the defender's rear guard."
];

const BATTLE_TYPES = [
  "Orbital Bombardment",
  "Cyber-Kinetic Hybrid Assault",
  "Amphibious Landing",
  "Guerrilla Drone Warfare",
  "High-Altitude Air Superiority",
  "Mech-Infantry Blitzkrieg"
];

const generateMockWarLog = (countryA: string, countryB: string, allies: string[]): string => {
  const scoreA = getPowerScore(countryA);
  const scoreB = getPowerScore(countryB);
  
  // Add allies score to B (Defender)
  let alliesScore = 0;
  allies.forEach(ally => alliesScore += (getPowerScore(ally) * 0.5)); // Allies count for 50% impact

  // Calculate win chance based on stats
  const total = scoreA + scoreB + alliesScore;
  const chanceA = total === 0 ? 0.5 : scoreA / total;
  const randomFactor = Math.random(); 
  
  // Determine winner (probabilistic but weighted by stats)
  const winner = randomFactor < chanceA ? countryA : countryB;
  const loser = winner === countryA ? countryB : countryA;
  const isCloseMatch = Math.abs(chanceA - 0.5) < 0.1;

  const event = EXTERNAL_EVENTS[Math.floor(Math.random() * EXTERNAL_EVENTS.length)];
  const battleType = BATTLE_TYPES[Math.floor(Math.random() * BATTLE_TYPES.length)];
  const winProb = Math.floor(55 + Math.random() * 40);
  
  return `
*** SIMULATION REPORT (OFFLINE PROTOCOL) ***
SCENARIO: ${countryA} vs ${countryB} ${allies.length > 0 ? `(+ ${allies.join(', ')})` : ''}

1. THEATER OF WAR:
Conflict escalates into a ${battleType}. 
${isCloseMatch ? "Forces are evenly matched in initial skirmishes." : `${winner} demonstrates immediate tactical superiority.`}
${allies.length > 0 ? `The intervention of ${allies.join(', ')} has significantly altered the battlefield dynamics.` : ''}

2. EXTERNAL INFLUENCE:
${event}

3. TACTICAL ANALYSIS:
${winner} effectively counters ${loser}'s defenses using advanced ${battleType.toLowerCase()} tactics. 
${loser} attempts asymmetric countermeasures but sustains heavy infrastructure damage.

4. PREDICTED OUTCOME:
VICTORY: ${winner}
CONFIDENCE: ${winProb}%
${loser} is forced to retreat to secondary defensive lines.
  `.trim();
};

export const simulateWarScenario = async (countryA: string, countryB: string, allies: string[] = []): Promise<string> => {
  try {
    const prompt = `
      Simulate a futuristic military conflict between ${countryA} (Aggressor) and ${countryB} (Defender) in the year 2045.
      
      ${allies.length > 0 ? `CRITICAL CONTEXT: The following nations have joined as allies to DEFEND ${countryB} and are counter-attacking ${countryA}: ${allies.join(', ')}.` : ''}

      You are A.E.G.I.S., a war simulation AI.
      
      Provide a "Battle Simulation Log" covering:
      1. Comparison of military assets.
      2. Impact of Allies (if any). How does ${allies.join(', ')} change the tide?
      3. The Turning Point.
      4. FINAL OUTCOME: Who wins and why?
      
      Format:
      - Short, punchy paragraphs.
      - Use military terminology.
      - Maximum 150 words.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 350,
        temperature: 0.8,
      }
    });

    if (!response.text) throw new Error("Empty response from AI");
    return response.text;

  } catch (error) {
    console.warn("Simulation API Failed or Offline. Engaging Procedural Fallback.");
    return generateMockWarLog(countryA, countryB, allies);
  }
};