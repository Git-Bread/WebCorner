import { Rectangle, Quadtree } from './quadtree';

// Represents a single particle in the network
interface Particle {
  x: number;       // x-position
  y: number;       // y-position
  vx: number;      // x-velocity
  vy: number;      // y-velocity
  size: number;    // particle size
  alpha: number;   // opacity
  baseVx: number;  // original x-velocity
  baseVy: number;  // original y-velocity
  // Interaction state
  isInteracting: boolean;
  interactionTimeoutId: ReturnType<typeof setTimeout> | null; 
}

// Configuration for event listeners
interface EventConfig {
  element: HTMLElement | Window;  
  event: string;                  
  handler: EventListener;         
  options?: AddEventListenerOptions; // browser event options
}

// Public configuration options for the particle network
export interface ParticleNetworkSettings {
  particleCount?: number;
  maxDistance?: number;
  mainParticleColor?: string;
  interactionColor?: string;
  mouseRadius?: number;
}

export class ParticleNetwork {
  private canvas: HTMLCanvasElement;
  private rootElement: HTMLElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private particles: Particle[] = [];
  private animationFrameId: number | null = null;
  private resizeTimeout: ReturnType<typeof setTimeout> | null = null;
  private quadtree: Quadtree<Particle> | null = null; 
  private eventListeners: EventConfig[] = [];
  
  // Rebuilds the quadtree every N frames to adjust for particle movement
  // This is a performance optimization - updating every frame would be expensive
  private frameCount: number = 0;
  private quadtreeRebuildInterval: number = 10;

  // Mouse/touch interaction state
  private mouse = { x: null as number | null, y: null as number | null, radius: 80 };
  private isAttracting = false;  // whether mouse is attracting (true) or repelling (false)

  // Visual and behavior constants
  private particleCount = 150;
  private maxDistance = 80;       // maximum distance for particles to connect with lines
  private particleBaseAlpha = 0.9;
  private mainParticleColor = '';  // Will be set from CSS variable
  private interactionColor = '';   // Will be set from CSS variable
  private baseLineColor = '';      // Will be set from CSS variable
  private glowColor = '';          // Will be set from CSS variable
  private interactionDuration = 250;      // how long particles stay highlighted after interaction
  private quadtreeCapacity = 4;           // max points per quadtree node before subdivision
  
  // Theme observer to detect theme changes
  private themeObserver: MutationObserver | null = null;

  //Creates a new particle network animation
  constructor(canvas: HTMLCanvasElement, rootElement: HTMLElement) {
    this.canvas = canvas;
    this.rootElement = rootElement;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error("Could not get 2D context from canvas");
    }
    this.ctx = context;

    this.width = canvas.offsetWidth;
    this.height = canvas.offsetHeight;
    canvas.width = this.width;
    canvas.height = this.height;

    // Bind methods to maintain correct 'this' context in event handlers
    this.handleResize = this.handleResize.bind(this);
    this.debouncedResize = this.debouncedResize.bind(this);
    this.handleInteractionStart = this.handleInteractionStart.bind(this);
    this.handleInteractionMove = this.handleInteractionMove.bind(this);
    this.handleInteractionEnd = this.handleInteractionEnd.bind(this);
    this.handleMouseOut = this.handleMouseOut.bind(this);
    this.animate = this.animate.bind(this);

