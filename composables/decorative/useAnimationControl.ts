import { ref, watch } from 'vue';

/**
 * Animation control composable that centralizes animation enabling/disabling
 * This pattern follows a singleton approach for global animation state management
 * across the application's decorative and visual components.
 */

interface AnimationController {
  stop: () => void;
  start: () => void;
}

export const useAnimationControl = () => {
  // Reactive state to track if animations are enabled
  const animationsEnabled = ref(true);

  // Track all registered animation instances for central control
  const registeredAnimations = ref<AnimationController[]>([]);
  
  // Keep track of the observer to properly clean it up
  let observer: MutationObserver | null = null;

  // Initialize animation state based on accessibility setting
  if (import.meta.client) {
    animationsEnabled.value = !document.documentElement.classList.contains('disable-animations');
    
    // Listen for changes to the disable-animations class on the HTML element
    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const hasDisableClass = document.documentElement.classList.contains('disable-animations');
          animationsEnabled.value = !hasDisableClass;
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
  }

  /**
   * Register an animation controller with the animation system
   * @param animation - Object with start and stop methods for controlling the animation
   * @returns Unregister function to clean up when component is unmounted
   */
  const registerAnimation = (animation: AnimationController): (() => void) => {
    registeredAnimations.value.push(animation);
    
    // Apply current state immediately
    if (!animationsEnabled.value) {
      animation.stop();
    }
    
    // Return unregister function
    return () => {
      const index = registeredAnimations.value.findIndex(a => a === animation);
      if (index !== -1) {
        registeredAnimations.value.splice(index, 1);
      }
    };
  };

  // Watch for changes to animation enabled state
  watch(animationsEnabled, (enabled) => {
    registeredAnimations.value.forEach(animation => {
      if (enabled) {
        animation.start();
      } else {
        animation.stop();
      }
    });
  });

  // Cleanup function that components can call in their onBeforeUnmount or onUnmounted
  const cleanup = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  return {
    animationsEnabled,
    registerAnimation,
    cleanup // Export the cleanup function
  };
};

// Create a singleton instance for global access
export const animationControl = useAnimationControl();