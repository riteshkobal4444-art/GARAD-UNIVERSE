import type {
  AudioMixSettings,
  DestinationId,
  FootstepSurface,
  PortalId,
  SchoolZoneId,
  ScreenId,
  TimeOfDayMode,
} from '../types/universe';
import { FootstepSynthesizer } from './footstepAudio';

interface BusGains {
  music: GainNode;
  environment: GainNode;
  footsteps: GainNode;
  sfx: GainNode;
}

interface EnvLayerGains {
  leaves: GainNode;
  cloudWind: GainNode;
  birds: GainNode;
  classroom: GainNode;
  playground: GainNode;
  library: GainNode;
  amphitheatre: GainNode;
  community: GainNode;
  nightInsects: GainNode;
}

interface MusicLayerGains {
  hubPad: GainNode;
  villageBansuri: GainNode;
  stageWarmth: GainNode;
  communityStrings: GainNode;
}

/**
 * Layered immersive Web Audio API soundscape for Garad Universe — The World of Little Dreams.
 *
 * Architecture:
 * - Independent Master, Music, Environment, and SFX buses with live smooth gain updates.
 * - Strictly respects browser autoplay rules: initializes and unlocks cleanly upon the first
 *   user gesture when enabled (never throws autoplay errors or duplicates music tracks).
 * - Preserves all existing Mission Bharari Village & School audio layers while adding:
 *   • Cloud Arrival airy wind & opening sunlight chime
 *   • Central Hub peaceful birdsong, breeze & hopeful acoustic pad
 *   • Bharari gentle chirps, portal-guide call & soft feathered wing-flap
 *   • Distinct portal approach, activation, entry & return-to-hub harmonic accents
 *   • Abhivyaktā warm open-air stage atmosphere & Sankalp community garden ambience
 */
class AmbientSoundscape {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buses: BusGains | null = null;
  private envLayers: EnvLayerGains | null = null;
  private musicLayers: MusicLayerGains | null = null;
  private activeSources: AudioScheduledSourceNode[] = [];
  private timers: number[] = [];
  private isRunning = false;
  private unlockedByGesture = false;
  private readonly footsteps = new FootstepSynthesizer();

  private settings: AudioMixSettings = {
    muted: false,
    master: 0.72,
    music: 0.52,
    environment: 0.72,
    footsteps: 0.48,
    sfx: 0.78,
  };

  private currentTimeOfDay: TimeOfDayMode = 'day';
  private currentScreen: ScreenId = 'cloud-arrival';
  private currentDestination: DestinationId | null = null;
  private currentSchoolZone: SchoolZoneId | null = null;

  // Warm Raag Bhupali pentatonic scale (C5, D5, E5, G5, A5, C6)
  private readonly pentatonicHz = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  private readonly chordRootsHz = [261.63, 293.66, 329.63, 392.0];

  public getSettings(): AudioMixSettings {
    return { ...this.settings };
  }

  public getEnabled(): boolean {
    return !this.settings.muted && this.isRunning;
  }

