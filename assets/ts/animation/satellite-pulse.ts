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
    
    /**
     * Initialize the satellite pulse system
     */
    function initialize(): void {
      // Clear any existing satellites
      satellites = [];
      
      // Get all satellites
      const satellite1 = document.querySelectorAll('.satellite-pulse-1');
      const satellite2 = document.querySelectorAll('.satellite-pulse-2');
      const satellite3 = document.querySelectorAll('.satellite-pulse-3');
      
      // Store all satellites with their types
      satellite1.forEach(el => {
        const imgElement = el.querySelector('img');
        const profileImage = imgElement ? imgElement.getAttribute('src') || undefined : undefined;
        const altText = imgElement ? imgElement.getAttribute('alt') || undefined : undefined;
        
        satellites.push({ 
          element: el, 
          type: 'blue',
          profileImage
        });
      });
      
      satellite2.forEach(el => {
        const imgElement = el.querySelector('img');
        const profileImage = imgElement ? imgElement.getAttribute('src') || undefined : undefined;
        
        satellites.push({ 
          element: el, 
          type: 'purple',
          profileImage
        });
      });
      
      satellite3.forEach(el => {
        const imgElement = el.querySelector('img');
        const profileImage = imgElement ? imgElement.getAttribute('src') || undefined : undefined;
        
        satellites.push({ 
          element: el, 
          type: 'pink',
          profileImage
        });
      });
    }
    
    /**
     * Create a halo effect that radiates outward
     * @param {Satellite} satellite - The satellite to create a halo for
     */
    function createHaloEffect(satellite: Satellite): void {
      const haloClass = `halo-${satellite.type}`;
      
      // Create a halo element
      const haloElement = document.createElement('div');
      haloElement.classList.add(haloClass);
      haloElement.classList.add("z-10");
      
      // Add the halo to the satellite
      satellite.element.prepend(haloElement);
      
      // Remove halo element after animation completes
      setTimeout(() => {
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
      setTimeout(() => {
        satellite.element.classList.remove(pulseClass);
        satellite.element.classList.add(fadeClass);
        
        // Return to inactive state
        setTimeout(() => {
          satellite.element.classList.remove(fadeClass);
          satellite.element.classList.add(inactiveClass);
          
          // Clean up classes
          setTimeout(() => {
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
      // Initialize the satellite list
      initialize();
      
      // Clear any existing interval
      if (animationInterval !== null) {
        window.clearInterval(animationInterval);
      }
      
      // Start a new interval that triggers a pulse every 5 seconds
      animationInterval = window.setInterval(triggerRandomPulse, 5000);
      
      // Trigger one immediately to start
      triggerRandomPulse();
    }
    
    /**
     * Stop the animation system
     */
    function stopAnimations(): void {
      if (animationInterval !== null) {
        window.clearInterval(animationInterval);
        animationInterval = null;
      }
    }
    
    return {
      startAnimations,
      stopAnimations,
      on: eventBus.on.bind(eventBus)
    };
  }
};