/* eslint-disable @typescript-eslint/no-explicit-any */
// webkitAudioContext is a legacy vendor prefix — no public types available.

export function playChimeAlert(type: string = 'bell', volume: number = 0.5): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("Web Audio API is not supported in this browser.");
      return;
    }

    const ctx = new AudioContextClass();
    
    // Master gain control for volume
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume * 0.5, ctx.currentTime); // Limit max volume slightly for comfort
    masterGain.connect(ctx.destination);

    if (type === 'bell') {
      // Elegant crystal bell sound: high frequency with rapid exponential decay
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.05); // E6 note
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2); // back to A5
      
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.25);
    } else if (type === 'digital') {
      // Gentle double-pip
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5 note
      gain1.gain.setValueAtTime(0.4, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.15); // G5 note
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.3);
    } else {
      // Warm, deep ambient tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(329.63, ctx.currentTime); // E4 note
      
      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.55);
    }
  } catch (e) {
    console.error("Failed to play synthesized audio chime:", e);
  }
}