  /**
   * Call on any user gesture (pointerdown / keydown / button click) to cleanly satisfy
   * browser AudioContext autoplay policies without errors.
   */
  public unlockFromUserGesture(): void {
    this.unlockedByGesture = true;
    if (this.settings.muted) return;
    if (!this.isRunning) {
      this.startEngine();
    } else if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public updateSettings(partial: Partial<AudioMixSettings>): AudioMixSettings {
    const wasMuted = this.settings.muted;
    this.settings = {
      ...this.settings,
      ...partial,
      master: clamp01(partial.master ?? this.settings.master),
      music: clamp01(partial.music ?? this.settings.music),
      environment: clamp01(partial.environment ?? this.settings.environment),
      footsteps: clamp01(partial.footsteps ?? this.settings.footsteps),
      sfx: clamp01(partial.sfx ?? this.settings.sfx),
    };

    if (this.settings.muted && !wasMuted) {
      this.stopEngine();
    } else if (!this.settings.muted && !this.isRunning && this.unlockedByGesture) {
      this.startEngine();
    } else {
      this.applyBusVolumes();
    }
    return this.getSettings();
  }

  public toggle(): boolean {
    this.unlockedByGesture = true;
    if (this.settings.muted || !this.isRunning) {
      this.settings.muted = false;
      this.startEngine();
      this.playChirp('happy');
      return true;
    }
    this.settings.muted = true;
    this.stopEngine();
    return false;
  }

  public setContext(
    timeOfDay: TimeOfDayMode,
    screen: ScreenId,
    destination: DestinationId | null,
    schoolZone: SchoolZoneId | null = null,
  ): void {
    this.currentTimeOfDay = timeOfDay;
    this.currentScreen = screen;
    this.currentDestination = destination;
    this.currentSchoolZone = schoolZone;
    if (this.isRunning) {
      this.applyLayerMix();
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.0001;
      this.masterGain.connect(this.ctx.destination);

      const makeBus = () => {
        const g = this.ctx!.createGain();
        g.gain.value = 0.7;
        g.connect(this.masterGain!);
        return g;
      };

      this.buses = {
        music: makeBus(),
        environment: makeBus(),
        footsteps: makeBus(),
        sfx: makeBus(),
      };
      this.footsteps.attach(this.ctx, this.buses.footsteps);

      const makeSub = (parent: GainNode) => {
        const g = this.ctx!.createGain();
        g.gain.value = 0.0001;
        g.connect(parent);
        return g;
      };

      this.envLayers = {
        leaves: makeSub(this.buses.environment),
        cloudWind: makeSub(this.buses.environment),
        birds: makeSub(this.buses.environment),
        classroom: makeSub(this.buses.environment),
        playground: makeSub(this.buses.environment),
        library: makeSub(this.buses.environment),
        amphitheatre: makeSub(this.buses.environment),
        community: makeSub(this.buses.environment),
        nightInsects: makeSub(this.buses.environment),
      };

      this.musicLayers = {
        hubPad: makeSub(this.buses.music),
        villageBansuri: makeSub(this.buses.music),
        stageWarmth: makeSub(this.buses.music),
        communityStrings: makeSub(this.buses.music),
      };
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private startEngine(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.envLayers || !this.musicLayers) return;
    if (this.isRunning) {
      this.applyBusVolumes();
      this.applyLayerMix();
      return;
    }
    this.isRunning = true;
    this.startContinuousBeds(ctx, this.envLayers);
    this.applyBusVolumes();
    this.applyLayerMix();
    this.scheduleBirdLoop();
    this.scheduleMusicalPhraseLoop();
    this.scheduleContextDetailsLoop();
  }

  private stopEngine(): void {
    this.isRunning = false;
    for (const id of this.timers) {
      window.clearTimeout(id);
    }
    this.timers = [];

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0.0001, now, 0.16);
    }

    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // already stopped
      }
      src.disconnect();
    }
    this.activeSources = [];
  }

  private applyBusVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.buses) return;
    const now = this.ctx.currentTime;
    const targetMaster = this.settings.muted ? 0.0001 : Math.max(0.0001, this.settings.master * 0.42);
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(targetMaster, now, 0.18);

    this.buses.music.gain.setTargetAtTime(Math.max(0.0001, this.settings.music), now, 0.16);
    this.buses.environment.gain.setTargetAtTime(
      Math.max(0.0001, this.settings.environment),
      now,
      0.16,
    );
    this.buses.footsteps.gain.setTargetAtTime(
      Math.max(0.0001, this.settings.footsteps * 0.95),
      now,
      0.12,
    );
    this.buses.sfx.gain.setTargetAtTime(Math.max(0.0001, this.settings.sfx), now, 0.12);
  }

  private applyLayerMix(): void {
    if (!this.ctx || !this.envLayers || !this.musicLayers) return;
    const now = this.ctx.currentTime;
    const isDay = this.currentTimeOfDay === 'day';
    const isSunset = this.currentTimeOfDay === 'sunset';
    const isNight = this.currentTimeOfDay === 'night';

    const screen = this.currentScreen;
    const isCloud = screen === 'cloud-arrival';
    const isHub = screen === 'central-hub';
    const isAbhi = screen === 'abhivyakta-world';
    const isSankalp = screen === 'sankalp-world';
    const isDest = screen === 'destination';
    const isSchool = screen === 'school-adventure';
    const isVillageFamily =
      screen === 'welcome' ||
      screen === 'meet-bharari' ||
      screen === 'flying-journey' ||
      screen === 'village-overview' ||
      isDest ||
      isSchool;

    const dest = isDest ? this.currentDestination : null;
    const zone = isSchool ? this.currentSchoolZone : null;
    const indoors = zone === 'classroom' || zone === 'library';

    const setMix = (gainNode: GainNode, target: number) => {
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setTargetAtTime(Math.max(0.0001, target), now, 0.55);
    };

    const isVillageStreet = isSchool && zone === 'village-street';

    // Environment beds (smooth crossfade per scene, peaceful rural village atmosphere)
    setMix(this.envLayers.cloudWind, isCloud ? 0.92 : isHub ? 0.22 : isVillageStreet ? 0.12 : 0.0001);
    setMix(
      this.envLayers.leaves,
      isCloud
        ? 0.08
        : indoors
          ? 0.14
          : isNight
            ? 0.34
            : isVillageStreet
              ? 0.76
              : isHub || isSankalp
                ? 0.72
                : 0.58,
    );
    setMix(
      this.envLayers.birds,
      isNight || isCloud
        ? 0.0001
        : indoors
          ? 0.16
          : isDay
            ? isVillageStreet
              ? 0.78
              : 0.85
            : isSunset
              ? 0.45
              : 0.0001,
    );
    setMix(
      this.envLayers.classroom,
      (dest === 'village-school' || zone === 'classroom') && !isNight ? 0.58 : 0.0001,
    );
    setMix(
      this.envLayers.playground,
      (dest === 'activity-ground' ||
        dest === 'village-school' ||
        zone === 'playground' ||
        zone === 'courtyard') &&
        !isNight
        ? 0.45
        : 0.0001,
    );
    setMix(
      this.envLayers.library,
      dest === 'village-library' || zone === 'library' ? 0.62 : 0.0001,
    );
    setMix(this.envLayers.amphitheatre, isAbhi ? 0.75 : 0.0001);
    setMix(this.envLayers.community, isSankalp ? 0.75 : 0.0001);
    setMix(this.envLayers.nightInsects, isCloud ? 0.0001 : isNight ? 0.82 : isSunset ? 0.16 : 0.0001);

    // Strictly ONE primary musical mood bed active per world (soft & peaceful in village)
    setMix(this.musicLayers.hubPad, isCloud || isHub ? 0.72 : 0.0001);
    setMix(
      this.musicLayers.villageBansuri,
      isVillageFamily ? (isNight ? 0.36 : isVillageStreet ? 0.42 : 0.62) : 0.0001,
    );
    setMix(this.musicLayers.stageWarmth, isAbhi ? 0.72 : 0.0001);
    setMix(this.musicLayers.communityStrings, isSankalp ? 0.72 : 0.0001);
  }

  private registerTimer(fn: () => void, delayMs: number): void {
    const id = window.setTimeout(() => {
      this.timers = this.timers.filter((t) => t !== id);
      if (this.isRunning) fn();
    }, delayMs);
    this.timers.push(id);
  }

  private startContinuousBeds(ctx: AudioContext, layers: EnvLayerGains): void {
    if (this.activeSources.length > 0) return;

    // Shared warm filtered noise buffer (3 seconds loopable)
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.024 * white) / 1.024;
      lastOut = data[i];
      data[i] *= 0.85;
    }

    // 1. Rustling trees & leaves
    const leavesNoise = ctx.createBufferSource();
    leavesNoise.buffer = noiseBuffer;
    leavesNoise.loop = true;
    const leavesFilter = ctx.createBiquadFilter();
    leavesFilter.type = 'bandpass';
    leavesFilter.frequency.value = 430;
    leavesFilter.Q.value = 1.3;
    const leavesGain = ctx.createGain();
    leavesGain.gain.value = 0.085;
    leavesNoise.connect(leavesFilter);
    leavesFilter.connect(leavesGain);
    leavesGain.connect(layers.leaves);
    leavesNoise.start();
    this.activeSources.push(leavesNoise);

    // 2. High-altitude soft cloud wind bed (airy whoosh for Cloud Arrival)
    const cloudNoise = ctx.createBufferSource();
    cloudNoise.buffer = noiseBuffer;
    cloudNoise.loop = true;
    const cloudFilter = ctx.createBiquadFilter();
    cloudFilter.type = 'lowpass';
    cloudFilter.frequency.value = 310;
    cloudFilter.Q.value = 0.9;
    const cloudGain = ctx.createGain();
    cloudGain.gain.value = 0.14;
    cloudNoise.connect(cloudFilter);
    cloudFilter.connect(cloudGain);
    cloudGain.connect(layers.cloudWind);
    cloudNoise.start();
    this.activeSources.push(cloudNoise);

    // 3. Open-air amphitheatre warm hushed room tone
    const hallNoise = ctx.createBufferSource();
    hallNoise.buffer = noiseBuffer;
    hallNoise.loop = true;
    const hallFilter = ctx.createBiquadFilter();
    hallFilter.type = 'bandpass';
    hallFilter.frequency.value = 280;
    hallFilter.Q.value = 1.6;
    const hallGain = ctx.createGain();
    hallGain.gain.value = 0.045;
    hallNoise.connect(hallFilter);
    hallFilter.connect(hallGain);
    hallGain.connect(layers.amphitheatre);
    hallNoise.start();
    this.activeSources.push(hallNoise);

    // 4. Gentle night cricket chorus
    const cricketOsc = ctx.createOscillator();
    cricketOsc.type = 'sine';
    cricketOsc.frequency.value = 4160;
    const cricketLfo = ctx.createOscillator();
    cricketLfo.type = 'sine';
    cricketLfo.frequency.value = 13.2;
    const cricketLfoGain = ctx.createGain();
    cricketLfoGain.gain.value = 0.014;
    const cricketAmp = ctx.createGain();
    cricketAmp.gain.value = 0.017;
    cricketLfo.connect(cricketLfoGain);
    cricketLfoGain.connect(cricketAmp.gain);
    cricketOsc.connect(cricketAmp);
    cricketAmp.connect(layers.nightInsects);
    cricketOsc.start();
    cricketLfo.start();
    this.activeSources.push(cricketOsc, cricketLfo);
  }

  private scheduleBirdLoop(): void {
    if (!this.isRunning) return;
    const delayMs = 2200 + Math.random() * 3400;
    this.registerTimer(() => {
      if (this.currentTimeOfDay !== 'night' && this.currentScreen !== 'cloud-arrival') {
        this.playAmbientSongbird();
      }
      this.scheduleBirdLoop();
    }, delayMs);
  }

  private playAmbientSongbird(): void {
    if (!this.ctx || !this.envLayers) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const baseFreq = 1780 + Math.random() * 920;
    const syllables = 2 + Math.floor(Math.random() * 2);

    // Gentle spatial placement across left/right trees & distance attenuation
    const distanceScale = 0.55 + Math.random() * 0.45;
    let birdDest: AudioNode = this.envLayers.birds;
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = (Math.random() * 2 - 1) * 0.72;
      panner.connect(this.envLayers.birds);
      birdDest = panner;
    }

    for (let i = 0; i < syllables; i++) {
      const start = now + i * 0.15;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, start);
      osc.frequency.exponentialRampToValueAtTime(
        baseFreq * (1.18 + Math.random() * 0.16),
        start + 0.072,
      );
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.94, start + 0.12);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(0.026 * distanceScale, start + 0.022);
      env.gain.exponentialRampToValueAtTime(0.0001, start + 0.125);

      osc.connect(env);
      env.connect(birdDest);
      osc.start(start);
      osc.stop(start + 0.135);
    }
  }

  private scheduleMusicalPhraseLoop(): void {
    if (!this.isRunning) return;
    const delayMs = 2900 + Math.random() * 2600;
    this.registerTimer(() => {
      this.playContextualMusicalNote();
      this.scheduleMusicalPhraseLoop();
    }, delayMs);
  }

  private playContextualMusicalNote(): void {
    if (!this.ctx || !this.musicLayers) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (this.currentScreen === 'cloud-arrival' || this.currentScreen === 'central-hub') {
      // Hopeful, gentle sunlit harmonic pad + airy bell overtone
      const root = this.chordRootsHz[Math.floor(Math.random() * this.chordRootsHz.length)];
      const fifth = root * 1.498;
      for (const freq of [root, fifth]) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(0.036, now + 0.75);
        env.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
        osc.connect(env);
        env.connect(this.musicLayers.hubPad);
        osc.start(now);
        osc.stop(now + 3.3);
      }
      return;
    }

    if (this.currentScreen === 'abhivyakta-world') {
      // Warm orchestral string accent (gentle triangle + lowpass warmth)
      const root = this.chordRootsHz[Math.floor(Math.random() * this.chordRootsHz.length)];
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(root, now);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 640;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.042, now + 0.65);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
      osc.connect(lp);
      lp.connect(env);
      env.connect(this.musicLayers.stageWarmth);
      osc.start(now);
      osc.stop(now + 2.9);
      return;
    }

    if (this.currentScreen === 'sankalp-world') {
      // Warm acoustic plucked community note
      const freq = this.pentatonicHz[Math.floor(Math.random() * this.pentatonicHz.length)] * 0.5;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.048, now + 0.06);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
      osc.connect(env);
      env.connect(this.musicLayers.communityStrings);
      osc.start(now);
      osc.stop(now + 1.85);
      return;
    }

    // Existing Village / School soft Raag Bhupali bansuri phrase
    const freq = this.pentatonicHz[Math.floor(Math.random() * this.pentatonicHz.length)];
    const octaveScale = this.currentTimeOfDay === 'night' ? 0.5 : 1.0;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * octaveScale * 0.992, now);
    osc.frequency.exponentialRampToValueAtTime(freq * octaveScale, now + 0.28);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.052, now + 0.35);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);

    osc.connect(env);
    env.connect(this.musicLayers.villageBansuri);
    osc.start(now);
    osc.stop(now + 1.95);
  }

  private scheduleContextDetailsLoop(): void {
    if (!this.isRunning) return;
    const delayMs = 2000 + Math.random() * 2400;
    this.registerTimer(() => {
      if (this.currentScreen === 'destination') {
        if (this.currentDestination === 'village-school' && this.currentTimeOfDay !== 'night') {
          this.playSoftChalkTap();
        } else if (this.currentDestination === 'village-library') {
          this.playSoftPageTurn();
        } else if (
          this.currentDestination === 'activity-ground' &&
          this.currentTimeOfDay !== 'night'
        ) {
          this.playPlayfulOutdoorPulse();
        }
      } else if (this.currentScreen === 'school-adventure') {
        if (this.currentSchoolZone === 'classroom' && this.currentTimeOfDay !== 'night') {
          this.playSoftChalkTap();
        } else if (this.currentSchoolZone === 'library') {
          this.playSoftPageTurn();
        } else if (this.currentSchoolZone === 'playground' && this.currentTimeOfDay !== 'night') {
          this.playPlayfulOutdoorPulse();
        }
      } else if (this.currentScreen === 'sankalp-world') {
        this.playCommunityWindChime();
      }
      this.scheduleContextDetailsLoop();
    }, delayMs);
  }

  /* ============================================================================
   * SFX & CHARACTER / PORTAL SOUND CUES
   * ============================================================================ */

  public playCloudRevealChime(): void {
    if (!this.isRunning || this.settings.muted || !this.ctx || !this.buses) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      const start = now + idx * 0.14;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, start);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(0.065, start + 0.08);
      env.gain.exponentialRampToValueAtTime(0.0001, start + 1.4);
      osc.connect(env);
      env.connect(this.buses!.sfx);
      osc.start(start);
      osc.stop(start + 1.45);
    });
  }

  public playPortalApproach(portalId: PortalId): void {
    if (!this.isRunning || this.settings.muted || !this.ctx || !this.buses) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const base =
      portalId === 'mission-bharari' ? 587.33 : portalId === 'abhivyakta' ? 659.25 : 523.25;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.12, now + 0.22);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.055, now + 0.04);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(env);
    env.connect(this.buses.sfx);
    osc.start(now);
    osc.stop(now + 0.48);
  }

  public playPortalEnter(portalId: PortalId | 'return-hub'): void {
    if (!this.isRunning || this.settings.muted || !this.ctx || !this.buses) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const chord =
      portalId === 'mission-bharari'
        ? [523.25, 659.25, 783.99]
        : portalId === 'abhivyakta'
          ? [440, 554.37, 659.25, 880]
          : portalId === 'sankalp'
            ? [392, 493.88, 587.33, 783.99]
            : [659.25, 587.33, 523.25];

    chord.forEach((f, idx) => {
      const t = now + idx * 0.09;
      const osc = ctx.createOscillator();
      osc.type = portalId === 'abhivyakta' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.07, t + 0.05);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
      osc.connect(env);
      env.connect(this.buses!.sfx);
      osc.start(t);
      osc.stop(t + 1.0);
    });
  }

  public playExhibitOpen(): void {
    if (!this.isRunning || this.settings.muted || !this.ctx || !this.buses) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, now);
    osc.frequency.exponentialRampToValueAtTime(988, now + 0.14);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.055, now + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(env);
    env.connect(this.buses.sfx);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playWingFlap(): void {
    if (!this.isRunning || this.settings.muted || !this.ctx || !this.buses) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.16);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'bandpass';
    lp.frequency.setValueAtTime(340, now);
    lp.frequency.exponentialRampToValueAtTime(190, now + 0.15);
    lp.Q.value = 1.2;
    const env = ctx.createGain();
    env.gain.value = 0.075;
    src.connect(lp);
    lp.connect(env);
    env.connect(this.buses.sfx);
    src.start(now);
  }

  public playPageTurn(): void {
    if (!this.isRunning || this.settings.muted) return;
    this.playSoftPageTurn();
  }

  public playFootstep(surface: FootstepSurface, isRunning: boolean): void {
    if (!this.isRunning || this.settings.muted || this.settings.footsteps <= 0.005) return;
    this.footsteps.playStep(surface, isRunning);
  }

  public playChirp(kind: 'happy' | 'select' | 'fly' | 'guide' = 'happy'): void {
    if (!this.isRunning || this.settings.muted || !this.ctx || !this.buses) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const notes =
      kind === 'happy'
        ? [
            { f0: 1320, f1: 1840, start: 0, dur: 0.1 },
            { f0: 1580, f1: 2080, start: 0.12, dur: 0.12 },
          ]
        : kind === 'guide'
          ? [
              { f0: 1180, f1: 1560, start: 0, dur: 0.1 },
              { f0: 1480, f1: 1760, start: 0.11, dur: 0.09 },
            ]
          : kind === 'fly'
            ? [
                { f0: 840, f1: 1240, start: 0, dur: 0.16 },
                { f0: 1080, f1: 1620, start: 0.14, dur: 0.19 },
              ]
            : [{ f0: 988, f1: 1318, start: 0, dur: 0.11 }];

    for (const n of notes) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f0, now + n.start);
      osc.frequency.exponentialRampToValueAtTime(n.f1, now + n.start + n.dur);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now + n.start);
      env.gain.linearRampToValueAtTime(0.085, now + n.start + 0.02);
      env.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);

      osc.connect(env);
      env.connect(this.buses.sfx);
      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur + 0.02);
    }
  }

  private playSoftChalkTap(): void {
    if (!this.ctx || !this.envLayers) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.095;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(680 + Math.random() * 240, t);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.018, t + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
      osc.connect(env);
      env.connect(this.envLayers.classroom);
      osc.start(t);
      osc.stop(t + 0.06);
    }
  }

  private playSoftPageTurn(): void {
    if (!this.ctx || !this.envLayers) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.22);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.2);
    filter.Q.value = 2.0;
    const env = ctx.createGain();
    env.gain.value = 0.04;
    src.connect(filter);
    filter.connect(env);
    env.connect(this.envLayers.library);
    src.start(now);
  }

  private playPlayfulOutdoorPulse(): void {
    if (!this.ctx || !this.envLayers) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const f = this.pentatonicHz[Math.floor(Math.random() * 4)];
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f * 0.5, now);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.022, now + 0.04);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(env);
    env.connect(this.envLayers.playground);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  private playCommunityWindChime(): void {
    if (!this.ctx || !this.envLayers) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const f = this.pentatonicHz[Math.floor(Math.random() * this.pentatonicHz.length)] * 1.5;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.015, now + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    osc.connect(env);
    env.connect(this.envLayers.community);
    osc.start(now);
    osc.stop(now + 1.15);
  }

  public dispose(): void {
    this.stopEngine();
    this.footsteps.detach();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
      this.buses = null;
      this.envLayers = null;
      this.musicLayers = null;
    }
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export const ambientSoundscape = new AmbientSoundscape();