    // Initialize theme colors
    this.updateThemeColors();
    this.observeThemeChanges();
  }

  //Updates animation settings
  public updateSettings(settings: ParticleNetworkSettings): void {
    let needsReinitialize = false;

    // Update settings if provided
    if (settings.maxDistance !== undefined) {
      this.maxDistance = settings.maxDistance;
    }
    if (settings.mainParticleColor !== undefined) {
      this.mainParticleColor = settings.mainParticleColor;
    }
    if (settings.interactionColor !== undefined) {
      this.interactionColor = settings.interactionColor;
    }
    if (settings.mouseRadius !== undefined) {
      this.mouse.radius = settings.mouseRadius;
    }

    // Particle count requires re-initialization of particles
    if (settings.particleCount !== undefined && settings.particleCount !== this.particleCount) {
      this.particleCount = settings.particleCount;
      needsReinitialize = true;
    }

    // Re-initialize if needed
    if (needsReinitialize) {
      this.initParticles();
    }
  }

  //Creates a new set of particles with random positions and velocities
  private initParticles(): void {
    // Clean up any existing interaction timeouts
    this.particles.forEach(p => {
      if (p.interactionTimeoutId) clearTimeout(p.interactionTimeoutId);
    });
    this.particles = [];

    // Create new particles with random properties
    for (let i = 0; i < this.particleCount; i++) {
      const vx = (Math.random() - 0.5) * 0.4;
      const vy = (Math.random() - 0.5) * 0.4;
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: vx,
        vy: vy,
        size: Math.random() * 2 + 1,
        alpha: this.particleBaseAlpha,
        baseVx: vx,
        baseVy: vy,
        isInteracting: false,
        interactionTimeoutId: null
      });
    }
    
    // Initialize spatial index
    this.buildQuadtree();
  }

  //Handles particles that go outside the canvas by wrapping them to the opposite side, creates an infinite space effect
  private checkBoundary(p: { x: number, y: number, size: number }): void {
    const boundaryOffset = p.size;
    if (p.x < -boundaryOffset) p.x = this.width + boundaryOffset;
    if (p.x > this.width + boundaryOffset) p.x = -boundaryOffset;
    if (p.y < -boundaryOffset) p.y = this.height + boundaryOffset;
    if (p.y > this.height + boundaryOffset) p.y = -boundaryOffset;
  }

  // Renders all particles and updates their positions
  private drawParticles(): void {
    this.ctx.shadowColor = this.glowColor;
    this.ctx.shadowBlur = 5;

    // Use quadtree for efficient lookup of particles near mouse
    let particlesNearMouse: Particle[] = [];
    if (this.mouse.x !== null && this.mouse.y !== null && this.quadtree) {
      const queryRange = new Rectangle(this.mouse.x, this.mouse.y, this.mouse.radius, this.mouse.radius);
      particlesNearMouse = this.quadtree.query(queryRange).map(p => p.data);
    }

    this.particles.forEach(p => {
      // Handle mouse interaction effects
      this.processParticleInteraction(p, particlesNearMouse);

      // Draw the particle with appropriate color
      if (p.isInteracting) {
        // Use interaction color directly for highlighted particles
        this.ctx.fillStyle = this.interactionColor;
      } else if (this.mainParticleColor.includes('gradient')) {
        // For gradient particles, create a small radial gradient for each particle
        const gradient = this.ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.size * 2
        );
        
        // Extract colors from linear-gradient CSS string
        const colorMatch = this.mainParticleColor.match(/rgba?\([^)]+\)/g);
        if (colorMatch && colorMatch.length >= 2) {
          gradient.addColorStop(0, colorMatch[0]);
          gradient.addColorStop(1, colorMatch[1]);
          if (colorMatch.length > 2) {
            gradient.addColorStop(0.5, colorMatch[2]);
          }
        } else {
          // Fallback if gradient parsing fails
          gradient.addColorStop(0, 'rgba(96, 165, 250, 0.7)');
          gradient.addColorStop(1, 'rgba(139, 92, 246, 0.5)');
        }
        
        this.ctx.fillStyle = gradient;
      } else {
        // Use the regular particle color
        this.ctx.fillStyle = this.mainParticleColor;
      }
      
      // Draw circular particles instead of rectangles for better gradient effect
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();

      // Update position for next frame
      p.x += p.vx;
      p.y += p.vy;

      // Handle edge cases
      this.checkBoundary(p);
    });

    this.ctx.shadowBlur = 0;
  }

  //Handles particle interaction with mouse/touch, Applies attraction or repulsion forces based on distance
  private processParticleInteraction(p: Particle, particlesNearMouse: Particle[]): void {
    const isNearMouse = particlesNearMouse.includes(p);
    let wasInteracted = false;

    if (isNearMouse && this.mouse.x !== null && this.mouse.y !== null) {
      const dxMouse = p.x - this.mouse.x;
      const dyMouse = p.y - this.mouse.y;
      const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

      // Double-check actual distance since quadtree query is based on rectangle
      if (distanceMouse < this.mouse.radius) {
        wasInteracted = true;
        const force = (this.mouse.radius - distanceMouse) / this.mouse.radius;
        const forceDirectionX = dxMouse / distanceMouse;
        const forceDirectionY = dyMouse / distanceMouse;

        // Apply attraction force (pull toward mouse)
        if (this.isAttracting) {
          const attractionStrength = 4;
          p.vx -= forceDirectionX * force * attractionStrength;
          p.vy -= forceDirectionY * force * attractionStrength;
          p.vx *= 0.95;  // Add some dampening
          p.vy *= 0.95;
        } 
        // Apply repulsion force (push away from mouse)
        else {
          const repulsionStrength = 1.5;
          p.vx += forceDirectionX * force * repulsionStrength;
          p.vy += forceDirectionY * force * repulsionStrength;
          p.vx *= 0.98;
          p.vy *= 0.98;
        }
      }
    }

    if (!wasInteracted) {
      // When not interacting, gradually return to base velocity
      p.vx += (p.baseVx - p.vx) * 0.05;
      p.vy += (p.baseVy - p.vy) * 0.05;
    } else {
      // Highlight particle temporarily after interaction
      if (p.interactionTimeoutId) clearTimeout(p.interactionTimeoutId);
      p.isInteracting = true;
      p.interactionTimeoutId = setTimeout(() => {
        p.isInteracting = false;
        p.interactionTimeoutId = null;
      }, this.interactionDuration);
    }
  }

  // Draws connection lines between particles that are close to each other, opacity depends on the distance between particles
  private drawLines(): void {
    if (!this.quadtree) return;

    this.ctx.shadowColor = this.glowColor;
    this.ctx.shadowBlur = 3;
    this.ctx.lineWidth = 0.5;

    for (let p1 of this.particles) {
      // Query quadtree for neighbors within maximum connection distance
      const range = new Rectangle(p1.x, p1.y, this.maxDistance, this.maxDistance);
      const neighbors = this.quadtree.query(range);

      for (let p2Point of neighbors) {
        const p2 = p2Point.data;
        // Skip self-connections and avoid double-drawing connections
        if (p1 === p2 || p1.x > p2.x) continue;

        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.maxDistance) {
          // Make lines more transparent as distance increases
          const opacity = 1 - (distance / this.maxDistance);
          this.ctx.strokeStyle = `rgba(${this.baseLineColor}, ${opacity * 0.5})`;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }

    this.ctx.shadowBlur = 0;
  }

  // Main animation loop that runs every frame
  private animate(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Periodically rebuild spatial index for better performance
    if (this.frameCount % this.quadtreeRebuildInterval === 0) {
      this.buildQuadtree();
    }
    
    this.drawParticles();
    this.drawLines();
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.frameCount++;
  }

  // Builds the quadtree spatial index for efficient neighbor lookups
  private buildQuadtree(): void {
    const boundary = new Rectangle(this.width / 2, this.height / 2, this.width / 2, this.height / 2);
    this.quadtree = new Quadtree<Particle>(boundary, this.quadtreeCapacity);
    for (let p of this.particles) {
      this.quadtree.insert({ x: p.x, y: p.y, data: p });
    }
  }

  // Handles canvas resize by updating dimensions and reinitializing
  private handleResize(): void {
    this.width = this.canvas.offsetWidth;
    this.height = this.canvas.offsetHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.initParticles();
  }

  // Debounced resize handler to prevent excessive resizing operations
  private debouncedResize(): void {
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(this.handleResize, 100);
  }

  // Updates mouse position relative to canvas coordinates
  private updateMousePosition(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = clientX - rect.left;
    this.mouse.y = clientY - rect.top;
  }

  // Handles the start of mouse/touch interaction, sets attraction mode and updates position
  private handleInteractionStart(event: Event): void {
    this.isAttracting = true;
    const isTouchEvent = typeof TouchEvent !== 'undefined' && event instanceof TouchEvent;
    if (isTouchEvent) {
      if ((event as TouchEvent).touches.length > 0) {
        this.updateMousePosition((event as TouchEvent).touches[0].clientX, (event as TouchEvent).touches[0].clientY);
      }
      event.preventDefault();
    } else if (event instanceof MouseEvent) {
      this.updateMousePosition(event.clientX, event.clientY);
    }
  }

  // Updates mouse/touch position during movement
  private handleInteractionMove(event: Event): void {
    const isTouchEvent = typeof TouchEvent !== 'undefined' && event instanceof TouchEvent;
    if (isTouchEvent) {
      if ((event as TouchEvent).touches.length > 0) {
        this.updateMousePosition((event as TouchEvent).touches[0].clientX, (event as TouchEvent).touches[0].clientY);
      }
      event.preventDefault();
    } else if (event instanceof MouseEvent) {
      this.updateMousePosition(event.clientX, event.clientY);
    }
  }

  // Handles end of interaction, switching to repulsion mode
  private handleInteractionEnd(event: Event): void {
    const isTouchEvent = typeof TouchEvent !== 'undefined' && event instanceof TouchEvent;
    if (isTouchEvent && (event as TouchEvent).touches.length > 0) {
      this.updateMousePosition((event as TouchEvent).touches[0].clientX, (event as TouchEvent).touches[0].clientY);
      return;
    }
    this.isAttracting = false;
    if (isTouchEvent) {
      this.mouse.x = null;
      this.mouse.y = null;
    }
  }

  // Handles mouse leaving the element
  private handleMouseOut(event: MouseEvent): void {
    if (!this.rootElement || !event.relatedTarget || !this.rootElement.contains(event.relatedTarget as Node)) {
      this.isAttracting = false;
      this.mouse.x = null;
      this.mouse.y = null;
    }
  }

  // Sets up all event listeners
  private registerEventListeners(): void {
    const configs: EventConfig[] = [
      { element: window, event: 'resize', handler: this.debouncedResize },
      { element: this.rootElement, event: 'mousedown', handler: this.handleInteractionStart },
      { element: this.rootElement, event: 'mousemove', handler: this.handleInteractionMove },
      { element: window, event: 'mouseup', handler: this.handleInteractionEnd },
      { element: this.rootElement, event: 'mouseout', handler: this.handleMouseOut },
      { element: this.rootElement, event: 'touchstart', handler: this.handleInteractionStart, options: { passive: false } },
      { element: this.rootElement, event: 'touchmove', handler: this.handleInteractionMove, options: { passive: false } },
      { element: this.rootElement, event: 'touchend', handler: this.handleInteractionEnd },
      { element: this.rootElement, event: 'touchcancel', handler: this.handleInteractionEnd }
    ];

    configs.forEach(config => {
      config.element.addEventListener(config.event, config.handler, config.options);
      this.eventListeners.push(config);
    });
  }

  // Removes all event listeners
  private unregisterEventListeners(): void {
    this.eventListeners.forEach(config => {
      config.element.removeEventListener(config.event, config.handler, config.options);
    });
    this.eventListeners = [];
  }

  // Starts the animation and sets up event listeners
  public start(): void {
    this.initParticles();
    this.registerEventListeners();
    if (this.animationFrameId === null) {
      this.animate();
    }
  }

  // Stops the animation and cleans up resources
  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.unregisterEventListeners();
    
    // Clean up timeouts
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.particles.forEach(p => {
      if (p.interactionTimeoutId) clearTimeout(p.interactionTimeoutId);
    });
  }

  // Updates theme colors from CSS variables
  private updateThemeColors(): void {
    const computedStyle = getComputedStyle(document.documentElement);
    this.mainParticleColor = computedStyle.getPropertyValue('--main-particle-color').trim();
    this.interactionColor = computedStyle.getPropertyValue('--interaction-color').trim();
    this.baseLineColor = computedStyle.getPropertyValue('--base-line-color').trim();
    this.glowColor = computedStyle.getPropertyValue('--glow-color').trim();
  }

  // Observes theme changes and updates colors accordingly
  private observeThemeChanges(): void {
    this.themeObserver = new MutationObserver(() => {
      this.updateThemeColors();
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });
  }
}
