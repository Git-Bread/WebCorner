import type { ColorPreset } from '../animation/types';

// Feature items for hero section
export const heroFeatures = [
  {
    title: 'Create Servers',
    description: 'Build custom communication servers for your team, department, or entire organization with just a few clicks.',
    icon: 'server'
  },
  {
    title: 'Customize Workflow',
    description: 'Tailor your workspace with components, feeds, and customizable permissions for every team member.',
    icon: 'sliders'
  },
  {
    title: 'Connect Teams',
    description: 'Bring your team together with text channels, group-chats, shared-planning and seamless file sharing.',
    icon: 'users-gear'
  }
];

// Particle preset options
export const particlePresetOptions: ColorPreset[] = [
  {
    id: 'solid-purple',
    style: 'rgba(139, 92, 246, 0.7)',
    title: 'Solid Purple'
  },
  {
    id: 'aurora',
    style: 'linear-gradient(135deg, rgba(52, 211, 153, 0.6), rgba(79, 70, 229, 0.6) 50%, rgba(236, 72, 153, 0.6))',
    title: 'Aurora'
  },
  {
    id: 'cyberpunk',
    style: 'linear-gradient(135deg, rgba(249, 115, 22, 0.7), rgba(217, 70, 239, 0.5), rgba(6, 182, 212, 0.7))',
    title: 'Cyberpunk'
  },
  {
    id: 'electric-lime',
    style: 'linear-gradient(135deg, rgba(163, 230, 53, 0.8), rgba(250, 204, 21, 0.7), rgba(56, 189, 248, 0.6))',
    title: 'Electric Lime'
  },
  {
    id: 'candy',
    style: 'linear-gradient(135deg, rgba(244, 114, 182, 0.6), rgba(250, 204, 21, 0.6), rgba(59, 130, 246, 0.6))',
    title: 'Candy'
  },
  {
    id: 'sunset-glow',
    style: 'linear-gradient(135deg, rgba(249, 115, 22, 0.8), rgba(244, 63, 94, 0.7), rgba(168, 85, 247, 0.7))',
    title: 'Sunset Glow'
  },
  // New high contrast options
  {
    id: 'neon',
    style: 'linear-gradient(135deg, rgba(0, 255, 255, 0.7), rgba(255, 0, 255, 0.7), rgba(255, 255, 0, 0.7))',
    title: 'Neon'
  },
  {
    id: 'dark-contrast',
    style: 'rgba(30, 30, 30, 0.8)',
    title: 'Slate Black'
  },
  {
    id: 'white-glow',
    style: 'rgba(255, 255, 255, 0.9)',
    title: 'Pure White'
  },
  {
    id: 'solid-blue',
    style: 'rgba(96, 165, 250, 0.7)', // Increased opacity for better visibility
    title: 'Solid Blue'
  },
  {
    id: 'cosmic-blue',
    style: 'linear-gradient(135deg, rgba(96, 165, 250, 0.5), rgba(139, 92, 246, 0.5), rgba(52, 211, 153, 0.5))',
    title: 'Cosmic Blue'
  },
  {
    id: 'solid-green',
    style: 'rgba(52, 211, 153, 0.7)', // Increased opacity for better visibility
    title: 'Solid Green'
  }
];

// Interaction preset options - 6 different styles
export const interactionPresetOptions: ColorPreset[] = [
  {
    id: 'teal',
    style: 'rgba(20, 184, 166, 1)',
    title: 'Teal'
  },
  {
    id: 'pink',
    style: 'rgba(244, 114, 182, 1)',
    title: 'Pink'
  },
  {
    id: 'purple',
    style: 'rgba(139, 92, 246, 1)',
    title: 'Purple'
  },
  {
    id: 'gold',
    style: 'rgba(250, 204, 21, 1)',
    title: 'Gold'
  },
  {
    id: 'red',
    style: 'rgba(239, 68, 68, 1)',
    title: 'Red'
  },
  {
    id: 'blue',
    style: 'rgba(59, 130, 246, 1)',
    title: 'Blue'
  }
];

// Default animation settings
export const defaultAnimationSettings = {
  particleCount: 150,
  maxDistance: 80,
  mouseRadius: 80,
  mainParticleColor: 'rgba(139, 92, 246, 0.7)', // solid-purple default
  interactionColor: 'rgba(20, 184, 166, 1)', // teal default
  selectedParticlePreset: 'solid-purple',
  selectedInteractionPreset: 'teal'
};

// Helper function to find preset style from ID
export const getPresetStyleById = (presetId: string, presetOptions: ColorPreset[]): string => {
  const preset = presetOptions.find(p => p.id === presetId);
  return preset ? preset.style : '';
};