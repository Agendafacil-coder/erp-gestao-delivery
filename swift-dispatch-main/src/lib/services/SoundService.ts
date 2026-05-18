/**
 * Premium Synthesized Operational Audio Service
 * Uses browser-native Web Audio API to create sleek, high-fidelity, professional alerts.
 */
class SoundService {
  private ctx: AudioContext | null = null;

  private initContext() {
    if (!this.ctx) {
      // @ts-ignore
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  /**
   * Generates a sleek, cinematic, double-chime high metallic note (soft, not loud)
   * Perfect for professional new orders
   */
  playNewOrder() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // Chime 1
      this.createSineChime(880, 0.12, 0.03, now); // A5 note
      // Chime 2 (slightly offset and higher pitch)
      this.createSineChime(1318.51, 0.15, 0.04, now + 0.1); // E6 note
    } catch (e) {
      console.warn("Audio blocked or not supported:", e);
    }
  }

  /**
   * Generates a premium attention-grabbing double pulse (low frequency, soft warning chime)
   * Perfect for critical SLAs and alerts
   */
  playCriticalAlert() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // Warm synth warning hums
      this.createWarningPulse(330, 0.25, now);     // E4
      this.createWarningPulse(293.66, 0.25, now + 0.18); // D4
    } catch (e) {
      console.warn("Audio blocked or not supported:", e);
    }
  }

  /**
   * Generates a rewarding upward frequency sweep (feels like success)
   * Perfect for delivery completed
   */
  playDeliveryCompleted() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // Sweep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.35); // C6
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn("Audio blocked or not supported:", e);
    }
  }

  /**
   * Generates a sleek, sci-fi cyber whoosh with a high pitch target chime at the end
   * Perfect for AI Auto Dispatch grouping orders
   */
  playAutoDispatch() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // Whoosh oscillator
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.4);
      
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 0.4);
      
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.4);

      // Delicate high-tech chime at the end of whoosh
      this.createSineChime(1567.98, 0.1, 0.03, now + 0.35); // G6
    } catch (e) {
      console.warn("Audio blocked or not supported:", e);
    }
  }

  private createSineChime(freq: number, duration: number, volume: number, time: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);
    
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(time);
    osc.stop(time + duration + 0.1);
  }

  private createWarningPulse(freq: number, duration: number, time: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);
    
    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }
}

export const soundService = new SoundService();
