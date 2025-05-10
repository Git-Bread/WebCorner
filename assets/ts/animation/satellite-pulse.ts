/**
 * Enhanced Satellite Pulse Animation Controller
 * Triggers a random satellite pulse with an expanding halo effect
 */

// Define a Satellite type for better type safety
interface Satellite {
  element: Element;
  type: 'blue' | 'purple' | 'pink';
  profileImage?: string;
}

// Create a custom event emitter
const eventBus = {
  listeners: {} as Record<string, Function[]>,
  
  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    
    // Return unsubscribe function for cleanup
    return () => {
      const index = this.listeners[event]?.indexOf(callback);
      if (index !== undefined && index !== -1) {
        this.listeners[event].splice(index, 1);
      }
    };
  },
  
  emit(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
};

export default {
  setup() {
    let satellites: Satellite[] = [];
    let animationInterval: number | null = null;
    let activeTimeouts: number[] = [];
    
    /**
     * Initialize the satellite pulse system
     */
    function initialize(): void {
      // Clear any existing satellites
      satellites = [];
      
      // Helper function to process satellite elements
      const processSatellites = (elements: NodeListOf<Element>, type: 'blue' | 'purple' | 'pink') => {
        elements.forEach(el => {
          const imgElement = el.querySelector('img');
          const profileImage = imgElement ? imgElement.getAttribute('src') || undefined : undefined;
          
          satellites.push({ 
            element: el, 
            type,
            profileImage
          });
        });
      };
      
      // Get and process all satellites
      processSatellites(document.querySelectorAll('.satellite-pulse-1'), 'blue');
      processSatellites(document.querySelectorAll('.satellite-pulse-2'), 'purple');
      processSatellites(document.querySelectorAll('.satellite-pulse-3'), 'pink');
    }
    
    /**
     * Clean up all active timeouts
     */
    function clearTimeouts(): void {
      activeTimeouts.forEach(id => window.clearTimeout(id));
      activeTimeouts = [];
    }
    
    /**
     * Create a tracked timeout that we can clean up later
     */
    function createTimeout(callback: () => void, delay: number): number {
      const timeoutId = window.setTimeout(() => {
        // Remove from active timeouts when executed
        const index = activeTimeouts.indexOf(timeoutId);
        if (index !== -1) {
          activeTimeouts.splice(index, 1);
        }
        callback();
      }, delay);
      
      activeTimeouts.push(timeoutId);
      return timeoutId;
    }
    
    /**
     * Create a halo effect that radiates outward
     * @param {Satellite} satellite - The satellite to create a halo for
     */
    function createHaloEffect(satellite: Satellite): void {
      const haloClass = `halo-${satellite.type}`;
      
      // Check if halo already exists to prevent duplicates
      const existingHalo = satellite.element.querySelector(`.${haloClass}`);
      if (existingHalo) return;
      
      // Create a halo element
      const haloElement = document.createElement('div');
      haloElement.classList.add(haloClass, "z-10");
      
      // Add the halo to the satellite
      satellite.element.prepend(haloElement);
      
      // Remove halo element after animation completes
      createTimeout(() => {
        if (satellite.element.contains(haloElement)) {
          satellite.element.removeChild(haloElement);
        }
      }, 3000); // 3 seconds to match animation duration
    }
    
    /**
     * Create a pulse effect on a satellite
     * @param {Satellite} satellite - The satellite object to pulse
     */
    function pulseSatellite(satellite: Satellite): void {
      // Get the pulse color based on satellite type
      const pulseClass = `pulse-${satellite.type}-active`;
      const fadeClass = `pulse-${satellite.type}-fading`;
      const inactiveClass = `pulse-${satellite.type}-inactive`;
      
      // Add the halo effect
      createHaloEffect(satellite);
      
      // Emit event for chat message
      eventBus.emit('satellitePulse', {
        type: satellite.type,
        profileImage: satellite.profileImage
      });
      
      // Apply the pulse class
      satellite.element.classList.add(pulseClass);
      
      // Fade down after a short delay
      createTimeout(() => {
        if (!satellite.element) return; // Safety check
        
        satellite.element.classList.remove(pulseClass);
        satellite.element.classList.add(fadeClass);
        
        // Return to inactive state
        createTimeout(() => {
          if (!satellite.element) return; // Safety check
          
          satellite.element.classList.remove(fadeClass);
          satellite.element.classList.add(inactiveClass);
          
          // Clean up classes
          createTimeout(() => {
            if (!satellite.element) return; // Safety check
            
            satellite.element.classList.remove(inactiveClass);
          }, 300);
        }, 500);
      }, 500);
    }
    
    /**
     * Trigger a random pulse
     */
    function triggerRandomPulse(): void {
      if (satellites.length === 0) return;
      
      // Get a random satellite
      const randomIndex = Math.floor(Math.random() * satellites.length);
      const randomSatellite = satellites[randomIndex];
      
      // Pulse it
      pulseSatellite(randomSatellite);
    }
    
    /**
     * Start the animation system
     */
    function startAnimations(): void {
      // Stop any existing animations first
      stopAnimations();
      
      // Initialize the satellite list
      initialize();
      
      // Start a new interval that triggers a pulse every 5 seconds
      animationInterval = window.setInterval(triggerRandomPulse, 5000);
      
      // Trigger one with small delay to ensure DOM is ready
      createTimeout(triggerRandomPulse, 300);
    }
    
    /**
     * Stop the animation system
     */
    function stopAnimations(): void {
      // Clear interval
      if (animationInterval !== null) {
        window.clearInterval(animationInterval);
        animationInterval = null;
      }
      
      // Clear all active timeouts
      clearTimeouts();
    }
    
    return {
      startAnimations,
      stopAnimations,
      on: eventBus.on.bind(eventBus)
    };
  }
};