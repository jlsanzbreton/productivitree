
// Placeholder for Web Audio API logic
// This would handle loading and playing sounds for UI interactions, ambient effects, etc.

interface AudioEventMap {
  task_complete: string; // path to sound file
  leaf_fall: string;
  watering: string;
  fruit_appear: string;
  ambient_breeze: string;
  background_forest: string;
  ui_interactions: string;
}

const audioEvents: AudioEventMap = {
  task_complete: '/sounds/gentle_chime.mp3',
  leaf_fall: '/sounds/soft_rustle.mp3',
  watering: '/sounds/water_drops.mp3',
  fruit_appear: '/sounds/success_ding.mp3',
  ambient_breeze: '/sounds/wind_gentle.mp3',
  background_forest: '/sounds/forest_ambient.mp3',
  ui_interactions: '/sounds/click_soft.mp3',
};

class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterVolume: GainNode | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private activeAmbientSounds: Map<string, AudioBufferSourceNode> = new Map();
  private generalVolume: number = 0.5; // 0 to 1
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new window.AudioContext();
      this.masterVolume = this.audioContext.createGain();
      this.masterVolume.gain.value = this.generalVolume;
      this.masterVolume.connect(this.audioContext.destination);
    } else {
      console.warn("Web Audio API not supported in this browser.");
    }
  }

  private async loadSound(name: string, filePath: string): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;
    if (this.sounds.has(name)) return this.sounds.get(name) || null;

    try {
      // In a real app, ensure sound files exist at these paths or use placeholders.
      // For this example, we'll assume they might not load and catch errors.
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch sound: ${filePath}, status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sounds.set(name, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error(`Error loading sound ${name}:`, error);
      return null;
    }
  }

  public async preloadSounds(): Promise<void> {
    for (const [name, path] of Object.entries(audioEvents)) {
      await this.loadSound(name, path);
    }
  }

  public playSound(name: keyof AudioEventMap, loop: boolean = false): AudioBufferSourceNode | null {
    if (!this.audioContext || !this.masterVolume || this.isMuted) return null;
    
    const audioBuffer = this.sounds.get(name);
    if (!audioBuffer) {
      console.warn(`Sound ${name} not loaded. Attempting to load now.`);
      this.loadSound(name, audioEvents[name]).then(buffer => {
        if (buffer) this.playSound(name, loop); // Try playing again after load
      });
      return null;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = loop;
    source.connect(this.masterVolume);
    source.start();
    
    if (loop) {
        this.stopAmbientSound(name); // Stop if already playing
        this.activeAmbientSounds.set(name, source);
    }
    return source;
  }
  
  public stopAmbientSound(name: keyof AudioEventMap): void {
    const sourceNode = this.activeAmbientSounds.get(name);
    if (sourceNode) {
        try {
            sourceNode.stop();
        } catch (e) {
            // Ignore if already stopped
        }
        this.activeAmbientSounds.delete(name);
    }
  }

  public stopAllSounds(): void {
    this.activeAmbientSounds.forEach(source => {
        try {
            source.stop();
        } catch (e) {}
    });
    this.activeAmbientSounds.clear();
    // Note: One-shot sounds stop on their own. This primarily targets looped sounds.
  }

  public setVolume(volume: number): void { // volume 0 to 1
    this.generalVolume = Math.max(0, Math.min(1, volume));
    if (this.masterVolume && !this.isMuted) {
      this.masterVolume.gain.value = this.generalVolume;
    }
  }
  
  public getVolume(): number {
      return this.generalVolume;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterVolume) {
      this.masterVolume.gain.value = this.isMuted ? 0 : this.generalVolume;
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // Fade in/out (basic linear fade)
  public fadeTo(targetVolume: number, durationSeconds: number): void {
    if (!this.masterVolume || this.isMuted) return;
    const currentTime = this.audioContext?.currentTime || 0;
    this.masterVolume.gain.linearRampToValueAtTime(targetVolume, currentTime + durationSeconds);
    this.generalVolume = targetVolume; // Update internal volume state
  }
}

const audioManagerInstance = new AudioManager();
// Preload common sounds (optional, can be done on app start)
// audioManagerInstance.preloadSounds(); 

export default audioManagerInstance;

// Example of how to use in a component:
// import audioManager from './services/audioService';
// ...
// audioManager.playSound('task_complete');
// audioManager.playSound('background_forest', true); // Loop background sound
// audioManager.stopAmbientSound('background_forest');
// audioManager.setVolume(0.8);
// audioManager.toggleMute();
