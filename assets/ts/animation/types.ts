// Type definition for color presets
export interface ColorPreset {
  id: string;
  style: string;
  title: string;
}

// Animation settings type
export interface AnimationSettings {
  particleCount: number;
  maxDistance: number;
  mouseRadius: number;
  mainParticleColor: string;
  interactionColor: string;
  selectedParticlePreset: string;
  selectedInteractionPreset: string;
}