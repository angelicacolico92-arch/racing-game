/**
 * ENCAPSULATION:
 * The SoundManager hides the complexity of the Web Audio API.
 * It provides a simple interface for the game to trigger sounds.
 */
export class SoundManager {
  private ctx: AudioContext;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private musicNodes: AudioScheduledSourceNode[] = [];
  private nextNoteTime: number = 0;
  private isMusicPlaying: boolean = false;
  private timerID: number | undefined;

  constructor() {
    // Cross-browser support
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
  }

  /**
   * Browser security policy requires AudioContext to be resumed via user gesture.
   */
  public async init() {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Starts a procedural engine sound (Sawtooth wave).
   */
  public startEngine() {
    this.stopEngine(); // Ensure no duplicates

    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 80; // Idle RPM

    // Low pass filter to muffle the harsh sawtooth
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    this.engineGain.gain.value = 0.05; // Quiet volume

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start();
  }

  /**
   * Updates engine pitch based on game speed.
   */
  public updateEngine(speedMultiplier: number) {
    if (this.engineOsc && this.ctx) {
      const targetFreq = 80 + (speedMultiplier * 60);
      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    }
  }

  public stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch (e) { /* ignore */ }
      this.engineOsc = null;
    }
  }

  /**
   * Generates a white noise burst for crashes.
   */
  public playCrash() {
    const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    noise.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
  }

  /**
   * Plays a subtle whoosh for lane changes.
   */
  public playTurn() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  /**
   * Starts the procedural background music loop.
   */
  public startMusic() {
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.nextNoteTime = this.ctx.currentTime;
    this.scheduler();
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    window.clearTimeout(this.timerID);
    this.musicNodes.forEach(node => {
        try { node.stop(); } catch(e) {}
    });
    this.musicNodes = [];
  }

  /**
   * Scheduling loop for the music.
   * "Lookahead" pattern.
   */
  private scheduler() {
    if (!this.isMusicPlaying) return;

    // Schedule notes while within the lookahead window
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.scheduleNote(this.nextNoteTime);
      this.nextNoteTime += 0.25; // tempo: 1/4th second per note
    }
    
    this.timerID = window.setTimeout(() => this.scheduler(), 25);
  }

  private scheduleNote(time: number) {
    // Simple 4-step techno bass
    // Determine the beat in the bar
    const beat = Math.floor(time * 4) % 8;

    // Kick drum on 0, 4
    if (beat === 0 || beat === 4) {
        this.playKick(time);
    }
    
    // Hi-hat on off beats
    if (beat % 2 !== 0) {
        this.playHiHat(time);
    }
    
    // Bass synth
    this.playBass(time, beat);
  }

  private playKick(time: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(time);
    osc.stop(time + 0.5);
    this.musicNodes.push(osc);
  }

  private playHiHat(time: number) {
    // White noise for hi-hat would be better, but high pitch square is a cheap proxy
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    
    // High Pass Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    osc.frequency.setValueAtTime(800, time); // Doesn't matter much for filtered noise, but square needs freq
    
    gain.gain.setValueAtTime(0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.05);
    this.musicNodes.push(osc);
  }

  private playBass(time: number, beat: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    
    // Simple arpeggio
    const freq = beat < 4 ? 55 : 65; // A1 then C2 approx

    osc.frequency.setValueAtTime(freq, time);
    
    // Low pass envelope for "plucky" sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.setTargetAtTime(0, time, 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.2);
    this.musicNodes.push(osc);
  }
}
