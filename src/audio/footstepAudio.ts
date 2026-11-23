import type { FootstepSurface } from '../types/universe';

/**
 * Subtle, natural procedural surface-based footstep synthesizer (Web Audio API).
 *
 * Design principles:
 * - Felt more than heard: warm, muted organic textures — never arcade clicks or loud thuds.
 * - Zero external audio URLs or 404 dependencies: pre-allocates tiny shaped noise buffers
 *   once per AudioContext so triggering steps creates negligible overhead.
 * - Natural anti-repetition: alternates subtle left/right foot pitch & stereo panning,
 *   with gentle organic variation in filter cutoff, duration, and amplitude.
 * - Anti-overlap cooldown prevents footsteps from stacking during abrupt speed changes.
 */
export class FootstepSynthesizer {
  private ctx: AudioContext | null = null;
  private destination: AudioNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private stepParity = 0;
  private lastStepTimeMs = 0;

  public attach(ctx: AudioContext, destination: AudioNode): void {
    this.ctx = ctx;
    this.destination = destination;
    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== ctx.sampleRate) {
      // Pre-build a 0.35s pink-tinted noise buffer for earthy, non-harsh textures
      const length = Math.floor(ctx.sampleRate * 0.35);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const ch = buffer.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.95 * b2 + white * 0.048;
        ch[i] = (b0 + b1 + b2 + white * 0.14) * 1.4;
      }
      this.noiseBuffer = buffer;
    }
  }

  public detach(): void {
    this.ctx = null;
    this.destination = null;
  }

  public playStep(surface: FootstepSurface, isRunning: boolean): void {
    if (!this.ctx || !this.destination || !this.noiseBuffer) return;
    if (this.ctx.state !== 'running') return;

    const nowMs = performance.now();
    const minIntervalMs = isRunning ? 215 : 310;
    if (nowMs - this.lastStepTimeMs < minIntervalMs) return;
    this.lastStepTimeMs = nowMs;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const isLeft = this.stepParity % 2 === 0;
    this.stepParity++;

    // Subtle organic variation so repeated steps never feel mechanical
    const pitchJitter = (isLeft ? 0.96 : 1.04) * (0.92 + Math.random() * 0.16);
    const volJitter = 0.88 + Math.random() * 0.24;
    const runGainBoost = isRunning ? 1.18 : 1.0;

    // Gentle stereo placement (barely left/right of center)
    const outNode: AudioNode = this.createPannerIfSupported(ctx, isLeft ? -0.07 : 0.07);

    switch (surface) {
      case 'dirt':
        this.synthDirtStep(ctx, outNode, now, pitchJitter, volJitter * runGainBoost);
        break;
      case 'stone':
        this.synthStoneStep(ctx, outNode, now, pitchJitter, volJitter * runGainBoost);
        break;
      case 'grass':
        this.synthGrassStep(ctx, outNode, now, pitchJitter, volJitter * runGainBoost);
        break;
      case 'school-floor':
        this.synthSchoolFloorStep(ctx, outNode, now, pitchJitter, volJitter * runGainBoost);
        break;
      case 'wood':
        this.synthWoodStep(ctx, outNode, now, pitchJitter, volJitter * runGainBoost);
        break;
    }
  }

  private createPannerIfSupported(ctx: AudioContext, pan: number): AudioNode {
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      panner.connect(this.destination!);
      return panner;
    }
    return this.destination!;
  }

  private triggerNoiseBurst(
    ctx: AudioContext,
    out: AudioNode,
    startTime: number,
    duration: number,
    filterType: BiquadFilterType,
    freq: number,
    q: number,
    peakGain: number,
    attackSec = 0.008,
  ): void {
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const maxOffset = Math.max(0.01, this.noiseBuffer.duration - duration - 0.02);
    const offset = Math.random() * maxOffset;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, startTime);
    filter.Q.value = q;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(peakGain, startTime + attackSec);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    src.connect(filter);
    filter.connect(env);
    env.connect(out);
    src.start(startTime, offset, duration + 0.02);
  }

  private triggerBodyThump(
    ctx: AudioContext,
    out: AudioNode,
    startTime: number,
    startFreq: number,
    endFreq: number,
    duration: number,
    peakGain: number,
  ): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(38, endFreq), startTime + duration);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(peakGain, startTime + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(env);
    env.connect(out);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  /** Soft muted earthy soil contact for village main dirt road & courtyard */
  private synthDirtStep(
    ctx: AudioContext,
    out: AudioNode,
    now: number,
    pitch: number,
    gainScale: number,
  ): void {
    // Soft heel weight
    this.triggerBodyThump(ctx, out, now, 118 * pitch, 62 * pitch, 0.068, 0.095 * gainScale);
    // Warm compacted soil pad
    this.triggerNoiseBurst(
      ctx,
      out,
      now,
      0.078,
      'bandpass',
      380 * pitch,
      1.1,
      0.115 * gainScale,
      0.01,
    );
    // Very delicate fine dry earth settle (trailing 14ms later)
    this.triggerNoiseBurst(
      ctx,
      out,
      now + 0.014,
      0.065,
      'bandpass',
      1380 * pitch,
      1.6,
      0.036 * gainScale,
      0.012,
    );
  }

  /** Very light stone pathway contact — subtle soft tap, never harsh */
  private synthStoneStep(
    ctx: AudioContext,
    out: AudioNode,
    now: number,
    pitch: number,
    gainScale: number,
  ): void {
    this.triggerBodyThump(ctx, out, now, 165 * pitch, 95 * pitch, 0.044, 0.078 * gainScale);
    this.triggerNoiseBurst(
      ctx,
      out,
      now,
      0.045,
      'bandpass',
      1150 * pitch,
      2.2,
      0.072 * gainScale,
      0.004,
    );
    this.triggerNoiseBurst(
      ctx,
      out,
      now + 0.005,
      0.036,
      'bandpass',
      520 * pitch,
      1.5,
      0.06 * gainScale,
      0.005,
    );
  }

  /** Quiet organic grass rustle & soft cushioned step */
  private synthGrassStep(
    ctx: AudioContext,
    out: AudioNode,
    now: number,
    pitch: number,
    gainScale: number,
  ): void {
    this.triggerBodyThump(ctx, out, now, 96 * pitch, 54 * pitch, 0.06, 0.055 * gainScale);
    this.triggerNoiseBurst(
      ctx,
      out,
      now,
      0.115,
      'bandpass',
      2250 * pitch,
      1.4,
      0.055 * gainScale,
      0.022,
    );
    this.triggerNoiseBurst(
      ctx,
      out,
      now + 0.01,
      0.095,
      'bandpass',
      780 * pitch,
      1.0,
      0.042 * gainScale,
      0.018,
    );
  }

  /** Soft indoor classroom floor step — calm, subtle room presence */
  private synthSchoolFloorStep(
    ctx: AudioContext,
    out: AudioNode,
    now: number,
    pitch: number,
    gainScale: number,
  ): void {
    this.triggerBodyThump(ctx, out, now, 148 * pitch, 84 * pitch, 0.054, 0.082 * gainScale);
    this.triggerNoiseBurst(
      ctx,
      out,
      now,
      0.052,
      'bandpass',
      740 * pitch,
      1.9,
      0.068 * gainScale,
      0.005,
    );
    // Tiny soft indoor room tail
    this.triggerNoiseBurst(
      ctx,
      out,
      now + 0.022,
      0.06,
      'lowpass',
      680 * pitch,
      0.8,
      0.024 * gainScale,
      0.01,
    );
  }

  /** Gentle warm wooden reading-room contact for Garad Granthalay */
  private synthWoodStep(
    ctx: AudioContext,
    out: AudioNode,
    now: number,
    pitch: number,
    gainScale: number,
  ): void {
    // Warm hollow timber body
    this.triggerBodyThump(ctx, out, now, 210 * pitch, 118 * pitch, 0.064, 0.095 * gainScale);
    this.triggerNoiseBurst(
      ctx,
      out,
      now,
      0.056,
      'bandpass',
      580 * pitch,
      2.4,
      0.064 * gainScale,
      0.006,
    );
    this.triggerNoiseBurst(
      ctx,
      out,
      now + 0.008,
      0.042,
      'bandpass',
      1020 * pitch,
      1.8,
      0.028 * gainScale,
      0.006,
    );
  }
}
